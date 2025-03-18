"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { Vlog } from "@/types/database";
import { getVlogById, extractYouTubeVideoId } from "@/services/vlogs";
import { Loading } from "@/components/ui/loading";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function VlogPage() {
  const { id } = useParams();
  const router = useRouter();
  const [vlog, setVlog] = useState<Vlog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVlog = async () => {
      if (typeof id !== "string") return;
      try {
        const vlogData = await getVlogById(id);
        setVlog(vlogData);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load vlog"
        );
      } finally {
        setLoading(false);
      }
    };

    loadVlog();
  }, [id]);

  if (loading) return <Loading text="Loading vlog..." />;

  if (error) {
    return (
      <>
        <PageTitle>Error Loading Vlog</PageTitle>
        <Card className="p-6 bg-white/90">
          <div className="flex items-center text-red-500 mb-4">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
          <button
            onClick={() => router.push("/vlogs")}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Vlogs
          </button>
        </Card>
      </>
    );
  }

  if (!vlog) return <div>Vlog not found</div>;

  // Get the video ID for embedding
  const videoId = extractYouTubeVideoId(vlog.url);

  // Create a safe embed URL
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}`
    : vlog.url; // Fallback to the original URL if extraction fails

  return (
    <>
      <div className="flex items-center mb-4">
        <button
          onClick={() => router.push("/vlogs")}
          className="flex items-center text-blue-500 hover:text-blue-700 mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Vlogs
        </button>
        <PageTitle>{vlog.title} 🎥</PageTitle>
      </div>
      <Card className="p-6 bg-white/90">
        <div className="aspect-video w-full mb-4">
          <iframe
            className="w-full h-full rounded-lg"
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="text-sm text-gray-500 mb-4">
          Posted on: {new Date(vlog.createdAt).toLocaleDateString()}
        </div>
        {vlog.description && (
          <div className="mt-4 text-gray-700 whitespace-pre-wrap">
            {vlog.description}
          </div>
        )}
      </Card>
    </>
  );
}
