import https from 'https';

const VILAO_BASE_URL = 'https://api.vilao.ai';
const VILAO_MODEL = 'ram/gemini-3.5-flash-low';

function httpsRequest(url, options, bodyData, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      resolve(res);
    });
    
    req.on('error', (err) => {
      reject(err);
    });

    if (timeoutMs) {
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error('Request timed out'));
      });
    }

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

function isNetworkError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('timeout')
    || msg.includes('econnreset')
    || msg.includes('connection reset')
    || msg.includes('network')
    || msg.includes('econnrefused')
    || msg.includes('fetch failed');
}

async function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const maxAttempts = 2;
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

      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message?.content || '';
        if (content.trim() === '') {
          throw new Error('Vilao returned empty content');
        }
        return content;
      } else {
        throw new Error('Invalid response structure from Vilao');
      }

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
