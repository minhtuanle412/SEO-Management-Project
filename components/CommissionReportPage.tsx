import React, { useState, useMemo } from 'react';
import { Project, Staff, CommissionConfig, PaymentStatus, ReportStatus, PaymentType } from '../types';
// Fix: The error indicates startOfMonth is not exported, possibly due to a date-fns version issue.
// This is resolved by removing the dependency on startOfMonth and endOfMonth, and using a more robust
// string comparison for filtering by month, which also avoids potential timezone issues.
// Unused imports for getYear and getMonth are also removed.
import { format } from 'date-fns';

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
  isEligible: boolean;
  assignments: {
    staffId: string;
    staffName: string;
    department: string;
    position: string;
    commissionAmount: number;
  }[];
}

const CommissionReportPage: React.FC<CommissionReportPageProps> = ({ projects, staff, commissionConfigs }) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  const commissionConfigMap = useMemo(() => {
    const map = new Map<string, number>();
    commissionConfigs.forEach(c => map.set(c.chuc_vu.name, c.ty_le_hoa_hong));
    return map;
  }, [commissionConfigs]);

  const calculatedData = useMemo<CalculatedRow[]>(() => {
    const data: CalculatedRow[] = [];

    projects.forEach(project => {
      const monthlyRevenue = project.durationMonths > 0 ? Math.round(project.totalBudget / project.durationMonths) : 0;
      
      project.kpiEntries.forEach(kpi => {
        // The kpi.actualMonth is a YYYY-MM-DD string. We compare its YYYY-MM part with selectedMonth.
        if (kpi.actualMonth.substring(0, 7) !== selectedMonth) {
            return; // Skip if not in the selected month
        }
        
        // Check Payment Status
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
        
        const assignments = project.assignments.map(assignment => {
            const commissionRate = commissionConfigMap.get(assignment.nhan_su.chuc_vu.name) || 0;
            const commissionAmount = isEligible ? Math.round((monthlyRevenue * commissionRate) / 100) : 0;
            return {
                staffId: assignment.nhan_su_id,
                staffName: assignment.nhan_su.ho_ten,
                department: assignment.nhan_su.phong_ban.name,
                position: assignment.nhan_su.chuc_vu.name,
                commissionAmount,
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
            isEligible,
            assignments,
        });
      });
    });
    return data.sort((a,b) => a.projectName.localeCompare(b.projectName) || a.contractMonth - b.contractMonth);
  }, [projects, selectedMonth, commissionConfigMap]);
  
  const filteredData = useMemo(() => {
      return calculatedData.filter(row => {
          if (selectedProject !== 'all' && row.projectId !== selectedProject) return false;
          if (selectedDepartment !== 'all' && !row.assignments.some(a => a.department === selectedDepartment)) return false;
          if (selectedStaff !== 'all' && !row.assignments.some(a => a.staffId === selectedStaff)) return false;
          return true;
      });
  }, [calculatedData, selectedProject, selectedDepartment, selectedStaff]);
  
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


  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-dark mb-6">Hoa hồng theo Dự án</h1>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">Tháng/Năm</label>
          <input type="month" id="month-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
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

      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex justify-between items-center">
        <h3 className="text-xl font-bold text-dark">Tổng hoa hồng tháng {format(new Date(selectedMonth), 'MM/yyyy')}</h3>
        <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(totalCommission)}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dự án</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tháng HĐ</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Doanh thu</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Điều kiện (KPI/BC/TT)</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trạng thái HH</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Phân công & Hoa hồng</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length > 0 ? filteredData.map(row => (
              <tr key={`${row.projectId}-${row.contractMonth}`}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <p className="font-medium text-dark">{row.projectName}</p>
                  <p className="text-sm text-gray-500">{row.client}</p>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center font-medium">T{row.contractMonth}</td>
                <td className="px-4 py-4 whitespace-nowrap font-semibold text-blue-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(row.monthlyRevenue)}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${row.kpiPercentage >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{row.kpiPercentage}%</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${row.reportStatus === ReportStatus.Sent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>BC</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${row.paymentStatus === PaymentStatus.Paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>TT</span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-sm rounded-full font-bold ${row.isEligible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                    {row.isEligible ? 'Hợp lệ' : 'Không hợp lệ'}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                    {row.assignments
                        .filter(assignment => {
                            const departmentMatch = selectedDepartment === 'all' || assignment.department === selectedDepartment;
                            const staffMatch = selectedStaff === 'all' || assignment.staffId === selectedStaff;
                            return departmentMatch && staffMatch;
                        })
                        .map(a => (
                        <div key={a.staffId} className="grid grid-cols-2 gap-2 text-sm">
                            <span className="font-medium text-gray-800">{a.staffName}</span>
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
                    <td colSpan={6} className="text-center py-16 text-gray-500">Không có dữ liệu hoa hồng cho các lựa chọn hiện tại.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommissionReportPage;