"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { setCookie } from "@/lib/cookies";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

type AuthContextType = {
  userType: "owner" | "special" | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userType, setUserType] = useState<"owner" | "special" | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserType(null);
        if (window.location.pathname !== "/login") {
          router.push("/login");
        }
      } else {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserType(userData.type);
            setCookie("user-type", userData.type);
          } else {
            await signOut(auth);
            router.push("/login");
          }
        } catch (error) {
          console.error("Firestore error:", error);
          await signOut(auth);
          router.push("/login");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const logout = async () => {
    try {
      await signOut(auth);
      setCookie("auth-token", "");
      setCookie("user-type", "");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ userType, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
