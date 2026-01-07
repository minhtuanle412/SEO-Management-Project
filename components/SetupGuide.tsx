
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
  const sqlSchema = `
-- 1. Create Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INT NOT NULL,
  total_budget NUMERIC NOT NULL CHECK (total_budget > 0),
  payment_type TEXT NOT NULL DEFAULT 'monthly',
  looker_studio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Payment Installments table (for milestone payments)
CREATE TABLE payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  payment_percentage INT NOT NULL CHECK (payment_percentage > 0 AND payment_percentage <= 100),
  status TEXT NOT NULL,
  payment_proof_url TEXT
);

-- 3. Create Monthly Breakdown table
CREATE TABLE monthly_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  month INT NOT NULL,
  payment_status TEXT NOT NULL,
  payment_proof_url TEXT,
  installment_id UUID REFERENCES payment_installments(id) ON DELETE SET NULL,
  UNIQUE(project_id, month)
);

-- 4. Create KPI Entries table
CREATE TABLE kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contract_month INT NOT NULL,
  actual_month DATE NOT NULL,
  kpi_percentage INT NOT NULL,
  report_status TEXT NOT NULL,
  report_sent_date DATE,
  notes TEXT,
  customer_confirmation_url TEXT,
  commission_status TEXT NOT NULL DEFAULT 'Không áp dụng',
  commission_paid_date DATE
);

-- 5. Enable Row Level Security (RLS) for all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_entries ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies to allow public read/write access
-- WARNING: These are permissive policies for demonstration. 
-- For production, you should implement proper authentication and authorization.
CREATE POLICY "Enable all access for all users on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users on installments" ON payment_installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users on monthly_breakdown" ON monthly_breakdown FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users on kpi_entries" ON kpi_entries FOR ALL USING (true) WITH CHECK (true);
  `;

  const updateSqlSchema = `
-- Lệnh SQL để cập nhật schema CSDL hiện có lên phiên bản mới nhất.
-- Script này được thiết kế để có thể chạy lại nhiều lần mà không gây lỗi.

-- Cập nhật bảng 'projects'
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS total_budget NUMERIC,
ADD COLUMN IF NOT EXISTS payment_type TEXT,
ADD COLUMN IF NOT EXISTS looker_studio_url TEXT;

-- Điền giá trị mặc định cho các dòng hiện có (chỉ chạy nếu cột là NULL)
UPDATE public.projects SET total_budget = 1 WHERE total_budget IS NULL;
UPDATE public.projects SET payment_type = 'monthly' WHERE payment_type IS NULL;

-- Thêm ràng buộc NOT NULL sau khi đã điền dữ liệu, chỉ khi cột đang cho phép NULL.
DO $$
BEGIN
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'total_budget') = 'YES' THEN
    ALTER TABLE public.projects ALTER COLUMN total_budget SET NOT NULL;
  END IF;
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'payment_type') = 'YES' THEN
    ALTER TABLE public.projects ALTER COLUMN payment_type SET NOT NULL;
  END IF;
END $$;

-- Thêm ràng buộc CHECK để đảm bảo total_budget là số dương, chỉ khi nó chưa tồn tại.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'total_budget_positive' AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects ADD CONSTRAINT total_budget_positive CHECK (total_budget > 0);
  END IF;
END $$;


-- Tạo bảng 'payment_installments' nếu chưa có
CREATE TABLE IF NOT EXISTS payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  payment_percentage INT NOT NULL CHECK (payment_percentage > 0 AND payment_percentage <= 100),
  status TEXT NOT NULL,
  payment_proof_url TEXT
);
-- Bật RLS và tạo policy nếu bảng vừa được tạo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_installments' AND policyname = 'Enable all access for all users on installments') THEN
    ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Enable all access for all users on installments" ON payment_installments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- Cập nhật bảng 'monthly_breakdown'
ALTER TABLE public.monthly_breakdown
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES payment_installments(id) ON DELETE SET NULL;


-- Cập nhật bảng 'kpi_entries'
ALTER TABLE public.kpi_entries
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS customer_confirmation_url TEXT,
ADD COLUMN IF NOT EXISTS commission_status TEXT,
ADD COLUMN IF NOT EXISTS commission_paid_date DATE;

-- Điền giá trị mặc định 'Không áp dụng' cho các dòng hiện có chưa có trạng thái.
UPDATE public.kpi_entries
SET commission_status = 'Không áp dụng'
WHERE commission_status IS NULL;

-- Cập nhật các dòng đã đạt KPI nhưng chưa có trạng thái đúng thành 'Chưa chi trả'.
UPDATE public.kpi_entries
SET commission_status = 'Chưa chi trả'
WHERE kpi_percentage >= 75 AND commission_status = 'Không áp dụng';

-- Thêm ràng buộc NOT NULL cho commission_status sau khi đã điền dữ liệu.
DO $$
BEGIN
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kpi_entries' AND column_name = 'commission_status') = 'YES' THEN
    ALTER TABLE public.kpi_entries ALTER COLUMN commission_status SET NOT NULL;
  END IF;
END $$;
`;

  const storagePoliciesSql = `
-- Policy to allow anonymous users to view files in the 'payment_proofs' bucket.
CREATE POLICY "Public Read Access for Payment Proofs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'payment_proofs' );

-- Policy to allow anonymous users to upload files to the 'payment_proofs' bucket.
CREATE POLICY "Allow anonymous uploads for Payment Proofs"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'payment_proofs' );
  `;
    
  const confirmationStoragePoliciesSql = `
-- Policy to allow anonymous users to view files in the 'confirmation_proofs' bucket.
CREATE POLICY "Public Read Access for Confirmations"
ON storage.objects FOR SELECT
USING ( bucket_id = 'confirmation_proofs' );

-- Policy to allow anonymous users to upload files to the 'confirmation_proofs' bucket.
CREATE POLICY "Allow anonymous uploads for Confirmations"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'confirmation_proofs' );
  `;
  
  const commissionModuleSql = `
-- 1. Create Staff table (nhan_su)
CREATE TABLE nhan_su (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_ten TEXT NOT NULL,
  chuc_vu TEXT NOT NULL,
  phong_ban TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Project Assignment table (phan_cong_du_an)
CREATE TABLE phan_cong_du_an (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  nhan_su_id UUID REFERENCES nhan_su(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(project_id, nhan_su_id)
);

-- 3. Create Commission Configuration table (cau_hinh_hoa_hong)
CREATE TABLE cau_hinh_hoa_hong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chuc_vu TEXT UNIQUE NOT NULL,
  ty_le_hoa_hong NUMERIC NOT NULL CHECK (ty_le_hoa_hong >= 0)
);

-- 4. Enable RLS for new tables
ALTER TABLE nhan_su ENABLE ROW LEVEL SECURITY;
ALTER TABLE phan_cong_du_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE cau_hinh_hoa_hong ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for new tables
CREATE POLICY "Enable all access for all users on nhan_su" ON nhan_su FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users on phan_cong_du_an" ON phan_cong_du_an FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users on cau_hinh_hoa_hong" ON cau_hinh_hoa_hong FOR ALL USING (true) WITH CHECK (true);

-- 6. Insert default commission configurations (optional, but recommended)
INSERT INTO cau_hinh_hoa_hong (chuc_vu, ty_le_hoa_hong)
VALUES
  ('Sale Admin', 0),
  ('Sale', 0),
  ('Leader', 0),
  ('Nhân sự triển khai', 0)
ON CONFLICT (chuc_vu) DO NOTHING;
`;

const staffModuleUpgradeSql = `
-- NÂNG CẤP MODULE NHÂN SỰ & HOA HỒNG
-- Script này sẽ chuẩn hóa dữ liệu Phòng ban và Chức vụ vào các bảng riêng,
-- giúp việc quản lý trở nên dễ dàng và nhất quán hơn.
-- Script được thiết kế để có thể chạy lại nhiều lần một cách an toàn.

-- Bước 1: Tạo bảng 'phong_ban' và 'chuc_vu' nếu chưa tồn tại.
CREATE TABLE IF NOT EXISTS phong_ban (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS chuc_vu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

-- Bước 2: Bật RLS và tạo Policies nếu chưa có.
DO $$ BEGIN ALTER TABLE phong_ban ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable all access for all users on phong_ban' AND polrelid = 'phong_ban'::regclass) THEN CREATE POLICY "Enable all access for all users on phong_ban" ON phong_ban FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN ALTER TABLE chuc_vu ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable all access for all users on chuc_vu' AND polrelid = 'chuc_vu'::regclass) THEN CREATE POLICY "Enable all access for all users on chuc_vu" ON chuc_vu FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- Bước 3: Di chuyển dữ liệu từ các cột text cũ vào bảng mới.
-- Chèn các giá trị duy nhất từ 'nhan_su' và 'cau_hinh_hoa_hong' vào các bảng mới.
INSERT INTO phong_ban (name) SELECT DISTINCT phong_ban FROM nhan_su WHERE phong_ban IS NOT NULL ON CONFLICT (name) DO NOTHING;
INSERT INTO chuc_vu (name) SELECT DISTINCT chuc_vu FROM nhan_su WHERE chuc_vu IS NOT NULL ON CONFLICT (name) DO NOTHING;
INSERT INTO chuc_vu (name) SELECT DISTINCT chuc_vu FROM cau_hinh_hoa_hong WHERE chuc_vu IS NOT NULL ON CONFLICT (name) DO NOTHING;

-- Bước 4: Cập nhật bảng 'nhan_su' để sử dụng foreign keys.
-- Thêm các cột foreign key mới nếu chưa có.
ALTER TABLE nhan_su ADD COLUMN IF NOT EXISTS phong_ban_id UUID REFERENCES phong_ban(id) ON DELETE SET NULL;
ALTER TABLE nhan_su ADD COLUMN IF NOT EXISTS chuc_vu_id UUID REFERENCES chuc_vu(id) ON DELETE SET NULL;

-- Cập nhật các foreign key dựa trên giá trị text cũ (chỉ chạy cho các dòng chưa được cập nhật).
UPDATE nhan_su SET phong_ban_id = (SELECT id FROM phong_ban WHERE phong_ban.name = nhan_su.phong_ban) WHERE phong_ban_id IS NULL AND phong_ban IS NOT NULL;
UPDATE nhan_su SET chuc_vu_id = (SELECT id FROM chuc_vu WHERE chuc_vu.name = nhan_su.chuc_vu) WHERE chuc_vu_id IS NULL AND chuc_vu IS NOT NULL;

-- Bước 5: Cập nhật bảng 'cau_hinh_hoa_hong' để sử dụng foreign keys.
-- Thêm cột foreign key mới nếu chưa có.
ALTER TABLE cau_hinh_hoa_hong ADD COLUMN IF NOT EXISTS chuc_vu_id UUID REFERENCES chuc_vu(id) ON DELETE CASCADE;

-- Cập nhật foreign key.
UPDATE cau_hinh_hoa_hong SET chuc_vu_id = (SELECT id FROM chuc_vu WHERE chuc_vu.name = cau_hinh_hoa_hong.chuc_vu) WHERE chuc_vu_id IS NULL AND chuc_vu IS NOT NULL;

-- Thêm ràng buộc UNIQUE cho cột mới nếu chưa có.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cau_hinh_hoa_hong_chuc_vu_id_key' AND conrelid = 'cau_hinh_hoa_hong'::regclass) THEN ALTER TABLE cau_hinh_hoa_hong ADD CONSTRAINT cau_hinh_hoa_hong_chuc_vu_id_key UNIQUE (chuc_vu_id); END IF; END $$;

-- Ghi chú: Các cột text cũ ('phong_ban', 'chuc_vu') trong bảng 'nhan_su' và 'cau_hinh_hoa_hong'
-- được giữ lại để đảm bảo an toàn. Sau khi xác nhận mọi thứ hoạt động chính xác,
-- bạn có thể xóa chúng thủ công bằng các lệnh sau:
-- ALTER TABLE nhan_su DROP COLUMN phong_ban;
-- ALTER TABLE nhan_su DROP COLUMN chuc_vu;
-- ALTER TABLE cau_hinh_hoa_hong DROP COLUMN chuc_vu;
`;

const userProfileSql = `
-- TẠO BẢNG PROFILES VÀ TRIGGER TỰ ĐỘNG ĐỒNG BỘ USER
-- Chạy script này để tạo bảng lưu thông tin người dùng công khai.

-- 1. Tạo bảng profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- 2. Bật bảo mật Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tạo Policies (Quyền truy cập)
-- Mọi người có thể xem profiles
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT 
USING (true);

-- Người dùng chỉ có thể sửa profile của chính mình
CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 4. Tạo Function để xử lý user mới
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Tạo Trigger (Kích hoạt khi có user mới đăng ký)
-- Drop trigger cũ nếu tồn tại để tránh lỗi trùng lặp
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Link to="/" className="inline-flex items-center text-primary hover:text-blue-700 font-semibold text-sm mb-6">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Quay lại Danh sách dự án
      </Link>
      <h1 className="text-4xl font-bold text-dark mb-4">Hướng dẫn Cài đặt Supabase</h1>
      <p className="text-gray-600 mb-8">
        Để ứng dụng hoạt động đầy đủ, bạn cần cài đặt cơ sở dữ liệu và lưu trữ trên Supabase. Dưới đây là các bước cần thiết.
      </p>

      <div className="space-y-12">
        
        {/* Step 1: Database Setup */}
        <section>
          <h2 className="text-2xl font-bold text-dark border-b-2 border-primary pb-2 mb-4">Bước 1: Cài đặt Cơ sở dữ liệu (Cho Cài đặt Mới)</h2>
          <p className="text-gray-700 mb-2">
            Nếu bạn đang cài đặt ứng dụng lần đầu, hãy vào Supabase Dashboard của bạn, điều hướng đến <span className="font-semibold">SQL Editor</span>, và chạy đoạn mã SQL dưới đây để tạo các bảng cần thiết và thiết lập chính sách bảo mật (Row Level Security).
          </p>
          <CodeBlock>{sqlSchema}</CodeBlock>
        </section>

        {/* Update Existing Database Section */}
        <section>
          <h2 className="text-2xl font-bold text-dark border-b-2 border-primary pb-2 mb-4">Cập nhật Schema Cơ sở dữ liệu (Cho Cài đặt Hiện có)</h2>
          <p className="text-gray-700 mb-2">
            Nếu bạn đã cài đặt một phiên bản cũ hơn và cần nâng cấp, hãy chạy đoạn mã SQL dưới đây. Nó sẽ cập nhật các bảng của bạn lên cấu trúc mới nhất mà <span className="font-semibold">không làm mất dữ liệu hiện có</span>. Script này được thiết kế để có thể chạy lại nhiều lần mà không gây lỗi.
          </p>
          <CodeBlock>{updateSqlSchema}</CodeBlock>
        </section>
        
        {/* Step 2: Storage Bucket Setup */}
        <section>
          <h2 className="text-2xl font-bold text-dark border-b-2 border-primary pb-2 mb-4">Bước 2: Tạo Storage Buckets</h2>
          <p className="text-gray-700 mb-4">
            Ứng dụng cần nơi để lưu trữ các tệp tải lên. Bạn cần tạo hai "Bucket" trong Supabase Storage.
          </p>
          <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">2.1. Bucket cho Chứng từ Thanh toán</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700 bg-gray-50 p-6 rounded-lg border mt-2">
                    <li>Trong Supabase Dashboard, điều hướng đến mục <span className="font-semibold">Storage</span>.</li>
                    <li>Nhấn vào nút <span className="font-semibold">"New Bucket"</span>.</li>
                    <li>
                    Nhập tên bucket chính xác là:
                    <div className="my-2 bg-yellow-100 border border-yellow-300 text-yellow-800 font-mono font-bold text-center py-2 rounded-md">
                        payment_proofs
                    </div>
                    </li>
                    <li>Đánh dấu vào ô <span className="font-semibold">"Public bucket"</span>.</li>
                    <li>Nhấn <span className="font-semibold">"Create Bucket"</span>.</li>
                </ol>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-800">2.2. Bucket cho Xác nhận của Khách hàng</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700 bg-gray-50 p-6 rounded-lg border mt-2">
                    <li>Vẫn trong mục <span className="font-semibold">Storage</span>, nhấn <span className="font-semibold">"New Bucket"</span> một lần nữa.</li>
                    <li>
                    Nhập tên bucket chính xác là:
                    <div className="my-2 bg-yellow-100 border border-yellow-300 text-yellow-800 font-mono font-bold text-center py-2 rounded-md">
                        confirmation_proofs
                    </div>
                    </li>
                    <li>Đánh dấu vào ô <span className="font-semibold">"Public bucket"</span>.</li>
                    <li>Nhấn <span className="font-semibold">"Create Bucket"</span>.</li>
                </ol>
            </div>
          </div>
        </section>

        {/* Step 3: Storage Policies */}
        <section>
          <h2 className="text-2xl font-bold text-dark border-b-2 border-primary pb-2 mb-4">Bước 3 (Tùy chọn): Chính sách Bảo mật cho Storage</h2>
           <p className="text-gray-700 mb-2">
            Nếu bạn không đặt các bucket là "Public" ở Bước 2, bạn cần tạo các chính sách bảo mật cho Storage.
            Trong <span className="font-semibold">SQL Editor</span>, chạy các lệnh SQL dưới đây để cho phép ứng dụng đọc và ghi tệp vào các bucket.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mt-4">Chính sách cho 'payment_proofs'</h3>
           <CodeBlock>{storagePoliciesSql}</CodeBlock>
           <h3 className="text-lg font-semibold text-gray-800 mt-4">Chính sách cho 'confirmation_proofs'</h3>
           <CodeBlock>{confirmationStoragePoliciesSql}</CodeBlock>
        </section>

        {/* Step 4: Commission Module Setup */}
        <section>
            <h2 className="text-2xl font-bold text-dark border-b-2 border-accent pb-2 mb-4">Bước 4: Cài đặt Module Hoa hồng (Cho Cài đặt Mới)</h2>
            <p className="text-gray-700 mb-2">
                Nếu bạn đang cài đặt lần đầu, đoạn mã ở Bước 1 đã bao gồm các bảng này. Nếu bạn đang nâng cấp, hãy sử dụng script ở Bước 5. Đoạn mã dưới đây chỉ để tham khảo.
            </p>
            <CodeBlock>{commissionModuleSql}</CodeBlock>
        </section>

        {/* Step 5: Staff Module Upgrade */}
        <section>
            <h2 className="text-2xl font-bold text-dark border-b-2 border-green-600 pb-2 mb-4">Bước 5: Nâng cấp Module Nhân sự & Hoa hồng</h2>
            <p className="text-gray-700 mb-2">
                Để có thể quản lý động các <span className="font-semibold">Phòng ban</span> và <span className="font-semibold">Chức vụ</span>, bạn cần chạy đoạn mã SQL nâng cấp dưới đây. Nó sẽ chuẩn hóa lại cấu trúc cơ sở dữ liệu của bạn một cách an toàn.
            </p>
            <CodeBlock>{staffModuleUpgradeSql}</CodeBlock>
        </section>

        {/* Step 6: User Profiles Setup */}
        <section>
            <h2 className="text-2xl font-bold text-dark border-b-2 border-purple-600 pb-2 mb-4">Bước 6: Tạo bảng Tài khoản (Profiles) & Trigger</h2>
            <p className="text-gray-700 mb-2">
                Supabase lưu thông tin đăng nhập trong bảng hệ thống riêng. Để lưu thông tin bổ sung (tên, avatar) và có thể truy vấn công khai, bạn cần tạo bảng <code className="font-mono bg-gray-200 px-1">public.profiles</code>.
            </p>
            <p className="text-gray-700 mb-4">
                Chạy script dưới đây để tạo bảng này và thiết lập <strong>Trigger</strong> (tự động tạo profile khi có người dùng mới đăng ký).
            </p>
            <CodeBlock>{userProfileSql}</CodeBlock>
        </section>
      </div>
    </div>
  );
};

export default SetupGuide;
