"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { Vlog } from "@/types/database";
import { getVlogById } from "@/services/vlogs";
import { Loading } from "@/components/ui/loading";

export default function VlogPage() {
  const { id } = useParams();
  const [vlog, setVlog] = useState<Vlog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVlog = async () => {
      if (typeof id !== "string") return;
      try {
        const vlogData = await getVlogById(id);
        setVlog(vlogData);
      } catch (error) {
        console.error("Error loading vlog:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVlog();
  }, [id]);

  if (loading) return <Loading text="Loading vlog..." />;
  if (!vlog) return <div>Vlog not found</div>;

  return (
    <>
      <PageTitle>{vlog.title} 🎥</PageTitle>
      <Card className="p-6 bg-white/90">
        <div className="aspect-video w-full mb-4">
          <iframe
            className="w-full h-full rounded-lg"
            src={vlog.url}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="text-sm text-gray-500">
          Posted on: {new Date(vlog.createdAt).toLocaleDateString()}
        </div>
      </Card>
    </>
  );
}
