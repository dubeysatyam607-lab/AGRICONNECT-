import { useState, useCallback, useRef } from "react";

export function useToastNotification() {
  const [toastMessage, setToastMessage] = useState<string>("");
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToastMessage(""), 3000);
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setToastMessage("");
  }, []);

  return { toastMessage, showToast, hideToast };
}
