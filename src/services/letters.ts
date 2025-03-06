import { db } from "@/lib/firebase";
import { Letter } from "@/types/database";
import { logger } from "@/lib/logger";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

export async function sendLetter(
  fromUserId: string,
  toUserId: string,
  content: string
) {
  try {
    // Validate inputs
    if (!fromUserId) throw new Error("fromUserId is required");
    if (!toUserId) throw new Error("toUserId is required");
    if (!content) throw new Error("content is required");

    const letterData = {
      fromUserId,
      toUserId,
      content,
      isRead: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "letters"), letterData);
    return docRef.id;
  } catch (error) {
    logger.error("Error sending letter:", error);
    throw error;
  }
}

export async function getAllLetters(): Promise<Letter[]> {
  try {
    // Get all letters from the database
    const allLettersSnapshot = await getDocs(collection(db, "letters"));

    if (allLettersSnapshot.empty) {
      return [];
    }

    const letters: Letter[] = [];

    allLettersSnapshot.forEach((doc) => {
      const data = doc.data();
      const letter: Letter = {
        id: doc.id,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        content: data.content,
        isRead: data.isRead,
        createdAt:
          data.createdAt instanceof Timestamp
            ? new Date(data.createdAt.toMillis())
            : data.createdAt,
      };

      letters.push(letter);
    });

    // Sort letters by createdAt in descending order (newest first)
    return letters.sort((a, b) => {
      const dateA =
        a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB =
        b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    logger.error("Error getting all letters:", error);
    throw error;
  }
}

export async function getLettersReceived(userId: string) {
  try {
    // Now build the query for this user's received letters
    const q = query(collection(db, "letters"), where("toUserId", "==", userId));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const letters = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Convert Firestore Timestamp to Date
      let createdAt = data.createdAt;
      if (createdAt instanceof Timestamp) {
        createdAt = createdAt.toDate();
      } else if (createdAt && typeof createdAt.toDate === "function") {
        createdAt = createdAt.toDate();
      } else if (createdAt) {
        // If it's a string or number, convert to Date
        createdAt = new Date(createdAt);
      } else {
        // Fallback
        createdAt = new Date();
      }

      return {
        id: doc.id,
        ...data,
        createdAt,
      };
    }) as Letter[];

    return letters;
  } catch (error) {
    logger.error("Error getting received letters:", error);
    logger.error(
      "Error details:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

export async function getLettersSent(userId: string) {
  try {
    const q = query(
      collection(db, "letters"),
      where("fromUserId", "==", userId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const letters = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Convert Firestore Timestamp to Date
      let createdAt = data.createdAt;
      if (createdAt instanceof Timestamp) {
        createdAt = createdAt.toDate();
      } else if (createdAt && typeof createdAt.toDate === "function") {
        createdAt = createdAt.toDate();
      } else if (createdAt) {
        // If it's a string or number, convert to Date
        createdAt = new Date(createdAt);
      } else {
        // Fallback
        createdAt = new Date();
      }

      return {
        id: doc.id,
        ...data,
        createdAt,
      };
    }) as Letter[];

    return letters;
  } catch (error) {
    logger.error("Error getting sent letters:", error);
    logger.error(
      "Error details:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

export async function markLetterAsRead(letterId: string) {
  try {
    const letterRef = doc(db, "letters", letterId);
    await updateDoc(letterRef, {
      isRead: true,
    });
  } catch (error) {
    logger.error("Error marking letter as read:", error);
    // Don't throw the error to prevent breaking the UI
  }
}

export async function getUnreadLettersCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, "letters"),
      where("toUserId", "==", userId),
      where("isRead", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    logger.error("Error getting unread letters count:", error);
    return 0;
  }
}

export async function getPartnerUserId(
  currentUserId: string
): Promise<string | null> {
  try {
    // Get user IDs from environment variables
    const specialUserId = process.env.NEXT_PUBLIC_SPECIAL_USER_ID;
    const ownerUserId = process.env.NEXT_PUBLIC_OWNER_USER_ID;

    if (!specialUserId || !ownerUserId) {
      logger.error("Missing user IDs in environment variables");
      return null;
    }

    // If current user is special, return owner ID
    if (currentUserId === specialUserId) {
      return ownerUserId;
    }

    // If current user is owner, return special ID
    if (currentUserId === ownerUserId) {
      return specialUserId;
    }

    return null;
  } catch (error) {
    logger.error("Error finding partner user:", error);
    return null;
  }
}
