/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Shield, 
  UserCheck, 
  Lock, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  Plus, 
  Contact,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { Client, FixedService, PaymentGateway, Task } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';
import { PassportScannerModal } from '../components/PassportScannerModal';
import { playTaskAlertSound } from '../lib/sound';
import { logActivity } from '../lib/audit';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { ShieldAlert } from 'lucide-react';

/**
 * صفحة إنشاء مهمة ومعاملة جديدة لنظام "يزل"
 * - التحقق الإجباري من ربط كود العميل (Yazal Client ID)
 * - القفل الآلي لأسعار الخدمات الثابتة لمنع التلاعب
 * - حساب المبلغ المتبقي آلياً (Remaining = Total - Paid)
 * - الماسح الضوئي لكاميرا الويب لتصوير جوازات السفر والمستندات
 */
const CreateTask: React.FC = () => {
  const { profile, hasPermission } = useAuth();
  const { language } = useApp();

  // التحقق من صلاحية إنشاء مهمة
  if (!hasPermission('edit_task')) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
        <div className="bg-yazal-navy p-12 rounded-[2.5rem] text-center space-y-6">
          <ShieldAlert size={64} className="mx-auto text-yazal-cyan" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">لا تملك صلاحية إنشاء معاملات جديدة</h2>
          <p className="text-white/60 font-bold text-sm">قم بمراجعة مدير النظام لتفعيل صلاحية "تعديل المهام" لحسابك</p>
        </div>
      </div>
    );
  }

  // خطوات إنشاء المهمة (1: البيانات والتكلفة، 2: تصوير الجواز، 3: التأكيد)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // قوائم البيانات من Firestore
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [servicesList, setServicesList] = useState<FixedService[]>([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState<any[]>([]);
  const [currenciesList, setCurrenciesList] = useState<any[]>([]);

  // نموذج المعاملة
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [servicePrice, setServicePrice] = useState<number | string>(0);
  const [currency, setCurrency] = useState('USD');
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [deadline, setDeadline] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isPassportScannerOpen, setIsPassportScannerOpen] = useState(false);

  // الكاميرا والمستند المرفوع
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // جلب سجل العملاء والخدمات وطرق الدفع والعملات من Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // جلب العملاء
        const clientsSnap = await getDocs(collection(db, 'clients'));
        const list: Client[] = [];
        clientsSnap.forEach(d => list.push(d.data() as Client));
        setClientsList(list);
        if (list.length > 0) {
          setSelectedClientId(list[0].client_id);
        }

        // جلب الخدمات من Firestore
        const servicesSnap = await getDocs(collection(db, 'services'));
        if (!servicesSnap.empty) {
          const servicesData: FixedService[] = [];
          servicesSnap.forEach(d => {
            const data = d.data() as FixedService;
            servicesData.push({ ...data, service_id: data.service_id || d.id });
          });
          setServicesList(servicesData);
        }

        // جلب طرق الدفع من Firestore
        const paymentMethodsSnap = await getDocs(collection(db, 'payment_methods'));
        if (!paymentMethodsSnap.empty) {
          const methodsData: any[] = [];
          paymentMethodsSnap.forEach(d => {
            methodsData.push({ id: d.id, ...d.data() });
          });
          setPaymentMethodsList(methodsData);
          if (methodsData.length > 0) {
            setPaymentMethod(methodsData[0].name);
          }
        }

        // جلب العملات من Firestore
        const currenciesSnap = await getDocs(collection(db, 'currencies'));
        if (!currenciesSnap.empty) {
          const currenciesData: any[] = [];
          currenciesSnap.forEach(d => {
            currenciesData.push({ id: d.id, ...d.data() });
          });
          setCurrenciesList(currenciesData);
          if (currenciesData.length > 0) {
            setCurrency(currenciesData[0].code);
          }
        }
      } catch (err) {
        console.warn('Fetch data error:', err);
      }
    };
    fetchData();
  }, []);

  // عند اختيار خدمة، يتم قفل السعر آلياً بناء على الكتالوج
  const handleServiceSelect = (srvId: string) => {
    setSelectedServiceId(srvId);
    const found = servicesList.find(s => s.service_id === srvId);
    if (found) {
      setServicePrice(found.base_price);
      setCurrency(found.default_currency);
    }
  };

  // حساب المبلغ المتبقي تلقائياً
  const numPrice = typeof servicePrice === 'number' ? servicePrice : (parseFloat(servicePrice) || 0);
  const numPaid = typeof paidAmount === 'number' ? paidAmount : (parseFloat(paidAmount) || 0);
  const remainingAmount = Math.max(0, numPrice - numPaid);

  const handlePassportCapture = (data: {
    passportNumber: string;
    fullName: string;
    nationality: string;
    compressedImageDataUrl: string;
  }) => {
    setPassportNumber(data.passportNumber);
    setCapturedImage(data.compressedImageDataUrl);
  };

  /**
   * حفظ المعاملة النهائية في Firestore
   */
  const handleFinalizeTask = async () => {
    if (!selectedClientId) {
      setError('يجب اختيار عميل مسجل ربطاً بكود CUS-XXXX.');
      return;
    }
    if (!selectedServiceId) {
      setError('يرجى اختيار خدمة معتمدة من الكتالوج.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedClientObj = clientsList.find(c => c.client_id === selectedClientId);
      const selectedServiceObj = servicesList.find(s => s.service_id === selectedServiceId);

      const taskId = `YZL-${Math.floor(100000 + Math.random() * 900000)}`;

      let attachmentUrl = '';
      if (capturedImage && capturedImage.startsWith('data:image')) {
        try {
          const res = await fetch(capturedImage);
          const blob = await res.blob();
          const storageRef = ref(storage, `documents/${taskId}_passport.jpg`);
          await uploadBytes(storageRef, blob);
          attachmentUrl = await getDownloadURL(storageRef);
        } catch (e) {
          console.warn('Storage upload skipped/failed:', e);
        }
      }

      const newTask: Task = {
        task_id: taskId,
        client_id: selectedClientId,
        client_name: selectedClientObj?.name || 'عميل مسجل',
        service_id: selectedServiceId,
        service_name: selectedServiceObj?.service_name_ar || 'خدمة سفر',
        created_by: profile?.username || 'الموظف الحالي',
        created_by_employee_name: profile?.username || 'الموظف الحالي',
        assigned_to: profile?.username || 'الموظف المنفذ',
        status: 'pending_approval',
        original_currency: currency as any,
        total_price: numPrice,
        paid_amount: numPaid,
        remaining_amount: remainingAmount,
        payment_method: paymentMethod,
        transaction_ref: transactionRef || '',
        attachment_url: attachmentUrl,
        passport_number: passportNumber,
        priority: priority,
        created_at: new Date(),
        deadline: deadline ? new Date(deadline) : null
      };

      await setDoc(doc(db, 'tasks', taskId), newTask);
      await updateDoc(doc(db, 'clients', selectedClientId), {
        total_debt: increment(remainingAmount)
      });
      await logActivity('إنشاء مهمة', `تم تسجيل المعاملة (${taskId}) للعميل (${selectedClientObj?.name}) بقيمة ${servicePrice} ${currency}`);

      // تشغيل التنبيه الصوتي
      playTaskAlertSound();
      setStep(3);
    } catch (err: any) {
      console.error('Error saving task:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ المعاملة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* الهيدر العلوي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">إضافة معاملة جديدة</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">YZL Workflow System • Locked Pricing & Verification</p>
        </div>
      </div>

      {/* شريط التقدم بين الخطوات */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-yazal-cyan' : 'bg-slate-100 dark:bg-white/5'}`} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <div className="w-8 h-8 bg-yazal-cyan/10 rounded-xl flex items-center justify-center text-yazal-cyan font-black">1</div>
                    ربط العميل والخدمة المعتمدة
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ربط إجباري بكود YZL Client ID وسعر محدد آلياً</p>
                </div>

                  {/* اختيار العميل */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <UserCheck size={14} className="text-yazal-cyan" />
                        العميل المسجل (CUS ID) *
                      </label>
                      <a href="/clients" className="text-[10px] font-black text-yazal-cyan hover:underline uppercase flex items-center gap-1">
                        <Plus size={12} /> تسجيل عميل جديد
                      </a>
                    </div>

                    {clientsList.length === 0 ? (
                      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl text-xs font-bold flex items-center justify-between">
                        <span>لا يوجد عملاء مسجلين حالياً. يرجى إضافة عميل أولاً.</span>
                        <a href="/clients" className="px-3 py-1 bg-amber-500 text-white rounded-lg">إضافة</a>
                      </div>
                    ) : (
                      <SearchableSelect
                        options={clientsList.map(c => ({
                          value: c.client_id,
                          label: `${c.name} (${c.client_id})`,
                          sublabel: c.phone
                        }))}
                        value={selectedClientId}
                        onChange={setSelectedClientId}
                        placeholder="ابحث عن عميل بالاسم أو المعرف..."
                        title="استخدم البحث السريع لإيجاد العميل"
                      />
                    )}
                  </div>

                  {/* اختيار الخدمة الثابتة والقفل */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                      <Lock size={14} className="text-yazal-cyan" />
                      الخدمة الثابتة والسعر القفلي المعتمد *
                    </label>
                    <SearchableSelect
                      options={servicesList.map(s => ({
                        value: s.service_id,
                        label: s.service_name_ar,
                        sublabel: `السعر: ${s.base_price} ${s.default_currency}`
                      }))}
                      value={selectedServiceId}
                      onChange={handleServiceSelect}
                      placeholder="ابحث عن الخدمة المطلوبة..."
                      title="ابحث عن الخدمة واختمها بالسعر المعتمد"
                    />
                  </div>

                  {/* تفاصيل السعر والمدفوع */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">السعر الإجمالي المعتمد</label>
                      <div className="relative" title="يمكنك تعديل السعر إذا تطلب الأمر بناءً على متغيرات الخدمة">
                        <input 
                          type="number"
                          step="any"
                          min="0"
                          autoComplete="off"
                          title="السعر الإجمالي للخدمة"
                          value={servicePrice}
                          onChange={(e) => setServicePrice(e.target.value)}
                          className="w-full p-4 pl-14 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-black text-sm text-yazal-navy dark:text-white outline-none focus:border-yazal-cyan focus:ring-1 ring-yazal-cyan transition-all"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-yazal-cyan">{currency}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">المبلغ المدفوع (مقدم/عربون)</label>
                      <div className="relative" title="أدخل المبلغ المدفوع من قبل العميل">
                        <input 
                          type="number"
                          step="any"
                          min="0"
                          autoComplete="off"
                          title="المبلغ المدفوع"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-black text-sm outline-none focus:border-yazal-cyan focus:ring-1 ring-yazal-cyan transition-all"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* المتبقي المحسوب آلياً */}
                  <div className="p-4 bg-slate-50 dark:bg-yazal-navy-dark rounded-2xl border border-slate-100 dark:border-white/5 flex justify-between items-center" title="يتم حساب هذا المبلغ تلقائياً (إجمالي السعر - المدفوع)">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">المبلغ المتبقي المعلق</span>
                    <span className={`text-lg font-black ${remainingAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {remainingAmount.toLocaleString()} {currency}
                    </span>
                  </div>

                  {/* طريقة الدفع والعملة */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">طريقة ودليل الحساب الخصمي</label>
                      <SearchableSelect
                        options={paymentMethodsList.length > 0 ? paymentMethodsList.map(g => ({
                          value: g.name || g.name_ar,
                          label: g.name || g.name_ar,
                          sublabel: g.type === 'cash' ? 'نقد' : g.type === 'bank' ? 'بنكي' : 'إلكتروني'
                        })) : []}
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        placeholder={paymentMethodsList.length === 0 ? 'لا توجد طرق دفع، أضف من الإدارة أولاً' : 'اختر طريقة الدفع أو الحساب الوجهة...'}
                        title="اختر الطريقة التي تم الدفع بها"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">عملة الدفع</label>
                      <SearchableSelect
                        options={currenciesList.length > 0 ? currenciesList.map(c => ({
                          value: c.code,
                          label: `${c.name} (${c.code})`,
                          sublabel: c.code
                        })) : []}
                        value={currency}
                        onChange={setCurrency}
                        placeholder={currenciesList.length === 0 ? 'لا توجد عملات، أضف من إدارة العملات أولاً' : 'اختر العملة...'}
                        title="اختر عملة الدفع"
                      />
                    </div>
                  </div>

                  {/* أولوية المهمة */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">أولوية المعاملة</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-black text-sm text-yazal-navy dark:text-white outline-none focus:border-yazal-cyan focus:ring-1 ring-yazal-cyan transition-all"
                    >
                      <option value="low">منخفضة</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                    </select>
                  </div>

                <button 
                  onClick={() => {
                    if (!selectedClientId || !selectedServiceId) {
                      setError('يرجى تحديد العميل والخدمة قبل الاستمرار.');
                      return;
                    }
                    setError(null);
                    setStep(2);
                  }}
                  className="w-full bg-yazal-navy hover:bg-yazal-navy-light text-white font-black py-4 rounded-2xl shadow-xl shadow-yazal-navy/20 uppercase tracking-widest text-xs transition-all active:scale-[0.98]"
                >
                  الاستمرار إلى مرحلة رفع وتصوير الوثائق
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
                      <div className="w-8 h-8 bg-yazal-cyan/10 rounded-xl flex items-center justify-center text-yazal-cyan font-black">2</div>
                      ماسح الكاميرا والوثائق
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">تصوير جواز السفر أو رفع ملف الصورة المعتمد</p>
                  </div>
                  {capturedImage && (
                    <button 
                      onClick={() => setIsPassportScannerOpen(true)}
                      className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500 hover:text-yazal-cyan transition-colors"
                      title="إعادة الفحص"
                    >
                      <RefreshCw size={20} />
                    </button>
                  )}
                </div>

                {/* نافذة عرض الكاميرا أو المستند */}
                <div className="relative aspect-[4/3] bg-slate-900 rounded-[2rem] overflow-hidden border-4 border-slate-200 dark:border-white/5 group shadow-inner">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured Passport" className="w-full h-full object-contain" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-6 bg-slate-50 dark:bg-yazal-navy-dark">
                      <div className="w-20 h-20 bg-yazal-cyan/10 rounded-full flex items-center justify-center text-yazal-cyan">
                        <Camera size={40} />
                      </div>
                      <button 
                        onClick={() => setIsPassportScannerOpen(true)}
                        className="bg-yazal-cyan text-yazal-navy font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:brightness-110 transition-all active:scale-95"
                      >
                        مسح الجواز أو رفع صورة
                      </button>
                    </div>
                  )}
                </div>

                {passportNumber && (
                  <div className="p-4 bg-slate-50 dark:bg-yazal-navy-dark rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-xs font-bold text-slate-400">رقم الجواز المستخرج:</p>
                    <p className="font-black text-yazal-navy dark:text-white">{passportNumber}</p>
                  </div>
                )}

                <PassportScannerModal
                  isOpen={isPassportScannerOpen}
                  onClose={() => setIsPassportScannerOpen(false)}
                  onCapture={handlePassportCapture}
                />

                {error && (
                  <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-3">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-500 font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                  >
                    السابق
                  </button>
                  <button 
                    onClick={handleFinalizeTask}
                    disabled={loading}
                    className="flex-[2] bg-yazal-cyan text-yazal-navy font-black py-4 rounded-2xl shadow-xl shadow-yazal-cyan/20 uppercase tracking-widest text-xs hover:bg-yazal-cyan-dark transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-yazal-navy/30 border-t-yazal-navy rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload size={18} />
                        تأكيد وحفظ المعاملة
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-yazal-navy-light p-12 rounded-[3rem] shadow-sm border border-slate-100 dark:border-white/5 text-center space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl">
                  <Check size={40} strokeWidth={3} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">تم تسجيل المعاملة بنجاح</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">تم تفعيل التنبيه الصوتي وحفظ البيانات في السجل المالي</p>
                </div>
                <div className="pt-4 flex justify-center gap-4">
                  <a 
                    href="/tasks"
                    className="bg-yazal-navy text-white font-black px-8 py-4 rounded-2xl shadow-xl uppercase tracking-widest text-xs hover:bg-yazal-navy-light transition-all"
                  >
                    الانتقال لسجل المهام
                  </a>
                  <button 
                    onClick={() => {
                      setStep(1);
                      setCapturedImage(null);
                      setPaidAmount(0);
                    }}
                    className="bg-slate-100 dark:bg-white/5 text-slate-500 font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                  >
                    إضافة معاملة أخرى
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* كارت المعلومات الجانبي */}
        <div className="space-y-6">
          <div className="bg-yazal-navy text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yazal-cyan/10 rounded-full blur-xl" />
            <Shield size={28} className="text-yazal-cyan mb-3" />
            <h3 className="font-black uppercase tracking-tight text-sm">ضوابط إدخال المعاملات</h3>
            <ul className="mt-3 space-y-2.5">
              <li className="flex items-start gap-2 text-[10px] font-bold text-white/70 uppercase">
                <Check size={14} className="text-yazal-cyan shrink-0" />
                ربط العميل إجباري لمنع المعاملات السائبة
              </li>
              <li className="flex items-start gap-2 text-[10px] font-bold text-white/70 uppercase">
                <Check size={14} className="text-yazal-cyan shrink-0" />
                سعر الخدمة موحد وثابت حسب الكتالوج
              </li>
              <li className="flex items-start gap-2 text-[10px] font-bold text-white/70 uppercase">
                <Check size={14} className="text-yazal-cyan shrink-0" />
                المتبقي يحسب آلياً ويسجل كدين على العميل
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTask;
