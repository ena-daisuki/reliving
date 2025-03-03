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
  Timestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  uploadToYoutube,
  refreshToken,
  uploadThumbnail,
} from "@/services/youtube";
import { getAuth } from "firebase/auth";

export async function uploadVlog(
  file: File,
  userId: string,
  title: string,
  description?: string,
  visibility: "public" | "private" | "unlisted" = "unlisted",
  thumbnailFile?: File | null
) {
  // Upload to YouTube
  const videoId = await uploadToYoutube(
    file,
    title,
    description,
    visibility,
    thumbnailFile
  );
  if (!videoId) throw new Error("Failed to upload video to YouTube");

  // Save metadata to Firestore
  const vlogData: Omit<Vlog, "id"> = {
    userId,
    title,
    description: description || "",
    visibility,
    thumbnail: thumbnailFile
      ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg?custom=true` // Custom thumbnail will be set by YouTube API
      : `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    createdAt: serverTimestamp() as unknown as Date,
  };

  const docRef = await addDoc(collection(db, "vlogs"), vlogData);
  return docRef.id;
}

export async function getVlogs() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Fetch vlogs from Firestore
    const vlogsCollection = collection(db, "vlogs");
    const q = query(vlogsCollection, where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    const vlogs: Vlog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      vlogs.push({
        id: doc.id,
        ...data,
        // Ensure createdAt is a Date object
        createdAt:
          data.createdAt instanceof Date
            ? data.createdAt
            : data.createdAt && typeof data.createdAt.toDate === "function"
            ? data.createdAt.toDate()
            : new Date(),
      } as Vlog);
    });

    return vlogs;
  } catch (error) {
    console.error("Error in getVlogs:", error);
    throw error;
  }
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
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Get the vlog document from Firestore
    const vlogRef = doc(db, "vlogs", id);
    const vlogDoc = await getDoc(vlogRef);

    if (!vlogDoc.exists()) {
      throw new Error("Vlog not found");
    }

    // Get the vlog data and add the id
    const vlogData = vlogDoc.data();

    // Handle Firestore timestamp conversion to Date
    let createdAt: Date;
    if (vlogData.createdAt instanceof Date) {
      createdAt = vlogData.createdAt;
    } else if (vlogData.createdAt instanceof Timestamp) {
      // Handle Firestore Timestamp
      createdAt = vlogData.createdAt.toDate();
    } else {
      // Fallback
      createdAt = new Date();
    }

    return {
      id,
      ...vlogData,
      createdAt,
    } as Vlog;
  } catch (error) {
    console.error("Error getting vlog by ID:", error);
    throw error;
  }
}

export async function updateVlog(
  vlogId: string,
  title: string,
  description: string,
  visibility: "public" | "private" | "unlisted",
  thumbnailFile?: File | null
) {
  try {
    console.log("updateVlog called with ID:", vlogId);

    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Get the vlog document to check ownership
    const vlogRef = doc(db, "vlogs", vlogId);
    console.log(
      "Fetching vlog document from Firestore with ref:",
      vlogRef.path
    );

    const vlogDoc = await getDoc(vlogRef);
    console.log("Vlog document exists:", vlogDoc.exists());

    if (!vlogDoc.exists()) {
      throw new Error("Vlog not found");
    }

    const vlogData = vlogDoc.data() as Vlog;

    // Check if the user owns this vlog
    if (vlogData.userId !== user.uid) {
      throw new Error("You don't have permission to edit this vlog");
    }

    // Extract video ID from URL
    const videoIdMatch = vlogData.url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    if (!videoIdMatch || !videoIdMatch[1]) {
      throw new Error("Could not determine YouTube video ID");
    }
    const videoId = videoIdMatch[1];

    // Get user tokens
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    // Handle different user types
    let accessToken;

    if (userData?.type === "owner") {
      // For owner, use environment variables
      accessToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_ACCESS_TOKEN;
      const refreshTokenValue =
        process.env.NEXT_PUBLIC_OWNER_YOUTUBE_REFRESH_TOKEN;

      if (!accessToken || !refreshTokenValue) {
        throw new Error("Owner YouTube credentials not configured");
      }

      // Check if token needs refresh
      try {
        const testResponse = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (testResponse.status === 401) {
          // Token expired, refresh it
          accessToken = await fetch("/api/youtube/refresh", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
          })
            .then((res) => res.json())
            .then((data) => data.accessToken);

          if (!accessToken) {
            throw new Error("Failed to refresh owner YouTube token");
          }
        }
      } catch (error) {
        console.error("Error checking owner token:", error);
        throw new Error("Failed to validate YouTube credentials");
      }
    } else {
      // For regular users
      const tokens = userData?.youtubeTokens;
      if (!tokens) throw new Error("YouTube not connected");

      // Check if token is expired
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
    }

    // Update video on YouTube
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: videoId,
          snippet: {
            title,
            description,
            categoryId: "22", // People & Blogs category
          },
          status: {
            privacyStatus: visibility,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube update error:", errorText);
      throw new Error(`Failed to update YouTube video: ${errorText}`);
    }

    // Upload new thumbnail if provided
    if (thumbnailFile) {
      try {
        await uploadThumbnail(accessToken, videoId, thumbnailFile);
      } catch (thumbnailError) {
        console.error("Failed to upload thumbnail:", thumbnailError);
        // Continue even if thumbnail upload fails
      }
    }

    // Update Firestore document
    await updateDoc(vlogRef, {
      title,
      description,
      visibility,
      // Only update thumbnail URL if a new thumbnail was uploaded
      ...(thumbnailFile
        ? {
            thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg?t=${Date.now()}`,
          }
        : {}),
    });

    return vlogId;
  } catch (error) {
    console.error("Error updating vlog:", error);
    throw error;
  }
}

// Define interfaces for YouTube API responses
interface YouTubeVideoItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
  };
}

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

interface VlogDocument {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  visibility?: string;
  userId?: string;
  createdAt?: Date | Timestamp;
  [key: string]: unknown; // Use unknown instead of any for better type safety
}

// Helper functions for token refresh
async function refreshOwnerToken(refreshToken: string) {
  // Implement token refresh logic for owner
  const response = await fetch("/api/youtube/refresh-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
      isOwner: true,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh owner token");
  }

  return await response.json();
}

async function refreshUserToken(userId: string, refreshToken: string) {
  // Implement token refresh logic for regular user
  const response = await fetch("/api/youtube/refresh-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
      userId,
      isOwner: false,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh user token");
  }

  return await response.json();
}

export async function syncYouTubeWithFirestore(): Promise<{
  added: number;
  duplicatesRemoved: number;
  total: number;
}> {
  // Check if user is logged in
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not logged in");
  }

  // Get user data to determine if owner or regular user
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    throw new Error("User document not found");
  }
  const userData = userDoc.data();
  const isOwner = userData.role === "owner";

  let accessToken;
  if (isOwner) {
    // Get owner token
    const ownerTokenDoc = await getDoc(doc(db, "tokens", "owner"));
    if (!ownerTokenDoc.exists()) {
      throw new Error("Owner token not found");
    }
    const ownerTokenData = ownerTokenDoc.data();
    accessToken = ownerTokenData.access_token;

    // Check if token is expired and refresh if needed
    if (Date.now() > ownerTokenData.expires_at) {
      const refreshedToken = await refreshOwnerToken(
        ownerTokenData.refresh_token
      );
      accessToken = refreshedToken.access_token;
    }
  } else {
    // Get user token
    const userTokenDoc = await getDoc(doc(db, "tokens", user.uid));
    if (!userTokenDoc.exists()) {
      throw new Error("User token not found");
    }
    const userTokenData = userTokenDoc.data();
    accessToken = userTokenData.access_token;

    // Check if token is expired and refresh if needed
    if (Date.now() > userTokenData.expires_at) {
      const refreshedToken = await refreshUserToken(
        user.uid,
        userTokenData.refresh_token
      );
      accessToken = refreshedToken.access_token;
    }
  }

  // Fetch videos from YouTube API
  let youtubeVideos: YouTubeVideo[] = [];
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&maxResults=50&type=video&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `YouTube API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    youtubeVideos = data.items.map((item: YouTubeVideoItem) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    throw new Error("Failed to fetch videos from YouTube");
  }

  // Get existing vlogs from Firestore
  const vlogsSnapshot = await getDocs(collection(db, "vlogs"));
  const existingVlogs: VlogDocument[] = vlogsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<VlogDocument, "id">),
  }));

  // Create a map of existing YouTube video IDs to their Firestore document IDs
  const existingVideoMap = new Map<string, string>();
  const duplicates: string[] = [];

  existingVlogs.forEach((vlog) => {
    // Extract YouTube video ID from URL
    const videoId = vlog.url?.split("v=")[1]?.split("&")[0];
    if (videoId) {
      if (existingVideoMap.has(videoId)) {
        // This is a duplicate
        duplicates.push(vlog.id);
      } else {
        existingVideoMap.set(videoId, vlog.id);
      }
    }
  });

  console.log(`Found ${duplicates.length} duplicate vlogs to remove`);

  // Delete duplicate documents
  const deletePromises = duplicates.map((docId) =>
    deleteDoc(doc(db, "vlogs", docId))
  );
  await Promise.all(deletePromises);

  // Add new YouTube videos to Firestore if they don't already exist
  const syncPromises = youtubeVideos.map(async (video: YouTubeVideo) => {
    if (!existingVideoMap.has(video.id)) {
      // Fetch video visibility
      let visibility = "public";
      try {
        const videoResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=status&id=${video.id}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          if (videoData.items && videoData.items.length > 0) {
            visibility = videoData.items[0].status.privacyStatus;
          }
        }
      } catch (error) {
        console.error("Error fetching video visibility:", error);
        // Continue with default visibility
      }

      // Add to Firestore
      return addDoc(collection(db, "vlogs"), {
        title: video.title,
        description: video.description,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnail: video.thumbnail,
        visibility: visibility,
        userId: user.uid,
        createdAt: new Date(),
      });
    }
    return null;
  });

  const results = await Promise.all(syncPromises);
  const addedCount = results.filter((result) => result !== null).length;

  return {
    added: addedCount,
    duplicatesRemoved: duplicates.length,
    total: youtubeVideos.length,
  };
}
