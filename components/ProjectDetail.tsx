import React, { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, MonthlyProgress, PaymentStatus, ReportStatus, KpiEntry } from '../types';
import { ArrowLeftIcon, CheckCircleIcon } from './Icons';
import { format } from 'date-fns';

interface ProjectDetailProps {
  projects: Project[];
  updateProject: (updatedProject: Project) => void;
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

const KpiManagementView: React.FC<{ project: Project; updateProject: (p: Project) => void; }> = ({ project, updateProject }) => {
    const [contractMonth, setContractMonth] = useState('');
    const [actualMonth, setActualMonth] = useState('');
    const [kpiRate, setKpiRate] = useState('');
    const [notes, setNotes] = useState('');
    const [sendReport, setSendReport] = useState(false);

    const handleAddKpi = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const monthNum = parseInt(contractMonth, 10);
        const rate = parseInt(kpiRate, 10);

        if (isNaN(monthNum) || monthNum < 1 || monthNum > project.durationMonths || !actualMonth || isNaN(rate) || rate < 0 || rate > 100) {
            alert('Vui lòng nhập thông tin hợp lệ. Tháng hợp đồng phải trong khoảng thời gian dự án và các trường khác không được để trống.');
            return;
        }

        const newKpiEntry: KpiEntry = {
            id: `kpi-${Date.now()}`,
            contractMonth: monthNum,
            actualMonth: actualMonth,
            kpiPercentage: rate,
            notes: notes,
            reportStatus: sendReport ? ReportStatus.Sent : ReportStatus.NotSent,
            reportSentDate: sendReport ? format(new Date(), 'yyyy-MM-dd') : undefined,
        };

        const updatedKpiEntries = [...project.kpiEntries, newKpiEntry];

        updateProject({ ...project, kpiEntries: updatedKpiEntries });
        
        setContractMonth('');
        setActualMonth('');
        setKpiRate('');
        setNotes('');
        setSendReport(false);
    }, [contractMonth, actualMonth, kpiRate, notes, sendReport, project, updateProject]);

    const kpiEntriesSorted = [...project.kpiEntries].sort((a, b) => b.actualMonth.localeCompare(a.actualMonth) || a.contractMonth - b.contractMonth);
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-dark mb-4">Thêm KPI tháng mới</h2>
                <form onSubmit={handleAddKpi}>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-grow" style={{minWidth: '120px'}}>
                            <label htmlFor="contractMonth" className="block text-sm font-medium text-gray-700">Tháng hợp đồng</label>
                            <input type="number" id="contractMonth" value={contractMonth} onChange={e => setContractMonth(e.target.value)} placeholder="VD: 1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>
                        <div className="flex-grow" style={{minWidth: '150px'}}>
                            <label htmlFor="actualMonth" className="block text-sm font-medium text-gray-700">Tháng thực tế (YYYY-MM)</label>
                            <input type="month" id="actualMonth" value={actualMonth} onChange={e => setActualMonth(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>
                        <div className="flex-grow" style={{minWidth: '120px'}}>
                            <label htmlFor="kpiRate" className="block text-sm font-medium text-gray-700">Tỷ lệ đạt KPI (%)</label>
                            <input type="number" id="kpiRate" value={kpiRate} onChange={e => setKpiRate(e.target.value)} placeholder="VD: 85" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" min="0" max="100"/>
                        </div>
                         <div className="flex-grow" style={{minWidth: '180px'}}>
                            <label htmlFor="kpiNotes" className="block text-sm font-medium text-gray-700">Ghi chú</label>
                            <input type="text" id="kpiNotes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="VD: Đẩy mạnh keyword top 10" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                        </div>
                        <div className="flex-shrink-0">
                            <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 w-full sm:w-auto">Thêm KPI</button>
                        </div>
                    </div>
                     <div className="mt-4 flex items-center">
                        <input id="sendReport" name="sendReport" type="checkbox" checked={sendReport} onChange={e => setSendReport(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
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
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày gửi</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Đã thu tiền</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {kpiEntriesSorted.length > 0 ? (
                                kpiEntriesSorted.map(kpiEntry => {
                                    const paymentInfo = project.monthlyBreakdown.find(m => m.month === kpiEntry.contractMonth);
                                    const paymentStatus = paymentInfo ? paymentInfo.paymentStatus : PaymentStatus.Unpaid;

                                    return (
                                    <tr key={kpiEntry.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tháng {kpiEntry.contractMonth}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{kpiEntry.actualMonth}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-primary">{kpiEntry.kpiPercentage}%</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${kpiEntry.reportStatus === ReportStatus.Sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{kpiEntry.reportStatus}</span></td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{kpiEntry.reportSentDate ? format(new Date(kpiEntry.reportSentDate), 'dd/MM/yyyy') : '–'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${paymentStatus === PaymentStatus.Paid ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{paymentStatus}</span></td>
                                    </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">Chưa có dữ liệu KPI nào được thêm.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
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

                        const isAchieved = hasData && latestKpi && latestKpi.kpiPercentage >= 85;

                        let cardClasses = 'border rounded-lg p-3 text-center flex flex-col justify-center items-center h-32 transition-all duration-200 ';
                        let statusContent = null;

                        if (isAchieved) {
                            cardClasses += 'bg-green-50 border-green-300';
                            statusContent = (
                                <>
                                    <p className="text-2xl font-bold text-green-800 my-1">{latestKpi!.kpiPercentage}%</p>
                                    <CheckCircleIcon className="h-6 w-6 text-green-500 mt-1" />
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
                            statusContent = <p className="text-sm text-gray-500 mt-1">Chưa có</p>;
                        }

                        return (
                            <div key={monthData.month} className={cardClasses}>
                                <p className="font-bold text-base text-slate-700">T{monthData.month}</p>
                                {statusContent}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projects, updateProject }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState('kpi');
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Không tìm thấy dự án</h2>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">
          <ArrowLeftIcon className="h-4 w-4 mr-2 inline"/>Quay lại Bảng điều khiển
        </Link>
      </div>
    );
  }

  const TABS = {
      kpi: { label: 'Quản lý KPI', component: <KpiManagementView project={project} updateProject={updateProject} /> },
      payment: { label: 'Quản lý thanh toán', component: <div className="p-8 bg-white rounded-lg shadow-sm border text-center text-gray-500">Giao diện quản lý thanh toán sẽ sớm được cập nhật.</div> },
      report: { label: 'Quản lý báo cáo', component: <div className="p-8 bg-white rounded-lg shadow-sm border text-center text-gray-500">Giao diện quản lý báo cáo sẽ sớm được cập nhật.</div> }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-dark">{project.name}</h1>
        <Link to="/" className="inline-flex items-center text-primary hover:text-blue-700 font-semibold text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Quay lại Bảng điều khiển
        </Link>
      </div>
      
      <div role="tablist" className="border-b border-gray-200">
        <nav className="flex space-x-2">
            {Object.entries(TABS).map(([key, {label}]) => (
                 <TabButton key={key} label={label} isActive={activeTab === key} onClick={() => setActiveTab(key)} />
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
