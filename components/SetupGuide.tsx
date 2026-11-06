
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

// SQL hiển thị trên trang này được ghép tự động từ các file trong supabase/migrations,
// sắp theo tên file. Không viết SQL trực tiếp trong component này nữa.
const migrationFiles = import.meta.glob('../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const masterScript = [
  '-- MASTER SCRIPT: ghép từ toàn bộ file trong supabase/migrations',
  '-- Script này an toàn để chạy nhiều lần.',
  'BEGIN;',
  ...Object.keys(migrationFiles)
    .sort()
    .map(path => `-- ===== ${path.split('/').pop()} =====\n${migrationFiles[path].trim()}`),
  'COMMIT;',
].join('\n\n');

const SetupGuide: React.FC = () => {

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Link to="/" className="inline-flex items-center text-primary hover:text-blue-700 font-semibold text-sm mb-6">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Quay lại Danh sách dự án
      </Link>
      <h1 className="text-4xl font-bold text-dark mb-4">Hướng dẫn Cài đặt & Cập nhật</h1>
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
        <p className="text-yellow-700 font-bold">CẬP NHẬT DATABASE</p>
        <p className="text-yellow-700">Cách khuyến nghị: chạy <code className="bg-yellow-100 px-1 rounded font-mono">npm run db:push</code> bằng Supabase CLI. Lệnh này chỉ áp dụng các migration mới.</p>
        <p className="text-yellow-700 mt-1">Cách thủ công: copy script bên dưới và chạy trong Supabase SQL Editor. Script được ghép từ toàn bộ migration và chạy lại nhiều lần được.</p>
      </div>
      
      <div className="space-y-12">
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
             <CheckCircleIcon className="h-8 w-8 text-blue-600 mr-3" />
             <h2 className="text-2xl font-bold text-blue-900">Script Tổng hợp</h2>
          </div>
          <CodeBlock>{masterScript}</CodeBlock>
          
           <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
             <h4 className="font-bold text-purple-800">Cấp quyền Super Admin:</h4>
             <p className="text-purple-700 text-sm mt-1">
                Để thăng cấp cho chính bạn thành Super Admin, hãy chạy lệnh sau:<br/>
                <code className="bg-purple-100 px-2 py-1 rounded font-mono text-black select-all">UPDATE public.profiles SET role = 'super_admin' WHERE email = 'YOUR_EMAIL@GMAIL.COM';</code>
             </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SetupGuide;
