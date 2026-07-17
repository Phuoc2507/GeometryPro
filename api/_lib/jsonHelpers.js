import { callVilao } from './vilao.js';

export function repairTruncatedJson(jsonStr) {
  let s = jsonStr.trim();

  // Close unclosed string first
  let inString = false, escaped = false;
  for (const ch of s) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
  }
  if (inString) s += '"';

  // Remove various trailing incomplete patterns (order matters)
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"\s*$/, '');
    s = s.replace(/,\s*"[^"]*"\s*:\s*[\d.\-]+\s*$/, '');
    s = s.replace(/,\s*"[^"]*$/, '');
    s = s.replace(/,\s*"[^"]*"\s*:\s*$/, '');
    s = s.replace(/,\s*\{[^{}]*$/, '');
    s = s.replace(/,\s*\[[^\[\]]*$/, '');
    s = s.replace(/,\s*$/, '');
    if (s === before) break;
  }

  // Recount and balance braces/brackets
  let braces = 0, brackets = 0;
  inString = false; escaped = false;
  for (const ch of s) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }

  return s;
}

export function extractFirstJsonCandidate(input) {
  const startObj = input.indexOf('{');
  const startArr = input.indexOf('[');
  
  let start = -1;
  let isArray = false;
  
  if (startObj !== -1 && startArr !== -1) {
    start = Math.min(startObj, startArr);
    isArray = start === startArr;
  } else if (startObj !== -1) {
    start = startObj;
  } else if (startArr !== -1) {
    start = startArr;
    isArray = true;
  }

  if (start === -1) return null;

  let inString = false;
  let escaped = false;
  let depth = 0;
  let objectStart = -1;
  let bestStart = -1;
  let bestEnd = -1;

  const openChar = isArray ? '[' : '{';
  const closeChar = isArray ? ']' : '}';

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (escaped) { escaped = false; continue; }
    if (inString && ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === openChar) {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (ch === closeChar) {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        bestStart = objectStart;
        bestEnd = i + 1;
      }
      if (depth < 0) { depth = 0; objectStart = -1; }
    }
  }

  if (bestStart !== -1 && bestEnd !== -1) return input.slice(bestStart, bestEnd);
  if (objectStart !== -1) return input.slice(objectStart);
  return input.slice(start);
}

export function parseJsonResponse(raw) {
  let jsonStr = raw.trim();

  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const markerMatch = jsonStr.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
  if (markerMatch) {
    jsonStr = markerMatch[1].trim();
  }

  // Strip <think>...</think> blocks (deepseek-r1 reasoning)
  const thinkMatch = jsonStr.match(/<think>[\s\S]*?<\/think>\s*([\s\S]*)/);
  if (thinkMatch) {
    jsonStr = thinkMatch[1].trim();
  }

  const candidate = extractFirstJsonCandidate(jsonStr) ?? jsonStr;
  const attempts = [
    candidate,
    repairTruncatedJson(candidate),
    repairTruncatedJson(jsonStr),
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (e) {
      lastError = e;
    }
  }

  const errMessage = lastError instanceof Error ? lastError.message : 'Unknown parse error';
  throw new Error(`Không parse được JSON AI: ${errMessage}`);
}

export async function parseJsonResponseWithAiRepair(raw) {
  try {
    return parseJsonResponse(raw);
  } catch (initialErr) {
    console.warn('Primary JSON parse failed, trying Ollama JSON fixer:', initialErr?.message);

    const candidate = extractFirstJsonCandidate(raw) ?? raw;
    const clipped = candidate.slice(0, 16000);

    const fixerSystemPrompt = `Bạn là bộ sửa JSON chuyên nghiệp. Nhận chuỗi JSON bị lỗi/cắt và trả về JSON HỢP LỆ duy nhất, không markdown, không giải thích.`;
    const fixerUserPrompt = `Sửa chuỗi sau thành JSON hợp lệ. Giữ tối đa dữ liệu gốc, loại bỏ phần hỏng ở cuối nếu cần:\n\n${clipped}`;

    const fixedRaw = await callVilao(fixerSystemPrompt, fixerUserPrompt, { maxTokens: 4096, timeoutMs: 60000 });

    try {
      return parseJsonResponse(fixedRaw);
    } catch (fixErr) {
      throw new Error(`Không thể phục hồi JSON: ${fixErr?.message}`);
    }
  }
}

export function formatSpecialPoints(specialPoints) {
  if (!Array.isArray(specialPoints) || specialPoints.length === 0) return '';

  const lines = specialPoints.map((sp) => {
    const ofText = Array.isArray(sp?.of)
      ? sp.of.join(' và ')
      : (typeof sp?.of === 'string' ? sp.of : '');

    const toLineText = Array.isArray(sp?.to_line)
      ? sp.to_line.join('')
      : (typeof sp?.to_line === 'string' ? sp.to_line : '');

    return `  + ${sp?.id || '?'}: ${sp?.type || 'unknown'}${ofText ? ` của ${ofText}` : ''}${sp?.from ? ` từ ${sp.from}` : ''}${toLineText ? ` đến đường ${toLineText}` : ''}`;
  });

  return `\n- Điểm phụ cần tính:\n${lines.join('\n')}`;
}
