"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StarDisplay } from "@/components/ratings/StarRating";
import Link from "next/link";

export default function DriverCard({ driverId }) {
  const [driver,  setDriver]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) { setLoading(false); return; }
    (async () => {
      try {
        const { driver: d } = await api.getDriverProfile(driverId);
        setDriver(d);
      } catch {
        // silently fail — driver card is non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, [driverId]);

  if (!driverId || loading) return null;
  if (!driver) return null;

  const initials = (driver.full_name || "D").slice(0, 2).toUpperCase();
  const hasRating = driver.total_ratings > 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h2 className="text-white font-semibold mb-4">Your Driver</h2>

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center text-black font-black text-lg overflow-hidden flex-shrink-0">
          {driver.profile_picture
            ? <img src={driver.profile_picture} alt="" className="w-full h-full object-cover" />
            : initials
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg truncate">{driver.full_name || "Driver"}</p>

          {hasRating ? (
            <StarDisplay
              value={driver.avg_rating}
              total={driver.total_ratings}
              size="sm"
              className="mt-1"
            />
          ) : (
            <p className="text-gray-600 text-xs mt-1">New driver · No ratings yet</p>
          )}
        </div>

        {/* View Profile */}
        <Link
          href={"/dashboard/driver-profile/" + driverId}
          className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition flex-shrink-0"
        >
          View Profile
        </Link>
      </div>

      {/* Rating bar — quick visual */}
      {hasRating && (
        <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-yellow-400 font-bold text-lg">{parseFloat(driver.avg_rating).toFixed(1)}</p>
            <p className="text-gray-500 text-xs">Avg Rating</p>
          </div>
          <div>
            <p className="text-white font-bold text-lg">{driver.total_ratings}</p>
            <p className="text-gray-500 text-xs">Reviews</p>
          </div>
          <div>
            <p className="text-green-400 font-bold text-lg">
              {driver.avg_rating >= 4.5 ? "🏆" : driver.avg_rating >= 4.0 ? "💎" : driver.avg_rating >= 3.0 ? "👍" : "🆕"}
            </p>
            <p className="text-gray-500 text-xs">
              {driver.avg_rating >= 4.5 ? "Top Rated" : driver.avg_rating >= 4.0 ? "Highly Rated" : driver.avg_rating >= 3.0 ? "Good" : "New"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}