import { callVilao } from './_lib/vilao.js';
import {
  parseJsonResponseWithAiRepair,
  formatSpecialPoints,
} from './_lib/jsonHelpers.js';
import { normalizeGeometryData } from './_lib/normalizeGeometry.js';
import { solveProblem } from './_lib/kernel-bridge/solveWithKernel.js';
import { isLikely3DPrompt, isLikelyFlatGeometry, applyApexLiftFallback } from './_lib/flatGuard.js';
import { buildGeometryFromPoints } from './_lib/geometryBuilder.js';
import { verifyConstraints, pointsToMap } from './_lib/constraintVerify.js';
import { BASE_PROMPT } from './_prompts/prompts/base.js';
import { LEVEL_STATIC, LEVEL_CINEMATIC } from './_prompts/prompts/levels.js';
import { STEP1_PARSE_PROMPT } from './_prompts/prompts/classifier.js';
import { getDescriptionsForTags } from './_lib/tagDescriptions.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DETAILED_MODEL = process.env.DETAILED_MODEL || 'ant/claude-sonnet-4-6';
const DETAILED_API_KEY = process.env.DETAILED_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const isStream = req.query.stream === 'true';

    const sendEvent = (statusText, progress, chunk = undefined) => {
      if (isStream) {
        const payload = { statusText, progress };
        if (chunk !== undefined) payload.chunk = chunk;
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      sendEvent('Bắt đầu kết nối...', 5);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errMsg = 'Unauthorized: Missing or invalid token';
      if (isStream) { res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`); return res.end(); }
      return res.status(401).json({ error: errMsg });
    }
    const token = authHeader.split(' ')[1];
    
    if (supabase) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        const errMsg = 'Unauthorized: Invalid token';
        if (isStream) { res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`); return res.end(); }
        return res.status(401).json({ error: errMsg });
      }
      // NOTE: Drawing is a free feature (guests are limited client-side by quota).
      // The previous Pro gate keyed on aiModel==='high' blocked every default draw
      // because the client sends aiModel:'high' by default, and there is no separate
      // premium model anymore (all requests route to gemini). Gate removed.
    }

    let { imageBase64, prompt, mode = 'quick', ocrOnly = false, aiModel, useReasoning } = req.body;

    if (!imageBase64 && !prompt) {
      const errMsg = 'Thiếu dữ liệu: cần imageBase64 hoặc prompt';
      if (isStream) { res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`); return res.end(); }
      return res.status(400).json({ error: errMsg });
    }

    if (imageBase64 && ocrOnly) {
      const errMsg = 'OCR không khả dụng trên Vercel deployment. Vui lòng nhập đề bằng chữ.';
      if (isStream) { res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`); return res.end(); }
      return res.status(400).json({ error: errMsg });
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 1) {
      if (imageBase64) {
        prompt = 'Đề bài trong ảnh được đính kèm.';
      } else {
        const errMsg = 'Mô tả không được để trống';
        if (isStream) { res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`); return res.end(); }
        return res.status(400).json({ error: errMsg });
      }
    }
    if (prompt.trim().length > 5000) {
      const errMsg = 'Mô tả quá dài (tối đa 5000 ký tự)';
      if (isStream) { res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`); return res.end(); }
      return res.status(400).json({ error: errMsg });
    }

    const trimmedPrompt = prompt.trim();

    // -- Bắt đầu Caching --
    let promptHash = null;
    let cachedResponse = null;

    if (!imageBase64 && trimmedPrompt && supabase) {
      promptHash = crypto.createHash('sha256').update(trimmedPrompt + '_' + mode + '_' + (aiModel || 'low')).digest('hex');
      try {
        const { data, error } = await supabase
          .from('ai_cache')
          .select('response')
          .eq('prompt_hash', promptHash)
          .maybeSingle();
          
        if (data && data.response) {
          console.log('Cache hit for prompt:', trimmedPrompt.substring(0, 50));
          cachedResponse = data.response;
        }
      } catch (err) {
        console.warn('Cache read error:', err.message);
      }
    }

    if (cachedResponse) {
      sendEvent('Lấy kết quả từ bộ nhớ đệm (Cache)...', 100);
      if (isStream) {
        res.write(`data: ${JSON.stringify({ status: 'done', data: cachedResponse })}\n\n`);
        return res.end();
      } else {
        return res.status(200).json(cachedResponse);
      }
    }
    // -- Kết thúc Caching --

    const validModes = ['quick', 'detailed'];
    const drawMode = validModes.includes(mode) ? mode : 'quick';
    let detailLevel = 'static';

    // ===== KERNEL MODE: engine tất định thử TRƯỚC, hỏng thì rơi về luồng LLM cũ =====
    // LLM chỉ DỊCH đề thành plan; engine dựng hình bằng toạ độ chính xác rồi TỰ KIỂM điều kiện đề.
    // Chỉ nhận khi engine chắc chắn (ok, 0 vi phạm, 0 lỗi, có điểm). Mọi trường hợp khác → im lặng
    // rơi xuống luồng cũ ⇒ xấu nhất cũng chỉ bằng hôm nay, không bao giờ tệ hơn.
    // Tắt khẩn cấp: đặt env KERNEL_MODE=off.
    if (!imageBase64 && trimmedPrompt && process.env.KERNEL_MODE !== 'off') {
      try {
        sendEvent('Đang thử engine tất định...', 25);
        const k = await solveProblem(trimmedPrompt);
        const usable = k.ok
          && k.geometry
          && Array.isArray(k.geometry.points) && k.geometry.points.length > 0
          && (k.violations?.length ?? 0) === 0
          && (k.errors?.length ?? 0) === 0;
        if (usable) {
          const geometry = normalizeGeometryData(k.geometry);
          geometry.confidence = 1; // engine đã tự kiểm mọi assert của đề
          const answersLog = (k.answers || [])
            .map((a) => `${a.kind}: ${a.text}${a.approximate ? ' (xấp xỉ)' : ''}`)
            .join('; ');
          const enginePayload = {
            step1: {
              text: trimmedPrompt,
              gemini_dsl: '',
              points_needed: geometry.points.map((p) => p.id),
              shape_type: k.plan?.solidName || '',
              constraints: (k.plan?.asserts || []).map((a) => `${a.relation}(${(a.args || []).join(',')})`),
              tags: ['kernel'],
              detailLevel: 'static',
            },
            step2: {
              geometry,
              calculation_log: answersLog || 'Engine tất định: toạ độ chính xác, đã tự kiểm điều kiện đề.',
              confidence: 1,
              constraint_violations: [],
            },
            mode: drawMode,
            engine: 'kernel', // để đo tỉ lệ engine phục vụ so với luồng cũ
          };
          if (promptHash && supabase) {
            supabase.from('ai_cache').insert([{
              prompt_hash: promptHash, prompt_text: trimmedPrompt, response: enginePayload,
            }]).then(({ error }) => { if (error) console.warn('Lỗi lưu cache (kernel):', error.message); });
          }
          console.log('[kernel] phục vụ:', trimmedPrompt.substring(0, 60));
          sendEvent('Hoàn tất (engine)!', 100);
          if (isStream) {
            res.write(`data: ${JSON.stringify({ status: 'done', data: enginePayload })}\n\n`);
            return res.end();
          }
          return res.json(enginePayload);
        }
        console.log('[kernel] không dùng được → rơi về LLM:', JSON.stringify({
          ok: k.ok, violations: k.violations?.length ?? 0, errors: k.errors?.length ?? 0,
        }));
      } catch (e) {
        console.warn('[kernel] lỗi → rơi về LLM:', e?.message);
      }
    }
    // ===== Hết KERNEL MODE — từ đây là luồng LLM cũ, KHÔNG đổi =====

    let result;
    if (drawMode === 'quick') {
      sendEvent('Đang tạo hình học (Chế độ nhanh)...', 40);
      const SYSTEM_PROMPT = `${BASE_PROMPT}\n\n${LEVEL_STATIC}`;
      
      const userMsg = `Đề bài: "${trimmedPrompt}"

Hãy:
1. Xác định loại hình và đặt toạ độ theo quy tắc
2. Tính toạ độ 3D cho các điểm CHÍNH (≤15 điểm)
3. Dùng cones/spheres/circles cho hình tròn xoay thay vì vẽ từng điểm
4. Liệt kê CÁC CẠNH CHÍNH (≤20 lines)

⚠️ NGẮN GỌN: calculation_log tối đa 1 dòng. CHỈ JSON thuần, KHÔNG markdown.`;

      let rawContent;
      try {
        const vilaoOpts = { maxTokens: 6144, timeoutMs: 180000, imageBase64, aiModel: 'low', useReasoning: false, onStream: (chunk) => sendEvent('streaming', 80, chunk) };
        rawContent = await callVilao(SYSTEM_PROMPT, userMsg, vilaoOpts);
      } catch (firstErr) {
        console.warn('Quick mode first attempt failed:', firstErr.message);
        sendEvent('Đang thử lại (Fallback)...', 60);
        rawContent = await callVilao(SYSTEM_PROMPT,
          `Đề bài: "${trimmedPrompt}"\n\nTrả về JSON ngắn gọn nhất. Chỉ các điểm chính và cạnh chính. calculation_log: 1 dòng.`,
          { maxTokens: 4096, timeoutMs: 180000, imageBase64 });
      }

      console.log('Quick response:', rawContent.substring(0, 200));
      sendEvent('Đang xử lý toạ độ...', 80);
      result = await parseJsonResponseWithAiRepair(rawContent);
      result._systemPromptUsed = SYSTEM_PROMPT;
      result._userMsgUsed = userMsg;

    } else if (drawMode === 'detailed') {
      console.log('Running Pass 1: Classification...');
      sendEvent('Đang đọc hiểu đề bài...', 20);
      let step1Data = null;
      try {
        const pass1Raw = await callVilao(STEP1_PARSE_PROMPT, trimmedPrompt, { maxTokens: 2048, timeoutMs: 300000, useJsonMode: true, onStream: (chunk) => sendEvent('streaming_pass1', 30, chunk) });
        step1Data = await parseJsonResponseWithAiRepair(pass1Raw);
        console.log('Pass 1 extracted constraints:', step1Data?.constraints?.length || 0);
        sendEvent('Đã phân tích xong đề bài (Pass 1 Done)', 40);
      } catch (err) {
        console.warn('Pass 1 failed, falling back to empty constraints:', err.message);
        step1Data = { constraints: [] };
        sendEvent('Phân tích đề bài gặp lỗi, thử tiếp tục...', 40);
      }
      
      detailLevel = 'static';
      if (step1Data?.tags && Array.isArray(step1Data.tags)) {
        if (step1Data.tags.some(tag => ['Kinematic', 'Morphing', 'Geodesic'].includes(tag))) {
          detailLevel = 'cinematic';
        }
      }
      const levelPrompt = detailLevel === 'cinematic' ? LEVEL_CINEMATIC : LEVEL_STATIC;
      const SYSTEM_PROMPT = `${BASE_PROMPT}\n\n${levelPrompt}`;
      
      const tagDescriptions = getDescriptionsForTags(step1Data?.tags || []);
      const tagSection = tagDescriptions ? `\n\nHướng dẫn phân loại bài toán:\n${tagDescriptions}` : '';

      const userMsgPass2 = `Đề bài: "${trimmedPrompt}"
      
Dữ liệu phân loại (Sử dụng làm cơ sở để vẽ):
${JSON.stringify(step1Data, null, 2)}${tagSection}

Nhiệm vụ:
1. Dựa vào constraints đã phân loại, thiết lập tọa độ 3D.
2. Vẽ các điểm, đường, mặt cong, và timeline theo yêu cầu.

⚠️ BẮT BUỘC trả về JSON thuần, KHÔNG kèm markdown theo cấu trúc đã quy định ở System Prompt. Không wrap bằng \`\`\`json.`;

      let rawContent;
      console.log('Running Pass 2: Geometry Generation...');
      sendEvent('Đang tính toán toạ độ hình học (Pass 2)...', 50);
      try {
        const vilaoOpts = { maxTokens: 6144, timeoutMs: 300000, imageBase64, aiModel, useReasoning, onStream: (chunk) => sendEvent('streaming_pass2', 70, chunk) };
        rawContent = await callVilao(SYSTEM_PROMPT, userMsgPass2, vilaoOpts);
      } catch (firstErr) {
        console.warn('Detailed mode Pass 2 attempt failed:', firstErr.message);
        sendEvent('Đang thử vẽ lại hình học (Fallback)...', 70);
        rawContent = await callVilao(SYSTEM_PROMPT,
          userMsgPass2 + '\n\nFallback: Cố gắng vẽ ngắn gọn nhất.',
          { maxTokens: 4096, timeoutMs: 300000, imageBase64 });
      }

      console.log('Detailed response:', rawContent.substring(0, 200));
      sendEvent('Đang xử lý kết quả...', 85);
      result = await parseJsonResponseWithAiRepair(rawContent);
      result._step1 = step1Data;
      result._systemPromptUsed = SYSTEM_PROMPT; 
      result._userMsgUsed = userMsgPass2;
    }

    const geometry = result.geometry || result;
    let normalizedGeometry = normalizeGeometryData(geometry);
    const step1Data = result._step1;
    let calculationLog = result.calculation_log || '';

    if (isLikely3DPrompt(trimmedPrompt) && isLikelyFlatGeometry(normalizedGeometry)) {
      console.warn('Flat geometry detected for 3D prompt, forcing 3D regeneration...');

      const forced3DInput = `Đề bài: "${trimmedPrompt}"

KẾT QUẢ TRƯỚC BỊ PHẲNG (mọi điểm có z≈0). Hãy dựng lại hình 3D theo hệ Oxyz Z-up:
1) Phải có điểm đỉnh (S) có z > 0
2) Điểm đáy nằm trên z = 0
3) Tính lại các điểm phụ theo toạ độ mới
4) Trả JSON thuần đúng schema { geometry, calculation_log }, KHÔNG markdown.`;

      const fallbackSystemPrompt = drawMode === 'quick' ? `${BASE_PROMPT}\n\n${LEVEL_STATIC}` : (result._systemPromptUsed || `${BASE_PROMPT}\n\n${LEVEL_STATIC}`);

      try {
        const forcedRaw = await callVilao(fallbackSystemPrompt, forced3DInput, {
          maxTokens: 6144,
          timeoutMs: 120000,
          imageBase64,
        });
        const forcedResult = await parseJsonResponseWithAiRepair(forcedRaw);
        const forcedGeometry = normalizeGeometryData(forcedResult.geometry || forcedResult);

        if (!isLikelyFlatGeometry(forcedGeometry)) {
          normalizedGeometry = forcedGeometry;
          calculationLog = forcedResult.calculation_log || calculationLog;
          console.log('Forced 3D regeneration succeeded');
        } else {
          normalizedGeometry = applyApexLiftFallback(forcedGeometry);
          console.warn('Forced regeneration still flat, applied apex lift fallback');
        }
      } catch (forcedErr) {
        console.warn('Forced 3D regeneration failed:', forcedErr?.message);
        normalizedGeometry = applyApexLiftFallback(normalizedGeometry);
      }
    }

    console.log('Geometry points:', normalizedGeometry.points?.length || 0);

    let verification = { ok: true, confidence: 1.0, violations: [], stats: {} };
    const step1Constraints = step1Data?.constraints || [];
    if (step1Constraints.length > 0 && drawMode === 'detailed') {
      sendEvent('Đang xác thực ràng buộc toán học...', 90);
      try {
        const ptsMap = pointsToMap(normalizedGeometry.points);
        verification = await verifyConstraints(ptsMap, step1Constraints);

        if (!verification.ok) {
          console.warn(`[constraintVerify] ${verification.violations.length} violation(s) in "${drawMode}" mode:`,
            verification.violations.map(v => `${v.constraint} (delta=${v.delta})`).join('; '));
        }
        normalizedGeometry.confidence = verification.confidence;
      } catch (verifyErr) {
        console.warn('[constraintVerify] error (non-fatal):', verifyErr.message);
      }
    }

    sendEvent('Hoàn tất!', 100);
    const finalPayload = {
      step1: {
        text: step1Data?.text || trimmedPrompt,
        gemini_dsl: '',
        points_needed: step1Data?.points_needed || normalizedGeometry.points?.map((p) => p.id) || [],
        shape_type: step1Data?.shape_type || '',
        constraints: step1Data?.constraints || [],
        tags: step1Data?.tags || [],
        detailLevel: drawMode === 'detailed' ? detailLevel : 'static',
      },
      step2: {
        geometry: normalizedGeometry,
        calculation_log: calculationLog,
        confidence: verification.confidence,
        constraint_violations: verification.violations,
        llmPrompt: result._systemPromptUsed ? `=== SYSTEM PROMPT ===\n${result._systemPromptUsed}\n\n=== USER MESSAGE ===\n${result._userMsgUsed}` : undefined,
      },
      mode: drawMode,
    };

    // Lưu vào Cache
    if (promptHash && supabase) {
      // Xóa llmPrompt để tiết kiệm bộ nhớ khi cache
      const cachePayload = JSON.parse(JSON.stringify(finalPayload));
      if (cachePayload.step2 && cachePayload.step2.llmPrompt) {
        delete cachePayload.step2.llmPrompt;
      }
      
      supabase.from('ai_cache').insert([{
        prompt_hash: promptHash,
        prompt_text: trimmedPrompt,
        response: cachePayload
      }]).then(({error}) => {
        if (error) console.warn('Lỗi lưu cache:', error.message);
      });
    }

    if (isStream) {
      res.write(`data: ${JSON.stringify({ status: 'done', data: finalPayload })}\n\n`);
      return res.end();
    } else {
      return res.json(finalPayload);
    }

  } catch (error) {
    console.error('Error in analyze-geometry:', error);
    const isAbort = error?.name === 'AbortError' || (error?.message || '').includes('aborted');
    const status = isAbort ? 504 : (error?.status || 500);
    const message = isAbort
      ? 'Yêu cầu quá lâu, vui lòng thử lại với chế độ Nhanh hoặc đề bài ngắn hơn'
      : (error?.message || 'Unknown error');
    
    try {
      if (req.query.stream === 'true') {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        return res.end();
      }
    } catch(e) {}
    
    return res.status(status).json({ error: message });
  }
}
