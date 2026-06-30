

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const TEXT_MODEL = process.env.TEXT_MODEL || 'deepseek-r1:14b';
const VISION_MODEL = process.env.VISION_MODEL || TEXT_MODEL;
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '';

function isRetriableNetworkError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('broken pipe')
    || msg.includes('stream closed')
    || msg.includes('connection error')
    || msg.includes('connection reset')
    || msg.includes('network')
    || msg.includes('econnrefused')
    || msg.includes('fetch failed');
}

function isAbortError(error) {
  return error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted');
}

async function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Ollama local API (OpenAI-compatible endpoint).
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {{ maxTokens?: number, timeoutMs?: number, useJsonMode?: boolean, model?: string, imageBase64?: string }} options
 * @returns {Promise<string>} raw text content from the model
 */
export async function callOllama(systemPrompt, userMessage, options = {}) {
  const {
    maxTokens = 4096,
    timeoutMs = 300000,
    useJsonMode = false,
    imageBase64,
    model = imageBase64 ? VISION_MODEL : TEXT_MODEL,
    apiKey = OLLAMA_API_KEY,
  } = options;

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const userMessageContent = imageBase64
        ? [
            { type: 'text', text: userMessage },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        : userMessage;

      const bodyObj = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessageContent },
        ],
        max_tokens: maxTokens,
        temperature: 0,
        stream: false,
      };

      // Add reasoning_effort if specified in environment
      if (process.env.REASONING_EFFORT) {
        bodyObj.reasoning_effort = process.env.REASONING_EFFORT;
      }

      if (useJsonMode) {
        bodyObj.format = 'json';
        bodyObj.response_format = { type: 'json_object' };
      }

      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify(bodyObj),
      });

      if (!response.ok) {
        let errorText = '';
        try { errorText = await response.text(); } catch {}

        console.error('Ollama error:', response.status, errorText);

        if ([502, 503, 504].includes(response.status) && attempt < maxAttempts) {
          console.warn(`Ollama ${response.status}, retry attempt ${attempt + 1}/${maxAttempts}`);
          await sleepMs(250 * attempt);
          continue;
        }

        throw new Error(`Ollama API error: ${response.status} — ${errorText.slice(0, 200)}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Ollama trả về rỗng');
      return content;

    } catch (error) {
      if (attempt < maxAttempts && !isAbortError(error) && isRetriableNetworkError(error)) {
        console.warn(`Transient Ollama network error, retry ${attempt + 1}/${maxAttempts}:`, error?.message);
        await sleepMs(250 * attempt);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Ollama request failed after retries');
}
