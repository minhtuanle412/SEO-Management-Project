
import React, { useState, useCallback } from 'react';
import { Project, KpiEntry, ReportStatus, CommissionStatus, PaymentType, PaymentStatus } from '../../types';
import { CheckCircleIcon, SpinnerIcon } from '../Icons';
import { format, addMonths } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import Button from '../ui/Button';

interface KpiTabProps {
    project: Project;
    addKpiEntry: (projectId: string, entry: Omit<KpiEntry, 'id' | 'commissionStatus' | 'commissionPaidDate'>) => Promise<void>;
}

const KpiTab: React.FC<KpiTabProps> = ({ project, addKpiEntry }) => {
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
            actualMonth: `${actualMonth}-01`,
            kpiPercentage: rate,
            notes: notes,
            reportStatus: sendReport ? ReportStatus.Sent : ReportStatus.NotSent,
            reportSentDate: sendReport ? format(new Date(), 'yyyy-MM-dd') : undefined,
            customerConfirmationUrl: undefined,
        };

        await addKpiEntry(project.id, newKpiEntry);
        
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
                            <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
                                Thêm KPI
                            </Button>
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

export default KpiTab;
