

import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import ProjectCard from './ProjectCard';
import AddProjectModal from './AddProjectModal';
import { PlusIcon } from './Icons';

interface DashboardProps {
  projects: Project[];
  addProject: (newProjectData: Omit<Project, 'id' | 'endDate' | 'monthlyBreakdown' | 'kpiEntries' | 'installments' | 'lookerStudioUrl' | 'assignments'>) => Promise<void>;
}

type SortByType = 'startDateDesc' | 'startDateAsc' | 'clientAsc';

const Dashboard: React.FC<DashboardProps> = ({ projects, addProject }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortByType>('startDateDesc');

  const sortedProjects = useMemo(() => {
    const sorted = [...projects];
    switch (sortBy) {
      case 'startDateAsc':
        sorted.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        break;
      case 'clientAsc':
        sorted.sort((a, b) => a.client.localeCompare(b.client));
        break;
      case 'startDateDesc':
      default:
        sorted.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        break;
    }
    return sorted;
  }, [projects, sortBy]);

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-dark">Danh sách dự án</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <select 
            id="sort" 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortByType)}
            className="block w-full sm:w-auto px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm"
          >
            <option value="startDateDesc">Mới nhất</option>
            <option value="startDateAsc">Cũ nhất</option>
            <option value="clientAsc">Tên khách hàng</option>
          </select>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-shrink-0 flex items-center bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Thêm dự án</span>
            <span className="sm:hidden">Thêm</span>
          </button>
        </div>
      </div>
      
      {sortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <h2 className="text-xl text-gray-500">Chưa có dự án nào.</h2>
          <p className="mt-2 text-gray-400">Nhấn "Thêm dự án mới" để bắt đầu.</p>
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