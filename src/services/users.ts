import { db } from "@/lib/firebase";
import { User } from "@/types/database";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

export async function createUser(uid: string, type: "owner" | "special") {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    type,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  });
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

export async function updateLastLogin(uid: string) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    lastLogin: serverTimestamp(),
  });
}
