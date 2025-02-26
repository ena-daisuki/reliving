"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Upload, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { Loading } from "@/components/ui/loading";
import { uploadVlog, getVlogs, deleteVlog } from "@/services/vlogs";
import { Vlog } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { initYoutubeAuth } from "@/services/youtube";
import Image from "next/image";
import Link from "next/link";

export default function Vlogs() {
  const { loading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isYoutubeAuthed, setIsYoutubeAuthed] = useState(false);
  const { userType } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      loadVlogs();
    }
  }, [authLoading]);

  useEffect(() => {
    const token = localStorage.getItem("youtube_access_token");
    setIsYoutubeAuthed(!!token);
  }, []);

  const loadVlogs = async () => {
    setIsLoading(true);
    try {
      const fetchedVlogs = await getVlogs();
      setVlogs(fetchedVlogs);
    } catch (error) {
      console.error("Error loading vlogs:", error);
      setError("Failed to load vlogs");
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
    if (!selectedFile || !title) return;
    setIsUploading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Please log in to upload vlogs");
      }

      await uploadVlog(selectedFile, user.uid, title);
      setSelectedFile(null);
      setTitle("");
      loadVlogs();
    } catch (error) {
      console.error("Upload error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to upload vlog"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (vlogId: string) => {
    setIsDeleting(vlogId);
    try {
      await deleteVlog(vlogId);
      loadVlogs();
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete vlog");
    } finally {
      setIsDeleting(null);
    }
  };

  if (authLoading) {
    return <Loading text="Authenticating..." />;
  }

  if (isLoading) {
    return <Loading text="Loading vlogs..." />;
  }

  return (
    <>
      <PageTitle>Vlogs 🎥</PageTitle>

      {/* Upload new vlog */}
      <Card className="p-6 bg-white/90 mb-6">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter vlog title"
            className="w-full p-2 border rounded-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
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
          {!isYoutubeAuthed && userType !== "owner" && (
            <Button onClick={initYoutubeAuth} className="w-full mb-4">
              Connect YouTube Account
            </Button>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {selectedFile && (
            <Button
              onClick={handleUpload}
              className="w-full"
              disabled={isUploading || !title}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? (
                <Loading text="Uploading vlog..." />
              ) : (
                "Upload Vlog"
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Vlogs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vlogs.map((vlog) => (
          <Link href={`/vlogs/${vlog.id}`} key={vlog.id}>
            <Card className="p-4 bg-white/90 hover:bg-white transition-colors">
              <div className="relative aspect-video mb-2">
                <Image
                  src={vlog.thumbnail}
                  alt={vlog.title}
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
              <h3 className="font-semibold mb-2">{vlog.title}</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {new Date(vlog.createdAt).toLocaleDateString()}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting === vlog.id}
                  onClick={(e) => {
                    e.preventDefault();
                    if (vlog.id) handleDelete(vlog.id);
                  }}
                >
                  {isDeleting === vlog.id ? (
                    <Loading />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
