import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-yazal-navy-dark p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 dark:border-white/5">
        <h3 className="text-lg font-black text-yazal-navy dark:text-white">{title}</h3>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">إلغاء</button>
          <button onClick={onConfirm} className="flex-1 p-3 bg-rose-500 text-white rounded-xl font-bold">تأكيد الحذف</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
