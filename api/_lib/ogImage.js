// api/_lib/ogImage.js
// Dựng ảnh xem trước (Open Graph) cho một hình đã chia sẻ: GeometryData → PNG 1200×630.
//
// Vì sao tự vẽ thay vì dùng thư viện:
//   • Facebook/Zalo KHÔNG đọc SVG cho og:image — bắt buộc PNG/JPG ⇒ phải raster hoá.
//   • Thêm sharp/resvg vào hàm serverless là kéo theo binary nặng và rủi ro build.
//   • Hình học không gian chỉ là wireframe: điểm, đoạn thẳng, nhãn đỉnh. Vẽ tay đủ đẹp,
//     và zlib để nén PNG vốn đã nằm sẵn trong Node.
// ⇒ Module này KHÔNG có dependency ngoài, chạy được ở mọi runtime Node.
//
// Chống răng cưa bằng siêu lấy mẫu: vẽ ở gấp đôi kích thước rồi thu nhỏ 2×.

import zlib from 'node:zlib';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const SS = 2;                    // hệ số siêu lấy mẫu
const BG = [10, 10, 15];         // nền tối, khớp theme-color #09090b của app
const FG = [232, 232, 240];      // nét chính
const DIM = [120, 122, 138];     // nét khuất (dashed)
const ACCENT = [125, 170, 255];  // điểm + nhãn

// ── Phông chữ bitmap 5×7 ─────────────────────────────────────────────────────
// Nhãn đỉnh (A, B, S, M₁…) là thứ làm hình học "đọc được". Không có nhãn thì
// ảnh xem trước chỉ là một mớ đường thẳng vô danh. Chỉ cần hoa + số + vài dấu.
// Mỗi glyph = 7 hàng, mỗi hàng 5 bit (bit cao nhất = cột trái).
const FONT = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  0: [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  1: [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  2: [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  3: [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  4: [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  6: [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  9: [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  "'": [0x04, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
};

// ── Khung ảnh ────────────────────────────────────────────────────────────────
function createCanvas(w, h) {
  const data = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    data[i * 3] = BG[0]; data[i * 3 + 1] = BG[1]; data[i * 3 + 2] = BG[2];
  }
  return { w, h, data };
}

function setPx(cv, x, y, rgb) {
  const xi = x | 0, yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= cv.w || yi >= cv.h) return;
  const o = (yi * cv.w + xi) * 3;
  cv.data[o] = rgb[0]; cv.data[o + 1] = rgb[1]; cv.data[o + 2] = rgb[2];
}

/** Đoạn thẳng dày `width`px. `dash` > 0 ⇒ nét đứt (đơn vị pixel). */
function drawLine(cv, x0, y0, x1, y1, rgb, width = 2, dash = 0) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len === 0) return;
  const steps = Math.ceil(len);
  const r = Math.max(0, (width - 1) / 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (dash > 0 && Math.floor((t * len) / dash) % 2 === 1) continue;  // khoảng trống của nét đứt
    const cx = x0 + dx * t, cy = y0 + dy * t;
    for (let oy = -Math.ceil(r); oy <= Math.ceil(r); oy++) {
      for (let ox = -Math.ceil(r); ox <= Math.ceil(r); ox++) {
        if (ox * ox + oy * oy <= (r + 0.5) * (r + 0.5)) setPx(cv, cx + ox, cy + oy, rgb);
      }
    }
  }
}

function drawDisc(cv, cx, cy, r, rgb) {
  for (let oy = -Math.ceil(r); oy <= Math.ceil(r); oy++) {
    for (let ox = -Math.ceil(r); ox <= Math.ceil(r); ox++) {
      if (ox * ox + oy * oy <= r * r) setPx(cv, cx + ox, cy + oy, rgb);
    }
  }
}

/** Vẽ chuỗi bằng phông bitmap. `scale` = số pixel cho mỗi ô của glyph. */
function drawText(cv, text, x, y, rgb, scale = 3) {
  let cx = x;
  for (const ch of String(text).toUpperCase()) {
    const glyph = FONT[ch];
    if (glyph) {
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if ((glyph[row] >> (4 - col)) & 1) {
            drawDisc(cv, cx + col * scale + scale / 2, y + row * scale + scale / 2, scale * 0.62, rgb);
          }
        }
      }
    }
    cx += 6 * scale;  // 5 cột + 1 cột cách
  }
  return cx - x;
}

function textWidth(text, scale = 3) {
  return String(text).length * 6 * scale;
}

// ── Chiếu 3D → 2D ────────────────────────────────────────────────────────────
// Trực giao (không phối cảnh) như hình vẽ trong sách giáo khoa. Trục Y hướng lên
// theo quy ước của Three.js — đúng với thứ react-three-fiber đang dựng ở client.
const AZ = (35 * Math.PI) / 180;   // xoay quanh trục đứng
const EL = (22 * Math.PI) / 180;   // nâng camera

function project(p) {
  const sx = p.x * Math.cos(AZ) - p.z * Math.sin(AZ);
  const depth = p.x * Math.sin(AZ) + p.z * Math.cos(AZ);
  const sy = p.y * Math.cos(EL) - depth * Math.sin(EL);
  return { x: sx, y: sy };
}

/**
 * Dựng ảnh PNG xem trước cho một hình.
 * @param {object} geometry  GeometryData ({points, lines, ...})
 * @param {object} [opts]
 * @param {string} [opts.caption] Dòng chữ nhỏ ở góc (vd tên thương hiệu).
 * @returns {Buffer|null} PNG, hoặc null khi hình không có gì để vẽ (caller tự fallback).
 */
export function renderGeometryPng(geometry, opts = {}) {
  const points = Array.isArray(geometry?.points) ? geometry.points : [];
  const lines = Array.isArray(geometry?.lines) ? geometry.lines : [];
  const visible = points.filter((p) => p && !p.hidden
    && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
  if (visible.length < 2) return null;   // không đủ dữ liệu ⇒ để caller dùng ảnh mặc định

  const W = OG_WIDTH * SS, H = OG_HEIGHT * SS;
  const cv = createCanvas(W, H);

  // Chiếu rồi co giãn cho vừa khung, chừa lề.
  const proj = new Map();
  for (const p of visible) proj.set(p.id, project(p));
  const xs = [...proj.values()].map((q) => q.x);
  const ys = [...proj.values()].map((q) => q.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX, spanY = maxY - minY;

  // Lề hẹp: khung OG rất rộng (1200×630) nên hình thường bị chiều CAO giới hạn —
  // cắt bớt lề trên/dưới là cách duy nhất làm hình to lên đáng kể.
  const padX = 110 * SS, padTop = 58 * SS, padBottom = 92 * SS;
  const boxW = W - padX * 2, boxH = H - padTop - padBottom;
  // Hình suy biến (mọi điểm trùng nhau / thẳng hàng) ⇒ đừng chia cho 0.
  const scale = Math.min(
    spanX > 1e-9 ? boxW / spanX : Infinity,
    spanY > 1e-9 ? boxH / spanY : Infinity,
  );
  const k = Number.isFinite(scale) ? scale : 1;
  const cxOff = padX + (boxW - spanX * k) / 2;
  const cyOff = padTop + (boxH - spanY * k) / 2;

  // Toạ độ ảnh: lật trục y (thế giới hướng lên, ảnh hướng xuống).
  const to2d = (id) => {
    const q = proj.get(id);
    if (!q) return null;
    return { x: cxOff + (q.x - minX) * k, y: cyOff + (maxY - q.y) * k };
  };

  // Cạnh khuất vẽ trước để cạnh thấy nằm đè lên.
  const ordered = [...lines].sort((a, b) => (a?.style === 'dashed' ? -1 : 0) - (b?.style === 'dashed' ? -1 : 0));
  for (const ln of ordered) {
    if (!ln || ln.hidden) continue;
    const a = to2d(ln.from), b = to2d(ln.to);
    if (!a || !b) continue;
    const dashed = ln.style === 'dashed';
    drawLine(cv, a.x, a.y, b.x, b.y, dashed ? DIM : FG, dashed ? 2.5 * SS : 3 * SS, dashed ? 9 * SS : 0);
  }

  // Tâm của CHÍNH HÌNH (không phải tâm khung ảnh) — nhãn hắt ra ngoài tính từ đây.
  const figCenterX = cxOff + (spanX * k) / 2;

  for (const p of visible) {
    const q = to2d(p.id);
    if (!q) continue;
    drawDisc(cv, q.x, q.y, 5 * SS, ACCENT);
    if (p.label) {
      // Đặt nhãn lệch ra NGOÀI tâm hình để đỡ đè lên nét và lên chính điểm đó.
      const outX = q.x < figCenterX ? -1 : 1;
      const lx = q.x + (outX < 0 ? -textWidth(p.label, 4 * SS) - 14 * SS : 16 * SS);
      drawText(cv, p.label, lx, q.y - 14 * SS, ACCENT, 4 * SS);
    }
  }

  if (opts.caption) {
    drawText(cv, opts.caption, padX * 0.55, H - 72 * SS, DIM, 4 * SS);
  }

  return encodePng(downsample(cv, SS));
}

/** Trung bình từng ô n×n — đây là bước khử răng cưa. */
function downsample(cv, n) {
  if (n <= 1) return cv;
  const w = Math.floor(cv.w / n), h = Math.floor(cv.h / n);
  const out = { w, h, data: Buffer.alloc(w * h * 3) };
  const area = n * n;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < n; dy++) {
        const row = (y * n + dy) * cv.w;
        for (let dx = 0; dx < n; dx++) {
          const o = (row + x * n + dx) * 3;
          r += cv.data[o]; g += cv.data[o + 1]; b += cv.data[o + 2];
        }
      }
      const o = (y * w + x) * 3;
      out.data[o] = (r / area) | 0;
      out.data[o + 1] = (g / area) | 0;
      out.data[o + 2] = (b / area) | 0;
    }
  }
  return out;
}

// ── Bộ mã hoá PNG tối thiểu (chỉ dùng zlib có sẵn của Node) ──────────────────
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** RGB 8-bit, không interlace, mỗi dòng quét mang byte filter 0 (None). */
export function encodePng(cv) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: truecolour RGB
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // filter mặc định
  ihdr[12] = 0;  // không interlace

  const stride = cv.w * 3;
  const raw = Buffer.alloc((stride + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) {
    raw[y * (stride + 1)] = 0;
    cv.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
