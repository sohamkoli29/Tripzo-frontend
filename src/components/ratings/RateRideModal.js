"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { StarPicker } from "@/components/ratings/StarRating";

const QUICK_TAGS = [
  { label: "Great driver!",    emoji: "👨‍✈️" },
  { label: "Very punctual",    emoji: "⏰" },
  { label: "Smooth ride",      emoji: "🛣️" },
  { label: "Very polite",      emoji: "😊" },
  { label: "Clean vehicle",    emoji: "✨" },
  { label: "Felt safe",        emoji: "🛡️" },
  { label: "Great music",      emoji: "🎵" },
  { label: "Fast navigation",  emoji: "🗺️" },
];

const BAD_TAGS = [
  { label: "Drove too fast",   emoji: "💨" },
  { label: "Poor navigation",  emoji: "🔄" },
  { label: "Rude behaviour",   emoji: "😤" },
  { label: "Dirty vehicle",    emoji: "🚫" },
];

export default function RateRideModal({ ride, driverName, onClose, onSubmitted }) {
  const [stars,      setStars]      = useState(0);
  const [tags,       setTags]       = useState([]);
  const [review,     setReview]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  const toggleTag = (label) =>
    setTags((prev) => prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]);

  const handleSubmit = async () => {
    if (stars === 0) { setError("Please tap a star to rate your ride"); return; }
    setSubmitting(true);
    setError("");
    try {
      const fullReview = [tags.join(", "), review].filter(Boolean).join(". ");
      await api.submitRating({ ride_id: ride.id, stars, review: fullReview || null });
      onSubmitted?.({ stars, review: fullReview });
    } catch (err) {
      setError(err.message || "Failed to submit — please try again");
      setSubmitting(false);
    }
  };

  const suggestedTags = stars >= 4 ? QUICK_TAGS : stars > 0 ? BAD_TAGS : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-gray-950 border border-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        <div className="p-6 space-y-6">

          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="text-4xl">🚖</div>
            <h2 className="text-white font-bold text-xl tracking-tight">How was your ride?</h2>
            <p className="text-gray-500 text-sm">
              {driverName ? `Rate your trip with ${driverName}` : "Leave a rating for your driver"}
            </p>
          </div>

          {/* Route pill */}
          <div className="flex items-center gap-2 bg-gray-900 rounded-xl px-4 py-2.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-gray-400 truncate">{ride.pickup_address}</span>
            <span className="text-gray-700 flex-shrink-0">→</span>
            <span className="text-gray-400 truncate">{ride.dropoff_address}</span>
            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
          </div>

          {/* Stars */}
          <div className="bg-gray-900/60 rounded-2xl py-6">
            <StarPicker value={stars} onChange={(s) => { setStars(s); setTags([]); }} size="lg" />
          </div>

          {/* Quick Tags — only show after star selected */}
          {suggestedTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-500 text-xs uppercase tracking-widest">What stood out?</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map(({ label, emoji }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleTag(label)}
                    className={[
                      "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-150",
                      tags.includes(label)
                        ? "bg-yellow-400 text-black border-yellow-400 font-semibold scale-105"
                        : "bg-gray-900 text-gray-400 border-gray-700 hover:border-yellow-400/40 hover:text-gray-200",
                    ].join(" ")}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Written Review */}
          {stars > 0 && (
            <div className="space-y-2">
              <label className="text-gray-500 text-xs uppercase tracking-widest">
                Write a review <span className="text-gray-700 normal-case">(optional)</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share more details about your experience..."
                rows={3}
                maxLength={300}
                className="w-full bg-gray-900 text-white text-sm px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-yellow-400/60 transition resize-none placeholder:text-gray-600 leading-relaxed"
              />
              <div className="flex justify-end">
                <span className="text-gray-700 text-xs">{review.length}/300</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3.5 rounded-2xl transition text-sm"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || stars === 0}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 rounded-2xl transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}