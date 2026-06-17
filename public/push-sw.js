self.addEventListener("push", (event) => {
  const fallback = {
    title: "Dono da Pelada",
    body: "Tem novidade na pelada.",
    url: "/dashboard"
  };

  const data = event.data ? event.data.json() : fallback;
  const title = data.title || fallback.title;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || fallback.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: {
        url: data.url || fallback.url
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes(url));
      if (existingClient) return existingClient.focus();
      return self.clients.openWindow(url);
    })
  );
});
