
import React, { useState } from 'react';
import { Project } from '../../types';
import { SpinnerIcon } from '../Icons';
import { useToast } from '../../contexts/ToastContext';
import Button from '../ui/Button';

interface PerformanceTabProps {
  project: Project;
  updateLookerStudioUrl: (projectId: string, url: string | null) => Promise<void>;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ project, updateLookerStudioUrl }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(project.lookerStudioUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const handleSave = async () => {
    if (!url.trim().startsWith('https://lookerstudio.google.com/embed/reporting/')) {
        addToast('Vui lòng nhập một URL nhúng hợp lệ từ Looker Studio.', 'error');
        return;
    }
    setIsSaving(true);
    await updateLookerStudioUrl(project.id, url.trim());
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleRemove = async () => {
    setIsSaving(true);
    await updateLookerStudioUrl(project.id, null);
    setIsSaving(false);
    setUrl('');
  };
  
  const handleStartEditing = () => {
    setUrl(project.lookerStudioUrl || '');
    setIsEditing(true);
  }

  if (project.lookerStudioUrl && !isEditing) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-dark">Báo cáo hiệu suất Looker Studio</h2>
                <div className="flex items-center gap-2">
                    <button onClick={handleStartEditing} className="text-sm font-semibold text-primary hover:text-blue-700">Chỉnh sửa</button>
                    <button onClick={handleRemove} disabled={isSaving} className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:text-gray-400">
                        {isSaving ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
                <iframe
                    width="100%"
                    height="800"
                    src={project.lookerStudioUrl}
                    frameBorder="0"
                    style={{ border: 0 }}
                    allowFullScreen
                    sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-forms allow-popups"
                    title={`Báo cáo hiệu suất cho ${project.name}`}
                ></iframe>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-dark mb-4">
            {isEditing ? 'Chỉnh sửa URL báo cáo' : 'Nhúng báo cáo Looker Studio'}
        </h2>
        <p className="text-gray-600 mb-4">
            Dán URL <span className="font-semibold">nhúng (embed)</span> từ báo cáo Looker Studio của bạn vào đây. Bạn có thể tìm thấy URL này trong tùy chọn 'Chia sẻ' {'>'} 'Nhúng báo cáo'.
        </p>
        <div className="flex items-start gap-2">
            <div className="flex-grow">
                <label htmlFor="looker-url" className="sr-only">Looker Studio URL</label>
                <input
                    id="looker-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://lookerstudio.google.com/embed/reporting/..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    disabled={isSaving}
                />
            </div>
            <Button onClick={handleSave} isLoading={isSaving}>Lưu</Button>
            {isEditing && (
                <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>Hủy</Button>
            )}
        </div>
    </div>
  );
};

export default PerformanceTab;
