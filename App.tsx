import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Project, MonthlyProgress, PaymentStatus, ReportStatus, KpiEntry } from './types';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import Header from './components/Header';
import SetupGuide from './components/SetupGuide';
import { addMonths, format } from 'date-fns';
import { supabase, areCredentialsPlaceholders } from './lib/supabaseClient';
import { XCircleIcon, XIcon } from './components/Icons';

// --- Toast Notification System ---
type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error';
};

type ToastContextType = {
  addToast: (message: string, type: 'success' | 'error') => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void; }> = ({ message, type, onClose }) => {
  const baseClasses = 'relative w-full max-w-sm p-4 pr-10 rounded-lg shadow-lg flex items-start space-x-3 transition-all duration-300 animate-fade-in-right';
  const typeClasses = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
  };
  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button onClick={onClose} className="absolute top-1/2 right-2 -translate-y-1/2 text-current opacity-70 hover:opacity-100">
        <XIcon className="h-5 w-5" />
      </button>
      <style>{`
        @keyframes fade-in-right { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, []);
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
// --- End Toast System ---

// --- Data Mapping Layer ---
const mapSupabaseKpiEntry = (entry: any): KpiEntry => ({
  id: entry.id,
  contractMonth: entry.contract_month,
  actualMonth: entry.actual_month,
  kpiPercentage: entry.kpi_percentage,
  reportStatus: entry.report_status,
  reportSentDate: entry.report_sent_date,
  notes: entry.notes,
  customerConfirmationUrl: entry.customer_confirmation_url,
});

const mapSupabaseMonthlyBreakdown = (item: any): MonthlyProgress => ({
  id: item.id,
  month: item.month,
  paymentStatus: item.payment_status,
  paymentProofUrl: item.payment_proof_url,
});

const mapSupabaseProject = (project: any): Project => ({
  id: project.id,
  name: project.name,
  client: project.client,
  startDate: project.start_date,
  endDate: project.end_date,
  durationMonths: project.duration_months,
  monthlyBreakdown: (project.monthlyBreakdown || []).map(mapSupabaseMonthlyBreakdown),
  kpiEntries: (project.kpiEntries || []).map(mapSupabaseKpiEntry),
});
// --- End Data Mapping Layer ---


const SupabaseSetupInstructions: React.FC = () => (
  <div className="min-h-screen bg-light flex items-center justify-center p-4">
    <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
      <h1 className="text-3xl font-bold text-dark mb-4">Kết nối với Supabase</h1>
      <p className="text-gray-600 mb-6">
        Để ứng dụng hoạt động, bạn cần cung cấp URL và khóa API Supabase của mình.
      </p>
      <div className="text-left bg-gray-50 p-4 rounded-md border border-gray-200">
        <p className="font-semibold text-gray-800">Vui lòng làm theo các bước sau:</p>
        <ol className="list-decimal list-inside mt-2 space-y-2 text-gray-700">
          <li>
            Mở file <code className="bg-gray-200 text-red-600 font-mono p-1 rounded-sm">lib/supabaseClient.ts</code>.
          </li>
          <li>
            Thay thế các giá trị giữ chỗ cho <code className="bg-gray-200 text-red-600 font-mono p-1 rounded-sm">supabaseUrl</code> và <code className="bg-gray-200 text-red-600 font-mono p-1 rounded-sm">supabaseAnonKey</code> bằng thông tin xác thực từ dự án Supabase của bạn.
          </li>
          <li>Lưu file và ứng dụng sẽ tự động tải lại.</li>
        </ol>
      </div>
      <p className="mt-6 text-sm text-gray-500">
        Bạn có thể tìm thấy các thông tin này trong cài đặt dự án Supabase của bạn trong mục "API".
      </p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupabaseConfigured] = useState(!areCredentialsPlaceholders());
  const { addToast } = useToast();

  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured) {
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
        const { data, error: fetchError } = await supabase
            .from('projects')
            .select('*, kpiEntries:kpi_entries(*), monthlyBreakdown:monthly_breakdown(*)')
            .order('start_date', { ascending: false });

        if (fetchError) {
            console.error('Error fetching projects:', fetchError);
            const errorMessage = fetchError.message || 'An unknown error occurred while fetching data.';
            if (errorMessage.includes("relation \"projects\" does not exist")) {
                setError(`Lỗi cơ sở dữ liệu: Không tìm thấy bảng 'projects'. Vui lòng đảm bảo bạn đã chạy các câu lệnh SQL cần thiết trong Supabase SQL Editor để tạo các bảng.`);
            } else if (errorMessage.includes("violates row-level security policy")) {
                setError(`Lỗi bảo mật: Quyền truy cập vào các dự án bị từ chối. Vui lòng kiểm tra các chính sách Row Level Security (RLS) trên các bảng của bạn và đảm bảo chúng cho phép quyền đọc (SELECT).`);
            } else {
                setError(`Không thể tải dự án: ${errorMessage}`);
            }
            setProjects([]);
        } else if (data) {
            setProjects(data.map(mapSupabaseProject));
        }
    } catch (err: unknown) {
        console.error('An unexpected error occurred:', err);
        let errorMessage = 'Đã xảy ra lỗi không mong muốn.';
        if (err instanceof Error) {
            errorMessage = err.message;
        }
        setError(`Lỗi kết nối: ${errorMessage}. Vui lòng kiểm tra kết nối mạng và thông tin xác thực Supabase của bạn.`);
        setProjects([]);
    } finally {
        setLoading(false);
    }
}, [isSupabaseConfigured]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

 const addProject = useCallback(async (newProjectData: Omit<Project, 'id' | 'endDate' | 'monthlyBreakdown' | 'kpiEntries'>) => {
    if (!isSupabaseConfigured) return;
    try {
        const startDate = new Date(newProjectData.startDate);
        const endDate = addMonths(startDate, newProjectData.durationMonths - 1);

        const projectToInsert = {
          name: newProjectData.name,
          client: newProjectData.client,
          start_date: newProjectData.startDate,
          end_date: format(endDate, 'yyyy-MM-dd'),
          duration_months: newProjectData.durationMonths,
        };

        const { data: newProject, error } = await supabase.from('projects').insert(projectToInsert).select().single();

        if (error || !newProject) {
            console.error('Error adding project:', error);
            const errorMessageStr = String(error?.message || 'Lỗi không xác định');
            const errorDetailsStr = error?.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi thêm dự án: ${errorMessageStr}${errorDetailsStr}`;
            
            if (errorMessageStr.toLowerCase().includes('security policy')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể thêm dự án. Vui lòng kiểm tra chính sách RLS trên bảng "projects" và đảm bảo quyền INSERT được bật. Tham khảo trang Hướng dẫn Cài đặt.`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }

        const monthlyBreakdownToInsert = Array.from({ length: newProjectData.durationMonths }, (_, i) => ({
          project_id: newProject.id,
          month: i + 1,
          payment_status: PaymentStatus.Unpaid,
        }));
        
        const { error: breakdownError } = await supabase.from('monthly_breakdown').insert(monthlyBreakdownToInsert);
        
        if (breakdownError) {
            console.error('Error creating monthly breakdown:', breakdownError);
            addToast(`Lỗi khi thiết lập các tháng của dự án: ${breakdownError.message}`, 'error');
            await supabase.from('projects').delete().match({ id: newProject.id });
            return;
        }
        addToast(`Dự án "${newProject.name}" đã được thêm thành công!`, 'success');
        await fetchProjects();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while adding project:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchProjects, isSupabaseConfigured, addToast]);

const addKpiEntry = useCallback(async (projectId: string, newEntryData: Omit<KpiEntry, 'id'>) => {
    if (!isSupabaseConfigured) return;
    try {
        const entryToInsert = {
            project_id: projectId,
            contract_month: newEntryData.contractMonth,
            actual_month: newEntryData.actualMonth,
            kpi_percentage: newEntryData.kpiPercentage,
            notes: newEntryData.notes,
            report_status: newEntryData.reportStatus,
            report_sent_date: newEntryData.reportSentDate,
        };
        const { data: newEntry, error } = await supabase.from('kpi_entries').insert(entryToInsert).select().single();

        if (error || !newEntry) {
            console.error("Error adding KPI entry:", error);
            const errorMessageStr = String(error?.message || 'Lỗi không xác định');
            const errorDetailsStr = error?.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi thêm mục KPI: ${errorMessageStr}${errorDetailsStr}`;

            if (errorMessageStr.toLowerCase().includes('security policy')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể thêm KPI. Vui lòng kiểm tra chính sách RLS trên bảng "kpi_entries" và đảm bảo quyền INSERT được bật. Tham khảo trang Hướng dẫn Cài đặt.`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }
        addToast('Đã thêm mục KPI mới thành công!', 'success');
        await fetchProjects();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while adding KPI entry:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchProjects, isSupabaseConfigured, addToast]);

const updateKpiEntry = useCallback(async (kpiEntryId: string, updates: Partial<Pick<KpiEntry, 'reportStatus' | 'reportSentDate'>>) => {
    if (!isSupabaseConfigured) return;
    try {
        const updatesForSupabase: { [key: string]: any } = {};
        if (updates.reportStatus !== undefined) {
            updatesForSupabase.report_status = updates.reportStatus;
        }
        if (updates.reportSentDate !== undefined) {
            updatesForSupabase.report_sent_date = updates.reportSentDate;
        }

        const { error } = await supabase.from('kpi_entries').update(updatesForSupabase).match({ id: kpiEntryId });

        if (error) {
            console.error("Error updating KPI entry:", error);
            const errorMessageStr = String(error.message || 'Lỗi không xác định.');
            const errorDetailsStr = error.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi cập nhật báo cáo: ${errorMessageStr}${errorDetailsStr}`;

            if (errorMessageStr.toLowerCase().includes('security policy') || errorMessageStr.toLowerCase().includes('permission denied')) {
                 userFriendlyMessage = `Lỗi quyền truy cập: Không thể cập nhật KPI. Vui lòng kiểm tra chính sách RLS trên bảng "kpi_entries" và đảm bảo quyền UPDATE được bật. Tham khảo trang Hướng dẫn Cài đặt.`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }

        addToast('Trạng thái báo cáo đã được cập nhật.', 'success');
        await fetchProjects();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating KPI entry:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchProjects, isSupabaseConfigured, addToast]);


const updateMonthlyPayment = useCallback(async (monthId: string, proofUrl: string) => {
    if (!isSupabaseConfigured) return;
    try {
        const { error } = await supabase
            .from('monthly_breakdown')
            .update({ 
                payment_status: PaymentStatus.Paid,
                payment_proof_url: proofUrl,
            })
            .match({ id: monthId });

        if (error) {
            console.error("Error updating payment status:", error);
            const errorMessageStr = String(error.message || 'Lỗi không xác định.');
            const errorDetailsStr = error.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi cập nhật thanh toán: ${errorMessageStr}${errorDetailsStr}`;

            if (errorMessageStr.toLowerCase().includes('security policy') || errorMessageStr.toLowerCase().includes('permission denied')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể cập nhật thanh toán. Vui lòng kiểm tra chính sách RLS trên bảng "monthly_breakdown" và đảm bảo quyền UPDATE được bật. Tham khảo trang Hướng dẫn Cài đặt.`;
            } else if (errorMessageStr.toLowerCase().includes("could not find the 'payment_proof_url' column")) {
                userFriendlyMessage = `Lỗi Cấu trúc Cơ sở dữ liệu: Không tìm thấy cột 'payment_proof_url'. Có thể CSDL của bạn đã cũ. Vui lòng chạy lại mã SQL trong Hướng dẫn Cài đặt để cập nhật bảng 'monthly_breakdown'.`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }
        addToast('Trạng thái thanh toán đã được cập nhật thành công!', 'success');
        await fetchProjects();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating payment:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchProjects, isSupabaseConfigured, addToast]);

const updateKpiConfirmation = useCallback(async (kpiEntryId: string, confirmationUrl: string) => {
    if (!isSupabaseConfigured) return;
    try {
        const { error } = await supabase
            .from('kpi_entries')
            .update({ customer_confirmation_url: confirmationUrl })
            .match({ id: kpiEntryId });

        if (error) {
            console.error("Error updating KPI confirmation:", error);
            const errorMessageStr = String(error.message || 'Lỗi không xác định.');
            const errorDetailsStr = error.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi cập nhật xác nhận: ${errorMessageStr}${errorDetailsStr}`;

            if (errorMessageStr.toLowerCase().includes('security policy')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể cập nhật xác nhận. Vui lòng kiểm tra chính sách RLS trên bảng "kpi_entries" và đảm bảo quyền UPDATE được bật.`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }

        addToast('Đã cập nhật xác nhận của khách hàng thành công!', 'success');
        await fetchProjects();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating KPI confirmation:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchProjects, isSupabaseConfigured, addToast]);

const updateProjectName = useCallback(async (projectId: string, newName: string) => {
    if (!isSupabaseConfigured) return;
    try {
        const { error } = await supabase
            .from('projects')
            .update({ name: newName })
            .match({ id: projectId });

        if (error) {
            console.error("Error updating project name:", error);
            const errorMessageStr = String(error.message || 'Lỗi không xác định.');
            const errorDetailsStr = error.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi cập nhật tên dự án: ${errorMessageStr}${errorDetailsStr}`;

            if (errorMessageStr.toLowerCase().includes('security policy')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể cập nhật tên dự án. Vui lòng kiểm tra chính sách RLS trên bảng "projects" và đảm bảo quyền UPDATE được bật.`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }

        addToast('Tên dự án đã được cập nhật thành công!', 'success');
        await fetchProjects();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating project name:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchProjects, isSupabaseConfigured, addToast]);


  if (!isSupabaseConfigured) {
    return <SupabaseSetupInstructions />;
  }

  if (loading) {
      return (
          <div className="flex justify-center items-center min-h-screen">
              <div className="text-2xl font-bold text-primary">Đang tải dự án...</div>
          </div>
      )
  }

 if (error) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
                <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-red-600 mb-4">Lỗi kết nối</h1>
                <p className="text-gray-600 mb-6">
                    Không thể tải dữ liệu dự án từ Supabase.
                </p>
            </div>
            <div className="text-left bg-red-50 p-4 rounded-md border border-red-200 mb-6">
                <p className="font-semibold text-red-800">Chi tiết lỗi:</p>
                <pre className="mt-2 text-sm text-red-700 whitespace-pre-wrap font-mono">{error}</pre>
            </div>

            <div className="text-left bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <h3 className="font-semibold text-yellow-800">Các bước khắc phục sự cố phổ biến:</h3>
                <ul className="list-disc list-inside mt-2 space-y-2 text-yellow-900 text-sm">
                    <li>
                        <strong>Kiểm tra thông tin xác thực:</strong> Đảm bảo <code className="bg-yellow-200 font-mono p-1 rounded-sm">supabaseUrl</code> và <code className="bg-yellow-200 font-mono p-1 rounded-sm">supabaseAnonKey</code> trong file <code className="bg-yellow-200 font-mono p-1 rounded-sm">lib/supabaseClient.ts</code> là chính xác.
                    </li>
                    <li>
                        <strong>Thiết lập cơ sở dữ liệu:</strong> Nếu bạn thấy lỗi "relation does not exist", điều đó có nghĩa là các bảng của bạn chưa được tạo. Bạn cần chạy các lệnh SQL để thiết lập schema trong Supabase SQL Editor.
                    </li>
                    <li>
                        <strong>Kiểm tra chính sách RLS:</strong> Lỗi "violates row-level security policy" có nghĩa là bạn cần thiết lập các quy tắc trong Supabase để cho phép ứng dụng đọc dữ liệu từ các bảng của bạn. Hãy đảm bảo bạn có chính sách `SELECT` cho người dùng `anon`.
                    </li>
                     <li>
                        <strong>Kiểm tra kết nối mạng:</strong> Đảm bảo bạn có kết nối internet ổn định.
                    </li>
                </ul>
            </div>
            
            <div className="text-center">
                <button
                    onClick={fetchProjects}
                    className="mt-8 bg-primary text-white font-bold py-2 px-8 rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
                  >
                    Thử lại
                </button>
            </div>
        </div>
      </div>
    );
  }


  return (
    <HashRouter>
      <div className="min-h-screen bg-light text-dark font-sans">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard projects={projects} addProject={addProject} />} />
            <Route path="/project/:projectSlug" element={<ProjectDetail projects={projects} addKpiEntry={addKpiEntry} updateMonthlyPayment={updateMonthlyPayment} updateKpiEntry={updateKpiEntry} updateKpiConfirmation={updateKpiConfirmation} updateProjectName={updateProjectName} />} />
            <Route path="/setup" element={<SetupGuide />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};


const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);


export default App;