import { callOllama } from './_lib/ollama.js';
import { validateAndFixProjections } from './_lib/postProcess.js';
import { generateLatexCode } from './_lib/generateLatex.js';

const MODIFY_SYSTEM_PROMPT = `Bạn là chuyên gia chỉnh sửa hình học 3D cho học sinh Việt Nam (lớp 11-12). Nhận hình học hiện tại + yêu cầu chỉnh sửa → trả về hình học đã cập nhật.

═══════════════════════════════════════════════════════
HỆ TOẠ ĐỘ (Z-UP)
═══════════════════════════════════════════════════════
- Oxy (z=0) = đáy, Oz hướng lên

═══════════════════════════════════════════════════════
CÔNG THỨC TÍNH TOÁN (BẮT BUỘC DÙNG CHÍNH XÁC)
═══════════════════════════════════════════════════════

📍 TRUNG ĐIỂM M của AB:
   M = ((Ax+Bx)/2, (Ay+By)/2, (Az+Bz)/2)

📍 TRỌNG TÂM G tam giác ABC:
   G = ((Ax+Bx+Cx)/3, (Ay+By+Cy)/3, (Az+Bz+Cz)/3)

📍 CHIA ĐOẠN theo tỉ lệ k (AM/AB = k):
   M = A + k(B - A) = (Ax+k(Bx-Ax), Ay+k(By-Ay), Az+k(Bz-Az))

📍 HÌNH CHIẾU VUÔNG GÓC của P lên đường AB:
   AB = B - A, AP = P - A
   t = (AP · AB) / |AB|²
   H = A + t × AB
   ⚠️ KIỂM TRA: PH · AB phải = 0

📍 HÌNH CHIẾU VUÔNG GÓC của P lên mặt phẳng (ABC):
   n = AB × AC (pháp tuyến = tích có hướng)
   d = ((P-A) · n) / |n|²
   H = P - d × n

📍 HÌNH CHIẾU lên mặt phẳng z=0: H = (Px, Py, 0)

📍 GIAO ĐIỂM 2 đường thẳng AB và CD:
   Tham số hoá: P = A + s(B-A), Q = C + t(D-C)
   Giải hệ: A + s(B-A) = C + t(D-C)

📍 TÍCH CÓ HƯỚNG (cross product):
   u × v = (uy·vz - uz·vy, uz·vx - ux·vz, ux·vy - uy·vx)

📍 TÍCH VÔ HƯỚNG (dot product):
   u · v = ux·vx + uy·vy + uz·vz

═══════════════════════════════════════════════════════
THUẬT NGỮ TIẾNG VIỆT → HÀNH ĐỘNG
═══════════════════════════════════════════════════════

- "trung điểm X của AB" → tính midpoint, thêm điểm X, vẽ đường liên quan
- "chân đường cao từ A hạ xuống BC" → hình chiếu vuông góc A lên BC
- "hình chiếu của X lên mặt phẳng Y" → projection lên plane
- "nối A với trung điểm BC" → thêm trung điểm M, vẽ AM
- "giao điểm của AB và CD" → tính intersection
- "vẽ thêm đường..." → thêm line mới
- "xoá/bỏ điểm X" → remove point X và các line liên quan
- "đổi tên X thành Y" → update label
- "dời/di chuyển X đến..." → update coordinates

═══════════════════════════════════════════════════════
QUY TẮC BẮT BUỘC
═══════════════════════════════════════════════════════

1. GIỮ NGUYÊN tất cả điểm và đường hiện có (trừ khi yêu cầu xoá)
2. Điểm mới: id ngắn gọn (M, H, G, H1, M1...), label rõ ràng
3. Đường mới: style LUÔN = "solid"
4. SAU KHI TÍNH: kiểm tra lại bằng dot product (vuông góc = 0), khoảng cách
5. addedElements phải liệt kê ĐÚNG các phần tử mới thêm

═══════════════════════════════════════════════════════
OUTPUT FORMAT — CHỈ JSON THUẦN, KHÔNG MARKDOWN
═══════════════════════════════════════════════════════
{
  "name": "Tên hình cập nhật",
  "points": [...tất cả điểm cũ + mới...],
  "lines": [...tất cả đường cũ + mới...],
  "spheres": [...], "circles": [...], "cylinders": [...], "cones": [...], "planes": [...],
  "vectors": [...mũi tên có hướng...],
  "angles": [...cung góc giữa 3 điểm...],
  "rightAngles": [...ký hiệu vuông góc tại đỉnh...],
  "equalMarks": [...vạch gạch trên cạnh bằng nhau...],
  "parallelMarks": [...mũi tên trên cạnh song song...],
  "addedElements": {
    "points": ["M"], "lines": ["l_AM"],
    "spheres": [], "circles": [], "cylinders": [], "cones": [], "planes": []
  }
}

ANNOTATION RULES:
- "vuông góc" → add rightAngles: {"id":"ra_X","vertex":"pointId","p1":"pointId","p2":"pointId"}
- Cạnh bằng nhau → add equalMarks: {"id":"eq_X","lineId":"lineId","count":1|2|3}
- Song song → add parallelMarks: {"id":"pm_X","lineId":"lineId","count":1|2}
- Vectơ → add vectors: {"id":"v_X","from":"pointId","to":"pointId","label":"text"}
- Góc → add angles: {"id":"ang_X","vertex":"pointId","p1":"pointId","p2":"pointId","label":"60°"}
- Only include annotation arrays that are relevant`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, currentGeometry } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Thiếu yêu cầu chỉnh sửa' });
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 1) return res.status(400).json({ error: 'Yêu cầu không được để trống' });
    if (trimmedPrompt.length > 2000) return res.status(400).json({ error: 'Yêu cầu quá dài (tối đa 2000 ký tự)' });

    if (!currentGeometry || typeof currentGeometry !== 'object') {
      return res.status(400).json({ error: 'Thiếu dữ liệu hình học hiện tại' });
    }
    if (!Array.isArray(currentGeometry.points) || !Array.isArray(currentGeometry.lines)) {
      return res.status(400).json({ error: 'Dữ liệu hình học không hợp lệ' });
    }
    if (currentGeometry.points.length > 100 || currentGeometry.lines.length > 200) {
      return res.status(400).json({ error: 'Hình quá phức tạp' });
    }

    console.log('Modifying geometry with prompt:', trimmedPrompt);

    const pointsSummary = currentGeometry.points
      .map((p) => `${p.label || p.id}(${p.x}, ${p.y}, ${p.z})`)
      .join(', ');

    const userMessage = `HÌNH HIỆN TẠI:
Tên: ${currentGeometry.name || 'Geometry'}
Các điểm: ${pointsSummary}
Số đường: ${currentGeometry.lines.length} đường nối

Dữ liệu JSON đầy đủ:
${JSON.stringify(currentGeometry, null, 2)}

YÊU CẦU CHỈNH SỬA: "${trimmedPrompt}"

Hãy:
1. Hiểu yêu cầu, xác định phép toán cần thực hiện
2. Tính toạ độ điểm mới CHÍNH XÁC bằng công thức
3. Kiểm tra lại kết quả (vuông góc → dot product = 0, khoảng cách đúng)
4. Trả về JSON đầy đủ (giữ nguyên tất cả điểm/đường cũ + thêm mới)

CHỈ trả về JSON thuần, KHÔNG markdown.`;

    const content = await callOllama(MODIFY_SYSTEM_PROMPT, userMessage, {
      maxTokens: 4096,
      timeoutMs: 120000,
      useJsonMode: false,
    });

    console.log('Modify AI response:', content?.substring(0, 300));

    let modifiedGeometry;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('\`\`\`')) {
        cleanContent = cleanContent.replace(/^\`\`\`(?:json)?\s*\n?/, '').replace(/\n?\`\`\`\s*$/, '');
      }
      const thinkMatch = cleanContent.match(/<think>[\s\S]*?<\/think>\s*([\s\S]*)/);
      if (thinkMatch) cleanContent = thinkMatch[1].trim();

      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        modifiedGeometry = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      if (content.toLowerCase().includes('clarif') || content.includes('?')) {
        return res.json({ needsClarification: true, message: content, geometry: currentGeometry });
      }
      return res.status(400).json({ error: 'Could not parse AI response', geometry: currentGeometry });
    }

    modifiedGeometry = validateAndFixProjections(modifiedGeometry, currentGeometry, trimmedPrompt);

    if (Array.isArray(modifiedGeometry.lines)) {
      modifiedGeometry.lines = modifiedGeometry.lines.map((l) => ({ ...l, style: 'solid' }));
    }

    modifiedGeometry.latexCode = generateLatexCode(modifiedGeometry);

    return res.json({
      geometry: modifiedGeometry,
      addedElements: modifiedGeometry.addedElements || { points: [], lines: [], spheres: [] },
    });

  } catch (error) {
    console.error('Error in modify-geometry:', error);
    const isAbort = error?.name === 'AbortError' || (error?.message || '').includes('aborted');
    const status = isAbort ? 504 : (error?.status || 500);
    const message = isAbort
      ? 'Yêu cầu quá lâu, vui lòng thử lại'
      : (error?.message || 'Unknown error');
    return res.status(status).json({ error: message });
  }
}
