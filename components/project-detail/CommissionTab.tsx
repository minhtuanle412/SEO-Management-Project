
import React, { useState, useMemo } from 'react';
import { Project, CommissionStatus } from '../../types';
import { CheckCircleIcon, CashIcon } from '../Icons';
import { format } from 'date-fns';
import Button from '../ui/Button';

interface CommissionTabProps {
  project: Project;
  updateKpiCommissionStatus: (kpiEntryId: string) => Promise<void>;
}

const CommissionTab: React.FC<CommissionTabProps> = ({ project, updateKpiCommissionStatus }) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const eligibleKpiEntries = useMemo(() => {
    return [...project.kpiEntries]
      .filter(entry => entry.kpiPercentage >= 75)
      .sort((a, b) => a.contractMonth - b.contractMonth || b.actualMonth.localeCompare(a.actualMonth));
  }, [project.kpiEntries]);

  const handleUpdateStatus = async (kpiEntryId: string) => {
    setUpdatingId(kpiEntryId);
    await updateKpiCommissionStatus(kpiEntryId);
    setUpdatingId(null);
  };

  if (eligibleKpiEntries.length === 0) {
    return (
      <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-200 text-center">
        <h3 className="text-xl font-semibold text-dark">Chưa có tháng nào đủ điều kiện</h3>
        <p className="text-gray-500 mt-2">
          Hoa hồng chỉ được áp dụng cho các tháng có tỷ lệ KPI đạt từ 75% trở lên.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng HĐ</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tháng Thực tế</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tỷ lệ KPI</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái HH</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày chi trả</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {eligibleKpiEntries.map(kpiEntry => {
              const isPaid = kpiEntry.commissionStatus === CommissionStatus.Paid;
              const isUpdating = updatingId === kpiEntry.id;
              return (
                <tr key={kpiEntry.id}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tháng {kpiEntry.contractMonth}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(kpiEntry.actualMonth), 'MM/yyyy')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-primary">{kpiEntry.kpiPercentage}%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {kpiEntry.commissionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {kpiEntry.commissionPaidDate ? format(new Date(kpiEntry.commissionPaidDate), 'dd/MM/yyyy') : '–'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    {isPaid ? (
                      <span className="flex items-center justify-center text-green-600 font-semibold">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Đã chi trả
                      </span>
                    ) : (
                      <Button
                        onClick={() => handleUpdateStatus(kpiEntry.id)}
                        disabled={isUpdating}
                        isLoading={isUpdating}
                        icon={<CashIcon className="h-5 w-5" />}
                        className="w-full max-w-[180px] mx-auto"
                      >
                        Đánh dấu đã trả HH
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommissionTab;
