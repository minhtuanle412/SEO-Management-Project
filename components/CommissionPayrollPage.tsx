
import React, { useState, useMemo, useEffect } from 'react';
import { Project, Staff, CommissionConfig, PaymentStatus, ReportStatus, PaymentType, CommissionPayout } from '../types';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { EyeIcon, XIcon, PrinterIcon, DownloadIcon, UsersIcon, CashIcon, SpinnerIcon } from './Icons';

// --- Icons ---
const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
  </svg>
);

interface CommissionPayrollPageProps {
  projects: Project[];
  staff: Staff[];
  commissionConfigs: CommissionConfig[];
}

interface StaffCommissionSummary {
  staffId: string;
  staffName: string;
  position: string;
  department: string;
  totalCommission: number;
  breakdown: {
    projectId: string;
    projectName: string;
    client: string;
    monthlyRevenue: number;
    commissionRate: number; // in percent
    effortPercentage: number; // in percent
    commissionAmount: number;
    contractMonth: number;
    isSnapshot?: boolean; // New flag to indicate source
  }[];
}

const DetailModal: React.FC<{ 
    summary: StaffCommissionSummary | null; 
    isOpen: boolean;
    onClose: () => void;
    month: string;
    isLocked: boolean;
}> = ({ summary, isOpen, onClose, month, isLocked }) => {
    if (!isOpen || !summary) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-dark">Chi tiết hoa hồng tháng {format(new Date(month), 'MM/yyyy')}</h2>
                            {isLocked && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-bold border border-red-200 flex items-center"><LockClosedIcon className="h-3 w-3 mr-1"/> Đã chốt</span>}
                        </div>
                        <p className="text-gray-600 mt-1">{summary.staffName} - {summary.position}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dự án</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tháng HĐ</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Doanh thu</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Tỷ lệ HH</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Tỷ lệ Đóng góp</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Tiền Hoa hồng</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {summary.breakdown.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-4 whitespace-nowrap font-medium">{item.projectName}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                        {item.contractMonth > 0 ? `T${item.contractMonth}` : '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        {item.monthlyRevenue > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.monthlyRevenue) : '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        {item.commissionRate > 0 ? `${item.commissionRate}%` : '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        {item.effortPercentage < 100 ? (
                                            <span className="text-orange-600 font-bold">{item.effortPercentage}%</span>
                                        ) : (
                                            <span className="text-gray-500">{item.effortPercentage}%</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right font-bold text-green-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.commissionAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                            <tr>
                                <td colSpan={5} className="px-4 py-3 text-right font-bold">TỔNG CỘNG</td>
                                <td className="px-4 py-3 text-right font-bold text-xl text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(summary.totalCommission)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

const CommissionPayrollPage: React.FC<CommissionPayrollPageProps> = ({ projects, staff, commissionConfigs }) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<StaffCommissionSummary | null>(null);

  // New State for Snapshot Data
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  // Fetch Snapshot Data when month changes
  useEffect(() => {
    const fetchPayouts = async () => {
        setLoadingPayouts(true);
        try {
            const { data, error } = await supabase
                .from('commission_payouts')
                .select('*, nhan_su(*, chuc_vu(*), phong_ban(*))')
                .eq('month', selectedMonth);
            
            if (error) throw error;
            setPayouts(data as CommissionPayout[]);
        } catch (err) {
            console.error("Error fetching payroll snapshot:", err);
            setPayouts([]);
        } finally {
            setLoadingPayouts(false);
        }
    };
    fetchPayouts();
  }, [selectedMonth]);

  const isMonthLocked = payouts.length > 0;

  const commissionConfigMap = useMemo(() => {
    const map = new Map<string, number>();
    commissionConfigs.forEach(c => map.set(c.chuc_vu.id, c.ty_le_hoa_hong));
    return map;
  }, [commissionConfigs]);

  const departmentList = useMemo(() => {
    return [...new Set(staff.map(s => s.phong_ban.name))].sort();
  }, [staff]);

  const aggregatedData = useMemo<StaffCommissionSummary[]>(() => {
    const summaryMap = new Map<string, StaffCommissionSummary>();

    // CASE 1: LOCKED MONTH (USE SNAPSHOT DATA)
    if (isMonthLocked) {
        payouts.forEach(p => {
            if (!p.nhan_su) return; // Skip if staff deleted/null
            
            const staffId = p.staff_id;
            const staffName = p.nhan_su.ho_ten;
            const position = p.nhan_su.chuc_vu?.name || 'N/A';
            const department = p.nhan_su.phong_ban?.name || 'N/A';
            
            // Try to find project info for display purposes
            const project = projects.find(proj => proj.id === p.project_id);
            const projectName = project ? project.name : 'Dự án đã xóa/ẩn';
            const client = project ? project.client : '';
            
            // Re-calculate for display (Note: These are estimates based on current data, as snapshot only stores total amount)
            const monthlyRevenue = (project && project.durationMonths > 0) ? Math.round(project.totalBudget / project.durationMonths) : 0;
            // Reverse engineering rate is tricky, just show 0 or implied rate. Better to use current config or skip.
            // Using current config for display reference.
            const impliedRate = (monthlyRevenue > 0 && p.amount > 0) ? ((p.amount / monthlyRevenue) * 100) : 0;
            const effortPercentage = p.effort_percentage || 100;

            const commissionRate = (monthlyRevenue > 0 && effortPercentage > 0) 
                 ? (p.amount / (monthlyRevenue * (effortPercentage/100))) * 100 
                 : 0;
            
            // Try to find KPI month for display
            let contractMonth = 0;
            if (project) {
                 const kpi = project.kpiEntries.find(k => k.actualMonth.startsWith(selectedMonth));
                 if (kpi) contractMonth = kpi.contractMonth;
            }

            const breakdownItem = {
                projectId: p.project_id,
                projectName,
                client,
                monthlyRevenue,
                commissionRate: parseFloat(commissionRate.toFixed(1)),
                effortPercentage,
                commissionAmount: p.amount,
                contractMonth,
                isSnapshot: true
            };

            if (summaryMap.has(staffId)) {
                const existing = summaryMap.get(staffId)!;
                existing.totalCommission += p.amount;
                existing.breakdown.push(breakdownItem);
            } else {
                summaryMap.set(staffId, {
                    staffId,
                    staffName,
                    position,
                    department,
                    totalCommission: p.amount,
                    breakdown: [breakdownItem],
                });
            }
        });

    } 
    // CASE 2: LIVE CALCULATION (FORECAST)
    else {
        projects.forEach(project => {
            const monthlyRevenue = project.durationMonths > 0 ? Math.round(project.totalBudget / project.durationMonths) : 0;
            
            project.kpiEntries.forEach(kpi => {
                if (kpi.actualMonth.substring(0, 7) !== selectedMonth) return;
                
                const monthBreakdown = project.monthlyBreakdown.find(m => m.month === kpi.contractMonth);
                let paymentStatus = PaymentStatus.Unpaid;
                if (monthBreakdown) {
                if (project.paymentType === PaymentType.Monthly) {
                    paymentStatus = monthBreakdown.paymentStatus;
                } else if (project.paymentType === PaymentType.Milestone && monthBreakdown.installmentId) {
                    const installment = project.installments.find(i => i.id === monthBreakdown.installmentId);
                    paymentStatus = installment?.status || PaymentStatus.Unpaid;
                }
                }
                
                const isEligible = kpi.kpiPercentage >= 75 && kpi.reportStatus === ReportStatus.Sent && paymentStatus === PaymentStatus.Paid;
                if (!isEligible) return;

                project.assignments.forEach(assignment => {
                    const staffInfo = assignment.nhan_su;
                    if (!staffInfo) return;

                    const commissionRate = commissionConfigMap.get(staffInfo.chuc_vu.id) || 0;
                    if (commissionRate === 0) return;

                    const effortPercentage = assignment.ty_le_phan_cong ?? 100;
                    const commissionAmount = Math.round((monthlyRevenue * (commissionRate/100)) * (effortPercentage/100));

                    const breakdownItem = {
                        projectId: project.id,
                        projectName: project.name,
                        client: project.client,
                        monthlyRevenue,
                        commissionRate,
                        effortPercentage,
                        commissionAmount,
                        contractMonth: kpi.contractMonth,
                    };

                    if (summaryMap.has(staffInfo.id)) {
                        const existing = summaryMap.get(staffInfo.id)!;
                        existing.totalCommission += commissionAmount;
                        existing.breakdown.push(breakdownItem);
                    } else {
                        summaryMap.set(staffInfo.id, {
                        staffId: staffInfo.id,
                        staffName: staffInfo.ho_ten,
                        position: staffInfo.chuc_vu.name,
                        department: staffInfo.phong_ban.name,
                        totalCommission: commissionAmount,
                        breakdown: [breakdownItem],
                        });
                    }
                });
            });
        });
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);
  }, [projects, selectedMonth, commissionConfigMap, isMonthLocked, payouts]);

  const filteredData = useMemo(() => {
    return aggregatedData.filter(item => {
      const departmentMatch = selectedDepartment === 'all' || item.department === selectedDepartment;
      const nameMatch = searchTerm === '' || item.staffName.toLowerCase().includes(searchTerm.toLowerCase());
      return departmentMatch && nameMatch;
    });
  }, [aggregatedData, selectedDepartment, searchTerm]);

  const summaryCards = useMemo(() => {
    return {
        totalStaff: filteredData.length,
        totalCommission: filteredData.reduce((sum, item) => sum + item.totalCommission, 0),
    }
  }, [filteredData]);
  
  const handleExportCSV = () => {
    const headers = ['"STT"', '"Họ và tên"', '"Chức vụ"', '"Phòng ban"', '"Tổng hoa hồng (VNĐ)"'];
    const rows = filteredData.map((staff, index) => [
        `"${index + 1}"`,
        `"${staff.staffName.replace(/"/g, '""')}"`,
        `"${staff.position.replace(/"/g, '""')}"`,
        `"${staff.department.replace(/"/g, '""')}"`,
        `"${staff.totalCommission}"`,
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // BOM for UTF-8
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `HoaHongCaNhan_${selectedMonth}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
    <div className="container mx-auto" id="payroll-page">
      <div className="print-hide">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-dark">Hoa hồng theo Cá nhân</h1>
            <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50">
                    <PrinterIcon className="h-5 w-5"/>
                    <span className="hidden sm:inline">In Báo cáo</span>
                </button>
                <button onClick={handleExportCSV} className="flex items-center gap-2 bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
                    <DownloadIcon className="h-5 w-5"/>
                    <span className="hidden sm:inline">Xuất CSV</span>
                </button>
            </div>
        </div>
      
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">Tháng/Năm</label>
             <div className="relative">
                <input type="month" id="month-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`mt-1 block w-full px-3 py-2 border rounded-md ${isMonthLocked ? 'border-red-300 bg-red-50 text-red-900 font-semibold' : 'border-gray-300'}`}/>
                {isMonthLocked && !loadingPayouts && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center text-red-600 pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 mr-1"/>
                        <span className="text-xs font-bold">Đã chốt</span>
                    </div>
                )}
            </div>
          </div>
          <div>
            <label htmlFor="dept-select" className="block text-sm font-medium text-gray-700">Phòng ban</label>
            <select id="dept-select" value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="all">Tất cả phòng ban</option>
              {departmentList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="staff-search" className="block text-sm font-medium text-gray-700">Tìm nhân sự</label>
            <input type="text" id="staff-search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nhập tên để tìm..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className={`p-5 rounded-lg shadow-sm border flex items-center gap-4 ${isMonthLocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <div className="bg-blue-100 p-3 rounded-full"><UsersIcon className="h-8 w-8 text-blue-600"/></div>
                <div>
                    <div className="flex items-center gap-2">
                         <p className="text-sm text-gray-500">Số nhân sự nhận HH</p>
                         {isMonthLocked && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">Đã chốt</span>}
                    </div>
                    <p className="text-3xl font-bold text-dark">{summaryCards.totalStaff}</p>
                </div>
            </div>
            <div className={`p-5 rounded-lg shadow-sm border flex items-center gap-4 ${isMonthLocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                 <div className="bg-green-100 p-3 rounded-full"><CashIcon className="h-8 w-8 text-green-600"/></div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">Tổng hoa hồng {isMonthLocked ? 'thực chi' : 'dự kiến'}</p>
                        {isMonthLocked && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">Đã chốt</span>}
                    </div>
                    <p className="text-3xl font-bold text-dark">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(summaryCards.totalCommission)}</p>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <h2 className="text-xl font-bold p-4 print-only">Hoa hồng theo Cá nhân tháng {format(new Date(selectedMonth), 'MM/yyyy')}</h2>
        
        {loadingPayouts ? (
            <div className="text-center py-12"><SpinnerIcon className="h-8 w-8 text-primary mx-auto mb-2"/>Đang tải dữ liệu...</div>
        ) : (
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">STT</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Họ và tên</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Chức vụ</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Phòng ban</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Tổng hoa hồng (VNĐ)</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase print-hide">Hành động</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length > 0 ? filteredData.map((row, index) => (
                <tr key={row.staffId}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-dark">{row.staffName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{row.position}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{row.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary text-lg">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(row.totalCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center print-hide">
                        <button onClick={() => { setSelectedStaffDetails(row); setIsDetailModalOpen(true); }} className="text-primary hover:text-blue-700 font-semibold flex items-center justify-center mx-auto">
                            <EyeIcon className="h-5 w-5 mr-1" />
                            Xem chi tiết
                        </button>
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={6} className="text-center py-16 text-gray-500">
                            {isMonthLocked 
                                ? "Không có dữ liệu hoa hồng được chốt trong tháng này." 
                                : "Không có dữ liệu hoa hồng dự kiến cho các lựa chọn hiện tại."}
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        )}
      </div>
    </div>
    <DetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        summary={selectedStaffDetails}
        month={selectedMonth}
        isLocked={isMonthLocked}
    />
    <style>{`
        @media print {
            body {
                background-color: white !important;
            }
            .print-hide {
                display: none !important;
            }
            .print-only {
                display: block !important;
            }
            main {
                padding: 0 !important;
            }
            #payroll-page, .bg-white {
                box-shadow: none !important;
                border: none !important;
            }
        }
        .print-only {
            display: none;
        }
    `}</style>
    </>
  );
};

export default CommissionPayrollPage;
