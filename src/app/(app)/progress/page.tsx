"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Progress() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-6">My Progress 📊</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Smoke-Free Journey</h2>
          <div className="text-4xl font-bold text-purple-600 mb-2">30 Days</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-purple-600 h-2.5 rounded-full"
              style={{ width: "30%" }}
            ></div>
          </div>
          <p className="text-gray-600">Keep going! You&apos;re doing great!</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Money Saved</h2>
          <div className="text-4xl font-bold text-green-600 mb-4">$150</div>
          <Button className="w-full">Set a Savings Goal</Button>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Health Improvements</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Improved blood circulation</li>
            <li>Lower heart rate and blood pressure</li>
            <li>Better sense of smell and taste</li>
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Mood Tracker</h2>
          <div className="flex justify-between mb-4">
            {["😊", "😐", "😔"].map((emoji) => (
              <Button key={emoji} variant="outline" className="text-2xl">
                {emoji}
              </Button>
            ))}
          </div>
          <Button className="w-full">View Mood History</Button>
        </Card>
      </div>
    </>
  );
}
