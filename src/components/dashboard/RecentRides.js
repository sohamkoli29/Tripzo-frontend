const statusStyles = {
  requested:   "bg-yellow-400/10 text-yellow-400",
  accepted:    "bg-blue-400/10   text-blue-400",
  in_progress: "bg-purple-400/10 text-purple-400",
  completed:   "bg-green-400/10  text-green-400",
  cancelled:   "bg-red-400/10    text-red-400",
};

export default function RecentRides({ rides = [] }) {
  if (rides.length === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
        <p className="text-4xl mb-3">🗺️</p>
        <p className="text-gray-400">No rides yet. Book your first ride!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-white font-semibold text-lg">Recent Rides</h2>
      </div>
      <div className="divide-y divide-gray-800">
        {rides.map((ride) => (
          <div key={ride.id} className="p-5 flex items-center justify-between hover:bg-gray-800/50 transition">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl">
                🚖
              </div>
              <div>
                <p className="text-white text-sm font-medium truncate max-w-xs">
                  {ride.pickup_address}
                </p>
                <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">
                  → {ride.dropoff_address}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusStyles[ride.status]}`}>
                {ride.status.replace("_", " ")}
              </span>
              <span className="text-white font-semibold text-sm">
                ${ride.fare}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}