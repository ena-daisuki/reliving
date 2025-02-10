"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";

export default function Memories() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    // TODO: Implement file upload to Firebase Storage
  };

  return (
    <>
      <PageTitle>Memories 📸</PageTitle>

      {/* Upload new memory */}
      <Card className="p-6 bg-white/90 mb-6">
        <div className="space-y-4">
          <label className="block">
            <span className="sr-only">Choose photo</span>
            <input
              type="file"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-purple-50 file:text-purple-700
                hover:file:bg-purple-100"
              accept="image/*"
              onChange={handleFileSelect}
            />
          </label>
          {selectedFile && (
            <Button onClick={handleUpload} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload Memory
            </Button>
          )}
        </div>
      </Card>

      {/* Memories grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* TODO: Replace with actual memories from Firebase */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-4 bg-white/90">
            <div className="aspect-square bg-purple-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-purple-400" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {new Date().toLocaleDateString()}
            </p>
          </Card>
        ))}
      </div>
    </>
  );
}
