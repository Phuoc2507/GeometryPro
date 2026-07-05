-- Thêm trường gói cước cho profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS plan_expires_at timestamp with time zone;

-- Tạo bảng orders để quản lý thanh toán PayOS
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_code integer NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    amount integer NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Bật Row Level Security cho orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Cho phép user tự xem đơn hàng của mình
CREATE POLICY "Users can view their own orders" ON public.orders 
FOR SELECT USING (auth.uid() = user_id);

-- Lưu ý: Việc INSERT/UPDATE order sẽ được thực hiện qua backend API bằng SERVICE_ROLE_KEY nên không cần tạo policy cho insert/update từ client.

-- Bật RLS cho profiles để ngăn người dùng tự hack VIP
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view any profile" ON public.profiles
FOR SELECT USING (true);

-- User chỉ được phép sửa Tên hiển thị và Avatar. CẤM update plan_type.
CREATE POLICY "Users can update non-plan fields" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id AND 
    plan_type IS NOT DISTINCT FROM (SELECT plan_type FROM public.profiles WHERE user_id = auth.uid()) AND
    plan_expires_at IS NOT DISTINCT FROM (SELECT plan_expires_at FROM public.profiles WHERE user_id = auth.uid())
);
