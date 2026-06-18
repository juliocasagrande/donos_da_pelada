import { NextResponse } from "next/server";
import { captureDueProPayments } from "@/lib/mercadopagoSync";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handleCaptureDue(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const results = await captureDueProPayments();
  return NextResponse.json({ ok: true, processed: results.length });
}

export async function GET(request: Request) {
  return handleCaptureDue(request);
}

export async function POST(request: Request) {
  return handleCaptureDue(request);
}
