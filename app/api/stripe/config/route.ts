import { NextResponse } from "next/server";
import { getStripePublicStatus } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const stripe = getStripePublicStatus();

  return NextResponse.json(
    stripe,
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
