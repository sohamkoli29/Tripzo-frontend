"use client";

export default function DriverToggle({ isOnline, onToggle, loading }) {
  return (
    <div className={`rounded-2xl border p-6 transition-all duration-300
      ${isOnline
        ? "bg-green-400/10 border-green-400/30"
        : "bg-gray-900 border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">
          {/* Pulsing dot when online */}
          <div className="relative">
            <div className={`w-4 h-4 rounded-full transition-colors duration-300
              ${isOnline ? "bg-green-400" : "bg-gray-600"}`}
            />
            {isOnline && (
              <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
            )}
          </div>
          <div>
            <p className="text-white font-bold text-lg">
              {isOnline ? "You're Online" : "You're Offline"}
            </p>
            <p className="text-gray-400 text-sm mt-0.5">
              {isOnline
                ? "Accepting ride requests near you"
                : "Go online to start accepting rides"
              }
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={onToggle}
          disabled={loading}
          className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none
            ${isOnline ? "bg-green-400" : "bg-gray-700"}
            ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md
                           transition-all duration-300
                           ${isOnline ? "left-9" : "left-1"}`}
          />
        </button>

      </div>
    </div>
  );
}