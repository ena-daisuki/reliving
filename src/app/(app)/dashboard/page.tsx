"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { userType } = useAuth();
  const router = useRouter();

  const handleAction = (action: string) => {
    router.push(`/${action.toLowerCase()}`);
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 text-white">
        Welcome Back, {userType === "owner" ? "Love" : "Special One"} 💖
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white/90">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Button className="w-full" onClick={() => handleAction("letters")}>
              Write a Letter ✍️
            </Button>
            <Button className="w-full" onClick={() => handleAction("vlogs")}>
              Upload a Vlog 🎥
            </Button>
            <Button className="w-full" onClick={() => handleAction("memories")}>
              Add a Memory 💙
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
