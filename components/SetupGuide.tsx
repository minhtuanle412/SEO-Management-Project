
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ClipboardCopyIcon, CheckCircleIcon } from './Icons';

const CodeBlock: React.FC<{ children: string }> = ({ children }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-dark text-white rounded-lg my-4 relative">
      <pre className="p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
        <code>{children.trim()}</code>
      </pre>
      <button 
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
        aria-label="Copy to clipboard"
      >
        {copied ? <CheckCircleIcon className="h-5 w-5 text-green-400" /> : <ClipboardCopyIcon className="h-5 w-5" />}
      </button>
    </div>
  );
};

const SetupGuide: React.FC = () => {
  const masterScript = `
-- MASTER SCRIPT: CẬP NHẬT TOÀN BỘ DATABASE & QUYỀN (SAFE MODE)
-- Script này an toàn để chạy nhiều lần.

BEGIN;

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
-- [NEW] Thêm cột tỷ lệ phân công cho nhân sự (mặc định 100%)
ALTER TABLE public.phan_cong_du_an ADD COLUMN IF NOT EXISTS ty_le_phan_cong INT DEFAULT 100;

CREATE TABLE IF NOT EXISTS public.cau_hinh_hoa_hong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ty_le_hoa_hong NUMERIC NOT NULL CHECK (ty_le_hoa_hong >= 0)
);
ALTER TABLE public.cau_hinh_hoa_hong ADD COLUMN IF NOT EXISTS chuc_vu_id UUID REFERENCES public.chuc_vu(id) ON DELETE CASCADE UNIQUE;

-- 6. Bảng Chốt sổ Hoa hồng (Snapshot)
CREATE TABLE IF NOT EXISTS public.commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.nhan_su(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
-- [NEW] Thêm cột tỷ lệ nỗ lực tại thời điểm chốt (mặc định 100%)
ALTER TABLE public.commission_payouts ADD COLUMN IF NOT EXISTS effort_percentage INT DEFAULT 100;

-- 7. Auth & Profiles
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

-- 8. RLS Policies
DO $$
DECLARE
  tabs text[] := ARRAY['projects', 'payment_installments', 'monthly_breakdown', 'kpi_entries', 'nhan_su', 'phong_ban', 'chuc_vu', 'phan_cong_du_an', 'cau_hinh_hoa_hong', 'profiles', 'commission_payouts'];
  t text;
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 8.1 XÓA CÁC POLICY CŨ (Để tránh lỗi "already exists" khi chạy lại)

-- Profiles
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "User update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin update role" ON public.profiles;

-- Config Tables
DROP POLICY IF EXISTS "Read config" ON public.nhan_su;
DROP POLICY IF EXISTS "Admin write config" ON public.nhan_su;
DROP POLICY IF EXISTS "Read config" ON public.phong_ban;
DROP POLICY IF EXISTS "Admin write config" ON public.phong_ban;
DROP POLICY IF EXISTS "Read config" ON public.chuc_vu;
DROP POLICY IF EXISTS "Admin write config" ON public.chuc_vu;
DROP POLICY IF EXISTS "Read config" ON public.cau_hinh_hoa_hong;
DROP POLICY IF EXISTS "Admin write config" ON public.cau_hinh_hoa_hong;

-- Commission Payouts
DROP POLICY IF EXISTS "Auth read payouts" ON public.commission_payouts;
DROP POLICY IF EXISTS "Manager insert payouts" ON public.commission_payouts;

-- Project Data
DROP POLICY IF EXISTS "Auth access projects" ON public.projects;
DROP POLICY IF EXISTS "Auth access installments" ON public.payment_installments;
DROP POLICY IF EXISTS "Auth access breakdown" ON public.monthly_breakdown;
DROP POLICY IF EXISTS "Auth access kpi" ON public.kpi_entries;
DROP POLICY IF EXISTS "Auth access assignments" ON public.phan_cong_du_an;


-- 8.2 TẠO LẠI POLICY MỚI

-- Policy cho Profiles
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "User update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin update role" ON public.profiles FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy cho Cấu hình (Ai cũng xem, Chỉ Admin sửa)
CREATE POLICY "Read config" ON public.nhan_su FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.nhan_su FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Read config" ON public.phong_ban FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.phong_ban FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Read config" ON public.chuc_vu FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.chuc_vu FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Read config" ON public.cau_hinh_hoa_hong FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.cau_hinh_hoa_hong FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Policy cho Commission Payouts (Ai cũng xem được, chỉ Admin/Manager được tạo)
CREATE POLICY "Auth read payouts" ON public.commission_payouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manager insert payouts" ON public.commission_payouts FOR INSERT TO authenticated 
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'));

-- Policy cho Dữ liệu Dự án
CREATE POLICY "Auth access projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access installments" ON public.payment_installments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access breakdown" ON public.monthly_breakdown FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access kpi" ON public.kpi_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access assignments" ON public.phan_cong_du_an FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
  `;

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Link to="/" className="inline-flex items-center text-primary hover:text-blue-700 font-semibold text-sm mb-6">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Quay lại Danh sách dự án
      </Link>
      <h1 className="text-4xl font-bold text-dark mb-4">Hướng dẫn Cài đặt & Cập nhật</h1>
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
        <p className="text-yellow-700 font-bold">CẬP NHẬT DATABASE (Quan trọng)</p>
        <p className="text-yellow-700">Đã cập nhật cấu trúc bảng để hỗ trợ <strong>phân chia tỷ lệ hoa hồng</strong>. Vui lòng copy và chạy lại script bên dưới trong Supabase SQL Editor.</p>
      </div>
      <p className="text-gray-600 mb-8">
        Trang này cung cấp các mã lệnh SQL cần thiết để thiết lập cơ sở dữ liệu cho ứng dụng.
      </p>

      <div className="space-y-12">
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
             <CheckCircleIcon className="h-8 w-8 text-blue-600 mr-3" />
             <h2 className="text-2xl font-bold text-blue-900">Script Tổng hợp (Safe Mode)</h2>
          </div>
          <p className="text-blue-800 mb-4">
            Script này sẽ tự động tạo các bảng mới và cập nhật cấu trúc bảng cũ mà <strong>không làm mất dữ liệu</strong>.
          </p>
          <CodeBlock>{masterScript}</CodeBlock>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
             <h4 className="font-bold text-yellow-800">Sau khi chạy xong:</h4>
             <p className="text-yellow-700 text-sm mt-1">
                Đừng quên chạy lệnh sau để cấp quyền Admin cho chính bạn (thay email của bạn vào):<br/>
                <code className="bg-yellow-100 px-2 py-1 rounded font-mono text-black select-all">UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@GMAIL.COM';</code>
             </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-dark border-b-2 border-gray-200 pb-2 mb-4">Thiết lập Storage</h2>
          <p className="text-gray-700 mb-4">
            Bạn cần tạo 2 bucket công khai (Public) trong menu <strong>Storage</strong> của Supabase:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 bg-gray-50 p-6 rounded-lg border">
             <li>Bucket 1: <strong>payment_proofs</strong></li>
             <li>Bucket 2: <strong>confirmation_proofs</strong></li>
          </ul>
        </section>

      </div>
    </div>
  );
};

export default SetupGuide;
