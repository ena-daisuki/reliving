import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { auth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  context: { params: { userId: string } }
) {
  try {
    // Extract userId from context properly
    const { userId } = context.params;
    log("YouTube status check requested for user:", userId);

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("auth-token")?.value;

    if (!sessionToken) {
      log("No auth token found in cookies");
      return NextResponse.json(
        { error: "Not authenticated", isConnected: false },
        { status: 401 }
      );
    }

    // Verify the session token
    const decodedToken = await auth.verifyIdToken(sessionToken);
    log("Token verified for user:", decodedToken.uid);

    // Check if the user is requesting their own data
    if (decodedToken.uid !== userId) {
      log("User ID mismatch:", decodedToken.uid, "vs", userId);
      return NextResponse.json(
        { error: "Unauthorized", isConnected: false },
        { status: 403 }
      );
    }

    // Get the user document from Firestore
    const adminDb = getFirestore();
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      log("User document not found in Firestore");
      return NextResponse.json(
        { error: "User not found", isConnected: false },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const youtubeTokens = userData?.youtubeTokens;

    log("YouTube tokens found:", !!youtubeTokens);

    // For owner accounts, always return true
    if (userData?.type === "owner") {
      log("User is owner, returning isConnected: true");
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
  } catch (error) {
    console.error("Error checking YouTube status:", error);
    return NextResponse.json(
      { error: "Internal server error", isConnected: false },
      { status: 500 }
    );
  }
}
