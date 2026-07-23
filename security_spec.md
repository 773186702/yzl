# Security Specification for Yazal PWA

## Data Invariants
- وكل مهمة (Task) يجب أن ترتبط بعميل (Client) موجود.
- لا يمكن للمستخدمين العاديين تعديل صلاحياتهم الخاصة (permissions) أو أدوارهم (roles).
- المبالغ المتبقية (remaining_amount) يجب أن تكون ناتج طرح المدفوع (paid_amount) من الإجمالي (total_price).
- الحسابات الختامية والمصروفات لا يمكن حذفها بعد مرور 24 ساعة لضمان النزاهة المالية.

## The "Dirty Dozen" Payloads (محاولات الاختراق)
1. **Privilege Escalation**: محاولة مستخدم تغيير دوره إلى `admin`.
2. **Orphaned Task**: إنشاء مهمة بدون `client_id` صالح.
3. **Impersonation**: محاولة إنشاء مهمة بـ `created_by` لمستخدم آخر.
4. **Negative Debt**: محاولة تعيين مبلغ دين بالسالب.
5. **Unauthorized Ledger Read**: محاولة موظف قراءة سجلات المصروفات دون امتلاك صلاحية `view_ledger`.
6. **Cross-User Deletion**: محاولة حذف عميل أنشأه مستخدم آخر.
7. **Schema Poisoning**: إرسال حقول ضخمة (1MB) في حقل الاسم.
8. **Invalid Currency**: استخدام عملة غير مدعومة (مثل EGP).
9. **Backdated Task**: محاولة تعيين `created_at` بتاريخ قديم لتجاوز الرقابة.
10. **State Shortcut**: محاولة تغيير حالة المهمة من "جديد" إلى "مكتمل" دون المرور بمرحلة "قيد التنفيذ".
11. **Shadow Field**: إضافة حقل `is_verified: true` غير موجود في المخطط.
12. **Anonymous Write**: محاولة الكتابة دون تسجيل دخول.

## Security Rules Strategy
- استخدام `isValidUser()`, `isValidClient()`, `isValidTask()`, `isValidExpense()` للتحقق من المخطط.
- التحقق من `request.auth.uid` مقابل الحقول الخاصة بالمستخدم.
- فرض التحقق من البريد الإلكتروني إذا لزم الأمر.
- استخدام `diff()` في التحديثات لضمان تعديل الحقول المسموح بها فقط.
