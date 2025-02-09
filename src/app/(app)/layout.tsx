"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Check authentication status
    const isAuthenticated = false; // Replace with your auth check
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="bg-gradient-to-br from-purple-400 to-indigo-600 min-h-screen">
      <Sidebar />
      <div className="md:pl-64 flex justify-center">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
