import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus, ChevronLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCheckout } from '@/hooks/useCheckout';
import { fmtVnd } from '@/lib/plans';
import { cn } from '@/lib/utils';

type Aud = 'student' | 'teacher';
type Bill = 'month' | 'year';
type Feat = [boolean, string];

interface CardDef {
  name: string;
  for: string;
  tier?: string;                          // để đánh dấu "Gói hiện tại"
  codes?: { month?: string; year?: string };
  creditText: string;
  cta: string;
  popular?: string;
  free?: boolean;
  contact?: boolean;
  yearOnly?: boolean;
  features: Feat[];
}

const CARDS: Record<Aud, CardDef[]> = {
  student: [
    { name: 'Miễn phí', for: 'Bắt đầu không mất phí', free: true, creditText: '', cta: 'Dùng thử', features: [
      [true, '3 lượt vẽ / ngày'], [true, '3 lượt giải / tháng'],
      [true, '1 xuất ảnh + 1 TikZ / tháng'], [true, 'Xoay hình 3D, xem lời giải từng bước'] ] },
    { name: 'Học sinh', for: 'Cho học sinh 11–12', tier: 'student', codes: { month: 'student_1m', year: 'student_1y' },
      popular: 'Phổ biến với học sinh', creditText: '~700 credit / tháng (≈70 bài)', cta: 'Nâng cấp', features: [
      [true, 'Mọi thứ ở gói Miễn phí'], [true, 'Vẽ + giải thoải mái để học'],
      [true, 'Sửa hình bằng AI'], [true, 'Xuất ảnh (tối đa 30/tháng)'],
      [false, 'TikZ / Word / PDF'], [false, 'Xuất Video'] ] },
  ],
  teacher: [
    { name: 'Giáo viên', for: 'Ra đề có hình 3D', tier: 'teacher', codes: { month: 'teacher_1m', year: 'teacher_1y' },
      creditText: '2.000 credit / tháng', cta: 'Nâng cấp', features: [
      [true, 'Xuất PNG/TikZ/Word/PDF không giới hạn'], [true, 'Sửa hình bằng AI'],
      [true, 'Thuộc tính: thể tích, diện tích, toạ độ'], [true, 'Điểm di động · mặt cắt động'],
      [false, 'Xuất Video'] ] },
    { name: 'Pro', for: 'Giáo viên nâng cao', tier: 'pro', codes: { month: 'pro_1m', year: 'pro_1y' },
      popular: 'Phổ biến', creditText: '6.000 credit / tháng', cta: 'Nâng cấp', features: [
      [true, 'Mọi thứ ở gói Giáo viên'], [true, 'Xuất Video hoạt hình 3D'],
      [true, 'Nhiều credit hơn gấp 3'], [true, 'Ưu tiên xử lý'] ] },
    { name: 'Tổ Toán', for: 'Nhóm ≤ 5 giáo viên', tier: 'pro', yearOnly: true, codes: { year: 'group_1y' },
      creditText: 'Trọn năm học · 5 tài khoản', cta: 'Nâng cấp', features: [
      [true, 'Tối đa 5 tài khoản giáo viên'], [true, 'Đầy đủ tính năng Pro'],
      [true, '2.000 credit/tháng mỗi giáo viên'], [true, 'Quản lý theo tổ'] ] },
    { name: 'Trường', for: 'Cả trường', contact: true, tier: 'school', creditText: 'Kho credit lớn dùng chung',
      cta: 'Liên hệ', features: [
      [true, 'Nhiều tài khoản giáo viên'], [true, 'Kho credit lớn dùng chung'],
      [true, 'Bảng quản trị & hỗ trợ ưu tiên'], [true, 'Xác minh trường · thưởng đại sứ'] ] },
  ],
};

const SEG = 'inline-flex bg-[#0C1526] border border-[#1E3357] rounded-full p-1.5';
const segBtn = (active: boolean) =>
  cn('border-0 font-semibold text-[15px] px-5 py-2 rounded-full cursor-pointer transition-colors',
     active ? 'bg-gradient-to-br from-[#4C8DFF] to-[#2E6BF2] text-white' : 'bg-transparent text-[#9FB2CC] hover:text-white',
     'disabled:opacity-40 disabled:cursor-not-allowed');

export default function Pricing() {
  const navigate = useNavigate();
  const { tier, lockedRole, isRoleLocked } = useAuth();
  const { plans, buying, startCheckout } = useCheckout();

  const [aud, setAud] = useState<Aud>(lockedRole ?? 'student');
  const [bill, setBill] = useState<Bill>('month');

  const byCode = new Map(plans.map((p) => [p.code, p]));
  const codeFor = (c: CardDef) => (c.yearOnly ? c.codes?.year : (bill === 'month' ? c.codes?.month : c.codes?.year));

  const priceOf = (c: CardDef): number | null => {
    if (c.free) return 0;
    if (c.contact) return null;
    const code = codeFor(c);
    const p = code ? byCode.get(code) : undefined;
    return p ? p.price_vnd : null;
  };

  const onCta = (c: CardDef) => {
    if (c.free) { navigate('/student'); return; }
    if (c.contact) { window.location.href = 'mailto:hotro@geo3d.vn?subject=Gói%20Trường%20geo3d'; return; }
    const code = codeFor(c);
    if (!code) return;
    try { localStorage.setItem('geo3d:last-mode', aud); } catch { /* bỏ qua */ }
    startCheckout({ planCode: code }, code);
  };

  const priceBlock = (c: CardDef) => {
    if (c.contact) return (<><div className="text-[34px] font-extrabold leading-none tracking-tight">Liên hệ</div><div className="text-[#6B7E99] text-[13px] mt-1.5 min-h-[18px]">Báo giá theo quy mô trường</div></>);
    if (priceOf(c) === 0) return (<><div className="text-[34px] font-extrabold leading-none tracking-tight">0đ</div><div className="text-[#6B7E99] text-[13px] mt-1.5 min-h-[18px]">Miễn phí mãi mãi</div></>);
    const p = byCode.get(codeFor(c) ?? '');
    if (c.yearOnly) return (<><div className="text-[34px] font-extrabold leading-none tracking-tight">{fmtVnd(p?.price_vnd ?? 0)} <small className="text-[15px] text-[#9FB2CC] font-semibold">/năm học</small></div><div className="text-[#6B7E99] text-[13px] mt-1.5 min-h-[18px]">Chỉ bán theo năm học</div></>);
    if (bill === 'month') return (<><div className="text-[34px] font-extrabold leading-none tracking-tight">{fmtVnd(p?.price_vnd ?? 0)} <small className="text-[15px] text-[#9FB2CC] font-semibold">/tháng</small></div><div className="text-[#6B7E99] text-[13px] mt-1.5 min-h-[18px]">Gia hạn hằng tháng</div></>);
    const perM = Math.round((p?.price_vnd ?? 0) / 12 / 1000) * 1000;
    return (<><div className="text-[34px] font-extrabold leading-none tracking-tight">{fmtVnd(p?.price_vnd ?? 0)} <small className="text-[15px] text-[#9FB2CC] font-semibold">/năm</small></div><div className="text-[#6B7E99] text-[13px] mt-1.5 min-h-[18px]">≈ {fmtVnd(perM)}/tháng · tiết kiệm</div></>);
  };

  const cards = CARDS[aud];

  return (
    <div
      className="min-h-screen text-[#EAF2FF] px-5 pt-6 pb-16"
      style={{ background: 'radial-gradient(1200px 600px at 50% -10%, #12233D 0%, #070C16 60%)' }}
    >
      <div className="max-w-[1120px] mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-[#9FB2CC] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>

        {/* Head */}
        <div className="text-center mb-7">
          <div className="text-[#4C8DFF] font-bold tracking-[3px] text-[13px] uppercase">Bảng giá geo3d</div>
          <h1 className="text-[40px] max-[520px]:text-[30px] font-extrabold my-2 tracking-tight">Hình học không gian <span className="text-[#4C8DFF]">bằng mắt</span></h1>
          <div className="text-[#9FB2CC] text-[17px]">Chọn gói phù hợp — huỷ bất cứ lúc nào.</div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-3.5 mt-6 mb-2.5">
          <div className={SEG}>
            {(['student', 'teacher'] as Aud[]).map((a) => (
              <button
                key={a}
                className={segBtn(aud === a)}
                disabled={isRoleLocked && lockedRole !== a}
                onClick={() => setAud(a)}
              >
                {a === 'student' ? 'Học sinh' : 'Giáo viên'}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-2.5">
            <div className={SEG}>
              {(['month', 'year'] as Bill[]).map((b) => (
                <button key={b} className={segBtn(bill === b)} onClick={() => setBill(b)}>
                  {b === 'month' ? 'Tháng' : 'Năm học'}
                </button>
              ))}
            </div>
            <span className={cn('bg-[#5AD1A5]/15 text-[#5AD1A5] font-bold text-xs px-2.5 py-1 rounded-full border border-[#5AD1A5]/35 transition-opacity', bill === 'year' ? 'opacity-100' : 'opacity-0')}>
              Tiết kiệm tới ~45%
            </span>
          </div>
        </div>

        {/* Trust */}
        <div className="text-center text-[#6B7E99] text-[13px] my-2 mb-7 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#5AD1A5]" />
          Đáp số được <b className="text-[#9FB2CC]">máy kiểm chứng</b> — chưa kiểm chứng thì <b className="text-[#9FB2CC]">không trừ credit</b>.
        </div>
        {isRoleLocked && (
          <div className="text-center text-[#6B7E99] text-[12.5px] mb-5">
            Bạn đang dùng gói <b className="text-[#9FB2CC]">{lockedRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}</b> — đổi vai trò được mở lại khi hết hạn.
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-[18px] items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {cards.map((c) => {
            const isCurrent = !!c.tier && tier === c.tier;
            const key = codeFor(c) ?? c.name;
            const loading = buying === key;
            return (
              <div
                key={c.name}
                className={cn(
                  'relative rounded-[18px] p-6 flex flex-col border transition-colors',
                  c.popular
                    ? 'border-[#4C8DFF] bg-[#122341] shadow-[0_0_0_1px_#4C8DFF,0_20px_50px_-20px_rgba(76,141,255,.5)]'
                    : 'border-[#1E3357] bg-[#0F1B30]',
                )}
              >
                {c.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-br from-[#4C8DFF] to-[#2E6BF2] text-white text-xs font-bold px-3.5 py-1 rounded-full whitespace-nowrap">
                    {c.popular}
                  </div>
                )}
                <div className="text-xl font-extrabold mb-0.5">{c.name}</div>
                <div className="text-[#6B7E99] text-[13px] mb-3.5">{c.for}</div>
                {priceBlock(c)}
                <div className="mt-3.5 mb-1 text-[#4C8DFF] font-bold text-sm min-h-[20px]">{c.creditText || ' '}</div>
                <button
                  onClick={() => onCta(c)}
                  disabled={loading || isCurrent}
                  className={cn(
                    'mt-4 mb-1 rounded-[10px] py-3 font-bold text-[15px] cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5 disabled:cursor-default',
                    c.contact
                      ? 'bg-transparent border border-[#4C8DFF] text-[#4C8DFF] hover:bg-[#4C8DFF]/10'
                      : (c.popular
                        ? 'bg-gradient-to-br from-[#4C8DFF] to-[#2E6BF2] text-white border-0 hover:brightness-110'
                        : 'bg-[#16263f] text-[#EAF2FF] border border-[#1E3357] hover:bg-[#1b2f4d]'),
                    isCurrent && 'opacity-70',
                  )}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? 'Gói hiện tại' : c.cta}
                </button>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {c.features.map((f, i) => (
                    <li key={i} className={cn('flex gap-2.5 text-sm leading-snug', f[0] ? 'text-[#D4E1F5]' : 'text-[#6B7E99]')}>
                      <span className="shrink-0 mt-0.5">{f[0] ? <Check className="w-4 h-4 text-[#5AD1A5]" /> : <Minus className="w-4 h-4 text-[#6B7E99]" />}</span>
                      {f[1]}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <div className="mt-8 text-[#6B7E99] text-[12.5px] leading-[1.7] text-center max-w-[760px] mx-auto">
          Credit theo gói được cấp lại <b className="text-[#9FB2CC]">mỗi tháng</b>, không dồn sang tháng sau.
          Credit <b className="text-[#9FB2CC]">nạp lẻ</b> mua thêm thì <b className="text-[#9FB2CC]">không hết hạn</b> và giữ nguyên kể cả khi hết gói.
          Gói Trường được xác minh là trường; giới thiệu gói Trường nhận thưởng đại sứ cố định.
        </div>
      </div>
    </div>
  );
}
