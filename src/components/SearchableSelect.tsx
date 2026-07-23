import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'اختر خياراً...',
  title = 'انقر للبحث والتحديد السريع',
  disabled = false,
  className = '',
  allowCustom = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.sublabel && o.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} title={title}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none flex items-center justify-between gap-2 text-right transition-all hover:border-yazal-cyan/50 focus:border-yazal-cyan"
      >
        <span className={selectedOption || value ? 'text-yazal-navy dark:text-white font-black' : 'text-slate-400 font-bold'}>
          {selectedOption ? selectedOption.label : (value || placeholder)}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-yazal-cyan' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-yazal-navy-light border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 space-y-2 max-h-64 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="relative shrink-0">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="ابحث هنا للوصول السريع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-yazal-navy dark:text-white outline-none focus:border-yazal-cyan"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-white/5 pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full p-2.5 text-right font-bold text-xs rounded-xl flex items-center justify-between transition-colors ${
                    value === opt.value
                      ? 'bg-yazal-cyan/10 text-yazal-cyan font-black'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div>
                    <span className="block">{opt.label}</span>
                    {opt.sublabel && <span className="block text-[10px] text-slate-400 font-normal">{opt.sublabel}</span>}
                  </div>
                  {value === opt.value && <Check size={16} className="text-yazal-cyan shrink-0" />}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs font-bold text-slate-400">
                {allowCustom && searchTerm ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchTerm);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="text-yazal-cyan underline font-black"
                  >
                    إضافة "{searchTerm}" كخيار جديد
                  </button>
                ) : (
                  'لا توجد نتائج مطابقة'
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
