import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

import { createHash } from "crypto";

export async function POST(request: Request) {
  try {
    const { password: clientHash } = await request.json();
    const correctPassword = process.env.ACCESS_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json(
        { error: "Server Configuration Error: ACCESS_PASSWORD not set" },
        { status: 500 }
      );
    }

    // Hash the stored server password to compare with client's hash
    const serverHash = createHash("sha256")
      .update(correctPassword)
      .digest("hex");

    if (clientHash === serverHash) {
      // Create JWT
      // Use the password itself as the secret key.
      const secret = new TextEncoder().encode(correctPassword);

      const token = await new SignJWT({ role: "admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);

      const cookieStore = await cookies();
      cookieStore.set("auth_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
