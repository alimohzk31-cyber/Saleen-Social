import React, { useState } from 'react';
import { X, Upload, MapPin, Phone, Type, LayoutGrid, Briefcase, Clock, Navigation } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useServices } from '../context/ServicesContext';
import { Service, isValidServiceId } from '../hooks/useServices';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface Props {
  service: Service;
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditServiceModal({ service, onClose, onSaved }: Props) {
  const { theme } = useTheme();
  const { editService } = useServices();
  const { categories } = useCategories();
  const { t } = useLanguage();
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: service.name,
    profession: service.profession || '',
    experience: service.experience || '',
    phone: service.phone || '',
    location: service.location,
    image: service.image,
    categorySlug: service.categorySlug,
  });
  const [latitude, setLatitude] = useState<number | undefined>(service.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(service.longitude);

  const handleGetLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setFormData(prev => ({ 
            ...prev, 
            location: prev.location ? prev.location : `${lat.toFixed(5)}, ${lng.toFixed(5)}` 
          }));
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location", error);
          let msg = t('location_error');
          if (error.code === error.PERMISSION_DENIED) msg = t('location_denied');
          else if (error.code === error.POSITION_UNAVAILABLE) msg = t('location_unavailable');
          else if (error.code === error.TIMEOUT) msg = t('location_timeout');
          alert(msg);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert(t('browser_no_location'));
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation: only the real numeric id from Supabase may be used.
    // Never fall back to slug - an UPDATE by slug would target the wrong row or none at all.
    if (!isValidServiceId(service.id)) {
      const msg = `لا يمكن حفظ التعديلات: الخدمة لا تحتوي على معرّف (id) رقمي صالح من قاعدة البيانات (القيمة المستلمة: ${JSON.stringify(service.id)}).`;
      console.error('[EditServiceModal]', msg);
      alert(msg);
      return;
    }

    if (isSaving) return; // prevent double-submit while the UPDATE is running
    setIsSaving(true);

    try {
      console.log('[EditServiceModal] Saving edits for service.id =', service.id);
      // ONE single UPDATE by services.id. The original categoryId is passed through
      // so that when the admin did NOT change the section, the exact same
      // category_id currently stored in the database is sent back - never a default.
      await editService(service.id, {
        ...formData,
        categoryId: service.categoryId ?? undefined,
        latitude,
        longitude
      });
      // Notify the parent (Admin Panel) so it re-fetches its lists straight from Supabase
      onSaved?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to update service:', error);
      alert(error?.message || 'تعذر حفظ التعديلات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className={`w-full max-w-md sm:max-w-lg border rounded-2xl shadow-2xl overflow-y-auto overflow-x-hidden overscroll-contain my-8 max-h-[calc(100vh-80px)] animate-in fade-in zoom-in duration-200 bg-[var(--surface-elevated)] border-[var(--border)]`}>
        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 bg-[var(--surface-elevated)] border-[var(--border)]`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]`}>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Type className="w-4 h-4" />
            </div>
            {t('edit_service')}
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
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all appearance-none font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
            >
              {categories.map((cat: any) => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <Type className="w-4 h-4" /> {t('service_name_label')}
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
            />
          </div>

          {/* Profession */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <Briefcase className="w-4 h-4" /> {t('profession_label')}
            </label>
            <input
              required
              type="text"
              value={formData.profession}
              onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
            />
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
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all min-h-[80px] resize-y font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className={`text-sm flex items-center gap-2 font-bold text-[var(--text-secondary)]`}>
              <MapPin className="w-4 h-4" /> {t('location_label')}
            </label>
            <div className="flex gap-2">
              <input
                required
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className={`flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className={`border rounded-xl px-4 flex items-center justify-center transition-all disabled:opacity-50 bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:border-[var(--border-strong)]`}
                title={t('get_current_location')}
              >
                <Navigation className={`w-5 h-5 ${isLocating ? 'animate-pulse text-blue-500' : ''}`} />
              </button>
            </div>
            {latitude && longitude && (
              <p className="text-xs text-blue-500 mt-1 font-bold" dir="ltr">
                📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            )}
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
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all text-left font-bold bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]`}
              dir="ltr"
            />
          </div>
          
          {/* Action Buttons */}
          <div className={`flex gap-3 pt-4 mt-4 border-t border-[var(--border)]`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 font-bold py-3.5 rounded-xl transition-all bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--accent-light)]`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جارٍ الحفظ...
                </>
              ) : (
                t('save_changes')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
