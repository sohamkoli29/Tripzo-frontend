"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { StarDisplay } from "@/components/ratings/StarRating";
import Link from "next/link";

export default function ProfilePage() {
  const supabase = createClient();
  const router   = useRouter();

  const [user,       setUser]       = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");

  const [form, setForm] = useState({ full_name: "", phone: "", email: "" });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        setUser(u);
        const p = await api.getProfile();
        setProfile(p);
        setForm({ full_name: p.full_name || "", phone: p.phone || "", email: u.email || "" });
      } catch { router.push("/auth/login"); }
      finally  { setLoading(false); }
    };
    init();
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await api.updateProfile({ full_name: form.full_name, phone: form.phone });
      setProfile(updated);
      setEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.message); }
    finally       { setSaving(false); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-yellow-400 animate-pulse text-lg">Loading profile...</p>
    </div>
  );

  const isDriver = profile?.role === "driver";
  const initials = (profile?.full_name || user?.email || "U").slice(0,2).toUpperCase();
  const hasRating = isDriver && (profile?.total_ratings > 0);

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        <p className="text-gray-400 mt-1">Manage your account details</p>
      </div>

      {/* Profile Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />

        <div className="p-6 flex items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-yellow-400 flex items-center justify-center text-black font-black text-2xl overflow-hidden">
              {profile?.profile_picture
                ? <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <div className={"absolute -bottom-1.5 -right-1.5 text-xs px-2 py-0.5 rounded-full border font-semibold " +
              (isDriver ? "bg-blue-400/20 text-blue-400 border-blue-400/30" : "bg-yellow-400/20 text-yellow-400 border-yellow-400/30")}>
              {isDriver ? "Driver" : "Rider"}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-xl truncate">{profile?.full_name || "No name set"}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{user?.email}</p>
            {profile?.phone && <p className="text-gray-500 text-sm mt-0.5">📞 {profile.phone}</p>}

            {/* Driver Rating Display */}
            {isDriver && (
              <div className="mt-3">
                {hasRating ? (
                  <div className="flex items-center gap-3">
                    <StarDisplay
                      value={profile.avg_rating}
                      total={profile.total_ratings}
                      size="md"
                    />
                    <Link
                      href="/dashboard/driver/ratings"
                      className="text-yellow-400 text-xs hover:underline transition"
                    >
                      View all →
                    </Link>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm flex items-center gap-1.5">
                    <span className="text-gray-700">★★★★★</span>
                    <span>No ratings yet</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Edit button */}
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-yellow-400 text-sm hover:underline transition flex-shrink-0">
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Driver Rating Summary Card — only for drivers */}
      {isDriver && hasRating && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Driver Rating</h3>
            <Link href="/dashboard/driver/ratings" className="text-yellow-400 text-sm hover:underline">
              View all reviews →
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-black text-yellow-400">{parseFloat(profile.avg_rating).toFixed(1)}</p>
              <StarDisplay value={profile.avg_rating} size="sm" showNumber={false} />
            </div>
            <div className="flex-1">
              <p className="text-gray-300 text-sm">
                Based on <span className="text-white font-semibold">{profile.total_ratings}</span> ride{profile.total_ratings !== 1 ? "s" : ""}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {profile.avg_rating >= 4.5 ? "🏆 Excellent driver — keep it up!" :
                 profile.avg_rating >= 4.0 ? "👍 Great work! Riders love you." :
                 profile.avg_rating >= 3.0 ? "📈 Good driver with room to improve." :
                 "💪 Keep working to improve your ratings."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Edit Profile</h3>

          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide mb-1.5 block">Full Name</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-yellow-400 transition text-sm"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide mb-1.5 block">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-yellow-400 transition text-sm"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide mb-1.5 block">Email</label>
              <input value={form.email} disabled
                className="w-full bg-gray-800/50 text-gray-500 px-4 py-3 rounded-xl border border-gray-700 text-sm cursor-not-allowed" />
              <p className="text-gray-600 text-xs mt-1">Email cannot be changed</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setEditing(false); setError(""); }}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-400/10 border border-green-400/30 text-green-400 px-4 py-3 rounded-xl text-sm">
          ✓ {success}
        </div>
      )}

      {/* Account Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Account</h3>
        </div>
        <div className="divide-y divide-gray-800/60">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Account Type</p>
              <p className="text-gray-500 text-xs mt-0.5 capitalize">{profile?.role || "rider"}</p>
            </div>
            <span className={"text-xs px-3 py-1.5 rounded-full border font-medium capitalize " +
              (isDriver ? "bg-blue-400/10 text-blue-400 border-blue-400/20" : "bg-yellow-400/10 text-yellow-400 border-yellow-400/20")}>
              {profile?.role || "rider"}
            </span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Member Since</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>
          {isDriver && (
            <Link href="/dashboard/driver/ratings" className="px-5 py-4 flex items-center justify-between hover:bg-gray-800/40 transition">
              <div>
                <p className="text-white text-sm font-medium">My Ratings & Reviews</p>
                <p className="text-gray-500 text-xs mt-0.5">View all rider feedback</p>
              </div>
              <span className="text-gray-400 text-sm">→</span>
            </Link>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut}
        className="w-full bg-gray-900 border border-gray-800 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 font-semibold py-3.5 rounded-2xl transition text-sm">
        Sign Out
      </button>

    </div>
  );
}