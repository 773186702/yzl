import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client, Task } from '../types';
import { ArrowLeft, CreditCard, DollarSign } from 'lucide-react';

const DebtPayment: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

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
    if (!paymentAmount || Number(paymentAmount) <= 0) return alert('أدخل مبلغ صحيح');
    if (!paymentMethod) return alert('اختر طريقة الدفع');
    
    // Logic to update task and client debt
    // For simplicity, applying to the first task
    if (tasks.length === 0) return alert('لا توجد ديون');
    
    const task = tasks[0];
    const amount = Number(paymentAmount);
    
    try {
      await updateDoc(doc(db, 'tasks', task.task_id), {
        paid_amount: increment(amount),
        remaining_amount: increment(-amount)
      });
      await updateDoc(doc(db, 'clients', clientId!), {
        total_debt: increment(-amount)
      });
      alert('تم السداد بنجاح');
      navigate('/clients');
    } catch (err) {
      alert('حدث خطأ');
    }
  };

  if (loading) return <div>تحميل...</div>;
  if (!client) return <div>العميل غير موجود</div>;

  return (
    <div className="space-y-6 p-6">
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
              value={paymentAmount} 
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-lg outline-none focus:ring-2 ring-yazal-cyan"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">طريقة الدفع</label>
            <select 
              value={paymentMethod} 
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-lg outline-none focus:ring-2 ring-yazal-cyan"
            >
              <option value="">اختر طريقة الدفع</option>
              {paymentMethods.map(pm => (
                <option key={pm.id} value={pm.name}>{pm.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button onClick={handlePay} className="w-full p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl mt-4 font-black text-lg transition-colors">حفظ عملية السداد</button>
      </div>
    </div>
  );
};

export default DebtPayment;
