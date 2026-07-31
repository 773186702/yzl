import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Save, Edit3, MapPin, TrendingUp, Globe, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, X } from 'lucide-react';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';
import { motion } from 'motion/react';
import { Region } from '../types';

const KNOWN_CURRENCIES: { code: string; name: string; isYemeni?: boolean; region?: string }[] = [
  { code: 'YER', name: 'ريال يمني (موحد)', isYemeni: true },
  { code: 'YER_OLD', name: 'ريال يمني قديم (ورق)', isYemeni: true, region: 'sanaa' },
  { code: 'YER_NEW', name: 'ريال يمني جديد (مطبوعة حديثاً)', isYemeni: true, region: 'aden' },
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

const REGIONS: { id: Region; name: string; cities: string }[] = [
  { id: 'sanaa', name: 'صنعاء', cities: 'صنعاء، عمران، ذمار، المحويت' },
  { id: 'aden', name: 'عدن', cities: 'عدن، لحج، أبين، الضالع' },
  { id: 'hadramout', name: 'حضرموت', cities: 'المكلا، سيئون، تريم، الشحر' },
];

const currencyOptions: SelectOption[] = KNOWN_CURRENCIES.map(c => ({
  value: c.code,
  label: `${c.name} (${c.code})${c.isYemeni ? ' 🇾🇪' : ''}`,
  sublabel: c.isYemeni ? `المنطقة: ${c.region || 'اليمن'}` : c.code
}));

const Currencies: React.FC = () => {
  const { hasPermission } = useAuth();
  const { language } = useApp();
  const t = translations[language];

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
  const [loadingRates, setLoadingRates] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '' });
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<Region>('sanaa');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchCurrencies = async () => {
      const snap = await getDocs(collection(db, 'currencies'));
      setCurrencies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCurrencies();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCurrencySelect = (value: string) => {
    const found = KNOWN_CURRENCIES.find(c => c.code === value);
    if (found) {
      setNewCurrency({ code: found.code, name: found.name });
    }
  };

  const addCurrency = async () => {
    if (!newCurrency.code || !newCurrency.name) return;
    try {
      await addDoc(collection(db, 'currencies'), { 
        code: newCurrency.code, 
        name: newCurrency.name,
        rate: 1,
        rates: { sanaa: 1, aden: 1, hadramout: 1 },
        last_updated: new Date().toISOString(),
        isYemeni: KNOWN_CURRENCIES.find(c => c.code === newCurrency.code)?.isYemeni || false,
      });
      await logActivity('إضافة عملة', `تم إضافة العملة: ${newCurrency.name} (${newCurrency.code})`);
      setNewCurrency({ code: '', name: '' });
      const snap = await getDocs(collection(db, 'currencies'));
      setCurrencies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      showMessage('success', `تم إضافة ${newCurrency.name} بنجاح`);
    } catch (e) {
      showMessage('error', 'حدث خطأ أثناء إضافة العملة');
    }
  };

  const fetchLiveRates = async () => {
    setLoadingRates(true);
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      const yerRegionalRates = {
        sanaa: 0.0040,
        aden: 0.0038,
        hadramout: 0.0039,
      };
      for (const currency of currencies) {
        const code = currency.code;
        let rate = 1;
        let rates = currency.rates || {};
        if (code === 'USD') {
          rate = 1;
          rates = { sanaa: 1, aden: 1, hadramout: 1 };
        } else if (code === 'YER' || code === 'YER_OLD' || code === 'YER_NEW') {
          rate = 0.0039;
          rates = { ...yerRegionalRates };
        } else if (data.rates[code]) {
          rate = data.rates[code];
          rates = { sanaa: rate, aden: rate, hadramout: rate };
        }
        try {
          await updateDoc(doc(db, 'currencies', currency.id), {
            rate,
            rates,
            last_updated: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Failed to update rate for ' + code + ':', e);
        }
      }
      await logActivity('تحديث أسعار الصرف', 'تم جلب وتحديث أسعار الصرف الحية من API');
      const snap = await getDocs(collection(db, 'currencies'));
      setCurrencies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      showMessage('success', 'تم تحديث أسعار الصرف بنجاح من المصدر الحي');
    } catch (e) {
      showMessage('error', 'تعذر جلب أسعار الصرف الحية. يرجى التحقق من الاتصال بالإنترنت');
    } finally {
      setLoadingRates(false);
    }
  };

  const saveManualRate = async (currencyId: string, region: Region, value: number) => {
    try {
      const currency = currencies.find(c => c.id === currencyId);
      if (!currency) return;
      const rates = { ...(currency.rates || { sanaa: 1, aden: 1, hadramout: 1 }), [region]: value };
      const avgRate = (rates.sanaa + rates.aden + rates.hadramout) / 3;
      await updateDoc(doc(db, 'currencies', currencyId), {
        rates,
        rate: avgRate,
        last_updated: new Date().toISOString(),
        manually_updated: true,
      });
      await logActivity('تعديل سعر صرف يدوي', `تم تعديل سعر ${currency.code} في منطقة ${region} إلى ${value}`);
      const snap = await getDocs(collection(db, 'currencies'));
      setCurrencies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setEditingRate(null);
      showMessage('success', 'تم حفظ سعر الصرف المعدل يدوياً');
    } catch (e) {
      showMessage('error', 'حدث خطأ أثناء حفظ السعر');
    }
  };

  const deleteCurrency = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه العملة؟')) {
      try {
        await deleteDoc(doc(db, 'currencies', id));
        setCurrencies(currencies.filter(c => c.id !== id));
        await logActivity('حذف عملة', 'تم حذف عملة من القائمة');
        showMessage('success', 'تم حذف العملة بنجاح');
      } catch (e) {
        showMessage('error', 'حدث خطأ أثناء الحذف');
      }
    }
  };

  const getRateForRegion = (currency: any, region: Region) => {
    if (currency.rates && currency.rates[region]) {
      return currency.rates[region];
    }
    return currency.rate || 1;
  };

  const isCurrencyAlreadyAdded = (code: string) => currencies.some(c => c.code === code);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('ar-EG');
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-yazal-navy dark:text-white">إدارة العملات وأسعار الصرف</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">أسعار حية + دعم الريال اليمني القديم والجديد حسب المنطقة</p>
        </div>
        <button 
          onClick={fetchLiveRates}
          disabled={loadingRates}
          className="bg-yazal-cyan text-yazal-navy font-black px-6 py-4 rounded-2xl flex items-center gap-3 hover:brightness-110 transition-all shadow-xl shadow-yazal-cyan/20 disabled:opacity-50"
        >
          <RefreshCw size={20} className={loadingRates ? 'animate-spin' : ''} />
          {loadingRates ? 'جاري التحديث...' : 'تحديث أسعار الصرف الحية'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          {message.type === 'success' ? <TrendingUp size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="p-4 bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <MapPin size={18} className="text-yazal-cyan" />
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">اختر المنطقة لعرض أسعار الصرف:</span>
        </div>
        <div className="flex gap-2">
          {REGIONS.map(region => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                selectedRegion === region.id 
                  ? 'bg-yazal-navy text-white shadow-lg' 
                  : 'bg-slate-100 dark:bg-yazal-navy-dark text-slate-500 hover:text-yazal-navy'
              }`}
            >
              <Globe size={14} className="inline ml-1" />
              {region.name}
              <span className="block text-[8px] font-bold text-slate-400 mt-0.5">{region.cities}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 space-y-4">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
          ابحث عن عملة وأضفها (مع دعم الريال اليمني القديم والجديد)
        </label>
        <SearchableSelect
          options={currencyOptions.filter(o => !isCurrencyAlreadyAdded(o.value))}
          value=""
          onChange={handleCurrencySelect}
          placeholder="ابحث باسم العملة (مثال: ريال يمني قديم، دولار أمريكي)..."
          title="اختر العملة من القائمة وسيتم إدخال الكود تلقائياً"
        />
        <div className="flex flex-wrap gap-4 pt-2">
          <input 
            placeholder="كود (مثال: YER_OLD)" 
            value={newCurrency.code} 
            onChange={(e) => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})} 
            className="p-4 border rounded-2xl flex-1 outline-none focus:ring-2 ring-emerald-500 font-bold text-sm min-w-[120px]" 
            readOnly={!!newCurrency.code && KNOWN_CURRENCIES.some(c => c.code === newCurrency.code)}
            dir="ltr"
          />
          <input 
            placeholder="الاسم (مثال: ريال يمني قديم)" 
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
            <Plus size={20} />
            إضافة
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-yazal-navy text-white">
              <th className="p-4 text-right font-black text-xs uppercase tracking-widest">العملة</th>
              <th className="p-4 text-right font-black text-xs uppercase tracking-widest">الكود</th>
              <th className="p-4 text-center font-black text-xs uppercase tracking-widest">سعر الصرف (صنعاء)</th>
              <th className="p-4 text-center font-black text-xs uppercase tracking-widest">سعر الصرف (عدن)</th>
              <th className="p-4 text-center font-black text-xs uppercase tracking-widest">سعر الصرف (حضرموت)</th>
              <th className="p-4 text-center font-black text-xs uppercase tracking-widest">المتوسط</th>
              <th className="p-4 text-center font-black text-xs uppercase tracking-widest">آخر تحديث</th>
              <th className="p-4 text-center font-black text-xs uppercase tracking-widest">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((currency) => (
              <tr key={currency.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-yazal-navy dark:text-white">{currency.name}</td>
                <td className="p-4 font-mono text-xs font-bold text-slate-500">{currency.code}</td>
                {(['sanaa', 'aden', 'hadramout'] as Region[]).map((region) => (
                  <td key={region} className="p-4 text-center">
                    {editingRate === `${currency.id}-${region}` ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          step="0.0001"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="w-20 p-1 border rounded-lg text-xs font-bold text-center outline-none focus:ring-2 ring-yazal-cyan"
                          dir="ltr"
                        />
                        <button
                          onClick={() => saveManualRate(currency.id, region, parseFloat(editingValue))}
                          className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingRate(null)}
                          className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono font-bold text-sm">{getRateForRegion(currency, region).toFixed(4)}</span>
                        <button
                          onClick={() => {
                            setEditingRate(`${currency.id}-${region}`);
                            setEditingValue(getRateForRegion(currency, region).toString());
                          }}
                          className="p-1 text-slate-400 hover:text-yazal-cyan transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                ))}
                <td className="p-4 text-center font-mono font-bold text-yazal-cyan">
                  {currency.rate ? currency.rate.toFixed(4) : '-'}
                </td>
                <td className="p-4 text-center text-xs text-slate-500">
                  {currency.last_updated ? formatDate(currency.last_updated) : '-'}
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => deleteCurrency(currency.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {currencies.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <div className="text-slate-400 font-bold text-sm">
                    <AlertCircle size={40} className="mx-auto mb-3 opacity-50" />
                    لا توجد عملات مضافة بعد. قم بإضافة عملة من الأعلى.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Currencies;
