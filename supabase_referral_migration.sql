-- =====================================================================
-- Geo3D — Chương trình Mã Mời (Referral 60-10) · PHASE 0: Nền móng dữ liệu
-- Chạy trong Supabase SQL Editor (service role). An toàn chạy lại (idempotent).
--
-- Phase 0 CHỈ dựng SCHEMA (bảng + cột + index + RLS). KHÔNG có logic tính tiền —
-- logic (sinh mã, ghi hoa hồng, rút tiền) nằm ở các phase sau, mỗi phase 1 migration.
--
-- Mô hình đã chốt:
--   • Người được mời: giảm 10% đơn đầu khi nhập mã (xác minh SĐT = khách mới).
--   • Người mời: hoa hồng 60% đơn đầu tiên → tích vào ví → rút về STK (KYC).
--   • Không hoàn tiền · thu qua QR (PayOS) như hiện tại · trả hoa hồng thủ công (đầu).
--   • Chống gian lận: 1 SĐT = 1 lần hoa hồng, 1 STK ↔ 1 account, trần lượt/tháng.
--
-- Quy ước: sổ cái hoa hồng nhân bản mẫu `credit_ledger` (append-only + idempotent ref).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) profiles: mã mời riêng, người giới thiệu, SĐT xác minh, ví hoa hồng
--    (đặt trên profiles cho đồng bộ với ví credit/gói vốn đã nằm ở đây).
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code        text,          -- mã mời của chính user này
  add column if not exists referred_by          uuid references auth.users(id),  -- ai đã rủ user này
  add column if not exists phone_e164           text,          -- SĐT đã xác minh (chuẩn E.164, vd +8490...)
  add column if not exists phone_verified_at    timestamptz,
  add column if not exists commission_pending   integer not null default 0,   -- hoa hồng đang treo (chưa rút được)
  add column if not exists commission_available integer not null default 0;   -- hoa hồng đã "chín" (rút được)

-- Mã mời là duy nhất toàn hệ thống (bỏ qua NULL khi chưa sinh mã).
create unique index if not exists profiles_referral_code_uniq
  on public.profiles (referral_code) where referral_code is not null;

-- Tra cứu nhanh theo SĐT (phục vụ kiểm "SĐT này đã từng mua chưa").
create index if not exists profiles_phone_idx
  on public.profiles (phone_e164) where phone_e164 is not null;

-- RLS: KHÔNG cho client tự sửa ví hoa hồng / SĐT / người giới thiệu.
-- Mở rộng policy "non-plan" cũ để khoá thêm các cột tiền nhạy cảm này.
drop policy if exists "Users can update non-plan fields" on public.profiles;
create policy "Users can update non-plan fields" on public.profiles
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and plan_type            is not distinct from (select p.plan_type            from public.profiles p where p.user_id = auth.uid())
  and plan_tier            is not distinct from (select p.plan_tier            from public.profiles p where p.user_id = auth.uid())
  and plan_code            is not distinct from (select p.plan_code            from public.profiles p where p.user_id = auth.uid())
  and plan_expires_at      is not distinct from (select p.plan_expires_at      from public.profiles p where p.user_id = auth.uid())
  and plan_credits         is not distinct from (select p.plan_credits         from public.profiles p where p.user_id = auth.uid())
  and purchased_credits    is not distinct from (select p.purchased_credits    from public.profiles p where p.user_id = auth.uid())
  and referral_code        is not distinct from (select p.referral_code        from public.profiles p where p.user_id = auth.uid())
  and referred_by          is not distinct from (select p.referred_by          from public.profiles p where p.user_id = auth.uid())
  and phone_e164           is not distinct from (select p.phone_e164           from public.profiles p where p.user_id = auth.uid())
  and phone_verified_at    is not distinct from (select p.phone_verified_at    from public.profiles p where p.user_id = auth.uid())
  and commission_pending   is not distinct from (select p.commission_pending   from public.profiles p where p.user_id = auth.uid())
  and commission_available is not distinct from (select p.commission_available from public.profiles p where p.user_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- 2) orders: gắn mã mời + người giới thiệu + số tiền đã giảm cho đơn này
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists referral_code   text,
  add column if not exists referrer_id     uuid references auth.users(id),
  add column if not exists discount_amount integer not null default 0;   -- 10% đã giảm (đồng)

-- ---------------------------------------------------------------------
-- 3) referrals: mỗi quan hệ giới thiệu + vòng đời của nó
--    Trạng thái: pending → confirmed → (rút) ; hoặc → clawed_back / rejected
-- ---------------------------------------------------------------------
create table if not exists public.referrals (
  id                uuid        primary key default gen_random_uuid(),
  referrer_id       uuid        not null references auth.users(id) on delete cascade,  -- người mời
  invitee_id        uuid        references auth.users(id) on delete set null,          -- người được rủ
  invitee_phone     text,          -- SĐT đã xác minh của người được rủ (khoá "đơn đầu theo danh tính")
  code              text        not null,   -- mã mời đã dùng
  order_code        bigint,        -- đơn đủ điều kiện (đơn ĐẦU của người được rủ)
  status            text        not null default 'pending',   -- pending|confirmed|clawed_back|rejected
  discount_amount   integer     not null default 0,   -- tiền đã giảm cho người được rủ
  commission_amount integer     not null default 0,   -- hoa hồng cho người mời (60%)
  created_at        timestamptz not null default now(),
  confirmed_at      timestamptz,
  note              text
);

-- Mỗi người được rủ chỉ sinh hoa hồng ĐÚNG 1 LẦN — khoá theo account VÀ theo SĐT.
create unique index if not exists referrals_invitee_uniq
  on public.referrals (invitee_id) where invitee_id is not null;
create unique index if not exists referrals_invitee_phone_uniq
  on public.referrals (invitee_phone) where invitee_phone is not null;
-- Đếm nhanh số lượt của một người mời trong tháng (phục vụ trần 10/tháng).
create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id, created_at);

alter table public.referrals enable row level security;
drop policy if exists "referrals readable by referrer" on public.referrals;
create policy "referrals readable by referrer"
  on public.referrals for select using (auth.uid() = referrer_id);

-- ---------------------------------------------------------------------
-- 4) commission_ledger: SỔ CÁI ví hoa hồng (nhân bản mẫu credit_ledger)
--    append-only; 1 ref ghi đúng 1 lần (chống cộng/trừ trùng khi webhook lặp).
-- ---------------------------------------------------------------------
create table if not exists public.commission_ledger (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,  -- người mời
  delta         integer     not null,   -- dương = hoa hồng cộng ; âm = rút/clawback
  reason        text        not null,   -- 'commission'|'confirm'|'withdraw'|'clawback'|'adjust'
  ref           text,                   -- referral id / withdrawal id
  balance_after integer     not null,   -- số dư "đã chín" sau bút toán
  created_at    timestamptz not null default now()
);
create unique index if not exists commission_ledger_ref_uniq
  on public.commission_ledger (user_id, ref) where ref is not null;

alter table public.commission_ledger enable row level security;
drop policy if exists "commission ledger readable by owner" on public.commission_ledger;
create policy "commission ledger readable by owner"
  on public.commission_ledger for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5) payout_accounts: tài khoản ngân hàng của người mời để nhận tiền
--    Ràng buộc CHỐNG GIAN LẬN: mỗi user 1 STK  &  1 STK ↔ 1 account (2 chiều).
-- ---------------------------------------------------------------------
create table if not exists public.payout_accounts (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  bank_code      text        not null,   -- mã ngân hàng (Napas/BIN)
  account_number text        not null,
  account_name   text        not null,   -- tên chủ TK (đối chiếu khi KYC)
  verified_at    timestamptz,
  created_at     timestamptz not null default now()
);
-- Mỗi user chỉ gắn 1 STK.
create unique index if not exists payout_accounts_user_uniq
  on public.payout_accounts (user_id);
-- 1 STK (ngân hàng + số TK) chỉ thuộc DUY NHẤT 1 account GeoPro → chặn nuôi account ảo.
create unique index if not exists payout_accounts_bank_uniq
  on public.payout_accounts (bank_code, account_number);

alter table public.payout_accounts enable row level security;
drop policy if exists "payout accounts readable by owner" on public.payout_accounts;
create policy "payout accounts readable by owner"
  on public.payout_accounts for select using (auth.uid() = user_id);
-- Ghi/sửa STK đi qua API (service role) để xác minh + đảm bảo ràng buộc → không mở policy write cho client.

-- ---------------------------------------------------------------------
-- 6) withdrawals: yêu cầu rút tiền + trạng thái duyệt/chi
--    Giai đoạn đầu: admin chi thủ công rồi đánh dấu 'paid' + lưu mã giao dịch.
-- ---------------------------------------------------------------------
create table if not exists public.withdrawals (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  amount            integer     not null,   -- số tiền rút (đồng) — KHÔNG áp ngưỡng tối thiểu
  payout_account_id uuid        references public.payout_accounts(id),
  status            text        not null default 'requested',   -- requested|approved|paid|rejected
  transfer_ref      text,          -- mã giao dịch khi admin đã chuyển khoản
  admin_note        text,
  requested_at      timestamptz not null default now(),
  processed_at      timestamptz
);
create index if not exists withdrawals_status_idx
  on public.withdrawals (status, requested_at);
create index if not exists withdrawals_user_idx
  on public.withdrawals (user_id, requested_at);

alter table public.withdrawals enable row level security;
drop policy if exists "withdrawals readable by owner" on public.withdrawals;
create policy "withdrawals readable by owner"
  on public.withdrawals for select using (auth.uid() = user_id);
-- Tạo yêu cầu rút đi qua API (service role) để KHOÁ số dư nguyên tử → không mở policy write cho client.

commit;

-- =====================================================================
-- GHI CHÚ CHO CÁC PHASE SAU (chưa làm ở Phase 0):
--   • Phase 1: hàm sinh referral_code duy nhất + trang "Giới thiệu bạn".
--   • Phase 2: checkout.js áp giảm 10% + xác minh SĐT người được rủ (OTP).
--   • Phase 3: sửa fulfill_paid_order → ghi referrals + commission_ledger (trần 10/tháng).
--   • Phase 4: API thêm STK (KYC) + tạo withdrawals (khoá số dư).
--   • Phase 5: trang admin duyệt & đánh dấu 'paid'.
--   • Phase 6: chống gian lận (chặn tự-refer, cờ trùng thiết bị/IP, clawback).
-- =====================================================================
