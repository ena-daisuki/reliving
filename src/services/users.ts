import { db } from "@/lib/firebase";
import { User } from "@/types/database";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function createUser(userId: string, type: User["type"]) {
  const userRef = doc(db, "users", userId);
  const userData: Omit<User, "userId"> = {
    type,
    createdAt: serverTimestamp() as unknown as Date,
    lastLoginAt: serverTimestamp() as unknown as Date,
  };

  await setDoc(userRef, userData);
}

export async function getUser(userId: string) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return {
    userId: userSnap.id,
    ...userSnap.data(),
  } as User;
}

export async function updateLastLogin(userId: string) {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      lastLoginAt: serverTimestamp(),
    },
    { merge: true }
  );
}
