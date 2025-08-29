import React, { useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, MonthlyProgress, PaymentStatus, ReportStatus, KpiEntry } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, SpinnerIcon, DocumentTextIcon, UploadIcon, EyeIcon, PencilIcon } from './Icons';
import { format, addMonths } from 'date-fns';
import { useToast } from '../App';
import { supabase } from '../lib/supabaseClient';
import ImagePreviewModal from './ImagePreviewModal';


interface ProjectDetailProps {
  projects: Project[];
  addKpiEntry: (projectId: string, newEntryData: Omit<KpiEntry, 'id'>) => Promise<void>;
  updateMonthlyPayment: (monthId: string, proofUrl: string) => Promise<void>;
  updateKpiEntry: (kpiEntryId: string, updates: Partial<Pick<KpiEntry, 'reportStatus' | 'reportSentDate'>>) => Promise<void>;
  updateKpiConfirmation: (kpiEntryId: string, confirmationUrl: string) => Promise<void>;
  updateProjectName: (projectId: string, newName: string) => Promise<void>;
}

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`py-3 px-5 text-base font-medium focus:outline-none transition-colors duration-200 ${
      isActive
        ? 'border-b-2 border-primary text-primary'
        : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
    role="tab"
    aria-selected={isActive}
  >
    {label}
  </button>
);

const KpiManagementView: React.FC<{ project: Project; addKpiEntry: (projectId: string, entry: Omit<KpiEntry, 'id'>) => Promise<void> }> = ({ project, addKpiEntry }) => {
    const [contractMonth, setContractMonth] = useState('');
    const [actualMonth, setActualMonth] = useState('');
    const [kpiRate, setKpiRate] = useState('');
    const [notes, setNotes] = useState('');
    const [sendReport, setSendReport] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const handleAddKpi = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const monthNum = parseInt(contractMonth, 10);
        const rate = parseInt(kpiRate, 10);

        if (isNaN(monthNum) || monthNum < 1 || monthNum > project.durationMonths || !actualMonth || isNaN(rate) || rate < 0 || rate > 100) {
            addToast('Vui lòng nhập thông tin hợp lệ cho tất cả các trường.', 'error');
            return;
        }

        setIsSubmitting(true);
        const newKpiEntry: Omit<KpiEntry, 'id'> = {
            contractMonth: monthNum,
            actualMonth: `${actualMonth}-01`, // Fix: Ensure date is in YYYY-MM-DD format for Supabase
            kpiPercentage: rate,
            notes: notes,
            reportStatus: sendReport ? ReportStatus.Sent : ReportStatus.NotSent,
            reportSentDate: sendReport ? format(new Date(), 'yyyy-MM-dd') : undefined,
        };

        await addKpiEntry(project.id, newKpiEntry);
        
        // UX Improvement: Auto-increment month fields for faster data entry
        const nextContractMonth = monthNum + 1;
        if (nextContractMonth <= project.durationMonths) {
            setContractMonth(String(nextContractMonth));
            const [year, month] = actualMonth.split('-').map(Number);
            const currentActualDate = new Date(year, month - 1, 1);
            const nextActualMonthDate = addMonths(currentActualDate, 1);
            setActualMonth(format(nextActualMonthDate, 'yyyy-MM'));
        } else {
            setContractMonth('');
            setActualMonth('');
        }

        setKpiRate('');
        setNotes('');
        setSendReport(false);
        setIsSubmitting(false);
    }, [contractMonth, actualMonth, kpiRate, notes, sendReport, project, addKpiEntry, addToast]);

    const kpiEntriesSorted = [...project.kpiEntries].sort((a, b) => b.actualMonth.localeCompare(a.actualMonth) || a.contractMonth - b.contractMonth);
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-dark mb-4">Chi tiết từng tháng hợp đồng:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {project.monthlyBreakdown.sort((a, b) => a.month - b.month).map(monthData => {
                        const relevantKpis = project.kpiEntries.filter(k => k.contractMonth === monthData.month);
                        const hasData = relevantKpis.length > 0;
                        let latestKpi: KpiEntry | null = null;
                        
                        if (hasData) {
                            relevantKpis.sort((a, b) => b.actualMonth.localeCompare(a.actualMonth));
                            latestKpi = relevantKpis[0];
                        }

                        const isAchieved = hasData && latestKpi && latestKpi.kpiPercentage >= 75;
                        const isPaid = monthData.paymentStatus === PaymentStatus.Paid;

                        let cardClasses = 'border rounded-lg p-3 text-center flex flex-col justify-between items-center h-36 transition-all duration-200 ';
                        let statusContent = null;

                        if (isAchieved) {
                            cardClasses += 'bg-green-50 border-green-300';
                            statusContent = (
                                <>
                                    <p className="text-2xl font-bold text-green-800 my-1">{latestKpi!.kpiPercentage}%</p>
                                    <CheckCircleIcon className="h-6 w-6 text-green-500 mt-1" />
                                </>
                            );
                        } else if (hasData) {
                            cardClasses += 'bg-orange-50 border-orange-400';
                            statusContent = (
                                <>
                                    <p className="text-2xl font-bold text-orange-800 my-1">{latestKpi!.kpiPercentage}%</p>
                                    <p className="text-xs font-semibold text-orange-600 mt-1">Chưa đạt</p>
                                </>
                            );
                        } else {
                            cardClasses += 'bg-gray-100 border-gray-200';
                            statusContent = <p className="text-sm text-gray-500 mt-1">Chưa có KPI</p>;
                        }

                        return (
                            <div key={monthData.month} className={cardClasses}>
                                <div>
                                    <p className="font-bold text-base text-slate-700">T{monthData.month}</p>
                                    {statusContent}
                                </div>
                                <div className="pt-2">
                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${isPaid ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                        {monthData.paymentStatus}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-dark mb-4">Thêm KPI tháng mới</h2>
                <form onSubmit={handleAddKpi}>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-grow" style={{minWidth: '120px'}}>
                            <label htmlFor="contractMonth" className="block text-sm font-medium text-gray-700">Tháng hợp đồng</label>
                            <input type="number" id="contractMonth" value={contractMonth} onChange={e => setContractMonth(e.target.value)} placeholder="VD: 1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" disabled={isSubmitting}/>
                        </div>
                        <div className="flex-grow" style={{minWidth: '150px'}}>
                            <label htmlFor="actualMonth" className="block text-sm font-medium text-gray-700">Tháng thực tế (YYYY-MM)</label>
                            <input type="month" id="actualMonth" value={actualMonth} onChange={e => setActualMonth(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" disabled={isSubmitting}/>
                        </div>
                        <div className="flex-grow" style={{minWidth: '120px'}}>
                            <label htmlFor="kpiRate" className="block text-sm font-medium text-gray-700">Tỷ lệ đạt KPI (%)</label>
                            <input type="number" id="kpiRate" value={kpiRate} onChange={e => setKpiRate(e.target.value)} placeholder="VD: 85" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" min="0" max="100" disabled={isSubmitting}/>
                        </div>
                         <div className="flex-grow" style={{minWidth: '180px'}}>
                            <label htmlFor="kpiNotes" className="block text-sm font-medium text-gray-700">Ghi chú</label>
                            <input type="text" id="kpiNotes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="VD: Đẩy mạnh keyword top 10" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" disabled={isSubmitting}/>
                        </div>
                        <div className="flex-shrink-0">
                            <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 w-full sm:w-auto disabled:bg-blue-300" disabled={isSubmitting}>
                                {isSubmitting ? <SpinnerIcon className="h-5 w-5" /> : 'Thêm KPI'}
                            </button>
                        </div>
                    </div>
                     <div className="mt-4 flex items-center">
                        <input id="sendReport" name="sendReport" type="checkbox" checked={sendReport} onChange={e => setSendReport(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" disabled={isSubmitting}/>
                        <label htmlFor="sendReport" className="ml-2 block text-sm text-gray-900">Đã gửi báo cáo (sẽ tự điền ngày hôm nay)</label>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng HĐ</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng Tế</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tỷ lệ đạt KPI</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái Báo cáo</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày gửi</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">KH Confirm</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {kpiEntriesSorted.length > 0 ? (
                                kpiEntriesSorted.map(kpiEntry => (
                                    <tr key={kpiEntry.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tháng {kpiEntry.contractMonth}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(kpiEntry.actualMonth), 'MM/yyyy')}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-primary">{kpiEntry.kpiPercentage}%</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${kpiEntry.reportStatus === ReportStatus.Sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{kpiEntry.reportStatus}</span></td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{kpiEntry.reportSentDate ? format(new Date(kpiEntry.reportSentDate), 'dd/MM/yyyy') : '–'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            {kpiEntry.customerConfirmationUrl ? (
                                                <a 
                                                    href={kpiEntry.customerConfirmationUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center text-green-600 hover:text-green-800 font-semibold group"
                                                    title="Xem xác nhận"
                                                >
                                                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                                                    <span className="group-hover:underline">Đã xác nhận</span>
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">Chưa có</span>
                                            )}
                                        </td>
                                    </tr>
                                    )
                                )
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">Chưa có dữ liệu KPI nào được thêm.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const PaymentManagementView: React.FC<{ project: Project; updateMonthlyPayment: ProjectDetailProps['updateMonthlyPayment'] }> = ({ project, updateMonthlyPayment }) => {
    const [updatingMonthId, setUpdatingMonthId] = useState<string | null>(null);
    const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<React.ReactNode | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const handleInitiateUpload = (month: MonthlyProgress) => {
        if (month.paymentStatus === PaymentStatus.Unpaid) {
            setSelectedMonthId(month.id);
            setUploadError(null); // Clear previous errors when starting a new upload
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedMonthId) {
            return;
        }

        const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!acceptedImageTypes.includes(file.type)) {
            addToast('Vui lòng chọn một file hình ảnh (JPEG, PNG, GIF, WEBP).', 'error');
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUpdatingMonthId(selectedMonthId);
        setUploadError(null);

        try {
            const fileExtension = file.name.split('.').pop();
            const filePath = `${project.id}/${selectedMonthId}-${Date.now()}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from('payment_proofs')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from('payment_proofs')
                .getPublicUrl(filePath);
            
            if (!urlData?.publicUrl) {
                    throw new Error('Không thể lấy URL công khai cho tệp đã tải lên.');
            }

            await updateMonthlyPayment(selectedMonthId, urlData.publicUrl);
            
        } catch (error: any) {
            console.error("Payment proof upload failed:", error);
            const errorMessage = error.message ? error.message.toLowerCase() : '';
            let userFriendlyError: React.ReactNode = (
                <span>
                    Tải lên chứng từ thất bại: {error.message || 'Lỗi không xác định'}. Vui lòng thử lại.
                </span>
            );

            if (errorMessage.includes('bucket not found')) {
                userFriendlyError = (
                    <span>
                        <strong>Lỗi Cài Đặt Lưu Trữ:</strong> Bucket "payment_proofs" chưa được tạo trên Supabase. 
                        Đây là một bước cài đặt bắt buộc. Vui lòng làm theo hướng dẫn tại <Link to="/setup" className="font-bold underline hover:text-red-900">Trang Hướng Dẫn Cài Đặt</Link> để tạo bucket.
                    </span>
                );
            } else if (errorMessage.includes('security policy') || errorMessage.includes('rls') || errorMessage.includes('new row violates')) {
                 userFriendlyError = (
                    <span>
                        <strong>Lỗi Quyền Truy Cập:</strong> Không thể tải tệp lên do chính sách bảo mật của bucket. 
                        Vui lòng làm theo hướng dẫn tại <Link to="/setup" className="font-bold underline hover:text-red-900">Trang Hướng Dẫn Cài Đặt</Link> để cấu hình Policies cho Storage.
                    </span>
                );
            }
            
            setUploadError(userFriendlyError);
            addToast('Tải lên thất bại. Vui lòng xem chi tiết lỗi.', 'error');

        } finally {
            setUpdatingMonthId(null);
            setSelectedMonthId(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Reset file input
            }
        }
    };


    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept="image/png, image/jpeg, image/gif, image/webp"
                />
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
                        const isUpdating = updatingMonthId === month.id;
                        const hasProof = !!month.paymentProofUrl;

                        return (
                            <div key={month.id} className={`border rounded-lg p-4 flex flex-col items-center justify-between text-center min-h-[160px] ${isPaid ? 'bg-green-50' : 'bg-white'}`}>
                                <p className="font-bold text-lg text-slate-700 mb-2">Tháng {month.month}</p>
                                <span className={`px-3 py-1 mb-3 inline-flex text-sm leading-5 font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {month.paymentStatus}
                                </span>
                                
                                <div className="w-full mt-auto">
                                    {isUpdating ? (
                                        <button className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-gray-200 text-gray-500 cursor-wait" disabled>
                                            <SpinnerIcon className="h-5 w-5 mr-2" />
                                            Đang xử lý...
                                        </button>
                                    ) : isPaid && hasProof ? (
                                        <button 
                                            onClick={() => setPreviewImageUrl(month.paymentProofUrl!)}
                                            className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-blue-100 text-blue-800 hover:bg-blue-200"
                                        >
                                            <EyeIcon className="h-5 w-5 mr-2" />
                                            Xem chứng từ
                                        </button>
                                    ) : isPaid && !hasProof ? (
                                        <p className="text-sm text-gray-500">Đã TT (không có CT)</p>
                                    ) : (
                                        <button 
                                            onClick={() => handleInitiateUpload(month)}
                                            className="w-full font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-primary text-white hover:bg-blue-700"
                                        >
                                            <UploadIcon className="h-5 w-5 mr-2" />
                                            Đánh dấu Đã TT
                                        </button>
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

const ReportManagementView: React.FC<{ project: Project; updateKpiEntry: ProjectDetailProps['updateKpiEntry']; updateKpiConfirmation: ProjectDetailProps['updateKpiConfirmation'] }> = ({ project, updateKpiEntry, updateKpiConfirmation }) => {
  const [updatingStatusKpiId, setUpdatingStatusKpiId] = useState<string | null>(null);
  const [uploadingConfirmationKpiId, setUploadingConfirmationKpiId] = useState<string | null>(null);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<React.ReactNode | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleMarkReportAsSent = async (kpiEntry: KpiEntry) => {
    if (kpiEntry.reportStatus === ReportStatus.Sent) return;
    setUpdatingStatusKpiId(kpiEntry.id);
    await updateKpiEntry(kpiEntry.id, { 
        reportStatus: ReportStatus.Sent, 
        reportSentDate: format(new Date(), 'yyyy-MM-dd') 
    });
    setUpdatingStatusKpiId(null);
  };

  const handleInitiateConfirmationUpload = (kpiEntry: KpiEntry) => {
    setSelectedKpiId(kpiEntry.id);
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleConfirmationFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedKpiId) return;

    const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!acceptedImageTypes.includes(file.type)) {
        addToast('Vui lòng chọn một file hình ảnh (JPEG, PNG, GIF, WEBP).', 'error');
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    setUploadingConfirmationKpiId(selectedKpiId);
    setUploadError(null);

    try {
        const fileExtension = file.name.split('.').pop();
        const filePath = `${project.id}/confirmations/${selectedKpiId}-${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
            .from('confirmation_proofs')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('confirmation_proofs')
            .getPublicUrl(filePath);
        
        if (!urlData?.publicUrl) {
            throw new Error('Không thể lấy URL công khai cho tệp đã tải lên.');
        }

        await updateKpiConfirmation(selectedKpiId, urlData.publicUrl);
        
    } catch (error: any) {
        console.error("Confirmation proof upload failed:", error);
        const errorMessage = error.message ? error.message.toLowerCase() : '';
        let userFriendlyError: React.ReactNode = (
            <span>Tải lên xác nhận thất bại: {error.message || 'Lỗi không xác định'}. Vui lòng thử lại.</span>
        );

        if (errorMessage.includes('bucket not found')) {
            userFriendlyError = (
                <span>
                    <strong>Lỗi Cài Đặt Lưu Trữ:</strong> Bucket "confirmation_proofs" chưa được tạo. 
                    Vui lòng làm theo hướng dẫn tại <Link to="/setup" className="font-bold underline hover:text-red-900">Trang Hướng Dẫn Cài Đặt</Link> để tạo bucket.
                </span>
            );
        } else if (errorMessage.includes('security policy') || errorMessage.includes('rls')) {
            userFriendlyError = (
                <span>
                    <strong>Lỗi Quyền Truy Cập:</strong> Không thể tải tệp lên do chính sách bảo mật. 
                    Vui lòng làm theo hướng dẫn tại <Link to="/setup" className="font-bold underline hover:text-red-900">Trang Hướng Dẫn Cài Đặt</Link> để cấu hình Policies cho Storage.
                </span>
            );
        }
        
        setUploadError(userFriendlyError);
        addToast('Tải lên thất bại. Vui lòng xem chi tiết lỗi.', 'error');
    } finally {
        setUploadingConfirmationKpiId(null);
        setSelectedKpiId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };
  
  const sortedKpiEntries = [...project.kpiEntries].sort((a, b) => b.actualMonth.localeCompare(a.actualMonth) || a.contractMonth - b.contractMonth);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleConfirmationFileChange}
          style={{ display: 'none' }}
          accept="image/png, image/jpeg, image/gif, image/webp"
        />
        <h2 className="text-xl font-bold text-dark mb-4">Quản lý gửi báo cáo & xác nhận</h2>
        
        {uploadError && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg" role="alert">
                <h3 className="font-bold text-lg mb-2">Không thể tải lên xác nhận</h3>
                <div className="text-sm">{uploadError}</div>
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng HĐ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">KPI / Tháng Thực Tế</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng Thái Báo Cáo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày Gửi</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Hành Động</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng confirm</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedKpiEntries.length > 0 ? (
                sortedKpiEntries.map(kpiEntry => {
                  const isUpdatingStatus = updatingStatusKpiId === kpiEntry.id;
                  const isUploadingConfirmation = uploadingConfirmationKpiId === kpiEntry.id;

                  return (
                    <tr key={kpiEntry.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tháng {kpiEntry.contractMonth}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {`${kpiEntry.kpiPercentage}% (${format(new Date(kpiEntry.actualMonth), 'MM/yyyy')})`}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${kpiEntry.reportStatus === ReportStatus.Sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{kpiEntry.reportStatus}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {kpiEntry.reportSentDate ? format(new Date(kpiEntry.reportSentDate), 'dd/MM/yyyy') : '–'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => handleMarkReportAsSent(kpiEntry)}
                          disabled={isUpdatingStatus || kpiEntry.reportStatus === ReportStatus.Sent}
                          className="text-primary hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold flex items-center justify-center mx-auto"
                        >
                          {isUpdatingStatus ? <SpinnerIcon className="h-5 w-5"/> : (kpiEntry.reportStatus === ReportStatus.Sent ? <><CheckCircleIcon className="h-5 w-5 mr-2" /><span>Đã gửi</span></> : <><DocumentTextIcon className="h-5 w-5 mr-2" /><span>Đánh dấu đã gửi</span></>)}
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {isUploadingConfirmation ? (
                          <button className="font-medium py-2 px-4 rounded-md flex items-center justify-center text-gray-500 cursor-wait w-full max-w-[150px] mx-auto" disabled>
                              <SpinnerIcon className="h-5 w-5 mr-2" />
                              Đang xử lý...
                          </button>
                        ) : kpiEntry.customerConfirmationUrl ? (
                            <button
                                onClick={() => setPreviewImageUrl(kpiEntry.customerConfirmationUrl!)}
                                className="font-medium py-2 px-4 rounded-md flex items-center justify-center bg-blue-100 text-blue-800 hover:bg-blue-200 w-full max-w-[150px] mx-auto"
                            >
                                <EyeIcon className="h-5 w-5 mr-2" />
                                Xem C.Nhận
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleInitiateConfirmationUpload(kpiEntry)}
                                className="font-medium py-2 px-4 rounded-md flex items-center justify-center bg-accent text-white hover:bg-amber-600 w-full max-w-[150px] mx-auto"
                            >
                                <UploadIcon className="h-5 w-5 mr-2" />
                                Tải lên C.N
                            </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    Chưa có báo cáo nào được thêm. Thêm một mục KPI mới để theo dõi báo cáo tại đây.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ImagePreviewModal isOpen={!!previewImageUrl} imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </>
  );
};


const ProjectDetail: React.FC<ProjectDetailProps> = ({ projects, addKpiEntry, updateMonthlyPayment, updateKpiEntry, updateKpiConfirmation, updateProjectName }) => {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const [activeTab, setActiveTab] = useState('kpi');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const { addToast } = useToast();

  const projectId = projectSlug ? projectSlug.split('--').pop() : undefined;
  const project = projects.find(p => p.id === projectId);

  React.useEffect(() => {
    if (project) {
        setEditedName(project.name);
    }
  }, [project]);

  if (!project) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Không tìm thấy dự án</h2>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">
          <ArrowLeftIcon className="h-4 w-4 mr-2 inline"/>Quay lại Bảng điều khiển
        </Link>
      </div>
    );
  }

  const handleStartEdit = () => {
    if (project) {
        setEditedName(project.name);
        setIsEditingName(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    if(project) {
        setEditedName(project.name);
    }
  };

  const handleSaveName = async () => {
    if (!project || !editedName.trim()) {
        addToast("Tên dự án không được để trống.", 'error');
        return;
    }
    if (editedName.trim() === project.name) {
        setIsEditingName(false);
        return;
    }
    
    setIsSavingName(true);
    await updateProjectName(project.id, editedName.trim());
    setIsSavingName(false);
    setIsEditingName(false);
  };

  const TABS = {
      kpi: { label: 'Quản lý KPI', component: <KpiManagementView project={project} addKpiEntry={addKpiEntry} /> },
      payment: { label: 'Quản lý thanh toán', component: <PaymentManagementView project={project} updateMonthlyPayment={updateMonthlyPayment} /> },
      report: { label: 'Quản lý báo cáo', component: <ReportManagementView project={project} updateKpiEntry={updateKpiEntry} updateKpiConfirmation={updateKpiConfirmation} /> }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {!isEditingName ? (
            <>
              <h1 className="text-3xl font-bold text-dark">{project.name}</h1>
              <button onClick={handleStartEdit} className="text-gray-500 hover:text-primary transition-colors p-1 rounded-full" title="Chỉnh sửa tên dự án">
                  <PencilIcon className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full max-w-md">
              <input 
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="block w-full px-3 py-2 text-2xl font-bold border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                disabled={isSavingName}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelEdit(); }}
              />
              <button onClick={handleSaveName} className="bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:bg-blue-300 disabled:cursor-wait" disabled={isSavingName}>
                {isSavingName ? <SpinnerIcon className="h-5 w-5"/> : 'Lưu'}
              </button>
              <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300 disabled:opacity-50" disabled={isSavingName}>
                Hủy
              </button>
            </div>
          )}
        </div>
        <Link to="/" className="inline-flex items-center text-primary hover:text-blue-700 font-semibold text-sm flex-shrink-0 ml-4">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Quay lại Bảng điều khiển
        </Link>
      </div>
      
      <div role="tablist" className="border-b border-gray-200">
        <nav className="flex space-x-2">
            {Object.entries(TABS).map(([key, {label}]) => (
                 <TabButton key={key} label={label} isActive={activeTab === key} onClick={() => setActiveTab(key)} />
            ))}
        </nav>
      </div>

      <div className="mt-6" role="tabpanel">
        {TABS[activeTab as keyof typeof TABS].component}
      </div>
    </div>
  );
};

export default ProjectDetail;