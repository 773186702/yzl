import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Search } from 'lucide-react';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';

/**
 * قائمة العملات المعروفة عالمياً للبحث الذكي
 */
const KNOWN_CURRENCIES: { code: string; name: string }[] = [
  { code: 'YER', name: 'ريال يمني' },
  { code: 'SAR', name: 'ريال سعودي' },
  { code: 'USD', name: 'دولار أمريكي' },
  { code: 'EGP', name: 'جنيه مصري' },
  { code: 'AED', name: 'درهم إماراتي' },
  { code: 'EUR', name: 'يورو' },
  { code: 'GBP', name: 'جنيه إسترليني' },
  { code: 'KWD', name: 'دينار كويتي' },
  { code: 'QAR', name: 'ريال قطري' },
  { code: 'OMR', name: 'ريال عماني' },
  { code: 'BHD', name: 'دينار بحريني' },
  { code: 'JOD', name: 'دينار أردني' },
  { code: 'TRY', name: 'ليرة تركية' },
  { code: 'INR', name: 'روبية هندية' },
  { code: 'CNY', name: 'يوان صيني' },
];

const currencyOptions: SelectOption[] = KNOWN_CURRENCIES.map(c => ({
  value: c.code,
  label: `${c.name} (${c.code})`,
  sublabel: c.code
}));

const Currencies: React.FC = () => {
  const { hasPermission } = useAuth();

  // التحقق من صلاحية إدارة العملات
  if (!hasPermission('manage_currencies')) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12 p-6">
        <div className="bg-yazal-navy p-12 rounded-[2.5rem] text-center space-y-6">
          <ShieldAlert size={64} className="mx-auto text-yazal-cyan" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">لا تملك صلاحية إدارة العملات</h2>
          <p className="text-white/60 font-bold text-sm">قم بمراجعة مدير النظام لتفعيل صلاحية "إدارة العملات" لحسابك</p>
        </div>
      </div>
    );
  }

  const [currencies, setCurrencies] = useState<any[]>([]);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '' });

  useEffect(() => {
    const fetchCurrencies = async () => {
      const snap = await getDocs(collection(db, 'currencies'));
      setCurrencies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCurrencies();
  }, []);

  /** عند اختيار عملة من القائمة، يتم تعبئة الكود والاسم تلقائياً */
  const handleCurrencySelect = (value: string) => {
    const found = KNOWN_CURRENCIES.find(c => c.code === value);
    if (found) {
      setNewCurrency({ code: found.code, name: found.name });
    }
  };

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

  /** التحقق مما إذا كانت العملة موجودة مسبقاً في القائمة */
  const isCurrencyAlreadyAdded = (code: string) => currencies.some(c => c.code === code);

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-black text-yazal-navy dark:text-white">إدارة العملات</h2>
      
      {/* حقل البحث الذكي عن العملة */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 space-y-4">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
          ابحث عن عملة وأضفها
        </label>
        
        <SearchableSelect
          options={currencyOptions.filter(o => !isCurrencyAlreadyAdded(o.value))}
          value=""
          onChange={handleCurrencySelect}
          placeholder="ابحث باسم العملة (مثال: ريال يمني، دولار أمريكي)..."
          title="اختر العملة من القائمة وسيتم إدخال الكود تلقائياً"
        />

        <div className="flex flex-wrap gap-4 pt-2">
          <input 
            placeholder="كود (مثال: YER)" 
            value={newCurrency.code} 
            onChange={(e) => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})} 
            className="p-4 border rounded-2xl flex-1 outline-none focus:ring-2 ring-emerald-500 font-bold text-sm min-w-[120px]" 
            readOnly={!!newCurrency.code && KNOWN_CURRENCIES.some(c => c.code === newCurrency.code)}
            dir="ltr"
          />
          <input 
            placeholder="الاسم (مثال: ريال يمني)" 
            value={newCurrency.name} 
            onChange={(e) => setNewCurrency({...newCurrency, name: e.target.value})} 
            className="p-4 border rounded-2xl flex-[2] outline-none focus:ring-2 ring-emerald-500 font-bold text-sm" 
            readOnly={!!newCurrency.name && KNOWN_CURRENCIES.some(c => c.name === newCurrency.name)}
          />
          <button 
            onClick={addCurrency} 
            disabled={!newCurrency.code || !newCurrency.name || isCurrencyAlreadyAdded(newCurrency.code)}
            className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center gap-2 font-black hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} /> إضافة عملة
          </button>
        </div>
        {newCurrency.code && isCurrencyAlreadyAdded(newCurrency.code) && (
          <p className="text-xs font-bold text-amber-500">هذه العملة موجودة مسبقاً في القائمة</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currencies.map(c => (
            <div key={c.id} className="p-6 border rounded-3xl flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm">
                <div>
                    <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">{c.name}</h3>
                    <p className="text-sm font-bold text-slate-500">{c.code}</p>
                </div>
                <div className='flex gap-2'>
                    <button onClick={() => fetchRate(c.code)} className="text-emerald-500 font-bold text-xs p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">جلب السعر</button>
                    <button onClick={() => deleteCurrency(c.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-xl"><Trash2 size={20} /></button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Currencies;
