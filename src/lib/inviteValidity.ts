export function buildInvitePath(code: string, matchId?: string) {
  return `/convite/${code}${matchId ? `?matchId=${encodeURIComponent(matchId)}` : ""}`;
}

type InviteValidity = { revokedAt: Date | null; expiresAt: Date | null; maxUses: number | null; usedCount: number };

export function isInviteValid<T extends InviteValidity>(invite: T | null): invite is T {
  if (!invite) return false;
  return (
    !invite.revokedAt &&
    (!invite.expiresAt || invite.expiresAt > new Date()) &&
    (invite.maxUses == null || invite.usedCount < invite.maxUses)
  );
}
