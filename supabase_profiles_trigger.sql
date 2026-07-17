-- =============================================================================
-- Fix: profiles rows were never created on signup (3 auth.users / 0 profiles).
-- Run this once in Supabase -> SQL Editor (it runs as service_role, bypassing RLS).
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

-- 1) profiles.user_id must be UNIQUE so the trigger can ON CONFLICT on it and so
--    webhook upserts work. (orders.user_id already FKs to it, so this normally
--    exists already -- guarded in case it does not.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype IN ('u', 'p')
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.profiles'::regclass AND attname = 'user_id')
      ]
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END
$$;

-- 2) Create a profile automatically whenever a new auth user is created.
--    SECURITY DEFINER so it can insert despite RLS on profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, plan_type)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, 'user@unknown'), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    ),
    'free'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Backfill profiles for users that already exist without one.
INSERT INTO public.profiles (user_id, display_name, avatar_url, plan_type)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(COALESCE(u.email, 'user@unknown'), '@', 1)
  ),
  COALESCE(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  ),
  'free'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 4) Grant Pro to the owner account (1 year).
UPDATE public.profiles
SET plan_type = 'pro',
    plan_expires_at = now() + interval '1 year'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'phuocphuoc2507@gmail.com');

-- 5) Verify: every user should now have a profile.
SELECT
  (SELECT count(*) FROM auth.users)      AS total_users,
  (SELECT count(*) FROM public.profiles) AS total_profiles;

SELECT u.email, p.plan_type, p.plan_expires_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
ORDER BY p.plan_type DESC;
