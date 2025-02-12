export type UserType = "owner" | "special";

export interface User {
  userId: string;
  type: UserType;
  youtubeTokens?: {
    accessToken: string;
    refreshToken: string;
    expiryDate: Date;
  };
  createdAt: Date;
  lastLogin: Date;
}

export interface Letter {
  id?: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

export interface Vlog {
  id: string;
  userId: string;
  title: string;
  url: string;
  createdAt: Date;
}

export interface Memory {
  id?: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  createdAt: Date;
  filename: string;
}

export type MoodType = "happy" | "neutral" | "sad";

export interface Progress {
  userId: string;
  smokeFreeStreak: number;
  lastUpdated: Date;
  moneySaved: number;
  dailyMoods: {
    date: string;
    mood: MoodType;
  }[];
}

export interface VlogDetail {
  id: string;
  title: string;
  createdAt: string;
}
