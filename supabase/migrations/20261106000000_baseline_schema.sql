-- Baseline schema: SEO Management 2025
-- Nguồn: master script trong components/SetupGuide.tsx tại commit 2890d3d.
-- Database production đã có sẵn toàn bộ nội dung này (chạy tay qua SQL Editor),
-- nên khi link CLI lần đầu cần đánh dấu migration này là đã áp dụng:
--   npx supabase migration repair --status applied 20261106000000 --remote
-- Script viết theo kiểu chạy lại nhiều lần được.

-- 1. Bảng Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_budget NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'monthly';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS looker_studio_url TEXT;

-- 2. Bảng Payment Installments
CREATE TABLE IF NOT EXISTS public.payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  payment_percentage INT NOT NULL,
  status TEXT NOT NULL,
  payment_proof_url TEXT
);
ALTER TABLE public.payment_installments ADD COLUMN IF NOT EXISTS payment_date DATE;

-- 3. Bảng Monthly Breakdown
CREATE TABLE IF NOT EXISTS public.monthly_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  month INT NOT NULL,
  payment_status TEXT NOT NULL,
  UNIQUE(project_id, month)
);
ALTER TABLE public.monthly_breakdown ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE public.monthly_breakdown ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES public.payment_installments(id) ON DELETE SET NULL;
ALTER TABLE public.monthly_breakdown ADD COLUMN IF NOT EXISTS payment_date DATE;

-- 4. Bảng KPI Entries
CREATE TABLE IF NOT EXISTS public.kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_month INT NOT NULL,
  actual_month DATE NOT NULL,
  kpi_percentage INT NOT NULL,
  report_status TEXT NOT NULL
);
ALTER TABLE public.kpi_entries ADD COLUMN IF NOT EXISTS report_sent_date DATE;
ALTER TABLE public.kpi_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.kpi_entries ADD COLUMN IF NOT EXISTS customer_confirmation_url TEXT;
ALTER TABLE public.kpi_entries ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'Không áp dụng';
ALTER TABLE public.kpi_entries ADD COLUMN IF NOT EXISTS commission_paid_date DATE;

-- 5. Cấu hình Nhân sự
CREATE TABLE IF NOT EXISTS public.phong_ban (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS public.chuc_vu (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT UNIQUE NOT NULL);

CREATE TABLE IF NOT EXISTS public.nhan_su (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_ten TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.nhan_su ADD COLUMN IF NOT EXISTS phong_ban_id UUID REFERENCES public.phong_ban(id) ON DELETE SET NULL;
ALTER TABLE public.nhan_su ADD COLUMN IF NOT EXISTS chuc_vu_id UUID REFERENCES public.chuc_vu(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nhan_su' AND column_name = 'chuc_vu') THEN
    ALTER TABLE public.nhan_su ALTER COLUMN chuc_vu DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nhan_su' AND column_name = 'phong_ban') THEN
    ALTER TABLE public.nhan_su ALTER COLUMN phong_ban DROP NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.phan_cong_du_an (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  nhan_su_id UUID REFERENCES public.nhan_su(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(project_id, nhan_su_id)
);
ALTER TABLE public.phan_cong_du_an ADD COLUMN IF NOT EXISTS ty_le_phan_cong INT DEFAULT 100;

CREATE TABLE IF NOT EXISTS public.cau_hinh_hoa_hong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ty_le_hoa_hong NUMERIC NOT NULL CHECK (ty_le_hoa_hong >= 0)
);
ALTER TABLE public.cau_hinh_hoa_hong ADD COLUMN IF NOT EXISTS chuc_vu_id UUID REFERENCES public.chuc_vu(id) ON DELETE CASCADE UNIQUE;

-- 6. Bảng Chốt sổ Hoa hồng
CREATE TABLE IF NOT EXISTS public.commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.nhan_su(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  month VARCHAR(7) NOT NULL, 
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.commission_payouts ADD COLUMN IF NOT EXISTS effort_percentage INT DEFAULT 100;

-- 7. Bảng Yêu cầu Xóa Dự án
CREATE TABLE IF NOT EXISTS public.project_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

-- 8. Auth & Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'staff')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

INSERT INTO public.profiles (id, email) SELECT id, email FROM auth.users ON CONFLICT (id) DO NOTHING;

-- 9. RLS Policies
DO $$
DECLARE
  tabs text[] := ARRAY['projects', 'payment_installments', 'monthly_breakdown', 'kpi_entries', 'nhan_su', 'phong_ban', 'chuc_vu', 'phan_cong_du_an', 'cau_hinh_hoa_hong', 'profiles', 'commission_payouts', 'project_deletion_requests'];
  t text;
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- CLEANUP OLD POLICIES
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "User update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin update role" ON public.profiles;

DROP POLICY IF EXISTS "Read config" ON public.nhan_su;
DROP POLICY IF EXISTS "Admin write config" ON public.nhan_su;
DROP POLICY IF EXISTS "Read config" ON public.phong_ban;
DROP POLICY IF EXISTS "Admin write config" ON public.phong_ban;
DROP POLICY IF EXISTS "Read config" ON public.chuc_vu;
DROP POLICY IF EXISTS "Admin write config" ON public.chuc_vu;
DROP POLICY IF EXISTS "Read config" ON public.cau_hinh_hoa_hong;
DROP POLICY IF EXISTS "Admin write config" ON public.cau_hinh_hoa_hong;

DROP POLICY IF EXISTS "Auth read payouts" ON public.commission_payouts;
DROP POLICY IF EXISTS "Manager insert payouts" ON public.commission_payouts;

DROP POLICY IF EXISTS "Manager manage deletion requests" ON public.project_deletion_requests;

DROP POLICY IF EXISTS "Auth access projects" ON public.projects;
DROP POLICY IF EXISTS "Auth access installments" ON public.payment_installments;
DROP POLICY IF EXISTS "Auth access breakdown" ON public.monthly_breakdown;
DROP POLICY IF EXISTS "Auth access kpi" ON public.kpi_entries;
DROP POLICY IF EXISTS "Auth access assignments" ON public.phan_cong_du_an;

-- CREATE NEW POLICIES (Updated for super_admin)

-- Profiles
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "User update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Admin & Super Admin can update roles
CREATE POLICY "Admin update role" ON public.profiles FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Config Tables (Admin & Super Admin write)
CREATE POLICY "Read config" ON public.nhan_su FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.nhan_su FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "Read config" ON public.phong_ban FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.phong_ban FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "Read config" ON public.chuc_vu FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.chuc_vu FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "Read config" ON public.cau_hinh_hoa_hong FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.cau_hinh_hoa_hong FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- Commission Payouts (Admin, Super Admin, Manager write)
CREATE POLICY "Auth read payouts" ON public.commission_payouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manager insert payouts" ON public.commission_payouts FOR INSERT TO authenticated 
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'manager'));

-- Deletion Requests
CREATE POLICY "Manager manage deletion requests" ON public.project_deletion_requests
FOR ALL TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'manager'));

-- Project Data (Full access for authenticated)
CREATE POLICY "Auth access projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access installments" ON public.payment_installments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access breakdown" ON public.monthly_breakdown FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access kpi" ON public.kpi_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access assignments" ON public.phan_cong_du_an FOR ALL TO authenticated USING (true) WITH CHECK (true);
