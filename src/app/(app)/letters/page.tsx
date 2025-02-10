"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Send } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";

export default function Letters() {
  const { userType } = useAuth();
  const [newLetter, setNewLetter] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement letter submission to Firebase
    setNewLetter("");
  };

  return (
    <>
      <PageTitle>Letters 💌</PageTitle>

      {/* Write new letter */}
      <Card className="p-6 bg-white/90 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full p-4 rounded-lg border min-h-[200px] focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Write your letter here..."
            value={newLetter}
            onChange={(e) => setNewLetter(e.target.value)}
          />
          <Button type="submit" className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Send Letter
          </Button>
        </form>
      </Card>

      {/* Letters list */}
      <div className="space-y-4">
        {/* TODO: Replace with actual letters from Firebase */}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 bg-white/90">
            <p className="text-gray-600 mb-4">
              Dear {userType === "owner" ? "Love" : "Special One"},
            </p>
            <p className="text-gray-800">
              This is a sample letter. Letters will be loaded from Firebase.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Sent on: {new Date().toLocaleDateString()}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
