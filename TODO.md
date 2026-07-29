# خطة العمل - تحسين نظام يزل

## ✅ تم إنجازه

### 1. الترجمات (translations.ts)
- [x] إضافة حالات الاعتماد الجديدة (pending_approval, approved, approve_task, reject_task, execute_task_btn)
- [x] إضافة مفردات المطابقة المالية الشهرية (monthly_reconciliation, select_month, select_year, إلخ)
- [x] إضافة الترجمات الإنجليزية المقابلة

### 2. أنواع المهام (types.ts)
- [x] إضافة صلاحية `approve_task` للمحاسب
- [x] إضافة صلاحية `execute_task` للمندوب (agent)
- [x] إضافة حالة `pending_approval` و `approved` إلى Task.status
- [x] تحديث قوالب الصلاحيات للأدوار

### 3. سير عمل الاعتماد (Tasks.tsx)
- [x] إضافة أزرار الاعتماد/الرفض للمحاسب (تظهر فقط للمهام pending_approval)
- [x] إضافة زر التنفيذ للمندوب (يظهر فقط للمهام المعتمدة)
- [x] تحديث قائمة تصفية الحالة (pending_approval, approved)
- [x] تحديث الأيقونات حسب الحالة
- [x] تحديث خيارات dropdown الحالة

### 4. صفحة المطابقة المالية الشهرية (MonthlyReconciliation.tsx)
- [x] إنشاء الصفحة الجديدة مع اختيار الشهر والسنة
- [x] عرض الإيرادات والمصروفات وصافي الربح/الخسارة
- [x] تصدير PDF مع تنسيق عربي ومنسق
- [x] تصدير CSV مع ترميز UTF-8 BOM
- [x] إضافة المسار في App.tsx
- [x] إضافة رابط في القائمة الجانبية Layout.tsx
- [x] إضافة دالة تصدير PDF في pdfExporter.ts
- [x] إضافة الترجمات في translations.ts

### 5. تحسينات عرض المودالات (Responsive & Scroll)
- [x] Expenses.tsx - إضافة max-h و overflow-y-auto لمودال إضافة المصروف
- [x] Clients.tsx - إضافة max-h و overflow-y-auto لمودال إضافة العميل
- [x] Tasks.tsx - إضافة max-h و overflow-y-auto لمودال الفاتورة
- [x] Login.tsx - تعديل حجم الشعار من 180 إلى 120
- [x] Layout.tsx - تعديل حجم الشعار من 90 إلى 60
- [x] Dashboard.tsx - تعديل مقاسات الشعار
- [x] تم تغيير pt-20 إلى pt-24 لتعويض حجم الهيدر
- [x] إصلاح تعارض overflow-hidden مع overflow-y-auto

### 6. تنسيق الهيدر (Header)
- [x] تقليل حجم الشعار في الهيدر
- [x] تحسين المسافات والـ padding على الموبايل
- [x] إضافة min-h-14 بدلاً من min-h-16
- [x] إضافة أيقونة Scale للمطابقة المالية في القائمة

### 7. المشاكل المتبقية
- [ ] التأكد من عدم وجود خطأ TypeScript مع Scale في Layout.tsx (الملف موجود في lucide-react)
- [ ] اختبار responsiveness يدوي للموبايل

