import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { auth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  context: { params: { userId: string } }
) {
  try {
    // Extract userId from context, ensuring params is awaited
    const { userId } = context.params;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("auth-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Not authenticated", isConnected: false },
        { status: 401 }
      );
    }

    try {
      // Verify the session token
      const decodedToken = await auth.verifyIdToken(sessionToken);

      // Check if the user is requesting their own data
      if (decodedToken.uid !== userId) {
        return NextResponse.json(
          { error: "Unauthorized", isConnected: false },
          { status: 403 }
        );
      }

      // Get the user document from Firestore
      const adminDb = getFirestore();
      const userDoc = await adminDb.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        return NextResponse.json(
          { error: "User not found", isConnected: false },
          { status: 404 }
        );
      }

      const userData = userDoc.data();
      const youtubeTokens = userData?.youtubeTokens;

      // For owner accounts, always return true
      if (userData?.type === "owner") {
        return NextResponse.json({
          isConnected: true,
          userType: "owner",
        });
      }

      return NextResponse.json({
        isConnected: !!youtubeTokens,
        // Only include expiry info if tokens exist
        expiryDate: youtubeTokens ? youtubeTokens.expiryDate : null,
        userType: userData?.type,
      });
    } catch (tokenError: unknown) {
      console.error("Token verification error:", tokenError);

      // Check if token is expired - type guard for Firebase error
      if (
        tokenError &&
        typeof tokenError === "object" &&
        "code" in tokenError &&
        tokenError.code === "auth/id-token-expired"
      ) {
        return NextResponse.json(
          {
            error: "Authentication token expired, please log in again",
            isConnected: false,
            tokenExpired: true,
          },
          { status: 401 }
        );
      }

      throw tokenError; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error("Error checking YouTube status:", error);
    return NextResponse.json(
      { error: "Internal server error", isConnected: false },
      { status: 500 }
    );
  }
}
