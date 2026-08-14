// api/_lib/testApiKeys.js
// Danh sách API key cho TAB admin "Test API Key". CHỈ dùng phía server — endpoint
// KHÔNG BAO GIỜ trả apiKey về client (chỉ trả id/name/model qua getTestApiKeysPublic).
//
// Bảo mật: ưu tiên đọc từ biến môi trường; fallback giá trị dán sẵn để chạy ngay.
// NÊN chuyển sang env (TEST_KEY_FLASH_HIGH / TEST_KEY_FLASH_LOW) rồi xoá literal ở đây.

export function getTestApiKeys() {
  const keys = [
    {
      id: 'project',
      name: 'Dự án (mặc định)',
      model: process.env.VILAO_MODEL || 'ram/gemini-3.5-flash-low',
      apiKey: process.env.VILAO_API_KEY || '',
    },
    {
      id: 'flash-high',
      name: 'Gemini 3.6 Flash · High',
      model: 'mn/ag/gemini-3.6-flash-high',
      apiKey: process.env.TEST_KEY_FLASH_HIGH
        || 'sk-19ea7838577e8689edca2ad3272d5225c7b5b92e1f3c33a7bc97e253f62b92b1',
    },
    {
      id: 'flash-low',
      name: 'Gemini 3.6 Flash · Low',
      model: 'lgg/ag/gemini-3.6-flash-low',
      apiKey: process.env.TEST_KEY_FLASH_LOW
        || 'sk-a1eb6b7af130fec5632d8620ff9a3ce683f2200f6228e89f9b502655ab03faa6',
    },
    {
      id: 'qwen-397b',
      name: 'Qwen 3.5 · 397B',
      model: 'alic/ds/qwen3.5-397b-a17b',
      apiKey: process.env.TEST_KEY_QWEN_397B
        || 'sk-a13e39bfe7a424372ee5af756c28f82342cb15cbc292a932079a04057d63352c',
    },
    {
      id: 'qwen-35b',
      name: 'Qwen 3.6 · 35B',
      model: 'alic/ds/qwen3.6-35b-a3b',
      apiKey: process.env.TEST_KEY_QWEN_35B
        || 'sk-625de9fd43b40fed2c82b1f6ac5cd1018c80d69066a599edd9b40cdbc95310e3',
    },
    {
      id: 'grok',
      name: 'Grok 4.6',
      model: 'dss/grok-4.6',
      apiKey: process.env.TEST_KEY_GROK
        || 'sk-bb93b4170839a4bdad950a1e34f999ae73095a25e0fd2f6dfeafd1f3bec86d68',
    },
    {
      id: 'gpt-luna',
      name: 'GPT 5.6 · Luna',
      model: 'cd/gpt-5.6-luna',
      apiKey: process.env.TEST_KEY_GPT_LUNA
        || 'sk-99fa80de73fe3bfe911a4e46ff58a80be497c726cefe30a64a54129d5aa466cf',
    },
  ];
  return keys.filter((k) => k.apiKey); // bỏ key thiếu (vd VILAO_API_KEY chưa cấu hình)
}

/** Metadata AN TOÀN để trả về client (KHÔNG kèm apiKey). */
export function getTestApiKeysPublic() {
  return getTestApiKeys().map(({ id, name, model }) => ({ id, name, model }));
}
