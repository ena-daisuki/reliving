import { db } from "@/lib/firebase";
import { Letter } from "@/types/database";
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
    console.log("Sending letter:", {
      fromUserId,
      toUserId,
      content: content.substring(0, 20) + "...",
    });

    // Validate inputs
    if (!fromUserId) throw new Error("fromUserId is required");
    if (!toUserId) throw new Error("toUserId is required");
    if (!content) throw new Error("content is required");

    const letterData = {
      fromUserId,
      toUserId,
      content,
      createdAt: serverTimestamp(),
      isRead: false,
    };

    console.log("Letter data prepared:", letterData);

    const docRef = await addDoc(collection(db, "letters"), letterData);
    console.log("Letter sent successfully with ID:", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("Error sending letter:", error);
    throw error;
  }
}

export async function getAllLetters(): Promise<Letter[]> {
  console.log("Getting all letters from database");

  try {
    // Get all letters from the database
    const allLettersSnapshot = await getDocs(collection(db, "letters"));
    console.log(`Total letters in database: ${allLettersSnapshot.size}`);

    if (allLettersSnapshot.empty) {
      console.log("No letters found in database");
      return [];
    }

    // Log all letters for debugging
    console.log("All letters in database:");

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

      console.log(`Letter ${doc.id}:`, {
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        content: data.content?.substring(0, 20) + "...",
        isRead: data.isRead,
        createdAt: data.createdAt,
      });

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
    console.error("Error getting all letters:", error);
    throw error;
  }
}

export async function getLettersReceived(userId: string) {
  console.log("Getting received letters for user:", userId);

  try {
    console.log("Building query for letters sent to:", userId);

    // First, let's check if there are any letters at all
    const allLettersSnapshot = await getDocs(collection(db, "letters"));
    console.log(`Total letters in database: ${allLettersSnapshot.size}`);

    if (allLettersSnapshot.size > 0) {
      console.log("All letters in database:");
      allLettersSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Letter ${doc.id}:`, {
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          content: data.content?.substring(0, 20) + "...",
          isRead: data.isRead,
          createdAt: data.createdAt,
        });
      });
    }

    // Now build the query for this user's received letters
    const q = query(collection(db, "letters"), where("toUserId", "==", userId));
    console.log("Query built successfully (without orderBy)");

    console.log("Executing query...");
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} received letters in Firestore`);

    if (snapshot.empty) {
      console.log("No letters found where toUserId =", userId);
      return [];
    }

    const letters = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log("Processing received letter data:", {
        id: doc.id,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        content: data.content?.substring(0, 20) + "...",
        isRead: data.isRead,
      });

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

    console.log("Processed received letters:", letters);
    return letters;
  } catch (error) {
    console.error("Error getting received letters:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

export async function getLettersSent(userId: string) {
  console.log("Getting sent letters for user:", userId);

  try {
    console.log("Building query for fromUserId:", userId);
    const q = query(
      collection(db, "letters"),
      where("fromUserId", "==", userId)
    );

    console.log("Query built successfully (without orderBy)");

    console.log("Executing query...");
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} sent letters in Firestore`);

    if (snapshot.empty) {
      console.log("No letters found where fromUserId =", userId);
      return [];
    }

    const letters = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log("Processing sent letter data:", {
        id: doc.id,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        content: data.content?.substring(0, 20) + "...",
        isRead: data.isRead,
      });

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

    console.log("Processed sent letters:", letters);
    return letters;
  } catch (error) {
    console.error("Error getting sent letters:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

export async function markLetterAsRead(letterId: string) {
  try {
    console.log("Marking letter as read:", letterId);
    const letterRef = doc(db, "letters", letterId);
    await updateDoc(letterRef, {
      isRead: true,
    });
    console.log("Letter marked as read successfully");
  } catch (error) {
    console.error("Error marking letter as read:", error);
    // Don't throw the error to prevent breaking the UI
  }
}

export async function getUnreadLettersCount(userId: string): Promise<number> {
  const q = query(
    collection(db, "letters"),
    where("toUserId", "==", userId),
    where("isRead", "==", false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getPartnerUserId(
  currentUserId: string
): Promise<string | null> {
  try {
    console.log("Finding partner for user:", currentUserId);

    // Get user IDs from environment variables
    const specialUserId = process.env.NEXT_PUBLIC_SPECIAL_USER_ID;
    const ownerUserId = process.env.NEXT_PUBLIC_OWNER_USER_ID;

    console.log("Special user ID from env:", specialUserId);
    console.log("Owner user ID from env:", ownerUserId);

    if (!specialUserId || !ownerUserId) {
      console.error("Missing user IDs in environment variables");
      return null;
    }

    // If current user is special, return owner ID
    if (currentUserId === specialUserId) {
      console.log(
        "Current user is special, returning owner user ID:",
        ownerUserId
      );
      return ownerUserId;
    }

    // If current user is owner, return special ID
    if (currentUserId === ownerUserId) {
      console.log(
        "Current user is owner, returning special user ID:",
        specialUserId
      );
      return specialUserId;
    }

    console.log("WARNING: Unknown user ID, could not determine partner");
    return null;
  } catch (error) {
    console.error("Error finding partner user:", error);
    return null;
  }
}
