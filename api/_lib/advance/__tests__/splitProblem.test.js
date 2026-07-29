import { describe, it, expect, vi } from 'vitest';
// hedge: bản thật chỉ chạy fn() rồi trả kết quả nhanh nhất — ở test mock thành "gọi fn() 1 lần"
// (không cần đo spike). Nhờ vậy splitProblem chạy y như prod nhưng callVilao vẫn là mock ở trên.
vi.mock('../../vilao.js', () => ({ callVilao: vi.fn(), hedge: vi.fn((fn) => fn()) }));
import { callVilao, hedge } from '../../vilao.js';
import { splitProblem } from '../splitProblem.js';

describe('splitProblem (Pass 0)', () => {
  it('parse + coverage ok → giữ multi_question', async () => {
    callVilao.mockResolvedValue(JSON.stringify({ type: 'multi_question', setup: 'chóp S.ABCD SA=2',
      parts: [{ label: 'a', hoi: 'thể tích chóp SA=2 ABCD', phan_tu_moi: [] },
              { label: 'b', hoi: 'trung điểm M của SC', phan_tu_moi: ['M'] }] }));
    const r = await splitProblem('Cho chóp S.ABCD SA=2. a) thể tích. b) M trung điểm SC.', {});
    expect(r.type).toBe('multi_question');
    expect(r.parts).toHaveLength(2);
  });
  it('coverage fail → rơi về single', async () => {
    callVilao.mockResolvedValue(JSON.stringify({ type: 'multi_question', setup: 'x',
      parts: [{ label: 'a', hoi: 'thể tích' }] })); // nuốt hết số/điểm
    const r = await splitProblem('Cho chóp S.ABCD SA=2a canh 3. a) V.', {});
    expect(r.type).toBe('single');
  });
  it('≥2 part nhưng nuốt token (5) khỏi CẢ setup lẫn parts → coverage gate → single', async () => {
    // setup + parts đều KHÔNG chứa "5" (toạ độ B(5;0) của đề gốc bị nuốt) → gate phải chặn.
    callVilao.mockResolvedValue(JSON.stringify({ type: 'multi_question', setup: 'A(1;2), B',
      parts: [{ label: 'a', hoi: 'khoảng cách A(1;2) đến B', phan_tu_moi: [] },
              { label: 'b', hoi: 'trung điểm M của AB', phan_tu_moi: ['M'] }] }));  // thiếu "5"
    const r = await splitProblem('Cho A(1;2), B(5;0). a) d(A,B). b) M trung điểm AB.', {});
    expect(r.type).toBe('single');
    expect(r._coverageMissing).toContain('5');
  });
  it('LLM ném/JSON hỏng → single (an toàn)', async () => {
    callVilao.mockRejectedValue(new Error('boom'));
    const r = await splitProblem('...', {});
    expect(r.type).toBe('single');
  });
  it('override khoá HỎNG (403) → tự lui về khoá base → vẫn ra rev-ox (không "chưa vẽ được")', async () => {
    // Bẫy hay gặp: ADVANCE_API_KEY còn trỏ khoá 403 cũ trên Vercel, đè VILAO_API_KEY tốt → mọi lượt tách
    // hỏng → toast "chưa vẽ được đề tròn xoay". Fallback: override hỏng thì thử lại bằng khoá base.
    const OK_JSON = JSON.stringify({
      type: 'single', setup: 'Miền (H): y=x^2, Ox, x=0, x=2',
      parts: [{ label: 'Câu 1', hoi: 'V quanh Ox', phan_tu_moi: [] }],
      template: 'rev-ox',
      templateParams: { outer: { kind: 'poly', coeffs: [0, 0, 1] }, domain: [0, 2], fnLabel: 'y=x^2' },
    });
    callVilao.mockImplementation((_sys, _user, o) =>
      o.apiKey === 'BADKEY' ? Promise.reject(new Error('Vilao API error: 403')) : Promise.resolve(OK_JSON));
    const r = await splitProblem('Cho (H) y=x^2, x=0, x=2. Tính V khối tròn xoay quanh Ox.', { apiKey: 'BADKEY' });
    expect(r.template).toBe('rev-ox');
    expect(r.templateParams.domain).toEqual([0, 2]);
  });
  it('ẢNH: ngân sách vision RỘNG (38s) + KHÔNG hedge (TTFT chậm là tương quan → bắn lượt 2 vô ích)', async () => {
    // Bug 504: timeout 13s CŨ bắn TRƯỚC khi vision nhả token đầu (~16–40s) ⇒ CLIENT_DISCONNECT 0 token
    // ⇒ mọi lượt tách-ảnh hỏng ⇒ fallback/retry chồng > 60s ⇒ 504. Ảnh phải 1 lượt, timeout rộng.
    callVilao.mockClear(); hedge.mockClear();
    callVilao.mockResolvedValue(JSON.stringify({ type: 'single', setup: 'x' }));
    await splitProblem('', { imageBase64: 'BASE64' });
    expect(hedge).not.toHaveBeenCalled();               // ảnh: KHÔNG hedge
    expect(callVilao).toHaveBeenCalledTimes(1);          // đúng 1 lượt vision
    expect(callVilao.mock.calls[0][2].timeoutMs).toBe(38000);
    expect(callVilao.mock.calls[0][2].imageBase64).toBe('BASE64');
  });
  it('CHỮ: giữ hedge + timeout 18s (model nhanh spike ~16–19s; 13s cũ cắt trước khi nhả token)', async () => {
    callVilao.mockClear(); hedge.mockClear();
    callVilao.mockResolvedValue(JSON.stringify({ type: 'single', setup: 'x' }));
    await splitProblem('Cho (H) giới hạn y=x^2, x=0, x=2.', {});
    expect(hedge).toHaveBeenCalled();                    // chữ: có hedge chống spike
    expect(callVilao.mock.calls[0][2].timeoutMs).toBe(18000);
    expect(callVilao.mock.calls[0][2].imageBase64).toBe(null);
  });
  it('rev-ox 1 câu (type=single) → VẪN GIỮ template + params (engine tự dựng & kiểm)', async () => {
    // Regression: bài "tính thể tích khối tròn xoay" chỉ 1 câu ⇒ type=single; template từng bị vứt
    // ở guard multi_question nên nhánh rev-ox không bao giờ chạy → "chưa vẽ được".
    callVilao.mockResolvedValue(JSON.stringify({
      type: 'single',
      setup: 'Miền (H): y=x^2, Ox, x=0, x=2',
      parts: [{ label: 'Câu 1', hoi: 'Tính thể tích khi quay quanh Ox', phan_tu_moi: [] }],
      template: 'rev-ox',
      templateParams: { outer: { kind: 'poly', coeffs: [0, 0, 1] }, domain: [0, 2], fnLabel: 'y=x^2' },
    }));
    const r = await splitProblem('Cho (H) giới hạn y=x^2, x=0, x=2. Tính V khối tròn xoay quanh Ox.', {});
    expect(r.template).toBe('rev-ox');
    expect(r.templateParams.domain).toEqual([0, 2]);
    expect(r.templateParams.outer).toEqual({ kind: 'poly', coeffs: [0, 0, 1] });
  });
  it('JSON escape HỎNG (gpt-5.6-sol nhả `\\ ` LaTeX) → vá khoan dung, VẪN giữ template', async () => {
    // gpt-5.6-sol thỉnh thoảng in `"fnLabel":"y=-x^2+2x,\ y=0"` — `\<space>` KHÔNG phải escape JSON hợp
    // lệ ⇒ JSON.parse ném ⇒ trước đây rơi thẳng về {type:'single'} MẤT template ⇒ "chưa vẽ được".
    // `\\ ` trong nguồn JS = backslash+space trong chuỗi thật (đúng thứ model nhả).
    const badJson = '{"type":"single","setup":"s",'
      + '"parts":[{"label":"Câu 1","hoi":"S","phan_tu_moi":[]}],'
      + '"template":"area-plane","templateParams":{"outer":{"kind":"poly","coeffs":[0,2,-1]},'
      + '"inner":{"kind":"const","c":0},"domain":[0,2],"fnLabel":"y=-x^2+2x,\\ y=0"}}';
    expect(() => JSON.parse(badJson)).toThrow();          // xác nhận payload thật sự HỎNG với parse chặt
    callVilao.mockResolvedValue(badJson);
    const r = await splitProblem('Tính diện tích y=-x^2+2x và Ox.', {});
    expect(r.template).toBe('area-plane');
    expect(r.templateParams.domain).toEqual([0, 2]);
  });
  it('vá escape KHÔNG được phá escape hợp lệ (`\\\\le`/`\\\\sqrt` của gemini) khi có 1 escape lỗi lẫn vào', async () => {
    // Bẫy khi vá: backslash-đã-escape hợp lệ (`\\le` trong JSON = literal `\le`, hay gặp ở setup chứa
    // LaTeX của gemini) KHÔNG được nhân đôi/hỏng. Payload: setup có `\\le` HỢP LỆ + fnLabel có `\ ` LỖI.
    const mixed = '{"type":"single","setup":"x (1 \\\\le x \\\\le 3)",'
      + '"parts":[{"label":"Câu 1","hoi":"S","phan_tu_moi":[]}],'
      + '"template":"area-plane","templateParams":{"outer":{"kind":"poly","coeffs":[0,2,-1]},'
      + '"domain":[0,2],"fnLabel":"f\\ g"}}';
    callVilao.mockResolvedValue(mixed);
    const r = await splitProblem('...', {});
    expect(r.template).toBe('area-plane');
    expect(r.setup).toBe('x (1 \\le x \\le 3)');            // escape hợp lệ giữ nguyên (literal `\le`)
  });
  it('mẫu calculus khác (cross-known/area-plane/section-poly) 1 câu → CŨNG giữ template', async () => {
    // Regression Đợt 2/3: chỉ rev-ox từng được giữ; cross-known/area-plane/section-poly bị vứt ⇒
    // nhánh route (analyze-advance) không bao giờ chạy → tính năng chết dù unit test builder xanh.
    for (const template of ['cross-known', 'area-plane', 'section-poly']) {
      callVilao.mockResolvedValue(JSON.stringify({
        type: 'single', setup: 's',
        parts: [{ label: 'Câu 1', hoi: 'diện tích thiết diện', phan_tu_moi: [] }],
        template,
        templateParams: { kind: 'cube', dims: { a: 1 }, points: [] },
      }));
      const r = await splitProblem('Cho hình lập phương ABCD. Tính diện tích thiết diện.', {});
      expect(r.template).toBe(template);
      expect(r.templateParams.kind).toBe('cube');
    }
  });
});
