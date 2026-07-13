"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Toast as AstryxToast } from "@astryxdesign/core/Toast";

interface Toast {
  id: string;
  message: string;
  duration: number;
}

interface ToastContextType {
  notify: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  // Astryx's <Toast> owns its own auto-hide timer (isAutoHide/autoHideDuration)
  // and calls onDismiss when it fires or the user clicks its dismiss button.
  // We only own the exit-animation delay before actually unmounting.
  const dismiss = useCallback((id: string) => {
    setExiting((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 150);
  }, []);

  const notify = useCallback((message: string, duration = 3000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]"
        role="status"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <AstryxToast
            key={toast.id}
            type="info"
            body={toast.message}
            isAutoHide={toast.duration > 0}
            autoHideDuration={toast.duration}
            isExiting={exiting.has(toast.id)}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  // Return no-op during SSR or when outside provider
  if (!context) {
    return { notify: () => {} };
  }
  return context;
}
