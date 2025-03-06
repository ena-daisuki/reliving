import { Vlog } from "@/types/database";
import { collection, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { uploadToYoutube, uploadThumbnail } from "@/services/youtube";
import { logger } from "@/lib/logger";

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
    console.error("Error in uploadVlog:", error);
    throw error;
  }
}

export async function getVlogs() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    logger.log("Getting vlogs for user:", user.uid);

    // Get user data to determine if owner or regular user
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }
    const userData = userDoc.data();
    const isOwner = userData.type === "owner";

    let youtubeVideos: Vlog[] = [];

    if (isOwner) {
      logger.log("User is owner, using owner access token directly");

      // For owner accounts, use the access token from environment variables
      let accessToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_ACCESS_TOKEN;
      const refreshToken = process.env.NEXT_PUBLIC_OWNER_YOUTUBE_REFRESH_TOKEN;

      if (!accessToken) {
        throw new Error(
          "Owner YouTube access token not configured in environment variables"
        );
      }

      if (!refreshToken) {
        console.warn(
          "Owner YouTube refresh token not configured in environment variables"
        );
      }

      try {
        // Use the access token to get the owner's videos directly
        logger.log("Using owner access token to get videos");

        // First, get the user's channel ID
        let channelsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&mine=true&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        // If token is expired, refresh it
        if (channelsResponse.status === 401 && refreshToken) {
          logger.log("Owner token expired, refreshing token...");

          try {
            // Call the refresh token API
            const refreshResponse = await fetch(
              "https://oauth2.googleapis.com/token",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  client_id: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || "",
                  client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
                  refresh_token: refreshToken,
                  grant_type: "refresh_token",
                }).toString(),
              }
            );

            if (!refreshResponse.ok) {
              const errorText = await refreshResponse.text();
              console.error("Failed to refresh owner token:", errorText);
              throw new Error(
                `Failed to refresh owner token: ${refreshResponse.status} ${refreshResponse.statusText}`
              );
            }

            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;

            if (!accessToken) {
              throw new Error(
                "Failed to get new access token from refresh response"
              );
            }

            logger.log("Successfully refreshed owner token");

            // Retry with the new token
            channelsResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&mine=true&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
          } catch (refreshError) {
            console.error("Error refreshing owner token:", refreshError);
            throw new Error(
              "Failed to refresh owner token. Please update the access token in .env.local"
            );
          }
        }

        if (!channelsResponse.ok) {
          console.error(
            "Channel response error:",
            channelsResponse.status,
            channelsResponse.statusText
          );
          throw new Error(
            `Failed to get owner channel: ${channelsResponse.status} ${channelsResponse.statusText}`
          );
        }

        const channelsData = await channelsResponse.json();
        logger.log(
          "Owner channels data:",
          JSON.stringify(channelsData, null, 2)
        );

        if (!channelsData.items || channelsData.items.length === 0) {
          throw new Error("No YouTube channel found for owner account");
        }

        const userChannelId = channelsData.items[0].id;
        logger.log("Owner channel ID:", userChannelId);

        // Get the uploads playlist ID
        const uploadsPlaylistId =
          channelsData.items[0].contentDetails.relatedPlaylists.uploads;
        logger.log("Owner uploads playlist ID:", uploadsPlaylistId);

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
          console.error(
            "Videos response error:",
            videosResponse.status,
            videosResponse.statusText
          );
          throw new Error(
            `Failed to get owner videos: ${videosResponse.status} ${videosResponse.statusText}`
          );
        }

        const videosData = await videosResponse.json();
        logger.log("Owner videos data:", JSON.stringify(videosData, null, 2));
        logger.log(`Found ${videosData.items?.length || 0} videos for owner`);

        if (!videosData.items || videosData.items.length === 0) {
          logger.log("No videos found for owner, trying search endpoint");

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
            console.error(
              "Search response error:",
              searchResponse.status,
              searchResponse.statusText
            );
            throw new Error(
              `Failed to search owner videos: ${searchResponse.status} ${searchResponse.statusText}`
            );
          }

          const searchData = await searchResponse.json();
          logger.log("Owner search data:", JSON.stringify(searchData, null, 2));
          logger.log(
            `Found ${
              searchData.items?.length || 0
            } videos from search endpoint for owner`
          );

          if (!searchData.items || searchData.items.length === 0) {
            logger.log("No videos found for owner from either approach");
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
      } catch (error) {
        console.error("Error fetching videos for owner:", error);
        throw new Error(
          `Failed to fetch videos for owner: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      // For special accounts, check if they have YouTube tokens
      logger.log("User is special, checking for YouTube tokens");

      if (!userData.youtubeTokens || !userData.youtubeTokens.accessToken) {
        throw new Error(
          "YouTube not connected - please connect your YouTube account in settings"
        );
      }

      const accessToken = userData.youtubeTokens.accessToken;

      // First, get the user's channel ID
      logger.log("Fetching user's channel ID for special account");
      const channelsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&mine=true&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!channelsResponse.ok) {
        console.error(
          "Channel response error:",
          channelsResponse.status,
          channelsResponse.statusText
        );
        // Handle error or token refresh similar to the existing code
        if (channelsResponse.status === 401) {
          logger.log("Special account token expired, attempting to refresh");

          if (!userData.youtubeTokens.refreshToken) {
            throw new Error(
              "YouTube refresh token not found - please reconnect your YouTube account"
            );
          }

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
            const errorText = await refreshResponse.text();
            console.error("Token refresh error:", errorText);
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
      logger.log("Channels data:", JSON.stringify(channelsData, null, 2));

      if (!channelsData.items || channelsData.items.length === 0) {
        throw new Error("No YouTube channel found for this account");
      }

      const userChannelId = channelsData.items[0].id;
      logger.log("User channel ID:", userChannelId);

      // Now fetch all uploads from this channel
      // First, get the uploads playlist ID
      logger.log("Fetching uploads playlist ID");
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
      logger.log("Playlists data:", JSON.stringify(playlistsData, null, 2));

      const uploadsPlaylistId =
        playlistsData.items[0].contentDetails.relatedPlaylists.uploads;
      logger.log("Uploads playlist ID:", uploadsPlaylistId);

      // Finally, get all videos from the uploads playlist
      logger.log("Fetching videos from uploads playlist");
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
      logger.log("Videos data:", JSON.stringify(videosData, null, 2));
      logger.log(
        `Found ${videosData.items?.length || 0} videos in uploads playlist`
      );

      if (!videosData.items || videosData.items.length === 0) {
        logger.log(
          "No videos found in uploads playlist, trying search endpoint as fallback"
        );

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
        logger.log("Search data:", JSON.stringify(searchData, null, 2));
        logger.log(
          `Found ${searchData.items?.length || 0} videos from search endpoint`
        );

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
          logger.log("No videos found from either approach");
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

    logger.log(
      "Returning",
      youtubeVideos.length,
      "vlogs directly from YouTube"
    );
    return youtubeVideos;
  } catch (error) {
    console.error("Error in getVlogs:", error);
    throw error;
  }
}

export async function deleteVlog(vlogId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    logger.log("Deleting vlog:", vlogId);

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
    logger.log("Deleting video on YouTube:", vlogId);
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
      const errorText = await deleteResponse.text();
      console.error("YouTube API error:", errorText);
      throw new Error(
        `Failed to delete video: ${deleteResponse.status} ${deleteResponse.statusText}`
      );
    }

    logger.log("Video deleted successfully");
    return true;
  } catch (error) {
    console.error("Error in deleteVlog:", error);
    throw error;
  }
}

export async function getVlogById(id: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    logger.log("Getting vlog by ID:", id);

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
    logger.log("Fetching video details from YouTube:", id);
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${id}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      console.error("YouTube API error:", errorText);
      throw new Error(
        `Failed to get video: ${videoResponse.status} ${videoResponse.statusText}`
      );
    }

    const videoData = await videoResponse.json();
    logger.log("Video data received:", videoData);

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
    console.error("Error in getVlogById:", error);
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

    logger.log("Updating vlog:", vlogId);

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
    logger.log("Updating video on YouTube:", vlogId);
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
      const errorText = await updateResponse.text();
      console.error("YouTube API error:", errorText);
      throw new Error(
        `Failed to update video: ${updateResponse.status} ${updateResponse.statusText}`
      );
    }

    const updateData = await updateResponse.json();
    logger.log("Video updated successfully:", updateData);

    // If a new thumbnail was provided, upload it to YouTube
    if (thumbnailFile) {
      logger.log("Uploading new thumbnail for video:", vlogId);
      await uploadThumbnail(accessToken, vlogId, thumbnailFile);
      logger.log("Thumbnail uploaded successfully");
    }

    return vlogId;
  } catch (error) {
    console.error("Error in updateVlog:", error);
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
    console.error("Error fetching YouTube videos:", error);
    throw error;
  }
}
