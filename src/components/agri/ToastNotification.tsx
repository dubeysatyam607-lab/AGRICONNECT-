import React from "react";
import { CheckCircle } from "lucide-react";

interface ToastNotificationProps {
  message: string;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-foreground/90 text-background px-4 py-2.5 rounded-full shadow-lg z-50 flex items-center gap-2 animate-slide-up">
      <CheckCircle size={16} className="text-primary" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default ToastNotification;
