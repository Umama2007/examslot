import { Modal } from './Modal';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isConfirming?: boolean;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isConfirming = false,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = true
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
          <AlertTriangle size={24} />
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-70 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {isConfirming ? <Loader2 className="animate-spin" size={18} /> : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
