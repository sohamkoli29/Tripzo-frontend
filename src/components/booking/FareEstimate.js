export default function FareEstimate({ fare, distance, duration, rideType }) {
  if (!fare) return null;

  return (
    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 space-y-3">
      <p className="text-yellow-400 font-semibold text-sm uppercase tracking-wide">
        Fare Estimate
      </p>

      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Estimated Fare</span>
        <span className="text-white font-bold text-xl">₹{fare}</span>
      </div>

      <div className="border-t border-yellow-400/20 pt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-gray-500 text-xs">Distance</p>
          <p className="text-white text-sm font-medium mt-0.5">
            {distance?.toFixed(1)} km
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Duration</p>
          <p className="text-white text-sm font-medium mt-0.5">
            ~{duration} mins
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Ride Type</p>
          <p className="text-white text-sm font-medium mt-0.5 capitalize">
            {rideType}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Payment</p>
          <p className="text-white text-sm font-medium mt-0.5">💳 Card</p>
        </div>
      </div>
    </div>
  );
}