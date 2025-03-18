"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/loading";

export default function YouTubeCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status] = useState("Redirecting you back to the application...");

  useEffect(() => {
    // Check for error in URL
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      return;
    }

    // Delay a moment, then redirect to the vlogs page
    // The server should have already processed the authentication
    const timer = setTimeout(() => {
      router.push("/vlogs");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  if (error) {
    return (
      <div className="p-4 max-w-xl mx-auto mt-8">
        <h2 className="text-red-500 font-bold text-xl mb-4">
          Authentication Error
        </h2>
        <pre className="mt-2 p-4 bg-red-50 rounded border border-red-200 overflow-auto">
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-xl mx-auto mt-8 text-center">
      <h2 className="text-xl font-semibold mb-4">YouTube Authentication</h2>
      <Loading text={status} />
    </div>
  );
}
