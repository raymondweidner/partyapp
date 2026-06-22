importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCt0f73Wph2hUtLOz87JHQAfZmU_VmQlCo",
  authDomain: "partyparty-6918c.firebaseapp.com",
  projectId: "partyparty-6918c",
  storageBucket: "partyparty-6918c.firebasestorage.app",
  messagingSenderId: "395288752355",
  appId: "1:395288752355:web:65e78a2909ac721ed715d6",
});

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const messaging = firebase.messaging();
const channel = new BroadcastChannel("fcm_channel");

console.log("REGISTERING FCM LISTENER");

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message (payload below):",
    payload,
  );
  channel.postMessage(payload);

  const notificationTitle =
    payload.notification?.title || payload.data?.title || "New Message";
  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      "You have a new message",
    icon: "/icon.png",
    data: payload.data,
  };

  console.log("[firebase-messaging-sw.js] Triggering self.registration.showNotification() with title:", notificationTitle, "and options:", notificationOptions);
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
  console.log("[firebase-messaging-sw.js] 'notificationclick' event fired. Notification data:", event.notification.data);
  event.notification.close();
  const data = event.notification.data || {};
  const notifId = data.notificationId || data.notification_id || "";
  let url = `/?deleteNotifId=${notifId}`;

  const resourceType = data.resourceType || data.resource_type;
  const resourceId = data.resourceId || data.resource_id;
  const actionMode = data.actionMode || data.action_mode;

  if (resourceType && resourceId && actionMode?.toUpperCase() === "GET") {
    const type = resourceType.toLowerCase();
    if (["tribe", "meetup", "member", "proposal"].includes(type)) {
      url = `/edit-${type}?id=${resourceId}&deleteNotifId=${notifId}`;
    }
  }

  console.log("[firebase-messaging-sw.js] Navigating user to URL based on notification data:", url);
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
