import { onMessage } from 'firebase/messaging';
import { messaging, requestNotificationPermission } from './firebase';

/**
 * تهيئة استقبال الإشعارات في الواجهة الأمامية
 */
export const initMessaging = async () => {
  const token = await requestNotificationPermission();
  if (token) {
    console.log('FCM Token:', token);
    // هنا يمكن إرسال التوكن للخادم لحفظه وربطه بالمستخدم
  }

  const msg = await messaging();
  if (msg) {
    onMessage(msg, (payload) => {
      console.log('Message received. ', payload);
      
      // عرض إشعار مخصص مع صوت
      if (payload.notification) {
        const { title, body } = payload.notification;
        
        // تشغيل صوت مخصص (يجب التأكد من وجود الملف في مجلد public)
        const audio = new Audio('/assets/sounds/notification.mp3');
        audio.play().catch(e => console.log('Audio playback failed:', e));

        // عرض الإشعار باستخدام Browser Notification API
        if (Notification.permission === 'granted') {
          new Notification(title || 'YZL Update', {
            body: body || 'You have a new update',
            icon: '/icon-192x192.png',
          });
        }
      }
    });
  }
};
