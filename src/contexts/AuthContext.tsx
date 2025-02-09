"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getCookie, setCookie } from "@/lib/cookies";
import { useRouter } from "next/navigation";

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
        router.push("/login");
      } else {
        const type = getCookie("user-type") as "owner" | "special" | undefined;
        if (!type) {
          // If user is logged in but cookie is missing, log them out
          await signOut(auth);
          router.push("/login");
        } else {
          setUserType(type);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const logout = async () => {
    await signOut(auth);
    setCookie("auth-token", "");
    setCookie("user-type", "");
    router.push("/login");
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
