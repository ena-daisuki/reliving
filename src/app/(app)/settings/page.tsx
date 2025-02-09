"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function Settings() {
  const { logout, userType } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Settings ⚙️</h1>
      <div className="space-y-6">
        <Card className="p-6 bg-white/90">
          <h2 className="text-xl font-semibold mb-4">Account Type</h2>
          <p className="text-gray-600">
            You are logged in as:{" "}
            <span className="font-semibold">{userType}</span>
          </p>
        </Card>

        <Card className="p-6 bg-white/90">
          <h2 className="text-xl font-semibold mb-4 text-red-600">
            Danger Zone
          </h2>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? "Logging out..." : "Logout"}
          </Button>
        </Card>
      </div>
    </>
  );
}
