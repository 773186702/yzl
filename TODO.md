# TODO - خطة التطوير الشاملة

## ✅ المرحلة 1: إصلاح مشكلة الهيدر ✅
- [x] إصلاح Layout.tsx: منع الالتفاف (flex-wrap) وضبط الهيدر لجميع الشاشات
- [x] ضبط padding للمحتوى الرئيسي `pt-24` ليكون متوافقاً مع الهيدر
- [x] إصلاح السايدبار للموبايل والديستوب

## ✅ المرحلة 2: تحديث أنواع البيانات (types.ts) ✅
- [x] إضافة `TaskWorkflowStep` interface
- [x] إضافة حقول التتبع للمهام: `approved_by`, `processing_by`, `completed_by`, `workflow_history`
- [x] إضافة `YER_OLD`, `YER_NEW` إلى Currency type
- [x] إضافة `Region` type

## ✅ المرحلة 3: تحديث Tasks.tsx - نظام تتبع المهام المتقدم ✅
- [x] إضافة دوال مساعدة (createWorkflowStep, sendNotification)
- [x] إضافة صلاحيات صارمة لتغيير الحالة (canChangeStatus)
- [x] تسجيل الموافقة (approved_by, approved_at)
- [x] تسجيل التنفيذ (processing_by, processing_at) + منع مندوب آخر
- [x] تسجيل الإكمال (completed_by, completed_at) + السماح فقط للمنفذ
- [x] منع إعادة المهام المكتملة
- [x] إرسال إشعارات عند كل تغيير حالة
- [x] عرض معلومات تتبع سير العمل في البطاقة

## 📋 المرحلة 4: تحديث CreateTask.tsx - إضافة created_by_role
- [ ] إضافة `created_by_role` عند إنشاء المهمة

## 📋 المرحلة 5: تحديث TaskManagement.tsx
- [ ] تطبيق نفس القيود والآليات

## 🔔 المرحلة 6: تحسين الإشعارات
- [ ] تحديث firebase-messaging.ts - إرسال إشعارات مستهدفة
- [ ] تحديث firebase-messaging-sw.js - تحسين Service Worker

## 💱 المرحلة 7: تحديث Currencies.tsx - أسعار صرف حقيقية
- [ ] جلب أسعار الصرف من API موثوق
- [ ] دعم الريال اليمني القديم والجديد
- [ ] إضافة أسعار حسب المنطقة (صنعاء، عدن، حضرموت)
- [ ] تمكين التعديل اليدوي
- [ ] حفظ الأسعار في Firestore
