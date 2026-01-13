
import React from 'react';
import { Project } from '../../types';
import { XCircleIcon, ShieldCheckIcon } from '../Icons';
import Button from '../ui/Button';

interface SettingsTabProps {
    project: Project;
    isManager: boolean;
    isDeletionRequested: boolean;
    isRequestingDelete: boolean;
    handleRequestDelete: () => Promise<void>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ 
    project, 
    isManager, 
    isDeletionRequested, 
    isRequestingDelete, 
    handleRequestDelete 
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-dark mb-4">Thông tin chung</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                        <label className="block text-gray-500 font-medium mb-1">Tên dự án</label>
                        <p className="text-dark font-semibold text-lg">{project.name}</p>
                    </div>
                    <div>
                        <label className="block text-gray-500 font-medium mb-1">Khách hàng</label>
                        <p className="text-dark font-semibold text-lg">{project.client}</p>
                    </div>
                    <div>
                        <label className="block text-gray-500 font-medium mb-1">Ngày bắt đầu</label>
                        <p className="text-dark">{project.startDate}</p>
                    </div>
                    <div>
                        <label className="block text-gray-500 font-medium mb-1">Ngày kết thúc dự kiến</label>
                        <p className="text-dark">{project.endDate}</p>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 italic">
                        * Để chỉnh sửa tên dự án, vui lòng nhấn vào biểu tượng bút chì bên cạnh tên dự án ở phía trên cùng.
                    </p>
                </div>
            </div>

            {/* Danger Zone */}
            {isManager && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 overflow-hidden">
                    <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center">
                        <XCircleIcon className="h-5 w-5 mr-2" />
                        Khu vực nguy hiểm
                    </h3>
                    <p className="text-gray-600 mb-6 text-sm">
                        Các hành động dưới đây sẽ ảnh hưởng nghiêm trọng đến dữ liệu dự án và không thể hoàn tác ngay lập tức.
                    </p>

                    <div className="bg-red-50 p-4 rounded-md border border-red-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h4 className="font-bold text-red-800 text-sm">Xóa dự án này</h4>
                            <p className="text-xs text-red-600 mt-1 max-w-md">
                                Sau khi xóa, toàn bộ dữ liệu về KPI, thanh toán, báo cáo và hoa hồng liên quan đến dự án này sẽ bị mất vĩnh viễn. Hành động này cần sự phê duyệt của một Manager khác.
                            </p>
                        </div>
                        
                        {isDeletionRequested ? (
                            <div className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-semibold border border-yellow-200">
                                <ShieldCheckIcon className="h-5 w-5 mr-2" />
                                Đang chờ duyệt xóa
                            </div>
                        ) : (
                            <Button 
                                variant="danger" 
                                onClick={handleRequestDelete} 
                                isLoading={isRequestingDelete}
                                className="whitespace-nowrap"
                            >
                                Yêu cầu xóa dự án
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsTab;
