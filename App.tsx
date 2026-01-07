
import React, { useState, useCallback, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Project, MonthlyProgress, PaymentStatus, ReportStatus, KpiEntry, PaymentType, PaymentInstallment, CommissionStatus, Staff, ProjectAssignment, CommissionConfig, Department, Position } from './types';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import SetupGuide from './components/SetupGuide';
import ManagementPage from './components/ManagementPage';
import CommissionReportPage from './components/CommissionReportPage';
import CommissionPayrollPage from './components/CommissionPayrollPage';
import LoginPage from './components/LoginPage';
import { addMonths, format } from 'date-fns';
import { supabase, areCredentialsPlaceholders } from './lib/supabaseClient';
import { XCircleIcon, ChartBarIcon, QuestionMarkCircleIcon, UsersIcon, PresentationChartLineIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, CurrencyDollarIcon } from './components/Icons';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

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
  commissionStatus: entry.commission_status,
  commissionPaidDate: entry.commission_paid_date,
});

const mapSupabaseMonthlyBreakdown = (item: any): MonthlyProgress => ({
  id: item.id,
  month: item.month,
  paymentStatus: item.payment_status,
  paymentProofUrl: item.payment_proof_url,
  installmentId: item.installment_id,
});

const mapSupabasePaymentInstallment = (item: any): PaymentInstallment => ({
    id: item.id,
    name: item.name,
    paymentPercentage: item.payment_percentage,
    status: item.status,
    paymentProofUrl: item.payment_proof_url,
});

const mapSupabaseProjectAssignment = (item: any): ProjectAssignment => ({
    id: item.id,
    project_id: item.project_id,
    nhan_su_id: item.nhan_su_id,
    nhan_su: item.nhan_su,
});

const mapSupabaseProject = (project: any): Project => ({
  id: project.id,
  name: project.name,
  client: project.client,
  startDate: project.start_date,
  endDate: project.end_date,
  durationMonths: project.duration_months,
  totalBudget: project.total_budget,
  paymentType: project.payment_type,
  monthlyBreakdown: (project.monthlyBreakdown || []).map(mapSupabaseMonthlyBreakdown),
  kpiEntries: (project.kpiEntries || []).map(mapSupabaseKpiEntry),
  installments: (project.installments || []).map(mapSupabasePaymentInstallment),
  assignments: (project.assignments || []).map(mapSupabaseProjectAssignment),
  lookerStudioUrl: project.looker_studio_url,
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


// --- Sidebar NavLink (for Desktop) ---
const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; isCollapsed: boolean }> = ({ to, icon, label, isCollapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname.startsWith('/project'));

  return (
    <Link
      to={to}
      title={label}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isCollapsed ? 'justify-center' : ''} ${
        isActive
          ? 'bg-primary text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className={`ml-3 whitespace-nowrap ${isCollapsed ? 'hidden' : ''}`}>{label}</span>
    </Link>
  );
};

// --- Sidebar Component (for Desktop) ---
const Sidebar: React.FC<{ isCollapsed: boolean; toggleSidebar: () => void; }> = ({ isCollapsed, toggleSidebar }) => {
  const { user, signOut } = useAuth();

  return (
    <aside className={`flex-shrink-0 bg-dark p-4 hidden sm:flex flex-col text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <Link to="/" className={`flex items-center space-x-3 px-2 mb-8 ${isCollapsed ? 'justify-center' : ''}`} title="SEO Management 2025 - Dashboard">
        {/* Updated Logo with external URL */}
        <img src="https://gtvseo.com/wp-content/uploads/2023/10/logo-new-2048x1297.png" alt="GTV Logo" className="h-10 w-auto object-contain flex-shrink-0"/>
        <span className={`text-xl font-bold text-white whitespace-nowrap ${isCollapsed ? 'hidden' : ''}`}>
          SEO Management
        </span>
      </Link>
      
      <nav className="w-full flex-grow flex flex-col space-y-2">
        <NavLink to="/" icon={<ChartBarIcon className="h-6 w-6 flex-shrink-0" />} label="Danh sách dự án" isCollapsed={isCollapsed} />
        <NavLink to="/commission-report" icon={<PresentationChartLineIcon className="h-6 w-6 flex-shrink-0" />} label="Hoa hồng theo dự án" isCollapsed={isCollapsed} />
        <NavLink to="/commission-payroll" icon={<CurrencyDollarIcon className="h-6 w-6 flex-shrink-0" />} label="Hoa hồng theo cá nhân" isCollapsed={isCollapsed} />
        <NavLink to="/management" icon={<UsersIcon className="h-6 w-6 flex-shrink-0" />} label="Quản lý" isCollapsed={isCollapsed} />
      </nav>
      
      <div className="w-full mt-auto">
        {!isCollapsed && user && (
            <div className="mb-4 px-2 text-xs text-gray-400 truncate">
                Đăng nhập: <br/>
                <span className="text-white" title={user.email}>{user.email}</span>
            </div>
        )}
        
        <NavLink to="/setup" icon={<QuestionMarkCircleIcon className="h-6 w-6 flex-shrink-0" />} label="Hướng dẫn cài đặt" isCollapsed={isCollapsed} />
        
        <button
            onClick={signOut}
            className={`w-full flex items-center px-4 py-3 mt-2 text-sm font-medium text-red-300 rounded-lg hover:bg-gray-700 hover:text-red-100 ${isCollapsed ? 'justify-center' : ''}`}
            title="Đăng xuất"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`ml-3 whitespace-nowrap ${isCollapsed ? 'hidden' : ''}`}>Đăng xuất</span>
        </button>

        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center px-4 py-3 mt-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {isCollapsed ? <ChevronDoubleRightIcon className="h-6 w-6 flex-shrink-0" /> : <ChevronDoubleLeftIcon className="h-6 w-6 flex-shrink-0" />}
          <span className={`ml-3 whitespace-nowrap ${isCollapsed ? 'hidden' : ''}`}>Thu gọn</span>
        </button>
      </div>
    </aside>
  );
};

// --- Bottom NavLink (for Mobile) ---
const BottomNavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname.startsWith('/project'));

  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center flex-1 py-2 text-xs transition-colors duration-200 ${
        isActive ? 'text-primary' : 'text-gray-500 hover:text-primary'
      }`}
    >
      {icon}
      <span className="mt-1 font-medium">{label}</span>
    </Link>
  );
};

// --- Bottom Navigation Bar Component (for Mobile) ---
const BottomNavBar: React.FC = () => {
    const { signOut } = useAuth();
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex sm:hidden z-40 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
      <BottomNavLink to="/" icon={<ChartBarIcon className="h-6 w-6" />} label="Dự án" />
      <BottomNavLink to="/commission-report" icon={<PresentationChartLineIcon className="h-6 w-6" />} label="HH Dự án" />
      <BottomNavLink to="/commission-payroll" icon={<CurrencyDollarIcon className="h-6 w-6" />} label="HH Cá nhân" />
      <BottomNavLink to="/management" icon={<UsersIcon className="h-6 w-6" />} label="Quản lý" />
      <button
        onClick={signOut}
        className="flex flex-col items-center justify-center flex-1 py-2 text-xs text-gray-500 hover:text-red-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="mt-1 font-medium">Đăng xuất</span>
      </button>
    </nav>
  );
};


const AppContent: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [commissionConfigs, setCommissionConfigs] = useState<CommissionConfig[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupabaseConfigured] = useState(!areCredentialsPlaceholders());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { addToast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Auth Hook
  
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  const fetchAllData = useCallback(async () => {
    // Only fetch if config is valid AND user is logged in
    if (!isSupabaseConfigured || !user) {
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
        const [
            projectsRes,
            staffRes,
            commissionConfigsRes,
            departmentsRes,
            positionsRes,
        ] = await Promise.all([
            supabase.from('projects').select('*, kpiEntries:kpi_entries(*), monthlyBreakdown:monthly_breakdown(*), installments:payment_installments(*), assignments:phan_cong_du_an(*, nhan_su(*, chuc_vu(*), phong_ban(*)))').order('start_date', { ascending: false }),
            supabase.from('nhan_su').select('*, chuc_vu(*), phong_ban(*)').order('ho_ten'),
            supabase.from('cau_hinh_hoa_hong').select('*, chuc_vu(*)'),
            supabase.from('phong_ban').select('*').order('name'),
            supabase.from('chuc_vu').select('*').order('name'),
        ]);

        let combinedError = '';
        if (projectsRes.error) combinedError += `Projects: ${projectsRes.error.message}\n`;
        if (staffRes.error) combinedError += `Staff: ${staffRes.error.message}\n`;
        if (commissionConfigsRes.error) combinedError += `Commission Configs: ${commissionConfigsRes.error.message}\n`;
        if (departmentsRes.error) combinedError += `Departments: ${departmentsRes.error.message}\n`;
        if (positionsRes.error) combinedError += `Positions: ${positionsRes.error.message}\n`;

        if (combinedError) {
             console.error('Error fetching data:', combinedError);
             const errorMessage = combinedError;
             if (errorMessage.includes("does not exist")) {
                 setError(`Lỗi cơ sở dữ liệu: Một hoặc nhiều bảng (projects, nhan_su, etc.) không tồn tại. Vui lòng chạy các câu lệnh SQL trong Hướng dẫn Cài đặt.`);
             } else if (errorMessage.includes("violates row-level security policy")) {
                 setError(`Lỗi bảo mật: Quyền truy cập bị từ chối. Vui lòng kiểm tra chính sách RLS trên các bảng và đảm bảo chúng cho phép quyền đọc (SELECT).`);
             } else {
                 setError(`Không thể tải dữ liệu: ${errorMessage}`);
             }
             setProjects([]);
             setStaff([]);
             setCommissionConfigs([]);
             setDepartments([]);
             setPositions([]);
        } else {
            setProjects(projectsRes.data?.map(mapSupabaseProject) || []);
            setStaff(staffRes.data as Staff[] || []);
            setCommissionConfigs(commissionConfigsRes.data as CommissionConfig[] || []);
            setDepartments(departmentsRes.data || []);
            setPositions(positionsRes.data || []);
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
  }, [isSupabaseConfigured, user]); // Add user dependency


  useEffect(() => {
    if (user) {
        fetchAllData();
    }
  }, [fetchAllData, user]);

 const addProject = useCallback(async (newProjectData: Omit<Project, 'id' | 'endDate' | 'monthlyBreakdown' | 'kpiEntries' | 'installments' | 'lookerStudioUrl' | 'assignments'>) => {
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
          total_budget: newProjectData.totalBudget,
          payment_type: newProjectData.paymentType,
        };

        const { data: newProject, error } = await supabase.from('projects').insert(projectToInsert).select().single();

        if (error || !newProject) {
            console.error('Error adding project:', error);
            const errorMessageStr = String(error?.message || 'Lỗi không xác định');
            const errorDetailsStr = error?.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi thêm dự án: ${errorMessageStr}${errorDetailsStr}`;
            
            if (errorMessageStr.toLowerCase().includes('security policy')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể thêm dự án. Vui lòng kiểm tra chính sách RLS trên bảng "projects" và đảm bảo quyền INSERT được bật. Tham khảo trang Hướng dẫn Cài đặt.`;
            } else if (errorMessageStr.includes("violates check constraint") && errorMessageStr.includes("total_budget_positive")) {
                 userFriendlyMessage = `Lỗi dữ liệu: Tổng ngân sách phải là một số dương.`;
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
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while adding project:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);

const addKpiEntry = useCallback(async (projectId: string, newEntryData: Omit<KpiEntry, 'id' | 'commissionStatus' | 'commissionPaidDate'>) => {
    if (!isSupabaseConfigured) return;
    try {
        const commissionStatus = newEntryData.kpiPercentage >= 75 ? CommissionStatus.Unpaid : CommissionStatus.NotApplicable;

        const entryToInsert = {
            project_id: projectId,
            contract_month: newEntryData.contractMonth,
            actual_month: newEntryData.actualMonth,
            kpi_percentage: newEntryData.kpiPercentage,
            notes: newEntryData.notes,
            report_status: newEntryData.reportStatus,
            report_sent_date: newEntryData.reportSentDate,
            commission_status: commissionStatus,
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
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while adding KPI entry:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);

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
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating KPI entry:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);


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
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating payment:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);

const updateInstallmentPayment = useCallback(async (installmentId: string, proofUrl: string) => {
    if (!isSupabaseConfigured) return;
    try {
        const { error } = await supabase
            .from('payment_installments')
            .update({ 
                status: PaymentStatus.Paid,
                payment_proof_url: proofUrl,
            })
            .match({ id: installmentId });

        if (error) {
            console.error("Error updating installment payment status:", error);
            const errorMessageStr = String(error.message || 'Lỗi không xác định.');
            const errorDetailsStr = error.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi cập nhật thanh toán đợt: ${errorMessageStr}${errorDetailsStr}`;

            if (errorMessageStr.toLowerCase().includes('security policy') || errorMessageStr.toLowerCase().includes('permission denied')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể cập nhật thanh toán. Vui lòng kiểm tra chính sách RLS trên bảng "payment_installments" và đảm bảo quyền UPDATE được bật.`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }
        addToast('Trạng thái thanh toán đợt đã được cập nhật thành công!', 'success');
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating installment payment:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);


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
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating KPI confirmation:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);

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
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating project name:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);

const updateLookerStudioUrl = useCallback(async (projectId: string, url: string | null) => {
    if (!isSupabaseConfigured) return;
    try {
        const { error } = await supabase
            .from('projects')
            .update({ looker_studio_url: url })
            .match({ id: projectId });

        if (error) {
            console.error("Error updating Looker Studio URL:", error);
            const errorMessageStr = String(error.message || 'Lỗi không xác định.');
            const errorDetailsStr = error.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi cập nhật URL báo cáo: ${errorMessageStr}${errorDetailsStr}`;

            if (errorMessageStr.toLowerCase().includes('security policy')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể cập nhật URL. Vui lòng kiểm tra chính sách RLS trên bảng "projects" và đảm bảo quyền UPDATE được bật.`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }

        addToast('URL báo cáo hiệu suất đã được cập nhật thành công!', 'success');
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating Looker Studio URL:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);

const updateKpiCommissionStatus = useCallback(async (kpiEntryId: string) => {
    if (!isSupabaseConfigured) return;
    try {
        const { error } = await supabase
            .from('kpi_entries')
            .update({
                commission_status: CommissionStatus.Paid,
                commission_paid_date: format(new Date(), 'yyyy-MM-dd'),
            })
            .match({ id: kpiEntryId });

        if (error) {
            console.error("Error updating commission status:", error);
            const errorMessageStr = String(error.message || 'Lỗi không xác định.');
            const errorDetailsStr = error.details ? ` (${error.details})` : '';
            let userFriendlyMessage = `Lỗi khi cập nhật hoa hồng: ${errorMessageStr}${errorDetailsStr}`;

            if (errorMessageStr.toLowerCase().includes('security policy')) {
                userFriendlyMessage = `Lỗi quyền truy cập: Không thể cập nhật hoa hồng. Vui lòng kiểm tra chính sách RLS trên bảng "kpi_entries".`;
            }
            addToast(userFriendlyMessage, 'error');
            return;
        }
        addToast('Trạng thái hoa hồng đã được cập nhật thành công!', 'success');
        await fetchAllData();
    } catch (err: unknown) {
        console.error('An unexpected error occurred while updating commission status:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        addToast(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`, 'error');
    }
}, [fetchAllData, isSupabaseConfigured, addToast]);


  // 1. Check Config First
  if (!isSupabaseConfigured) {
    return <SupabaseSetupInstructions />;
  }

  // 2. Check Auth State
  if (authLoading) {
      return (
          <div className="flex justify-center items-center min-h-screen">
              <div className="text-2xl font-bold text-primary">Đang tải...</div>
          </div>
      )
  }

  // 3. If no user, show Login Page or Setup Route
  if (!user) {
      return (
        <Routes>
            <Route path="/setup" element={<div className="h-screen w-full overflow-y-auto bg-light p-4"><SetupGuide /></div>} />
            <Route path="*" element={<LoginPage />} />
        </Routes>
      );
  }

  // 4. Data Loading state (after auth is confirmed)
  if (loading) {
      return (
          <div className="flex justify-center items-center min-h-screen">
              <div className="text-2xl font-bold text-primary">Đang tải dữ liệu...</div>
          </div>
      )
  }

 // 5. Data Error State
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
                        <strong>Kiểm tra chính sách RLS:</strong> Lỗi "violates row-level security policy" có nghĩa là bạn cần thiết lập các quy tắc trong Supabase để cho phép ứng dụng đọc dữ liệu từ các bảng của bạn. Hãy đảm bảo bạn có chính sách `SELECT` cho người dùng `anon` hoặc `authenticated`.
                    </li>
                     <li>
                        <strong>Kiểm tra kết nối mạng:</strong> Đảm bảo bạn có kết nối internet ổn định.
                    </li>
                </ul>
            </div>
            
            <div className="text-center">
                <button
                    onClick={fetchAllData}
                    className="mt-8 bg-primary text-white font-bold py-2 px-8 rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
                  >
                    Thử lại
                </button>
            </div>
        </div>
      </div>
    );
  }

  // 6. Main App Layout (Authenticated)
  return (
    <div className="flex h-screen bg-light text-dark font-sans">
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 sm:pb-6">
        <Routes>
          <Route path="/" element={<Dashboard projects={projects} addProject={addProject} />} />
          <Route 
            path="/project/:projectSlug" 
            element={<ProjectDetail 
              projects={projects}
              allStaff={staff}
              addKpiEntry={addKpiEntry} 
              updateMonthlyPayment={updateMonthlyPayment} 
              updateInstallmentPayment={updateInstallmentPayment}
              updateKpiEntry={updateKpiEntry} 
              updateKpiConfirmation={updateKpiConfirmation} 
              updateProjectName={updateProjectName} 
              updateLookerStudioUrl={updateLookerStudioUrl}
              updateKpiCommissionStatus={updateKpiCommissionStatus}
              fetchProjects={fetchAllData} 
            />} 
          />
          <Route path="/setup" element={<SetupGuide />} />
          <Route path="/management" element={<ManagementPage staff={staff} commissionConfigs={commissionConfigs} departments={departments} positions={positions} refetchData={fetchAllData} />} />
          <Route path="/commission-report" element={<CommissionReportPage projects={projects} staff={staff} commissionConfigs={commissionConfigs} />} />
          <Route path="/commission-payroll" element={<CommissionPayrollPage projects={projects} staff={staff} commissionConfigs={commissionConfigs} />} />
        </Routes>
      </main>
      <BottomNavBar />
    </div>
  );
};


const App: React.FC = () => (
  <HashRouter>
    <ToastProvider>
      <AuthProvider>
          <AppContent />
      </AuthProvider>
    </ToastProvider>
  </HashRouter>
);


export default App;
