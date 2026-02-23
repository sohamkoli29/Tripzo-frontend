"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/sign-in");
      else setUser(user);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-yellow-400">🚖 Dashboard</h1>
        <button
          onClick={handleSignOut}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
        >
          Sign Out
        </button>
      </div>
      {user && (
        <p className="mt-4 text-gray-400">
          Welcome, <span className="text-white font-medium">{user.email}</span>! Ready to book a ride?
        </p>
      )}
    </div>
  );
}