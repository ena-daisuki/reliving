"use client";

import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LetterProvider } from "@/contexts/LetterContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <LetterProvider>
      <div className="bg-gradient-to-br from-purple-400 to-indigo-600 min-h-screen">
        <Sidebar />
        <div className="md:pl-64 flex justify-center">
          <div className="w-full max-w-6xl p-4 md:p-8">{children}</div>
        </div>
      </div>
    </LetterProvider>
  );
}
