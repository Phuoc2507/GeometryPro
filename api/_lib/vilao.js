

const VILAO_BASE_URL = 'https://api.vilao.ai';
const VILAO_MODEL = 'gx/gpt-5.5';
const VILAO_API_KEY = 'sk-2806ea932a5fdf89ba0bde1c5f5b3239a7d4c831fb1e1f052a9d6a6d720dfd40';

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
 * Call Vilao API.
 */
export async function callVilao(systemPrompt, userMessage, options = {}) {
  const {
    maxTokens = 4096,
    timeoutMs = 180000,
    useJsonMode = false,
    imageBase64,
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

      // Default to gx/gpt-5.5
      let resolvedModel = 'gx/gpt-5.5';
      let currentApiKey = 'sk-2806ea932a5fdf89ba0bde1c5f5b3239a7d4c831fb1e1f052a9d6a6d720dfd40';

      if (options.aiModel === 'low') {
        resolvedModel = 'occ/claude-haiku-4-5-20251001';
        currentApiKey = 'sk-4280cfba5e7aa2cfe9dd5b3715ca9987ec70037be0094b8e129c6c750ce90af5';
      } else if (options.aiModel === 'high' || options.aiModel === 'high-medium') {
        resolvedModel = 'ant/claude-sonnet-4-6';
        currentApiKey = 'sk-4280cfba5e7aa2cfe9dd5b3715ca9987ec70037be0094b8e129c6c750ce90af5';
      }

      const bodyObj = {
        model: resolvedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessageContent },
        ],
        max_tokens: maxTokens,
        temperature: 0,
        stream: !!options.onStream,
      };

      // Handle reasoning effort for models that support it (Vilao translates it)
      if (options.useReasoning) {
        bodyObj.reasoning_effort = "high";
      } else if (options.aiModel === 'medium' || options.aiModel === 'high-medium') {
        bodyObj.reasoning_effort = "medium";
      } else {
        bodyObj.reasoning_effort = "low";
      }

      if (useJsonMode) {
        bodyObj.response_format = { type: 'json_object' };
      }

      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentApiKey}`
      };

      const response = await fetch(`${VILAO_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify(bodyObj),
      });

      if (!response.ok) {
        let errorText = '';
        try { errorText = await response.text(); } catch {}

        console.error('Vilao error:', response.status, errorText);

        if ([502, 503, 504].includes(response.status) && attempt < maxAttempts) {
          console.warn(`Vilao ${response.status}, retry attempt ${attempt + 1}/${maxAttempts}`);
          await sleepMs(250 * attempt);
          continue;
        }

        throw new Error(`Vilao API error: ${response.status} — ${errorText.slice(0, 200)}`);
      }

      if (bodyObj.stream) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep the last incomplete line in buffer
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') break;
              try {
                const data = JSON.parse(dataStr);
                const text = data.choices?.[0]?.delta?.content || "";
                if (text) {
                  fullContent += text;
                  if (options.onStream) options.onStream(text);
                }
              } catch (e) {}
            }
          }
        }
        return fullContent.trim();
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Vilao trả về rỗng');
      return content;

    } catch (error) {
      if (attempt < maxAttempts && !isAbortError(error) && isRetriableNetworkError(error)) {
        console.warn(`Transient Vilao network error, retry ${attempt + 1}/${maxAttempts}:`, error?.message);
        await sleepMs(250 * attempt);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Vilao request failed after retries');
}
