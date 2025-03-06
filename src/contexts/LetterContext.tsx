"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getUnreadLettersCount } from "@/services/letters";
import { useAuth } from "./AuthContext";
import { auth } from "@/lib/firebase";

interface LetterContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const LetterContext = createContext<LetterContextType | undefined>(undefined);

export function LetterProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { loading } = useAuth();

  const refreshUnreadCount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || loading) return;

    try {
      const count = await getUnreadLettersCount(currentUser.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread letters count:", error);
    }
  };

  // Refresh unread count when user changes
  useEffect(() => {
    refreshUnreadCount();
  }, [loading]);

  // Refresh unread count every minute
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  return (
    <LetterContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </LetterContext.Provider>
  );
}

export function useLetters() {
  const context = useContext(LetterContext);
  if (context === undefined) {
    throw new Error("useLetters must be used within a LetterProvider");
  }
  return context;
}
