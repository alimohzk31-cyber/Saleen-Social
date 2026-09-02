import { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, Clock, Briefcase, Navigation, UserPlus, XCircle, Hourglass } from 'lucide-react';
import { colorMap, colorMapRedWhite } from '../data/categories';
import { resolveCategoryIcon } from '../data/serviceIcons';
import { useCategories } from '../hooks/useCategories';
import { useServices } from '../context/ServicesContext';
import { Service, getOwnerId } from '../hooks/useServices';
import AddServiceModal from '../components/AddServiceModal';
import ServiceDetailModal from '../components/ServiceDetailModal';
import SafeImage from '../components/SafeImage';
import { motion, AnimatePresence } from 'motion/react';

import { useLanguage } from '../context/LanguageContext';

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { categories } = useCategories();
  const { t } = useLanguage();
  
  const category = categories.find(c => c.slug === id);
  const { services } = useServices();
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const { primaryColor, theme } = useOutletContext<{ primaryColor: string, theme: string }>();
  
  // Scroll Restoration — نفس التهذيف: كتابة واحدة عند مغادرة الصفحة بدلاً من
  // الكتابة عند كل حدث تمرير، مع مستمع passive.
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(`categoryScrollPos-${id}`);
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedPosition),
          behavior: 'instant'
        });
        sessionStorage.removeItem(`categoryScrollPos-${id}`);
      }, 100);
    }

    let latestY = 0;
    let ticking = false;
    const handleScroll = () => {
      latestY = window.scrollY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { ticking = false; });
      }
    };

    const persistPosition = () => {
      if (latestY > 0) {
        sessionStorage.setItem(`categoryScrollPos-${id}`, latestY.toString());
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', persistPosition);
    return () => {
      persistPosition();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', persistPosition);
    };
  }, [id]);

  if (!category) {
    return <div className="text-center py-20 text-xl font-bold">القسم غير موجود</div>;
  }

  const isCarSection = category.slug === 'car-repair';
  const carSubCategories = [
    { id: 'all', name: 'الكل' },
    { id: 'car-wash', name: 'غسيل سيارات' },
    { id: 'car-tires', name: 'إطارات سيارات' },
    { id: 'car-accessories', name: 'كماليات سيارات' },
    { id: 'car-electric', name: 'كهرباء سيارات' },
    { id: 'car-filters', name: 'فلاتر سيارات' },
    { id: 'car-glass', name: 'زجاج سيارات' }
  ];

  // قاعدة الظهور (منطقية في البيانات نفسها - لا CSS إخفاء):
  // - approved: تظهر للجميع في قسمها الأصلي.
  // - pending / rejected: تظهر لصاحبها فقط (نفس owner_id/الجهاز) كخدمة مقفلة 🔒.
  //   لا تظهر للعامة إطلاقاً قبل موافقة المدير.
  const currentOwnerId = getOwnerId();
  const categoryServices = services.filter(s => {
    const matchesCategory = s.categorySlug === id;
    const matchesSubCategory = activeSubCategory === 'all' || s.subCategory === activeSubCategory;
    const isVisible =
      s.status === 'approved' ||
      ((s.status === 'pending' || s.status === 'rejected') && s.ownerId === currentOwnerId);
    return matchesCategory && matchesSubCategory && isVisible;
  });
  // الرسم عبر النظام المركزي لحظة العرض — يضمن الأيقونة الصحيحة حتى لو وصل
  // icon كنص (من قاعدة البيانات/الكاش) بدلاً من الاعتماد على القيمة الجاهزة فقط.
  const Icon = typeof category.icon === 'function'
    ? category.icon
    : resolveCategoryIcon({ icon: category.icon, slug: category.slug || id, name: category.name, color: category.color }).icon;
  // Buttons/functional elements keep the theme accent palette (unchanged).
  // Only the category icon visuals switch to Red & White (no neon/glow).
  const colors = colorMap[category.color as keyof typeof colorMap] || colorMap['green'];
  const iconColors = colorMapRedWhite[category.color as keyof typeof colorMapRedWhite] || colorMapRedWhite['green'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 border-b pb-6 relative border-[var(--border)]">
        <Link to="/" className="p-2 rounded-full transition-colors hover:bg-[var(--accent-soft)] text-[var(--text-primary)]">
          <ArrowRight className="w-6 h-6" />
        </Link>
        <div className="w-12 h-12 rounded-xl bg-white border-2 border-[#D90429] flex items-center justify-center">
          {Icon && typeof Icon !== 'string' && <Icon className={`w-6 h-6 ${iconColors.text}`} />}
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-[var(--text-primary)]">
          <span style={{ color: 'var(--accent-primary)' }}>{category.name}</span>
          <MapPin className={`w-6 h-6 ${iconColors.text} animate-bounce`} />
        </h1>
        <span className="px-3 py-1 rounded-full text-sm font-bold bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          {categoryServices.filter(s => s.status === 'approved').length} {t('approved_services')}
        </span>
        
        <button
          onClick={() => setIsAddingService(true)}
          className={`mr-auto flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${colors.bg} text-[var(--accent-contrast)] ${colors.shadow} hover:scale-105`}
        >
          <UserPlus className="w-5 h-5" />
          {t('join_section')}
        </button>
      </div>

      {/* Car Sub-categories Filter */}
      {isCarSection && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {carSubCategories.map(sub => (
            <button
              key={sub.id}
              onClick={() => setActiveSubCategory(sub.id)}
              className={`px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap border ${
                activeSubCategory === sub.id 
                  ? `${colors.bg} text-[var(--accent-contrast)] border-transparent shadow-lg` 
                  : `bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]`
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Services List */}
      {categoryServices.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-[var(--bg-secondary)]">
            {Icon && typeof Icon !== 'string' && <Icon className="w-10 h-10 text-[var(--text-muted)]" />}
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('no_services_yet')}</h3>
          <p className="font-medium text-[var(--text-muted)]">{t('be_first')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {categoryServices.map(service => (
            <motion.div 
              key={service.slug} 
              layoutId={`service-${service.slug}`}
              onClick={() => setSelectedService(service)}
              className={`group relative border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col z-10 cursor-pointer bg-[var(--card)] border-[var(--border)] shadow-[var(--shadow)] ${service.status === 'pending' ? 'opacity-70 saturate-50' : ''} ${service.status === 'rejected' ? 'opacity-50 saturate-0' : ''}`}
            >
              {/* Status Badges */}
              {service.isOffline && (
                <div className="absolute top-2 left-2 z-20 bg-blue-500/90 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm animate-pulse">
                  أوفلاين
                </div>
              )}

              {/* Pending Status Badge */}
              {service.status === 'pending' && (
                <div className="absolute top-2 right-2 z-20 bg-yellow-500/90 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
                  <Hourglass className="w-3 h-3" />
                  ⏳ بانتظار موافقة الإدارة
                </div>
              )}

              {/* Rejected Status Badge */}
              {service.status === 'rejected' && (
                <div className="absolute top-2 right-2 z-20 bg-red-500/90 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  مرفوضة
                </div>
              )}

              {/* Simple Image Section */}
              <div className="aspect-square overflow-hidden relative">
                <SafeImage 
                  src={service.image} 
                  alt={service.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent`} />
                
                {/* Quick Call Action Overlay */}
                {service.phone && service.status === 'approved' && (
                  <a 
                    href={`tel:${service.phone}`}
                    className={`absolute bottom-2 right-2 p-2 rounded-full shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ${colors.bg} text-[var(--accent-contrast)]`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
              
              {/* Compact Info Section */}
              <div className="p-3 flex-1 flex flex-col justify-between gap-1">
                <h3 className="text-sm md:text-base font-bold line-clamp-1 text-[var(--text-primary)]">
                  {service.name}
                </h3>
                
                {service.profession && (
                  <p className="text-[10px] md:text-xs font-medium line-clamp-1 text-[var(--text-secondary)]">
                    {service.profession}
                  </p>
                )}

                {/* Pending Status Message */}
                {service.status === 'pending' && (
                  <p className="text-[10px] md:text-xs font-bold text-yellow-500 flex items-center gap-1">
                    <Hourglass className="w-3 h-3 shrink-0" />
                    ⏳ بانتظار موافقة الإدارة
                  </p>
                )}

                {/* Rejected Status Message */}
                {service.status === 'rejected' && (
                  <p className="text-[10px] md:text-xs font-bold text-red-500 flex items-center gap-1">
                    <XCircle className="w-3 h-3 shrink-0" />
                    مرفوضة {service.rejectionReason ? `- ${service.rejectionReason}` : ''}
                  </p>
                )}

                {/* Navigation Links (Compact) - Only for approved services */}
                {service.latitude && service.longitude && service.status === 'approved' && (
                  <div className="flex gap-1 mt-1">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center py-1 rounded-md text-[9px] font-bold bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
                    >
                      خرائط
                    </a>
                    <a 
                      href={`https://waze.com/ul?ll=${service.latitude},${service.longitude}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center py-1 rounded-md text-[9px] font-bold bg-[var(--bg-secondary)] text-[#33ccff] border border-[var(--border)]"
                    >
                      ويز
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {isAddingService && (
        <AddServiceModal 
          initialCategorySlug={category.slug} 
          onClose={() => setIsAddingService(false)} 
        />
      )}

      <AnimatePresence>
        {selectedService && (
          <ServiceDetailModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
            theme={theme}
            colors={colors}
          />
        )}
      </AnimatePresence>
    </div>
  );
}