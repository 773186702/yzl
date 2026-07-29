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
 * - agent: وكيل خارجي متابع (مندوب)
 * - accountant: محاسب مالي مراجِع
 */
export type UserRole = 'admin' | 'staff' | 'agent' | 'accountant';

/**
 * قائمة بجميع الصلاحيات المتاحة في النظام
 */
export const ALL_PERMISSIONS_LIST = [
  // العمليات
  { id: 'view_tasks', label: 'عرض المهام', category: 'العمليات' },
  { id: 'create_task', label: 'إنشاء مهمة جديدة', category: 'العمليات' },
  { id: 'edit_task', label: 'تعديل المهام', category: 'العمليات' },
  { id: 'delete_task', label: 'حذف المهام', category: 'العمليات' },
  { id: 'approve_task', label: 'الموافقة على المهام', category: 'العمليات' },
  { id: 'execute_task', label: 'تنفيذ المهام', category: 'العمليات' },
  
  // العملاء
  { id: 'add_client', label: 'إضافة عملاء', category: 'العملاء' },
  { id: 'edit_client', label: 'تعديل عملاء', category: 'العملاء' },
  
  // المالية
  { id: 'view_ledger', label: 'عرض السجل المالي', category: 'المالية' },
  { id: 'view_financial_reports', label: 'عرض التقارير المالية', category: 'المالية' },
  { id: 'manage_expenses', label: 'إدارة المصروفات', category: 'المالية' },
  { id: 'manage_revenue', label: 'إدارة الإيرادات', category: 'المالية' },
  { id: 'issue_invoices', label: 'إصدار الفواتير', category: 'المالية' },
  { id: 'view_employee_reports', label: 'تقارير الموظفين', category: 'المالية' },
  { id: 'deduct_employee', label: 'خصم من الموظف', category: 'المالية' },
  { id: 'add_expense', label: 'إضافة مصروفات', category: 'المالية' },
  
  // النظام
  { id: 'manage_services', label: 'إدارة كتالوج الخدمات', category: 'النظام' },
  { id: 'manage_users', label: 'إدارة المستخدمين', category: 'النظام' },
  { id: 'manage_payment_methods', label: 'إدارة طرق الدفع', category: 'النظام' },
  { id: 'manage_currencies', label: 'إدارة العملات', category: 'النظام' },
  { id: 'view_dashboard', label: 'عرض لوحة التحكم', category: 'النظام' },
  { id: 'admin', label: 'مدير نظام كامل', category: 'النظام' },
] as const;

/**
 * قوالب الصلاحيات المسبقة حسب الدور الوظيفي
 */
export const ROLE_PERMISSION_PRESETS: Record<UserRole, string[]> = {
  admin: ALL_PERMISSIONS_LIST.map(p => p.id),
  staff: [
    'view_tasks',
    'create_task',
    'edit_task',
    'add_client',
    'edit_client',
    'view_dashboard',
  ],
  accountant: [
    'view_tasks',
    'create_task',
    'edit_task',
    'add_client',
    'view_ledger',
    'view_financial_reports',
    'manage_expenses',
    'manage_revenue',
    'issue_invoices',
    'add_expense',
    'view_employee_reports',
    'view_dashboard',
  ],
  agent: [
    'view_tasks',
    'execute_task',
    'edit_task',
    'view_dashboard',
  ],
};

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
  status: 'new' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'cancelled'; // حالة المعاملة
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
  recipient?: string; // المستلم	
  employee_id?: string; // معرف الموظف المرتبط (لربط المصروف بالموظف)
  employee_name?: string; // اسم الموظف المرتبط
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

