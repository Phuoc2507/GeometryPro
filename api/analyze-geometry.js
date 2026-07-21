import { callVilao } from './_lib/vilao.js';
import {
  parseJsonResponseWithAiRepair,
  formatSpecialPoints,
} from './_lib/jsonHelpers.js';
import { normalizeGeometryData } from './_lib/normalizeGeometry.js';
// LƯU Ý: kernel-bridge được nạp ĐỘNG bên trong handler, KHÔNG import tĩnh ở đây.
// Lý do: nó import từ api/_lib/kernel-dist/ — thư mục BỊ GITIGNORE, chỉ sinh ra bởi
// `npm run build:kernel`. Nếu môi trường triển khai không sinh kịp, import tĩnh sẽ làm
// CẢ route này chết lúc load (mất luôn tính năng vẽ hình). Nạp động ⇒ lỗi rơi vào
// try/catch và tự động dùng luồng LLM cũ.
import { isLikely3DPrompt, isLikelyFlatGeometry, applyApexLiftFallback } from './_lib/flatGuard.js';
import { buildGeometryFromPoints } from './_lib/geometryBuilder.js';
import { verifyWithKernel } from './_lib/kernelVerify.js';
import { BASE_PROMPT } from './_prompts/prompts/base.js';
import { LEVEL_STATIC, LEVEL_CINEMATIC } from './_prompts/prompts/levels.js';
import { STEP1_PARSE_PROMPT } from './_prompts/prompts/classifier.js';
import { getDescriptionsForTags } from './_lib/tagDescriptions.js';
import { logEngineDecision } from './_lib/engineDecisionLog.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { creditsConfigured, checkAndConsume, refund } from './_lib/credits.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DETAILED_MODEL = process.env.DETAILED_MODEL || 'ant/claude-sonnet-4-6';
const DETAILED_API_KEY = process.env.DETAILED_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let userId = null;        // ví credit: cần ở scope hàm để catch ngoài cùng hoàn được
  let creditCharge = null;  // { cost, reqId } nếu đã TRỪ credit (paid tier) -> hoàn khi lỗi
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
      userId = user.id;
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

    // ===== TRỪ CREDIT / QUOTA CHO LƯỢT VẼ =====
    // Trừ TRƯỚC khi làm việc nặng; hoàn ở catch ngoài cùng nếu lỗi (chỉ hoàn credit,
    // quota free không hoàn). Fail-open khi credit CHƯA cấu hình (env chưa set) để
    // không làm hỏng chức năng vẽ khi deploy chưa đủ biến môi trường.
    const drawAction = mode === 'detailed' ? 'draw_detailed' : 'draw_quick';
    if (userId && creditsConfigured()) {
      const gate = await checkAndConsume(userId, 'draw', drawAction);
      if (!gate.ok) {
        const errMsg = gate.message || 'Bạn đã hết lượt/credit để vẽ.';
        if (isStream) { res.write(`data: ${JSON.stringify({ error: errMsg, code: gate.reason })}\n\n`); return res.end(); }
        return res.status(402).json({ error: errMsg, code: gate.reason });
      }
      if (gate.mode === 'credit') creditCharge = { cost: gate.cost, reqId: crypto.randomUUID() };
    }

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
      // Serve-từ-cache = KHÔNG gọi LLM ⇒ mình tốn 0đ ⇒ HOÀN lại credit vừa trừ (công bằng với user).
      // Cổng hết-credit vẫn chặt vì đã gate + trừ TRƯỚC khi tới đây. Chỉ hoàn credit trả phí; quota free
      // KHÔNG hoàn (là bộ đếm ngày). creditCharge=null để catch ngoài cùng không hoàn lần 2.
      if (creditCharge && userId) {
        try { await refund(userId, creditCharge.cost, creditCharge.reqId); }
        catch (e) { console.warn('Hoàn credit cache-hit lỗi:', e?.message); }
        creditCharge = null;
      }
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
    // CHỈ nhận chế độ 'quick' (hình tĩnh). KHÔNG đụng 'detailed': chế độ đó phân loại đề rồi có thể
    // sinh hình CINEMATIC (Kinematic/Morphing/Geodesic — có chuyển động), mà engine chỉ dựng hình
    // TĨNH ⇒ chặn 'detailed' sẽ là giật lùi cho người dùng đã chọn chế độ giàu hơn.
    // Tắt khẩn cấp: đặt env KERNEL_MODE=off.
    if (drawMode === 'quick' && !imageBase64 && trimmedPrompt && process.env.KERNEL_MODE !== 'off') {
      try {
        sendEvent('Đang thử engine tất định...', 25);
        // Nạp ĐỘNG: nếu kernel-dist chưa được build thì ném ở đây và rơi êm về luồng LLM cũ.
        const { solveProblem } = await import('./_lib/kernel-bridge/solveWithKernel.js');
        const _kt0 = Date.now();
        const k = await solveProblem(trimmedPrompt);
        const _kms = Date.now() - _kt0;
        const usable = k.ok
          && k.geometry
          && Array.isArray(k.geometry.points) && k.geometry.points.length > 0
          && (k.violations?.length ?? 0) === 0
          && (k.errors?.length ?? 0) === 0;
        if (usable) {
          const geometry = normalizeGeometryData(k.geometry);
          geometry.confidence = 1; // engine đã tự kiểm mọi assert của đề
          const _ea = (k.answers || [])[0];
          if (_ea && Number.isFinite(_ea.approx)) {
            geometry.engineAnswer = { text: _ea.text, approx: _ea.approx, verified: true }; // engine đã tự kiểm ở nhánh phục vụ này
          }
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
          logEngineDecision({ mode: 'quick', served: true, reason: '', ms: _kms, promptLen: trimmedPrompt.length, approx: (k.answers || []).some((a) => a.approximate) });
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
        logEngineDecision({
          mode: 'quick', served: false,
          reason: `unusable:ok=${k.ok},v=${k.violations?.length ?? 0},e=${k.errors?.length ?? 0}`,
          ms: _kms, promptLen: trimmedPrompt.length,
        });
      } catch (e) {
        console.warn('[kernel] lỗi → rơi về LLM:', e?.message);
        logEngineDecision({ mode: 'quick', served: false, reason: `error:${e?.message || ''}`, ms: 0, promptLen: trimmedPrompt.length });
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

📸 NẾU có ảnh đính kèm: thêm trường "problemText" (chuỗi) ở CUỐI JSON, SAU "geometry" — chép LẠI NGUYÊN VĂN toàn bộ đề bài trong ảnh, BAO GỒM câu hỏi (vd "Tính thể tích…", "Chứng minh…"). Escape đúng JSON (xuống dòng = \\n, dấu " = \\"). Tối đa ~1200 ký tự. KHÔNG có ảnh thì BỎ QUA trường này. Luôn ưu tiên vẽ "geometry" đầy đủ trước.

⚠️ NGẮN GỌN: calculation_log tối đa 1 dòng. CHỈ JSON thuần, KHÔNG markdown.`;

      let rawContent;
      try {
        const vilaoOpts = { maxTokens: 8192, timeoutMs: 180000, imageBase64, aiModel: 'low', useReasoning: false, onStream: (chunk) => sendEvent('streaming', 80, chunk) };
        rawContent = await callVilao(SYSTEM_PROMPT, userMsg, vilaoOpts);
      } catch (firstErr) {
        console.warn('Quick mode first attempt failed:', firstErr.message);
        sendEvent('Đang thử lại (Fallback)...', 60);
        rawContent = await callVilao(SYSTEM_PROMPT,
          `Đề bài: "${trimmedPrompt}"\n\nTrả về JSON ngắn gọn nhất. Chỉ các điểm chính và cạnh chính. calculation_log: 1 dòng. NẾU có ảnh: thêm "problemText" ở cuối JSON = nguyên văn đề bài trong ảnh (kèm câu hỏi), escape JSON.`,
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
      // ===== KERNEL ở chế độ KỸ: chỉ nhận bài TĨNH =====
      // Pass 1 đã phân loại xong. Bài cinematic (Kinematic/Morphing/Geodesic) cần hình ĐỘNG mà engine
      // không dựng được ⇒ để nguyên luồng LLM. Bài TĨNH (đa số đề hình học) thì engine dựng chính xác
      // hơn hẳn — và đây mới là chỗ người dùng cần đúng nhất (đề khó, LLM bịa nhiều nhất).
      if (detailLevel === 'static' && !imageBase64 && process.env.KERNEL_MODE !== 'off') {
        try {
          sendEvent('Đang thử engine tất định...', 50);
          const { solveProblem } = await import('./_lib/kernel-bridge/solveWithKernel.js');
          const _kt0 = Date.now();
          const k = await solveProblem(trimmedPrompt);
          const _kms = Date.now() - _kt0;
          const usable = k.ok && k.geometry && Array.isArray(k.geometry.points) && k.geometry.points.length > 0
            && (k.violations?.length ?? 0) === 0 && (k.errors?.length ?? 0) === 0;
          if (usable) {
            const geometry = normalizeGeometryData(k.geometry);
            geometry.confidence = 1;
            const _ea = (k.answers || [])[0];
            if (_ea && Number.isFinite(_ea.approx)) {
              geometry.engineAnswer = { text: _ea.text, approx: _ea.approx, verified: true }; // engine đã tự kiểm ở nhánh phục vụ này
            }
            const answersLog = (k.answers || [])
              .map((a) => `${a.kind}: ${a.text}${a.approximate ? ' (xấp xỉ)' : ''}`).join('; ');
            const enginePayload = {
              step1: {
                text: step1Data?.text || trimmedPrompt,
                gemini_dsl: '',
                points_needed: geometry.points.map((p) => p.id),
                shape_type: step1Data?.shape_type || k.plan?.solidName || '',
                constraints: step1Data?.constraints || [],
                tags: step1Data?.tags || [],
                detailLevel: 'static',
              },
              step2: {
                geometry,
                calculation_log: answersLog || 'Engine tất định: toạ độ chính xác, đã tự kiểm điều kiện đề.',
                confidence: 1,
                constraint_violations: [],
              },
              mode: drawMode,
              engine: 'kernel',
            };
            if (promptHash && supabase) {
              supabase.from('ai_cache').insert([{
                prompt_hash: promptHash, prompt_text: trimmedPrompt, response: enginePayload,
              }]).then(({ error }) => { if (error) console.warn('Lỗi lưu cache (kernel/detailed):', error.message); });
            }
            console.log('[kernel] phục vụ (detailed/static):', trimmedPrompt.substring(0, 60));
            logEngineDecision({ mode: 'detailed', served: true, reason: '', ms: _kms, promptLen: trimmedPrompt.length, approx: (k.answers || []).some((a) => a.approximate) });
            sendEvent('Hoàn tất (engine)!', 100);
            if (isStream) {
              res.write(`data: ${JSON.stringify({ status: 'done', data: enginePayload })}\n\n`);
              return res.end();
            }
            return res.json(enginePayload);
          }
          console.log('[kernel] detailed/static không dùng được → LLM:', JSON.stringify({
            ok: k.ok, violations: k.violations?.length ?? 0, errors: k.errors?.length ?? 0,
          }));
          logEngineDecision({
            mode: 'detailed', served: false,
            reason: `unusable:ok=${k.ok},v=${k.violations?.length ?? 0},e=${k.errors?.length ?? 0}`,
            ms: _kms, promptLen: trimmedPrompt.length,
          });
        } catch (e) {
          console.warn('[kernel] detailed/static lỗi → LLM:', e?.message);
          logEngineDecision({ mode: 'detailed', served: false, reason: `error:${e?.message || ''}`, ms: 0, promptLen: trimmedPrompt.length });
        }
      }
      // ===== Hết KERNEL detailed — dưới đây là luồng LLM cũ, KHÔNG đổi =====

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

📸 NẾU có ảnh đính kèm: thêm trường "problemText" (chuỗi) ở CUỐI JSON, SAU "geometry" — chép NGUYÊN VĂN toàn bộ đề bài trong ảnh, BAO GỒM câu hỏi. Escape đúng JSON. Tối đa ~1200 ký tự. KHÔNG có ảnh thì bỏ qua. Ưu tiên vẽ "geometry" đầy đủ trước.

⚠️ BẮT BUỘC trả về JSON thuần, KHÔNG kèm markdown theo cấu trúc đã quy định ở System Prompt. Không wrap bằng \`\`\`json.`;

      let rawContent;
      console.log('Running Pass 2: Geometry Generation...');
      sendEvent('Đang tính toán toạ độ hình học (Pass 2)...', 50);
      try {
        const vilaoOpts = { maxTokens: 8192, timeoutMs: 300000, imageBase64, aiModel, useReasoning, onStream: (chunk) => sendEvent('streaming_pass2', 70, chunk) };
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

    // Đề bài chép từ ẢNH: model vision trả trường "problemText" (sibling của geometry) khi có ảnh.
    // Chỉ nhận cho input ảnh + đủ dài (≥10 ký tự) — dùng làm step1.text để ô "Giải bài" tự điền
    // đúng đề (thay placeholder "Đề bài trong ảnh được đính kèm."). normalizeGeometryData chỉ đụng
    // geometry nên result.problemText còn nguyên ở đây; flat-3D regen bên dưới cũng không ghi đè result.
    // Chấp nhận cả khi model lỡ lồng problemText vào trong geometry thay vì để top-level.
    const rawProblemText = result?.problemText ?? result?.geometry?.problemText;
    const imageProblemText = (imageBase64 && typeof rawProblemText === 'string' && rawProblemText.trim().length >= 10)
      ? rawProblemText.trim()
      : null;

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

    // confidence = null nghĩa là CHƯA KIỂM (không phải "tin 100%"). Chỉ điền số khi engine
    // thật sự kiểm được — thà im lặng còn hơn khoe một con số bịa.
    let verification = { ok: true, confidence: null, violations: [], stats: {} };
    // Kiểm hình LLM vẽ bằng ENGINE TẤT ĐỊNH (thay constraintVerify cũ: nó spawn Python với file .py
    // CHƯA TỪNG TỒN TẠI ⇒ luôn thất bại im lặng và trả confidence bịa 0.5).
    // Dùng constraints_structured của Pass 1; không có thì KHÔNG bịa điểm tin cậy.
    const structured = step1Data?.constraints_structured || [];
    if (structured.length > 0 && drawMode === 'detailed') {
      sendEvent('Đang xác thực ràng buộc toán học...', 90);
      try {
        const kv = await verifyWithKernel(normalizedGeometry.points, structured);
        if (kv.verified) {
          verification = { ok: kv.ok, confidence: kv.confidence, violations: kv.violations };
          normalizedGeometry.confidence = kv.confidence;
          if (!kv.ok) {
            console.warn(`[kernelVerify] ${kv.violations.length}/${kv.checked} vi phạm:`,
              kv.violations.map((v) => v.message || JSON.stringify(v)).join('; ').slice(0, 300));
          } else {
            console.log(`[kernelVerify] ✓ ${kv.checked} ràng buộc đạt` + (kv.skipped ? ` (bỏ qua ${kv.skipped} cái không kiểm được)` : ''));
          }
        } else {
          // Không kiểm được ⇒ NÓI THẬT là chưa kiểm, thay vì bịa 0.5 như code cũ.
          console.log('[kernelVerify] chưa kiểm được:', kv.reason);
        }
      } catch (verifyErr) {
        console.warn('[kernelVerify] lỗi (không chặn luồng):', verifyErr.message);
      }
    }

    sendEvent('Hoàn tất!', 100);
    const finalPayload = {
      step1: {
        // Ảnh mà không trích được đề -> dùng ĐÚNG placeholder (frontend lọc thành ô trống), KHÔNG
        // dùng step1Data.text vì ở chế độ Kỹ nó là bản chuẩn-hoá của placeholder (Pass 1 không thấy ảnh).
        text: imageProblemText || (imageBase64 ? trimmedPrompt : step1Data?.text) || trimmedPrompt,
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
    // Vẽ lỗi -> HOÀN credit đã trừ (nếu có). Quota free không hoàn.
    if (creditCharge && userId) {
      try { await refund(userId, creditCharge.cost, creditCharge.reqId); }
      catch (e) { console.warn('refund credit lỗi:', e?.message); }
    }
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
