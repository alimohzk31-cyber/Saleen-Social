import { useState, useEffect } from 'react';
import { Bell, Package, MessageCircle, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../context/ServicesContext';
import { fetchComments, Comment } from '../hooks/useComments';
import { motion } from 'motion/react';

interface NotificationItem {
  id: string;
  type: 'service' | 'comment';
  title: string;
  message: string;
  timeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  onClick: () => void;
}

const ICON_COLORS = {
  service: '#3B82F6', // blue-500
  comment: '#14B8A8', // teal-500
} as const;

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `قبل ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  return `قبل ${diffDays} يوم`;
}

export default function NotificationsPopup({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { services } = useServices();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, [services]);

  const loadNotifications = async () => {
    setLoading(true);
    const items: NotificationItem[] = [];

    // Recent approved services — reuses existing ServicesContext data (Supabase RLS)
    const recentServices = services
      .filter((s) => s.status === 'approved')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    recentServices.forEach((service) => {
      items.push({
        id: `service-${service.id ?? service.slug}`,
        type: 'service',
        title: 'خدمة جديدة',
        message: `${service.name}${service.profession ? ` - ${service.profession}` : ''}`,
        timeLabel: formatTimeAgo(service.createdAt),
        icon: Package,
        iconColor: ICON_COLORS.service,
        onClick: () => {
          navigate(`/category/${service.categorySlug}`);
          onClose();
        },
      });
    });

    // Recent comments — reuses existing comments table via fetchComments (Supabase ONLY)
    try {
      const comments: Comment[] = await fetchComments(5);
      comments.forEach((comment) => {
        const content = comment.content || '';
        items.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          title: 'تعليق جديد',
          message:
            content.length > 60
              ? content.substring(0, 60) + '...'
              : content,
          timeLabel: comment.created_at
            ? formatTimeAgo(new Date(comment.created_at).getTime())
            : 'الآن',
          icon: MessageCircle,
          iconColor: ICON_COLORS.comment,
          onClick: () => onClose(),
        });
      });
    } catch (e: any) {
      console.error('[NotificationsPopup] failed to load comments:', e?.message || e);
    }

    setNotifications(items);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md border rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden bg-[var(--surface-elevated)] border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-elevated)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">الإشعارات</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-[var(--text-muted)]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>جاري تحميل الإشعارات...</span>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد إشعارات جديدة</p>
              <p className="text-sm mt-1">سيتم إظهار الإشعارات هنا عند توفرها</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <motion.button
                key={notif.id}
                onClick={notif.onClick}
                className="w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--accent-soft)] border-b border-[var(--border)] last:border-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div
                  className="mt-0.5 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${notif.iconColor}20`, color: notif.iconColor }}
                >
                  <notif.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--text-primary)]">{notif.title}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                    {notif.message}
                  </p>
                </div>
                <div className="flex-shrink-0 mt-0.5 text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {notif.timeLabel}
                </div>
              </motion.button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
