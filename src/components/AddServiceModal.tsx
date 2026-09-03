import React, { useState, useRef } from 'react';
import { X, Upload, MapPin, Phone, Type, LayoutGrid, Briefcase, Clock, Navigation, Image as ImageIcon } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useServices, getOwnerId } from '../context/ServicesContext';
import { getCategoryFieldConfig } from '../data/categoryFields';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onClose: () => void;
  initialCategorySlug?: string;
  isAdmin?: boolean;
  /** يُستدعى بعد نجاح حفظ الخدمة في Supabase (يستخدمه الأدمن لتحديث قائمة «الخدمات المضافة حديثًا»). */
  onSaved?: () => void;
}

export default function AddServiceModal({ onClose, initialCategorySlug, onSaved }: Props) {
    const { theme } = useTheme();
  const { addService } = useServices();
  const { categories } = useCategories();
  const { t } = useLanguage();
    const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    experience: '',
    phone: '',
    location: '', // This will be the Area Name
    coordinatesInput: '', // Manual coordinates input
    image: '',
        categorySlug: initialCategorySlug || (categories.length > 0 ? categories[0].slug : ''),
  });

  // الإعدادات الديناميكية للقسم المختار (التصنيف/العنوان/المهنة/التخصينات)
  const fieldConfig = getCategoryFieldConfig(formData.categorySlug);

    // Sync categorySlug if categories load after modal opens
  React.useEffect(() => {
    if (!formData.categorySlug && categories.length > 0) {
      const defaultSlug = categories[0].slug;
      setFormData(prev => ({ ...prev, categorySlug: defaultSlug }));
    }
  }, [categories, formData.categorySlug]);

  // حالة اختيار التخصص في قائمة المهن (chosen / custom)
  const [professionSelectMode, setProfessionSelectMode] = useState<'chosen' | 'custom'>('chosen');

  // عند تغيير القسم: عبئ المهنة تلقيقاً من إعدادات القسم لضمان أن بيانات القسم السابقة لا تظهر
  const prevCategoryRef = React.useRef(formData.categorySlug);
  React.useEffect(() => {
    const prev = prevCategoryRef.current;
    if (formData.categorySlug !== prev) {
      prevCategoryRef.current = formData.categorySlug;
      const config = getCategoryFieldConfig(formData.categorySlug);
      setFormData((f) => ({ ...f, profession: config.profession }));
      setProfessionSelectMode('chosen'); // نعيد الوضع الافتراضي للقسم الجديد
    }
  }, [formData.categorySlug]);




  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(t('image_too_large'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetLocation = () => {
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      alert(t('https_required') || 'تحديد الموقع يتطلب رابطاً آمناً (HTTPS). يرجى التأكد من إعدادات الموقع.');
      return;
    }

    setIsLocating(true);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const success = (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setCoordinates({ lat, lng });
      setFormData(prev => ({ 
        ...prev, 
        coordinatesInput: coordsStr
      }));
      setIsLocating(false);
    };

    const error = (err: GeolocationPositionError) => {
      console.warn(`ERROR(${err.code}): ${err.message}`);
      
      // Fallback to low accuracy if high accuracy fails
      if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        navigator.geolocation.getCurrentPosition(success, (err2) => {
          let msg = t('location_error');
          if (err2.code === err2.PERMISSION_DENIED) msg = t('location_denied');
          alert(msg);
          setIsLocating(false);
        }, { enableHighAccuracy: false, timeout: 5000 });
      } else {
        let msg = t('location_error');
        if (err.code === err.PERMISSION_DENIED) msg = t('location_denied');
        alert(msg);
        setIsLocating(false);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(success, error, options);
    } else {
      alert(t('browser_no_location'));
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Generate a more robust slug that works with Arabic and is unique
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 7);
    const nameSlug = formData.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FFa-z0-9-]/g, '') // Keep Arabic characters, a-z, 0-9 and hyphens
      .substring(0, 50);
    
    const slug = `${nameSlug || 'service'}-${timestamp}-${randomStr}`;

    // Parse coordinates if manually entered
    let finalCoords = coordinates;
    if (formData.coordinatesInput && !finalCoords) {
      const parts = formData.coordinatesInput.split(',').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        finalCoords = { lat: parts[0], lng: parts[1] };
      }
    }

    // Use env vars if available, otherwise fall back to hardcoded values
    // (needed when opening index.html directly without a build server)
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://nnxrjpitjxtceydlcxzm.supabase.co';
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueHJqcGl0anh0Y2V5ZGxjeHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDkyMjMsImV4cCI6MjA5MTIyNTIyM30.Ui1IQ4OOJ8wngBoNIBNe0nTCQgfm0q8P7AjrKhyAU4w';

    // Resolve the REAL categories.id of the currently selected section.
    // This is the value saved into services.category_id (FK) - never null
    // while the section is known. The slug alone is NOT enough because a DB
    // trigger derives category_slug from category_id on INSERT.
    const selectedCategory = categories.find((cat: any) => cat.slug === formData.categorySlug);

    try {
      await addService({
        slug,
        name: formData.name,
        profession: formData.profession,
        experience: formData.experience,
        phone: formData.phone,
        location: formData.location,
        latitude: finalCoords?.lat,
        longitude: finalCoords?.lng,
        image: formData.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32b7?w=800&q=80',
        categorySlug: formData.categorySlug,
        categoryId: selectedCategory?.dbId ?? undefined,
        // القاعدة الأساسية: أي خدمة جديدة تكون pending دائماً
        // (حتى المضافة من لوحة الإدارة) ولا تظهر للعامة إلا بعد موافقة المدير.
        status: 'pending',
        ownerId: getOwnerId(),
      });
      
      alert(t('service_added_pending'));
      // إعلام المتصل بالنجاح (لوحة الإدارة تحدّث بها قائمة «الخدمات المضافة حديثًا» فورًا
      // دون انتظار إعادة تحميل الصفحة أو إعادة تشغيل التطبيق).
      onSaved?.();
      onClose();
    } catch (error: any) {
      // Surface the REAL Supabase error - never pretend the save succeeded
      console.error("Error adding service:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      alert(
        `تعذر حفظ الخدمة في قاعدة البيانات.\n` +
        `السبب: ${error?.message || 'خطأ غير معروف'}` +
        (error?.code ? `\nرمز الخطأ: ${error.code}` : '') +
        (error?.hint ? `\nتلميح: ${error.hint}` : '')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className={`w-full max-w-md sm:max-w-lg border rounded-2xl shadow-2xl overflow-y-auto overflow-x-hidden overscroll-contain my-8 max-h-[calc(100vh-80px)] animate-in fade-in zoom-in duration-200 bg-[var(--surface-elevated)] border-[var(--border)]`}>
        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 bg-[var(--surface-elevated)] border-[var(--border)]`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]`}>
            <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)]">
              <Upload className="w-4 h-4" />
            </div>
            {t('add_new_service')}
          </h2>
          <button onClick={onClose} className={`p-2 rounded-xl transition-all text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10`}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Category */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <LayoutGrid className="w-4 h-4" /> {t('section')}
            </label>
            <select
              value={formData.categorySlug}
              onChange={(e) => setFormData({ ...formData, categorySlug: e.target.value })}
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all appearance-none font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
            >
              {categories.map((cat: any) => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
                          <Type className="w-4 h-4" /> {fieldConfig.nameLabel || t('service_name_label')}
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
              placeholder={fieldConfig.namePlaceholder || t('service_name_placeholder')}
            />
          </div>

                    {/* Profession / التخصص — يصبح ديناميكياً حسب القسم */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <Briefcase className="w-4 h-4" /> {fieldConfig.profession ? fieldConfig.profession : t('profession_label')}
            </label>
            {fieldConfig.specialties.length > 0 ? (
              // إذا كان للقسم تخصصات محددة: قائمة اختيار مع خيار "أخرى" يفتح حقل نص
              <>
                <select
                  required
                  value={professionSelectMode}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom__') {
                      setProfessionSelectMode('custom');
                    } else {
                      setFormData({ ...formData, profession: val });
                      setProfessionSelectMode('chosen');
                    }
                  }}
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] appearance-none`}
                >
                  <option value="" disabled hidden>اختر التخصص</option>
                  {fieldConfig.specialties.map((sp, i) => (
                    <option key={i} value={sp}>{sp}</option>
                  ))}
                  <option value="__custom__">أخرى...</option>
                </select>
                {professionSelectMode === 'custom' && (
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] mt-2`}
                    placeholder={t('profession_placeholder')}
                  />
                )}
              </>
            ) : (
              // بدون تخصصات محددة: حقل نص حر (سلوك النظام القديم)
              <input
                required
                type="text"
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
                placeholder={t('profession_placeholder')}
              />
            )}
          </div>


          {/* Experience */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <Clock className="w-4 h-4" /> {t('experience_label')}
            </label>
            <textarea
              required
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all min-h-[80px] resize-y font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
              placeholder={t('experience_placeholder')}
            />
          </div>

          {/* Area Name */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <MapPin className="w-4 h-4" /> {t('location_label')}
            </label>
            <input
              required
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
              placeholder={t('location_placeholder')}
            />
          </div>

          {/* Coordinates */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <Navigation className="w-4 h-4" /> {t('coordinates_label')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.coordinatesInput}
                onChange={(e) => setFormData({ ...formData, coordinatesInput: e.target.value })}
                className={`flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all text-sm font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
                placeholder={t('coordinates_placeholder')}
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className={`border rounded-xl px-4 flex items-center justify-center transition-all disabled:opacity-50 bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:border-[var(--border-strong)]`}
                title={t('get_current_location')}
              >
                <Navigation className={`w-5 h-5 ${isLocating ? 'animate-pulse text-[var(--accent-primary)]' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1 font-bold">
              {t('coordinates_help')}
            </p>
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <Phone className="w-4 h-4" /> {t('phone_label')} <span className="text-[var(--text-secondary)] text-xs font-bold">({t('optional')})</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all text-left font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
              placeholder="07X XXXX XXXX"
              dir="ltr"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <ImageIcon className="w-4 h-4" /> {t('service_image_label')}
            </label>
            <div className="flex flex-col gap-3">
              {formData.image ? (
                <div className={`relative w-full h-48 rounded-xl overflow-hidden border group border-[var(--border)]`}>
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-[var(--accent-primary)] hover:text-white transition-all"
                      title={t('change_image')}
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all"
                      title={t('delete_image')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all bg-[var(--surface-elevated)] group-hover:bg-[var(--accent-soft)] group-hover:scale-110`}>
                    <ImageIcon className={`w-7 h-7 transition-colors text-[var(--text-muted)] group-hover:text-[var(--text-primary)]`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold text-[var(--text-primary)]`}>{t('add_image_help')}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 font-bold">{t('image_quality_help')}</p>
                  </div>
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className={`flex gap-3 pt-4 mt-4 border-t border-[var(--border)]`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 font-bold py-3.5 rounded-xl transition-all bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
                            className="flex-1 app-btn-accent font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save_data')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
