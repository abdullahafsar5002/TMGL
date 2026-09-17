import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
      cancelRef.current?.focus();
    } else {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="backdrop:bg-black/50 rounded-xl border border-tmgl-charcoal-200 shadow-xl p-0 max-w-sm w-full"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-tmgl-charcoal-900">{title}</h2>
            <p className="text-sm text-tmgl-charcoal-600 mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="text-tmgl-charcoal-400 hover:text-tmgl-charcoal-600 p-1 -m-1" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 justify-end">
          <Button ref={cancelRef} variant="outline" size="sm" onClick={onCancel}>{cancelLabel}</Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            className={variant === 'primary' ? 'bg-tmgl-green-800 hover:bg-tmgl-green-700' : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
