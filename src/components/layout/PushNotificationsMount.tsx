"use client";

import { useEffect, useState } from "react";
import { PushNotifications } from "@/components/layout/PushNotifications";

export function PushNotificationsMount() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <PushNotifications />;
}
