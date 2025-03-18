import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

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
  title: string,
  description?: string,
  visibility: "public" | "private" | "unlisted" = "unlisted",
  thumbnailFile?: File | null
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();

  // Get user's YouTube tokens
  const tokens = userData?.youtubeTokens;
  if (!tokens)
    throw new Error(
      "YouTube not connected. Please connect your YouTube account in settings."
    );

  // Check if token is expired
  let accessToken;
  if (new Date() >= new Date(tokens.expiryDate)) {
    const newAccessToken = await refreshToken(tokens.refreshToken);
    await updateDoc(userRef, {
      "youtubeTokens.accessToken": newAccessToken,
      "youtubeTokens.expiryDate": new Date(Date.now() + 3600 * 1000), // 1 hour
    });
    accessToken = newAccessToken;
  } else {
    accessToken = tokens.accessToken;
  }

  // Step 1: Initialize the resumable upload session
  const metadata = {
    snippet: {
      title,
      description: description || "Uploaded via Reliving App",
      categoryId: "22", // People & Blogs category
    },
    status: {
      privacyStatus: visibility,
    },
  };

  const initResponse = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": file.type,
        "X-Upload-Content-Length": file.size.toString(),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    console.error("YouTube upload initialization error:", errorText);
    throw new Error(`Failed to initialize YouTube upload: ${errorText}`);
  }

  // Get the upload URL from the Location header
  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Failed to get upload URL from YouTube");
  }

  // Step 2: Upload the file
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Content-Length": file.size.toString(),
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error("YouTube upload error:", errorText);
    throw new Error(`Failed to upload to YouTube: ${errorText}`);
  }

  // Parse the response to get the video ID
  let uploadData;
  try {
    uploadData = await uploadResponse.json();
  } catch (error) {
    console.error("Error parsing upload response:", error);

    // If the response is not JSON but the upload was successful,
    // try to extract the video ID from the Location header
    const locationHeader = uploadResponse.headers.get("Location");
    if (locationHeader) {
      const videoIdMatch = locationHeader.match(/\/([a-zA-Z0-9_-]{11})$/);
      if (videoIdMatch && videoIdMatch[1]) {
        return videoIdMatch[1];
      }
    }

    throw new Error("Failed to get video ID from YouTube response");
  }

  if (!uploadData.id) {
    console.error("Invalid upload response:", uploadData);
    throw new Error("Failed to get video ID from YouTube");
  }

  // Step 3: Upload custom thumbnail if provided
  if (thumbnailFile && uploadData.id) {
    try {
      await uploadThumbnail(accessToken, uploadData.id, thumbnailFile);
    } catch (thumbnailError) {
      console.error("Failed to upload thumbnail:", thumbnailError);
      // Continue even if thumbnail upload fails
    }
  }

  return uploadData.id;
}

// Helper function to upload a custom thumbnail
export async function uploadThumbnail(
  accessToken: string,
  videoId: string,
  thumbnailFile: File
): Promise<void> {
  const formData = new FormData();
  formData.append("image", thumbnailFile);

  const response = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload thumbnail: ${errorText}`);
  }
}

export function initYoutubeAuth() {
  // Use the server-side auth route instead of direct OAuth URL construction
  // This avoids CORS issues by letting the server handle the redirect
  window.location.href = "/api/youtube/auth";
}
