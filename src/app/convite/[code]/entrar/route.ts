import { acceptInvite } from "@/lib/peladaOnboardingActions";

/**
 * acceptInvite() always ends in redirect(), which Route Handlers are allowed
 * to call (unlike Server Components, where cookies() can't be mutated). This
 * indirection is what lets the invite page auto-join an already-logged-in
 * user without throwing "Cookies can only be modified in a Server Action or
 * Route Handler".
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const matchId = new URL(request.url).searchParams.get("matchId") ?? undefined;
  await acceptInvite(code, matchId);
}
