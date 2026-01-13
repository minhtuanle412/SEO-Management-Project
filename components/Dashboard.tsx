
import React, { useState, useMemo, useEffect } from 'react';
import { Project, PaymentStatus, PaymentType, Staff, DeletionRequest } from '../types';
import ProjectCard from './ProjectCard';
import AddProjectModal from './AddProjectModal';
import { PlusIcon, SearchIcon, FilterIcon, UserIcon, XCircleIcon, CheckCircleIcon } from './Icons';
import { addMonths, isPast, differenceInDays, format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';

interface DashboardProps {
  projects: Project[];
  addProject: (newProjectData: Omit<Project, 'id' | 'endDate' | 'monthlyBreakdown' | 'kpiEntries' | 'installments' | 'lookerStudioUrl' | 'assignments'>) => Promise<void>;
}

type SortByType = 'startDateDesc' | 'startDateAsc' | 'clientAsc';
type StatusFilterType = 'all' | 'running' | 'finished' | 'ending_soon';
type DebtFilterType = 'all' | 'has_debt';

const Dashboard: React.FC<DashboardProps> = ({ projects, addProject }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortByType>('startDateDesc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [debtFilter, setDebtFilter] = useState<DebtFilterType>('all');
  const [leaderFilter, setLeaderFilter] = useState<string>('all');
  
  // Deletion Request State
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const { isManager, user } = useAuth();
  const { addToast } = useToast();

  const fetchDeletionRequests = async () => {
      if (!isManager) return;
      setLoadingRequests(true);
      try {
          const { data, error } = await supabase
            .from('project_deletion_requests')
            .select(`
                *,
                project:projects(name, client),
                requester_profile:profiles(full_name, email)
            `);
          if (error) throw error;
          setDeletionRequests(data as any); // Cast because of joins
      } catch (err) {
          console.error("Error fetching deletion requests", err);
      } finally {
          setLoadingRequests(false);
      }
  };

  useEffect(() => {
      if (isManager) {
          fetchDeletionRequests();
      }
  }, [isManager]);

  const handleApproveDelete = async (requestId: string, projectId: string) => {
      if (!window.confirm("Hành động này sẽ XÓA VĨNH VIỄN dự án và tất cả dữ liệu liên quan. Bạn có chắc chắn không?")) return;
      try {
          // Deleting the project will cascade delete the request due to FK constraints
          const { error } = await supabase.from('projects').delete().match({ id: projectId });
          if (error) throw error;
          
          addToast('Đã xóa dự án thành công.', 'success');
          // Update local state
          setDeletionRequests(prev => prev.filter(r => r.id !== requestId));
          // Refresh page or trigger a parent refresh would be ideal, but for now we rely on auto-refetch or simple UI update
          window.location.reload(); 
      } catch (err: any) {
          addToast(`Lỗi xóa dự án: ${err.message}`, 'error');
      }
  };

  const handleRejectDelete = async (requestId: string) => {
      try {
          const { error } = await supabase.from('project_deletion_requests').delete().match({ id: requestId });
          if (error) throw error;
          
          addToast('Đã từ chối yêu cầu xóa.', 'success');
          setDeletionRequests(prev => prev.filter(r => r.id !== requestId));
      } catch (err: any) {
          addToast(`Lỗi: ${err.message}`, 'error');
      }
  };

  // Lấy danh sách các Leader duy nhất từ dữ liệu phân công của các dự án
  const availableLeaders = useMemo(() => {
    const leadersMap = new Map<string, Staff>();
    projects.forEach(p => {
        if (p.assignments) {
            p.assignments.forEach(a => {
                // Lọc theo yêu cầu: Chức vụ có chứa từ "Leader" (VD: Leader Phòng PSP)
                if (a.nhan_su?.chuc_vu?.name && a.nhan_su.chuc_vu.name.toLowerCase().includes('leader')) {
                    leadersMap.set(a.nhan_su.id, a.nhan_su);
                }
            });
        }
    });
    return Array.from(leadersMap.values()).sort((a, b) => a.ho_ten.localeCompare(b.ho_ten));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    const now = new Date();

    // 1. Search (Search logic)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) || 
        p.client.toLowerCase().includes(lowerTerm)
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(p => {
        const endDate = new Date(p.endDate);
        if (statusFilter === 'finished') return endDate < now;
        if (statusFilter === 'running') return endDate >= now;
        if (statusFilter === 'ending_soon') {
            const daysLeft = differenceInDays(endDate, now);
            return daysLeft >= 0 && daysLeft <= 30; 
        }
        return true;
      });
    }

    // 3. Debt Filter (Has overdue payments)
    if (debtFilter === 'has_debt') {
        result = result.filter(p => {
            const startDate = new Date(p.startDate);
            // Check monthly breakdown items
            return p.monthlyBreakdown.some(m => {
                // Estimated "due date" for this month index.
                // e.g. Month 1 => start date + 1 month.
                const monthDate = addMonths(startDate, m.month); 
                
                // If this month is in the past, it should be paid.
                if (isPast(monthDate)) {
                    if (p.paymentType === PaymentType.Monthly) {
                        return m.paymentStatus === PaymentStatus.Unpaid;
                    } else if (p.paymentType === PaymentType.Milestone && m.installmentId) {
                         const installment = p.installments.find(i => i.id === m.installmentId);
                         return installment?.status === PaymentStatus.Unpaid;
                    }
                }
                return false;
            });
        });
    }

    // 4. Leader Filter
    if (leaderFilter !== 'all') {
        result = result.filter(p => 
            p.assignments && p.assignments.some(a => a.nhan_su_id === leaderFilter)
        );
    }

    // 5. Sort
    switch (sortBy) {
      case 'startDateAsc':
        result.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        break;
      case 'clientAsc':
        result.sort((a, b) => a.client.localeCompare(b.client));
        break;
      case 'startDateDesc':
      default:
        result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        break;
    }
    return result;
  }, [projects, searchTerm, statusFilter, debtFilter, leaderFilter, sortBy]);

  return (
    <div className="container mx-auto">
      {/* DELETION REQUESTS SECTION (Managers Only) */}
      {isManager && deletionRequests.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-100 p-2 rounded-full">
                      <XCircleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-red-800">Yêu cầu xóa dự án cần phê duyệt ({deletionRequests.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deletionRequests.map(req => {
                      const isMyRequest = req.requested_by === user?.id;
                      return (
                          <div key={req.id} className="bg-white p-4 rounded-lg shadow border border-red-100 flex flex-col">
                              <div className="mb-3">
                                  <h3 className="font-bold text-gray-800 text-lg">{req.project?.name || 'Tên dự án ẩn'}</h3>
                                  <p className="text-sm text-gray-600">{req.project?.client}</p>
                              </div>
                              <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                                  <p><strong>Người yêu cầu:</strong> {req.requester_profile?.full_name || req.requester_profile?.email}</p>
                                  <p><strong>Ngày:</strong> {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}</p>
                              </div>
                              <div className="mt-auto pt-2 border-t flex gap-2">
                                  {isMyRequest ? (
                                      <div className="w-full text-center text-sm font-semibold text-orange-600 bg-orange-50 py-2 rounded">
                                          Đang chờ Manager khác duyệt
                                      </div>
                                  ) : (
                                      <>
                                          <Button 
                                            variant="danger" 
                                            size="sm" 
                                            className="flex-1" 
                                            onClick={() => handleApproveDelete(req.id, req.project_id)}
                                          >
                                              Duyệt Xóa
                                          </Button>
                                          <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            className="flex-1"
                                            onClick={() => handleRejectDelete(req.id)}
                                          >
                                              Từ chối
                                          </Button>
                                      </>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-dark">Danh sách dự án</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex-shrink-0 flex items-center bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 w-full sm:w-auto justify-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          <span>Thêm dự án mới</span>
        </button>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col gap-4">
            {/* Row 1: Search - Full Width */}
            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Tìm kiếm theo tên dự án, khách hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Row 2: Filters - Flex Wrap */}
            <div className="flex flex-wrap gap-3 items-center">
                
                {/* Leader Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <UserIcon className="h-5 w-5 text-gray-500 hidden sm:block flex-shrink-0" />
                    <select
                        value={leaderFilter}
                        onChange={(e) => setLeaderFilter(e.target.value)}
                        className="block w-full pl-3 pr-8 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                        <option value="all">Tất cả Leader</option>
                        {availableLeaders.map(leader => (
                            <option key={leader.id} value={leader.id}>
                                {leader.ho_ten}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <FilterIcon className="h-5 w-5 text-gray-500 hidden sm:block flex-shrink-0" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
                        className="block w-full pl-3 pr-8 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="running">Đang chạy</option>
                        <option value="ending_soon">Sắp kết thúc (&lt;30 ngày)</option>
                        <option value="finished">Đã kết thúc</option>
                    </select>
                </div>

                {/* Debt Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        value={debtFilter}
                        onChange={(e) => setDebtFilter(e.target.value as DebtFilterType)}
                        className={`block w-full pl-3 pr-8 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${debtFilter === 'has_debt' ? 'border-red-300 bg-red-50 text-red-800 font-medium' : 'border-gray-300 bg-white'}`}
                    >
                        <option value="all">Tất cả công nợ</option>
                        <option value="has_debt">Đang nợ phí</option>
                    </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2 w-full sm:w-auto ml-auto sm:ml-0 md:ml-auto lg:ml-0">
                    <span className="text-sm text-gray-500 whitespace-nowrap hidden lg:inline">Sắp xếp:</span>
                    <select 
                        id="sort" 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortByType)}
                        className="block w-full pl-3 pr-8 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                        <option value="startDateDesc">Mới nhất</option>
                        <option value="startDateAsc">Cũ nhất</option>
                        <option value="clientAsc">Tên khách hàng</option>
                    </select>
                </div>
            </div>
        </div>
      </div>
      
      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl text-gray-500">Không tìm thấy dự án nào phù hợp.</h2>
          <p className="mt-2 text-gray-400">Vui lòng thử lại với từ khóa hoặc bộ lọc khác.</p>
          <button 
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDebtFilter('all'); setLeaderFilter('all'); }}
            className="mt-4 text-primary hover:underline font-medium"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddProject={addProject}
      />
    </div>
  );
};

export default Dashboard;
