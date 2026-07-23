/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Building2, 
  Tag, 
  User, 
  FileText, 
  X, 
  ArrowDownRight, 
  Wallet, 
  CreditCard,
  TrendingDown,
  Trash2
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/audit';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { SearchableSelect } from '../components/SearchableSelect';
import ConfirmationModal from '../components/ConfirmationModal';

export interface OperationalExpense {
  expense_id: string;
  title: string;
  category: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD' | 'EGP' | 'AED' | 'EUR';
  source_account: string;
  recipient?: string; // المستلم
  notes?: string;
  logged_by: string;
  date: Date;
}

/**
 * فئات المصروفات التشغيلية المعتمدة في شركة يزل
 */
const EXPENSE_CATEGORIES = [
  'رواتب وأجور الكادر',
  'إيجار وتكاليف المقر الرئيسي',
  'رسوم موافقات وقنصليات',
  'تقنية واستضافات وأنظمة',
  'نثريات وضيافة مكاتب',
  'تسويق وإعلانات رقمية',
  'مصروفات أخرى'
];

/**
 * الحسابات المالية ومصادر الخصم
 */
const SOURCE_ACCOUNTS = [
  'نقد كاش (الصندوق الرئيسي)',
  'كريمي جوال (حساب بنكي)',
  'محفظة وان كاش One Cash',
  'محفظة جوالي Jawali',
  'محفظتي Mahfazati',
  'حوالة محلية صرافة'
];

/**
 * صفحة إدارة المصروفات التشغيلية (Operational Expenses Ledger)
 * تتيح تسجيل المصروفات وربطها بالخصم المباشر من الحسابات المالية المعتمدة
 */
const Expenses: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();
  const t = translations[language];

  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // حالة نموذج المصروف
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    currency: 'USD' as OperationalExpense['currency'],
    source_account: SOURCE_ACCOUNTS[0],
    recipient: '',
    notes: ''
  });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // جلب سجل المصروفات الحية من Firestore
  useEffect(() => {
    setLoading(true);
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: OperationalExpense[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          expense_id: docSnap.id,
          title: data.title,
          category: data.category,
          amount: Number(data.amount) || 0,
          currency: data.currency || 'USD',
          source_account: data.source_account || 'الصندوق الرئيسي',
          notes: data.notes || '',
          logged_by: data.logged_by || 'الموظف',
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
        });
      });
      setExpenses(list);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching expenses:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * معالج حفظ المصروف (إضافة جديد أو تعديل)
   */
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount || Number(expenseForm.amount) <= 0) {
      alert('يرجى كتابة بيان المصروف والمبلغ بشكل صحيح.');
      return;
    }

    const expId = editingExpenseId || `EXP-${Math.floor(10000 + Math.random() * 90000)}`;
    const expenseData: Partial<OperationalExpense> = {
      title: expenseForm.title,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      currency: expenseForm.currency,
      source_account: expenseForm.source_account,
      recipient: expenseForm.recipient,
      notes: expenseForm.notes,
    };

    if (!editingExpenseId) {
      expenseData.expense_id = expId;
      expenseData.logged_by = user?.username || 'الموظف الحالي';
      expenseData.date = new Date();
    }

    try {
      await setDoc(doc(db, 'expenses', expId), expenseData, { merge: true });
      await logActivity(
        editingExpenseId ? 'تعديل مصروف تشغيلي' : 'تسجيل مصروف تشغيلي',
        editingExpenseId 
          ? `تم تعديل المصروف رقم ${expId} بقيمة ${expenseForm.amount} ${expenseForm.currency}` 
          : `تم قيد مصروف بقيمة ${expenseForm.amount} ${expenseForm.currency} ببيان: ${expenseForm.title} خصماً من (${expenseForm.source_account})`
      );

      closeModal();
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('حدث خطأ أثناء حفظ المصروف.');
    }
  };

  const openEditModal = (expense: OperationalExpense) => {
    setExpenseForm({
      title: expense.title,
      category: expense.category,
      amount: expense.amount.toString(),
      currency: expense.currency,
      source_account: expense.source_account,
      recipient: expense.recipient || '',
      notes: expense.notes || ''
    });
    setEditingExpenseId(expense.expense_id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpenseId(null);
    setExpenseForm({
      title: '',
      category: EXPENSE_CATEGORIES[0],
      amount: '',
      currency: 'USD',
      source_account: SOURCE_ACCOUNTS[0],
      recipient: '',
      notes: ''
    });
  };

  /**
   * حذف مصروف تشغيلي
   */
  const handleDeleteExpense = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteDoc(doc(db, 'expenses', deleteTargetId));
      await logActivity('حذف مصروف', `تم حذف المصروف رقم: ${deleteTargetId}`);
      setDeleteTargetId(null);
      setIsConfirmModalOpen(false);
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('حدث خطأ أثناء الحذف.');
    }
  };

  // حساب إجمالي المصروفات حسب العملات الرئيسية
  const totalUSD = expenses.filter(e => e.currency === 'USD').reduce((acc, curr) => acc + curr.amount, 0);
  const totalYER = expenses.filter(e => e.currency === 'YER').reduce((acc, curr) => acc + curr.amount, 0);
  const totalSAR = expenses.filter(e => e.currency === 'SAR').reduce((acc, curr) => acc + curr.amount, 0);

  // تصفية القائمة
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.source_account.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.logged_by.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* الهيدر العلوي */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
            <TrendingDown className="text-rose-500" size={32} />
            {t.expenses_title}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            Yazal Operational Expense Ledger • Realtime Account Deductions
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20 transition-all active:scale-95 uppercase tracking-widest text-xs self-start md:self-auto"
        >
          <Plus size={20} />
          {t.add_expense}
        </button>
      </div>

      {/* كروت الإجماليات حسب العملات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm space-y-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">إجمالي المصروفات (دولار أمريكي)</span>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-black text-rose-500">{totalUSD.toLocaleString()} USD</span>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl text-rose-500">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm space-y-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">إجمالي المصروفات (ريال يمني)</span>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-black text-rose-500">{totalYER.toLocaleString()} YER</span>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl text-rose-500">
              <Wallet size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm space-y-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">إجمالي المصروفات (ريال سعودي)</span>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-black text-rose-500">{totalSAR.toLocaleString()} SAR</span>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl text-rose-500">
              <CreditCard size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* شريط البحث وتصفية الفئات */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white dark:bg-yazal-navy-light p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4 shadow-sm">
          <Search className="text-slate-400 shrink-0" size={20} />
          <input 
            type="text" 
            placeholder={language === 'ar' ? 'ابحث ببيان المصروف، حساب الخصم، أو الموظف...' : 'Search expense title, account, or staff...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none font-bold text-sm text-yazal-navy dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="bg-white dark:bg-yazal-navy-light p-2 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-full bg-transparent font-black text-xs text-yazal-navy dark:text-white outline-none cursor-pointer px-3"
          >
            <option value="all">كافة الفئات التشغيلية</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* قائمة المصروفات */}
      <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">جاري تحميل سجل المصروفات...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-16 text-center">
            <Receipt size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">لا توجد مصروفات مسجلة</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">قم بتسجيل مصروف جديد لقيده المالي الفوري</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredExpenses.map((exp) => (
              <div key={exp.expense_id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 font-black flex items-center justify-center shrink-0">
                    <ArrowDownRight size={22} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-base text-yazal-navy dark:text-white uppercase tracking-tight">{exp.title}</h4>
                      <span className="text-[10px] font-black bg-slate-100 dark:bg-yazal-navy-dark text-slate-500 px-2.5 py-0.5 rounded-md uppercase">
                        {exp.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 flex-wrap">
                      <span>الحساب الخاطيم: <strong className="text-yazal-navy dark:text-slate-200">{exp.source_account}</strong></span>
                      <span>الموظف: <strong>{exp.logged_by}</strong></span>
                      <span>التاريخ: {exp.date.toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xl font-black text-rose-500 block">
                      -{exp.amount.toLocaleString()} {exp.currency}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      #{exp.expense_id}
                    </span>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => openEditModal(exp)}
                        title="تعديل المصروف"
                        className="p-1.5 text-slate-400 hover:text-yazal-cyan hover:bg-yazal-cyan/10 dark:hover:bg-yazal-cyan/20 rounded-xl transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>
                      <button 
                        onClick={() => { setDeleteTargetId(exp.expense_id); setIsConfirmModalOpen(true); }}
                        title="حذف المصروف"
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal 
        isOpen={isConfirmModalOpen}
        onClose={() => { setDeleteTargetId(null); setIsConfirmModalOpen(false); }}
        onConfirm={handleDeleteExpense}
        title="تأكيد الحذف"
        message="هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
      />

      {/* مودال قيد مصروف جديد */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-yazal-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-yazal-navy-light w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 p-8 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">{editingExpenseId ? 'تعديل المصروف التشغيلي' : 'تسجيل مصروف تشغيلي'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">خصم مباشر من الرصيد المالي المعتمد</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">بيان/عنوان المصروف *</label>
                  <input 
                    type="text"
                    required
                    list="expense-titles"
                    autoComplete="off"
                    title="بيان أو سبب المصروف"
                    placeholder="مثال: سداد إيجار المكتب الرئيسي - شهر يوليو"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-rose-500"
                  />
                  <datalist id="expense-titles">
                    <option value="سداد إيجار المكتب الرئيسي" />
                    <option value="فاتورة إنترنت واتصالات" />
                    <option value="ضيافة ومصروفات يومية" />
                    <option value="رواتب الموظفين" />
                    <option value="رسوم تراخيص واعتمادات" />
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">الفئة التشغيلية</label>
                  <SearchableSelect
                    options={EXPENSE_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                    value={expenseForm.category}
                    onChange={(val) => setExpenseForm({ ...expenseForm, category: val })}
                    placeholder="اختر فئة المصروف..."
                    title="حدد فئة المصروف التشغيلي"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">المبلغ المصروف *</label>
                    <input 
                      type="number"
                      step="any"
                      min="0"
                      required
                      autoComplete="transaction-amount"
                      title="المبلغ المراد صرفه"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-black text-sm outline-none focus:ring-2 ring-rose-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">العملة</label>
                    <SearchableSelect
                      options={[
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'YER', label: 'YER (ريال يمني)' },
                        { value: 'SAR', label: 'SAR (ريال سعودي)' },
                        { value: 'EGP', label: 'EGP (جنيه مصري)' },
                        { value: 'AED', label: 'AED (درهم إماراتي)' },
                        { value: 'EUR', label: 'EUR (€)' },
                      ]}
                      value={expenseForm.currency}
                      onChange={(val) => setExpenseForm({ ...expenseForm, currency: val as any })}
                      placeholder="العملة..."
                      title="عملة المصروف"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">حساب الخصم الصادر</label>
                  <SearchableSelect
                    options={SOURCE_ACCOUNTS.map(acc => ({ value: acc, label: acc }))}
                    value={expenseForm.source_account}
                    onChange={(val) => setExpenseForm({ ...expenseForm, source_account: val })}
                    placeholder="حساب الدفع..."
                    title="الحساب الذي سيتم الخصم منه"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">المستلم</label>
                  <input 
                    type="text"
                    autoComplete="off"
                    title="اسم الشخص أو الجهة المستلمة"
                    placeholder="مثال: أحمد محمد (سائق)"
                    value={expenseForm.recipient}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recipient: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-rose-500"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-4 bg-slate-100 dark:bg-white/5 font-black text-xs uppercase tracking-widest rounded-2xl text-slate-500"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-rose-600 transition-colors"
                  >
                    {editingExpenseId ? 'حفظ التعديلات' : 'قيد المصروف'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Expenses;
