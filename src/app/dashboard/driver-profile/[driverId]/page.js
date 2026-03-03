"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { StarDisplay } from "@/components/ratings/StarRating";
import Link from "next/link";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return Math.floor(s / 60)  + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

const STAR_LABEL  = { 5: "Excellent", 4: "Good", 3: "Okay", 2: "Poor", 1: "Terrible" };
const BADGE_COLOR = {
  5: "bg-green-400/10  text-green-400  border-green-400/20",
  4: "bg-blue-400/10   text-blue-400   border-blue-400/20",
  3: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  2: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  1: "bg-red-400/10    text-red-400    border-red-400/20",
};

export default function DriverProfilePage() {
  const { driverId } = useParams();
  const router       = useRouter();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getDriverProfile(driverId);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [driverId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-yellow-400 animate-pulse text-lg">Loading driver profile...</p>
    </div>
  );

  if (error || !data) return (
    <div className="max-w-2xl text-center py-20 space-y-4">
      <p className="text-5xl">🚫</p>
      <p className="text-white font-bold text-xl">Driver not found</p>
      <button onClick={() => router.back()} className="text-yellow-400 hover:underline text-sm">← Go back</button>
    </div>
  );

  const { driver, ratings, distribution, avg, total } = data;
  const initials = (driver.full_name || "D").slice(0, 2).toUpperCase();
  const memberSince = new Date(driver.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Achievement badges
  const badges = [];
  if (avg >= 4.5 && total >= 3)  badges.push({ icon: "🏆", label: "Top Rated"         });
  if (avg >= 4.0)                badges.push({ icon: "💎", label: "Highly Rated"       });
  if (total >= 10)               badges.push({ icon: "✅", label: "Experienced Driver" });
  if (total >= 5 && avg >= 4.0)  badges.push({ icon: "⭐", label: "Consistent Quality" });

  return (
    <div className="max-w-2xl space-y-6">

      {/* Back */}
      <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition text-sm">
        ← Back
      </button>

      {/* ── Driver Card ──────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />

        <div className="p-6 flex items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-yellow-400 flex items-center justify-center text-black font-black text-2xl overflow-hidden flex-shrink-0">
            {driver.profile_picture
              ? <img src={driver.profile_picture} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-white font-bold text-2xl leading-tight">
                  {driver.full_name || "Driver"}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">Member since {memberSince}</p>
              </div>
              <span className="bg-blue-400/10 text-blue-400 border border-blue-400/20 text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0">
                Driver
              </span>
            </div>

            {/* Rating row */}
            <div className="mt-3">
              {total > 0 ? (
                <div className="flex items-center gap-3">
                  <StarDisplay value={avg} total={total} size="md" />
                  <span className="text-gray-500 text-sm">
                    {avg >= 4.5 ? "Excellent" : avg >= 4.0 ? "Very Good" : avg >= 3.0 ? "Good" : "Fair"}
                  </span>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No ratings yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="px-6 pb-5 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.label} className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 text-xs px-3 py-1.5 rounded-full font-medium">
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Rating Summary ───────────────────────────────── */}
      {total > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Rating Breakdown</h2>

          <div className="flex items-center gap-8">
            {/* Big score */}
            <div className="text-center flex-shrink-0 space-y-1">
              <p className="text-6xl font-black text-yellow-400 leading-none tabular-nums">
                {parseFloat(avg).toFixed(1)}
              </p>
              <StarDisplay value={avg} size="sm" showNumber={false} />
              <p className="text-gray-500 text-xs">{total} review{total !== 1 ? "s" : ""}</p>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 space-y-2.5">
              {distribution.map(({ star, count, percent }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs w-3 flex-shrink-0">{star}</span>
                  <span className="text-yellow-400 text-xs leading-none">★</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: percent + "%",
                        background: star >= 4 ? "#facc15" : star === 3 ? "#fb923c" : "#f87171",
                      }}
                    />
                  </div>
                  <span className="text-gray-500 text-xs w-6 text-right flex-shrink-0 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Reviews ──────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">
            {total > 0 ? "Recent Reviews" : "Reviews"}
          </h2>
          {total > 0 && (
            <span className="text-gray-500 text-sm">{total} total</span>
          )}
        </div>

        {ratings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-4xl">⭐</p>
            <p className="text-white font-semibold">No reviews yet</p>
            <p className="text-gray-500 text-sm">Be the first to rate this driver after your ride.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {ratings.map((r) => (
              <div key={r.id} className="p-5 space-y-3 hover:bg-gray-800/20 transition">
                <div className="flex items-start justify-between gap-4">
                  {/* Reviewer */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-xs flex-shrink-0 overflow-hidden">
                      {r.users?.profile_picture
                        ? <img src={r.users.profile_picture} alt="" className="w-full h-full object-cover" />
                        : (r.users?.full_name?.[0] || "R").toUpperCase()
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {r.users?.full_name || "Rider"}
                      </p>
                      <p className="text-gray-600 text-xs">{timeAgo(r.created_at)}</p>
                    </div>
                  </div>

                  {/* Stars + label */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <StarDisplay value={r.stars} size="sm" showNumber={false} />
                    <span className={"text-xs px-2 py-0.5 rounded-full border " + BADGE_COLOR[r.stars]}>
                      {STAR_LABEL[r.stars]}
                    </span>
                  </div>
                </div>

                {r.review && (
                  <div className="bg-gray-800/50 rounded-xl px-4 py-3 border-l-2 border-gray-700">
                    <p className="text-gray-300 text-sm italic leading-relaxed">"{r.review}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}