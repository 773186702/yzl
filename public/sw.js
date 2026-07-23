// تطبيق يزل - ملف العامل البرمجي (Service Worker)
// يدعم التخزين المؤقت وإشعارات Firebase في الخلفية

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// تهيئة Firebase في الـ Service Worker
firebase.initializeApp({
  apiKey: "API_KEY",
  authDomain: "AUTH_DOMAIN",
  projectId: "PROJECT_ID",
  storageBucket: "STORAGE_BUCKET",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
});

const messaging = firebase.messaging();

// التعامل مع الرسائل في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/yzl_pwa_icon_512.png',
    data: payload.data,
    tag: 'yazal-notification',
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'yazal-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/yzl_pwa_icon_512.png'
];

// مرحلة التثبيت: حفظ الأصول الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('تم فتح التخزين المؤقت وحفظ الأصول');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// مرحلة التنشيط: مسح التخزين المؤقت القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('مسح التخزين المؤقت القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// مرحلة الجلب: استراتيجية "التخزين المؤقت أولاً مع التحديث من الشبكة"
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // إذا وجد في التخزين المؤقت، أعده، وإلا اجلبه من الشبكة
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // حفظ نسخة جديدة في التخزين المؤقت (اختياري، حسب نوع الملف)
          if (event.request.url.startsWith('http')) {
             // cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
      // إذا فشلت الشبكة والتخزين المؤقت (مثلاً عند انقطاع الإنترنت)
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
