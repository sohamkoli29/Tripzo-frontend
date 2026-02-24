    "use client";

import { useEffect, useRef } from "react";
import { useNotificationContext } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";

const typeColors = {
  success: "text-green-400  bg-green-400/10",
  error:   "text-red-400    bg-red-400/10",
  info:    "text-blue-400   bg-blue-400/10",
  warning: "text-yellow-400 bg-yellow-400/10",
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400)return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead, clearAll } = useNotificationContext();
  const router  = useRouter();
  const ref     = useRef(null);

  // Mark all as read when panel opens
  useEffect(() => {
    markAllRead();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleNotificationClick = (notification) => {
    if (notification.rideId) {
      router.push("/dashboard/rides/" + notification.rideId);
      onClose();
    }
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-white font-semibold text-sm">Notifications</h3>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-gray-500 hover:text-red-400 text-xs transition"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-800">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-gray-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={"flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800 transition " + (!n.read ? "bg-gray-800/50" : "")}
            >
              {/* Icon */}
              <div className={"w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg " + (typeColors[n.type] || typeColors.info)}>
                {n.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-sm font-medium leading-tight">
                    {n.title}
                  </p>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
                  {n.body}
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  {timeAgo(n.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}