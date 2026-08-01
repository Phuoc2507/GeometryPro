import { describe, it, expect } from 'vitest';
import {
  serializeProblemFile,
  parseProblemFile,
  buildProblemFile,
  slugifyFileName,
  extractPrompt,
  SHARE_FILE_TYPE,
} from '@/lib/shareFile';
import { GeometryData } from '@/types/geometry';

function makeGeometry(overrides: Partial<GeometryData> = {}): GeometryData {
  return {
    name: 'Hình chóp S.ABCD',
    points: [
      { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
      { id: 'B', label: 'B', x: 1, y: 0, z: 0 },
    ],
    lines: [{ id: 'AB', from: 'A', to: 'B' }],
    ...overrides,
  };
}

describe('shareFile', () => {
  it('round-trip: serialize rồi parse phải khớp geometry_data', () => {
    const geo = makeGeometry({ llmPrompt: 'Cho hình chóp S.ABCD...' });
    const json = serializeProblemFile(geo);
    const result = parseProblemFile(json);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.type).toBe(SHARE_FILE_TYPE);
    expect(result.file.name).toBe('Hình chóp S.ABCD');
    expect(result.file.prompt).toBe('Cho hình chóp S.ABCD...');
    expect(result.file.geometry_data).toEqual(geo);
  });

  it('buildProblemFile gắn header nhận dạng', () => {
    const file = buildProblemFile(makeGeometry());
    expect(file.app).toBe('geometrypro');
    expect(file.type).toBe(SHARE_FILE_TYPE);
    expect(file.version).toBe(1);
  });

  it('extractPrompt ưu tiên lời giải đã lưu, rồi llmPrompt', () => {
    expect(extractPrompt(makeGeometry({ llmPrompt: 'từ llm' }))).toBe('từ llm');
    expect(
      extractPrompt(
        makeGeometry({
          llmPrompt: 'từ llm',
          solve: { problem: 'đề gốc', result: {} as never },
        }),
      ),
    ).toBe('đề gốc');
    expect(extractPrompt(makeGeometry())).toBe('');
  });

  it('parse chấp nhận geometry_data trần (không có header)', () => {
    const geo = makeGeometry();
    const result = parseProblemFile(JSON.stringify(geo));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.geometry_data.points).toHaveLength(2);
  });

  it('parse từ chối JSON hỏng', () => {
    const result = parseProblemFile('{ not json ');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/JSON/i);
  });

  it('parse từ chối file có type sai', () => {
    const result = parseProblemFile(
      JSON.stringify({ type: 'something-else', geometry_data: makeGeometry() }),
    );
    expect(result.ok).toBe(false);
  });

  it('parse từ chối file thiếu dữ liệu hình học', () => {
    const result = parseProblemFile(
      JSON.stringify({ type: SHARE_FILE_TYPE, geometry_data: { name: 'x' } }),
    );
    expect(result.ok).toBe(false);
  });

  it('parse từ chối object không phải hình học', () => {
    const result = parseProblemFile(JSON.stringify({ hello: 'world' }));
    expect(result.ok).toBe(false);
  });

  it('slugifyFileName bỏ dấu tiếng Việt và ký tự lạ', () => {
    expect(slugifyFileName('Hình chóp S.ABCD')).toBe('hinh-chop-s-abcd');
    expect(slugifyFileName('Đường tròn (O)')).toBe('duong-tron-o');
    expect(slugifyFileName('')).toBe('bai-hinh-hoc');
  });
});
