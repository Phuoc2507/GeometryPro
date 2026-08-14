import https from 'https';

const VILAO_BASE_URL = 'https://api.vilao.ai';
const VILAO_MODEL = 'ram/gemini-3.5-flash-low';

function httpsRequest(url, options, bodyData, timeoutMs) {
  return new Promise((resolve, reject) => {
    let hardTimer = null;
    const clearHardTimer = () => { if (hardTimer) { clearTimeout(hardTimer); hardTimer = null; } };

    const req = https.request(url, options, (res) => {
      // Dọn đồng hồ khi phản hồi đã ĐỌC XONG (hoặc đứt) — không để đồng hồ hủy nhầm request đã hoàn tất.
      res.on('end', clearHardTimer);
      res.on('close', clearHardTimer);
      resolve(res);
    });

    req.on('error', (err) => {
      clearHardTimer();
      reject(err);
    });

    if (timeoutMs) {
      // Đồng hồ CỨNG tính từ lúc gửi: hủy nếu vượt timeoutMs KỂ CẢ khi provider "nhỏ giọt" dữ liệu.
      // req.setTimeout chỉ bắt socket RẢNH nên khi server trả token chậm dần có thể treo 100s+ (đo thực:
      // 1 lượt tách đề chạy 124s dù timeoutMs=25s) → vượt maxDuration 60s của Vercel → hàm bị ngắt thô.
      hardTimer = setTimeout(() => { req.destroy(new Error('Request timed out')); }, timeoutMs);
      req.setTimeout(timeoutMs, () => { req.destroy(new Error('Request timed out')); });
    }

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

export function isNetworkError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = (error.code || '').toString().toUpperCase();
  // Soi cả .code: khi đồng hồ cứng hủy GIỮA stream, for-await ném Error('aborted') code ECONNRESET —
  // message KHÔNG chứa 'timed out'. Chỉ soi message thì bỏ sót lỗi timeout-giữa-stream (case hay gặp nhất).
  if (['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED', 'EPIPE'].includes(code)) return true;
  return msg.includes('timeout')
    || msg.includes('timed out')   // đồng hồ CỨNG ném Error('Request timed out') — 'timed out'≠'timeout'!
    || msg.includes('aborted')
    || msg.includes('econnreset')
    || msg.includes('connection reset')
    || msg.includes('network')
    || msg.includes('econnrefused')
    || msg.includes('fetch failed');
}

async function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Response Vilao KHÔNG có content dùng được? (thiếu choices, thiếu message, hoặc content rỗng/khoảng-trắng).
// gemini-flash thỉnh thoảng trả content="" dù finish_reason=stop và KHÔNG lỗi mạng → đây là lỗi
// TẠM (retry thường ra ngay ở lượt sau), nên callVilao coi nó như 5xx: thử lại trong vòng lặp thay vì
// fail thẳng (trước đây 1 lượt rỗng = toast "Lỗi vẽ hình / Vilao returned empty content"). Tách hàm
// thuần để test không cần mạng.
export function isEmptyVilaoContent(data) {
  if (!data || !Array.isArray(data.choices) || data.choices.length === 0) return true;
  const content = data.choices[0]?.message?.content;
  return typeof content !== 'string' || content.trim() === '';
}

export function resolveApiKey(options = {}, envKey = process.env.VILAO_API_KEY) {
  const key = options.apiKey || envKey;
  if (!key) throw new Error('Vilao API key is not set (opts.apiKey or VILAO_API_KEY)');
  return key;
}

export async function callVilao(systemPrompt, userPrompt, options = {}) {
  const {
    maxTokens = 4096,
    timeoutMs = 180000,
    imageBase64 = null,
    aiModel = 'low',
    useReasoning = false,
    onStream = null,
    model = null,
    apiKey = null,
    maxAttempts = 2,   // số lần thử tối đa (kể cả retry nội bộ khi lỗi mạng/timeout). Đặt 1 khi caller
                       // đã tự hedge (chạy song song) để khỏi chồng retry gây phí token.
    returnRaw = false, // true → trả { content, usage, model } (cho tab Test API Key: cần token). Mặc định giữ nguyên (trả content).
  } = options;

  let modelToUse = VILAO_MODEL;
  if (aiModel === 'high') {
    modelToUse = 'ram/gemini-3.5-flash-low';
  }

  if (useReasoning) {
    modelToUse = 'ram/gemini-3.5-flash-low';
  }

  // Cho phép chỉ định model tường minh (dùng cho kernel-mode Translator) — ưu tiên cao nhất.
  if (model) {
    modelToUse = model;
  }

  const currentApiKey = resolveApiKey({ apiKey }, process.env.VILAO_API_KEY);

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  if (imageBase64) {
    const dataUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : "data:image/jpeg;base64," + imageBase64;
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: userPrompt });
  }

  const bodyObj = {
    model: modelToUse,
    messages: messages,
    max_tokens: maxTokens,
  };

  // Ép JSON mode khi có ảnh (kể cả useReasoning): output ảnh luôn là JSON, và nếu tắt JSON mode
  // thì phần transcription đề bài (free-text nhiều dòng) dễ chứa ký tự chưa escape làm hỏng cả JSON.
  // useReasoning ở đây chỉ đổi cờ này chứ không đổi model, nên bật lại an toàn.
  if ((!useReasoning || imageBase64) && modelToUse !== 'ox/o1-mini') {
    bodyObj.response_format = { type: 'json_object' };
  }

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const bodyData = JSON.stringify(bodyObj);
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + currentApiKey,
          'Content-Length': Buffer.byteLength(bodyData)
        }
      };

      const response = await httpsRequest(VILAO_BASE_URL + "/v1/chat/completions", requestOptions, bodyData, timeoutMs);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        let errorText = '';
        response.on('data', chunk => errorText += chunk);
        await new Promise(r => response.on('end', r));

        console.error('Vilao error:', response.statusCode, errorText);

        if ([502, 503, 504].includes(response.statusCode) && attempt < maxAttempts - 1) {
          console.warn("Vilao " + response.statusCode + ", retry attempt " + attempt);
          await sleepMs(500 * attempt);
          attempt++;
          continue;
        }

        throw new Error("Vilao API error: " + response.statusCode + " " + errorText);
      }

      let dataText = '';
      for await (const chunk of response) {
        const text = chunk.toString();
        dataText += text;
        if (onStream) {
          onStream(text);
        }
      }

      let data;
      try {
        data = JSON.parse(dataText);
      } catch (e) {
        throw new Error("Failed to parse Vilao response: " + dataText.substring(0, 100));
      }

      if (isEmptyVilaoContent(data)) {
        // Content rỗng/thiếu = lỗi TẠM ⇒ retry giống 5xx (đừng fail thẳng thành "Lỗi vẽ hình").
        // maxAttempts=1 (caller đã hedge) ⇒ 0<0 sai ⇒ ném ngay, để hedge/caller lo — không chồng retry.
        if (attempt < maxAttempts - 1) {
          console.warn("Vilao empty content, retry attempt " + attempt);
          await sleepMs(500 * attempt);
          attempt++;
          continue;
        }
        throw new Error('Vilao returned empty content');
      }
      if (returnRaw) {
        return { content: data.choices[0].message.content, usage: data.usage || null, model: modelToUse };
      }
      return data.choices[0].message.content;

    } catch (err) {
      if (isNetworkError(err) && attempt < maxAttempts - 1) {
        console.warn("Vilao network error: " + err.message + ", retry attempt " + attempt);
        await sleepMs(1000 * attempt);
        attempt++;
        continue;
      }
      throw err;
    }
  }

  throw new Error('Vilao failed after maximum retries');
}

// HEDGE TRỄ: chạy fn() một lần; nếu sau delayMs vẫn chưa xong thì bắn THÊM 1 lượt song song,
// lấy KẾT QUẢ hợp lệ VỀ TRƯỚC (Promise.any). Trị "spike" độ trễ ngẫu nhiên của model: đa số
// lượt ~5s xong trước delayMs → KHÔNG tốn thêm; chỉ khi spike mới gọi lượt 2 (spike độc lập
// từng lượt nên lượt 2 gần như luôn nhanh) ⇒ đuôi độ trễ bị cắt mà không phải chờ hết timeout.
// Chỉ ném khi CẢ HAI lượt đều hỏng.
export async function hedge(fn, { delayMs = 6000 } = {}) {
  const swallow = (p) => { p.catch(() => {}); return p; };   // chặn unhandledRejection của lượt thua
  const first = swallow(fn());
  const HEDGE = Symbol('hedge');
  const timer = new Promise((res) => setTimeout(() => res(HEDGE), delayMs));

  // Đợi: first xong (ok/lỗi) HOẶC chạm mốc delayMs.
  const winner = await Promise.race([
    first.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e })),
    timer,
  ]);

  if (winner !== HEDGE) {
    if (winner.ok) return winner.v;         // first xong sớm, thành công
    return await swallow(fn());             // first lỗi sớm → thử lại ngay (1 lượt)
  }

  // first còn chậm (spike) → bắn lượt 2 song song, lấy cái nào THÀNH CÔNG trước.
  const second = swallow(fn());
  return await Promise.any([first, second]);   // reject (AggregateError) chỉ khi cả hai đều hỏng
}
