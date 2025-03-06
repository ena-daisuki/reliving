import { Vlog } from "@/types/database";
import { collection, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { uploadToYoutube, uploadThumbnail } from "@/services/youtube";

// YouTube API interfaces
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
    const isOwner = userData.type === "owner";

    let youtubeVideos: Vlog[] = [];

    if (isOwner) {
      // For owner accounts, use the access token from environment variables
      let accessToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_ACCESS_TOKEN;
      const refreshToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_REFRESH_TOKEN;

      if (!accessToken) {
        throw new Error(
          "Owner YouTube access token not configured in environment variables"
        );
      }

      if (!refreshToken) {
        // Handle warning or token refresh similar to the existing code
        if (channelsResponse.status === 401) {
          // Call your token refresh API with absolute URL
          const refreshResponse = await fetch(
            `${process.env.NEXT_PUBLIC_URL}/api/youtube/refresh`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                refreshToken: refreshToken,
              }),
            }
          );

          if (!refreshResponse.ok) {
            throw new Error(
              "Failed to refresh YouTube token - please reconnect your account"
            );
          }

          const refreshData = await refreshResponse.json();

          // Update the user document with the new token
          await updateDoc(doc(db, "users", user.uid), {
            "youtubeTokens.accessToken": refreshData.accessToken,
            "youtubeTokens.expiryDate": new Date().toISOString(),
          });

          // Retry with the new token by calling getVlogs again
          return getVlogs();
        } else {
          throw new Error(
            `YouTube API error: ${channelsResponse.status} ${channelsResponse.statusText}`
          );
        }
      }

      // Use the access token to get the owner's videos directly
      // First, get the user's channel ID
      let channelsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&mine=true&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!channelsResponse.ok) {
        throw new Error(
          `Failed to get owner channel: ${channelsResponse.status} ${channelsResponse.statusText}`
        );
      }

      const channelsData = await channelsResponse.json();

      if (!channelsData.items || channelsData.items.length === 0) {
        throw new Error("No YouTube channel found for owner account");
      }

      const userChannelId = channelsData.items[0].id;

      // Get the uploads playlist ID
      const uploadsPlaylistId =
        channelsData.items[0].contentDetails.relatedPlaylists.uploads;

      // Get videos from the uploads playlist
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
          `Failed to get owner videos: ${videosResponse.status} ${videosResponse.statusText}`
        );
      }

      const videosData = await videosResponse.json();

      if (!videosData.items || videosData.items.length === 0) {
        // Try the search endpoint as a fallback
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&maxResults=50&type=video&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!searchResponse.ok) {
          throw new Error(
            `Failed to search owner videos: ${searchResponse.status} ${searchResponse.statusText}`
          );
        }

        const searchData = await searchResponse.json();

        if (!searchData.items || searchData.items.length === 0) {
          return [];
        }

        return searchData.items.map((item: YouTubeVideoItem) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high.url,
          publishedAt: item.snippet.publishedAt,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          userId: user.uid,
          visibility: "public",
          createdAt: new Date(item.snippet.publishedAt),
        }));
      }

      return videosData.items.map((item: YouTubePlaylistItem) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high
          ? item.snippet.thumbnails.high.url
          : item.snippet.thumbnails.medium
          ? item.snippet.thumbnails.medium.url
          : item.snippet.thumbnails.default!.url,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        userId: user.uid,
        visibility: "public",
        createdAt: new Date(item.snippet.publishedAt),
      }));
    } else {
      // For special accounts, check if they have YouTube tokens
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
        // Handle error or token refresh similar to the existing code
        if (channelsResponse.status === 401) {
          // Call your token refresh API with absolute URL
          const refreshResponse = await fetch(
            `${process.env.NEXT_PUBLIC_URL}/api/youtube/refresh`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                refreshToken: userData.youtubeTokens.refreshToken,
              }),
            }
          );

          if (!refreshResponse.ok) {
            throw new Error(
              "Failed to refresh YouTube token - please reconnect your account"
            );
          }

          const refreshData = await refreshResponse.json();

          // Update the user document with the new token
          await updateDoc(doc(db, "users", user.uid), {
            "youtubeTokens.accessToken": refreshData.accessToken,
            "youtubeTokens.expiryDate": new Date().toISOString(),
          });

          // Retry with the new token by calling getVlogs again
          return getVlogs();
        } else {
          throw new Error(
            `YouTube API error: ${channelsResponse.status} ${channelsResponse.statusText}`
          );
        }
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

      if (!videosData.items || videosData.items.length === 0) {
        // Try the search endpoint as a fallback
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&maxResults=50&type=video&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!searchResponse.ok) {
          throw new Error(
            `YouTube API search error: ${searchResponse.status} ${searchResponse.statusText}`
          );
        }

        const searchData = await searchResponse.json();

        if (searchData.items && searchData.items.length > 0) {
          youtubeVideos = searchData.items.map((item: YouTubeVideoItem) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.high.url,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            userId: user.uid,
            visibility: "public",
            createdAt: new Date(item.snippet.publishedAt),
          }));
        } else {
          youtubeVideos = [];
        }
      } else {
        youtubeVideos = videosData.items.map((item: YouTubePlaylistItem) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high
            ? item.snippet.thumbnails.high.url
            : item.snippet.thumbnails.medium
            ? item.snippet.thumbnails.medium.url
            : item.snippet.thumbnails.default!.url,
          publishedAt: item.snippet.publishedAt,
          url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
          userId: user.uid,
          visibility: "public",
          createdAt: new Date(item.snippet.publishedAt),
        }));
      }
    }

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
    const isOwner = userData.type === "owner";

    // Get the access token based on user type
    let accessToken;
    if (isOwner) {
      // For owner, use environment variable
      accessToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error("Owner YouTube access token not configured");
      }
    } else {
      // For regular users
      const tokens = userData?.youtubeTokens;
      if (!tokens) throw new Error("YouTube not connected");
      accessToken = tokens.accessToken;
    }

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

    // Get user data to determine if owner or regular user
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }
    const userData = userDoc.data();
    const isOwner = userData.type === "owner";

    // Get the access token based on user type
    let accessToken;
    if (isOwner) {
      // For owner, use environment variable
      accessToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error("Owner YouTube access token not configured");
      }
    } else {
      // For regular users
      const tokens = userData?.youtubeTokens;
      if (!tokens) throw new Error("YouTube not connected");
      accessToken = tokens.accessToken;
    }

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

    // Convert YouTube data to Vlog format
    return {
      id: video.id,
      title: snippet.title,
      description: snippet.description,
      thumbnail: snippet.thumbnails.high
        ? snippet.thumbnails.high.url
        : snippet.thumbnails.medium
        ? snippet.thumbnails.medium.url
        : snippet.thumbnails.default.url,
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

    // Get user data to determine if owner or regular user
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }
    const userData = userDoc.data();
    const isOwner = userData.type === "owner";

    // Get the access token based on user type
    let accessToken;
    if (isOwner) {
      // For owner, use environment variable
      accessToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error("Owner YouTube access token not configured");
      }
    } else {
      // For regular users
      const tokens = userData?.youtubeTokens;
      if (!tokens) throw new Error("YouTube not connected");
      accessToken = tokens.accessToken;
    }

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

    const updateData = await updateResponse.json();

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
