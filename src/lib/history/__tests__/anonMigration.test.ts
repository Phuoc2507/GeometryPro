import { describe, it, expect } from 'vitest';
import { isValidUuid, buildMigrationRows } from '../anonMigration';

const UUID = '11111111-2222-4333-8444-555555555555';
const fixedNew = () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const fixedNow = () => '2020-01-01T00:00:00.000Z';

describe('isValidUuid', () => {
  it('nhận UUID chuẩn (hoa/thường)', () => {
    expect(isValidUuid(UUID)).toBe(true);
    expect(isValidUuid(UUID.toUpperCase())).toBe(true);
  });
  it('từ chối id local cũ & rác', () => {
    expect(isValidUuid('Local_1782853880654_zyb317x')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid(123)).toBe(false);
    expect(isValidUuid(null)).toBe(false);
  });
});

describe('buildMigrationRows — chống 22P02 khi di trú lịch sử vô danh', () => {
  const geo = { points: [] };

  it('id "Local_..." (dữ liệu CŨ) ⇒ CẤP uuid mới, KHÔNG giữ id không hợp lệ (đây là ca 400 thật)', () => {
    const rows = buildMigrationRows(
      [{ id: 'Local_1782853880654_zyb317x', geometry_data: geo, name: 'Câu 7' }],
      'user-1', fixedNew, fixedNow,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    expect(isValidUuid(rows[0].id)).toBe(true);
    expect(rows[0].user_id).toBe('user-1');
    expect(rows[0].name).toBe('Câu 7');
  });

  it('id là UUID hợp lệ ⇒ GIỮ NGUYÊN (idempotent chống nhân đôi)', () => {
    const rows = buildMigrationRows([{ id: UUID, geometry_data: geo }], 'u', fixedNew, fixedNow);
    expect(rows[0].id).toBe(UUID);
  });

  it('thiếu id ⇒ cấp uuid mới; thiếu name ⇒ "Bản vẽ"; thiếu prompt ⇒ null; thiếu created_at ⇒ now()', () => {
    const rows = buildMigrationRows([{ geometry_data: geo }], 'u', fixedNew, fixedNow);
    expect(rows[0].id).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    expect(rows[0].name).toBe('Bản vẽ');
    expect(rows[0].prompt).toBeNull();
    expect(rows[0].created_at).toBe('2020-01-01T00:00:00.000Z');
    expect(rows[0].is_history).toBe(true);
  });

  it('loại mục KHÔNG có geometry_data hợp lệ (thiếu / null / không phải object)', () => {
    const rows = buildMigrationRows(
      [
        { id: UUID },                          // thiếu geometry_data
        { geometry_data: null },               // null (typeof null==='object' — phải loại)
        { geometry_data: 'x' },                // chuỗi
        { id: UUID, geometry_data: geo },      // hợp lệ
      ],
      'u', fixedNew, fixedNow,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].geometry_data).toBe(geo);
  });

  it('đầu vào không phải mảng ⇒ []', () => {
    expect(buildMigrationRows(null, 'u')).toEqual([]);
    expect(buildMigrationRows({}, 'u')).toEqual([]);
    expect(buildMigrationRows('nope', 'u')).toEqual([]);
  });

  it('giữ prompt/created_at khi hợp lệ', () => {
    const rows = buildMigrationRows(
      [{ id: UUID, geometry_data: geo, prompt: 'đề', created_at: '2019-05-05T00:00:00.000Z' }],
      'u', fixedNew, fixedNow,
    );
    expect(rows[0].prompt).toBe('đề');
    expect(rows[0].created_at).toBe('2019-05-05T00:00:00.000Z');
  });
});
