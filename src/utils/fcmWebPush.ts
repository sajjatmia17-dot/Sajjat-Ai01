import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { database } from "../firebase";
import { ref, set } from "firebase/database";
import { firebaseConfig } from "../firebase";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Default public VAPID key for Firebase Cloud Messaging Web Push
const VAPID_KEY = "BKwSajjatAiVapidKeyPlaceholder9837248029348209348203948";

export async function requestWebPushPermission(uid: string): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("Web push notifications are not supported in this browser.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission was not granted.");
      return null;
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      console.log("FCM Device Token generated successfully:", currentToken);
      // Save token to Firebase Realtime Database under users/{uid}/fcm_tokens/{token}
      if (uid && !uid.startsWith("guest_")) {
        try {
          const tokenRef = ref(database, `users/${uid}/fcm_tokens/${currentToken.slice(-20)}`);
          await set(tokenRef, {
            token: currentToken,
            updatedAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
          });
        } catch (dbErr) {
          console.warn("Error saving FCM token to database:", dbErr);
        }
      }
      return currentToken;
    } else {
      console.warn("No registration token available. Request permission to generate one.");
      return null;
    }
  } catch (err) {
    console.warn("An error occurred while retrieving FCM token:", err);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  try {
    onMessage(messaging, (payload) => {
      console.log("Foreground push notification received:", payload);
      callback(payload);
    });
  } catch {}
}
