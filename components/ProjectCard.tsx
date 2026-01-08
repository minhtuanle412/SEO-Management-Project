
import React from 'react';
import { Link } from 'react-router-dom';
import { Project, PaymentStatus, KpiEntry, PaymentType } from '../types';
import ProgressBar from './ProgressBar';
import { CalendarIcon, UserIcon, ClockIcon, DocumentReportIcon, CashIcon } from './Icons';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
}

const slugify = (text: string): string => {
  return text
    .toString()
    .normalize('NFD') // Tách ký tự có dấu thành ký tự cơ bản và dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu
    .toLowerCase()
    .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
    .replace(/[^\w-]+/g, '') // Xóa các ký tự không phải là chữ, số, hoặc gạch ngang
    .replace(/--+/g, '-') // Thay thế nhiều dấu gạch ngang bằng một
    .replace(/^-+/, '') // Xóa dấu gạch ngang ở đầu
    .replace(/-+$/, ''); // Xóa dấu gạch ngang ở cuối
};


const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  // Calculate KPI progress based on achieved months
  const latestKpiByContractMonth = project.kpiEntries.reduce((acc, entry) => {
    if (!acc[entry.contractMonth] || acc[entry.contractMonth].actualMonth < entry.actualMonth) {
        acc[entry.contractMonth] = entry;
    }
    return acc;
  }, {} as Record<string, KpiEntry>);

  const achievedKpiMonths = Object.values(latestKpiByContractMonth).filter(
      (entry: KpiEntry) => entry.kpiPercentage >= 75
  ).length;
  const kpiProgressPercentage = (achievedKpiMonths / project.durationMonths) * 100;

  // Calculate actual implementation progress
  const actualMonthsWorked = new Set(project.kpiEntries.map(e => e.actualMonth)).size;
  const actualDurationProgress = (actualMonthsWorked / project.durationMonths) * 100;

  // Calculate payment progress
  let paymentProgress = 0;
  let paymentPhaseText = '';
  let paymentValueText = '';

  const formatCurrency = (amount: number) => {
    const roundedAmount = Math.round(amount);
    if (roundedAmount >= 1_000_000_000) return `${(roundedAmount / 1_000_000_000).toFixed(0)}tỷ`;
    if (roundedAmount >= 1_000_000) return `${(roundedAmount / 1_000_000).toFixed(0)}tr`;
    if (roundedAmount >= 1_000) return `${(roundedAmount / 1_000).toFixed(0)}k`;
    return roundedAmount.toLocaleString('vi-VN');
  };

  if (project.paymentType === PaymentType.Milestone) {
    const totalPaidAmount = project.installments
      .filter(inst => inst.status === PaymentStatus.Paid)
      .reduce((sum, inst) => sum + (project.totalBudget * inst.paymentPercentage / 100), 0);
    
    paymentProgress = project.totalBudget > 0 ? (totalPaidAmount / project.totalBudget) * 100 : 0;
    
    const paidInstallments = project.installments.filter(inst => inst.status === PaymentStatus.Paid).length;
    const totalInstallments = project.installments.length;
    paymentPhaseText = `${paidInstallments}/${totalInstallments} đợt`;
    
    paymentValueText = `${formatCurrency(totalPaidAmount)} / ${formatCurrency(project.totalBudget)}`;

  } else { // Monthly
    const totalPaidMonths = project.monthlyBreakdown.filter(m => m.paymentStatus === PaymentStatus.Paid).length;
    paymentProgress = project.durationMonths > 0 ? (totalPaidMonths / project.durationMonths) * 100 : 0;
    paymentPhaseText = `${totalPaidMonths}/${project.durationMonths} tháng`;
    
    const monthlyAmount = project.durationMonths > 0 ? project.totalBudget / project.durationMonths : 0;
    const totalPaidAmount = totalPaidMonths * monthlyAmount;
    paymentValueText = `${formatCurrency(totalPaidAmount)} / ${formatCurrency(project.totalBudget)}`;
  }


  const getStatus = () => {
    const today = new Date();
    const endDate = new Date(project.endDate);
    if (endDate < today) {
        return { text: 'Đã kết thúc', color: 'bg-gray-500' };
    }
    return { text: 'Đang hoạt động', color: 'bg-green-500' };
  }

  const status = getStatus();
  const projectSlug = `${slugify(project.name)}--${project.id}`;

  return (
    <Link to={`/project/${projectSlug}`} className="block bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-primary mb-1">{project.name}</h3>
            <span className={`text-xs font-semibold text-white px-2 py-1 rounded-full ${status.color}`}>{status.text}</span>
        </div>
        <div className="flex items-center text-gray-500 text-sm mb-4">
            <UserIcon className="h-4 w-4 mr-2" />
            <span>{project.client}</span>
        </div>
        
        <div className="space-y-4 text-sm">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-dark flex items-center">
                        <DocumentReportIcon className="h-4 w-4 mr-2 text-gray-400" />
                        Tiến độ KPI
                    </span>
                    <span className="font-bold text-primary">{achievedKpiMonths}/{project.durationMonths} tháng</span>
                </div>
                <ProgressBar progress={kpiProgressPercentage} />
            </div>

            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-dark flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                        Triển khai thực tế
                    </span>
                     <span className="font-bold text-accent">{actualMonthsWorked}/{project.durationMonths} tháng</span>
                </div>
                <ProgressBar progress={actualDurationProgress} color="bg-accent" />
            </div>
            
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-dark flex items-center">
                        <CashIcon className="h-4 w-4 mr-2 text-gray-400" />
                        Thanh toán
                    </span>
                     <span className="font-bold text-green-600">{paymentPhaseText}</span>
                </div>
                <ProgressBar progress={paymentProgress} color="bg-green-500" />
                <div className="text-right text-xs text-gray-500 mt-1 font-medium">
                    {paymentValueText}
                </div>
            </div>
        </div>

      </div>
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1.5" />
                <span>Kết thúc: {format(new Date(project.endDate), 'dd/MM/yyyy')}</span>
            </div>
             <span className="text-primary font-semibold hover:underline">Xem chi tiết &rarr;</span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
