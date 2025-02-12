import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { auth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

const oauth2Client = new google.auth.OAuth2(
  process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_URL}/auth/youtube/callback`
);

interface APIError {
  code?: string;
  message?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("auth-token")?.value;

  if (!code || !sessionToken) {
    return NextResponse.json(
      { error: "Missing authorization code or session token" },
      { status: 400 }
    );
  }

  try {
    const decodedToken = await auth.verifyIdToken(sessionToken);
    const userId = decodedToken.uid;

    // Get tokens directly without setting scopes
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens received:", tokens);

    if (!tokens?.access_token) {
      throw new Error("Invalid token response from YouTube");
    }

    // Use admin SDK to update Firestore
    const adminDb = getFirestore();
    await adminDb
      .collection("users")
      .doc(userId)
      .set(
        {
          youtubeTokens: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : null,
          },
        },
        { merge: true }
      );

    const redirectUrl = new URL("/vlogs", request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error: unknown) {
    console.error("Authentication error:", error);

    return NextResponse.json(
      {
        error: "YouTube authentication failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        code: (error as APIError)?.code || "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
