import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { setCookie } from "@/lib/cookies";
import { createUser, updateLastLogin } from "./users";

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

    // Create or update user record
    await createUser(result.user.uid, isOwnerKey ? "owner" : "special");
    await updateLastLogin(result.user.uid);

    // Set cookies
    setCookie("auth-token", token);
    setCookie("user-type", isOwnerKey ? "owner" : "special");

    return result.user;
  } catch (error) {
    console.error("Login error:", error);
    throw new Error("Login failed. Please check your key and try again.");
  }
}
