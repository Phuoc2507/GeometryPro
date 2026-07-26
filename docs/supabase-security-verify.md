# geo3d — Checklist verify bảo mật Supabase (RLS + ví credit)

Chạy trong **Supabase SQL Editor** (kết nối admin). Mỗi mục ghi **kết quả mong đợi**;
⛔ = dấu hiệu lỗ hổng cần xử lý ngay. Phần 8 (mô phỏng kẻ tấn công) là bài test mạnh nhất.

> Quy ước: thay `<UUID_A>` = user thật của bạn (kẻ tấn công), `<UUID_V>` = user thật khác (nạn nhân).

---

## 1. RLS đã bật trên mọi bảng nhạy cảm

```sql
select c.relname as tbl, c.relrowsecurity as rls_on, c.relforcerowsecurity as forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in ('profiles','saved_geometries','orders','usage_counters',
                    'credit_ledger','guest_usage_counters','plans','pricing_config')
order by c.relname;
```
✅ Mong đợi: `rls_on = true` cho **tất cả**.

```sql
-- Có bảng public nào QUÊN bật RLS không?
select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
```
✅ Mong đợi: **rỗng**. ⛔ Bất kỳ bảng nào hiện ra = client đọc/ghi tự do.

---

## 2. `profiles` — SELECT owner-only + UPDATE khoá ví

```sql
select cmd, roles, qual, with_check
from pg_policies where schemaname='public' and tablename='profiles'
order by cmd;
```
✅ SELECT: `qual = (auth.uid() = user_id)`. ⛔ Nếu `qual = true` → **hardening CHƯA áp**, số dư mọi user đọc được công khai.
✅ UPDATE: `with_check` phải chứa các mệnh đề `plan_credits ... is not distinct from (select ...)` và `purchased_credits`, `plan_tier`, `plan_code`, `plan_expires_at`, `plan_type`. ⛔ Thiếu bất kỳ cột nào → client tự nâng cột đó.

---

## 3. `orders` / `usage_counters` / `credit_ledger` — client KHÔNG ghi được

```sql
select tablename, cmd, roles, qual, with_check
from pg_policies where schemaname='public'
  and tablename in ('orders','usage_counters','credit_ledger')
order by tablename, cmd;
```
✅ Mong đợi: **chỉ có policy `SELECT`** (owner-only, `auth.uid() = user_id`). ⛔ Nếu xuất hiện policy `INSERT/UPDATE/DELETE` cho client → có thể tự tạo order "paid" / tự sửa bộ đếm / tự ghi sổ cái. (Ghi hợp lệ chỉ đi qua service_role, vốn bypass RLS.)

---

## 4. `saved_geometries` — LỖ HỔNG AUDIT: xác minh tồn tại + policy

> Bảng này **không có trong repo SQL** → phải kiểm trực tiếp.

```sql
-- 4a. Bảng có tồn tại trong public không?
select to_regclass('public.saved_geometries') as tbl;   -- ✅ không null
-- 4b. Cột chính
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='saved_geometries'
order by ordinal_position;
-- ✅ có: user_id uuid NOT NULL, geometry_data jsonb, is_history bool, is_public bool(?), project_id uuid(?)
-- 4c. Policy
select cmd, roles, qual, with_check
from pg_policies where schemaname='public' and tablename='saved_geometries'
order by cmd;
```
✅ Mong đợi 4c:
- `INSERT`: `with_check = (auth.uid() = user_id)` — **migration di trú vô danh phụ thuộc điều này**.
- `SELECT`: `(auth.uid() = user_id)` (cộng `OR is_public` nếu có tính năng chia sẻ công khai — xác nhận đúng ý đồ).
- `UPDATE`/`DELETE`: `(auth.uid() = user_id)` ở cả `using` và `with_check`.
⛔ Nếu SELECT là `true` hoặc INSERT thiếu `with_check` → user đọc hình người khác / gán hình cho user khác.

---

## 5. Quyền EXECUTE các RPC tiền — CHỐT CHẶN QUAN TRỌNG NHẤT

```sql
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.proacl is null as acl_default_PUBLIC,          -- ⛔ true = mặc định = PUBLIC execute được
       exists(select 1 from aclexplode(p.proacl) a
              where a.grantee = 0 and a.privilege_type='EXECUTE') as public_execute,  -- ⛔ true = xấu
       (select string_agg(distinct r.rolname, ', ')
        from aclexplode(p.proacl) a join pg_roles r on r.oid = a.grantee
        where a.privilege_type='EXECUTE') as execute_roles
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and p.proname in ('spend_credits','refund_credits','grant_credits',
                    'consume_quota','consume_guest_quota','fulfill_paid_order')
order by p.proname, args;
```
✅ Mong đợi mỗi hàng: `acl_default_PUBLIC = false`, `public_execute = false`, `execute_roles = service_role` (có thể kèm `postgres`/`supabase_admin`).
⛔ **`acl_default_PUBLIC = true` hoặc `public_execute = true`** → bất kỳ user đăng nhập nào cũng `select public.grant_credits(mình, 1e9, ...)` để **tự in credit**. Đây là rủi ro chí mạng.

```sql
-- 5b. Còn sót overload chữ ký INTEGER cũ (trước migration fractional)?
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('spend_credits','refund_credits','grant_credits')
order by p.proname, args;
```
✅ Mong đợi: **đúng 1 dòng mỗi hàm**, tham số `numeric`. ⛔ Nếu thấy overload `integer` còn sót → nó có thể đang PUBLIC-executable (chạy lại mục 5 với nó).

---

## 6. SECURITY DEFINER + search_path bị ghim

```sql
select p.proname, p.prosecdef as sec_definer, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('spend_credits','refund_credits','grant_credits',
                    'consume_quota','consume_guest_quota','fulfill_paid_order')
order by p.proname;
```
✅ Mong đợi: `sec_definer = true` **và** `proconfig` chứa `search_path=public`.
⛔ `sec_definer=true` mà `proconfig` NULL → nguy cơ search_path hijack (SECURITY DEFINER không ghim schema).

---

## 7. Idempotency & bất biến số dư

```sql
-- 7a. Unique index chống cấp credit 2 lần
select indexname, indexdef from pg_indexes
where schemaname='public' and tablename='credit_ledger';
```
✅ Có `credit_ledger_ref_uniq` UNIQUE trên `(user_id, ref) WHERE ref IS NOT NULL`.

```sql
-- 7b. order_code sinh từ sequence (không để client chọn)
select column_default from information_schema.columns
where table_schema='public' and table_name='orders' and column_name='order_code';
```
✅ Mong đợi: `nextval('order_code_seq'...)`.

```sql
-- 7c. Cột credit là numeric(12,2)
select column_name, data_type, numeric_precision, numeric_scale
from information_schema.columns
where table_schema='public' and table_name='profiles'
  and column_name in ('plan_credits','purchased_credits');
```
✅ Mong đợi: `numeric`, precision 12, scale 2.

```sql
-- 7d. (Khuyến nghị) CHECK (>=0) để DB tự chặn số dư âm
select conname, pg_get_constraintdef(oid)
from pg_constraint where conrelid='public.profiles'::regclass and contype='c';
```
ℹ️ Nếu **không** có CHECK trên `plan_credits/purchased_credits >= 0` → cân nhắc thêm (phòng thủ chiều sâu, không chặn được đường RPC đã đúng nhưng chặn mọi đường ghi lạ).

---

## 8. 🔴 Mô phỏng kẻ tấn công (black-box, mạnh nhất)

Bọc `begin ... rollback` nên **không ghi gì thật**. `set local role` tự trả lại sau rollback.

```sql
-- ===== Kẻ tấn công đã ĐĂNG NHẬP (role authenticated, uid = A) =====
begin;
select set_config('request.jwt.claims',
  json_build_object('role','authenticated','sub','<UUID_A>')::text, true);
set local role authenticated;

-- (a) Đọc ví nạn nhân?        ✅ 0 dòng
select user_id, purchased_credits from public.profiles where user_id = '<UUID_V>';

-- (b) Tự thổi phồng credit?   ✅ ERROR "violates row-level security policy"
update public.profiles set purchased_credits = purchased_credits + 100000
where user_id = '<UUID_A>';

-- (c) Gọi thẳng RPC in tiền?  ✅ ERROR "permission denied for function grant_credits"
select public.grant_credits('<UUID_A>', 100000, 'hack', 'probe-8c', true);
select public.spend_credits('<UUID_A>', 0, 'probe', null);
select public.fulfill_paid_order(100000);

-- (d) Đọc hình của nạn nhân?  ✅ 0 dòng
select id from public.saved_geometries where user_id = '<UUID_V>' limit 1;

-- (e) Tự chèn order "paid"?    ✅ ERROR hoặc 0 dòng (không có policy INSERT client)
insert into public.orders(user_id, amount, status) values ('<UUID_A>', 1, 'paid');

-- (f) Tự sửa bộ đếm quota?     ✅ ERROR / 0 dòng
update public.usage_counters set used = 0 where user_id = '<UUID_A>';
rollback;
```

```sql
-- ===== Khách VÔ DANH (role anon) =====
begin;
set local role anon;
select count(*) from public.profiles;                       -- ✅ 0
select public.consume_quota('<UUID_A>','draw',3,1);         -- ✅ permission denied
select count(*) from public.saved_geometries;               -- ✅ 0 (trừ khi có is_public)
rollback;
```
⛔ **Bất kỳ dòng nào trả dữ liệu / thành công thay vì bị chặn** = lỗ hổng — ghi lại chính xác câu nào.

---

## 9. Xác nhận hardening migration ĐÃ áp trên prod

```sql
select to_regclass('public.guest_usage_counters')              as guest_tbl,     -- ✅ not null
       to_regprocedure('public.fulfill_paid_order(integer)')   as fulfill_fn,    -- ✅ not null
       exists(select 1 from pg_policies
              where tablename='profiles' and cmd='SELECT'
                and qual ilike '%auth.uid()%')                  as profiles_owner_only;  -- ✅ true
```
⛔ `profiles_owner_only = false` (hoặc guest_tbl null) → **hardening chưa chạy**, đang hở SELECT số dư.

---

## 10. Views bypass RLS (footgun Supabase)

```sql
-- View mặc định chạy quyền OWNER → có thể lách RLS của bảng dưới.
select c.relname,
       coalesce((select option_value from pg_options_to_table(c.reloptions)
                 where option_name='security_invoker'), 'off') as security_invoker
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v';
```
ℹ️ Với mỗi view lộ dữ liệu nhạy cảm: nên `security_invoker = on` (PG15+) hoặc chắc chắn view chỉ chứa cột công khai.

---

## 11. Kiểm ngoài-DB (Dashboard / Vercel)

- [ ] **Supabase → Advisors → Security**: 0 cảnh báo "RLS disabled" / "Security Definer view".
- [ ] **Vercel → Env**: `SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `GUEST_QUOTA_SECRET` **KHÔNG** có prefix `VITE_`/`NEXT_PUBLIC_` (không lọt vào bundle client). Chỉ `VITE_SUPABASE_URL` + anon key là public — đúng thiết kế.
- [ ] Kiểm bundle đã build: `grep -r "service_role\|PAYOS_CHECKSUM\|GUEST_QUOTA_SECRET" dist/assets/` → **rỗng**.
- [ ] PayOS webhook URL trỏ đúng `/api/webhook`, và endpoint từ chối request thiếu chữ ký (thử POST body rác → mong đợi 400 "Invalid webhook signature").

---

### Ưu tiên xử lý nếu có ⛔
1. Mục 5 (RPC tiền PUBLIC-executable) — chí mạng, in tiền.
2. Mục 2 / 9 (profiles SELECT = true — lộ toàn bộ số dư & gói).
3. Mục 4 (saved_geometries thiếu policy — lộ/ghi đè dữ liệu người dùng).
4. Mục 3 (orders có policy INSERT client — tự tạo đơn "paid").
