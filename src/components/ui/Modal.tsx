// File: src/components/ui/Modal.tsx
import type { PropsWithChildren } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  onClose,
  title,
  wide,
  footer,
  children,
}: PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title?: string;
  wide?: boolean;
  /** optional custom footer; if not provided, consumer renders buttons at end of content */
  footer?: React.ReactNode;
}>) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-0 flex items-center justify-center p-4"
      >
        <div
          className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-2xl bg-white shadow-xl ring-1 ring-black/10 flex flex-col
                      max-h-[min(90vh,820px)]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="text-base font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* body: scrolls independently */}
          <div className="px-5 py-4 overflow-y-auto">
            {children}
          </div>

          {/* sticky footer (optional) */}
          {footer && (
            <div className="px-5 py-3 border-t bg-white sticky bottom-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
