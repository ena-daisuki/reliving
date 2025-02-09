import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { setCookie } from "@/lib/cookies";

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

    // Use the key as the password since that's what you set in Firebase
    const result = await signInWithEmailAndPassword(auth, email!, key);
    const token = await result.user.getIdToken();

    // Set cookies directly on the client
    setCookie("auth-token", token);
    setCookie("user-type", isOwnerKey ? "owner" : "special");

    return result.user;
  } catch (error) {
    console.error("Login error:", error);
    throw new Error("Login failed. Please check your key and try again.");
  }
}
