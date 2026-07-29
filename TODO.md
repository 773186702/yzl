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
- [x] 3.1 lib/pdfExporter.ts - إضافة دالة تصدير PDF للمطابقة الشهرية
- [x] 3.2 lib/translations.ts - إضافة ترجمات المطابقة الشهرية
- [x] 3.3 pages/MonthlyReconciliation.tsx - إنشاء الصفحة الجديدة
- [x] 3.4 App.tsx - إضافة المسار الجديد
- [x] 3.5 components/Layout.tsx - إضافة رابط في القائمة الجانبية

