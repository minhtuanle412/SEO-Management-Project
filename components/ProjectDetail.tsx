
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, MonthlyProgress, PaymentStatus, ReportStatus, KpiEntry, PaymentType, PaymentInstallment, CommissionStatus, Staff } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, SpinnerIcon, DocumentTextIcon, UploadIcon, EyeIcon, PencilIcon, XIcon, PlusIcon, CalendarIcon, ChartPieIcon, CashIcon, UsersIcon } from './Icons';
// Fix: Removed `parseISO` from date-fns import as it was causing an error. Using `new Date()` instead for consistency.
import { format, addMonths } from 'date-fns';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabaseClient';
import ImagePreviewModal from './ImagePreviewModal';
import ProgressBar from './ProgressBar';


interface ProjectDetailProps {
  projects: Project[];
  allStaff: Staff[];
  addKpiEntry: (projectId: string, newEntryData: Omit<KpiEntry, 'id' | 'commissionStatus' | 'commissionPaidDate'>) => Promise<void>;
  updateMonthlyPayment: (monthId: string, proofUrl: string) => Promise<void>;
  updateInstallmentPayment: (installmentId: string, proofUrl: string) => Promise<void>;
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

const AssignmentManagementView: React.FC<{ project: Project; allStaff: Staff[]; refetchData: () => Promise<void> }> = ({ project, allStaff, refetchData }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const assignedStaffIds = useMemo(() => new Set(project.assignments.map(a => a.nhan_su_id)), [project.assignments]);
    const unassignedStaff = useMemo(() => allStaff.filter(s => !assignedStaffIds.has(s.id)), [allStaff, assignedStaffIds]);

    const handleAddAssignment = async () => {
        if (!selectedStaffId) {
            addToast('Vui lòng chọn một nhân sự.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('phan_cong_du_an').insert({
                project_id: project.id,
                nhan_su_id: selectedStaffId
            });
            if (error) throw error;
            addToast('Phân công nhân sự thành công!', 'success');
            await refetchData();
            setIsAdding(false);
            setSelectedStaffId('');
        } catch (error: any) {
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phân công này?')) return;
        try {
            const { error } = await supabase.from('phan_cong_du_an').delete().match({ id: assignmentId });
            if (error) throw error;
            addToast('Đã xóa phân công.', 'success');
            await refetchData();
        } catch (error: any) {
            addToast(`Lỗi: ${error.message}`, 'error');
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-dark">Nhân sự phụ trách</h2>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Thêm phân công
                    </button>
                )}
            </div>
            
            {isAdding && (
                <div className="p-4 border rounded-lg bg-gray-50 mb-6 flex items-end gap-4">
                    <div className="flex-grow">
                        <label htmlFor="staff-select" className="block text-sm font-medium text-gray-700">Chọn nhân sự</label>
                        <select
                            id="staff-select"
                            value={selectedStaffId}
                            onChange={e => setSelectedStaffId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            disabled={isSubmitting}
                        >
                            <option value="">-- Chọn nhân sự --</option>
                            {unassignedStaff.map(staff => (
                                <option key={staff.id} value={staff.id}>{staff.ho_ten} ({staff.chuc_vu.name})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-shrink-0 flex gap-2">
                        <button onClick={handleAddAssignment} disabled={isSubmitting} className="bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-300">
                            {isSubmitting ? <SpinnerIcon className="h-5 w-5" /> : 'Lưu'}
                        </button>
                        <button onClick={() => setIsAdding(false)} disabled={isSubmitting} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
                            Hủy
                        </button>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {project.assignments.length > 0 ? (
                    project.assignments.map(assignment => (
                        <div key={assignment.id} className="relative group bg-light p-4 rounded-lg border border-gray-200 text-center">
                            <h4 className="font-bold text-dark">{assignment.nhan_su.ho_ten}</h4>
                            <p className="text-sm text-gray-500">{assignment.nhan_su.chuc_vu.name}</p>
                            <p className="text-xs font-semibold text-primary mt-1">{assignment.nhan_su.phong_ban.name}</p>
                            <button onClick={() => handleRemoveAssignment(assignment.id)} className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        Chưa có nhân sự nào được phân công cho dự án này.
                    </div>
                )}
            </div>
        </div>
    );
};

const KpiManagementView: React.FC<{ project: Project; addKpiEntry: (projectId: string, entry: Omit<KpiEntry, 'id' | 'commissionStatus' | 'commissionPaidDate'>) => Promise<void> }> = ({ project, addKpiEntry }) => {
    const [contractMonth, setContractMonth] = useState('');
    const [actualMonth, setActualMonth] = useState('');
    const [kpiRate, setKpiRate] = useState('');
    const [notes, setNotes] = useState('');
    const [sendReport, setSendReport] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const handleAddKpi = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const monthNum = parseInt(contractMonth, 10);
        const rate = parseInt(kpiRate, 10);

        if (isNaN(monthNum) || monthNum < 1 || monthNum > project.durationMonths || !actualMonth || isNaN(rate) || rate < 0 || rate > 100) {
            addToast('Vui lòng nhập thông tin hợp lệ cho tất cả các trường.', 'error');
            return;
        }

        setIsSubmitting(true);
        const newKpiEntry: Omit<KpiEntry, 'id' | 'commissionStatus' | 'commissionPaidDate'> = {
            contractMonth: monthNum,
            actualMonth: `${actualMonth}-01`, // Fix: Ensure date is in YYYY-MM-DD format for Supabase
            kpiPercentage: rate,
            notes: notes,
            reportStatus: sendReport ? ReportStatus.Sent : ReportStatus.NotSent,
            reportSentDate: sendReport ? format(new Date(), 'yyyy-MM-dd') : undefined,
            customerConfirmationUrl: undefined,
        };

        await addKpiEntry(project.id, newKpiEntry);
        
        // UX Improvement: Auto-increment month fields for faster data entry
        const nextContractMonth = monthNum + 1;
        if (nextContractMonth <= project.durationMonths) {
            setContractMonth(String(nextContractMonth));
            const [year, month] = actualMonth.split('-').map(Number);
            const currentActualDate = new Date(year, month - 1, 1);
            const nextActualMonthDate = addMonths(currentActualDate, 1);
            setActualMonth(format(nextActualMonthDate, 'yyyy-MM'));
        } else {
            setContractMonth('');
            setActualMonth('');
        }

        setKpiRate('');
        setNotes('');
        setSendReport(false);
        setIsSubmitting(false);
    }, [contractMonth, actualMonth, kpiRate, notes, sendReport, project, addKpiEntry, addToast]);

    const kpiEntriesSorted = [...project.kpiEntries].sort((a, b) => b.actualMonth.localeCompare(a.actualMonth) || a.contractMonth - b.contractMonth);
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-dark mb-4">Chi tiết từng tháng hợp đồng:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {project.monthlyBreakdown.sort((a, b) => a.month - b.month).map(monthData => {
                        const relevantKpis = project.kpiEntries.filter(k => k.contractMonth === monthData.month);
                        const hasData = relevantKpis.length > 0;
                        let latestKpi: KpiEntry | null = null;
                        
                        if (hasData) {
                            relevantKpis.sort((a, b) => b.actualMonth.localeCompare(a.actualMonth));
                            latestKpi = relevantKpis[0];
                        }

                        const isAchieved = hasData && latestKpi && latestKpi.kpiPercentage >= 75;

                        // Determine payment status for both Monthly and Milestone projects
                        const isPaid = (() => {
                            if (project.paymentType === PaymentType.Monthly) {
                                return monthData.paymentStatus === PaymentStatus.Paid;
                            }
                            if (project.paymentType === PaymentType.Milestone && monthData.installmentId) {
                                const parentInstallment = project.installments.find(inst => inst.id === monthData.installmentId);
                                return parentInstallment?.status === PaymentStatus.Paid;
                            }
                            return false;
                        })();

                        let cardClasses = 'border rounded-lg p-3 text-center flex flex-col justify-between items-center h-44 transition-all duration-200 ';
                        let statusContent = null;

                        if (isAchieved) {
                            cardClasses += 'bg-green-50 border-green-300';
                            statusContent = (
                                <>
                                    <p className="text-2xl font-bold text-green-800 my-1">{latestKpi!.kpiPercentage}%</p>
                                    <CheckCircleIcon className="h-6 w-6 text-green-500 mt-1 mx-auto" />
                                </>
                            );
                        } else if (hasData) {
                            cardClasses += 'bg-orange-50 border-orange-400';
                            statusContent = (
                                <>
                                    <p className="text-2xl font-bold text-orange-800 my-1">{latestKpi!.kpiPercentage}%</p>
                                    <p className="text-xs font-semibold text-orange-600 mt-1">Chưa đạt</p>
                                </>
                            );
                        } else {
                            cardClasses += 'bg-gray-100 border-gray-200';
                            statusContent = <p className="text-sm text-gray-500 mt-1">Chưa có KPI</p>;
                        }

                        return (
                            <div key={monthData.month} className={cardClasses}>
                                <div>
                                    <p className="font-bold text-base text-slate-700">T{monthData.month}</p>
                                    {statusContent}
                                </div>
                                <div className="pt-2 flex flex-col items-center space-y-1">
                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${isPaid ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                        {isPaid ? 'Đã TT' : 'Chưa TT'}
                                    </span>
                                    {latestKpi && latestKpi.commissionStatus !== CommissionStatus.NotApplicable && (
                                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${
                                            latestKpi.commissionStatus === CommissionStatus.Paid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {latestKpi.commissionStatus === CommissionStatus.Paid ? 'HH Đã trả' : 'HH Chưa trả'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-dark">Thêm KPI tháng mới</h2>
                <form onSubmit={handleAddKpi}>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-grow" style={{minWidth: '120px'}}>
                            <label htmlFor="contractMonth" className="block text-sm font-medium text-gray-700">Tháng hợp đồng</label>
                            <input type="number" id="contractMonth" value={contractMonth} onChange={e => setContractMonth(e.target.value)} placeholder="VD: 1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" disabled={isSubmitting}/>
                        </div>
                        <div className="flex-grow" style={{minWidth: '150px'}}>
                            <label htmlFor="actualMonth" className="block text-sm font-medium text-gray-700">Tháng thực tế (YYYY-MM)</label>
                            <input type="month" id="actualMonth" value={actualMonth} onChange={e => setActualMonth(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" disabled={isSubmitting}/>
                        </div>
                        <div className="flex-grow" style={{minWidth: '120px'}}>
                            <label htmlFor="kpiRate" className="block text-sm font-medium text-gray-700">Tỷ lệ đạt KPI (%)</label>
                            <input type="number" id="kpiRate" value={kpiRate} onChange={e => setKpiRate(e.target.value)} placeholder="VD: 85" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" min="0" max="100" disabled={isSubmitting}/>
                        </div>
                         <div className="flex-grow" style={{minWidth: '180px'}}>
                            <label htmlFor="kpiNotes" className="block text-sm font-medium text-gray-700">Ghi chú</label>
                            <input type="text" id="kpiNotes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="VD: Đẩy mạnh keyword top 10" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" disabled={isSubmitting}/>
                        </div>
                        <div className="flex-shrink-0">
                            <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 w-full sm:w-auto disabled:bg-blue-300" disabled={isSubmitting}>
                                {isSubmitting ? <SpinnerIcon className="h-5 w-5" /> : 'Thêm KPI'}
                            </button>
                        </div>
                    </div>
                     <div className="mt-4 flex items-center">
                        <input id="sendReport" name="sendReport" type="checkbox" checked={sendReport} onChange={e => setSendReport(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" disabled={isSubmitting}/>
                        <label htmlFor="sendReport" className="ml-2 block text-sm text-gray-900">Đã gửi báo cáo (sẽ tự điền ngày hôm nay)</label>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng HĐ</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng Tế</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tỷ lệ đạt KPI</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái Báo cáo</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái HH</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">KH Confirm</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {kpiEntriesSorted.length > 0 ? (
                                kpiEntriesSorted.map(kpiEntry => (
                                    <tr key={kpiEntry.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tháng {kpiEntry.contractMonth}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(kpiEntry.actualMonth), 'MM/yyyy')}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-primary">{kpiEntry.kpiPercentage}%</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${kpiEntry.reportStatus === ReportStatus.Sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{kpiEntry.reportStatus}</span></td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                kpiEntry.commissionStatus === CommissionStatus.Paid ? 'bg-green-100 text-green-800' :
                                                kpiEntry.commissionStatus === CommissionStatus.Unpaid ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {kpiEntry.commissionStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            {kpiEntry.customerConfirmationUrl ? (
                                                <a 
                                                    href={kpiEntry.customerConfirmationUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center text-green-600 hover:text-green-800 font-semibold group"
                                                    title="Xem xác nhận"
                                                >
                                                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                                                    <span className="group-hover:underline">Đã xác nhận</span>
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">Chưa có</span>
                                            )}
                                        </td>
                                    </tr>
                                    )
                                )
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">Chưa có dữ liệu KPI nào được thêm.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const CommissionManagementView: React.FC<{
  project: Project;
  updateKpiCommissionStatus: (kpiEntryId: string) => Promise<void>;
}> = ({ project, updateKpiCommissionStatus }) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const eligibleKpiEntries = useMemo(() => {
    return [...project.kpiEntries]
      .filter(entry => entry.kpiPercentage >= 75)
      .sort((a, b) => a.contractMonth - b.contractMonth || b.actualMonth.localeCompare(a.actualMonth));
  }, [project.kpiEntries]);

  const handleUpdateStatus = async (kpiEntryId: string) => {
    setUpdatingId(kpiEntryId);
    await updateKpiCommissionStatus(kpiEntryId);
    setUpdatingId(null);
  };

  if (eligibleKpiEntries.length === 0) {
    return (
      <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-200 text-center">
        <h3 className="text-xl font-semibold text-dark">Chưa có tháng nào đủ điều kiện</h3>
        <p className="text-gray-500 mt-2">
          Hoa hồng chỉ được áp dụng cho các tháng có tỷ lệ KPI đạt từ 75% trở lên.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng HĐ</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng Thực tế</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tỷ lệ KPI</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái HH</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày chi trả</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {eligibleKpiEntries.map(kpiEntry => {
              const isPaid = kpiEntry.commissionStatus === CommissionStatus.Paid;
              const isUpdating = updatingId === kpiEntry.id;
              return (
                <tr key={kpiEntry.id}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tháng {kpiEntry.contractMonth}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(kpiEntry.actualMonth), 'MM/yyyy')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-primary">{kpiEntry.kpiPercentage}%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {kpiEntry.commissionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {kpiEntry.commissionPaidDate ? format(new Date(kpiEntry.commissionPaidDate), 'dd/MM/yyyy') : '–'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    {isPaid ? (
                      <span className="flex items-center justify-center text-green-600 font-semibold">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Đã chi trả
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(kpiEntry.id)}
                        disabled={isUpdating}
                        className="bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 w-full max-w-[180px] mx-auto flex items-center justify-center disabled:bg-blue-300"
                      >
                        {isUpdating ? <SpinnerIcon className="h-5 w-5 mr-2" /> : <CashIcon className="h-5 w-5 mr-2" />}
                        {isUpdating ? 'Đang xử lý...' : 'Đánh dấu đã trả HH'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const PaymentManagementView: React.FC<{ project: Project; updateMonthlyPayment: ProjectDetailProps['updateMonthlyPayment']; updateInstallmentPayment: ProjectDetailProps['updateInstallmentPayment']; fetchProjects: ProjectDetailProps['fetchProjects'] }> = ({ project, updateMonthlyPayment, updateInstallmentPayment, fetchProjects }) => {
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'month' | 'installment' } | null>(null);
    const [uploadError, setUploadError] = useState<React.ReactNode | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    const handleInitiateMonthUpload = (month: MonthlyProgress) => {
        if (month.paymentStatus === PaymentStatus.Unpaid) {
            setSelectedItem({ id: month.id, type: 'month' });
            setUploadError(null); 
            fileInputRef.current?.click();
        }
    };
    
    const handleInitiateInstallmentUpload = (installment: PaymentInstallment) => {
        if (installment.status === PaymentStatus.Unpaid) {
            setSelectedItem({ id: installment.id, type: 'installment' });
            setUploadError(null); 
            fileInputRef.current?.click();
        }
    };


    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedItem) {
            return;
        }

        const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!acceptedImageTypes.includes(file.type)) {
            addToast('Vui lòng chọn một file hình ảnh (JPEG, PNG, GIF, WEBP).', 'error');
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUpdatingItemId(selectedItem.id);
        setUploadError(null);

        try {
            const fileExtension = file.name.split('.').pop();
            const subFolder = selectedItem.type === 'installment' ? 'installments' : 'monthly';
            const filePath = `${project.id}/${subFolder}/${selectedItem.id}-${Date.now()}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from('payment_proofs')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from('payment_proofs')
                .getPublicUrl(filePath);
            
            if (!urlData?.publicUrl) {
                    throw new Error('Không thể lấy URL công khai cho tệp đã tải lên.');
            }
            
            if (selectedItem.type === 'installment') {
                await updateInstallmentPayment(selectedItem.id, urlData.publicUrl);
            } else {
                await updateMonthlyPayment(selectedItem.id, urlData.publicUrl);
            }
            
        } catch (error: any) {
            console.error("Payment proof upload failed:", error);
            const errorMessage = error.message ? error.message.toLowerCase() : '';
            let userFriendlyError: React.ReactNode = (
                <span>
                    Tải lên chứng từ thất bại: {error.message || 'Lỗi không xác định'}. Vui lòng thử lại.
                </span>
            );

            if (errorMessage.includes('bucket not found')) {
                userFriendlyError = (
                    <span>
                        <strong>Lỗi Cài Đặt Lưu Trữ:</strong> Bucket "payment_proofs" chưa được tạo trên Supabase. 
                        Đây là một bước cài đặt bắt buộc. Vui lòng làm theo hướng dẫn tại <Link to="/setup" className="font-bold underline hover:text-red-900">Trang Hướng Dẫn Cài Đặt</Link> để tạo bucket.
                    </span>
                );
            } else if (errorMessage.includes('security policy') || errorMessage.includes('rls') || errorMessage.includes('new row violates')) {
                 userFriendlyError = (
                    <span>
                        <strong>Lỗi Quyền Truy Cập:</strong> Không thể tải tệp lên do chính sách bảo mật của bucket. 
                        Vui lòng làm theo hướng dẫn tại <Link to="/setup" className="font-bold underline hover:text-red-900">Trang Hướng Dẫn Cài Đặt</Link> để cấu hình Policies cho Storage.
                    </span>
                );
            }
            
            setUploadError(userFriendlyError);
            addToast('Tải lên thất bại. Vui lòng xem chi tiết lỗi.', 'error');

        } finally {
            setUpdatingItemId(null);
            setSelectedItem(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Reset file input
            }
        }
    };

    if (project.paymentType === PaymentType.Milestone) {
        const getAssignedMonths = (installmentId: string) => {
            return project.monthlyBreakdown
                .filter(m => m.installmentId === installmentId)
                .map(m => `T${m.month}`)
                .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
                .join(', ');
        };

        return (
            <>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept="image/png, image/jpeg, image/gif, image/webp"
                    />
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                        <h2 className="text-xl font-bold text-dark">Các đợt thanh toán</h2>
                        <button onClick={() => setIsManageModalOpen(true)} className="flex items-center bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Quản lý các đợt
                        </button>
                    </div>

                    {uploadError && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg" role="alert">
                            <h3 className="font-bold text-lg mb-2">Không thể tải lên chứng từ</h3>
                            <div className="text-sm">{uploadError}</div>
                        </div>
                    )}
                    
                    {project.installments.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {project.installments.sort((a,b) => a.name.localeCompare(b.name)).map(installment => {
                                const amount = (project.totalBudget * installment.paymentPercentage) / 100;
                                const isPaid = installment.status === PaymentStatus.Paid;
                                const isUpdating = updatingItemId === installment.id;
                                const assignedMonthsText = getAssignedMonths(installment.id);

                                return (
                                    <div key={installment.id} className={`border rounded-lg p-4 flex flex-col justify-between text-center min-h-[240px] transition-shadow hover:shadow-md ${isPaid ? 'bg-green-50' : 'bg-white'}`}>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-700">{installment.name}</h4>
                                            <p className="text-sm font-semibold text-gray-500 mb-2">({installment.paymentPercentage}%)</p>
                                            
                                            <span className={`px-3 py-1 mb-3 inline-flex text-sm leading-5 font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {installment.status}
                                            </span>

                                            <p className="text-primary font-semibold text-xl my-2">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)}</p>
                                            
                                            <p className="text-xs text-gray-500 mt-1 h-8"> {/* Fixed height to prevent layout shift */}
                                                {assignedMonthsText ? `Áp dụng: ${assignedMonthsText}` : 'Chưa gán tháng'}
                                            </p>
                                        </div>
                                        
                                        <div className="w-full mt-auto pt-3">
                                            {isUpdating ? (
                                                <button className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-gray-200 text-gray-500 cursor-wait" disabled>
                                                    <SpinnerIcon className="h-5 w-5 mr-2" />
                                                    Đang xử lý...
                                                </button>
                                            ) : isPaid && installment.paymentProofUrl ? (
                                                <button 
                                                    onClick={() => setPreviewImageUrl(installment.paymentProofUrl!)}
                                                    className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                >
                                                    <EyeIcon className="h-5 w-5 mr-2" />
                                                    Xem chứng từ
                                                </button>
                                            ) : isPaid && !installment.paymentProofUrl ? (
                                                <p className="text-sm text-gray-500">Đã TT (không có CT)</p>
                                            ) : (
                                                <button 
                                                    onClick={() => handleInitiateInstallmentUpload(installment)}
                                                    className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-primary text-white hover:bg-blue-700"
                                                >
                                                    <UploadIcon className="h-5 w-5 mr-2" />
                                                    Đánh dấu Đã TT
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-gray-500">Chưa có đợt thanh toán nào được thiết lập.</p>
                            <button onClick={() => setIsManageModalOpen(true)} className="mt-4 bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300">
                                Thiết lập ngay
                            </button>
                        </div>
                    )}
                </div>
                <ManageInstallmentsModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    project={project}
                    fetchProjects={fetchProjects}
                />
            </>
        )
    }


    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept="image/png, image/jpeg, image/gif, image/webp"
                />
                <h2 className="text-xl font-bold text-dark mb-4">Tình trạng thanh toán theo tháng</h2>

                {uploadError && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg" role="alert">
                        <h3 className="font-bold text-lg mb-2">Không thể tải lên chứng từ</h3>
                        <div className="text-sm">{uploadError}</div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {project.monthlyBreakdown.sort((a,b) => a.month - b.month).map(month => {
                        const isPaid = month.paymentStatus === PaymentStatus.Paid;
                        const isUpdating = updatingItemId === month.id;
                        const hasProof = !!month.paymentProofUrl;
                        const monthlyAmount = project.durationMonths > 0 ? project.totalBudget / project.durationMonths : 0;

                        return (
                            <div key={month.id} className={`border rounded-lg p-4 flex flex-col justify-between text-center min-h-[200px] transition-shadow hover:shadow-md ${isPaid ? 'bg-green-50' : 'bg-white'}`}>
                                <div>
                                    <p className="font-bold text-lg text-slate-700">Tháng {month.month}</p>
                                    <p className="text-primary font-semibold text-lg my-2">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(monthlyAmount)}</p>
                                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {month.paymentStatus}
                                    </span>
                                </div>
                                
                                <div className="w-full mt-auto pt-3">
                                    {isUpdating ? (
                                        <button className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-gray-200 text-gray-500 cursor-wait" disabled>
                                            <SpinnerIcon className="h-5 w-5 mr-2" />
                                            Đang xử lý...
                                        </button>
                                    ) : isPaid && hasProof ? (
                                        <button 
                                            onClick={() => setPreviewImageUrl(month.paymentProofUrl!)}
                                            className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-blue-100 text-blue-800 hover:bg-blue-200"
                                        >
                                            <EyeIcon className="h-5 w-5 mr-2" />
                                            Xem chứng từ
                                        </button>
                                    ) : isPaid && !hasProof ? (
                                        <p className="text-sm text-gray-500">Đã TT (không có CT)</p>
                                    ) : (
                                        <button 
                                            onClick={() => handleInitiateMonthUpload(month)}
                                            className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-primary text-white hover:bg-blue-700"
                                        >
                                            <UploadIcon className="h-5 w-5 mr-2" />
                                            Đánh dấu Đã TT
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <ImagePreviewModal isOpen={!!previewImageUrl} imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
        </>
    );
};

const ReportManagementView: React.FC<{ project: Project; updateKpiEntry: ProjectDetailProps['updateKpiEntry']; updateKpiConfirmation: ProjectDetailProps['updateKpiConfirmation'] }> = ({ project, updateKpiEntry, updateKpiConfirmation }) => {
  const [updatingStatusKpiId, setUpdatingStatusKpiId] = useState<string | null>(null);
  const [uploadingConfirmationKpiId, setUploadingConfirmationKpiId] = useState<string | null>(null);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<React.ReactNode | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleMarkReportAsSent = async (kpiEntry: KpiEntry) => {
    if (kpiEntry.reportStatus === ReportStatus.Sent) return;
    setUpdatingStatusKpiId(kpiEntry.id);
    await updateKpiEntry(kpiEntry.id, { 
        reportStatus: ReportStatus.Sent, 
        reportSentDate: format(new Date(), 'yyyy-MM-dd') 
    });
    setUpdatingStatusKpiId(null);
  };

  const handleInitiateConfirmationUpload = (kpiEntry: KpiEntry) => {
    setSelectedKpiId(kpiEntry.id);
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleConfirmationFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedKpiId) return;

    const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!acceptedImageTypes.includes(file.type)) {
        addToast('Vui lòng chọn một file hình ảnh (JPEG, PNG, GIF, WEBP).', 'error');
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    setUploadingConfirmationKpiId(selectedKpiId);
    setUploadError(null);

    try {
        const fileExtension = file.name.split('.').pop();
        const filePath = `${project.id}/confirmations/${selectedKpiId}-${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
            .from('confirmation_proofs')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('confirmation_proofs')
            .getPublicUrl(filePath);
        
        if (!urlData?.publicUrl) {
            throw new Error('Không thể lấy URL công khai cho tệp đã tải lên.');
        }

        await updateKpiConfirmation(selectedKpiId, urlData.publicUrl);
        
    } catch (error: any) {
        console.error("Confirmation proof upload failed:", error);
        const errorMessage = error.message ? error.message.toLowerCase() : '';
        let userFriendlyError: React.ReactNode = (
            <span>Tải lên xác nhận thất bại: {error.message || 'Lỗi không xác định'}. Vui lòng thử lại.</span>
        );

        if (errorMessage.includes('bucket not found')) {
            userFriendlyError = (
                <span>
                    <strong>Lỗi Cài Đặt Lưu Trữ:</strong> Bucket "confirmation_proofs" chưa được tạo. 
                    Vui lòng làm theo hướng dẫn tại <Link to="/setup" className="font-bold underline hover:text-red-900">Trang Hướng Dẫn Cài Đặt</Link> để tạo bucket.
                </span>
            );
        } else if (errorMessage.includes('security policy') || errorMessage.includes('rls')) {
            userFriendlyError = (
                <span>
                    <strong>Lỗi Quyền Truy Cập:</strong> Không thể tải tệp lên do chính sách bảo mật. 
                    Vui lòng làm theo hướng dẫn tại <Link to="/setup" className="font-bold underline hover:text-red-900">Trang Hướng Dẫn Cài Đặt</Link> để cấu hình Policies cho Storage.
                </span>
            );
        }
        
        setUploadError(userFriendlyError);
        addToast('Tải lên thất bại. Vui lòng xem chi tiết lỗi.', 'error');
    } finally {
        setUploadingConfirmationKpiId(null);
        setSelectedKpiId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };
  
  const sortedKpiEntries = [...project.kpiEntries].sort((a, b) => b.actualMonth.localeCompare(a.actualMonth) || a.contractMonth - b.contractMonth);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleConfirmationFileChange}
          style={{ display: 'none' }}
          accept="image/png, image/jpeg, image/gif, image/webp"
        />
        <h2 className="text-xl font-bold text-dark mb-4">Quản lý gửi báo cáo & xác nhận</h2>
        
        {uploadError && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg" role="alert">
                <h3 className="font-bold text-lg mb-2">Không thể tải lên xác nhận</h3>
                <div className="text-sm">{uploadError}</div>
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng HĐ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">KPI / Tháng Thực Tế</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng Thái Báo Cáo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày Gửi</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Hành Động</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng confirm</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedKpiEntries.length > 0 ? (
                sortedKpiEntries.map(kpiEntry => {
                  const isUpdatingStatus = updatingStatusKpiId === kpiEntry.id;
                  const isUploadingConfirmation = uploadingConfirmationKpiId === kpiEntry.id;

                  return (
                    <tr key={kpiEntry.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tháng {kpiEntry.contractMonth}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {`${kpiEntry.kpiPercentage}% (${format(new Date(kpiEntry.actualMonth), 'MM/yyyy')})`}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${kpiEntry.reportStatus === ReportStatus.Sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{kpiEntry.reportStatus}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {kpiEntry.reportSentDate ? format(new Date(kpiEntry.reportSentDate), 'dd/MM/yyyy') : '–'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => handleMarkReportAsSent(kpiEntry)}
                          disabled={isUpdatingStatus || kpiEntry.reportStatus === ReportStatus.Sent}
                          className="text-primary hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold flex items-center justify-center mx-auto"
                        >
                          {isUpdatingStatus ? <SpinnerIcon className="h-5 w-5"/> : (kpiEntry.reportStatus === ReportStatus.Sent ? <><CheckCircleIcon className="h-5 w-5 mr-2" /><span>Đã gửi</span></> : <><DocumentTextIcon className="h-5 w-5 mr-2" /><span>Đánh dấu đã gửi</span></>)}
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {isUploadingConfirmation ? (
                          <button className="font-medium py-2 px-4 rounded-md flex items-center justify-center text-gray-500 cursor-wait w-full max-w-[150px] mx-auto" disabled>
                              <SpinnerIcon className="h-5 w-5 mr-2" />
                              Đang xử lý...
                          </button>
                        ) : kpiEntry.customerConfirmationUrl ? (
                            <button
                                onClick={() => setPreviewImageUrl(kpiEntry.customerConfirmationUrl!)}
                                className="font-medium py-2 px-4 rounded-md flex items-center justify-center bg-blue-100 text-blue-800 hover:bg-blue-200 w-full max-w-[150px] mx-auto"
                            >
                                <EyeIcon className="h-5 w-5 mr-2" />
                                Xem C.Nhận
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleInitiateConfirmationUpload(kpiEntry)}
                                className="font-medium py-2 px-4 rounded-md flex items-center justify-center bg-accent text-white hover:bg-amber-600 w-full max-w-[150px] mx-auto"
                            >
                                <UploadIcon className="h-5 w-5 mr-2" />
                                Tải lên C.N
                            </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    Chưa có báo cáo nào được thêm. Thêm một mục KPI mới để theo dõi báo cáo tại đây.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ImagePreviewModal isOpen={!!previewImageUrl} imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </>
  );
};

const ManageInstallmentsModal: React.FC<{isOpen: boolean; onClose: () => void; project: Project; fetchProjects: () => void}> = ({ isOpen, onClose, project, fetchProjects }) => {
    const [name, setName] = useState('');
    const [percentage, setPercentage] = useState<number | ''>('');
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const unassignedMonths = useMemo(() => {
        return project.monthlyBreakdown.filter(m => !m.installmentId);
    }, [project.monthlyBreakdown]);

    const currentTotalPercentage = useMemo(() => {
        return project.installments.reduce((sum, inst) => sum + inst.paymentPercentage, 0);
    }, [project.installments]);

    const resetForm = () => {
        setName('');
        setPercentage('');
        setSelectedMonths([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericPercentage = Number(percentage);

        if (!name.trim() || !percentage || numericPercentage <= 0 || numericPercentage > 100) {
            addToast('Tên đợt và tỷ lệ % phải hợp lệ.', 'error');
            return;
        }

        if (currentTotalPercentage + numericPercentage > 100) {
            addToast(`Tổng tỷ lệ các đợt không được vượt quá 100%. Hiện tại là ${currentTotalPercentage}%.`, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Insert the new installment
            const { data: newInstallment, error: insertError } = await supabase
                .from('payment_installments')
                .insert({
                    project_id: project.id,
                    name: name.trim(),
                    payment_percentage: numericPercentage,
                    status: PaymentStatus.Unpaid,
                })
                .select()
                .single();

            if (insertError) throw insertError;
            if (!newInstallment) throw new Error("Không thể tạo đợt thanh toán mới.");

            // 2. If months were selected, update them
            if (selectedMonths.length > 0) {
                const { error: updateError } = await supabase
                    .from('monthly_breakdown')
                    .update({ installment_id: newInstallment.id })
                    .in('id', selectedMonths);
                
                if (updateError) throw updateError;
            }

            addToast(`Đã thêm đợt "${name}" thành công!`, 'success');
            resetForm();
            await fetchProjects(); // Refresh project data
            // Do not close modal automatically, user might want to add more.
        } catch (error: any) {
            console.error("Error creating installment:", error);
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-dark">Quản lý các đợt thanh toán</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Add new installment form */}
                    <form onSubmit={handleSubmit} className="p-4 border border-gray-200 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3">Thêm đợt mới</h3>
                         <div className="flex items-end gap-4">
                            <div className="flex-grow">
                                <label htmlFor="instName" className="block text-sm font-medium text-gray-700">Tên đợt</label>
                                <input type="text" id="instName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="VD: Đợt 1 - Tạm ứng" required />
                            </div>
                            <div className="w-32">
                                <label htmlFor="instPercent" className="block text-sm font-medium text-gray-700">Tỷ lệ (%)</label>
                                <input type="number" id="instPercent" value={percentage} onChange={e => setPercentage(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" min="1" max="100" required />
                            </div>
                        </div>
                        <div className="mt-4">
                             <label className="block text-sm font-medium text-gray-700 mb-2">Gán các tháng (tùy chọn)</label>
                             {unassignedMonths.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-gray-50">
                                    {unassignedMonths.map(month => (
                                        <label key={month.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                            <input type="checkbox" value={month.id} checked={selectedMonths.includes(month.id)} onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedMonths(prev => [...prev, month.id]);
                                                } else {
                                                    setSelectedMonths(prev => prev.filter(id => id !== month.id));
                                                }
                                            }} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"/>
                                            <span className="text-sm font-medium">T{month.month}</span>
                                        </label>
                                    ))}
                                </div>
                             ) : <p className="text-sm text-gray-500">Tất cả các tháng đã được gán.</p>}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-300" disabled={isSubmitting}>
                                {isSubmitting ? <SpinnerIcon className="h-5 w-5"/> : 'Thêm đợt'}
                            </button>
                        </div>
                    </form>
                    
                    {/* List of existing installments */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Các đợt hiện có ({currentTotalPercentage}%)</h3>
                        <div className="space-y-3">
                             {project.installments.length > 0 ? project.installments.sort((a,b) => a.name.localeCompare(b.name)).map(inst => (
                                <div key={inst.id} className="p-3 border rounded-md bg-gray-50 flex justify-between items-center">
                                    <div>
                                      <p className="font-semibold text-dark">{inst.name} - {inst.paymentPercentage}%</p>
                                      <p className="text-xs text-gray-500">Tháng: {project.monthlyBreakdown.filter(m => m.installmentId === inst.id).map(m=>`T${m.month}`).join(', ') || 'Chưa gán'}</p>
                                    </div>
                                    {/* Edit/Delete buttons can be added here */}
                                </div>
                             )) : <p className="text-sm text-gray-500">Chưa có đợt nào.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PerformanceTrackingView: React.FC<{
  project: Project;
  updateLookerStudioUrl: (projectId: string, url: string | null) => Promise<void>;
}> = ({ project, updateLookerStudioUrl }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(project.lookerStudioUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const handleSave = async () => {
    if (!url.trim().startsWith('https://lookerstudio.google.com/embed/reporting/')) {
        addToast('Vui lòng nhập một URL nhúng hợp lệ từ Looker Studio.', 'error');
        return;
    }
    setIsSaving(true);
    await updateLookerStudioUrl(project.id, url.trim());
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleRemove = async () => {
    setIsSaving(true);
    await updateLookerStudioUrl(project.id, null);
    setIsSaving(false);
    setUrl('');
  };
  
  const handleStartEditing = () => {
    setUrl(project.lookerStudioUrl || '');
    setIsEditing(true);
  }

  if (project.lookerStudioUrl && !isEditing) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-dark">Báo cáo hiệu suất Looker Studio</h2>
                <div className="flex items-center gap-2">
                    <button onClick={handleStartEditing} className="text-sm font-semibold text-primary hover:text-blue-700">Chỉnh sửa</button>
                    <button onClick={handleRemove} disabled={isSaving} className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:text-gray-400">
                        {isSaving ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
                <iframe
                    width="100%"
                    height="800"
                    src={project.lookerStudioUrl}
                    frameBorder="0"
                    style={{ border: 0 }}
                    allowFullScreen
                    sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-forms allow-popups"
                    title={`Báo cáo hiệu suất cho ${project.name}`}
                ></iframe>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-dark mb-4">
            {isEditing ? 'Chỉnh sửa URL báo cáo' : 'Nhúng báo cáo Looker Studio'}
        </h2>
        <p className="text-gray-600 mb-4">
            Dán URL <span className="font-semibold">nhúng (embed)</span> từ báo cáo Looker Studio của bạn vào đây. Bạn có thể tìm thấy URL này trong tùy chọn 'Chia sẻ' {'>'} 'Nhúng báo cáo'.
        </p>
        <div className="flex items-start gap-2">
            <div className="flex-grow">
                <label htmlFor="looker-url" className="sr-only">Looker Studio URL</label>
                <input
                    id="looker-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://lookerstudio.google.com/embed/reporting/..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    disabled={isSaving}
                />
            </div>
            <button
                onClick={handleSave}
                className="bg-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:bg-blue-300"
                disabled={isSaving}
            >
                {isSaving ? <SpinnerIcon className="h-5 w-5" /> : 'Lưu'}
            </button>
            {isEditing && (
                <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300"
                    disabled={isSaving}
                >
                    Hủy
                </button>
            )}
        </div>
    </div>
  );
};

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

  const TABS_ORDER = ['kpi', 'assignment', 'report', 'payment', 'commission', 'performance'];
  const TABS = {
      kpi: { label: 'Quản lý KPI', component: <KpiManagementView project={project} addKpiEntry={addKpiEntry} /> },
      assignment: { label: 'Phân công', component: <AssignmentManagementView project={project} allStaff={allStaff} refetchData={fetchProjects} /> },
      report: { label: 'Quản lý báo cáo', component: <ReportManagementView project={project} updateKpiEntry={updateKpiEntry} updateKpiConfirmation={updateKpiConfirmation} /> },
      payment: { label: 'Quản lý thanh toán', component: <PaymentManagementView project={project} updateMonthlyPayment={updateMonthlyPayment} updateInstallmentPayment={updateInstallmentPayment} fetchProjects={fetchProjects} /> },
      commission: { label: 'Quản lý hoa hồng', component: <CommissionManagementView project={project} updateKpiCommissionStatus={updateKpiCommissionStatus} /> },
      performance: { label: 'Theo dõi hiệu suất', component: <PerformanceTrackingView project={project} updateLookerStudioUrl={updateLookerStudioUrl} /> }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 flex-wrap">
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
              <button onClick={handleSaveName} className="bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:bg-blue-300 disabled:cursor-wait" disabled={isSavingName}>
                {isSavingName ? <SpinnerIcon className="h-5 w-5"/> : 'Lưu'}
              </button>
              <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300 disabled:opacity-50" disabled={isSavingName}>
                Hủy
              </button>
            </div>
          )}
        </div>
        <Link to="/" className="inline-flex items-center text-primary hover:text-blue-700 font-semibold text-sm flex-shrink-0 ml-4">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Quay lại Danh sách dự án
        </Link>
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
