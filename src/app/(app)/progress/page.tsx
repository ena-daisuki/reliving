"use client";

import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ProgressTracker() {
  const [daysSmokeFree, setDaysSmokeFree] = useState(7);
  const [mood, setMood] = useState<string | null>(null);

  const resetProgress = () => setDaysSmokeFree(0);

  const handleMoodCheck = (selectedMood: string) => {
    setMood(selectedMood);
    // Here you would typically save this to your backend
  };

  return (
    <div className="pb-16 md:pb-4">
      <header className="bg-purple-600 text-white p-4 md:rounded-b-lg">
        <h1 className="text-2xl font-bold">Your Progress</h1>
      </header>
      <main className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Smoke-Free Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-center mb-2">
              {daysSmokeFree} days
            </p>
            <Progress value={(daysSmokeFree / 30) * 100} className="w-full" />
            <Button onClick={resetProgress} className="mt-4 w-full">
              Reset Progress
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>How are you feeling today?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              {["😊", "😐", "😔"].map((emoji) => (
                <Button
                  key={emoji}
                  onClick={() => handleMoodCheck(emoji)}
                  className={`text-2xl ${
                    mood === emoji ? "bg-purple-600" : "bg-gray-200"
                  }`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Add more cards for other progress metrics */}
      </main>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
