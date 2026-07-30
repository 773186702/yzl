# خطة العمل - تحسين وتكامل نظام يزل

## قائمة المهام المطلوب إنجازها

### ✅ 1. تكبير حجم الشعار (Logo Size)
- [x] Edit `src/components/YZLOriginalLogo.tsx` - Increase default size from 200 to 300
- [x] Edit `src/components/Layout.tsx` - Increase logo size from 60 to 90
- [x] Edit `src/pages/Dashboard.tsx` - Increase logo sizes (90/110/140)
- [x] Edit `src/pages/Login.tsx` - Increase logo size from 130 to 180

### ✅ 2. ربط العملات وطرق الدفع ديناميكياً في المصروفات
- [ ] Edit `src/pages/Expenses.tsx` - Fetch currencies from Firestore
- [ ] Edit `src/pages/Expenses.tsx` - Fetch payment methods from Firestore
- [ ] Edit `src/pages/Expenses.tsx` - Replace hardcoded SOURCE_ACCOUNTS and currencies with dynamic data

### ✅ 3. إضافة فلاتر ديناميكية في المطابقة المالية
- [ ] Edit `src/pages/MonthlyReconciliation.tsx` - Add currency filter
- [ ] Edit `src/pages/MonthlyReconciliation.tsx` - Add service filter
- [ ] Edit `src/pages/MonthlyReconciliation.tsx` - Add payment method filter
- [ ] Edit `src/pages/MonthlyReconciliation.tsx` - Fetch dynamic data from Firestore

### ✅ 4. إضافة صلاحيات محاسبية جديدة
- [x] Edit `src/types.ts` - Add new permissions for accountant
- [x] Edit `src/types.ts` - Update ROLE_PERMISSION_PRESETS for accountant role

### ✅ 5. إضافة الترجمات الجديدة
- [ ] Edit `src/lib/translations.ts` - Add translations for all new features

### ✅ 6. إضافة الصفحات والتقارير المحاسبية الجديدة
- [ ] Create `src/pages/AccountChart.tsx` - دليل الحسابات
- [ ] Create `src/pages/JournalEntries.tsx` - دفتر اليومية
- [ ] Create `src/pages/BalanceSheet.tsx` - الميزانية العمومية
- [ ] Create `src/pages/IncomeStatement.tsx` - قائمة الدخل
- [ ] Create `src/pages/AuditTrail.tsx` - سجل التدقيق
- [ ] Create `src/pages/EmployeeDeductions.tsx` - الخصومات من الموظفين
- [ ] Create `src/pages/TaskManagement.tsx` - إدارة المهام المتقدمة

### ✅ 7. إضافة المسارات والروابط الجديدة
- [ ] Edit `src/App.tsx` - Add routes for all new pages
- [ ] Edit `src/components/Layout.tsx` - Add sidebar links for new pages

### ✅ 8. اختبار ومراجعة
- [ ] Verify logo sizes across all pages
- [ ] Verify dynamic data loading in Expenses
- [ ] Verify reconciliation filters work correctly
- [ ] Provide completion summary

