// CỔNG KIỂM CHỨNG (Task 1) — viết tay plan bằng op CÓ SẴN để xác định vì sao 3 bài Oxyz "dựng hình"
// (Câu 1/5/6) hiện rơi về. KHÔNG thêm op / KHÔNG đổi engine ở đây; chỉ dò rồi ghi findings.
//
// run()      = builder thuần (không tham số) — trả EngineResult { ok, entities, answers, ... };
//              điểm nằm ở res.entities.points (Map).
// runAnalysis() = bọc ngoài có tham số/analyze — trả AnalysisResult { ok, errors, answer, ... }.
import { describe, it, expect } from 'vitest';
import { run } from '../../run';
import { runAnalysis } from '../runAnalysis';

describe('Oxyz construction gate (Task 1) — dò op có sẵn', () => {
  // ── Câu 5 ────────────────────────────────────────────────────────────────
  // Đường qua A(1,0,2), VUÔNG GÓC với và CẮT d (base (1,0,-1), dir (1,1,2)).
  // Mô hình bằng op có sẵn: A (point) → d (line point_dir) → F = foot(A onto d) → T = line(A,F).
  // Kỳ vọng: DỰNG ĐƯỢC (chân vuông góc F + đường T). Đáp bài là một ĐƯỜNG THẲNG (không phải số).
  it('Câu 5: foot F + line T dựng được bằng op có sẵn (đáp là ĐƯỜNG → ngoài phạm vi "serve số")', () => {
    const res = run({
      solidName: 'c5',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [1, 0, 2] },
        { op: 'oxyz_line', name: 'd', by: { form: 'point_dir', base: [1, 0, -1], dir: [1, 1, 2] } },
        { op: 'oxyz_foot', name: 'F', from: 'A', onto: 'line', target: 'd' },
        { op: 'oxyz_line', name: 'T', by: { form: 'two_points', a: 'A', b: 'F' } },
      ],
    });
    const F = res.entities.points.get('F');
    // eslint-disable-next-line no-console
    console.log('[Câu 5] ok=', res.ok, 'errors=', JSON.stringify(res.errors),
      'F=', F ? [F.p.x.approx, F.p.y.approx, F.p.z.approx] : null,
      'hasLineT=', res.entities.lines.has('T'));
    expect(res.ok).toBe(true);
    expect(res.entities.points.has('F')).toBe(true); // chân vuông góc dựng được
    expect(res.entities.lines.has('T')).toBe(true);   // đường Δ = (A,F) dựng được
  });

  // ── Câu 1 ────────────────────────────────────────────────────────────────
  // mp (α) ∥ (P): x−2y+3z−4=0, cắt d1,d2 tại M,N, MN=√3. Mô hình:
  //   α = coeffs(1,−2,3, d='k')   ← d là THAM SỐ (chuỗi 'k')
  //   M = α∩d1, N = α∩d2, solve k sao cho dist(M,N)=√3.
  // SAU FIX (Task 2): concreteOps thay tham số k vào oxyz_plane coeffs (a,b,c,d) trước khi gọi run()
  //   ⇒ engine giải được. Nghiệm k=11 ⇒ M=(0,1,−3), N=(−1,2,−2), dist(M,N)=√3≈1.732.
  it('Câu 1: mp tham số (coeffs d=k) GIẢI ĐƯỢC — k được thay vào oxyz_plane, dist(M,N)=√3', () => {
    const r = runAnalysis({
      solidName: 'c1',
      parameters: [{ name: 'k', domain: [-20, 20] }],
      ops: [
        { op: 'oxyz_line', name: 'd1', by: { form: 'point_dir', base: [1, 0, -1], dir: [1, -1, 2] } },
        { op: 'oxyz_line', name: 'd2', by: { form: 'point_dir', base: [1, 3, -1], dir: [2, 1, 1] } },
        { op: 'oxyz_plane', name: 'alpha', by: { form: 'coeffs', a: 1, b: -2, c: 3, d: 'k' } },
        { op: 'oxyz_intersect', name: 'M', a: 'alpha', b: 'd1' },
        { op: 'oxyz_intersect', name: 'N', a: 'alpha', b: 'd2' },
      ],
      analyze: {
        kind: 'solve', parameter: 'k',
        constraint: { of: { kind: 'distance', a: 'M', b: 'N' }, equals: 'sqrt(3)' },
        report: { kind: 'distance', a: 'M', b: 'N' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('[Câu 1] ok=', r.ok, 'k=', r.parameter.value, 'answer=', r.answer.approx, 'errors=', JSON.stringify(r.errors));
    expect(r.ok).toBe(true);                          // sau fix: giải được
    expect(Number.isFinite(r.parameter.value)).toBe(true); // tìm được offset k hữu hạn
    expect(r.answer.approx).toBeCloseTo(Math.sqrt(3), 3);   // dist(M,N) ≈ √3
  });

  // ── oxyz_ratio.t (focused) ───────────────────────────────────────────────
  // Bằng chứng TỐI THIỂU, TẤT ĐỊNH rằng tham số được thay vào oxyz_ratio.t sau fix:
  //   A(0,0,0), B(10,0,0); K = A + t·(B−A); solve t sao cho dist(A,K)=6 ⇒ t=0.6, K=(6,0,0).
  it('oxyz_ratio.t: tham số t được thay vào — solve t sao cho dist(A,K)=6 ⇒ t≈0.6, K=(6,0,0)', () => {
    const r = runAnalysis({
      solidName: 'ratio-t',
      parameters: [{ name: 't', domain: [0, 1] }],
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [10, 0, 0] },
        { op: 'oxyz_ratio', name: 'K', a: 'A', b: 'B', t: 't' }, // t là THAM SỐ
      ],
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'A', b: 'K' }, equals: 6 },
        report: { kind: 'point_coord', target: 'K', axis: 'x' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('[oxyz_ratio.t] ok=', r.ok, 't=', r.parameter.value, 'K.x=', r.answer.approx, 'errors=', JSON.stringify(r.errors));
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(0.6, 3); // t=0.6
    expect(r.answer.approx).toBeCloseTo(6, 3);      // K.x=6
  });

  // ── Câu 6 (tùy chọn) ─────────────────────────────────────────────────────
  // "Điểm trên đường ở khoảng cách cho trước từ một GIAO ĐIỂM tính được."
  // Phần A (thuần dựng): giao điểm I = d∩P dựng được bằng oxyz_intersect (op có sẵn).
  // Phần B (sau fix): đặt điểm trên d cách I một đoạn cho trước — solve tham số dùng trong
  //   oxyz_ratio.t; concreteOps NAY thay tham số vào oxyz_ratio.t ⇒ giải được.
  it('Câu 6-style: giao điểm I dựng được; "điểm-trên-đường cách I cho trước" GIẢI ĐƯỢC (tham số vào oxyz_ratio.t)', () => {
    // Phần A: I = giao của d (trục Ox) với P (x=2) ⇒ I=(2,0,0).
    const buildI = run({
      solidName: 'c6a',
      ops: [
        { op: 'oxyz_point', name: 'Q', at: [0, 0, 0] },
        { op: 'oxyz_line', name: 'd', by: { form: 'point_dir', base: [0, 0, 0], dir: [1, 0, 0] } },
        { op: 'oxyz_plane', name: 'P', by: { form: 'coeffs', a: 1, b: 0, c: 0, d: -2 } },
        { op: 'oxyz_intersect', name: 'I', a: 'd', b: 'P' },
      ],
    });
    const I = buildI.entities.points.get('I');
    // eslint-disable-next-line no-console
    console.log('[Câu 6A] ok=', buildI.ok, 'I=', I ? [I.p.x.approx, I.p.y.approx, I.p.z.approx] : null);
    expect(buildI.ok).toBe(true);
    expect(buildI.entities.points.has('I')).toBe(true); // giao điểm dựng được

    // Phần B: K = I + s·(Q−I) trên d, giải s sao cho dist(I,K)=3. 's' là tham số dùng trong ratio.t.
    const r = runAnalysis({
      solidName: 'c6b',
      parameters: [{ name: 's', domain: [-5, 5] }],
      ops: [
        { op: 'oxyz_point', name: 'Q', at: [0, 0, 0] },
        { op: 'oxyz_line', name: 'd', by: { form: 'point_dir', base: [0, 0, 0], dir: [1, 0, 0] } },
        { op: 'oxyz_plane', name: 'P', by: { form: 'coeffs', a: 1, b: 0, c: 0, d: -2 } },
        { op: 'oxyz_intersect', name: 'I', a: 'd', b: 'P' },
        { op: 'oxyz_ratio', name: 'K', a: 'I', b: 'Q', t: 's' }, // s KHÔNG được concreteOps thay
      ],
      analyze: {
        kind: 'solve', parameter: 's',
        constraint: { of: { kind: 'distance', a: 'I', b: 'K' }, equals: 3 },
        report: { kind: 'point_coord', target: 'K', axis: 'x' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('[Câu 6B] ok=', r.ok, 's=', r.parameter.value, 'K.x=', r.answer.approx, 'errors=', JSON.stringify(r.errors));
    // Sau fix: s được thay vào oxyz_ratio.t ⇒ giải được. dist(I,K)=2|s|=3 ⇒ |s|=1.5 (nghiệm đầu s=−1.5).
    expect(r.ok).toBe(true);
    expect(Number.isFinite(r.parameter.value)).toBe(true);
    expect(Math.abs(r.parameter.value)).toBeCloseTo(1.5, 3);
  });
});
