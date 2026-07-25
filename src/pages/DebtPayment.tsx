import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client, Task } from '../types';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SearchableSelect } from '../components/SearchableSelect';

const DebtPayment: React.FC = () => {
  const { profile } = useAuth();
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) return;
      try {
        const clientSnap = await getDoc(doc(db, 'clients', clientId));
        if (clientSnap.exists()) setClient({ client_id: clientSnap.id, ...clientSnap.data() } as Client);
        
        const tasksQuery = query(collection(db, 'tasks'), where('client_id', '==', clientId), where('remaining_amount', '>', 0));
        const tasksSnap = await getDocs(tasksQuery);
        setTasks(tasksSnap.docs.map(doc => ({ task_id: doc.id, ...doc.data() } as Task)));
        
        const pmSnap = await getDocs(collection(db, 'payment_methods'));
        setPaymentMethods(pmSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  const handlePay = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setSuccessMessage(null);
      return alert('أدخل مبلغ صحيح');
    }
    if (!paymentMethod) {
      setSuccessMessage(null);
      return alert('اختر طريقة الدفع');
    }
    
    if (tasks.length === 0) return alert('لا توجد ديون للعميل.');

    const amount = Number(paymentAmount);
    const remainingDebt = tasks.reduce((sum, task) => sum + Math.max(0, task.remaining_amount || 0), 0);
    if (amount > remainingDebt) {
      return alert(`المبلغ أكبر من إجمالي الدين المتبقي: ${remainingDebt.toLocaleString()} ${tasks[0]?.original_currency || 'YER'}`);
    }

    const currency = tasks[0]?.original_currency || 'YER';
    const confirmPayment = window.confirm(`هل تريد تأكيد سداد ${amount.toLocaleString()} ${currency} للعميل؟`);
    if (!confirmPayment) return;

    const sortedTasks = [...tasks].sort((a, b) => (a.remaining_amount || 0) - (b.remaining_amount || 0));
    let remainingPayment = amount;
    try {
      for (const task of sortedTasks) {
        if (remainingPayment <= 0) break;
        const taskRemaining = Math.max(0, task.remaining_amount || 0);
        if (taskRemaining <= 0) continue;

        const paymentForTask = Math.min(taskRemaining, remainingPayment);
        await updateDoc(doc(db, 'tasks', task.task_id), {
          paid_amount: increment(paymentForTask),
          remaining_amount: increment(-paymentForTask),
          payment_method: paymentMethod,
          last_payment_at: new Date(),
          updated_by_employee: profile?.username || 'unknown'
        });
        remainingPayment -= paymentForTask;
      }

      await updateDoc(doc(db, 'clients', clientId!), {
        total_debt: increment(-amount)
      });

      setSuccessMessage('تم تسجيل السداد بنجاح.');
      setPaymentAmount('');
      setPaymentMethod('');
      navigate('/clients');
    } catch (err) {
      console.error('Debt payment failed:', err);
      alert('حدث خطأ أثناء إجراء السداد.');
    }
  };

  if (loading) return <div>تحميل...</div>;
  if (!client) return <div>العميل غير موجود</div>;

  return (
    <div className="space-y-6 p-6">
      {successMessage && (
        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-700 font-black">
          {successMessage}
        </div>
      )}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700">
        <ArrowLeft size={20} /> عودة
      </button>
      <h2 className="text-3xl font-black text-yazal-navy dark:text-white">سداد دين العميل: {client.name}</h2>
      
      <div className="p-8 bg-white dark:bg-yazal-navy-dark rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
        <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30">
          <p className="text-sm font-bold text-rose-500 uppercase tracking-widest">إجمالي الدين المستحق</p>
          <p className="text-4xl font-black text-rose-600 dark:text-rose-400 mt-2">{client.total_debt.toLocaleString()} YER</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">المبلغ المراد سداده</label>
            <input 
              type="number" 
              inputMode="decimal"
              value={paymentAmount} 
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              title="أدخل المبلغ الرقمي المراد سداده"
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-lg outline-none focus:ring-2 ring-yazal-cyan"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">طريقة الدفع</label>
            <SearchableSelect
              options={paymentMethods.map(pm => ({ value: pm.name, label: pm.name, sublabel: pm.type || '' }))}
              value={paymentMethod}
              onChange={setPaymentMethod}
              placeholder="اختر طريقة الدفع"
              title="ابحث واختر طريقة الدفع المفضلة"
              allowCustom
            />
          </div>
        </div>
        
        <button onClick={handlePay} className="w-full p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl mt-4 font-black text-lg transition-colors">حفظ عملية السداد</button>
      </div>
    </div>
  );
};

export default DebtPayment;
