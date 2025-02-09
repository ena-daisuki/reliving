import { db } from "@/lib/firebase";
import { Letter } from "@/types/database";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

export async function sendLetter(
  fromUserId: string,
  toUserId: string,
  content: string
) {
  const letterData: Omit<Letter, "id"> = {
    fromUserId,
    toUserId,
    content,
    createdAt: serverTimestamp() as unknown as Date,
    isRead: false,
  };

  const docRef = await addDoc(collection(db, "letters"), letterData);
  return docRef.id;
}

export async function getLettersReceived(userId: string) {
  const q = query(
    collection(db, "letters"),
    where("toUserId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Letter[];
}

export async function getLettersSent(userId: string) {
  const q = query(
    collection(db, "letters"),
    where("fromUserId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Letter[];
}

export async function markLetterAsRead(letterId: string) {
  const letterRef = doc(db, "letters", letterId);
  await updateDoc(letterRef, {
    isRead: true,
  });
}
