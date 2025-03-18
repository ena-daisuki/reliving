import { Vlog } from "@/types/database";
import { collection, doc, getDoc, addDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { uploadToYoutube, uploadThumbnail } from "@/services/youtube";

// YouTube API interfaces
interface YouTubePlaylistItem {
  snippet: {
    resourceId: {
      videoId: string;
    };
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
  };
}

export async function uploadVlog(
  file: File,
  userId: string,
  title: string,
  description?: string,
  visibility: "public" | "private" | "unlisted" = "unlisted",
  thumbnailFile?: File | null
) {
  try {
    // Upload to YouTube
    const videoId = await uploadToYoutube(
      file,
      title,
      description,
      visibility,
      thumbnailFile
    );

    // Create the vlog document in Firestore
    const vlogRef = await addDoc(collection(db, "vlogs"), {
      title,
      description: description || "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      visibility,
      userId,
      createdAt: new Date(),
    });

    return vlogRef.id;
  } catch (error) {
    throw error;
  }
}

export async function getVlogs() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Get user data to determine if owner or regular user
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }
    const userData = userDoc.data();

    // Get the user's YouTube tokens, regardless of user type
    const tokens = userData?.youtubeTokens;
    if (!tokens) {
      throw new Error(
        "YouTube not connected. Please connect your YouTube account in settings."
      );
    }
    const accessToken = tokens.accessToken;

    let youtubeVideos: Vlog[] = [];

    // First, get the user's channel ID
    const channelsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&mine=true&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!channelsResponse.ok) {
      throw new Error(
        `YouTube API error: ${channelsResponse.status} ${channelsResponse.statusText}`
      );
    }

    const channelsData = await channelsResponse.json();

    if (!channelsData.items || channelsData.items.length === 0) {
      throw new Error("No YouTube channel found for this account");
    }

    const userChannelId = channelsData.items[0].id;

    // Now fetch all uploads from this channel
    // First, get the uploads playlist ID
    const playlistsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${userChannelId}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!playlistsResponse.ok) {
      throw new Error(
        `YouTube API error: ${playlistsResponse.status} ${playlistsResponse.statusText}`
      );
    }

    const playlistsData = await playlistsResponse.json();

    const uploadsPlaylistId =
      playlistsData.items[0].contentDetails.relatedPlaylists.uploads;

    // Finally, get all videos from the uploads playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!videosResponse.ok) {
      throw new Error(
        `YouTube API error: ${videosResponse.status} ${videosResponse.statusText}`
      );
    }

    const videosData = await videosResponse.json();

    youtubeVideos = videosData.items.map((item: YouTubePlaylistItem) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url,
      createdAt: new Date(item.snippet.publishedAt).getTime(),
      userId: user.uid,
      visibility: "public", // Default visibility
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
    }));

    return youtubeVideos;
  } catch (error) {
    throw error;
  }
}

export async function deleteVlog(vlogId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Get user data to determine if owner or regular user
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }
    const userData = userDoc.data();

    // Get the user's YouTube tokens, regardless of user type
    const tokens = userData?.youtubeTokens;
    if (!tokens)
      throw new Error(
        "YouTube not connected. Please connect your YouTube account in settings."
      );
    const accessToken = tokens.accessToken;

    // Delete the video on YouTube
    const deleteResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${vlogId}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      throw new Error(
        `Failed to delete video: ${deleteResponse.status} ${deleteResponse.statusText}`
      );
    }

    return true;
  } catch (error) {
    throw error;
  }
}

export async function getVlogById(id: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Get user data
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }
    const userData = userDoc.data();

    // Get the user's YouTube tokens, regardless of user type
    const tokens = userData?.youtubeTokens;
    if (!tokens)
      throw new Error(
        "YouTube not connected. Please connect your YouTube account in settings."
      );
    const accessToken = tokens.accessToken;

    // Fetch the video details from YouTube
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${id}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!videoResponse.ok) {
      throw new Error(
        `Failed to get video: ${videoResponse.status} ${videoResponse.statusText}`
      );
    }

    const videoData = await videoResponse.json();

    if (!videoData.items || videoData.items.length === 0) {
      throw new Error("Video not found on YouTube");
    }

    const video = videoData.items[0];
    const snippet = video.snippet;
    const status = video.status;

    // Ensure we have a thumbnail URL
    const thumbnailUrl = snippet.thumbnails.high
      ? snippet.thumbnails.high.url
      : snippet.thumbnails.medium
      ? snippet.thumbnails.medium.url
      : snippet.thumbnails.default
      ? snippet.thumbnails.default.url
      : getYouTubeThumbnailUrl(video.id); // Use our helper function as a fallback

    // Convert YouTube data to Vlog format
    const vlogData = {
      id: video.id,
      title: snippet.title,
      description: snippet.description,
      thumbnail: thumbnailUrl,
      publishedAt: snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      userId: user.uid,
      visibility:
        status.privacyStatus === "private"
          ? "private"
          : status.privacyStatus === "unlisted"
          ? "unlisted"
          : "public",
      createdAt: new Date(snippet.publishedAt),
    } as Vlog;

    return vlogData;
  } catch (error) {
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
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Get user data
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }
    const userData = userDoc.data();

    // Get the user's YouTube tokens, regardless of user type
    const tokens = userData?.youtubeTokens;
    if (!tokens)
      throw new Error(
        "YouTube not connected. Please connect your YouTube account in settings."
      );
    const accessToken = tokens.accessToken;

    // Convert visibility to YouTube format
    const privacyStatus =
      visibility === "private"
        ? "private"
        : visibility === "unlisted"
        ? "unlisted"
        : "public";

    // Update the video on YouTube
    const updateResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: vlogId,
          snippet: {
            title,
            description,
            categoryId: "22", // People & Blogs category
          },
          status: {
            privacyStatus,
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(
        `Failed to update video: ${updateResponse.status} ${updateResponse.statusText}`
      );
    }

    await updateResponse.json(); // Parse response but don't store it since it's not used

    // If a new thumbnail was provided, upload it to YouTube
    if (thumbnailFile) {
      await uploadThumbnail(accessToken, vlogId, thumbnailFile);
    }

    return vlogId;
  } catch (error) {
    throw error;
  }
}

export async function fetchYouTubeVideos(): Promise<{
  added: number;
  duplicatesRemoved: number;
  total: number;
}> {
  // This function is now just a wrapper around getVlogs
  // It's kept for backward compatibility with existing code
  try {
    const videos = await getVlogs();
    return {
      added: 0, // We're not adding to Firestore anymore
      duplicatesRemoved: 0, // We're not removing duplicates anymore
      total: videos.length,
    };
  } catch (error) {
    throw error;
  }
}

// Helper function to get YouTube thumbnail URL from video ID
export function getYouTubeThumbnailUrl(videoId: string): string {
  // YouTube provides several thumbnail options, we'll use the high quality one
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Helper function to extract YouTube video ID from a YouTube URL
export function extractYouTubeVideoId(url: string): string | null {
  // Handle youtube.com/watch?v= format
  let match = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (match && match[1]) return match[1];

  // Handle youtu.be/ format
  match = url.match(/youtu\.be\/([^?]+)/);
  if (match && match[1]) return match[1];

  // Handle youtube.com/embed/ format
  match = url.match(/youtube\.com\/embed\/([^?]+)/);
  if (match && match[1]) return match[1];

  return null;
}

// Helper to get a safe thumbnail URL for a vlog
export function getSafeVlogThumbnailUrl(vlog: {
  url: string;
  thumbnail?: string;
}): string {
  // If vlog has a valid thumbnail, use it
  if (vlog.thumbnail) return vlog.thumbnail;

  // Otherwise try to extract a YouTube thumbnail
  const videoId = extractYouTubeVideoId(vlog.url);
  if (videoId) return getYouTubeThumbnailUrl(videoId);

  // If all else fails, return an empty string
  return "";
}
