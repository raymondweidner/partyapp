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

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload,
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
