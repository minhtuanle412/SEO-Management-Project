
import React, { useState } from 'react';
import { Project } from '../types';
import ProjectCard from './ProjectCard';
import AddProjectModal from './AddProjectModal';
import { PlusIcon } from './Icons';

interface DashboardProps {
  projects: Project[];
  addProject: (newProjectData: Omit<Project, 'id' | 'endDate' | 'monthlyBreakdown' | 'kpiEntries'>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, addProject }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">Bảng điều khiển dự án</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Thêm dự án mới
        </button>
      </div>
      
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
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