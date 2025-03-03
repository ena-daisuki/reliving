import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token provided" },
        { status: 400 }
      );
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google OAuth error:", errorText);
      return NextResponse.json(
        { error: "Failed to refresh token" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ accessToken: data.access_token });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
