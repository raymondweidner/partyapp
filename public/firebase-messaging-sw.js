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
    "[firebase-messaging-sw.js] Received background message ",
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

  self.registration.showNotification(notificationTitle, notificationOptions);
});
