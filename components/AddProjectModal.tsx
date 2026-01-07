import React, { useState } from 'react';
import { Project, PaymentType } from '../types';
import { XIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (newProjectData: Omit<Project, 'id' | 'endDate' | 'monthlyBreakdown' | 'kpiEntries' | 'installments' | 'lookerStudioUrl' | 'assignments'>) => Promise<void>;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onAddProject }) => {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationMonths, setDurationMonths] = useState(6);
  const [totalBudget, setTotalBudget] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.Monthly);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !client || !startDate || durationMonths <= 0 || !totalBudget || totalBudget <= 0) {
      addToast('Vui lòng điền đầy đủ và chính xác tất cả các trường thông tin.', 'error');
      return;
    }
    setIsSubmitting(true);
    await onAddProject({ name, client, startDate, durationMonths, totalBudget: Number(totalBudget), paymentType });
    setIsSubmitting(false);
    onClose();
    // Reset form
    setName('');
    setClient('');
    setStartDate('');
    setDurationMonths(6);
    setTotalBudget('');
    setPaymentType(PaymentType.Monthly);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-dark">Thêm dự án mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên dự án</label>
              <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" required disabled={isSubmitting} />
            </div>
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700">Tên khách hàng</label>
              <input type="text" id="client" value={client} onChange={e => setClient(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" required disabled={isSubmitting} />
            </div>
            <div>
              <label htmlFor="totalBudget" className="block text-sm font-medium text-gray-700">Tổng ngân sách dự án (VNĐ)</label>
              <input type="number" id="totalBudget" value={totalBudget} onChange={e => setTotalBudget(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" min="1" required disabled={isSubmitting} placeholder="VD: 100000000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hình thức thanh toán</label>
              <div className="mt-2 flex gap-1 rounded-md border border-gray-300 p-1 bg-gray-100">
                  <label className="flex-1 text-center p-2 rounded-md cursor-pointer transition-all duration-200" style={{backgroundColor: paymentType === PaymentType.Monthly ? 'white' : 'transparent', color: paymentType === PaymentType.Monthly ? '#1D4ED8' : '#374151', fontWeight: paymentType === PaymentType.Monthly ? '600' : '400', boxShadow: paymentType === PaymentType.Monthly ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' : 'none'}}>
                      <input type="radio" className="sr-only" name="paymentType" value={PaymentType.Monthly} checked={paymentType === PaymentType.Monthly} onChange={() => setPaymentType(PaymentType.Monthly)} disabled={isSubmitting} />
                      <span>Theo tháng</span>
                  </label>
                  <label className="flex-1 text-center p-2 rounded-md cursor-pointer transition-all duration-200" style={{backgroundColor: paymentType === PaymentType.Milestone ? 'white' : 'transparent', color: paymentType === PaymentType.Milestone ? '#1D4ED8' : '#374151', fontWeight: paymentType === PaymentType.Milestone ? '600' : '400', boxShadow: paymentType === PaymentType.Milestone ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' : 'none'}}>
                      <input type="radio" className="sr-only" name="paymentType" value={PaymentType.Milestone} checked={paymentType === PaymentType.Milestone} onChange={() => setPaymentType(PaymentType.Milestone)} disabled={isSubmitting} />
                      <span>Theo đợt</span>
                  </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" required disabled={isSubmitting} />
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Số tháng triển khai</label>
                <input type="number" id="duration" value={durationMonths} onChange={e => setDurationMonths(parseInt(e.target.value, 10))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" min="1" required disabled={isSubmitting} />
              </div>
            </div>
          </div>
          <div className="flex justify-end items-center p-4 bg-gray-50 border-t">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50" disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-blue-300" disabled={isSubmitting}>
              {isSubmitting ? 'Đang thêm...' : 'Thêm dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;