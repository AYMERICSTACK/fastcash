import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "@/lib/session";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-login:${getRequestIp(request)}`, 6, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, message: `Trop de tentatives. Réessayez dans ${rate.retryAfterSeconds} secondes.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email et mot de passe obligatoires." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    if (!user?.password) {
      return NextResponse.json(
        { success: false, message: "Identifiants invalides." },
        { status: 401 },
      );
    }

    const isValidPassword = await bcrypt.compare(
      String(password),
      user.password,
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: "Identifiants invalides." },
        { status: 401 },
      );
    }

    const res = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
      },
    });

    const token = await createAdminSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return res;
  } catch (error) {
    console.error("Admin login error", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur." },
      { status: 500 },
    );
  }
}
