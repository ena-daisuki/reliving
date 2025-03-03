"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { Vlog } from "@/types/database";
import { getVlogById } from "@/services/vlogs";
import { Loading } from "@/components/ui/loading";
import { AlertCircle } from "lucide-react";

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
        console.error("Error loading vlog:", error);
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

  // Convert YouTube watch URL to embed URL if needed
  const embedUrl = vlog.url.includes("youtube.com/watch?v=")
    ? vlog.url.replace("youtube.com/watch?v=", "youtube.com/embed/")
    : vlog.url.includes("youtu.be/")
    ? vlog.url.replace("youtu.be/", "youtube.com/embed/")
    : vlog.url;

  return (
    <>
      <PageTitle>{vlog.title} 🎥</PageTitle>
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
