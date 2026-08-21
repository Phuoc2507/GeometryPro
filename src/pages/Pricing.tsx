import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus, ChevronLeft, ShieldCheck, Loader2, Ticket } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCheckout } from '@/hooks/useCheckout';
import { supabase } from '@/integrations/supabase/client';
import { authUrlWithRedirect } from '@/lib/authRedirect';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
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
  const { user, tier, lockedRole, isRoleLocked } = useAuth();
  const { plans, buying, startCheckout } = useCheckout();

  const [aud, setAud] = useState<Aud>(lockedRole ?? 'student');
  const [bill, setBill] = useState<Bill>('month');

  // Mã mời — giảm 10% cho người được mời.
  const [refInput, setRefInput] = useState(() => { try { return localStorage.getItem('geo3d:ref') || ''; } catch { return ''; } });
  const [refApplied, setRefApplied] = useState<string | null>(null);
  const [refStatus, setRefStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [refMsg, setRefMsg] = useState('');

  const applyRef = async (codeArg?: string) => {
    const code = (codeArg ?? refInput).trim().toUpperCase();
    if (!code) return;
    const { data: sd } = await supabase.auth.getSession();
    const token = sd.session?.access_token;
    // Chưa đăng nhập → đưa đi đăng nhập rồi quay lại đây (mã tự áp sau khi đăng nhập).
    if (!token) { navigate(authUrlWithRedirect('/bang-gia')); return; }
    setRefStatus('checking'); setRefMsg('');
    try {
      const res = await fetchWithTimeout(`/api/referral?validate=${encodeURIComponent(code)}`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j.valid) { setRefApplied(code); setRefStatus('valid'); setRefMsg(j.referrerName ? `Hợp lệ · được giới thiệu bởi ${j.referrerName}` : 'Mã hợp lệ · giảm 10%'); }
      else {
        setRefApplied(null); setRefStatus('invalid'); setRefMsg(j.message || 'Mã không hợp lệ');
        // Mã hỏng "vĩnh viễn" (không tồn tại / mã của mình / đã mua rồi) → xoá để lần sau khỏi bị nhắc lại.
        if (['not_found', 'self', 'not_first'].includes(j.reason)) { try { localStorage.removeItem('geo3d:ref'); } catch { /* bỏ qua */ } }
      }
    } catch { setRefApplied(null); setRefStatus('invalid'); setRefMsg('Không kiểm tra được mã, thử lại.'); }
  };
  const clearRef = () => { setRefApplied(null); setRefInput(''); setRefStatus('idle'); setRefMsg(''); try { localStorage.removeItem('geo3d:ref'); } catch { /* bỏ qua */ } };

  // Tự động áp mã đã lưu (từ link ?ref) khi người dùng đã đăng nhập — tránh mất giảm giá vì quên bấm "Áp dụng".
  useEffect(() => {
    if (user && refInput.trim() && refStatus === 'idle' && !refApplied) applyRef(refInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    startCheckout({ planCode: code, referralCode: refApplied || undefined }, code);
  };

  // Số tiền LUÔN một dòng (nowrap); kỳ hạn + ghi chú xuống dòng phụ → mọi thẻ cao bằng nhau.
  const priceBlock = (c: CardDef) => {
    let amount = '', sub = '';
    let paidValue = 0;
    if (c.contact) { amount = 'Liên hệ'; sub = 'Báo giá theo quy mô trường'; }
    else if (priceOf(c) === 0) { amount = '0đ'; sub = 'Miễn phí mãi mãi'; }
    else {
      const v = byCode.get(codeFor(c) ?? '')?.price_vnd ?? 0;
      paidValue = v;
      amount = fmtVnd(v);
      if (c.yearOnly) sub = '/năm học · trọn năm';
      else if (bill === 'month') sub = '/tháng · gia hạn hằng tháng';
      else sub = `/năm · ≈ ${fmtVnd(Math.round(v / 12 / 1000) * 1000)}/tháng`;
    }
    const showDiscount = !!refApplied && paidValue > 0;
    return (
      <div className="min-h-[60px]">
        {showDiscount ? (
          <div className="flex items-end gap-2 whitespace-nowrap">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-emerald-400">{fmtVnd(Math.round(paidValue * 0.9))}</span>
            <span className="text-[15px] line-through text-[#6B7E99]">{amount}</span>
          </div>
        ) : (
          <div className="text-[30px] font-extrabold leading-none tracking-tight whitespace-nowrap">{amount}</div>
        )}
        <div className="text-[#6B7E99] text-[12.5px] mt-2">{sub}</div>
      </div>
    );
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

        {/* Mã mời — giảm 10% cho người được mời */}
        <div className="max-w-[520px] mx-auto mb-7 rounded-2xl border border-[#22344F] bg-[#0E1A2C]/60 p-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#EAF2FF] mb-2.5">
            <Ticket className="w-4 h-4 text-[#4C8DFF]" /> Mã mời
            <span className="text-[12px] font-normal text-[#6B7E99]">(nếu có — giảm 10%)</span>
          </div>
          <div className="flex gap-2">
            <input
              value={refInput}
              onChange={(e) => { setRefInput(e.target.value.toUpperCase()); if (refStatus !== 'idle') { setRefStatus('idle'); setRefMsg(''); } }}
              placeholder="VD: GEO7X9A"
              maxLength={16}
              disabled={refStatus === 'valid'}
              className="flex-1 h-10 rounded-lg bg-[#0A121F] border border-[#22344F] px-3 text-[15px] font-mono tracking-wider uppercase text-white placeholder:text-[#4A5A72] focus:outline-none focus:border-[#4C8DFF] disabled:opacity-70"
            />
            {refApplied ? (
              <button type="button" onClick={clearRef} className="px-4 rounded-lg border border-[#22344F] text-[#9FB2CC] hover:text-white text-sm font-medium">Bỏ</button>
            ) : (
              <button type="button" onClick={() => applyRef()} disabled={refStatus === 'checking' || !refInput.trim()} className="px-4 rounded-lg bg-[#2E6BF2] text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center justify-center min-w-[84px]">
                {refStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Áp dụng'}
              </button>
            )}
          </div>
          {refMsg && (
            <div className={cn('text-[13px] mt-2 flex items-center gap-1', refStatus === 'valid' ? 'text-emerald-400' : 'text-red-400')}>
              {refStatus === 'valid' && <Check className="w-3.5 h-3.5" />}{refMsg}
            </div>
          )}
        </div>

        {/* Controls — cả 2 toggle CĂN GIỮA độc lập; badge tiết kiệm là DÒNG RIÊNG (không đẩy lệch) */}
        <div className="flex flex-col items-center gap-3 mt-6 mb-2.5">
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
          <div className={SEG}>
            {(['month', 'year'] as Bill[]).map((b) => (
              <button key={b} className={segBtn(bill === b)} onClick={() => setBill(b)}>
                {b === 'month' ? 'Tháng' : 'Năm học'}
              </button>
            ))}
          </div>
          <span className={cn('text-[#5AD1A5] text-xs font-semibold transition-opacity', bill === 'year' ? 'opacity-100' : 'opacity-0')}>
            🎉 Tiết kiệm tới ~45% khi trả theo năm học
          </span>
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

        {/* Cards — thẻ rộng đều, căn giữa; hợp cả 2 thẻ (Học sinh) lẫn 4 thẻ (Giáo viên) */}
        <div className="flex flex-wrap justify-center items-stretch gap-[18px]">
          {cards.map((c) => {
            const isCurrent = !!c.tier && tier === c.tier;
            const key = codeFor(c) ?? c.name;
            const loading = buying === key;
            return (
              <div
                key={c.name}
                className={cn(
                  'relative w-[264px] max-w-full rounded-[18px] p-6 flex flex-col border transition-colors',
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
