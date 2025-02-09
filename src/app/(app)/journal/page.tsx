"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";

export default function Journal() {
  const [entry, setEntry] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle journal entry submission here
    console.log("Journal entry submitted:", entry);
    setEntry("");
  };

  return (
    <div className="pb-16">
      <header className="bg-purple-600 text-white p-4">
        <h1 className="text-2xl font-bold">Journal</h1>
      </header>
      <main className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Write your thoughts here..."
            className="w-full h-64 p-2 border rounded"
          />
          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Save Entry
          </Button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
