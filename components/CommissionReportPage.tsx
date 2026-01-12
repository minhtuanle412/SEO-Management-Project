
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Project, Staff, CommissionConfig, PaymentStatus, ReportStatus, PaymentType, CommissionPayout } from '../types';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SpinnerIcon, ShieldCheckIcon } from './Icons';

// Simple Lock Icon Component
const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
  </svg>
);

interface CommissionReportPageProps {
  projects: Project[];
  staff: Staff[];
  commissionConfigs: CommissionConfig[];
}

interface CalculatedRow {
  projectId: string;
  projectName: string;
  client: string;
  contractMonth: number;
  actualMonth: string;
  monthlyRevenue: number;
  kpiPercentage: number;
  reportStatus: ReportStatus;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  isEligible: boolean;
  isBackPay: boolean; // NEW: True if paid late
  assignments: {
    staffId: string;
    staffName: string;
    department: string;
    position: string;
    commissionAmount: number;
    effortPercentage: number;
  }[];
}

const CommissionReportPage: React.FC<CommissionReportPageProps> = ({ projects, staff, commissionConfigs }) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  
  // State cho tính năng Chốt sổ (Snapshot)
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [isProcessingLock, setIsProcessingLock] = useState(false);
  
  const { isManager } = useAuth(); // Chỉ Manager/Admin mới được chốt sổ
  const { addToast } = useToast();

  const commissionConfigMap = useMemo(() => {
    const map = new Map<string, number>();
    commissionConfigs.forEach(c => map.set(c.chuc_vu.name, c.ty_le_hoa_hong));
    return map;
  }, [commissionConfigs]);

  // Fetch Payouts khi thay đổi tháng
  const fetchPayouts = useCallback(async () => {
      setLoadingPayouts(true);
      try {
          const { data, error } = await supabase
              .from('commission_payouts')
              .select('*, nhan_su(*, chuc_vu(*), phong_ban(*))')
              .eq('month', selectedMonth);
          
          if (error) throw error;
          setPayouts(data as CommissionPayout[]);
      } catch (err) {
          console.error("Error fetching payouts:", err);
          setPayouts([]);
      } finally {
          setLoadingPayouts(false);
      }
  }, [selectedMonth]);

  useEffect(() => {
      fetchPayouts();
  }, [fetchPayouts]);

  // Kiểm tra tháng này đã bị chốt chưa
  const isMonthLocked = useMemo(() => payouts.length > 0, [payouts]);

  // Logic 1: Tính toán "Dự kiến" (Khi chưa chốt)
  const calculatedForecastData = useMemo<CalculatedRow[]>(() => {
    if (isMonthLocked) return []; 

    const data: CalculatedRow[] = [];
    const selectedMonthDate = new Date(selectedMonth + "-01"); // First day of selected month
    const nextMonthStr = format(new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 1), 'yyyy-MM');

    projects.forEach(project => {
      const monthlyRevenue = project.durationMonths > 0 ? Math.round(project.totalBudget / project.durationMonths) : 0;
      
      project.kpiEntries.forEach(kpi => {
        // --- LOGIC GỐC: Tìm các tháng hợp đồng của tháng đang chọn ---
        const isCurrentMonthContract = kpi.actualMonth.substring(0, 7) === selectedMonth;
        
        // --- LOGIC TRUY THU (Back-pay) ---
        // Điều kiện truy thu: 
        // 1. KPI thuộc về quá khứ (Month < Selected Month)
        // 2. Đã hoàn thành (KPI OK, Report OK)
        // 3. Đã thanh toán (Paid)
        // 4. VÀ Ngày thanh toán nằm trong tháng hiện tại (Selected Month)
        
        let paymentStatus = PaymentStatus.Unpaid;
        let paymentDate: string | undefined = undefined;
        const monthBreakdown = project.monthlyBreakdown.find(m => m.month === kpi.contractMonth);

        if (monthBreakdown) {
            if (project.paymentType === PaymentType.Monthly) {
                paymentStatus = monthBreakdown.paymentStatus;
                paymentDate = monthBreakdown.paymentDate;
            } else if (project.paymentType === PaymentType.Milestone && monthBreakdown.installmentId) {
                const installment = project.installments.find(i => i.id === monthBreakdown.installmentId);
                paymentStatus = installment?.status || PaymentStatus.Unpaid;
                paymentDate = installment?.paymentDate;
            }
        }
        
        const isPaidInSelectedMonth = paymentDate && paymentDate.substring(0, 7) === selectedMonth;
        const isPastContract = kpi.actualMonth.substring(0, 7) < selectedMonth;

        const isBackPay = isPastContract && paymentStatus === PaymentStatus.Paid && isPaidInSelectedMonth;

        // Chỉ xử lý nếu là tháng hiện tại HOẶC là truy thu
        if (!isCurrentMonthContract && !isBackPay) {
            return;
        }

        const isEligible = kpi.kpiPercentage >= 75 && kpi.reportStatus === ReportStatus.Sent && paymentStatus === PaymentStatus.Paid;
        
        const assignments = project.assignments.map(assignment => {
            const commissionRate = commissionConfigMap.get(assignment.nhan_su.chuc_vu.name) || 0;
            const effortPercentage = assignment.ty_le_phan_cong ?? 100; // Default 100 if null
            
            // Formula: Revenue * Role Rate * (Effort / 100)
            const commissionAmount = isEligible 
                ? Math.round((monthlyRevenue * (commissionRate / 100)) * (effortPercentage / 100)) 
                : 0;

            return {
                staffId: assignment.nhan_su_id,
                staffName: assignment.nhan_su.ho_ten,
                department: assignment.nhan_su.phong_ban.name,
                position: assignment.nhan_su.chuc_vu.name,
                commissionAmount,
                effortPercentage,
            };
        });

        data.push({
            projectId: project.id,
            projectName: project.name,
            client: project.client,
            contractMonth: kpi.contractMonth,
            actualMonth: kpi.actualMonth,
            monthlyRevenue,
            kpiPercentage: kpi.kpiPercentage,
            reportStatus: kpi.reportStatus,
            paymentStatus,
            paymentDate,
            isEligible,
            isBackPay: !!isBackPay, // Mark as backpay
            assignments,
        });
      });
    });
    return data.sort((a,b) => {
        // Sort: Current month first, then Backpay. Within groups by name.
        if (a.isBackPay !== b.isBackPay) return a.isBackPay ? 1 : -1;
        return a.projectName.localeCompare(b.projectName) || a.contractMonth - b.contractMonth;
    });
  }, [projects, selectedMonth, commissionConfigMap, isMonthLocked]);

  // Logic 2: Dữ liệu "Lịch sử" (Khi đã chốt)
  const snapshotData = useMemo<CalculatedRow[]>(() => {
    if (!isMonthLocked) return [];

    const groupedPayouts = new Map<string, CommissionPayout[]>();
    payouts.forEach(p => {
        const key = p.project_id;
        if (!groupedPayouts.has(key)) groupedPayouts.set(key, []);
        groupedPayouts.get(key)!.push(p);
    });

    const data: CalculatedRow[] = [];
    
    groupedPayouts.forEach((projectPayouts, projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return; 

        // NOTE: Trong snapshot không lưu thông tin "Đây là truy thu".
        // Tuy nhiên, ta có thể đoán nếu KPI month khác Selected Month.
        // Tạm thời hiển thị tất cả dưới dạng "Đã chốt" chung.

        const assignments = projectPayouts.map(p => ({
            staffId: p.staff_id,
            staffName: p.nhan_su?.ho_ten || 'Unknown',
            department: p.nhan_su?.phong_ban?.name || 'Unknown',
            position: p.nhan_su?.chuc_vu?.name || 'Unknown',
            commissionAmount: p.amount,
            effortPercentage: p.effort_percentage ?? 100
        }));

        data.push({
            projectId: project.id,
            projectName: project.name,
            client: project.client,
            contractMonth: 0, // Placeholder
            actualMonth: selectedMonth + "-01", // Fake date
            monthlyRevenue: 0,
            kpiPercentage: 0, // Placeholder
            reportStatus: ReportStatus.Sent,
            paymentStatus: PaymentStatus.Paid,
            isEligible: true,
            isBackPay: false,
            assignments
        });
    });

    return data.sort((a,b) => a.projectName.localeCompare(b.projectName));
  }, [payouts, isMonthLocked, projects, selectedMonth]);

  // QUYẾT ĐỊNH HIỂN THỊ DỮ LIỆU NÀO?
  const finalDisplayData = isMonthLocked ? snapshotData : calculatedForecastData;

  const filteredData = useMemo(() => {
      return finalDisplayData.filter(row => {
          if (selectedProject !== 'all' && row.projectId !== selectedProject) return false;
          if (selectedDepartment !== 'all' && !row.assignments.some(a => a.department === selectedDepartment)) return false;
          if (selectedStaff !== 'all' && !row.assignments.some(a => a.staffId === selectedStaff)) return false;
          return true;
      });
  }, [finalDisplayData, selectedProject, selectedDepartment, selectedStaff]);
  
  const totalCommission = useMemo(() => {
    let total = 0;
    filteredData.forEach(row => {
        row.assignments.forEach(assignment => {
            const departmentMatch = selectedDepartment === 'all' || assignment.department === selectedDepartment;
            const staffMatch = selectedStaff === 'all' || assignment.staffId === selectedStaff;
            if (departmentMatch && staffMatch) {
                total += assignment.commissionAmount;
            }
        });
    });
    return total;
  }, [filteredData, selectedDepartment, selectedStaff]);


  // HÀM CHỐT SỔ
  const handleLockCommission = async () => {
    if (!isManager) return;
    const confirmMessage = `CẢNH BÁO: Bạn đang thực hiện chốt sổ hoa hồng tháng ${selectedMonth}.
    \n- Dữ liệu sẽ được lưu cứng và KHÔNG THỂ thay đổi sau này.
    \n- Bao gồm cả các khoản Truy thu (nếu có).
    \nBạn có chắc chắn muốn tiếp tục?`;

    if (!window.confirm(confirmMessage)) return;

    setIsProcessingLock(true);
    try {
        const payoutsToInsert: any[] = [];
        
        calculatedForecastData.forEach(row => {
            row.assignments.forEach(assign => {
                if (assign.commissionAmount > 0) {
                    payoutsToInsert.push({
                        project_id: row.projectId,
                        staff_id: assign.staffId,
                        amount: assign.commissionAmount,
                        month: selectedMonth,
                        effort_percentage: assign.effortPercentage
                    });
                }
            });
        });

        if (payoutsToInsert.length === 0) {
            addToast('Không có dữ liệu hoa hồng hợp lệ để chốt.', 'error');
            return;
        }

        const { error } = await supabase.from('commission_payouts').insert(payoutsToInsert);
        if (error) throw error;

        addToast(`Đã chốt sổ thành công ${payoutsToInsert.length} bản ghi hoa hồng!`, 'success');
        await fetchPayouts();

    } catch (err: any) {
        console.error("Locking failed:", err);
        addToast(`Lỗi khi chốt sổ: ${err.message}`, 'error');
    } finally {
        setIsProcessingLock(false);
    }
  };


  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">Hoa hồng theo Dự án</h1>
      </div>
      
      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">Tháng/Năm</label>
          <div className="relative">
             <input type="month" id="month-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`mt-1 block w-full px-3 py-2 border rounded-md ${isMonthLocked ? 'border-red-300 bg-red-50 text-red-900 font-semibold' : 'border-gray-300'}`}/>
             {isMonthLocked && (
                 <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center text-red-600 pointer-events-none" title="Tháng này đã chốt sổ">
                     <LockClosedIcon className="h-5 w-5"/>
                 </div>
             )}
          </div>
        </div>
        <div>
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-700">Dự án</label>
          <select id="project-select" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="all">Tất cả dự án</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dept-select" className="block text-sm font-medium text-gray-700">Phòng ban</label>
          <select id="dept-select" value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="all">Tất cả phòng ban</option>
            {[...new Set(staff.map(s => s.phong_ban.name))].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="staff-select" className="block text-sm font-medium text-gray-700">Nhân sự</label>
          <select id="staff-select" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="all">Tất cả nhân sự</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.ho_ten}</option>)}
          </select>
        </div>
      </div>

      {/* LOCK BUTTON AREA (New Location) */}
      {isManager && !isMonthLocked && !loadingPayouts && calculatedForecastData.length > 0 && (
         <div className="flex justify-end mb-6">
             <button 
                onClick={handleLockCommission} 
                disabled={isProcessingLock}
                className="flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-red-700 transition duration-300 disabled:bg-gray-400"
             >
                {isProcessingLock ? <SpinnerIcon className="h-5 w-5"/> : <ShieldCheckIcon className="h-5 w-5" />}
                <span>Chốt sổ tháng này</span>
            </button>
         </div>
      )}

      {/* SUMMARY CARD */}
      <div className={`p-4 rounded-lg shadow-sm border mb-6 flex justify-between items-center ${isMonthLocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
        <div>
            <h3 className={`text-xl font-bold ${isMonthLocked ? 'text-red-900' : 'text-dark'}`}>
                Tổng hoa hồng tháng {format(new Date(selectedMonth), 'MM/yyyy')} 
                {isMonthLocked ? ' (ĐÃ CHỐT SỔ)' : ' (DỰ KIẾN)'}
            </h3>
            {isMonthLocked && <p className="text-sm text-red-700 mt-1">Dữ liệu này được lấy từ lịch sử chốt sổ và sẽ không thay đổi.</p>}
        </div>
        <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(totalCommission)}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        {loadingPayouts ? (
            <div className="text-center py-10"><SpinnerIcon className="h-8 w-8 text-primary mx-auto"/> <p className="mt-2 text-gray-500">Đang tải dữ liệu...</p></div>
        ) : (
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dự án</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tháng HĐ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Doanh thu</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Phân công & Hoa hồng</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length > 0 ? filteredData.map(row => (
                <tr key={`${row.projectId}-${row.contractMonth}-${row.isBackPay ? 'back' : 'curr'}`} className={row.isBackPay ? "bg-orange-50" : ""}>
                    <td className="px-4 py-4 whitespace-nowrap">
                        <p className="font-medium text-dark">{row.projectName}</p>
                        <p className="text-sm text-gray-500">{row.client}</p>
                        {row.isBackPay && <span className="inline-block mt-1 text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">Truy thu / Thanh toán muộn</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center font-medium">
                        T{row.contractMonth}
                        {row.isBackPay && <div className="text-xs text-gray-500 mt-1">Thực tế: {format(new Date(row.actualMonth), 'MM/yyyy')}</div>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-semibold text-blue-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(row.monthlyRevenue)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                         {isMonthLocked ? (
                             <span className="px-3 py-1 text-sm rounded-full font-bold bg-red-100 text-red-800 flex items-center w-fit">
                                <LockClosedIcon className="h-3 w-3 mr-1"/> Đã chốt
                             </span>
                         ) : (
                            <div className="flex flex-col space-y-1">
                                <span className={`px-2 py-0.5 text-xs rounded-full w-fit ${row.kpiPercentage >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>KPI: {row.kpiPercentage}%</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full w-fit ${row.reportStatus === ReportStatus.Sent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>BC: {row.reportStatus === ReportStatus.Sent ? 'Đã gửi' : 'Chưa'}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full w-fit ${row.paymentStatus === PaymentStatus.Paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>TT: {row.paymentStatus === PaymentStatus.Paid ? 'Đã TT' : 'Chưa'}</span>
                                {row.paymentDate && <span className="text-xs text-gray-500 italic">Ngày TT: {format(new Date(row.paymentDate), 'dd/MM/yyyy')}</span>}
                                <span className={`px-2 py-0.5 text-xs rounded-full w-fit font-bold ${row.isEligible ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>{row.isEligible ? 'Hợp lệ' : 'Không'}</span>
                            </div>
                         )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                        {row.assignments
                            .filter(assignment => {
                                const departmentMatch = selectedDepartment === 'all' || assignment.department === selectedDepartment;
                                const staffMatch = selectedStaff === 'all' || assignment.staffId === selectedStaff;
                                return departmentMatch && staffMatch;
                            })
                            .map((a, idx) => (
                            <div key={`${a.staffId}-${idx}`} className="grid grid-cols-2 gap-2 text-sm">
                                <span className="font-medium text-gray-800">
                                    {a.staffName} 
                                    {a.effortPercentage < 100 && <span className="text-gray-500 text-xs ml-1">({a.effortPercentage}%)</span>}
                                </span>
                                <span className={`font-bold text-right ${a.commissionAmount > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(a.commissionAmount)}
                                </span>
                            </div>
                        ))}
                        </div>
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={5} className="text-center py-16 text-gray-500">
                            {isMonthLocked 
                                ? "Tháng này đã chốt sổ nhưng không tìm thấy dữ liệu phù hợp với bộ lọc." 
                                : "Không có dữ liệu hoa hồng dự kiến cho các lựa chọn hiện tại."}
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        )}
      </div>
    </div>
  );
};

export default CommissionReportPage;
