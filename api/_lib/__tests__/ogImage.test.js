import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { renderGeometryPng, OG_WIDTH, OG_HEIGHT } from '../ogImage.js';

const PNG_SIGNATURE = '89504e470d0a1a0a';

/** Chóp S.ABCD — dạng bài phổ biến nhất, dùng làm hình mẫu cho cả bộ test. */
const PYRAMID = {
  points: [
    { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
    { id: 'B', label: 'B', x: 4, y: 0, z: 0 },
    { id: 'C', label: 'C', x: 4, y: 0, z: 4 },
    { id: 'D', label: 'D', x: 0, y: 0, z: 4 },
    { id: 'S', label: 'S', x: 2, y: 5, z: 2 },
  ],
  lines: [
    { id: '1', from: 'A', to: 'B' },
    { id: '2', from: 'B', to: 'C' },
    { id: '3', from: 'C', to: 'D', style: 'dashed' },
    { id: '4', from: 'D', to: 'A', style: 'dashed' },
    { id: '5', from: 'S', to: 'A' },
    { id: '6', from: 'S', to: 'B' },
    { id: '7', from: 'S', to: 'C' },
  ],
};

/** Đọc IHDR để biết ảnh thật sự có kích thước/định dạng gì. */
function readIhdr(png) {
  expect(png.slice(12, 16).toString('ascii')).toBe('IHDR');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bitDepth: png[24],
    colorType: png[25],
    interlace: png[28],
  };
}

/** Giải nén IDAT về pixel thô để kiểm nội dung ảnh (không chỉ tin vào header). */
function decodePixels(png) {
  const { width, height } = readIhdr(png);
  let offset = 8;
  const parts = [];
  while (offset < png.length) {
    const len = png.readUInt32BE(offset);
    const type = png.slice(offset + 4, offset + 8).toString('ascii');
    if (type === 'IDAT') parts.push(png.slice(offset + 8, offset + 8 + len));
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = width * 3;
  const px = [];
  for (let y = 0; y < height; y++) {
    // Byte đầu mỗi dòng quét là byte filter, phải bằng 0 (None).
    expect(raw[y * (stride + 1)]).toBe(0);
    px.push(raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
  }
  return { width, height, rows: px };
}

describe('renderGeometryPng', () => {
  it('xuất PNG hợp lệ đúng khổ Open Graph 1200×630', () => {
    const png = renderGeometryPng(PYRAMID);
    expect(png).toBeInstanceOf(Buffer);
    expect(png.slice(0, 8).toString('hex')).toBe(PNG_SIGNATURE);

    const ihdr = readIhdr(png);
    expect(ihdr.width).toBe(OG_WIDTH);
    expect(ihdr.height).toBe(OG_HEIGHT);
    expect(ihdr.bitDepth).toBe(8);
    expect(ihdr.colorType).toBe(2);    // truecolour RGB
    expect(ihdr.interlace).toBe(0);    // bot mạng xã hội không thích interlace
    expect(png.slice(-8, -4).toString('ascii')).toBe('IEND');
  });

  it('thật sự VẼ ra hình chứ không trả về một tấm nền trơn', () => {
    const { rows } = decodePixels(renderGeometryPng(PYRAMID));
    const seen = new Set();
    for (const row of rows) {
      for (let i = 0; i < row.length; i += 3) {
        seen.add(`${row[i]},${row[i + 1]},${row[i + 2]}`);
      }
    }
    // Nền + nét chính + nét đứt + màu điểm, cộng các mức trung gian do khử răng cưa.
    expect(seen.size).toBeGreaterThan(20);

    const bg = '10,10,15';
    const total = rows.length * (rows[0].length / 3);
    let painted = 0;
    for (const row of rows) {
      for (let i = 0; i < row.length; i += 3) {
        if (`${row[i]},${row[i + 1]},${row[i + 2]}` !== bg) painted++;
      }
    }
    // Wireframe thì thưa, nhưng phải có nét thật — vài phần nghìn khung ảnh trở lên.
    expect(painted / total).toBeGreaterThan(0.002);
    expect(painted / total).toBeLessThan(0.5);
  });

  it('trả null khi không đủ dữ liệu để vẽ (caller tự lùi về ảnh mặc định)', () => {
    expect(renderGeometryPng(null)).toBeNull();
    expect(renderGeometryPng({})).toBeNull();
    expect(renderGeometryPng({ points: [] })).toBeNull();
    expect(renderGeometryPng({ points: [{ id: 'A', x: 0, y: 0, z: 0 }] })).toBeNull();
  });

  it('bỏ qua điểm ẩn và điểm có toạ độ hỏng thay vì vỡ', () => {
    const g = {
      points: [
        ...PYRAMID.points,
        { id: 'X', label: 'X', x: NaN, y: 0, z: 0 },
        { id: 'Y', label: 'Y', x: 1, y: null, z: 0 },
        { id: 'Z', label: 'Z', x: 9, y: 9, z: 9, hidden: true },
      ],
      lines: [...PYRAMID.lines, { id: 'bad', from: 'X', to: 'A' }, { id: 'ghost', from: 'nope', to: 'A' }],
    };
    const png = renderGeometryPng(g);
    expect(png).toBeInstanceOf(Buffer);
    expect(readIhdr(png).width).toBe(OG_WIDTH);
  });

  it('hình suy biến (mọi điểm trùng nhau) không gây chia cho 0', () => {
    const g = {
      points: [
        { id: 'A', label: 'A', x: 2, y: 2, z: 2 },
        { id: 'B', label: 'B', x: 2, y: 2, z: 2 },
      ],
      lines: [{ id: '1', from: 'A', to: 'B' }],
    };
    const png = renderGeometryPng(g);
    expect(png).toBeInstanceOf(Buffer);
    expect(readIhdr(png).width).toBe(OG_WIDTH);
  });

  it('nhãn có ký tự ngoài bảng phông thì bỏ qua ký tự đó, không ném lỗi', () => {
    const g = {
      ...PYRAMID,
      points: PYRAMID.points.map((p) => ({ ...p, label: `${p.label}′ệ` })),
    };
    expect(() => renderGeometryPng(g)).not.toThrow();
  });

  it('đủ nhanh cho một hàm serverless', () => {
    const t0 = Date.now();
    renderGeometryPng(PYRAMID, { caption: 'geo3d.io.vn' });
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it('ảnh đủ nhỏ để bot mạng xã hội tải (dưới 1MB)', () => {
    const png = renderGeometryPng(PYRAMID, { caption: 'geo3d.io.vn' });
    expect(png.length).toBeLessThan(1024 * 1024);
  });
});
