"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StarDisplay } from "@/components/ratings/StarRating";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

const BADGE_COLOR = {
  5: "text-green-400  border-green-400/30  bg-green-400/10",
  4: "text-blue-400   border-blue-400/30   bg-blue-400/10",
  3: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  2: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  1: "text-red-400    border-red-400/30    bg-red-400/10",
};

const STAR_LABELS = { 5: "Excellent", 4: "Good", 3: "Okay", 2: "Poor", 1: "Terrible" };

export default function DriverRatingsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState(0); // 0 = all

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getMyRatings();
        setData(result);
      } catch {
        setData({ ratings: [], avg: 0, total: 0, distribution: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-yellow-400 animate-pulse text-lg">Loading ratings...</p>
    </div>
  );

  const { ratings = [], avg = 0, total = 0 } = data || {};
  const dist = [5,4,3,2,1].map(star => ({
    star,
    count:   ratings.filter(r => r.stars === star).length,
    percent: total > 0 ? Math.round((ratings.filter(r => r.stars === star).length / total) * 100) : 0,
  }));

  const shown = filter === 0 ? ratings : ratings.filter(r => r.stars === filter);

  // Badges earned
  const badges = [];
  if (avg >= 4.5 && total >= 3)  badges.push({ icon: "🏆", label: "Top Rated",         color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"   });
  if (avg >= 4.0)                badges.push({ icon: "💎", label: "Highly Rated",       color: "text-blue-400   border-blue-400/30   bg-blue-400/10"     });
  if (total >= 10)               badges.push({ icon: "✅", label: "Experienced Driver", color: "text-green-400  border-green-400/30  bg-green-400/10"    });
  if (ratings.filter(r => r.stars === 5).length >= 5) badges.push({ icon: "⭐", label: "5-Star Streak", color: "text-purple-400 border-purple-400/30 bg-purple-400/10" });

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">My Ratings</h1>
        <p className="text-gray-400 mt-1">Feedback from your riders</p>
      </div>

      {total === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center space-y-4">
          <p className="text-6xl">⭐</p>
          <p className="text-white font-bold text-xl">No ratings yet</p>
          <p className="text-gray-500 text-sm">Complete rides to start receiving feedback.</p>
        </div>
      ) : (
        <>
          {/* ── Summary Card ─────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />

            <div className="p-6 space-y-5">

              {/* Score + distribution */}
              <div className="flex items-center gap-8">

                {/* Big average */}
                <div className="text-center flex-shrink-0 space-y-1">
                  <p className="text-6xl font-black text-yellow-400 leading-none tabular-nums">
                    {parseFloat(avg).toFixed(1)}
                  </p>
                  <StarDisplay value={avg} size="md" showNumber={false} />
                  <p className="text-gray-500 text-xs">{total} review{total !== 1 ? "s" : ""}</p>
                </div>

                {/* Bars */}
                <div className="flex-1 space-y-2.5">
                  {dist.map(({ star, count, percent }) => (
                    <div key={star} className="flex items-center gap-3 group">
                      <button
                        onClick={() => setFilter(filter === star ? 0 : star)}
                        className={[
                          "text-xs font-medium w-3 flex-shrink-0 transition",
                          filter === star ? "text-yellow-400" : "text-gray-500 hover:text-gray-300",
                        ].join(" ")}
                      >
                        {star}
                      </button>
                      <span className="text-yellow-400 text-xs leading-none">★</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: percent + "%",
                            background: star >= 4 ? "#facc15" : star === 3 ? "#fb923c" : "#f87171",
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 w-10 justify-end">
                        <span className="text-gray-400 text-xs tabular-nums">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                  {badges.map((b) => (
                    <span key={b.label} className={"text-xs px-3 py-1.5 rounded-full border font-medium " + b.color}>
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Filter Pills ──────────────────────────────── */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter(0)}
              className={"px-4 py-2 rounded-xl text-sm font-medium transition " + (filter === 0 ? "bg-yellow-400 text-black" : "bg-gray-900 text-gray-400 border border-gray-800 hover:text-white")}
            >
              All ({total})
            </button>
            {[5,4,3,2,1].map(star => {
              const count = ratings.filter(r => r.stars === star).length;
              if (count === 0) return null;
              return (
                <button key={star}
                  onClick={() => setFilter(filter === star ? 0 : star)}
                  className={"px-4 py-2 rounded-xl text-sm font-medium transition " + (filter === star ? "bg-yellow-400 text-black" : "bg-gray-900 text-gray-400 border border-gray-800 hover:text-white")}
                >
                  {"★".repeat(star)} ({count})
                </button>
              );
            })}
          </div>

          {/* ── Reviews List ─────────────────────────────── */}
          {shown.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
              <p className="text-gray-500">No {filter}-star reviews yet</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-white font-semibold">
                  {filter === 0 ? "All Reviews" : "★".repeat(filter) + " Reviews"}
                </h2>
                <span className="text-gray-500 text-sm">{shown.length} review{shown.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="divide-y divide-gray-800/60">
                {shown.map((r) => (
                  <div key={r.id} className="p-5 space-y-3 hover:bg-gray-800/20 transition">
                    <div className="flex items-start justify-between gap-4">

                      {/* Rider */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0 overflow-hidden">
                          {r.users?.profile_picture
                            ? <img src={r.users.profile_picture} alt="" className="w-full h-full object-cover" />
                            : (r.users?.full_name?.[0] || "R").toUpperCase()
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{r.users?.full_name || "Rider"}</p>
                          <p className="text-gray-600 text-xs">{timeAgo(r.created_at)}</p>
                        </div>
                      </div>

                      {/* Stars + label */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StarDisplay value={r.stars} size="sm" showNumber={false} />
                        <span className={"text-xs px-2.5 py-0.5 rounded-full border " + BADGE_COLOR[r.stars]}>
                          {STAR_LABELS[r.stars]}
                        </span>
                      </div>
                    </div>

                    {/* Review text */}
                    {r.review && (
                      <div className="bg-gray-800/50 rounded-xl px-4 py-3 border-l-2 border-gray-700">
                        <p className="text-gray-300 text-sm italic leading-relaxed">"{r.review}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}