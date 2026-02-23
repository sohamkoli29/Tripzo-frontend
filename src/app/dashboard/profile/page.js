"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    profile_picture: "",
    role: "rider",
  });

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");
  const [preview, setPreview]       = useState(null);

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.getProfile();
        setProfile({
          full_name:       data.full_name || "",
          phone:           data.phone || "",
          profile_picture: data.profile_picture || "",
          role:            data.role || "rider",
        });
        if (data.profile_picture) setPreview(data.profile_picture);
      } catch (err) {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Handle profile picture file selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      return setError("Please select an image file.");
    }
    if (file.size > 2 * 1024 * 1024) {
      return setError("Image must be under 2MB.");
    }

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError("");

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt  = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setProfile((prev) => ({ ...prev, profile_picture: publicUrl }));
      setPreview(publicUrl);
    } catch (err) {
      setError("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Save profile changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.updateProfile(profile);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        <p className="text-gray-400 mt-1">Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Profile Picture */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">

            {/* Avatar Preview */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-yellow-400 overflow-hidden flex items-center justify-center">
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-gray-500">👤</span>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="text-yellow-400 text-xs animate-pulse">Uploading...</span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 text-sm"
              >
                {uploading ? "Uploading..." : "Upload Photo"}
              </button>
              <p className="text-gray-500 text-xs">JPG, PNG, GIF up to 2MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
          <h2 className="text-white font-semibold">Personal Information</h2>

          {/* Full Name */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Enter your full name"
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-yellow-400 transition"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Phone Number</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-yellow-400 transition"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              {["rider", "driver"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setProfile({ ...profile, role: r })}
                  className={`py-3 rounded-xl font-semibold text-sm capitalize transition-all border
                    ${profile.role === r
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-gray-800 text-gray-400 border-gray-700 hover:border-yellow-400"
                    }`}
                >
                  {r === "rider" ? "🧑 Rider" : "🚗 Driver"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-400 px-4 py-3 rounded-xl text-sm">
            ✅ {success}
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-50 text-base"
        >
          {saving ? "Saving Changes..." : "Save Changes"}
        </button>

      </form>
    </div>
  );
}