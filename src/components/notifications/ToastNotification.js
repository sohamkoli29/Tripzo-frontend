"use client";

import { useNotificationContext } from "@/context/NotificationContext";

const typeStyles = {
  success: "border-green-500/50  bg-green-500/10  text-green-400",
  error:   "border-red-500/50    bg-red-500/10    text-red-400",
  info:    "border-blue-500/50   bg-blue-500/10   text-blue-400",
  warning: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
};

const barStyles = {
  success: "bg-green-400",
  error:   "bg-red-400",
  info:    "bg-blue-400",
  warning: "bg-yellow-400",
};

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationContext();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={"relative overflow-hidden rounded-2xl border px-4 py-4 shadow-2xl backdrop-blur-sm animate-slide-in " + (typeStyles[toast.type] || typeStyles.info)}
        >
          {/* Animated progress bar at bottom */}
          <div
            className={"absolute bottom-0 left-0 h-0.5 animate-shrink " + (barStyles[toast.type] || barStyles.info)}
            style={{ animationDuration: (toast.duration || 4000) + "ms" }}
          />

          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">{toast.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white">{toast.title}</p>
              <p className="text-xs mt-0.5 opacity-80 text-gray-300">{toast.body}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-white transition flex-shrink-0 text-lg leading-none"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}