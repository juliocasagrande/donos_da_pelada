import { prisma } from "@/lib/prisma";

type AuditActor = { id: string; name?: string | null; email?: string | null };

export async function logAudit(
  actor: AuditActor,
  action: string,
  entity?: { type: string; id: string },
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      userName: actor.name || actor.email || actor.id,
      action,
      entityType: entity?.type,
      entityId: entity?.id,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined
    }
  });
}
