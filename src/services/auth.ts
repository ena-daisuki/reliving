import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { setCookie } from "@/lib/cookies";
//import { createUser, updateLastLogin } from "./users";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function loginWithKey(key: string) {
  try {
    // Determine which credentials to use
    const isOwnerKey = key === process.env.NEXT_PUBLIC_OWNER_KEY;
    const isSpecialKey = key === process.env.NEXT_PUBLIC_SPECIAL_KEY;

    if (!isOwnerKey && !isSpecialKey) {
      throw new Error("Invalid key");
    }

    const email = isOwnerKey
      ? process.env.NEXT_PUBLIC_OWNER_EMAIL
      : process.env.NEXT_PUBLIC_SPECIAL_EMAIL;

    // Login with Firebase Auth
    const result = await signInWithEmailAndPassword(auth, email!, key);
    const token = await result.user.getIdToken();

    // Create initial user document with type
    const userRef = doc(db, "users", result.user.uid);
    await setDoc(
      userRef,
      {
        userId: result.user.uid,
        type: isOwnerKey ? "owner" : "special",
        createdAt: new Date(),
        lastLogin: new Date(),
      },
      { merge: true }
    ); // Use merge to preserve existing data

    // Set cookies
    setCookie("auth-token", token);
    setCookie("user-type", isOwnerKey ? "owner" : "special");

    return result.user;
  } catch (error) {
    console.error("Login error:", error);
    throw new Error("Login failed. Please check your key and try again.");
  }
}
