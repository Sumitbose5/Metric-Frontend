import { createPortal } from 'react-dom';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function OutOfAttemptsModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const modal = (
    <div onClick={onClose} style={{ zIndex: 99999 }} className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div onClick={(e) => e.stopPropagation()} style={{ zIndex: 100000 }} className="w-full max-w-md bg-card rounded-xl p-6 border border-border shadow-lg relative pointer-events-auto">
        <h3 className="text-lg font-bold mb-3">Usage limits reached</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You’ve used all of your complimentary interview attempts for now. We’ll notify you when new plans or top-ups become available so you can continue practicing without interruption.
        </p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-bold">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body);
  }

  return modal;
}
