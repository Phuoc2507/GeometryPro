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
  it('CHỮ: giữ hedge + timeout 13s (đề chữ nhanh, spike độc lập → hedge giúp thật)', async () => {
    callVilao.mockClear(); hedge.mockClear();
    callVilao.mockResolvedValue(JSON.stringify({ type: 'single', setup: 'x' }));
    await splitProblem('Cho (H) giới hạn y=x^2, x=0, x=2.', {});
    expect(hedge).toHaveBeenCalled();                    // chữ: có hedge chống spike
    expect(callVilao.mock.calls[0][2].timeoutMs).toBe(13000);
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
});
