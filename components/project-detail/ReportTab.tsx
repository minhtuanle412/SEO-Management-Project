
import React, { useState, useRef } from 'react';
import { Project, KpiEntry, ReportStatus } from '../../types';
import { CheckCircleIcon, DocumentTextIcon, UploadIcon, EyeIcon } from '../Icons';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';
import ImagePreviewModal from '../ImagePreviewModal';
import Button from '../ui/Button';

interface ReportTabProps {
    project: Project;
    updateKpiEntry: (kpiEntryId: string, updates: Partial<Pick<KpiEntry, 'reportStatus' | 'reportSentDate'>>) => Promise<void>;
    updateKpiConfirmation: (kpiEntryId: string, confirmationUrl: string) => Promise<void>;
}

const ReportTab: React.FC<ReportTabProps> = ({ project, updateKpiEntry, updateKpiConfirmation }) => {
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
        
        if (!urlData?.publicUrl) throw new Error('Không thể lấy URL công khai cho tệp đã tải lên.');

        await updateKpiConfirmation(selectedKpiId, urlData.publicUrl);
        
    } catch (error: any) {
        console.error("Confirmation proof upload failed:", error);
        const errorMessage = error.message ? error.message.toLowerCase() : '';
        let userFriendlyError: React.ReactNode = (<span>Tải lên xác nhận thất bại: {error.message}.</span>);

        if (errorMessage.includes('bucket not found')) {
            userFriendlyError = (<span><strong>Lỗi Cài Đặt:</strong> Bucket chưa được tạo.</span>);
        }
        
        setUploadError(userFriendlyError);
        addToast('Tải lên thất bại. Vui lòng xem chi tiết lỗi.', 'error');
    } finally {
        setUploadingConfirmationKpiId(null);
        setSelectedKpiId(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
  const sortedKpiEntries = [...project.kpiEntries].sort((a, b) => b.actualMonth.localeCompare(a.actualMonth) || a.contractMonth - b.contractMonth);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <input type="file" ref={fileInputRef} onChange={handleConfirmationFileChange} style={{ display: 'none' }} accept="image/png, image/jpeg, image/gif, image/webp" />
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
                        <Button
                          variant="ghost"
                          onClick={() => handleMarkReportAsSent(kpiEntry)}
                          disabled={isUpdatingStatus || kpiEntry.reportStatus === ReportStatus.Sent}
                          isLoading={isUpdatingStatus}
                          icon={kpiEntry.reportStatus === ReportStatus.Sent ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <DocumentTextIcon className="h-5 w-5" />}
                          className="mx-auto"
                        >
                          {kpiEntry.reportStatus === ReportStatus.Sent ? "Đã gửi" : "Đánh dấu đã gửi"}
                        </Button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {isUploadingConfirmation ? (
                          <Button disabled isLoading className="w-full max-w-[150px] mx-auto">Đang xử lý...</Button>
                        ) : kpiEntry.customerConfirmationUrl ? (
                            <Button
                                variant="secondary"
                                onClick={() => setPreviewImageUrl(kpiEntry.customerConfirmationUrl!)}
                                icon={<EyeIcon className="h-5 w-5" />}
                                className="bg-blue-100 text-blue-800 hover:bg-blue-200 w-full max-w-[150px] mx-auto"
                            >
                                Xem C.Nhận
                            </Button>
                        ) : (
                            <Button 
                                onClick={() => handleInitiateConfirmationUpload(kpiEntry)}
                                icon={<UploadIcon className="h-5 w-5" />}
                                className="bg-accent hover:bg-amber-600 w-full max-w-[150px] mx-auto"
                            >
                                Tải lên C.N
                            </Button>
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

export default ReportTab;
