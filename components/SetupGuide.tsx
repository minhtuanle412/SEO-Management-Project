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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Monthly Breakdown table
CREATE TABLE monthly_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  month INT NOT NULL,
  payment_status TEXT NOT NULL,
  payment_proof_url TEXT,
  UNIQUE(project_id, month)
);

-- 3. Create KPI Entries table
CREATE TABLE kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contract_month INT NOT NULL,
  actual_month DATE NOT NULL,
  kpi_percentage INT NOT NULL,
  report_status TEXT NOT NULL,
  report_sent_date DATE,
  notes TEXT,
  customer_confirmation_url TEXT
);

-- 4. Enable Row Level Security (RLS) for all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_entries ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies to allow public read/write access
-- WARNING: These are permissive policies for demonstration. 
-- For production, you should implement proper authentication and authorization.
CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON projects FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON projects FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON monthly_breakdown FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON monthly_breakdown FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON monthly_breakdown FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON kpi_entries FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON kpi_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON kpi_entries FOR UPDATE USING (true);
  `;

  const updateSqlSchema = `
-- Lệnh SQL để cập nhật schema CSDL hiện có lên phiên bản mới nhất.
-- Chạy các lệnh này trong Supabase SQL Editor của bạn.

-- Thêm cột 'payment_proof_url' vào bảng monthly_breakdown nếu nó chưa tồn tại.
ALTER TABLE public.monthly_breakdown
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Thêm cột 'notes' vào bảng kpi_entries nếu nó chưa tồn tại.
ALTER TABLE public.kpi_entries
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Thêm cột 'customer_confirmation_url' vào bảng kpi_entries nếu nó chưa tồn tại.
ALTER TABLE public.kpi_entries
ADD COLUMN IF NOT EXISTS customer_confirmation_url TEXT;
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

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Link to="/" className="inline-flex items-center text-primary hover:text-blue-700 font-semibold text-sm mb-6">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Quay lại Bảng điều khiển
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
            Nếu bạn đã cài đặt một phiên bản cũ hơn và gặp lỗi liên quan đến cột bị thiếu (ví dụ: "could not find the 'payment_proof_url' column"), hãy chạy đoạn mã SQL dưới đây. Nó sẽ cập nhật các bảng của bạn lên cấu trúc mới nhất mà <span className="font-semibold">không làm mất dữ liệu hiện có</span>.
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
      </div>
    </div>
  );
};

export default SetupGuide;
