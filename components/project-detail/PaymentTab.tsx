
import React, { useState, useRef, useMemo } from 'react';
import { Project, PaymentStatus, PaymentType, MonthlyProgress, PaymentInstallment } from '../../types';
import { PlusIcon, EyeIcon, UploadIcon, XIcon, CalendarIcon } from '../Icons';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext';
import { Link } from 'react-router-dom';
import ImagePreviewModal from '../ImagePreviewModal';
import Button from '../ui/Button';
import { format } from 'date-fns';

interface PaymentTabProps {
    project: Project;
    updateMonthlyPayment: (monthId: string, paymentDate: string, proofUrl?: string) => Promise<void>;
    updateInstallmentPayment: (installmentId: string, paymentDate: string, proofUrl?: string) => Promise<void>;
    fetchProjects: () => Promise<void>;
}

const PaymentUpdateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: string, file: File | null) => Promise<void>;
    isProcessing: boolean;
    title: string;
}> = ({ isOpen, onClose, onConfirm, isProcessing, title }) => {
    const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onConfirm(paymentDate, file);
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold text-dark">{title}</h3>
                    <button onClick={onClose} disabled={isProcessing} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày thanh toán</label>
                        <input 
                            type="date" 
                            required 
                            value={paymentDate} 
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Chọn ngày khách hàng thực tế chuyển khoản.</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh chứng từ (Tùy chọn)</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Có thể bỏ qua nếu nhập liệu nhanh.</p>
                    </div>

                    <div className="flex justify-end pt-4 gap-2">
                        <Button variant="secondary" type="button" onClick={onClose} disabled={isProcessing}>Hủy</Button>
                        <Button type="submit" isLoading={isProcessing}>Xác nhận thanh toán</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


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
    const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'month' | 'installment'; name: string } | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const { addToast } = useToast();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    // Open Modal instead of File Input directly
    const handleInitiateMonthUpload = (month: MonthlyProgress) => {
        if (month.paymentStatus === PaymentStatus.Unpaid) {
            setSelectedItem({ id: month.id, type: 'month', name: `Tháng ${month.month}` });
        }
    };
    
    const handleInitiateInstallmentUpload = (installment: PaymentInstallment) => {
        if (installment.status === PaymentStatus.Unpaid) {
            setSelectedItem({ id: installment.id, type: 'installment', name: installment.name });
        }
    };

    const handleConfirmPayment = async (paymentDate: string, file: File | null) => {
        if (!selectedItem) return;
        setUpdatingItemId(selectedItem.id);

        try {
            let proofUrl: string | undefined = undefined;

            if (file) {
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
                
                proofUrl = urlData?.publicUrl;
            }

            if (selectedItem.type === 'installment') {
                await updateInstallmentPayment(selectedItem.id, paymentDate, proofUrl);
            } else {
                await updateMonthlyPayment(selectedItem.id, paymentDate, proofUrl);
            }
            
        } catch (error: any) {
            console.error("Payment update failed:", error);
            addToast(`Lỗi cập nhật: ${error.message}`, 'error');
        } finally {
            setUpdatingItemId(null);
            setSelectedItem(null);
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                        <h2 className="text-xl font-bold text-dark">Các đợt thanh toán</h2>
                        <Button onClick={() => setIsManageModalOpen(true)} icon={<PlusIcon className="h-5 w-5" />}>
                            Quản lý các đợt
                        </Button>
                    </div>
                    
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
                                            
                                            {isPaid && installment.paymentDate && (
                                                <p className="text-xs text-gray-500 flex justify-center items-center gap-1">
                                                    <CalendarIcon className="h-3 w-3" />
                                                    {format(new Date(installment.paymentDate), 'dd/MM/yyyy')}
                                                </p>
                                            )}

                                            <p className="text-xs text-gray-500 mt-1 h-8">
                                                {assignedMonthsText ? `Áp dụng: ${assignedMonthsText}` : 'Chưa gán tháng'}
                                            </p>
                                        </div>
                                        
                                        <div className="w-full mt-auto pt-3">
                                            {isUpdating ? (
                                                <Button className="w-full" disabled isLoading>Đang xử lý...</Button>
                                            ) : isPaid ? (
                                                installment.paymentProofUrl ? (
                                                     <Button variant="secondary" className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200" icon={<EyeIcon className="h-5 w-5" />} onClick={() => setPreviewImageUrl(installment.paymentProofUrl!)}>
                                                        Xem chứng từ
                                                    </Button>
                                                ) : <p className="text-sm text-gray-500 italic">Đã xác nhận nhanh</p>
                                            ) : (
                                                <Button className="w-full" icon={<UploadIcon className="h-5 w-5" />} onClick={() => handleInitiateInstallmentUpload(installment)}>
                                                    Cập nhật thanh toán
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
                 <PaymentUpdateModal
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onConfirm={handleConfirmPayment}
                    isProcessing={!!updatingItemId}
                    title={selectedItem?.name || 'Thanh toán'}
                />
            </>
        )
    }

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-dark mb-4">Tình trạng thanh toán theo tháng</h2>

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
                                    {isPaid && month.paymentDate && (
                                        <p className="text-xs text-gray-500 flex justify-center items-center gap-1 mt-2">
                                            <CalendarIcon className="h-3 w-3" />
                                            {format(new Date(month.paymentDate), 'dd/MM/yyyy')}
                                        </p>
                                    )}
                                </div>
                                
                                <div className="w-full mt-auto pt-3">
                                    {isUpdating ? (
                                        <Button className="w-full" disabled isLoading>Đang xử lý...</Button>
                                    ) : isPaid ? (
                                         hasProof ? (
                                            <Button variant="secondary" className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200" icon={<EyeIcon className="h-5 w-5" />} onClick={() => setPreviewImageUrl(month.paymentProofUrl!)}>
                                                Xem chứng từ
                                            </Button>
                                         ) : <p className="text-sm text-gray-500 italic">Đã xác nhận nhanh</p>
                                    ) : (
                                        <Button className="w-full" icon={<UploadIcon className="h-5 w-5" />} onClick={() => handleInitiateMonthUpload(month)}>
                                            Cập nhật thanh toán
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <ImagePreviewModal isOpen={!!previewImageUrl} imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
            <PaymentUpdateModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                onConfirm={handleConfirmPayment}
                isProcessing={!!updatingItemId}
                title={selectedItem?.name || 'Thanh toán'}
            />
        </>
    );
};

export default PaymentTab;
