import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  escapeHtml, clampText, shareTitleAndDescription, injectShareMeta, isValidShareId, publicOrigin,
} from '../shareMeta.js';

// Dùng CHÍNH index.html của dự án làm đầu vào. Nếu ai đó đổi <head> theo cách làm
// hỏng phép thay thẻ, test này phải đỏ — chứ không phải phát hiện khi link đã lên Facebook.
const INDEX_HTML = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

const META = {
  title: 'Chóp S.ABCD đáy hình vuông — geo3d',
  description: 'Cho hình chóp S.ABCD có đáy là hình vuông cạnh a…',
  url: 'https://geo3d.io.vn/s/3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  image: 'https://geo3d.io.vn/og/s/3f2504e0-4f89-41d3-9a0c-0305e82c3301.png',
};

describe('clampText', () => {
  it('gom khoảng trắng và xuống dòng thành một dấu cách', () => {
    expect(clampText('  Cho   hình\n\nchóp  ', 100)).toBe('Cho hình chóp');
  });

  it('cắt ở ranh giới từ và thêm dấu lửng', () => {
    const out = clampText('một hai ba bốn năm sáu bảy tám chín mười', 20);
    expect(out.length).toBeLessThanOrEqual(21);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('mườ');   // không cắt giữa từ
  });

  it('chuỗi rỗng / null trả về rỗng', () => {
    expect(clampText(null, 10)).toBe('');
    expect(clampText(undefined, 10)).toBe('');
  });
});

describe('shareTitleAndDescription', () => {
  it('lấy ĐỀ BÀI làm mô tả — đó là thứ người lướt mạng đọc', () => {
    const r = shareTitleAndDescription({
      name: 'Chóp S.ABCD',
      prompt: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a.',
    });
    expect(r.title).toBe('Chóp S.ABCD — geo3d');
    expect(r.description).toContain('hình vuông cạnh a');
  });

  it('thiếu dữ liệu thì lùi về câu mặc định, không ra chuỗi rỗng', () => {
    const r = shareTitleAndDescription({});
    expect(r.title).toBeTruthy();
    expect(r.description).toBeTruthy();
  });
});

describe('isValidShareId', () => {
  it('chỉ nhận UUID', () => {
    expect(isValidShareId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true);
    expect(isValidShareId('local_12345')).toBe(false);
    expect(isValidShareId('../../etc/passwd')).toBe(false);
    expect(isValidShareId('')).toBe(false);
    expect(isValidShareId(null)).toBe(false);
  });
});

describe('injectShareMeta', () => {
  const out = injectShareMeta(INDEX_HTML, META);

  it('KHÔNG để sót thẻ og:title mặc định (Facebook sẽ lấy nhầm thẻ đầu tiên)', () => {
    const titles = out.match(/property=["']og:title["']/g) || [];
    expect(titles).toHaveLength(1);
    expect(out).toContain(`content="${META.title}"`);
    expect(out).not.toContain('geo3d — Vẽ hình học không gian 3D từ đề bài bằng AI');
  });

  it('mỗi thẻ OG/twitter chỉ xuất hiện đúng một lần', () => {
    for (const key of ['og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image']) {
      const found = out.match(new RegExp(`["']${key}["']`, 'g')) || [];
      expect(found, key).toHaveLength(1);
    }
    expect(out.match(/<title>/g)).toHaveLength(1);
    expect(out.match(/rel=["']canonical["']/g)).toHaveLength(1);
  });

  it('GIỮ NGUYÊN phần khởi động SPA — người dùng thật vẫn phải nhận đúng app', () => {
    expect(out).toContain('<div id="root">');
    expect(out).toMatch(/<script type="module"[^>]*src="\/src\/main\.tsx"/);
  });

  it('giữ các thẻ head khác (charset, viewport, theme-color, manifest, favicon)', () => {
    expect(out).toContain('charset="UTF-8"');
    expect(out).toContain('name="viewport"');
    expect(out).toContain('name="theme-color"');
    expect(out).toContain('rel="manifest"');
    expect(out).toContain('rel="icon"');
  });

  it('không tìm thấy </head> thì trả nguyên xi, không cắt bậy', () => {
    const junk = '<p>không phải trang html</p>';
    expect(injectShareMeta(junk, META)).toBe(junk);
  });

  it('tên/đề bài độc hại KHÔNG thoát ra khỏi thuộc tính HTML', () => {
    const evil = injectShareMeta(INDEX_HTML, {
      ...META,
      title: '"><script>alert(1)</script>',
      description: "' onload='alert(2)",
    });
    expect(evil).not.toContain('<script>alert(1)</script>');
    expect(evil).toContain('&quot;&gt;&lt;script&gt;');
    expect(evil).not.toContain("onload='alert(2)");
  });
});

describe('publicOrigin', () => {
  it('suy ra từ header khi chưa cấu hình NEXT_PUBLIC_APP_URL', () => {
    const saved = process.env.NEXT_PUBLIC_APP_URL;
    const savedVite = process.env.VITE_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VITE_APP_URL;
    try {
      expect(publicOrigin({ headers: { host: 'geo3d.io.vn', 'x-forwarded-proto': 'https' } }))
        .toBe('https://geo3d.io.vn');
      expect(publicOrigin({ headers: { 'x-forwarded-host': 'preview.vercel.app' } }))
        .toBe('https://preview.vercel.app');
    } finally {
      if (saved !== undefined) process.env.NEXT_PUBLIC_APP_URL = saved;
      if (savedVite !== undefined) process.env.VITE_APP_URL = savedVite;
    }
  });

  it('bỏ dấu / thừa ở cuối để không sinh URL kiểu //s/id', () => {
    const saved = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://geo3d.io.vn/';
    try {
      expect(publicOrigin({ headers: {} })).toBe('https://geo3d.io.vn');
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = saved;
    }
  });
});

describe('escapeHtml', () => {
  it('bọc đủ 5 ký tự nguy hiểm', () => {
    expect(escapeHtml(`<a href="x" data='y'>&`)).toBe('&lt;a href=&quot;x&quot; data=&#39;y&#39;&gt;&amp;');
  });
});
