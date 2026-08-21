// scripts/referral-sql-test.mjs
// Chạy bộ kiểm chứng rào chắn mã mời (Phase 6) trên một Postgres THẬT.
//
// Cần biến môi trường DATABASE_URL trỏ tới một database TRỐNG, dùng riêng cho test —
// script này DROP các bảng của mình trước khi chạy, tuyệt đối không trỏ vào production.
//
//   DATABASE_URL=postgres://user:pass@localhost:5432/geo3d_test npm run test:referral-sql
//
// Không đặt DATABASE_URL → bỏ qua (exit 0), để lệnh này an toàn khi gọi trong CI
// chưa gắn dịch vụ Postgres.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('[referral-sql] Bỏ qua: chưa đặt DATABASE_URL (cần một Postgres trống để chạy).');
  process.exit(0);
}
if (/prod|production/i.test(url)) {
  console.error('[referral-sql] TỪ CHỐI: DATABASE_URL trông giống production. Dùng database test riêng.');
  process.exit(1);
}
if (!existsSync('scripts/referral-guard-test.sql')) {
  console.error('[referral-sql] Phải chạy từ thư mục gốc của repo.');
  process.exit(1);
}

const r = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', 'scripts/referral-guard-test.sql'], {
  stdio: 'inherit',
});
if (r.error) {
  console.error('[referral-sql] Không gọi được psql:', r.error.message);
  process.exit(1);
}
process.exit(r.status ?? 1);
