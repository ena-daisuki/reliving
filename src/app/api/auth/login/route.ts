import { auth } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

const OWNER_KEY = process.env.OWNER_KEY;
const SPECIAL_KEY = process.env.SPECIAL_KEY;

export async function POST(request: Request) {
  try {
    const { key } = await request.json();

    if (key === OWNER_KEY) {
      const token = await auth.createCustomToken("owner-id");
      return NextResponse.json({ token, userType: "owner" });
    }

    if (key === SPECIAL_KEY) {
      const token = await auth.createCustomToken("special-id");
      return NextResponse.json({ token, userType: "special" });
    }

    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
