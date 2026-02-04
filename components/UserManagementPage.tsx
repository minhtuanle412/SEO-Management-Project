
import React, { useEffect, useState } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SpinnerIcon, ShieldCheckIcon, PlusIcon, TrashIcon, KeyIcon, PencilIcon } from './Icons';
import { format } from 'date-fns';
import Button from './ui/Button';

// Modal for adding new user
const AddUserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('staff');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const { isSuperAdmin } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const tempClient = createClient(supabaseUrl, supabaseAnonKey);
            const { data, error } = await tempClient.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                },
            });

            if (error) throw error;

            if (data.user) {
                if (role !== 'staff') {
                     const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ role })
                        .eq('id', data.user.id);
                     if (updateError) console.warn("Could not set initial role:", updateError);
                }
                addToast('Tạo tài khoản thành công!', 'success');
                onSuccess();
                onClose();
                setEmail('');
                setPassword('');
                setFullName('');
            }
        } catch (err: any) {
            addToast(`Lỗi tạo tài khoản: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-dark mb-4">Thêm tài khoản mới</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Tối thiểu 6 ký tự" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 block w-full px-3 py-2 border rounded-md">
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Hủy</Button>
                            <Button type="submit" isLoading={isLoading}>Tạo tài khoản</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Modal for Editing User (Including Active Password Reset)
const EditUserModal: React.FC<{
    user: UserProfile | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ user, isOpen, onClose, onSuccess }) => {
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('staff');
    const [newPassword, setNewPassword] = useState('');
    const [serviceKey, setServiceKey] = useState('');
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const { profile: currentUserProfile, isSuperAdmin } = useAuth();

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setRole(user.role);
            setNewPassword('');
            setShowPasswordSection(false);
            // Auto-fill service key from session storage if available
            setServiceKey(sessionStorage.getItem('service_role_key') || '');
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Update Profile (Standard Info)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ 
                    full_name: fullName,
                    role: role
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. Handle Password Reset (If requested)
            if (newPassword) {
                if (!serviceKey) {
                    throw new Error("Cần nhập Service Role Key để đổi mật khẩu người dùng khác.");
                }

                // Initialize Admin Client
                const adminClient = createClient(supabaseUrl, serviceKey);
                
                // Active Password Update
                const { error: authError } = await adminClient.auth.admin.updateUserById(
                    user.id,
                    { password: newPassword }
                );

                if (authError) {
                    if (authError.message.includes('JWT')) {
                        throw new Error("Service Role Key không hợp lệ.");
                    }
                    throw authError;
                }
                
                // Save key to session storage for convenience
                sessionStorage.setItem('service_role_key', serviceKey);
                addToast('Đã cập nhật thông tin và mật khẩu thành công.', 'success');
            } else {
                addToast('Đã cập nhật thông tin thành công.', 'success');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            addToast(`Lỗi cập nhật: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const isSelf = user.id === currentUserProfile?.id;
    
    // Logic: Only Super Admin can set someone to Super Admin
    // And users cannot change their own role in the modal (prevents lock-out)

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-dark mb-4">Chỉnh sửa tài khoản</h2>
                    <p className="text-sm text-gray-500 mb-4">Email: {user.email}</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                            <select 
                                value={role} 
                                onChange={e => setRole(e.target.value as UserRole)} 
                                className="mt-1 block w-full px-3 py-2 border rounded-md"
                                disabled={isSelf}
                            >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                            </select>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <button 
                                type="button" 
                                onClick={() => setShowPasswordSection(!showPasswordSection)}
                                className="text-primary text-sm font-semibold flex items-center hover:underline"
                            >
                                {showPasswordSection ? 'Ẩn đổi mật khẩu' : 'Đổi mật khẩu chủ động'}
                            </button>
                            
                            {showPasswordSection && (
                                <div className="mt-3 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
                                        <input 
                                            type="text" 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                            className="mt-1 block w-full px-3 py-2 border rounded-md bg-white" 
                                            placeholder="Nhập mật khẩu mới..."
                                        />
                                    </div>
                                    <div className="mb-1">
                                        <label className="block text-xs font-bold text-red-700 uppercase">Service Role Key (Yêu cầu)</label>
                                        <input 
                                            type="password" 
                                            value={serviceKey} 
                                            onChange={e => setServiceKey(e.target.value)} 
                                            className="mt-1 block w-full px-3 py-2 border border-red-300 rounded-md bg-white text-xs" 
                                            placeholder="Paste khóa bí mật Supabase..."
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            Lưu ý: Để đổi mật khẩu người khác mà không cần email cũ, bạn cần quyền truy cập cấp cao (Service Role) của Supabase. Khóa này có thể tìm thấy trong Settings {'>'} API.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Hủy</Button>
                            <Button type="submit" isLoading={isLoading}>Lưu thay đổi</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Generic Confirm Modal
const ConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isDanger?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, isDanger = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className={`text-lg font-bold mb-3 ${isDanger ? 'text-red-600' : 'text-gray-900'}`}>{title}</h3>
                <p className="text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button variant={isDanger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>Xác nhận</Button>
                </div>
            </div>
        </div>
    );
};

const UserManagementPage: React.FC = () => {
    const { profile: currentUserProfile, user, isSuperAdmin } = useAuth();
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // Edit Modal State
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDanger?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

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

    // --- DELETE USER LOGIC ---
    const handleDeleteUserClick = (targetProfile: UserProfile) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa tài khoản',
            message: `CẢNH BÁO QUAN TRỌNG: Bạn sắp xóa tài khoản "${targetProfile.email}".\n\n- User này sẽ KHÔNG THỂ đăng nhập vào hệ thống nữa.\n- Dữ liệu liên quan có thể bị ảnh hưởng.\n\nBạn có chắc chắn muốn tiếp tục?`,
            onConfirm: () => performDeleteUser(targetProfile),
            isDanger: true
        });
    };

    const performDeleteUser = async (targetProfile: UserProfile) => {
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', targetProfile.id);
            if (error) throw error;
            setProfiles(prev => prev.filter(p => p.id !== targetProfile.id));
            addToast('Đã xóa tài khoản khỏi hệ thống.', 'success');
        } catch (err: any) {
            addToast(`Lỗi xóa: ${err.message}`, 'error');
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
                <p className="text-sm mt-2">Vui lòng chạy lại Script Cập nhật Database trong trang Hướng dẫn Cài đặt.</p>
            </div>
        );
    }

    // Role hierarchy check
    const canManageUser = (targetUser: UserProfile) => {
        if (!currentUserProfile) return false;
        
        // 1. Super Admin can manage everyone
        if (isSuperAdmin) return true;

        // 2. Cannot manage Super Admins
        if (targetUser.role === 'super_admin') return false;

        // 3. Admin can manage others (except Super Admins)
        if (currentUserProfile.role === 'admin') return true;

        // 4. Regular users can't manage anyone (UI shouldn't even show this page, but safe check)
        return false;
    };

    return (
        <div className="container mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-dark flex items-center">
                    <ShieldCheckIcon className="h-8 w-8 text-primary mr-3" />
                    Quản lý Tài khoản
                </h1>
                <Button onClick={() => setIsAddModalOpen(true)} icon={<PlusIcon className="h-5 w-5" />}>
                    Thêm tài khoản
                </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Họ và tên</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày tham gia</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vai trò</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {profiles.map(profile => {
                            const isSelf = profile.id === user?.id;
                            const hasPermission = canManageUser(profile) || isSelf;

                            return (
                                <tr key={profile.id} className={isSelf ? "bg-blue-50" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {profile.email}
                                        {isSelf && <span className="ml-2 text-xs text-blue-600 font-bold">(Bạn)</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {profile.full_name || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {profile.created_at ? format(new Date(profile.created_at), 'dd/MM/yyyy') : '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            profile.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                            profile.role === 'admin' ? 'bg-indigo-100 text-indigo-800' :
                                            profile.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {profile.role === 'super_admin' ? 'Super Admin' : 
                                            profile.role === 'admin' ? 'Admin' : 
                                            profile.role === 'manager' ? 'Manager' : 'Staff'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            {/* Edit Button */}
                                            <button 
                                                type="button"
                                                onClick={() => setEditingUser(profile)}
                                                className={`p-2 rounded-full transition-colors ${
                                                    hasPermission 
                                                    ? "text-gray-500 hover:text-blue-600 hover:bg-blue-50" 
                                                    : "text-gray-300 cursor-not-allowed"
                                                }`}
                                                title={hasPermission ? "Chỉnh sửa / Đổi mật khẩu" : "Không đủ quyền hạn"}
                                                disabled={!hasPermission}
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            
                                            {/* Delete Button - Cannot delete self */}
                                            {!isSelf && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteUserClick(profile)}
                                                    className={`p-2 rounded-full transition-colors ${
                                                        hasPermission 
                                                        ? "text-gray-500 hover:text-red-600 hover:bg-red-50" 
                                                        : "text-gray-300 cursor-not-allowed"
                                                    }`}
                                                    title={hasPermission ? "Xóa tài khoản" : "Không đủ quyền hạn"}
                                                    disabled={!hasPermission}
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600">
                <h3 className="font-bold text-gray-800 mb-2">Ghi chú quản trị:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Phân quyền:</strong> Super Admin có thể quản lý tất cả. Admin không thể xóa hoặc sửa Super Admin.</li>
                    <li><strong>Edit (Bút chì):</strong> Cho phép sửa Họ tên, Vai trò và cấp lại mật khẩu chủ động.</li>
                    <li><strong>Mật khẩu:</strong> Cần Service Role Key để đổi mật khẩu người khác mà không cần email xác nhận.</li>
                </ul>
            </div>

            <AddUserModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSuccess={fetchProfiles} 
            />

            <EditUserModal 
                isOpen={!!editingUser}
                user={editingUser}
                onClose={() => setEditingUser(null)}
                onSuccess={fetchProfiles}
            />
            
            <ConfirmModal 
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({...prev, isOpen: false}))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                isDanger={confirmState.isDanger}
            />
        </div>
    );
};

export default UserManagementPage;
