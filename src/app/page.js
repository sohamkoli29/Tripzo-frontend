// frontend/src/app/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      // ✅ getSession() — reads localStorage, no network call
      const { data: { session } } = await createClient().auth.getSession();
      if (session?.user) {
        router.replace("/dashboard");
      } else {
        router.replace("/sign-in");
      }
    };
    redirect();
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="text-6xl animate-bounce">🚖</div>
      <h1 className="text-3xl font-bold text-yellow-400">Tripzo</h1>
      <p className="text-gray-500 text-sm animate-pulse">Loading...</p>
    </div>
  );
}