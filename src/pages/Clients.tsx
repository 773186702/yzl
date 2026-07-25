/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  FileText, 
  DollarSign, 
  X, 
  Contact, 
  ChevronRight, 
  History, 
  Clock, 
  AlertCircle,
  Plus,
  ArrowUpRight,
  Trash2,
  Edit
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, onSnapshot, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client, Task } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/audit';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';

/**
 * صفحة دليل إدارة العملاء (CRM System)
 * - تدعم تسجيل عملاء جدد مع توليد معرف يزل الفريد (Yazal Client ID)
 * - تدعم واجهة استيراد الأسماء من جهاز الجوال مباشرة عبر Web Contact Picker API
 * - توفر لوحة جانبية (Drawer) لعرض السجل الزمني والديون والمستندات الخاصة بالعميل
 */
const Clients: React.FC = () => {
  const { language } = useApp();
  const t = translations[language];

  // حالات الصفحة والرئيسيات
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTasks, setClientTasks] = useState<Task[]>([]);
  const [clientDebtFromOrders, setClientDebtFromOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);

  // حالة نموذج العميل
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    email: '',
    passport_no: '',
    initial_debt: '0'
  });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // جلب قائمة العملاء من Firestore بشكل مباشر ومزامن
  useEffect(() => {
    setLoading(true);
    const clientsRef = collection(db, 'clients');
    const q = query(clientsRef, orderBy('client_id', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientList: Client[] = [];
      snapshot.forEach((docSnap) => {
        clientList.push(docSnap.data() as Client);
      });
      setClients(clientList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching clients:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // جلب المعاملات الخاصة بالعميل المحدد للدرج الجانبي
  useEffect(() => {
    if (!selectedClient) {
      setClientTasks([]);
      setClientDebtFromOrders(0);
      return;
    }

    const tasksRef = collection(db, 'tasks');
    const clientTasksQuery = query(tasksRef, where('client_id', '==', selectedClient.client_id));
    const unsubscribe = onSnapshot(clientTasksQuery, (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Task;
        tasks.push({ task_id: docSnap.id, ...data });
      });
      setClientTasks(tasks);
    });

    return () => unsubscribe();
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedClient) return;

    const newDebt = clientTasks.reduce((sum, task) => sum + Number(task.remaining_amount || 0), 0);
    setClientDebtFromOrders(newDebt);

    if (selectedClient.total_debt !== newDebt) {
      const clientRef = doc(db, 'clients', selectedClient.client_id);
      updateDoc(clientRef, { total_debt: newDebt }).catch((err) => {
        console.warn('Unable to sync client debt with tasks:', err);
      });
      setSelectedClient((prev) => prev ? { ...prev, total_debt: newDebt } : null);
    }
  }, [clientTasks, selectedClient]);

  /**
   * استيراد البيانات عبر Contact Picker API التابع للمتصفح
   * يتيح التفاعل المباشر مع سجل الهاتف على أجهزة أندرويد والآيفون والمتصفحات الحديثة
   */
  const handleImportContact = async () => {
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const props = ['name', 'tel', 'email'];
        const contacts = await (navigator as any).contacts.select(props, { multiple: false });
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          setClientForm(prev => ({
            ...prev,
            name: contact.name ? contact.name[0] : prev.name,
            phone: contact.tel ? contact.tel[0] : prev.phone,
            email: contact.email ? contact.email[0] : prev.email
          }));
          logActivity('استيراد جهة اتصال', `تم جلب بيانات العميل ${contact.name?.[0] || ''} من الهاتف`);
        }
      } catch (err) {
        console.warn('Contact picker failed or cancelled:', err);
      }
    } else {
      alert('ميزة استيراد جهات الاتصال غير مدعومة في متصفحك الحالي، يرجى كتابة البيانات يدوياً.');
    }
  };

  /**
   * معالج حفظ العميل (إضافة جديد أو تعديل)
   */
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.phone) {
      alert('يرجى كتابة اسم العميل ورقم الهاتف على الأقل.');
      return;
    }

    if (!window.confirm(editingClientId ? 'هل أنت متأكد من حفظ التعديلات على بيانات العميل؟' : 'هل أنت متأكد من رغبتك في تسجيل هذا العميل؟')) {
      return;
    }

    const clientId = editingClientId || `CUS-${Math.floor(1000 + Math.random() * 9000)}`;

    const clientData: Partial<Client> = {
      name: clientForm.name,
      phone: clientForm.phone,
      email: clientForm.email || '',
      passport_no: clientForm.passport_no || '',
      total_debt: Number(clientForm.initial_debt) || 0,
    };

    if (!editingClientId) {
      clientData.client_id = clientId;
      clientData.created_by = 'الموظف الحالي';
      clientData.created_at = new Date();
    }

    try {
      await setDoc(doc(db, 'clients', clientId), clientData, { merge: true });
      await logActivity(
        editingClientId ? 'تعديل بيانات عميل' : 'تسجيل عميل جديد', 
        editingClientId ? `تم تعديل بيانات العميل: ${clientForm.name} بكود (${clientId})` : `تم تسجيل العميل: ${clientForm.name} بكود (${clientId})`
      );
      closeModal();
    } catch (err) {
      console.error('Error saving client:', err);
      alert('حدث خطأ أثناء حفظ العميل.');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا العميل نهائياً؟ ستفقد جميع البيانات المرتبطة به.')) {
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        await logActivity('حذف عميل', `تم حذف العميل بكود: ${clientId}`);
        if (selectedClient?.client_id === clientId) {
          setSelectedClient(null);
        }
      } catch (err) {
        console.error('Error deleting client:', err);
        alert('حدث خطأ أثناء الحذف.');
      }
    }
  };

  const openEditModal = (client: Client) => {
    setClientForm({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      passport_no: client.passport_no || '',
      initial_debt: client.total_debt.toString()
    });
    setEditingClientId(client.client_id);
    setIsAddingModalOpen(true);
  };

  const closeModal = () => {
    setIsAddingModalOpen(false);
    setEditingClientId(null);
    setClientForm({ name: '', phone: '', email: '', passport_no: '', initial_debt: '0' });
  };

  // تصفية القائمة بالبحث
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.client_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* الهيدر العلوي وشريط الإجراءات */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">
            {t.client_page_title}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {t.client_page_subtitle}
          </p>
        </div>

        <button 
          onClick={() => setIsAddingModalOpen(true)}
          className="bg-yazal-cyan hover:bg-yazal-cyan-dark text-yazal-navy font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-yazal-cyan/20 transition-all active:scale-95 uppercase tracking-widest text-xs self-start md:self-auto"
        >
          <UserPlus size={20} />
          {t.add_client}
        </button>
      </div>

      {/* شريط البحث وتصفية العملاء */}
      <div className="bg-white dark:bg-yazal-navy-light p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4 shadow-sm">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.client_search_placeholder}
          className="w-full bg-transparent outline-none text-sm text-yazal-navy dark:text-white placeholder:text-slate-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* قائمة شبكية بالعملاء */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-20 text-center">
            <div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">جاري تحميل سجل العملاء...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-yazal-navy-light p-16 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center">
            <Users size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">لا يوجد عملاء مسجلين</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">ابدأ بإضافة عميل جديد لربطه بالمعاملات والسجل المالي</p>
            <button 
              onClick={() => setIsAddingModalOpen(true)}
              className="mt-6 bg-yazal-navy text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-2"
            >
              <Plus size={16} />
              إضافة أول عميل
            </button>
          </div>
        ) : (
          filteredClients.map((client) => (
            <motion.div
              key={client.client_id}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedClient(client)}
              className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yazal-navy text-yazal-cyan font-black flex items-center justify-center text-lg shadow-md shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-black text-yazal-navy dark:text-white uppercase tracking-tight truncate group-hover:text-yazal-cyan transition-colors">
                      {client.name}
                    </h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">
                      {client.client_id}
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-yazal-navy-dark rounded-xl text-slate-400 group-hover:text-yazal-cyan transition-colors">
                  <ArrowUpRight size={18} />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-50 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <Phone size={14} className="text-yazal-cyan" />
                  <span dir="ltr">{client.phone}</span>
                </div>
                {client.passport_no && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <FileText size={14} className="text-yazal-cyan" />
                    <span>جواز: {client.passport_no}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 bg-slate-50 dark:bg-yazal-navy-dark/60 -mx-6 -mb-6 p-4 flex justify-between items-center rounded-b-3xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي الديون</span>
                <span className={`font-black text-sm ${client.total_debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {client.total_debt.toLocaleString()} YER
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* لوحة جانبة لسجل العميل (Client Profile Drawer) */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClient(null)}
              className="absolute inset-0 bg-yazal-navy/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white dark:bg-yazal-navy-light h-full shadow-2xl relative z-10 flex flex-col overflow-hidden"
            >
              {/* هيدر اللوحة */}
              <div className="p-8 bg-yazal-navy text-white relative">
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="absolute top-6 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedClient(null);
                      openEditModal(selectedClient);
                    }}
                    title="تعديل بيانات العميل"
                    className="p-2 bg-white/10 hover:bg-yazal-cyan hover:text-yazal-navy rounded-xl text-white transition-all"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(selectedClient.client_id)}
                    title="حذف العميل"
                    className="p-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl text-white transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-yazal-cyan text-yazal-navy font-black text-2xl flex items-center justify-center mb-4 shadow-lg">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{selectedClient.name}</h3>
                <span className="inline-block mt-1 bg-white/10 px-3 py-1 rounded-lg text-xs font-black text-yazal-cyan tracking-widest uppercase">
                  {selectedClient.client_id}
                </span>
              </div>

              {/* تفاصيل العميل والجدول الزمني */}
              <div className="p-8 flex-1 overflow-y-auto space-y-8">
                {/* معلومات التواصل */}
                <div className="space-y-4 bg-slate-50 dark:bg-yazal-navy-dark p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">بيانات العميل المعتمدة</h4>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <Phone size={16} className="text-yazal-cyan" />
                    <span dir="ltr">{selectedClient.phone}</span>
                  </div>
                  {selectedClient.email && (
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                      <Mail size={16} className="text-yazal-cyan" />
                      <span>{selectedClient.email}</span>
                    </div>
                  )}
                  {selectedClient.passport_no && (
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                      <FileText size={16} className="text-yazal-cyan" />
                      <span>رقم الجواز: {selectedClient.passport_no}</span>
                    </div>
                  )}
                </div>

                {/* سجل الديون المعلقة */}
                <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">الديون المرتبطة بالطلبات المدينة</span>
                      <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                        {clientDebtFromOrders.toLocaleString()} YER
                      </span>
                      {selectedClient.total_debt !== clientDebtFromOrders && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {`المبلغ المخزن في ملف العميل: ${Number(selectedClient.total_debt || 0).toLocaleString()} YER`}
                        </p>
                      )}
                    </div>
                    <DollarSign size={32} className="text-rose-400 opacity-50" />
                  </div>
                  <a 
                    href={`/debt-payment/${selectedClient.client_id}`}
                    className="w-full p-4 bg-rose-500 text-white rounded-xl text-center font-black text-sm hover:bg-rose-600 transition-colors"
                  >
                    سداد الديون
                  </a>
                </div>

                {/* السجل الزمني للمعاملات */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-yazal-navy dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <History size={16} className="text-yazal-cyan" />
                    السجل الزمني للمعاملات ({clientTasks.length})
                  </h4>

                  {clientTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-6">لا توجد معاملات مسجلة بهذا العميل بعد</p>
                  ) : (
                    <div className="space-y-3">
                      {clientTasks.map(t => (
                        <div key={t.task_id} className="p-4 bg-slate-50 dark:bg-yazal-navy-dark rounded-xl border border-slate-100 dark:border-white/5 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-xs block text-yazal-navy dark:text-white uppercase">{t.service_id}</span>
                            <span className="text-[10px] text-slate-400 font-bold">الحالة: {t.status}</span>
                          </div>
                          <span className="font-black text-xs text-yazal-cyan">
                            {t.total_price.toLocaleString()} {t.original_currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* مودال تسجيل عميل جديد */}
      <AnimatePresence>
        {isAddingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingModalOpen(false)}
              className="absolute inset-0 bg-yazal-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-yazal-navy-light w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yazal-cyan/10 text-yazal-cyan rounded-2xl flex items-center justify-center">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">{editingClientId ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">إدخال البيانات برقم هاتف موثق</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              {/* زر جلب جهات الاتصال */}
              <button 
                type="button"
                onClick={handleImportContact}
                className="w-full py-3 px-4 bg-yazal-cyan/10 hover:bg-yazal-cyan/20 text-yazal-cyan font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-yazal-cyan/20"
              >
                <Contact size={18} />
                استيراد تلقائي من جهات الاتصال بالهاتف
              </button>

              <form onSubmit={handleSaveClient} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">الاسم الكامل للعميل *</label>
                  <input 
                    type="text"
                    required
                    autoComplete="name"
                    title="الاسم الكامل للعميل"
                    placeholder="مثال: سالم باوزير"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">رقم الهاتف *</label>
                    <input 
                      type="tel"
                      required
                      autoComplete="tel"
                      title="رقم هاتف العميل"
                      placeholder="770000000"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">رقم جواز السفر</label>
                    <input 
                      type="text"
                      autoComplete="off"
                      title="رقم جواز السفر للعميل"
                      placeholder="01234567"
                      value={clientForm.passport_no}
                      onChange={(e) => setClientForm({ ...clientForm, passport_no: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">البريد الإلكتروني (اختياري)</label>
                  <input 
                    type="email"
                    autoComplete="email"
                    title="البريد الإلكتروني"
                    placeholder="client@example.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">مبلغ الدين الابتدائي (YER)</label>
                  <input 
                    type="number"
                    step="any"
                    min="0"
                    title="الرصيد الافتتاحي أو دين سابق"
                    value={clientForm.initial_debt}
                    onChange={(e) => setClientForm({ ...clientForm, initial_debt: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
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
                    className="flex-1 py-4 bg-yazal-navy text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-yazal-navy-light"
                  >
                    {editingClientId ? 'حفظ التعديلات' : 'تأكيد التسجيل'}
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

export default Clients;
