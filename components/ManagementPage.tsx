import React, { useState, useMemo, useEffect } from 'react';
import { Staff, CommissionConfig, Department, Position } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon, XIcon, PencilIcon, SpinnerIcon } from './Icons';


// --- Reusable Modal for Department/Position ---
const ManagementItemModal: React.FC<{
  item: { id: string; name: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string | null, name: string) => Promise<void>;
  title: string;
}> = ({ item, isOpen, onClose, onSave, title }) => {
    const [name, setName] = useState(item?.name || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(item?.name || '');
        }
    }, [item, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSave(item?.id || null, name);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-dark">{item ? 'Chỉnh sửa' : 'Thêm'} {title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <label htmlFor="item-name" className="block text-sm font-medium text-gray-700">Tên {title}</label>
                        <input type="text" id="item-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required autoFocus />
                    </div>
                    <div className="flex justify-end p-4 bg-gray-50 border-t">
                        <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm" disabled={isSubmitting}>Hủy</button>
                        <button type="submit" className="ml-3 bg-primary text-white py-2 px-4 rounded-md shadow-sm disabled:bg-blue-300" disabled={isSubmitting}>
                            {isSubmitting ? <SpinnerIcon className="h-5 w-5"/> : 'Lưu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Reusable View for Department/Position List ---
const EditableListView: React.FC<{
    title: string;
    items: Array<{ id: string; name: string }>;
    refetchData: () => Promise<void>;
    tableName: 'phong_ban' | 'chuc_vu';
}> = ({ title, items, refetchData, tableName }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ id: string; name: string } | null>(null);
    const { addToast } = useToast();

    const handleOpenModal = (item: { id: string; name: string } | null = null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const handleSave = async (id: string | null, name: string) => {
        if (!name.trim()) {
            addToast(`Tên ${title} không được để trống.`, 'error');
            return;
        }
        try {
            const { error } = id
                ? await supabase.from(tableName).update({ name }).match({ id })
                : await supabase.from(tableName).insert({ name });

            if (error) throw error;
            addToast(`Đã ${id ? 'cập nhật' : 'thêm'} ${title} thành công!`, 'success');
            await refetchData();
            handleCloseModal();
        } catch (error: any) {
            addToast(`Lỗi: ${error.message}`, 'error');
        }
    };
    
    const handleDelete = async (itemId: string, itemName: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa "${itemName}"? Thao tác này có thể ảnh hưởng đến dữ liệu nhân sự liên quan.`)) return;
        try {
            const { error } = await supabase.from(tableName).delete().match({ id: itemId });
            if (error) throw error;
            addToast(`Đã xóa ${title}.`, 'success');
            await refetchData();
        } catch (error: any) {
            addToast(`Lỗi: ${error.message}`, 'error');
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal()} className="flex items-center bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Thêm {title}
                </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tên {title}</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map(item => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(item)} className="text-primary hover:text-blue-700 mr-4">Sửa</button>
                                    <button onClick={() => handleDelete(item.id, item.name)} className="text-red-600 hover:text-red-800">Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ManagementItemModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                item={selectedItem}
                title={title}
            />
        </div>
    );
};

// --- Staff Management Modal ---
const StaffModal: React.FC<{
  staffMember: Staff | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  departments: Department[];
  positions: Position[];
}> = ({ staffMember, isOpen, onClose, onSave, departments, positions }) => {
  const [ho_ten, setHoTen] = useState('');
  const [chuc_vu_id, setChucVuId] = useState('');
  const [phong_ban_id, setPhongBanId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setHoTen(staffMember?.ho_ten || '');
        setChucVuId(staffMember?.chuc_vu?.id || '');
        setPhongBanId(staffMember?.phong_ban?.id || '');
    }
  }, [staffMember, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ho_ten || !chuc_vu_id || !phong_ban_id) {
      addToast('Vui lòng điền đầy đủ thông tin.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToUpsert = { ho_ten, chuc_vu_id, phong_ban_id };
      const { error } = staffMember
        ? await supabase.from('nhan_su').update(dataToUpsert).match({ id: staffMember.id })
        : await supabase.from('nhan_su').insert([dataToUpsert]);
      
      if (error) throw error;
      
      addToast(`Đã ${staffMember ? 'cập nhật' : 'thêm'} nhân sự thành công!`, 'success');
      await onSave();
      onClose();
    } catch (error: any) {
      addToast(`Lỗi: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-dark">{staffMember ? 'Chỉnh sửa' : 'Thêm'} nhân sự</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="ho_ten" className="block text-sm font-medium text-gray-700">Họ và tên</label>
              <input type="text" id="ho_ten" value={ho_ten} onChange={e => setHoTen(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label htmlFor="phong_ban" className="block text-sm font-medium text-gray-700">Phòng ban</label>
              <select id="phong_ban" value={phong_ban_id} onChange={e => setPhongBanId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <option value="">-- Chọn phòng ban --</option>
                {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="chuc_vu" className="block text-sm font-medium text-gray-700">Chức vụ</label>
              <select id="chuc_vu" value={chuc_vu_id} onChange={e => setChucVuId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <option value="">-- Chọn chức vụ --</option>
                {positions.map(pos => <option key={pos.id} value={pos.id}>{pos.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end p-4 bg-gray-50 border-t">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm" disabled={isSubmitting}>Hủy</button>
            <button type="submit" className="ml-3 bg-primary text-white py-2 px-4 rounded-md shadow-sm disabled:bg-blue-300" disabled={isSubmitting}>
              {isSubmitting ? <SpinnerIcon className="h-5 w-5"/> : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Main Management Page Component ---
const ManagementPage: React.FC<{
  staff: Staff[];
  commissionConfigs: CommissionConfig[];
  departments: Department[];
  positions: Position[];
  refetchData: () => Promise<void>;
}> = ({ staff, commissionConfigs, departments, positions, refetchData }) => {
  const [activeTab, setActiveTab] = useState('staff');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [editingConfigPosId, setEditingConfigPosId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<number | string>('');
  const { addToast } = useToast();

  const handleOpenStaffModal = (staffMember: Staff | null = null) => {
    setSelectedStaff(staffMember);
    setIsStaffModalOpen(true);
  };

  const handleCloseStaffModal = () => {
    setIsStaffModalOpen(false);
    setSelectedStaff(null);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân sự này?')) return;
    try {
      const { error } = await supabase.from('nhan_su').delete().match({ id: staffId });
      if (error) throw error;
      addToast('Đã xóa nhân sự.', 'success');
      await refetchData();
    } catch (error: any) {
      addToast(`Lỗi: ${error.message}`, 'error');
    }
  };

  const handleUpdateCommission = async (position: Position) => {
    const rate = Number(editingRate);
    if (isNaN(rate) || rate < 0) {
        addToast('Tỷ lệ hoa hồng không hợp lệ.', 'error');
        return;
    }

    const existingConfig = commissionConfigs.find(c => c.chuc_vu.id === position.id);

    try {
        const { error } = existingConfig
            ? await supabase.from('cau_hinh_hoa_hong').update({ ty_le_hoa_hong: rate }).match({ id: existingConfig.id })
            : await supabase.from('cau_hinh_hoa_hong').insert({ chuc_vu_id: position.id, ty_le_hoa_hong: rate });

        if (error) throw error;
        addToast('Đã cập nhật tỷ lệ hoa hồng.', 'success');
        await refetchData();
        setEditingConfigPosId(null);
    } catch (error: any) {
        addToast(`Lỗi: ${error.message}`, 'error');
    }
  };

  const commissionData = useMemo(() => {
    return positions.map(pos => {
        const config = commissionConfigs.find(c => c.chuc_vu.id === pos.id);
        return {
            position: pos,
            ty_le_hoa_hong: config?.ty_le_hoa_hong ?? 0,
        }
    })
  }, [positions, commissionConfigs]);

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-dark mb-6">Quản lý chung</h1>
      
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto">
          <button onClick={() => setActiveTab('staff')} className={`py-3 px-4 sm:px-5 font-medium text-sm sm:text-base ${activeTab === 'staff' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Nhân sự</button>
          <button onClick={() => setActiveTab('departments')} className={`py-3 px-4 sm:px-5 font-medium text-sm sm:text-base ${activeTab === 'departments' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Phòng ban</button>
          <button onClick={() => setActiveTab('positions')} className={`py-3 px-4 sm:px-5 font-medium text-sm sm:text-base ${activeTab === 'positions' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Chức vụ</button>
          <button onClick={() => setActiveTab('commission')} className={`py-3 px-4 sm:px-5 font-medium text-sm sm:text-base ${activeTab === 'commission' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Hoa hồng</button>
        </nav>
      </div>

      {activeTab === 'staff' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => handleOpenStaffModal()} className="flex items-center bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
              <PlusIcon className="h-5 w-5 mr-2" />
              Thêm nhân sự
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Họ và tên</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Phòng ban</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Chức vụ</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map(s => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{s.ho_ten}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{s.phong_ban?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{s.chuc_vu?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenStaffModal(s)} className="text-primary hover:text-blue-700 mr-4">Sửa</button>
                      <button onClick={() => handleDeleteStaff(s.id)} className="text-red-600 hover:text-red-800">Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'departments' && <EditableListView title="Phòng ban" items={departments} refetchData={refetchData} tableName="phong_ban" />}
      
      {activeTab === 'positions' && <EditableListView title="Chức vụ" items={positions} refetchData={refetchData} tableName="chuc_vu" />}

      {activeTab === 'commission' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Chức vụ</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tỷ lệ Hoa hồng (%)</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissionData.map(c => (
                  <tr key={c.position.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{c.position.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        {editingConfigPosId === c.position.id ? (
                            <input
                                type="number"
                                value={editingRate}
                                onChange={e => setEditingRate(e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                                autoFocus
                                min="0"
                            />
                        ) : (
                            c.ty_le_hoa_hong
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         {editingConfigPosId === c.position.id ? (
                            <>
                                <button onClick={() => handleUpdateCommission(c.position)} className="text-green-600 hover:text-green-800 mr-4">Lưu</button>
                                <button onClick={() => setEditingConfigPosId(null)} className="text-gray-600 hover:text-gray-800">Hủy</button>
                            </>
                         ) : (
                            <button onClick={() => { setEditingConfigPosId(c.position.id); setEditingRate(c.ty_le_hoa_hong); }} className="text-primary hover:text-blue-700">
                                <PencilIcon className="h-5 w-5" />
                            </button>
                         )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}

      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={handleCloseStaffModal}
        onSave={refetchData}
        staffMember={selectedStaff}
        departments={departments}
        positions={positions}
      />
    </div>
  );
};

export default ManagementPage;