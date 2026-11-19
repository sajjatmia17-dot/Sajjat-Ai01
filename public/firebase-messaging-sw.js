// Give the service worker access to Firebase Messaging.
// Note that the importScripts can be customized or pointed to Firebase CDN scripts.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBuz2yF2QdmwNqBwHGPneEnEZvvGo5WZz0",
  authDomain: "sajjat-ai-4b5ef.firebaseapp.com",
  databaseURL: "https://sajjat-ai-4b5ef-default-rtdb.firebaseio.com",
  projectId: "sajjat-ai-4b5ef",
  storageBucket: "sajjat-ai-4b5ef.firebasestorage.app",
  messagingSenderId: "1008057291184",
  appId: "1:1008057291184:web:b6b4da8cf77edf28a38675",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || "Sajjat Ai Notification";
  const notificationOptions = {
    body: payload.notification?.body || "New update received.",
    icon: "/favicon.ico",
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
