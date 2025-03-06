"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Send, Mail, ArrowUpRight, Check } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { auth } from "@/lib/firebase";
import {
  sendLetter,
  markLetterAsRead,
  getAllLetters,
} from "@/services/letters";
import { Letter } from "@/types/database";
import { useLetters } from "@/contexts/LetterContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function Letters() {
  const { userType } = useAuth();
  const { refreshUnreadCount } = useLetters();
  const [newLetter, setNewLetter] = useState("");
  const [receivedLetters, setReceivedLetters] = useState<Letter[]>([]);
  const [sentLetters, setSentLetters] = useState<Letter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const loadLetters = async () => {
    setIsLoading(true);
    setError("");

    try {
      const currentUser = auth.currentUser;
      console.log("Current user:", currentUser);
      if (!currentUser) {
        throw new Error("You must be logged in to view letters");
      }

      try {
        // Get all letters at once
        const allLetters = await getAllLetters();
        console.log("All letters loaded:", allLetters);

        // Filter for received letters
        const received = allLetters.filter((letter) => {
          if (letter.toUserId === currentUser.uid) return letter;
        });
        console.log("Received letters:", received.length);
        setReceivedLetters(received);

        // Filter for unread letters
        const unread = received.filter((letter) => !letter.isRead);
        console.log("Unread letters:", unread.length);

        // Mark unread letters as read
        if (unread.length > 0) {
          await Promise.all(
            unread.map((letter) => markLetterAsRead(letter.id!))
          );
          refreshUnreadCount();
        }

        // Filter for sent letters
        const sent = allLetters.filter(
          (letter) => letter.fromUserId === currentUser.uid
        );
        console.log("Sent letters:", sent.length);
        setSentLetters(sent);
      } catch (error) {
        console.error("Error loading letters:", error);
        setError("Failed to load letters. Please try again later.");
      }
    } catch (error) {
      console.error("Error loading letters:", error);
      setError("Failed to load letters. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLetters();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLetter.trim()) return;

    setIsSending(true);
    setError("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be logged in to send a letter");
      }

      console.log("Current user:", currentUser.uid);
      console.log("User type:", userType);

      // Debug all environment variables
      console.log("All environment variables:", {
        NEXT_PUBLIC_SPECIAL_USER_ID: process.env.NEXT_PUBLIC_SPECIAL_USER_ID,
        NEXT_PUBLIC_OWNER_USER_ID: process.env.NEXT_PUBLIC_OWNER_USER_ID,
      });

      // Hardcoded IDs - these are the correct IDs from your Firestore
      const specialUserId = "IbIvj4aNYrgYGTNr4kPWV1qJWEM2";
      const ownerUserId = "LawWFCMcHka7nwDtmP4xKK9j6b82";

      console.log("Special user ID (hardcoded):", specialUserId);
      console.log("Owner user ID (hardcoded):", ownerUserId);

      // Determine partner ID based on current user
      let partnerId;

      // If current user is the owner, send to special
      if (currentUser.uid === ownerUserId) {
        partnerId = specialUserId;
        console.log("Current user is owner, sending to special:", partnerId);
      }
      // If current user is special, send to owner
      else if (currentUser.uid === specialUserId) {
        partnerId = ownerUserId;
        console.log("Current user is special, sending to owner:", partnerId);
      }
      // Fallback - if we can't determine, use the opposite of current user
      else {
        console.log("Could not determine user type, using fallback");
        partnerId =
          currentUser.uid === ownerUserId ? specialUserId : ownerUserId;
      }

      console.log("Partner ID:", partnerId);

      if (!partnerId) {
        throw new Error(
          "Could not find your partner's account. Please make sure both users are registered."
        );
      }

      // Double check we're not sending to ourselves
      if (currentUser.uid === partnerId) {
        console.error("Attempted to send letter to self. Fixing partner ID.");
        // Force the correct partner based on current user
        partnerId =
          currentUser.uid === ownerUserId ? specialUserId : ownerUserId;
      }

      console.log("Final partner ID for sending:", partnerId);
      try {
        await sendLetter(currentUser.uid, partnerId, newLetter.trim());
        console.log("Letter sent successfully");

        setNewLetter("");

        // Reload letters to show the new one
        await loadLetters();
      } catch (sendError) {
        console.error("Error in sendLetter function:", sendError);
        throw new Error(
          `Failed to send letter: ${
            sendError instanceof Error ? sendError.message : "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error sending letter:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send letter. Please try again later."
      );
    } finally {
      setIsSending(false);
    }
  };

  const renderLetterCard = (letter: Letter, isSent: boolean) => {
    const formattedDate = letter.createdAt
      ? format(new Date(letter.createdAt), "MMM d, yyyy h:mm a")
      : "Unknown date";

    return (
      <Card key={letter.id} className="p-6 bg-white/90 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isSent
                  ? "bg-purple-100 text-purple-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {isSent ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
            </div>
            <div className="ml-2">
              <p className="font-medium">
                {isSent
                  ? "You"
                  : userType === "owner"
                  ? "Special One"
                  : "Owner"}
              </p>
              <p className="text-xs text-gray-500">{formattedDate}</p>
            </div>
          </div>
          {!isSent && letter.isRead && (
            <span className="text-xs text-green-600 flex items-center">
              <Check className="w-3 h-3 mr-1" /> Read
            </span>
          )}
        </div>
        <p className="text-gray-800 whitespace-pre-wrap">{letter.content}</p>
      </Card>
    );
  };

  return (
    <>
      <PageTitle>Letters 💌</PageTitle>

      {/* Write new letter */}
      <Card className="p-6 bg-white/90 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full p-4 rounded-lg border min-h-[200px] focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Write your letter here..."
            value={newLetter}
            onChange={(e) => setNewLetter(e.target.value)}
            disabled={isSending}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isSending || !newLetter.trim()}
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Letter
              </>
            )}
          </Button>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      </Card>

      {/* Letters list */}
      <Tabs defaultValue="received">
        <TabsList className="mb-4">
          <TabsTrigger value="received">Received</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Loading letters...</p>
          ) : receivedLetters.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No letters received yet.
            </p>
          ) : (
            <div className="space-y-4">
              {receivedLetters.map((letter) => renderLetterCard(letter, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Loading letters...</p>
          ) : sentLetters.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              You haven&apos;t sent any letters yet.
            </p>
          ) : (
            <div className="space-y-4">
              {sentLetters.map((letter) => renderLetterCard(letter, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
