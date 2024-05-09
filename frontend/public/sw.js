self.addEventListener("push", (event) => {
  const eventData = event.data.json();

  const title = eventData.title;
  const body = eventData.body;
  const url = eventData.url || "/";

  const options = {
    body: body,
    data: { url },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  event.waitUntil(clients.openWindow(urlToOpen));
});
