
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
-- Script này an toàn để chạy nhiều lần. Nó sẽ tạo bảng nếu chưa có, thêm cột thiếu, và sửa lỗi phân quyền.

BEGIN;

-- 1. Bảng Projects & Cột mới
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

-- 5. Các bảng Cấu hình (Phòng ban, Chức vụ, Nhân sự...)
CREATE TABLE IF NOT EXISTS public.phong_ban (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS public.chuc_vu (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT UNIQUE NOT NULL);

CREATE TABLE IF NOT EXISTS public.nhan_su (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_ten TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.nhan_su ADD COLUMN IF NOT EXISTS phong_ban_id UUID REFERENCES public.phong_ban(id) ON DELETE SET NULL;
ALTER TABLE public.nhan_su ADD COLUMN IF NOT EXISTS chuc_vu_id UUID REFERENCES public.chuc_vu(id) ON DELETE SET NULL;

-- FIX: Loại bỏ ràng buộc NOT NULL cho các cột cũ (nếu có) để tránh lỗi khi thêm nhân sự
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

CREATE TABLE IF NOT EXISTS public.cau_hinh_hoa_hong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ty_le_hoa_hong NUMERIC NOT NULL CHECK (ty_le_hoa_hong >= 0)
);
ALTER TABLE public.cau_hinh_hoa_hong ADD COLUMN IF NOT EXISTS chuc_vu_id UUID REFERENCES public.chuc_vu(id) ON DELETE CASCADE UNIQUE;

-- 6. Bảng Profiles & ROLE (Khắc phục lỗi thiếu cột Role)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- QUAN TRỌNG: Lệnh này đảm bảo cột role luôn tồn tại
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';

-- 7. Trigger tạo user
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

-- Đồng bộ user cũ nếu có
INSERT INTO public.profiles (id, email) SELECT id, email FROM auth.users ON CONFLICT (id) DO NOTHING;

-- 8. Phân quyền (RLS Policies)
-- Reset toàn bộ policies cũ để tránh xung đột
DO $$
DECLARE
  tabs text[] := ARRAY['projects', 'payment_installments', 'monthly_breakdown', 'kpi_entries', 'nhan_su', 'phong_ban', 'chuc_vu', 'phan_cong_du_an', 'cau_hinh_hoa_hong', 'profiles'];
  t text;
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Read access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for all users on %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin update roles" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable write access for admins on %I" ON %I', t, t);
  END LOOP;
END $$;

-- Policy cho Profiles
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "User update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Chỉ Admin sửa role
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

-- Policy cho Dữ liệu Dự án (Authenticated users được sửa để vận hành)
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
      <h1 className="text-4xl font-bold text-dark mb-4">Hướng dẫn Cài đặt Supabase</h1>
      <p className="text-gray-600 mb-8">
        Trang này cung cấp các mã lệnh SQL cần thiết để thiết lập cơ sở dữ liệu cho ứng dụng.
      </p>

      <div className="space-y-12">
        
        {/* MASTER SCRIPT SECTION */}
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
             <CheckCircleIcon className="h-8 w-8 text-blue-600 mr-3" />
             <h2 className="text-2xl font-bold text-blue-900">Script Tổng hợp (Khuyên dùng)</h2>
          </div>
          <p className="text-blue-800 mb-4">
            Nếu bạn gặp bất kỳ lỗi nào (ví dụ: thiếu cột 'role', lỗi permission denied), hãy chạy đoạn mã dưới đây. 
            Nó sẽ tự động kiểm tra và sửa chữa toàn bộ cấu trúc database và phân quyền mà <strong>không làm mất dữ liệu hiện có</strong>.
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

        {/* Storage Bucket Setup */}
        <section>
          <h2 className="text-2xl font-bold text-dark border-b-2 border-gray-200 pb-2 mb-4">Thiết lập Storage (Lưu trữ ảnh)</h2>
          <p className="text-gray-700 mb-4">
            Bạn cần tạo 2 bucket công khai (Public) trong menu <strong>Storage</strong> của Supabase:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 bg-gray-50 p-6 rounded-lg border">
             <li>Bucket 1: <strong>payment_proofs</strong> (Dùng lưu ảnh chuyển khoản)</li>
             <li>Bucket 2: <strong>confirmation_proofs</strong> (Dùng lưu ảnh xác nhận KH)</li>
          </ul>
          <p className="text-gray-500 text-sm mt-2">Lưu ý: Nhớ tick chọn "Public Bucket" khi tạo.</p>
        </section>

      </div>
    </div>
  );
};

export default SetupGuide;
