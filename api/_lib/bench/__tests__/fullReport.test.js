import { describe, it, expect, vi } from 'vitest';
import {
  classifyFullResult, summarizeFull, runPool, runFullBench, STAGE_LABELS,
} from '../fullReport.js';
import { compareCase } from '../compareCase.js';

// Toàn bộ file này chạy với `solve` GIẢ — kiểm được logic của chế độ --full mà
// không tốn một lượt gọi LLM nào.

const golden = (id, text = 'đề bài') => ({
  id, text, plan: {}, expect: { ok: true, answers: [{ kind: 'distance', text: '√2' }] },
});

const okResult = { plan: {}, ok: true, answers: [{ text: '√2' }] };
const wrongResult = { plan: {}, ok: true, answers: [{ text: '99' }] };
const engineDead = { plan: {}, ok: false, answers: [], errors: [{ message: 'engine bó tay' }] };
const abstain = { plan: null, ok: false, answers: [], errors: [{ message: 'translator abstained: thiếu số liệu' }] };
const translateFail = { plan: null, ok: false, answers: [], errors: [{ message: 'Translator plan failed schema: bad' }] };

describe('classifyFullResult — tách BỐN khâu có thể hỏng', () => {
  it('dịch từ chối ≠ dịch hỏng (một cái là hành vi đúng, một cái là lỗi)', () => {
    expect(classifyFullResult(abstain, 'regress-status')).toBe('translate-abstain');
    expect(classifyFullResult(translateFail, 'regress-status')).toBe('translate-fail');
  });

  it('dịch được nhưng engine bó tay ⇒ engine-unusable', () => {
    expect(classifyFullResult(engineDead, 'regress-status')).toBe('engine-unusable');
  });

  it('engine chạy ra đáp nhưng LỆCH ⇒ wrong-answer (không lẫn với engine bó tay)', () => {
    expect(classifyFullResult(wrongResult, 'regress-answer')).toBe('wrong-answer');
  });

  it('đúng ⇒ pass', () => {
    expect(classifyFullResult(okResult, 'pass')).toBe('pass');
  });

  it('văng ngoại lệ ⇒ error', () => {
    expect(classifyFullResult({ __throw: 'nổ' }, 'error')).toBe('error');
    expect(classifyFullResult(null, 'error')).toBe('error');
  });

  it('ca GIẢI TÍCH không dựng hình vẫn được tính là pass', () => {
    // Bẫy: nếu phân loại dựa vào số điểm hình thì mọi ca giải tích sẽ bị gán nhầm
    // là "engine bó tay" dù đáp hoàn toàn đúng.
    const analysis = { plan: {}, ok: true, geometry: null, answers: [{ kind: 'kết quả', text: '1/3' }] };
    expect(classifyFullResult(analysis, 'pass')).toBe('pass');
  });

  it('mọi giai đoạn đều có nhãn tiếng Việt để in ra', () => {
    for (const stage of ['pass', 'wrong-answer', 'engine-unusable', 'translate-fail', 'translate-abstain', 'error']) {
      expect(STAGE_LABELS[stage], stage).toBeTruthy();
    }
  });
});

describe('summarizeFull', () => {
  it('tách tỉ lệ DỊCH ĐƯỢC khỏi tỉ lệ ĐÁP ĐÚNG', () => {
    const s = summarizeFull([
      { id: 'a', run: 1, stage: 'pass' },
      { id: 'b', run: 1, stage: 'wrong-answer' },
      { id: 'c', run: 1, stage: 'translate-fail' },
      { id: 'd', run: 1, stage: 'translate-abstain' },
    ]);
    // 2/4 qua được bước dịch, nhưng chỉ 1/4 ra đáp đúng.
    expect(s.translateRate).toBe(0.5);
    expect(s.passRate).toBe(0.25);
  });

  it('chỉ ra ca KHÔNG ỔN ĐỊNH — thứ một lượt chạy đơn lẻ không bao giờ thấy', () => {
    const s = summarizeFull([
      { id: 'hay-doi', run: 1, stage: 'pass' },
      { id: 'hay-doi', run: 2, stage: 'wrong-answer' },
      { id: 'hay-doi', run: 3, stage: 'pass' },
      { id: 'on-dinh', run: 1, stage: 'pass' },
      { id: 'on-dinh', run: 2, stage: 'pass' },
      { id: 'on-dinh', run: 3, stage: 'pass' },
      { id: 'hong-han', run: 1, stage: 'translate-fail' },
      { id: 'hong-han', run: 2, stage: 'translate-fail' },
      { id: 'hong-han', run: 3, stage: 'translate-fail' },
    ]);
    expect(s.unstable).toEqual([{ id: 'hay-doi', passes: 2, runs: 3 }]);
    expect(s.repeat).toBe(3);
    expect(s.caseCount).toBe(3);
  });

  it('xếp ca tệ nhất lên đầu để đọc là thấy ngay', () => {
    const s = summarizeFull([
      { id: 'tot', run: 1, stage: 'pass' },
      { id: 'te', run: 1, stage: 'translate-fail' },
    ]);
    expect(s.perCase[0].id).toBe('te');
  });

  it('gộp nguyên nhân hỏng theo số lượt, nhiều nhất trước', () => {
    const s = summarizeFull([
      { id: 'a', run: 1, stage: 'translate-fail' },
      { id: 'b', run: 1, stage: 'translate-fail' },
      { id: 'c', run: 1, stage: 'wrong-answer' },
      { id: 'd', run: 1, stage: 'pass' },
    ]);
    expect(s.worstStages[0]).toEqual(['translate-fail', 2]);
    expect(s.worstStages.map(([k]) => k)).not.toContain('pass');
  });

  it('rổ rỗng không sinh NaN', () => {
    const s = summarizeFull([]);
    expect(s.passRate).toBe(0);
    expect(s.translateRate).toBe(0);
    expect(s.repeat).toBe(0);
  });
});

describe('runPool', () => {
  it('giữ nguyên thứ tự kết quả dù chạy song song', async () => {
    const tasks = [50, 10, 30, 0, 20].map((ms, i) => () =>
      new Promise((res) => setTimeout(() => res(i), ms)));
    expect(await runPool(tasks, 3)).toEqual([0, 1, 2, 3, 4]);
  });

  it('không vượt quá số luồng cho phép', async () => {
    let running = 0;
    let peak = 0;
    const tasks = Array.from({ length: 12 }, () => async () => {
      running += 1; peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1;
      return 1;
    });
    await runPool(tasks, 3);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('rổ rỗng không treo', async () => {
    expect(await runPool([], 4)).toEqual([]);
  });
});

describe('runFullBench — điều phối trọn vẹn (solve giả)', () => {
  it('chạy đúng số lượt = số ca × repeat', async () => {
    const solve = vi.fn().mockResolvedValue(okResult);
    const { records, summary } = await runFullBench({
      cases: [golden('a'), golden('b')], repeat: 3, concurrency: 2, solve, compare: compareCase,
    });
    expect(solve).toHaveBeenCalledTimes(6);
    expect(records).toHaveLength(6);
    expect(summary.passRate).toBe(1);
    expect(summary.caseCount).toBe(2);
  });

  it('solve ném lỗi thì ghi nhận là error, KHÔNG làm sập cả lượt đo', async () => {
    const solve = vi.fn()
      .mockResolvedValueOnce(okResult)
      .mockRejectedValueOnce(new Error('mạng lỗi'))
      .mockResolvedValueOnce(okResult);
    const { summary } = await runFullBench({
      cases: [golden('a'), golden('b'), golden('c')], repeat: 1, concurrency: 1, solve, compare: compareCase,
    });
    expect(summary.byStage.error).toBe(1);
    expect(summary.byStage.pass).toBe(2);
  });

  it('phân loại đúng khi mỗi ca hỏng ở một khâu khác nhau', async () => {
    const byText = { a: okResult, b: wrongResult, c: engineDead, d: abstain, e: translateFail };
    const cases = Object.keys(byText).map((k) => golden(k, k));
    const { summary } = await runFullBench({
      cases, repeat: 1, concurrency: 5, solve: async (t) => byText[t], compare: compareCase,
    });
    expect(summary.byStage).toMatchObject({
      pass: 1, 'wrong-answer': 1, 'engine-unusable': 1, 'translate-abstain': 1, 'translate-fail': 1,
    });
    expect(summary.translateRate).toBe(0.6);   // 3/5 qua được bước dịch
    expect(summary.passRate).toBe(0.2);        // 1/5 ra đáp đúng
  });

  it('báo tiến độ đúng tổng số lượt', async () => {
    const seen = [];
    await runFullBench({
      cases: [golden('a'), golden('b')], repeat: 2, concurrency: 1,
      solve: async () => okResult, compare: compareCase,
      onProgress: (done, total) => seen.push([done, total]),
    });
    expect(seen).toEqual([[1, 4], [2, 4], [3, 4], [4, 4]]);
  });
});
