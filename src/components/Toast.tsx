import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastMsg {
  text: string;
  action?: { label: string; run: () => void };
  onExpire?: () => void;
}

const Ctx = createContext<(t: ToastMsg) => void>(() => {});
export const useToast = () => useContext(Ctx);

/** One toast at a time; 8 s, paused while hovered or focused (capped at 60 s). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const cap = useRef<number | undefined>(undefined);
  const current = useRef<ToastMsg | null>(null);

  const expire = useCallback(() => {
    window.clearTimeout(timer.current);
    window.clearTimeout(cap.current);
    current.current?.onExpire?.();
    current.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (t: ToastMsg) => {
      if (current.current) expire();
      current.current = t;
      setToast(t);
      timer.current = window.setTimeout(expire, 8000);
      cap.current = window.setTimeout(expire, 60_000);
    },
    [expire],
  );

  const pause = () => window.clearTimeout(timer.current);
  const resume = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(expire, 8000);
  };

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume}>
            <span>{toast.text}</span>
            {toast.action && (
              <button
                className="toast-action"
                type="button"
                onClick={() => {
                  toast.action!.run();
                  current.current = null;
                  window.clearTimeout(timer.current);
                  window.clearTimeout(cap.current);
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
