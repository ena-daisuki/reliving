"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logger } from "@/lib/logger";

export default function YouTubeCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    logger.log("Current user:", auth.currentUser);
    logger.log("Auth code:", code);

    if (errorParam) {
      console.error("OAuth error:", errorParam);
      setError("Authentication failed: " + errorParam);
      return;
    }

    if (code) {
      setStatus("Waiting for authentication...");

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setStatus("Getting fresh token...");
          user
            .getIdToken(true)
            .then((freshToken) => {
              logger.log("Got fresh token");
              document.cookie = `auth-token=${freshToken}; path=/`;
              setStatus("Making API request...");

              return fetch(`/api/youtube/auth?code=${code}`).then(
                (response) => {
                  if (response.redirected) {
                    window.location.href = response.url;
                    return;
                  }
                  return response.json();
                }
              );
            })
            .catch((error) => {
              console.error("Detailed auth error:", error);
              setError(error.message);
            });
        } else {
          setError("Not authenticated with Firebase");
          router.push("/login");
        }
      });

      return () => unsubscribe();
    }
  }, [router]);

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-red-500 font-bold">Authentication Error</h2>
        <pre className="mt-2 p-2 bg-red-50 rounded">{error}</pre>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2>YouTube Authentication</h2>
      <p>{status}</p>
    </div>
  );
}
