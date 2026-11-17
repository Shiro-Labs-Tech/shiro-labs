import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m); setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), 1800);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={'toast mono' + (on ? ' show' : '')} id="toast" role="status" aria-live="polite">{msg}</div>
    </ToastContext.Provider>
  );
}
