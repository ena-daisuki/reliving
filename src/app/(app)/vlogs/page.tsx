"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
  Edit,
  Eye,
  Loader2,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { Loading } from "@/components/ui/loading";
import {
  getVlogs,
  uploadVlog,
  deleteVlog,
  updateVlog,
  fetchYouTubeVideos,
  getSafeVlogThumbnailUrl,
} from "@/services/vlogs";
import { Vlog } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { initYoutubeAuth } from "@/services/youtube";
import Image from "next/image";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Vlogs() {
  const { loading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "private" | "unlisted"
  >("unlisted");
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [vlogToDelete, setVlogToDelete] = useState<Vlog | null>(null);
  const [error, setError] = useState("");
  const [isYoutubeAuthed, setIsYoutubeAuthed] = useState(false);
  const [youtubeAuthSuccess, setYoutubeAuthSuccess] = useState(false);
  const [vlogToEdit, setVlogToEdit] = useState<Vlog | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<
    "public" | "private" | "unlisted"
  >("unlisted");
  const [editThumbnail, setEditThumbnail] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<
    string | null
  >(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);

  const checkYoutubeAuth = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setIsYoutubeAuthed(false);
        return;
      }

      // Check if user has YouTube tokens in Firestore
      try {
        const response = await fetch(`/api/users/${user.uid}/youtube-status`);

        if (response.status === 401) {
          // Handle expired token
          setIsYoutubeAuthed(false);
          setError(
            "Your authentication session has expired. Please refresh the page or log in again."
          );
          return;
        }

        if (!response.ok) {
          setIsYoutubeAuthed(false);
          return;
        }

        const userData = await response.json();

        if (userData.tokenExpired) {
          setIsYoutubeAuthed(false);
          setError(
            "Your authentication session has expired. Please refresh the page or log in again."
          );
          return;
        }

        setIsYoutubeAuthed(userData.isConnected);
      } catch (error) {
        // Ignore errors when checking YouTube auth status
        console.error("Error checking YouTube authentication:", error);
        setIsYoutubeAuthed(false);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setIsYoutubeAuthed(false);
    }
  }, []);

  const loadVlogs = useCallback(
    async (shouldSync = true) => {
      setIsLoading(true);
      setError("");
      setSyncSuccess(false);
      try {
        // First sync with YouTube if needed
        if (shouldSync && isYoutubeAuthed) {
          try {
            const result = await fetchYouTubeVideos();
            setSyncMessage(`Sync complete! Found ${result.total} videos.`);
            setSyncSuccess(true);
          } catch (syncError) {
            const errorMessage =
              syncError instanceof Error ? syncError.message : "Unknown error";
            setSyncMessage(`Sync failed: ${errorMessage}`);
            setSyncSuccess(false);
          }
        }

        // Then fetch vlogs from Firestore
        const fetchedVlogs = await getVlogs();
        setVlogs(fetchedVlogs);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "";
        setError("Failed to load vlogs. " + errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isYoutubeAuthed]
  );

  useEffect(() => {
    if (!authLoading) {
      loadVlogs();
      checkYoutubeAuth();
    }
  }, [authLoading, loadVlogs, checkYoutubeAuth]);

  // Check for YouTube auth success message in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("youtube") === "success") {
      setYoutubeAuthSuccess(true);

      // Remove the query parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      // Auto-hide the success message after 5 seconds
      const timer = setTimeout(() => {
        setYoutubeAuthSuccess(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleSyncConfirm = () => {
    setShowSyncConfirm(false);
    syncWithYouTube();
  };

  const syncWithYouTube = async () => {
    setIsSyncing(true);
    setSyncMessage("Syncing with YouTube...");
    setSyncSuccess(false);
    try {
      const syncResults = await fetchYouTubeVideos();
      setSyncMessage(`Sync complete! Found ${syncResults.total} videos.`);
      setSyncSuccess(true);
      await loadVlogs(false); // Don't sync again
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setSyncMessage(`Sync failed: ${errorMessage}`);
      setSyncSuccess(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setError(""); // Clear any previous errors
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedThumbnail(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const canUpload = () => {
    // All users need YouTube authentication to upload
    return isYoutubeAuthed;
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Please log in to upload vlogs");
      }

      // Simulate upload progress (actual progress tracking would require server-side implementation)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 1000);

      await uploadVlog(
        selectedFile,
        user.uid,
        title,
        description,
        visibility,
        selectedThumbnail
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reset form
      setSelectedFile(null);
      setSelectedThumbnail(null);
      setThumbnailPreview(null);
      setTitle("");
      setDescription("");
      setVisibility("unlisted");

      // Reload vlogs after a short delay to allow server processing
      setTimeout(() => {
        loadVlogs();
      }, 1000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to upload vlog"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (vlogId: string) => {
    setIsDeleting(vlogId);
    setError("");

    try {
      await deleteVlog(vlogId);
      setVlogs(vlogs.filter((vlog) => vlog.id !== vlogId));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete vlog"
      );
    } finally {
      setIsDeleting(null);
      setVlogToDelete(null);
    }
  };

  // Reset edit form when vlogToEdit changes
  useEffect(() => {
    if (vlogToEdit) {
      setEditTitle(vlogToEdit.title);
      setEditDescription(vlogToEdit.description || "");
      setEditVisibility(vlogToEdit.visibility);
      setEditThumbnail(null);
      setEditThumbnailPreview(
        vlogToEdit.thumbnail || getSafeVlogThumbnailUrl(vlogToEdit)
      );
    }
  }, [vlogToEdit]);

  const handleEditThumbnailSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setEditThumbnail(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async () => {
    if (!vlogToEdit || !vlogToEdit.id) return;
    setIsEditing(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Please log in to edit vlogs");
      }

      // Call the update function
      await updateVlog(
        vlogToEdit.id,
        editTitle,
        editDescription,
        editVisibility,
        editThumbnail
      );

      // Reset form and close dialog
      setVlogToEdit(null);

      // Reload vlogs
      loadVlogs();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update vlog"
      );
    } finally {
      setIsEditing(false);
    }
  };

  const renderVlogs = () => {
    return vlogs.map((vlog) => {
      const thumbnailUrl = getSafeVlogThumbnailUrl(vlog);

      return (
        <Card
          key={vlog.id}
          className="p-4 bg-white/90 hover:bg-white transition-colors"
        >
          <Link href={`/vlogs/${vlog.id}`} className="block">
            <div className="relative aspect-video mb-2">
              {thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={vlog.title}
                  fill
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-gray-400" />
                </div>
              )}
            </div>
            <h3 className="font-semibold mb-2">{vlog.title}</h3>
          </Link>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {new Date(vlog.createdAt).toLocaleDateString()}
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVlogToEdit(vlog)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => setVlogToDelete(vlog)}
                disabled={isDeleting === vlog.id}
              >
                {isDeleting === vlog.id ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </Card>
      );
    });
  };

  if (authLoading) {
    return <Loading text="Authenticating..." />;
  }

  if (isLoading) {
    return <Loading text="Loading vlogs..." />;
  }

  return (
    <>
      <PageTitle>Vlogs 🎥</PageTitle>

      {/* YouTube Auth Success Message */}
      {youtubeAuthSuccess && (
        <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            <p className="text-green-700">
              Your YouTube account has been successfully connected! You can now
              upload and manage videos.
            </p>
          </div>
        </div>
      )}

      {/* Sync status message */}
      {(isSyncing || syncSuccess) && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            syncSuccess
              ? "bg-green-50 border border-green-200"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <div className="flex items-center">
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : syncSuccess ? (
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            ) : null}
            <p className={syncSuccess ? "text-green-700" : "text-blue-700"}>
              {syncMessage}
            </p>
          </div>
        </div>
      )}

      {/* Upload new vlog */}
      <div className="mb-6">
        <Button
          onClick={() => setShowUploadSection(!showUploadSection)}
          className="mb-4 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          {showUploadSection ? "Hide Upload Form" : "Show Upload Form"}
        </Button>

        {showUploadSection && (
          <Card className="p-6 bg-white/90">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter vlog title"
                className="w-full p-2 border rounded-lg"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
              />

              <Textarea
                placeholder="Enter description (optional)"
                className="w-full p-2 border rounded-lg"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="visibility"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Visibility
                  </Label>
                  <Select
                    value={visibility}
                    onValueChange={(value: "public" | "private" | "unlisted") =>
                      setVisibility(value)
                    }
                    disabled={isUploading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center">
                          <Eye className="mr-2 h-4 w-4" />
                          <span>Public</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="unlisted">
                        <div className="flex items-center">
                          <Eye className="mr-2 h-4 w-4 opacity-50" />
                          <span>Unlisted</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center">
                          <Eye className="mr-2 h-4 w-4 opacity-25" />
                          <span>Private</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="thumbnail"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Custom Thumbnail (optional)
                  </Label>
                  <div className="flex items-center space-x-4">
                    <label
                      className={`flex-1 ${
                        isUploading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="relative border border-dashed border-gray-300 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-50">
                        <input
                          type="file"
                          id="thumbnail"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleThumbnailSelect}
                          disabled={isUploading}
                        />
                        <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                        <span className="mt-1 block text-xs text-gray-500">
                          Select image
                        </span>
                      </div>
                    </label>

                    {thumbnailPreview && (
                      <div className="relative h-20 w-32 rounded-md overflow-hidden">
                        <Image
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1"
                          onClick={() => {
                            setSelectedThumbnail(null);
                            setThumbnailPreview(null);
                          }}
                          disabled={isUploading}
                        >
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <label
                className={`block ${
                  isUploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  Video File
                </span>
                <input
                  type="file"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-50 file:text-purple-700
                    hover:file:bg-purple-100"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>

              {!isYoutubeAuthed && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">
                        YouTube account not connected
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        You need to connect your YouTube account to upload
                        videos.
                      </p>
                      <Button
                        onClick={initYoutubeAuth}
                        className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                      >
                        Connect YouTube Account
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex flex-col">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  {error.includes("YouTube authentication") && (
                    <Link
                      href="/youtube-auth"
                      className="bg-red-600 text-white px-4 py-2 rounded mt-2 self-start hover:bg-red-700"
                    >
                      Re-authenticate with YouTube
                    </Link>
                  )}
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500 text-center">
                    {uploadProgress < 100
                      ? `Uploading video... ${uploadProgress}%`
                      : "Processing video..."}
                  </p>
                </div>
              )}

              {selectedFile && !isUploading && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    Selected file:{" "}
                    <span className="font-medium">{selectedFile.name}</span>(
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                  <Button
                    onClick={handleUpload}
                    className="w-full"
                    disabled={isUploading || !title || !canUpload()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Vlog
                  </Button>
                  {!isYoutubeAuthed && (
                    <p className="text-xs text-red-500 mt-1">
                      You need to connect your YouTube account before uploading.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Vlogs management */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Your Vlogs</h2>
          {vlogs.length > 0 && (
            <p className="text-sm text-gray-500">
              {vlogs.length} video{vlogs.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => loadVlogs(false)}
            disabled={isLoading}
            title="Refresh vlog list without syncing with YouTube"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSyncConfirm(true)}
            disabled={isSyncing || isLoading}
          >
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Sync with YouTube
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!vlogToEdit}
        onOpenChange={(open) => !open && setVlogToEdit(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Vlog</DialogTitle>
            <DialogDescription>
              Update your vlog details. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <input
                id="edit-title"
                type="text"
                className="w-full p-2 border rounded-lg"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={isEditing}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                className="w-full p-2 border rounded-lg"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={isEditing}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-visibility">Visibility</Label>
              <Select
                value={editVisibility}
                onValueChange={(value: "public" | "private" | "unlisted") =>
                  setEditVisibility(value)
                }
                disabled={isEditing}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="unlisted">
                    <div className="flex items-center">
                      <Eye className="mr-2 h-4 w-4 opacity-50" />
                      <span>Unlisted</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center">
                      <Eye className="mr-2 h-4 w-4 opacity-25" />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-thumbnail">Thumbnail</Label>
              <div className="flex items-center space-x-4">
                <div className="relative h-24 w-40 rounded-md overflow-hidden bg-gray-100">
                  {editThumbnailPreview ? (
                    <Image
                      src={editThumbnailPreview}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label
                    className={`block ${
                      isEditing ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="relative border border-dashed border-gray-300 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-50">
                      <input
                        type="file"
                        id="edit-thumbnail"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleEditThumbnailSelect}
                        disabled={isEditing}
                      />
                      <ImageIcon className="mx-auto h-6 w-6 text-gray-400" />
                      <span className="mt-1 block text-xs text-gray-500">
                        Change thumbnail
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVlogToEdit(null)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={isEditing || !editTitle}
            >
              {isEditing ? <Loading /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!vlogToDelete}
        onOpenChange={(open) => !open && setVlogToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the video &quot;
              {vlogToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVlogToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => vlogToDelete?.id && handleDelete(vlogToDelete.id)}
              disabled={isDeleting === vlogToDelete?.id}
            >
              {isDeleting === vlogToDelete?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Confirmation Dialog */}
      <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync with YouTube</DialogTitle>
            <DialogDescription>
              This will fetch all your YouTube videos and sync them with your
              vlogs. This process might take some time depending on how many
              videos you have.
              <br />
              <br />
              Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSyncConfirm}>Sync Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vlogs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vlogs.length === 0 ? (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-500">
              No vlogs found. Upload your first vlog!
            </p>
          </div>
        ) : (
          renderVlogs()
        )}
      </div>
    </>
  );
}
