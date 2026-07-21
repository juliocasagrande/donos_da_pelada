import { NextResponse } from "next/server";
import { autoCloseMatches } from "@/lib/actions";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handleAutoClose(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const result = await autoCloseMatches();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return handleAutoClose(request);
}

export async function POST(request: Request) {
  return handleAutoClose(request);
}
