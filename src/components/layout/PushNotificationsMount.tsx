"use client";

import { useEffect, useState } from "react";
import { PushNotifications } from "@/components/layout/PushNotifications";

export function PushNotificationsMount({
  promptDismissed,
  notificationsEnabled
}: {
  promptDismissed: boolean;
  notificationsEnabled: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <PushNotifications promptDismissed={promptDismissed} notificationsEnabled={notificationsEnabled} />;
}
