import webPush from "web-push";
import { prisma } from "@/lib/prisma";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function hasPushConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function configureWebPush() {
  if (!hasPushConfig()) return false;

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@donodapelada.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
  );

  return true;
}

export async function sendPushToAll(payload: PushPayload) {
  if (!configureWebPush()) {
    console.warn("Push nao enviado: configure as chaves VAPID no .env.");
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany();

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          JSON.stringify(payload)
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: subscription.endpoint } });
        } else {
          console.error("Erro ao enviar push:", error);
        }
      }
    })
  );
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!userIds.length || !configureWebPush()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } }
  });

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          JSON.stringify(payload)
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: subscription.endpoint } });
        } else {
          console.error("Erro ao enviar push:", error);
        }
      }
    })
  );
}
