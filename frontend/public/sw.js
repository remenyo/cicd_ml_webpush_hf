self.addEventListener("push", (event) => {
  console.log("sw: push", event);

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
  console.log("sw: notificationclick", event);
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  event.waitUntil(clients.openWindow(urlToOpen));
});

self.addEventListener("install", (event) => {
  console.log("Service worker installed", event);
});
self.addEventListener("activate", (event) => {
  console.log("Service worker activated", event);
});
