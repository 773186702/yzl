/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// الأنواع والواجهات الخاصة بتطبيق "يزل" لخدمات السفر والمالية
// Yazal ERP & Task Ledger Core Type Definitions

/**
 * أدوار المستخدمين المتاحة في نظام يزل:
 * - admin: مدير النظام بكافة الصلاحيات
 * - staff: موظف تشغيل وإدخال معاملات
 * - agent: وكيل خارجي متابع
 * - accountant: محاسب مالي مراجِع
 */
export type UserRole = 'admin' | 'staff' | 'agent' | 'accountant';

/**
 * واجهة ملف تعريف المستخدم وصلاحياته المخصصة
 */
export interface UserProfile {
  uid: string; // المعرف الفريد للمستخدم في Firebase Auth
  username: string; // الاسم الكامل للموظف
  email?: string; // البريد الإلكتروني المهني
  role: UserRole; // الدور الوظيفي الأساسي
  permissions: string[]; // مصفوفة الصلاحيات الجزئية (Permissions Flags)
  biometricEnabled?: boolean; // تفعيل المصادقة بالبصمة/الوجه
  is_active?: boolean; // تفعيل/تعطيل الحساب
  fixed_tasks_ids?: string[]; // المهام المحددة للموظف
  created_at?: any; // تاريخ الإنشاء في Firestore
}

/**
 * واجهة العميل المسجل في دليل CRM لنظام يزل
 */
export interface Client {
  client_id: string; // كود العميل الموحد (مثال: CUS-1001)
  name: string; // الاسم الكامل للعميل
  phone: string; // رقم الهاتف / واتساب
  email?: string; // البريد الإلكتروني للعميل
  passport_no?: string; // رقم جواز السفر
  total_debt: number; // إجمالي الديون المستحقة
  created_by: string; // اسم الموظف الذي أضاف العميل
  created_at?: any; // تاريخ التسجيل
}

/**
 * العملات المدعومة في المحرك المالي لتطبيق يزل
 */
export type Currency = 'YER' | 'SAR' | 'USD' | 'EGP' | 'AED' | 'EUR' | 'GBP';

/**
 * كتالوج الخدمات الثابتة والأسعار المعتمدة من الإدارة
 */
export interface FixedService {
  service_id: string; // المعرف الفريد للخدمة
  service_code: string; // كود الخدمة (مثال: SRV-SCH-01)
  service_name_ar: string; // اسم الخدمة بالعربية (مثال: تأشيرة شنغن)
  service_name_en: string; // اسم الخدمة بالإنجليزية
  base_price: number; // السعر الثابت المعتمد غير القابل للتعديل إلا بصلاحيات
  default_currency: Currency; // العملة الافتراضية للخدمة
  description?: string; // وصف وملاحظات الخدمة
  category?: string; // التصنيف (تأشيرات، سفر، استثمار، قنصلية)
}

/**
 * دليل بوابات وطرق الدفع المحلية
 */
export interface PaymentGateway {
  id: string; // المعرف الفريد
  name_ar: string; // الاسم بالعربية (مثال: محفظة وان كاش)
  name_en: string; // الاسم بالإنجليزية (مثال: One Cash)
  type: 'cash' | 'wallet' | 'bank' | 'transfer'; // نوع الحساب
  account_number?: string; // رقم الحساب أو الآيبان
  is_active: boolean; // حالة تفعيل طريقة الدفع
}

/**
 * واجهة المعاملة/المهمة المطلوبة
 */
export interface Task {
  task_id: string; // رقم المعاملة الموحد (مثال: YZL-TASK-8801)
  client_id: string; // كود العميل المرتبط الإجباري (CUS-1001)
  client_name?: string; // اسم العميل لسرعة العرض
  service_id: string; // كود الخدمة الثابتة
  service_name?: string; // اسم الخدمة
  created_by: string; // الموظف المنشئ
  created_by_employee_name?: string; // الاسم الكامل للموظف الذي أنشأ المهمة
  assigned_to: string; // الموظف المنفذ
  status: 'new' | 'processing' | 'completed' | 'cancelled'; // حالة المعاملة
  original_currency: Currency; // العملة الأصلية
  total_price: number; // المبلغ الإجمالي
  paid_amount: number; // المبلغ المدفوع
  remaining_amount: number; // المبلغ المتبقي (محسوب)
  payment_method: string; // طريقة الدفع المستخدمة
  transaction_ref?: string; // مرجع عملية الدفع أو الحوالة
  attachment_url?: string; // رابط صورة جواز السفر أو المستند
  passport_number?: string; // رقم الجواز المستخرج
  notes?: string; // ملاحظات اضافية
  priority?: 'low' | 'medium' | 'high'; // أولوية المهمة
  created_at: any; // تاريخ إنشاء المعاملة
  updated_at?: any; // تاريخ آخر تحديث
  deadline?: any; // موعد انتهاء المعاملة
}

/**
 * واجهة سجل تدقيق أفعال المستخدمين (Audit Log)
 */
export interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  action: string;
  details: string;
  timestamp: any;
}

/**
 * واجهة المصروفات التشغيلية
 */
export interface Expense {
  expense_id: string; // معرف المصروف
  title: string; // عنوان المصروف
  amount: number; // القيمة
  currency: Currency; // العملة
  source_account: string; // الحساب الخصم منه
  created_by?: string; // الموظف
  date: any; // تاريخ المصروف
}

/**
 * واجهة الحسابات المالية والبوابات
 */
export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: Currency;
  color: string;
  trend: string;
  last_updated: any;
}

/**
 * واجهة المعاملات المالية بالسجل
 */
export interface LedgerTransaction {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  currency: Currency;
  date: any;
  account: string;
  created_by: string;
}

/**
 * واجهة حالة المظهر واللغة بالتطبيق
 */
export interface AppState {
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
}

