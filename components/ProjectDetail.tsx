
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, KpiEntry, PaymentType, PaymentStatus, ReportStatus, Staff } from '../types';
import { ArrowLeftIcon, PencilIcon, CalendarIcon, ChartPieIcon, CashIcon, UsersIcon, SpinnerIcon } from './Icons';
import { format } from 'date-fns';
import { useToast } from '../contexts/ToastContext';
import ProgressBar from './ProgressBar';
import Button from './ui/Button';

// Imported Tabs
import KpiTab from './project-detail/KpiTab';
import AssignmentTab from './project-detail/AssignmentTab';
import ReportTab from './project-detail/ReportTab';
import PaymentTab from './project-detail/PaymentTab';
import CommissionTab from './project-detail/CommissionTab';
import PerformanceTab from './project-detail/PerformanceTab';

interface ProjectDetailProps {
  projects: Project[];
  allStaff: Staff[];
  addKpiEntry: (projectId: string, newEntryData: Omit<KpiEntry, 'id' | 'commissionStatus' | 'commissionPaidDate'>) => Promise<void>;
  updateMonthlyPayment: (monthId: string, paymentDate: string, proofUrl?: string) => Promise<void>;
  updateInstallmentPayment: (installmentId: string, paymentDate: string, proofUrl?: string) => Promise<void>;
  updateKpiEntry: (kpiEntryId: string, updates: Partial<Pick<KpiEntry, 'reportStatus' | 'reportSentDate'>>) => Promise<void>;
  updateKpiConfirmation: (kpiEntryId: string, confirmationUrl: string) => Promise<void>;
  updateProjectName: (projectId: string, newName: string) => Promise<void>;
  updateLookerStudioUrl: (projectId: string, url: string | null) => Promise<void>;
  updateKpiCommissionStatus: (kpiEntryId: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
}

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`py-3 px-5 text-base font-medium focus:outline-none transition-colors duration-200 ${
      isActive
        ? 'border-b-2 border-primary text-primary'
        : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
    role="tab"
    aria-selected={isActive}
  >
    {label}
  </button>
);

const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string;
    footerText?: string;
    progress?: number;
    progressColor?: string;
}> = ({ icon, title, value, footerText, progress, progressColor }) => (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between min-h-[140px]">
        <div>
            <div className="flex items-center text-gray-500">
                {icon}
                <span className="ml-2 text-sm font-medium">{title}</span>
            </div>
            <p className="text-2xl font-bold text-dark mt-2">{value}</p>
        </div>
        {progress !== undefined && (
            <div className="mt-4">
                 <ProgressBar progress={progress} color={progressColor} />
                <div className="flex justify-end items-center mt-1">
                    <span className="text-xs text-gray-500">{footerText}</span>
                </div>
            </div>
        )}
    </div>
);

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projects, allStaff, addKpiEntry, updateMonthlyPayment, updateInstallmentPayment, updateKpiEntry, updateKpiConfirmation, updateProjectName, updateLookerStudioUrl, updateKpiCommissionStatus, fetchProjects }) => {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const [activeTab, setActiveTab] = useState('kpi');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const { addToast } = useToast();

  const projectId = projectSlug ? projectSlug.split('--').pop() : undefined;
  const project = projects.find(p => p.id === projectId);

  const overviewStats = useMemo(() => {
    if (!project) return null;

    // 1. KPI stats
    const latestKpiByContractMonth = project.kpiEntries.reduce((acc, entry) => {
        if (!acc[entry.contractMonth] || acc[entry.contractMonth].actualMonth < entry.actualMonth) {
            acc[entry.contractMonth] = entry;
        }
        return acc;
    }, {} as Record<string, KpiEntry>);
    const latestKpiEntries = Object.values(latestKpiByContractMonth) as KpiEntry[];
    const achievedKpiMonths = latestKpiEntries.filter(entry => entry.kpiPercentage >= 75).length;
    const kpiProgressPercentage = project.durationMonths > 0 ? (achievedKpiMonths / project.durationMonths) * 100 : 0;
    const totalKpiPercentage = latestKpiEntries.reduce((sum, entry) => sum + entry.kpiPercentage, 0);
    const averageKpi = latestKpiEntries.length > 0 ? (totalKpiPercentage / latestKpiEntries.length) : 0;

    // 2. Financial stats
    let amountPaid = 0;
    if (project.paymentType === PaymentType.Milestone) {
        amountPaid = project.installments
            .filter(inst => inst.status === PaymentStatus.Paid)
            .reduce((sum, inst) => sum + (project.totalBudget * inst.paymentPercentage / 100), 0);
    } else { // Monthly
        const paidMonths = project.monthlyBreakdown.filter(m => m.paymentStatus === PaymentStatus.Paid).length;
        const monthlyRate = project.durationMonths > 0 ? project.totalBudget / project.durationMonths : 0;
        amountPaid = paidMonths * monthlyRate;
    }
    const paymentProgress = project.totalBudget > 0 ? (amountPaid / project.totalBudget) * 100 : 0;
    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

    // 3. Report stats
    const reportsSent = project.kpiEntries.filter(e => e.reportStatus === ReportStatus.Sent).length;
    const confirmationsReceived = project.kpiEntries.filter(e => !!e.customerConfirmationUrl).length;
    const totalKpiEntries = project.kpiEntries.length;

    return {
        kpi: {
            progress: kpiProgressPercentage,
            value: `${averageKpi.toFixed(0)}%`,
            footer: `${achievedKpiMonths}/${project.durationMonths} tháng đạt`,
        },
        financial: {
            progress: paymentProgress,
            value: formatCurrency(amountPaid),
            footer: `trên ${formatCurrency(project.totalBudget)}`,
        },
        report: {
            reportsSent: `${reportsSent}/${totalKpiEntries}`,
            confirmations: `${confirmationsReceived}/${reportsSent}`,
        },
    };
  }, [project]);

  React.useEffect(() => {
    if (project) {
        setEditedName(project.name);
    }
  }, [project]);

  if (!project) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Không tìm thấy dự án</h2>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">
          <ArrowLeftIcon className="h-4 w-4 mr-2 inline"/>Quay lại Danh sách dự án
        </Link>
      </div>
    );
  }

  const handleStartEdit = () => {
    if (project) {
        setEditedName(project.name);
        setIsEditingName(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    if(project) {
        setEditedName(project.name);
    }
  };

  const handleSaveName = async () => {
    if (!project || !editedName.trim()) {
        addToast("Tên dự án không được để trống.", 'error');
        return;
    }
    if (editedName.trim() === project.name) {
        setIsEditingName(false);
        return;
    }
    
    setIsSavingName(true);
    await updateProjectName(project.id, editedName.trim());
    setIsSavingName(false);
    setIsEditingName(false);
  };

  const TABS_ORDER = ['kpi', 'report', 'payment', 'commission', 'assignment'];
  
  const TABS = {
      kpi: { label: 'Quản lý KPI', component: <KpiTab project={project} addKpiEntry={addKpiEntry} /> },
      assignment: { label: 'Phân công', component: <AssignmentTab project={project} allStaff={allStaff} refetchData={fetchProjects} /> },
      report: { label: 'Quản lý báo cáo', component: <ReportTab project={project} updateKpiEntry={updateKpiEntry} updateKpiConfirmation={updateKpiConfirmation} /> },
      payment: { label: 'Quản lý thanh toán', component: <PaymentTab project={project} updateMonthlyPayment={updateMonthlyPayment} updateInstallmentPayment={updateInstallmentPayment} fetchProjects={fetchProjects} /> },
      commission: { label: 'Quản lý hoa hồng', component: <CommissionTab project={project} updateKpiCommissionStatus={updateKpiCommissionStatus} /> },
      performance: { label: 'Theo dõi hiệu suất', component: <PerformanceTab project={project} updateLookerStudioUrl={updateLookerStudioUrl} /> }
  };

  return (
    <div className="container mx-auto">
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center text-gray-500 hover:text-primary transition-colors font-medium text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Quay lại Danh sách dự án
        </Link>
      </div>
      <div className="flex items-center gap-3 mb-6">
        {!isEditingName ? (
            <>
                <h1 className="text-3xl font-bold text-dark">{project.name}</h1>
                <button onClick={handleStartEdit} className="text-gray-500 hover:text-primary transition-colors p-1 rounded-full" title="Chỉnh sửa tên dự án">
                    <PencilIcon className="h-5 w-5" />
                </button>
            </>
        ) : (
            <div className="flex items-center gap-2 w-full max-w-md">
                <input 
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="block w-full px-3 py-2 text-2xl font-bold border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                disabled={isSavingName}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelEdit(); }}
                />
                <Button onClick={handleSaveName} isLoading={isSavingName}>Lưu</Button>
                <Button variant="secondary" onClick={handleCancelEdit} disabled={isSavingName}>Hủy</Button>
            </div>
        )}
      </div>

      {overviewStats && (
        <div className="my-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between min-h-[140px]">
                <div>
                    <div className="flex items-center text-gray-500">
                        <CalendarIcon className="h-6 w-6 text-indigo-500" />
                        <span className="ml-2 text-sm font-medium">Thông tin chung & Thời gian</span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-dark">
                        <p><span className="font-semibold text-gray-600">Khách hàng:</span> {project.client}</p>
                        <p><span className="font-semibold text-gray-600">Bắt đầu:</span> {format(new Date(project.startDate), 'dd/MM/yyyy')}</p>
                        <p><span className="font-semibold text-gray-600">Kết thúc:</span> {format(new Date(project.endDate), 'dd/MM/yyyy')}</p>
                    </div>
                </div>
            </div>
            <StatCard
                icon={<ChartPieIcon className="h-6 w-6 text-accent" />}
                title="KPI Trung bình"
                value={overviewStats.kpi.value}
                progress={overviewStats.kpi.progress}
                footerText={overviewStats.kpi.footer}
                progressColor="bg-accent"
            />
            <StatCard
                icon={<CashIcon className="h-6 w-6 text-green-500" />}
                title="Đã thanh toán"
                value={overviewStats.financial.value}
                progress={overviewStats.financial.progress}
                footerText={overviewStats.financial.footer}
                progressColor="bg-green-500"
            />
             <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between min-h-[140px]">
                 <div>
                    <div className="flex items-center text-gray-500">
                       <UsersIcon className="h-6 w-6 text-blue-500" />
                       <span className="ml-2 text-sm font-medium">Phụ trách</span>
                    </div>
                    <div className="mt-3 space-y-2">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-gray-600">Tổng nhân sự:</span>
                            <span className="text-lg font-bold text-dark">{project.assignments.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      <div role="tablist" className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto">
            {TABS_ORDER.map(key => (
                 <TabButton key={key} label={TABS[key as keyof typeof TABS].label} isActive={activeTab === key} onClick={() => setActiveTab(key)} />
            ))}
        </nav>
      </div>

      <div className="mt-6" role="tabpanel">
        {TABS[activeTab as keyof typeof TABS].component}
      </div>
    </div>
  );
};

export default ProjectDetail;
