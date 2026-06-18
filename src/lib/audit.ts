import { prisma } from "@/lib/prisma";

type AuditActor = { id: string; name?: string | null; email?: string | null };

/**
 * Audit logging is a side effect, not the point of the action that calls it.
 * A failure here (e.g. the table missing in some environment) must never
 * abort the caller's primary action, so errors are swallowed and logged.
 */
export async function logAudit(
  actor: AuditActor,
  action: string,
  entity?: { type: string; id: string },
  metadata?: Record<string, unknown>
) {
  try {
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
  } catch (error) {
    console.error("logAudit failed:", error);
  }
}
