
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SpinnerIcon, ShieldCheckIcon } from './Icons';
import { format } from 'date-fns';

const UserManagementPage: React.FC = () => {
    const { profile: currentUserProfile, user } = useAuth();
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchProfiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data as UserProfile[]);
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
        if (!user) return;
        
        // Prevent self-demotion
        if (targetUserId === user.id && newRole !== 'admin') {
            if (!window.confirm("CẢNH BÁO: Bạn đang tự hạ quyền của chính mình. Sau khi thực hiện, bạn sẽ mất quyền truy cập vào trang này. Bạn có chắc chắn không?")) {
                return;
            }
        }

        setUpdatingId(targetUserId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', targetUserId);

            if (error) throw error;
            
            // Optimistic update
            setProfiles(prev => prev.map(p => p.id === targetUserId ? { ...p, role: newRole } : p));
            addToast('Cập nhật quyền thành công!', 'success');
        } catch (err: any) {
            addToast(`Lỗi khi cập nhật quyền: ${err.message}`, 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <SpinnerIcon className="h-8 w-8 text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                <h3 className="font-bold">Lỗi tải dữ liệu</h3>
                <p>{error}</p>
                <p className="text-sm mt-2">Vui lòng đảm bảo bạn đã chạy script cập nhật Database (Bước 8) trong Hướng dẫn cài đặt.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-dark mb-6 flex items-center">
                <ShieldCheckIcon className="h-8 w-8 text-primary mr-3" />
                Quản lý Tài khoản & Phân quyền
            </h1>
            
            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Họ và tên</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày tham gia</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vai trò</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {profiles.map(profile => (
                            <tr key={profile.id} className={profile.id === user?.id ? "bg-blue-50" : ""}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {profile.email}
                                    {profile.id === user?.id && <span className="ml-2 text-xs text-blue-600 font-bold">(Bạn)</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {profile.full_name || '—'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {profile.created_at ? format(new Date(profile.created_at), 'dd/MM/yyyy') : '—'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {updatingId === profile.id ? (
                                        <div className="flex items-center text-gray-500">
                                            <SpinnerIcon className="h-4 w-4 mr-2" /> Đang lưu...
                                        </div>
                                    ) : (
                                        <select 
                                            value={profile.role} 
                                            onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                                            className={`block w-full max-w-[150px] px-3 py-1.5 text-sm border rounded-md focus:ring-primary focus:border-primary ${
                                                profile.role === 'admin' ? 'bg-purple-100 border-purple-300 text-purple-800 font-semibold' :
                                                profile.role === 'manager' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                                                'bg-gray-50 border-gray-300 text-gray-700'
                                            }`}
                                            disabled={!currentUserProfile?.role || currentUserProfile.role !== 'admin'}
                                        >
                                            <option value="staff">Staff</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600">
                <h3 className="font-bold text-gray-800 mb-2">Ghi chú về phân quyền:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Admin:</strong> Có toàn quyền truy cập hệ thống, quản lý tài khoản, chỉnh sửa cấu hình (nhân sự, hoa hồng).</li>
                    <li><strong>Manager:</strong> Xem được tất cả các báo cáo, quản lý dự án, nhưng không được chỉnh sửa cấu hình hệ thống.</li>
                    <li><strong>Staff:</strong> Chỉ xem được danh sách dự án và báo cáo (theo thiết kế hiện tại).</li>
                </ul>
            </div>
        </div>
    );
};

export default UserManagementPage;
