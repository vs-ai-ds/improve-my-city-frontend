import { useState } from "react";
import { createPortal } from "react-dom";
import Button from "../ui/Button";

interface DuplicateIssueModalProps {
  open: boolean;
  existingIssueId: number;
  message: string;
  onViewIssue: () => void;
  onProceed: () => void;
  onCancel: () => void;
}

export default function DuplicateIssueModal({
  open,
  existingIssueId,
  message,
  onViewIssue,
  onProceed,
  onCancel,
}: DuplicateIssueModalProps) {
  const [proceedAnyway, setProceedAnyway] = useState(false);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 10001 }}>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-0 flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-black/10 flex flex-col max-h-[min(90vh,820px)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="text-base font-semibold">Similar Issue Found</h3>
            <button
              onClick={onCancel}
              className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="rounded-xl border bg-amber-50 border-amber-200 p-4">
                <p className="text-sm text-amber-800">{message}</p>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={onViewIssue} variant="primary">
                  View Existing Issue #{existingIssueId}
                </Button>

                <div className="border-t pt-3 space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proceedAnyway}
                      onChange={(e) => setProceedAnyway(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      I understand that a similar issue exists, but my issue is different and I want to report it
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <Button
                      onClick={onProceed}
                      disabled={!proceedAnyway}
                      variant="primary"
                      className="flex-1"
                    >
                      Submit Anyway
                    </Button>
                    <Button onClick={onCancel} variant="secondary">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
