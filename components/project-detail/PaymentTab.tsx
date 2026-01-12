
import React, { useState, useRef, useMemo } from 'react';
import { Project, PaymentStatus, PaymentType, MonthlyProgress, PaymentInstallment } from '../../types';
import { PlusIcon, EyeIcon, UploadIcon, SpinnerIcon, XIcon } from '../Icons';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext';
import { Link } from 'react-router-dom';
import ImagePreviewModal from '../ImagePreviewModal';
import Button from '../ui/Button';

interface PaymentTabProps {
    project: Project;
    updateMonthlyPayment: (monthId: string, proofUrl: string) => Promise<void>;
    updateInstallmentPayment: (installmentId: string, proofUrl: string) => Promise<void>;
    fetchProjects: () => Promise<void>;
}

const ManageInstallmentsModal: React.FC<{isOpen: boolean; onClose: () => void; project: Project; fetchProjects: () => void}> = ({ isOpen, onClose, project, fetchProjects }) => {
    const [name, setName] = useState('');
    const [percentage, setPercentage] = useState<number | ''>('');
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const unassignedMonths = useMemo(() => {
        return project.monthlyBreakdown.filter(m => !m.installmentId);
    }, [project.monthlyBreakdown]);

    const currentTotalPercentage = useMemo(() => {
        return project.installments.reduce((sum, inst) => sum + inst.paymentPercentage, 0);
    }, [project.installments]);

    const resetForm = () => {
        setName('');
        setPercentage('');
        setSelectedMonths([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericPercentage = Number(percentage);

        if (!name.trim() || !percentage || numericPercentage <= 0 || numericPercentage > 100) {
            addToast('Tên đợt và tỷ lệ % phải hợp lệ.', 'error');
            return;
        }

        if (currentTotalPercentage + numericPercentage > 100) {
            addToast(`Tổng tỷ lệ các đợt không được vượt quá 100%. Hiện tại là ${currentTotalPercentage}%.`, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: newInstallment, error: insertError } = await supabase
                .from('payment_installments')
                .insert({
                    project_id: project.id,
                    name: name.trim(),
                    payment_percentage: numericPercentage,
                    status: PaymentStatus.Unpaid,
                })
                .select()
                .single();

            if (insertError) throw insertError;
            if (!newInstallment) throw new Error("Không thể tạo đợt thanh toán mới.");

            if (selectedMonths.length > 0) {
                const { error: updateError } = await supabase
                    .from('monthly_breakdown')
                    .update({ installment_id: newInstallment.id })
                    .in('id', selectedMonths);
                
                if (updateError) throw updateError;
            }

            addToast(`Đã thêm đợt "${name}" thành công!`, 'success');
            resetForm();
            await fetchProjects();
        } catch (error: any) {
            console.error("Error creating installment:", error);
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-dark">Quản lý các đợt thanh toán</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-8">
                    <form onSubmit={handleSubmit} className="p-4 border border-gray-200 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3">Thêm đợt mới</h3>
                         <div className="flex items-end gap-4">
                            <div className="flex-grow">
                                <label htmlFor="instName" className="block text-sm font-medium text-gray-700">Tên đợt</label>
                                <input type="text" id="instName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="VD: Đợt 1 - Tạm ứng" required />
                            </div>
                            <div className="w-32">
                                <label htmlFor="instPercent" className="block text-sm font-medium text-gray-700">Tỷ lệ (%)</label>
                                <input type="number" id="instPercent" value={percentage} onChange={e => setPercentage(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" min="1" max="100" required />
                            </div>
                        </div>
                        <div className="mt-4">
                             <label className="block text-sm font-medium text-gray-700 mb-2">Gán các tháng (tùy chọn)</label>
                             {unassignedMonths.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-gray-50">
                                    {unassignedMonths.map(month => (
                                        <label key={month.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                            <input type="checkbox" value={month.id} checked={selectedMonths.includes(month.id)} onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedMonths(prev => [...prev, month.id]);
                                                } else {
                                                    setSelectedMonths(prev => prev.filter(id => id !== month.id));
                                                }
                                            }} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"/>
                                            <span className="text-sm font-medium">T{month.month}</span>
                                        </label>
                                    ))}
                                </div>
                             ) : <p className="text-sm text-gray-500">Tất cả các tháng đã được gán.</p>}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button type="submit" isLoading={isSubmitting}>Thêm đợt</Button>
                        </div>
                    </form>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Các đợt hiện có ({currentTotalPercentage}%)</h3>
                        <div className="space-y-3">
                             {project.installments.length > 0 ? project.installments.sort((a,b) => a.name.localeCompare(b.name)).map(inst => (
                                <div key={inst.id} className="p-3 border rounded-md bg-gray-50 flex justify-between items-center">
                                    <div>
                                      <p className="font-semibold text-dark">{inst.name} - {inst.paymentPercentage}%</p>
                                      <p className="text-xs text-gray-500">Tháng: {project.monthlyBreakdown.filter(m => m.installmentId === inst.id).map(m=>`T${m.month}`).join(', ') || 'Chưa gán'}</p>
                                    </div>
                                </div>
                             )) : <p className="text-sm text-gray-500">Chưa có đợt nào.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaymentTab: React.FC<PaymentTabProps> = ({ project, updateMonthlyPayment, updateInstallmentPayment, fetchProjects }) => {
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'month' | 'installment' } | null>(null);
    const [uploadError, setUploadError] = useState<React.ReactNode | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    const handleInitiateMonthUpload = (month: MonthlyProgress) => {
        if (month.paymentStatus === PaymentStatus.Unpaid) {
            setSelectedItem({ id: month.id, type: 'month' });
            setUploadError(null); 
            fileInputRef.current?.click();
        }
    };
    
    const handleInitiateInstallmentUpload = (installment: PaymentInstallment) => {
        if (installment.status === PaymentStatus.Unpaid) {
            setSelectedItem({ id: installment.id, type: 'installment' });
            setUploadError(null); 
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedItem) return;

        const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!acceptedImageTypes.includes(file.type)) {
            addToast('Vui lòng chọn một file hình ảnh (JPEG, PNG, GIF, WEBP).', 'error');
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUpdatingItemId(selectedItem.id);
        setUploadError(null);

        try {
            const fileExtension = file.name.split('.').pop();
            const subFolder = selectedItem.type === 'installment' ? 'installments' : 'monthly';
            const filePath = `${project.id}/${subFolder}/${selectedItem.id}-${Date.now()}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from('payment_proofs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('payment_proofs')
                .getPublicUrl(filePath);
            
            if (!urlData?.publicUrl) throw new Error('Không thể lấy URL công khai cho tệp đã tải lên.');
            
            if (selectedItem.type === 'installment') {
                await updateInstallmentPayment(selectedItem.id, urlData.publicUrl);
            } else {
                await updateMonthlyPayment(selectedItem.id, urlData.publicUrl);
            }
            
        } catch (error: any) {
            console.error("Payment proof upload failed:", error);
            const errorMessage = error.message ? error.message.toLowerCase() : '';
            let userFriendlyError: React.ReactNode = (<span>Tải lên chứng từ thất bại: {error.message}. Vui lòng thử lại.</span>);

            if (errorMessage.includes('bucket not found')) {
                userFriendlyError = (<span><strong>Lỗi Cài Đặt:</strong> Bucket chưa được tạo. Xem hướng dẫn tại <Link to="/setup" className="underline">Cài đặt</Link>.</span>);
            } else if (errorMessage.includes('security policy') || errorMessage.includes('rls')) {
                 userFriendlyError = (<span><strong>Lỗi Quyền:</strong> Kiểm tra policy bucket. Xem hướng dẫn tại <Link to="/setup" className="underline">Cài đặt</Link>.</span>);
            }
            
            setUploadError(userFriendlyError);
            addToast('Tải lên thất bại. Vui lòng xem chi tiết lỗi.', 'error');

        } finally {
            setUpdatingItemId(null);
            setSelectedItem(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (project.paymentType === PaymentType.Milestone) {
        const getAssignedMonths = (installmentId: string) => {
            return project.monthlyBreakdown
                .filter(m => m.installmentId === installmentId)
                .map(m => `T${m.month}`)
                .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
                .join(', ');
        };

        return (
            <>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/png, image/jpeg, image/gif, image/webp" />
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                        <h2 className="text-xl font-bold text-dark">Các đợt thanh toán</h2>
                        <Button onClick={() => setIsManageModalOpen(true)} icon={<PlusIcon className="h-5 w-5" />}>
                            Quản lý các đợt
                        </Button>
                    </div>

                    {uploadError && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg" role="alert">
                            <h3 className="font-bold text-lg mb-2">Không thể tải lên chứng từ</h3>
                            <div className="text-sm">{uploadError}</div>
                        </div>
                    )}
                    
                    {project.installments.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {project.installments.sort((a,b) => a.name.localeCompare(b.name)).map(installment => {
                                const amount = (project.totalBudget * installment.paymentPercentage) / 100;
                                const isPaid = installment.status === PaymentStatus.Paid;
                                const isUpdating = updatingItemId === installment.id;
                                const assignedMonthsText = getAssignedMonths(installment.id);

                                return (
                                    <div key={installment.id} className={`border rounded-lg p-4 flex flex-col justify-between text-center min-h-[240px] transition-shadow hover:shadow-md ${isPaid ? 'bg-green-50' : 'bg-white'}`}>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-700">{installment.name}</h4>
                                            <p className="text-sm font-semibold text-gray-500 mb-2">({installment.paymentPercentage}%)</p>
                                            
                                            <span className={`px-3 py-1 mb-3 inline-flex text-sm leading-5 font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {installment.status}
                                            </span>

                                            <p className="text-primary font-semibold text-xl my-2">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)}</p>
                                            
                                            <p className="text-xs text-gray-500 mt-1 h-8">
                                                {assignedMonthsText ? `Áp dụng: ${assignedMonthsText}` : 'Chưa gán tháng'}
                                            </p>
                                        </div>
                                        
                                        <div className="w-full mt-auto pt-3">
                                            {isUpdating ? (
                                                <Button className="w-full" disabled isLoading>Đang xử lý...</Button>
                                            ) : isPaid && installment.paymentProofUrl ? (
                                                <Button variant="secondary" className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200" icon={<EyeIcon className="h-5 w-5" />} onClick={() => setPreviewImageUrl(installment.paymentProofUrl!)}>
                                                    Xem chứng từ
                                                </Button>
                                            ) : isPaid && !installment.paymentProofUrl ? (
                                                <p className="text-sm text-gray-500">Đã TT (không có CT)</p>
                                            ) : (
                                                <Button className="w-full" icon={<UploadIcon className="h-5 w-5" />} onClick={() => handleInitiateInstallmentUpload(installment)}>
                                                    Đánh dấu Đã TT
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-gray-500">Chưa có đợt thanh toán nào được thiết lập.</p>
                            <Button onClick={() => setIsManageModalOpen(true)} className="mt-4">Thiết lập ngay</Button>
                        </div>
                    )}
                </div>
                <ManageInstallmentsModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    project={project}
                    fetchProjects={fetchProjects}
                />
            </>
        )
    }

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/png, image/jpeg, image/gif, image/webp" />
                <h2 className="text-xl font-bold text-dark mb-4">Tình trạng thanh toán theo tháng</h2>

                {uploadError && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg" role="alert">
                        <h3 className="font-bold text-lg mb-2">Không thể tải lên chứng từ</h3>
                        <div className="text-sm">{uploadError}</div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {project.monthlyBreakdown.sort((a,b) => a.month - b.month).map(month => {
                        const isPaid = month.paymentStatus === PaymentStatus.Paid;
                        const isUpdating = updatingItemId === month.id;
                        const hasProof = !!month.paymentProofUrl;
                        const monthlyAmount = project.durationMonths > 0 ? project.totalBudget / project.durationMonths : 0;

                        return (
                            <div key={month.id} className={`border rounded-lg p-4 flex flex-col justify-between text-center min-h-[200px] transition-shadow hover:shadow-md ${isPaid ? 'bg-green-50' : 'bg-white'}`}>
                                <div>
                                    <p className="font-bold text-lg text-slate-700">Tháng {month.month}</p>
                                    <p className="text-primary font-semibold text-lg my-2">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(monthlyAmount)}</p>
                                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {month.paymentStatus}
                                    </span>
                                </div>
                                
                                <div className="w-full mt-auto pt-3">
                                    {isUpdating ? (
                                        <Button className="w-full" disabled isLoading>Đang xử lý...</Button>
                                    ) : isPaid && hasProof ? (
                                        <Button variant="secondary" className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200" icon={<EyeIcon className="h-5 w-5" />} onClick={() => setPreviewImageUrl(month.paymentProofUrl!)}>
                                            Xem chứng từ
                                        </Button>
                                    ) : isPaid && !hasProof ? (
                                        <p className="text-sm text-gray-500">Đã TT (không có CT)</p>
                                    ) : (
                                        <Button className="w-full" icon={<UploadIcon className="h-5 w-5" />} onClick={() => handleInitiateMonthUpload(month)}>
                                            Đánh dấu Đã TT
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <ImagePreviewModal isOpen={!!previewImageUrl} imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
        </>
    );
};

export default PaymentTab;
