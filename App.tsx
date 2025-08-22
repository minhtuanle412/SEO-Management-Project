import React, { useState, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Project, MonthlyProgress, PaymentStatus, ReportStatus, KpiEntry } from './types';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import Header from './components/Header';
import { addMonths, format } from 'date-fns';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const initialDate = new Date();
    const startDate = format(initialDate, 'yyyy-MM-dd');
    const endDate = format(addMonths(initialDate, 5), 'yyyy-MM-dd');

    const prj1StartDate = new Date(startDate);
    const prj3StartDate = new Date('2023-07-01');


    return [
      {
        id: 'prj-1',
        name: 'SEO Tổng thể cho Acme Corp',
        client: 'Acme Corporation',
        startDate: startDate,
        endDate: endDate,
        durationMonths: 6,
        monthlyBreakdown: [
          { month: 1, paymentStatus: PaymentStatus.Paid },
          { month: 2, paymentStatus: PaymentStatus.Paid },
          { month: 3, paymentStatus: PaymentStatus.Paid },
          { month: 4, paymentStatus: PaymentStatus.Unpaid },
          { month: 5, paymentStatus: PaymentStatus.Unpaid },
          { month: 6, paymentStatus: PaymentStatus.Unpaid },
        ],
        kpiEntries: [
          { id: 'kpi1-1', contractMonth: 1, actualMonth: format(prj1StartDate, 'yyyy-MM'), kpiPercentage: 100, reportStatus: ReportStatus.Sent, reportSentDate: format(addMonths(prj1StartDate, 0), 'yyyy-MM-15'), notes: 'Hoàn thành tốt các mục tiêu ban đầu.' },
          { id: 'kpi1-2', contractMonth: 2, actualMonth: format(addMonths(prj1StartDate, 1), 'yyyy-MM'), kpiPercentage: 95, reportStatus: ReportStatus.Sent, reportSentDate: format(addMonths(prj1StartDate, 1), 'yyyy-MM-15'), notes: '' },
          { id: 'kpi1-3', contractMonth: 3, actualMonth: format(addMonths(prj1StartDate, 2), 'yyyy-MM'), kpiPercentage: 80, reportStatus: ReportStatus.NotSent, notes: 'Cần đẩy mạnh keyword top 10' },
        ]
      },
       {
        id: 'prj-2',
        name: 'Chiến dịch SEO Ecommerce',
        client: 'Global Mart',
        startDate: format(addMonths(initialDate, -2), 'yyyy-MM-dd'),
        endDate: format(addMonths(initialDate, 9), 'yyyy-MM-dd'),
        durationMonths: 12,
        monthlyBreakdown: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          paymentStatus: i < 2 ? PaymentStatus.Paid : PaymentStatus.Unpaid,
        })),
        kpiEntries: Array.from({ length: 2 }, (_, i) => {
          const prj2StartDate = addMonths(initialDate, -2);
          return {
            id: `kpi2-${i+1}`,
            contractMonth: i + 1,
            actualMonth: format(addMonths(prj2StartDate, i), 'yyyy-MM'),
            kpiPercentage: 100-i*5,
            reportStatus: ReportStatus.Sent,
            reportSentDate: format(addMonths(prj2StartDate, i), 'yyyy-MM-15'),
            notes: '',
          };
        }),
      },
      {
        id: 'prj-3',
        name: 'Tối ưu hóa SEO cho Tech Innovators',
        client: 'Tech Innovators Inc.',
        startDate: format(prj3StartDate, 'yyyy-MM-dd'),
        endDate: format(addMonths(prj3StartDate, 9), 'yyyy-MM-dd'),
        durationMonths: 10,
        monthlyBreakdown: Array.from({ length: 10 }, (_, i) => ({
          month: i + 1,
          paymentStatus: i < 5 ? PaymentStatus.Paid : PaymentStatus.Unpaid,
        })),
        kpiEntries: [
          { id: 'kpi3-1', contractMonth: 1, actualMonth: format(addMonths(prj3StartDate, 0), 'yyyy-MM'), kpiPercentage: 90, reportStatus: ReportStatus.Sent, notes: 'Khởi đầu tốt.' },
          { id: 'kpi3-2', contractMonth: 2, actualMonth: format(addMonths(prj3StartDate, 1), 'yyyy-MM'), kpiPercentage: 95, reportStatus: ReportStatus.Sent, notes: '' },
          { id: 'kpi3-3', contractMonth: 3, actualMonth: format(addMonths(prj3StartDate, 2), 'yyyy-MM'), kpiPercentage: 100, reportStatus: ReportStatus.Sent, notes: '' },
          { id: 'kpi3-4', contractMonth: 4, actualMonth: format(addMonths(prj3StartDate, 3), 'yyyy-MM'), kpiPercentage: 88, reportStatus: ReportStatus.Sent, notes: '' },
          { id: 'kpi3-5', contractMonth: 5, actualMonth: format(addMonths(prj3StartDate, 4), 'yyyy-MM'), kpiPercentage: 92, reportStatus: ReportStatus.Sent, notes: '' },
          { id: 'kpi3-6', contractMonth: 6, actualMonth: format(addMonths(prj3StartDate, 5), 'yyyy-MM'), kpiPercentage: 85, reportStatus: ReportStatus.Sent, notes: 'Vừa đủ chỉ tiêu.' },
          { id: 'kpi3-7a', contractMonth: 7, actualMonth: format(addMonths(prj3StartDate, 6), 'yyyy-MM'), kpiPercentage: 70, reportStatus: ReportStatus.NotSent, notes: 'Gặp khó khăn với nhóm từ khóa chính.' },
          { id: 'kpi3-7b', contractMonth: 7, actualMonth: format(addMonths(prj3StartDate, 7), 'yyyy-MM'), kpiPercentage: 75, reportStatus: ReportStatus.NotSent, notes: 'Cải thiện nhưng chưa đạt.' },
          { id: 'kpi3-8a', contractMonth: 8, actualMonth: format(addMonths(prj3StartDate, 8), 'yyyy-MM'), kpiPercentage: 65, reportStatus: ReportStatus.NotSent, notes: '' },
          { id: 'kpi3-8b', contractMonth: 8, actualMonth: format(addMonths(prj3StartDate, 9), 'yyyy-MM'), kpiPercentage: 80, reportStatus: ReportStatus.NotSent, notes: 'Tiến bộ hơn.' },
          { id: 'kpi3-9a', contractMonth: 9, actualMonth: format(addMonths(prj3StartDate, 10), 'yyyy-MM'), kpiPercentage: 50, reportStatus: ReportStatus.NotSent, notes: 'Cần thay đổi chiến lược.' },
          { id: 'kpi3-9b', contractMonth: 9, actualMonth: format(addMonths(prj3StartDate, 11), 'yyyy-MM'), kpiPercentage: 60, reportStatus: ReportStatus.NotSent, notes: '' },
        ],
      }
    ];
  });

  const addProject = useCallback((newProjectData: Omit<Project, 'id' | 'endDate' | 'monthlyBreakdown' | 'kpiEntries'>) => {
    const startDate = new Date(newProjectData.startDate);
    const endDate = addMonths(startDate, newProjectData.durationMonths - 1);

    const newProject: Project = {
      ...newProjectData,
      id: `prj-${Date.now()}`,
      endDate: format(endDate, 'yyyy-MM-dd'),
      monthlyBreakdown: Array.from({ length: newProjectData.durationMonths }, (_, i) => ({
        month: i + 1,
        paymentStatus: PaymentStatus.Unpaid,
      })),
      kpiEntries: [],
    };
    setProjects(prevProjects => [...prevProjects, newProject]);
  }, []);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prevProjects =>
      prevProjects.map(p => (p.id === updatedProject.id ? updatedProject : p))
    );
  }, []);

  return (
    <HashRouter>
      <div className="min-h-screen bg-light text-dark font-sans">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard projects={projects} addProject={addProject} />} />
            <Route path="/project/:projectId" element={<ProjectDetail projects={projects} updateProject={updateProject} />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
