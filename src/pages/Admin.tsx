/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  UserPlus, 
  Key, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Search, 
  X, 
  ShieldAlert, 
  Save, 
  Settings, 
  DollarSign, 
  CreditCard, 
  Briefcase, 
  Plus,
  Database,
  AlertTriangle,
  Loader
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { UserProfile, FixedService, PaymentGateway, ALL_PERMISSIONS_LIST, ROLE_PERMISSION_PRESETS } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/audit';

/**
 * لوحة تحكم المسؤول وإدارة النظام المركزية (Admin Control Panel & Granular RBAC)
 * - إدارة الكادر الوظيفي وتحديد الأدوار وصلاحيات الوصول الإجرائية
 * - كتالوج الخدمات الثابتة والأسعار المعتمدة من الإدارة
 * - إدارة بوابات وطرق الدفع المحلية (كريمي، وان كاش، جوالي، نقد كاش)
 */
const Admin: React.FC = () => {
  const navigate = useNavigate();
  // الحالات النشطة بالتبويب
  const [activeTab, setActiveTab] = useState<'users' | 'services' | 'gateways'>('users');

  // بيانات المستخدمين الصلاحيات
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'staff' });

  // كتالوج الخدمات المعتمدة (يتم جلبه من Firestore)
  const [services, setServices] = useState<FixedService[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [newService, setNewService] = useState({
    service_code: '',
    service_name_ar: '',
    service_name_en: '',
    base_price: 100,
    default_currency: 'USD' as any,
    category: 'تأشيرات'
  });

  // طرق الدفع
  const [gateways, setGateways] = useState<PaymentGateway[]>([
    { id: 'PAY-CASH', name_ar: 'نقد كاش (الصندوق الرئيسي)', name_en: 'Cash In Hand', type: 'cash', is_active: true },
    { id: 'PAY-ONECASH', name_ar: 'محفظة وان كاش One Cash', name_en: 'One Cash Wallet', type: 'wallet', is_active: true },
    { id: 'PAY-KURAIMI', name_ar: 'كريمي جوال (حساب بنكي)', name_en: 'Kuraimi Mobile', type: 'bank', is_active: true },
    { id: 'PAY-JAWALI', name_ar: 'محفظة جوالي Jawali', name_en: 'Jawali Wallet', type: 'wallet', is_active: true },
    { id: 'PAY-MAHFAZATI', name_ar: 'محفظتي Mahfazati', name_en: 'Mahfazati Wallet', type: 'wallet', is_active: true },
  ]);

  // قائمة بكافة الصلاحيات المتاحة في النظام (مستوردة من types.ts)
  const allPermissions = ALL_PERMISSIONS_LIST;

  // حالة اختيار قالب الصلاحيات
  const [selectedPreset, setSelectedPreset] = useState<string>('staff');

  useEffect(() => {
    fetchUsers();
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'services'));
      const servicesData = snapshot.docs.map(d => {
        const data = d.data() as FixedService;
        return { ...data, service_id: data.service_id || d.id };
      });
      if (servicesData.length > 0) {
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * إنشاء مستخدم جديد وتسجيله بـ Firebase Auth + Firestore مع الصلاحيات المسبقة
   */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. إنشاء المستخدم في Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      const firebaseUid = userCredential.user.uid;
      
      // 2. حفظ المستخدم في Firestore مع البيانات والصلاحيات
      const userRef = doc(db, 'users', firebaseUid);
      
      // تحديد الصلاحيات حسب قالب الدور المختار
      const rolePreset = selectedPreset as keyof typeof ROLE_PERMISSION_PRESETS;
      const presetPermissions = ROLE_PERMISSION_PRESETS[rolePreset] || ROLE_PERMISSION_PRESETS.staff;
      
      const profile: UserProfile = {
        uid: firebaseUid,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role as any,
        permissions: [...presetPermissions],
        biometricEnabled: false,
        is_active: true,
        created_at: new Date()
      };
      await setDoc(userRef, profile);
      await logActivity('إنشاء مستخدم', `قام المسؤول بإنشاء مستخدم جديد: ${newUser.username} بدور ${newUser.role} مع ${presetPermissions.length} صلاحية`);
      setUsers([...users, profile]);
      setIsAddingUser(false);
      setNewUser({ username: '', email: '', password: '', role: 'staff' });
      setSelectedPreset('staff');
      alert(`✅ تم إنشاء المستخدم ${newUser.username} بنجاح في Firebase Auth! يمكنه الآن تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور.`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        alert('❌ البريد الإلكتروني مستخدم بالفعل في النظام');
      } else if (error.code === 'auth/weak-password') {
        alert('❌ كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل)');
      } else {
        alert('❌ حدث خطأ أثناء إنشاء المستخدم: ' + (error.message || ''));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * تفعيل/تعطيل حساب موظف
   */
  const toggleUserActiveStatus = async (userId: string, currentStatus: boolean = true) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, 'users', userId), { is_active: newStatus });
      await logActivity('تغيير حالة مستخدم', `تم تغيير حالة المستخدم إلى: ${newStatus ? 'نشط' : 'معطل'}`);
      setUsers(users.map(u => u.uid === userId ? { ...u, is_active: newStatus } : u));
      if (selectedUser?.uid === userId) {
        setSelectedUser({ ...selectedUser, is_active: newStatus });
      }
    } catch (error) {
      alert('خطأ في تحديث حالة المستخدم');
    }
  };

  /**
   * تغيير صلاحية محددة للمستخدم
   */
  const togglePermission = async (userId: string, permission: string) => {
    const user = users.find(u => u.uid === userId);
    if (!user) return;

    const newPermissions = user.permissions.includes(permission)
      ? user.permissions.filter(p => p !== permission)
      : [...user.permissions, permission];

    try {
      await updateDoc(doc(db, 'users', userId), { permissions: newPermissions });
      await logActivity('تعديل صلاحيات', `تم تعديل صلاحيات المستخدم: ${user.username}`);
      setUsers(users.map(u => u.uid === userId ? { ...u, permissions: newPermissions } : u));
      if (selectedUser?.uid === userId) {
        setSelectedUser({ ...selectedUser, permissions: newPermissions });
      }
    } catch (error) {
      alert('خطأ في تحديث الصلاحيات');
    }
  };

  /**
   * إضافة خدمة جديدة للكتالوج المعتمد وحفظها في Firestore
   */
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    const serviceId = `SRV-${newService.service_code.toUpperCase()}`;
    const newSrv: FixedService = {
      service_id: serviceId,
      service_code: newService.service_code,
      service_name_ar: newService.service_name_ar,
      service_name_en: newService.service_name_en || newService.service_name_ar,
      base_price: Number(newService.base_price),
      default_currency: newService.default_currency,
      category: newService.category
    };
    try {
      await setDoc(doc(db, 'services', serviceId), newSrv);
      setServices([...services, newSrv]);
      setIsAddingService(false);
      setNewService({
        service_code: '',
        service_name_ar: '',
        service_name_en: '',
        base_price: 100,
        default_currency: 'USD' as any,
        category: 'تأشيرات'
      });
      await logActivity('إضافة خدمة', `تمت إضافة خدمة جديدة للكتالوج: ${newService.service_name_ar}`);
    } catch (error) {
      console.error('Error creating service:', error);
      alert('حدث خطأ أثناء إضافة الخدمة');
    }
  };

  /**
   * حذف مستخدم
   */
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المستخدم نهائياً؟')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setUsers(users.filter(u => u.uid !== userId));
        if (selectedUser?.uid === userId) setSelectedUser(null);
        await logActivity('حذف مستخدم', `تم حذف المستخدم`);
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('حدث خطأ أثناء الحذف.');
      }
    }
  };

  /**
   * حذف خدمة من Firestore
   */
  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الخدمة؟')) {
      try {
        await deleteDoc(doc(db, 'services', serviceId));
        setServices(services.filter(s => s.service_id !== serviceId));
        await logActivity('حذف خدمة', `تمت إزالة خدمة من الكتالوج`);
      } catch (error) {
        console.error('Error deleting service:', error);
        alert('حدث خطأ أثناء حذف الخدمة');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* الهيدر العلوي */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white tracking-tight uppercase">إدارة النظام والكتالوج الموحد</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Yazal ERP Control Center • Users & Services Catalog</p>
        </div>

        <div className="flex items-center gap-3">
          {/* زر تهيئة النظام - للمدير فقط */}
          <button
            onClick={() => navigate('/system-reset')}
            className="p-3 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 rounded-2xl transition-all flex items-center gap-2"
            title="تهيئة النظام ومسح البيانات التجريبية"
          >
            <Database size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">تهيئة</span>
          </button>

          {/* أزرار التبويب */}
          <div className="flex bg-white dark:bg-yazal-navy-light p-1.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-5 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center gap-2 ${
                activeTab === 'users' ? 'bg-yazal-navy text-white shadow-md' : 'text-slate-400 hover:text-yazal-navy dark:hover:text-white'
              }`}
            >
              <Shield size={16} />
              المستخدمين والصلاحيات
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-5 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center gap-2 ${
                activeTab === 'services' ? 'bg-yazal-navy text-white shadow-md' : 'text-slate-400 hover:text-yazal-navy dark:hover:text-white'
              }`}
            >
              <Briefcase size={16} />
              الخدمات والأسعار
            </button>
            <button
              onClick={() => setActiveTab('gateways')}
              className={`px-5 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center gap-2 ${
                activeTab === 'gateways' ? 'bg-yazal-navy text-white shadow-md' : 'text-slate-400 hover:text-yazal-navy dark:hover:text-white'
              }`}
            >
              <CreditCard size={16} />
              طرق الدفع المحلية
            </button>
          </div>
        </div>
      </div>

      {/* تبويب إدارة المستخدمين الصلاحيات */}
      {activeTab === 'users' && (
        <div className="space-y-8">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsAddingUser(true)}
              className="bg-yazal-navy text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-yazal-navy-light transition-all shadow-xl shadow-yazal-navy/20 uppercase tracking-widest text-xs"
            >
              <UserPlus size={18} />
              إضافة موظف جديد
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* قائمة الموظفين */}
            <div className="lg:col-span-2 bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                <h2 className="font-bold flex items-center gap-2 text-yazal-navy dark:text-white text-sm">
                  <div className="w-1.5 h-6 bg-yazal-cyan rounded-full" />
                  قائمة الكادر الوظيفي
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="بحث عن موظف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none transition-all w-48"
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-50 dark:divide-white/5">
                {filteredUsers.map(u => (
                  <div 
                    key={u.uid}
                    onClick={() => setSelectedUser(u)}
                    className={`p-6 flex items-center justify-between cursor-pointer transition-all ${
                      selectedUser?.uid === u.uid ? 'bg-yazal-cyan/5 border-r-4 border-yazal-cyan' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-yazal-navy text-yazal-cyan font-black flex items-center justify-center text-lg">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-yazal-navy dark:text-white uppercase tracking-tight text-sm">{u.username}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{u.role} • {u.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleUserActiveStatus(u.uid, u.is_active ?? true); }}
                        title={u.is_active ?? true ? "تعطيل الموظف" : "تفعيل الموظف"}
                        className={`p-2 transition-colors ${u.is_active ?? true ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-500'}`}
                      >
                        {u.is_active ?? true ? <CheckCircle size={16} /> : <X size={16} />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.uid); }}
                        title="حذف المستخدم"
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* محرر الصلاحيات الجزئية */}
            <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden sticky top-24 h-fit p-6 space-y-6">
              {selectedUser ? (
                <div>
                  <div className="p-6 bg-yazal-navy text-white rounded-2xl mb-6">
                    <Shield size={32} className="text-yazal-cyan mb-2" />
                    <h3 className="font-black text-lg uppercase tracking-tight">{selectedUser.username}</h3>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">تحديد الأذونات الأمنية</p>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {allPermissions.map(perm => (
                      <label key={perm.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-yazal-navy-dark rounded-xl cursor-pointer">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{perm.label}</span>
                        <input 
                          type="checkbox"
                          checked={selectedUser.permissions.includes(perm.id)}
                          onChange={() => togglePermission(selectedUser.uid, perm.id)}
                          className="w-4 h-4 accent-yazal-cyan rounded"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center space-y-2">
                  <ShieldAlert size={40} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">اختر موظفاً لتعديل أذوناته</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* تبويب الخدمات والأسعار */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">كتالوج الخدمات والأسعار المعتمدة</h3>
            <button 
              onClick={() => setIsAddingService(true)}
              className="bg-yazal-cyan text-yazal-navy font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-yazal-cyan/20"
            >
              <Plus size={16} />
              إضافة خدمة جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map(srv => (
              <div key={srv.service_id} className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-yazal-cyan bg-yazal-cyan/10 px-2.5 py-1 rounded-md uppercase tracking-widest">
                      {srv.service_code}
                    </span>
                    <h4 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight mt-2">
                      {srv.service_name_ar}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-2xl font-black text-yazal-navy dark:text-white">
                      {srv.base_price.toLocaleString()} <span className="text-xs text-yazal-cyan">{srv.default_currency}</span>
                    </span>
                    <button 
                      onClick={() => handleDeleteService(srv.service_id)}
                      title="حذف الخدمة"
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* تبويب طرق الدفع المحلية */}
      {activeTab === 'gateways' && (
        <div className="space-y-6">
          <h3 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">طرق وبوابات الدفع المحلية المعتمدة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gateways.map(g => (
              <div key={g.id} className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm space-y-3">
                <div className="w-12 h-12 bg-yazal-navy text-yazal-cyan rounded-2xl flex items-center justify-center font-black">
                  <CreditCard size={24} />
                </div>
                <h4 className="font-black text-yazal-navy dark:text-white uppercase tracking-tight text-sm">{g.name_ar}</h4>
                <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-md">
                  نشط ومعتمد
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* مودال إضافة مستخدم */}
      <AnimatePresence>
        {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setIsAddingUser(false)} className="absolute inset-0 bg-yazal-navy/80 backdrop-blur-sm" />
            <div className="bg-white dark:bg-yazal-navy-light w-full max-w-md rounded-3xl p-8 relative z-10 space-y-6 shadow-2xl">
              <h3 className="text-xl font-black text-yazal-navy dark:text-white uppercase">تسجيل موظف جديد</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input 
                  type="text" required placeholder="اسم الموظف الكامل" 
                  value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none"
                />
                <input 
                  type="email" required placeholder="البريد الإلكتروني المهني" 
                  value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-yazal-cyan focus:ring-1 ring-yazal-cyan"
                />
                <input 
                  type="password" required placeholder="كلمة المرور المؤقتة" 
                  value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-yazal-cyan focus:ring-1 ring-yazal-cyan"
                />
                <select 
                  value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-yazal-cyan focus:ring-1 ring-yazal-cyan"
                >
                  <option value="staff">موظف (Staff)</option>
                  <option value="agent">وكيل (Agent) - مندوب</option>
                  <option value="accountant">محاسب (Accountant)</option>
                  <option value="admin">مسؤول نظام (Admin)</option>
                </select>

                {/* اختيار قالب الصلاحيات المسبق */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">قالب الصلاحيات (يتحدد تلقائياً حسب الدور)</label>
                  <select 
                    value={selectedPreset} 
                    onChange={e => setSelectedPreset(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-yazal-cyan focus:ring-1 ring-yazal-cyan"
                  >
                    <option value="staff">موظف عادي (صلاحيات أساسية)</option>
                    <option value="agent">مندوب (تنفيذ المهام)</option>
                    <option value="accountant">محاسب (صلاحيات مالية كاملة)</option>
                    <option value="admin">مدير نظام (جميع الصلاحيات)</option>
                  </select>
                  <p className="text-[9px] text-slate-400 font-bold px-1">
                    سيتم تطبيق {ROLE_PERMISSION_PRESETS[selectedPreset as keyof typeof ROLE_PERMISSION_PRESETS]?.length || 0} صلاحية مسبقاً
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 font-black text-xs uppercase rounded-2xl">إلغاء</button>
                  <button type="submit" className="flex-1 py-4 bg-yazal-navy text-white font-black text-xs uppercase rounded-2xl shadow-xl">تأكيد الإضافة</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* مودال إضافة خدمة */}
      <AnimatePresence>
        {isAddingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setIsAddingService(false)} className="absolute inset-0 bg-yazal-navy/80 backdrop-blur-sm" />
            <div className="bg-white dark:bg-yazal-navy-light w-full max-w-md rounded-3xl p-8 relative z-10 space-y-6 shadow-2xl">
              <h3 className="text-xl font-black text-yazal-navy dark:text-white uppercase">إضافة خدمة جديدة للكتالوج</h3>
              <form onSubmit={handleCreateService} className="space-y-4">
                <input 
                  type="text" required placeholder="كود الخدمة (مثال: SCH-05)" 
                  value={newService.service_code} onChange={e => setNewService({...newService, service_code: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none"
                />
                <input 
                  type="text" required placeholder="اسم الخدمة بالعربية" 
                  value={newService.service_name_ar} onChange={e => setNewService({...newService, service_name_ar: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="number" step="any" min="0" required placeholder="السعر" 
                    title="السعر الافتراضي للخدمة"
                    autoComplete="transaction-amount"
                    value={newService.base_price || ''} onChange={e => setNewService({...newService, base_price: e.target.value ? Number(e.target.value) : 0})}
                    className="p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-yazal-cyan focus:ring-1 ring-yazal-cyan"
                  />
                  <select 
                    value={newService.default_currency} onChange={e => setNewService({...newService, default_currency: e.target.value as any})}
                    className="p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="YER">YER</option>
                    <option value="SAR">SAR</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsAddingService(false)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 font-black text-xs uppercase rounded-2xl">إلغاء</button>
                  <button type="submit" className="flex-1 py-4 bg-yazal-cyan text-yazal-navy font-black text-xs uppercase rounded-2xl shadow-xl">تأكيد الخدمة</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
