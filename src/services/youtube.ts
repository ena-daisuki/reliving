import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

const YOUTUBE_API_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

export async function refreshToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  return data.access_token;
}

export async function uploadToYoutube(
  file: File,
  title: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  const tokens = userDoc.data()?.youtubeTokens;

  if (!tokens) throw new Error("YouTube not connected");

  // Check if token is expired
  if (new Date() >= new Date(tokens.expiryDate)) {
    const newAccessToken = await refreshToken(tokens.refreshToken);
    await updateDoc(userRef, {
      "youtubeTokens.accessToken": newAccessToken,
      "youtubeTokens.expiryDate": new Date(Date.now() + 3600 * 1000), // 1 hour
    });
    tokens.accessToken = newAccessToken;
  }

  const formData = new FormData();
  formData.append("video", file);

  const metadata = {
    snippet: {
      title,
      description: "Uploaded via Reliving App",
    },
    status: {
      privacyStatus: "unlisted",
    },
  };

  formData.append("metadata", JSON.stringify(metadata));

  const response = await fetch(
    `${YOUTUBE_API_URL}?part=snippet,status&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to upload to YouTube");
  }

  const data = await response.json();
  return data.id;
}

export function initYoutubeAuth() {
  const userType = localStorage.getItem("user-type");

  if (userType === "owner") {
    throw new Error("Owner account uses a permanent YouTube connection");
  }

  const REDIRECT_URI = `${window.location.origin}/auth/youtube/callback`;
  const SCOPES = [
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.upload",
  ];

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.append(
    "client_id",
    process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID!
  );
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("access_type", "offline");
  authUrl.searchParams.append("prompt", "consent");
  authUrl.searchParams.append("scope", SCOPES.join(" "));

  window.location.href = authUrl.toString();
}
