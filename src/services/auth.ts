import { auth } from "@/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";

export async function loginWithKey(key: string) {
  try {
    // Call server-side API to verify key and get custom token
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) throw new Error("Invalid key");

    const { token, userType } = await response.json();

    // Sign in with custom token
    await signInWithCustomToken(auth, token);

    // Store user type
    localStorage.setItem("user-type", userType);
  } catch (error) {
    console.error("Login error:", error);
    throw new Error("Login failed. Please check your key and try again.");
  }
}

export function logout() {
  localStorage.removeItem("user-type");
  return auth.signOut();
}

export function getCurrentUser() {
  return auth.currentUser;
}
