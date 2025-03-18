import { NextResponse } from "next/server";

// Generate a random state string for OAuth security
function generateRandomState() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export async function GET() {
  try {
    const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "YouTube client ID not configured" },
        { status: 500 }
      );
    }

    // Generate a random state value for security
    const state = generateRandomState();

    // Store the state in a cookie for verification when the user returns
    const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/youtube/callback`;

    // Create the authorization URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append(
      "scope",
      [
        "https://www.googleapis.com/auth/youtube.force-ssl",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube",
      ].join(" ")
    );
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "consent"); // Force to get refresh token
    authUrl.searchParams.append("state", state);

    // Set a cookie with the state value
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set("youtube_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error in YouTube auth endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
