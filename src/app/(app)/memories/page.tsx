"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { uploadMemory, getMemories, deleteMemory } from "@/services/memories";
import { Memory } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/ui/loading";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

export default function Memories() {
  const { loading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      loadMemories();
    }
  }, [authLoading]);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const fetchedMemories = await getMemories();
      setMemories(fetchedMemories);
    } catch (error) {
      console.error("Error loading memories:", error);
      setError("Failed to load memories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Please log in to upload memories");
      }

      await uploadMemory(selectedFile, user.uid, caption);
      setSelectedFile(null);
      setCaption("");
      loadMemories();
    } catch (error) {
      console.error("Upload error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to upload memory"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (memoryId: string, filename: string) => {
    setIsDeleting(memoryId);
    try {
      await deleteMemory(memoryId, filename);
      loadMemories();
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete memory");
    } finally {
      setIsDeleting(null);
    }
  };

  if (authLoading) {
    return <Loading text="Authenticating..." />;
  }

  if (isLoading) {
    return <Loading text="Loading memories..." />;
  }

  return (
    <>
      <PageTitle>Memories 📸</PageTitle>

      {/* Upload new memory */}
      <Card className="p-6 bg-white/90 mb-6">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Add a caption (optional)"
            className="w-full p-2 border rounded-lg"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {selectedFile && (
            <Button
              onClick={handleUpload}
              className="w-full"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Memory"}
            </Button>
          )}
        </div>
      </Card>

      {/* Memories grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {memories.map((memory) => (
          <Card key={memory.id} className="p-4 bg-white/90 relative">
            <div className="aspect-square bg-purple-100 rounded-lg overflow-hidden">
              {memory.imageUrl ? (
                <Image
                  src={memory.imageUrl}
                  alt={memory.caption || "Memory"}
                  width={400}
                  height={400}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-8 h-8 text-purple-400" />
                </div>
              )}
            </div>
            {memory.caption && (
              <p className="mt-2 text-sm text-gray-700">{memory.caption}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {memory.createdAt instanceof Date
                ? memory.createdAt.toLocaleDateString()
                : new Date(
                    (memory.createdAt as Timestamp).seconds * 1000
                  ).toLocaleDateString()}
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 p-1 h-8 w-8"
              onClick={() =>
                memory.id &&
                memory.filename &&
                handleDelete(memory.id, memory.filename)
              }
              disabled={isDeleting === memory.id}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}
