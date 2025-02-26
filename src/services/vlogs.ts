import { db } from "@/lib/firebase";
import { Vlog } from "@/types/database";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { uploadToYoutube, refreshToken } from "@/services/youtube";

interface YouTubeVideoItem {
  id: { videoId: string };
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails: {
      medium: { url: string };
    };
  };
}

export async function uploadVlog(file: File, userId: string, title: string) {
  // Upload to YouTube
  const videoId = await uploadToYoutube(file, title);
  if (!videoId) throw new Error("Failed to upload video to YouTube");

  // Save metadata to Firestore
  const vlogData: Omit<Vlog, "id"> = {
    userId,
    title,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    createdAt: serverTimestamp() as unknown as Date,
  };

  const docRef = await addDoc(collection(db, "vlogs"), vlogData);
  return docRef.id;
}

async function refreshOwnerToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  return data.access_token;
}

export async function getVlogs() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  const userType = userDoc.data()?.type;

  if (userType === "owner") {
    let accessToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_ACCESS_TOKEN!;
    const refreshToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_REFRESH_TOKEN!;

    // Try with current access token
    let response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    // If token expired, refresh and try again
    if (response.status === 401) {
      try {
        accessToken = await refreshOwnerToken(refreshToken);
        response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          }
        );
      } catch (error) {
        console.error("Error refreshing token:", error);
        throw new Error("Failed to refresh YouTube token");
      }
    }

    if (!response.ok) {
      console.error("YouTube API Error:", await response.text());
      throw new Error("Failed to fetch videos from YouTube");
    }

    const data = await response.json();
    return data.items.map((item: YouTubeVideoItem) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails.medium.url,
      createdAt: new Date(item.snippet.publishedAt),
    }));
  }

  // Rest of the existing code for special users
  const tokens = userDoc.data()?.youtubeTokens;
  if (!tokens) return [];

  // Check if token is expired and refresh if needed
  if (new Date() >= new Date(tokens.expiryDate)) {
    const newAccessToken = await refreshToken(tokens.refreshToken);
    await updateDoc(userRef, {
      "youtubeTokens.accessToken": newAccessToken,
      "youtubeTokens.expiryDate": new Date(Date.now() + 3600 * 1000),
    });
    tokens.accessToken = newAccessToken;
  }

  // Fetch videos from YouTube API
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch videos from YouTube");
  }

  const data = await response.json();

  return data.items.map((item: YouTubeVideoItem) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    thumbnail: item.snippet.thumbnails.medium.url,
    createdAt: new Date(item.snippet.publishedAt),
  }));
}

export async function deleteVlog(vlogId: string) {
  // TODO: Implement YouTube video deletion using the YouTube API
  // You'll need to make an authenticated DELETE request to:
  // https://www.googleapis.com/youtube/v3/videos?id={videoId}

  // Delete from Firestore
  const vlogRef = doc(db, "vlogs", vlogId);
  await deleteDoc(vlogRef);
}

export async function getVlogById(id: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  const tokens = userDoc.data()?.youtubeTokens;

  if (!tokens) throw new Error("YouTube not connected");

  // Check if token is expired and refresh if needed
  if (new Date() >= new Date(tokens.expiryDate)) {
    const newAccessToken = await refreshToken(tokens.refreshToken);
    await updateDoc(userRef, {
      "youtubeTokens.accessToken": newAccessToken,
      "youtubeTokens.expiryDate": new Date(Date.now() + 3600 * 1000),
    });
    tokens.accessToken = newAccessToken;
  }

  return {
    id,
    title: "Your Video",
    url: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1&controls=1&origin=${encodeURIComponent(
      window.location.origin
    )}`,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    createdAt: new Date(),
  } as Vlog;
}
