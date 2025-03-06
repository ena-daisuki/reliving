import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

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

    // Save the tokens to .env.local
    // Note: This is just for demonstration. In a real app, you'd store these securely.
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Display the tokens on a success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/success?accessToken=${encodeURIComponent(
        accessToken
      )}&refreshToken=${encodeURIComponent(refreshToken)}`
    );
  } catch (error) {
    console.error("Error in callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/error?message=Authentication process failed`
    );
  }
}
