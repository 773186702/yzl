import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Settings } from 'lucide-react';

const Currencies: React.FC = () => {
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '' });

  useEffect(() => {
    const fetchCurrencies = async () => {
      const snap = await getDocs(collection(db, 'currencies'));
      setCurrencies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCurrencies();
  }, []);

  const addCurrency = async () => {
    if (!newCurrency.code || !newCurrency.name) return;
    await addDoc(collection(db, 'currencies'), { ...newCurrency, rate: 1 }); // Default rate 1
    setNewCurrency({ code: '', name: '' });
    // Refresh
    const snap = await getDocs(collection(db, 'currencies'));
    setCurrencies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };
  
  const fetchRate = async (code: string) => {
    // Basic implementation using public API (no key required for this one)
    try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
        const data = await response.json();
        const rate = data.rates[code] || 1;
        alert(`سعر الصرف لـ ${code} مقابل الدولار هو ${rate}`);
    } catch (e) {
        alert('تعذر جلب سعر الصرف');
    }
  };

  const deleteCurrency = async (id: string) => {
    await deleteDoc(doc(db, 'currencies', id));
    setCurrencies(currencies.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-black text-yazal-navy dark:text-white">إدارة العملات</h2>
      <div className="flex flex-wrap gap-4 p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5">
        <input placeholder="كود (مثال: YER)" value={newCurrency.code} onChange={(e) => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})} className="p-4 border rounded-2xl flex-1 outline-none focus:ring-2 ring-emerald-500" />
        <input placeholder="الاسم (مثال: ريال يمني)" value={newCurrency.name} onChange={(e) => setNewCurrency({...newCurrency, name: e.target.value})} className="p-4 border rounded-2xl flex-1 outline-none focus:ring-2 ring-emerald-500" />
        <button onClick={addCurrency} className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center gap-2 font-black hover:bg-emerald-600 transition-colors">
            <Plus size={20} /> إضافة عملة
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currencies.map(c => (
            <div key={c.id} className="p-6 border rounded-3xl flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm">
                <div>
                    <h3 className="font-black text-lg">{c.name}</h3>
                    <p className="text-sm font-bold text-slate-500">{c.code}</p>
                </div>
                <div className='flex gap-2'>
                    <button onClick={() => fetchRate(c.code)} className="text-emerald-500 font-bold text-xs p-2 bg-emerald-50 rounded-lg">جلب السعر</button>
                    <button onClick={() => deleteCurrency(c.id)} className="text-rose-500"><Trash2 size={20} /></button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Currencies;
