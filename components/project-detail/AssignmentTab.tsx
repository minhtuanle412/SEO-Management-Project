
import React, { useState, useMemo } from 'react';
import { Project, Staff } from '../../types';
import { PlusIcon, XIcon, PencilIcon, SpinnerIcon } from '../Icons';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext';
import Button from '../ui/Button';

interface AssignmentTabProps {
    project: Project;
    allStaff: Staff[];
    refetchData: () => Promise<void>;
}

const AssignmentTab: React.FC<AssignmentTabProps> = ({ project, allStaff, refetchData }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [effortPercentage, setEffortPercentage] = useState<number>(100);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for editing
    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
    const [editEffortPercentage, setEditEffortPercentage] = useState<number>(100);

    const { addToast } = useToast();

    const assignedStaffIds = useMemo(() => new Set(project.assignments.map(a => a.nhan_su_id)), [project.assignments]);
    const unassignedStaff = useMemo(() => allStaff.filter(s => !assignedStaffIds.has(s.id)), [allStaff, assignedStaffIds]);

    const handleAddAssignment = async () => {
        if (!selectedStaffId) {
            addToast('Vui lòng chọn một nhân sự.', 'error');
            return;
        }
        if (effortPercentage < 0 || effortPercentage > 100) {
            addToast('Tỷ lệ đóng góp phải từ 0 đến 100%.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('phan_cong_du_an').insert({
                project_id: project.id,
                nhan_su_id: selectedStaffId,
                ty_le_phan_cong: effortPercentage
            });
            if (error) throw error;
            addToast('Phân công nhân sự thành công!', 'success');
            await refetchData();
            setIsAdding(false);
            setSelectedStaffId('');
            setEffortPercentage(100);
        } catch (error: any) {
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phân công này?')) return;
        try {
            const { error } = await supabase.from('phan_cong_du_an').delete().match({ id: assignmentId });
            if (error) throw error;
            addToast('Đã xóa phân công.', 'success');
            await refetchData();
        } catch (error: any) {
            addToast(`Lỗi: ${error.message}`, 'error');
        }
    };
    
    const handleStartEdit = (assignmentId: string, currentPercentage: number) => {
        setEditingAssignmentId(assignmentId);
        setEditEffortPercentage(currentPercentage || 100);
    };
    
    const handleCancelEdit = () => {
        setEditingAssignmentId(null);
    };
    
    const handleSaveEdit = async (assignmentId: string) => {
        if (editEffortPercentage < 0 || editEffortPercentage > 100) {
            addToast('Tỷ lệ đóng góp phải từ 0 đến 100%.', 'error');
            return;
        }
        
        try {
            const { error } = await supabase
                .from('phan_cong_du_an')
                .update({ ty_le_phan_cong: editEffortPercentage })
                .match({ id: assignmentId });
                
            if (error) throw error;
            addToast('Đã cập nhật tỷ lệ đóng góp.', 'success');
            await refetchData();
            setEditingAssignmentId(null);
        } catch (error: any) {
            addToast(`Lỗi: ${error.message}`, 'error');
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-dark">Nhân sự phụ trách</h2>
                {!isAdding && (
                    <Button onClick={() => setIsAdding(true)} icon={<PlusIcon className="h-5 w-5" />}>
                        Thêm phân công
                    </Button>
                )}
            </div>
            
            {isAdding && (
                <div className="p-4 border rounded-lg bg-gray-50 mb-6 flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex-grow w-full">
                        <label htmlFor="staff-select" className="block text-sm font-medium text-gray-700">Chọn nhân sự</label>
                        <select
                            id="staff-select"
                            value={selectedStaffId}
                            onChange={e => setSelectedStaffId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            disabled={isSubmitting}
                        >
                            <option value="">-- Chọn nhân sự --</option>
                            {unassignedStaff.map(staff => (
                                <option key={staff.id} value={staff.id}>{staff.ho_ten} ({staff.chuc_vu.name})</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full sm:w-32">
                         <label htmlFor="effort-percent" className="block text-sm font-medium text-gray-700">% Đóng góp</label>
                         <input 
                            type="number" 
                            id="effort-percent"
                            value={effortPercentage}
                            onChange={e => setEffortPercentage(Number(e.target.value))}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                            min="0"
                            max="100"
                         />
                    </div>
                    <div className="flex-shrink-0 flex gap-2 w-full sm:w-auto">
                        <Button onClick={handleAddAssignment} isLoading={isSubmitting} className="flex-1 sm:flex-none">
                            Lưu
                        </Button>
                        <Button variant="secondary" onClick={() => setIsAdding(false)} disabled={isSubmitting} className="flex-1 sm:flex-none">
                            Hủy
                        </Button>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {project.assignments.length > 0 ? (
                    project.assignments.map(assignment => (
                        <div key={assignment.id} className="relative group bg-light p-4 rounded-lg border border-gray-200 text-center">
                            <h4 className="font-bold text-dark">{assignment.nhan_su.ho_ten}</h4>
                            <p className="text-sm text-gray-500 mb-1">{assignment.nhan_su.chuc_vu.name}</p>
                            
                            {editingAssignmentId === assignment.id ? (
                                <div className="mt-2 flex items-center justify-center gap-1">
                                    <input 
                                        type="number" 
                                        value={editEffortPercentage}
                                        onChange={e => setEditEffortPercentage(Number(e.target.value))}
                                        className="w-16 px-1 py-1 text-center text-sm border rounded"
                                        min="0" max="100"
                                    />
                                    <span className="text-sm">%</span>
                                    <button onClick={() => handleSaveEdit(assignment.id)} className="text-green-600 hover:text-green-800 ml-1 font-bold text-sm">Lưu</button>
                                    <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700 ml-1 text-sm">Hủy</button>
                                </div>
                            ) : (
                                <div className="mt-2 flex items-center justify-center gap-2 group/edit">
                                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        Đóng góp: {assignment.ty_le_phan_cong ?? 100}%
                                    </span>
                                    <button 
                                        onClick={() => handleStartEdit(assignment.id, assignment.ty_le_phan_cong ?? 100)}
                                        className="text-gray-400 hover:text-primary opacity-0 group-hover/edit:opacity-100 transition-opacity"
                                        title="Chỉnh sửa tỷ lệ"
                                    >
                                        <PencilIcon className="h-3 w-3" />
                                    </button>
                                </div>
                            )}

                            <p className="text-xs font-semibold text-gray-400 mt-2">{assignment.nhan_su.phong_ban.name}</p>
                            
                            <button onClick={() => handleRemoveAssignment(assignment.id)} className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50" title="Xóa nhân sự">
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        Chưa có nhân sự nào được phân công cho dự án này.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignmentTab;
