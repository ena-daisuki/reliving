import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { getFirestore } from "firebase-admin/firestore";
import { auth } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check if there was an error in the OAuth process
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/error?message=YouTube authentication failed: ${error}`
      );
    }

    // Verify the code and state
    if (!code || !state) {
      console.error("Missing code or state parameter");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/error?message=Missing authentication parameters`
      );
    }

    // Get the state from the cookie to verify
    const cookieStore = await cookies();
    const cookieState = cookieStore.get("youtube_oauth_state")?.value;
    const sessionToken = cookieStore.get("auth-token")?.value;

    if (!cookieState || cookieState !== state) {
      console.error("State mismatch, possible CSRF attack");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/error?message=Invalid authentication state`
      );
    }

    // Exchange the code for tokens
    const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/youtube/callback`;

    if (!clientId || !clientSecret) {
      console.error("Missing client credentials");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/error?message=Server configuration error`
      );
    }

    // Exchange the code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange error:", errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/error?message=Failed to get access token`
      );
    }

    const tokenData = await tokenResponse.json();
    logger.log(
      "Received tokens:",
      JSON.stringify({
        access_token: tokenData.access_token ? "✓" : "✗",
        refresh_token: tokenData.refresh_token ? "✓" : "✗",
        expires_in: tokenData.expires_in,
      })
    );

    // Get the user ID from the session token if available
    if (!sessionToken) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/error?message=Not authenticated with Firebase`
      );
    }

    try {
      // Verify the token to get the user ID
      const decodedToken = await auth.verifyIdToken(sessionToken);
      const userId = decodedToken.uid;

      // Save tokens to the user's profile in Firestore
      const db = getFirestore();
      await db
        .collection("users")
        .doc(userId)
        .update({
          youtubeTokens: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiryDate: new Date(
              Date.now() + tokenData.expires_in * 1000
            ).toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });

      logger.log(`Saved YouTube tokens for user ${userId}`);

      // Redirect to the vlogs page with success message
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/vlogs?youtube=success`
      );
    } catch (authError) {
      console.error("Authentication error:", authError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/error?message=Authentication verification failed`
      );
    }
  } catch (error) {
    console.error("Error in callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/error?message=Authentication process failed`
    );
  }
}
