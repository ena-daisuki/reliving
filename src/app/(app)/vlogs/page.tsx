"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Upload, Video } from "lucide-react";

export default function Vlogs() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    // TODO: Implement video upload to Firebase Storage
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Vlogs 🎥</h1>

      {/* Upload new vlog */}
      <Card className="p-6 bg-white/90 mb-6">
        <div className="space-y-4">
          <label className="block">
            <span className="sr-only">Choose video</span>
            <input
              type="file"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-purple-50 file:text-purple-700
                hover:file:bg-purple-100"
              accept="video/*"
              onChange={handleFileSelect}
            />
          </label>
          {selectedFile && (
            <Button onClick={handleUpload} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload Vlog
            </Button>
          )}
        </div>
      </Card>

      {/* Vlogs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TODO: Replace with actual vlogs from Firebase */}
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 bg-white/90">
            <div className="aspect-video bg-purple-100 rounded-lg flex items-center justify-center">
              <Video className="w-8 h-8 text-purple-400" />
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">Vlog #{i}</h3>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
