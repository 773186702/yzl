import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PaymentMethods: React.FC = () => {
  const { hasPermission } = useAuth();

  // التحقق من صلاحية إدارة طرق الدفع
  if (!hasPermission('manage_payment_methods')) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12 p-6">
        <div className="bg-yazal-navy p-12 rounded-[2.5rem] text-center space-y-6">
          <ShieldAlert size={64} className="mx-auto text-yazal-cyan" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">لا تملك صلاحية إدارة طرق الدفع</h2>
          <p className="text-white/60 font-bold text-sm">قم بمراجعة مدير النظام لتفعيل صلاحية "إدارة طرق الدفع" لحسابك</p>
        </div>
      </div>
    );
  }
  const [methods, setMethods] = useState<any[]>([]);
  const [newMethod, setNewMethod] = useState({ name: '', type: 'cash' });

  useEffect(() => {
    const fetchMethods = async () => {
      const snap = await getDocs(collection(db, 'payment_methods'));
      setMethods(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMethods();
  }, []);

  const addMethod = async () => {
    if (!newMethod.name) return;
    await addDoc(collection(db, 'payment_methods'), newMethod);
    setNewMethod({ name: '', type: 'cash' });
    const snap = await getDocs(collection(db, 'payment_methods'));
    setMethods(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const deleteMethod = async (id: string) => {
    await deleteDoc(doc(db, 'payment_methods', id));
    setMethods(methods.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-black text-yazal-navy dark:text-white">إدارة طرق الدفع</h2>
      <div className="flex flex-wrap gap-4 p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5">
        <input placeholder="الاسم (مثال: بنك اليمن)" value={newMethod.name} onChange={(e) => setNewMethod({...newMethod, name: e.target.value})} className="p-4 border rounded-2xl flex-1 outline-none focus:ring-2 ring-emerald-500 font-bold" />
        <select value={newMethod.type} onChange={(e) => setNewMethod({...newMethod, type: e.target.value})} className="p-4 border rounded-2xl outline-none focus:ring-2 ring-emerald-500 font-bold">
            <option value="cash">كاش</option>
            <option value="bank">بنكي</option>
            <option value="wallet">محفظة</option>
        </select>
        <button onClick={addMethod} className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center gap-2 font-black hover:bg-emerald-600 transition-colors">
            <Plus size={20} /> إضافة طريقة
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {methods.map(c => (
            <div key={c.id} className="p-6 border rounded-3xl flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm">
                <div>
                    <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">{c.name}</h3>
                    <p className="text-sm font-bold text-slate-500 mt-1 capitalize">{c.type}</p>
                </div>
                <button onClick={() => deleteMethod(c.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-xl"><Trash2 size={20} /></button>
            </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethods;
