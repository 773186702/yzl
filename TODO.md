# خطة العمل - تحسين وتكامل نظام يزل

## ✅ جميع المهام مكتملة

### ✅ 1. تكبير حجم الشعار (Logo Size)
- [x] Edit `src/components/YZLOriginalLogo.tsx` - Default size 300 ✓
- [x] Edit `src/components/Layout.tsx` - Logo size 90 → 150 ✓
- [x] Edit `src/pages/Dashboard.tsx` - Logo sizes 90/110/140 → 130/160/200 ✓
- [x] Edit `src/pages/Login.tsx` - Logo size 180 → 260 ✓

### ✅ 2. ربط العملات وطرق الدفع ديناميكياً في المصروفات
- [x] Edit `src/pages/Expenses.tsx` - Fetch currencies from Firestore ✓
- [x] Edit `src/pages/Expenses.tsx` - Fetch payment methods from Firestore ✓
- [x] Edit `src/pages/Expenses.tsx` - Replace hardcoded SOURCE_ACCOUNTS with dynamic data ✓

### ✅ 3. إضافة فلاتر ديناميكية في المطابقة المالية
- [x] Edit `src/pages/MonthlyReconciliation.tsx` - Add currency filter ✓
- [x] Edit `src/pages/MonthlyReconciliation.tsx` - Add service filter ✓
- [x] Edit `src/pages/MonthlyReconciliation.tsx` - Add payment method filter ✓
- [x] Edit `src/pages/MonthlyReconciliation.tsx` - Fetch dynamic data from Firestore ✓
- [x] Edit `src/pages/MonthlyReconciliation.tsx` - Fix broken JSX in permission check ✓

### ✅ 4. إضافة صلاحيات محاسبية جديدة
- [x] Edit `src/types.ts` - Add new permissions for accountant ✓
- [x] Edit `src/types.ts` - Update ROLE_PERMISSION_PRESETS for accountant role ✓

### ✅ 5. إضافة الترجمات الجديدة
- [x] Edit `src/lib/translations.ts` - Add translations for all new features ✓

### ✅ 6. إضافة الصفحات والتقارير المحاسبية الجديدة
- [x] Create `src/pages/AccountChart.tsx` - دليل الحسابات ✓
- [x] Create `src/pages/JournalEntries.tsx` - دفتر اليومية ✓
- [x] Create `src/pages/BalanceSheet.tsx` - الميزانية العمومية ✓
- [x] Create `src/pages/IncomeStatement.tsx` - قائمة الدخل ✓
- [x] Create `src/pages/AuditTrail.tsx` - سجل التدقيق ✓
- [x] Create `src/pages/EmployeeDeductions.tsx` - الخصومات من الموظفين ✓
- [x] Create `src/pages/TaskManagement.tsx` - إدارة المهام المتقدمة ✓

### ✅ 7. إضافة المسارات والروابط الجديدة
- [x] Edit `src/App.tsx` - Add routes for all new pages ✓
- [x] Edit `src/components/Layout.tsx` - Add sidebar links for new pages ✓

### ✅ 8. اختبار ومراجعة
- [x] Verify logo sizes across all pages ✓
- [x] Verify dynamic data loading in Expenses ✓
- [x] Verify reconciliation filters work correctly ✓
- [x] Provide completion summary ✓
