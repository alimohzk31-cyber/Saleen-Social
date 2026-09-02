import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, RefreshCw, Inbox, Calendar, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  ContactMessage,
  fetchContactMessages,
  updateContactMessageStatus,
  MESSAGE_TYPE_LABELS,
  MESSAGE_STATUS_LABELS,
  ContactMessageStatus,
} from '../hooks/useContactMessages';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-[var(--accent-soft)] text-[var(--accent-primary)]',
  review: 'bg-amber-500/10 text-amber-600',
  resolved: 'bg-emerald-500/10 text-emerald-600',
};

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('ar', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function MessagesManager() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchContactMessages();
      setMessages(rows);
    } catch (e: any) {
      console.error('[MessagesManager] load error:', e?.message, e?.code);
      const code = e?.code;
      const isTableMissing = code === '42P01' || code === 'PGRST205';
      setError(
        isTableMissing
          ? 'جدول المراسلات غير موجود بعد في قاعدة البيانات. يرجى تنفيذ ملف المهاجرة (supabase_add_contact_messages.sql).'
          : `تعذر تحميل الرسائل: ${e?.message || 'خطأ غير معروف'}`
      );
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (msg: ContactMessage, status: ContactMessageStatus) => {
    if (!msg.id || updatingId !== null) return;
    if (status === msg.status) return;
    setUpdatingId(msg.id);
    try {
      await updateContactMessageStatus(msg.id, status);
      setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, status } : m)));
    } catch (e: any) {
      console.error('[MessagesManager] status update error:', e?.message, e?.code);
      alert(`تعذر تحديث حالة الرسالة: ${e?.message || 'خطأ غير معروف'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const card = `border rounded-2xl p-4 transition-colors bg-[var(--card)] border-[var(--border)] shadow-sm`;
  const label = `text-[var(--text-muted)]`;

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6">
      <div className={`flex items-center justify-between border-b pb-4 border-[var(--border)]`}>
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[var(--accent-primary)]" />
          <h2 className={`text-2xl font-bold text-[var(--text-primary)]`}>
            المراسلات والمقترحات
          </h2>
          <span className={`text-xs px-2 py-1 rounded-lg font-bold bg-[var(--surface-elevated)] text-[var(--text-secondary)]`}>
            {messages.length} رسالة
          </span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--accent-light)] disabled:opacity-50`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>
{error && (
        <div className={`border rounded-2xl p-6 text-center font-bold bg-[var(--card)] border-red-200 text-red-600`}>
          {error}
        </div>
      )}

      {!error && loading && (
        <div className={`text-center py-16 rounded-2xl border text-[var(--text-muted)] bg-[var(--card)] border-[var(--border)]`}>
          <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-30 animate-spin" />
          <p className="text-lg font-bold">جارٍ تحميل الرسائل...</p>
        </div>
      )}

      {!error && !loading && messages.length === 0 && (
        <div className={`text-center py-16 rounded-2xl border text-[var(--text-muted)] bg-[var(--card)] border-[var(--border)]`}>
          <Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-bold">لا توجد رسائل بعد</p>
        </div>
      )}

      {!error && !loading && messages.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {messages.map(msg => {
            const typeLabel = MESSAGE_TYPE_LABELS[msg.message_type] || msg.message_type || 'ملاحظة أخرى';
            const statusLabel = (MESSAGE_STATUS_LABELS as any)[msg.status] || msg.status;
            const statusColor = STATUS_COLORS[msg.status] || 'bg-white/10 text-[var(--text-muted)]';
            const hasImage = !!msg.image_url;
            return (
              <div key={String(msg.id)} className={card}>
                <div className="flex flex-col sm:flex-row gap-4">
                  {hasImage && (
                    <div className="shrink-0">
                      <div className={`relative border rounded-xl overflow-hidden border-[var(--border)]`}>
                        <img src={msg.image_url!} alt="مرفق" className="w-full sm:w-36 h-28 object-cover" />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-lg font-bold bg-[var(--surface-elevated)] text-[var(--text-secondary)]`}>
                        {typeLabel}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-lg font-bold ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <div className={`flex items-center gap-1 text-xs ${label}`}>
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(msg.created_at)}</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${label}`}>
                        <Clock className="w-3 h-3" />
                        <span dir="ltr">{msg.owner_id || 'زائر'}</span>
                      </div>
                    </div>
                    <p className={`text-sm whitespace-pre-wrap break-words text-[var(--text-primary)]`}>
                      {msg.message}
                    </p>
                  </div>
                  <div className="flex sm:flex-col gap-2 shrink-0 justify-center">
                    <select
                      value={msg.status || 'new'}
                      disabled={updatingId !== null}
                      onChange={(e) => changeStatus(msg, e.target.value as ContactMessageStatus)}
                      className={`border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent-primary)] transition-all bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)] disabled:opacity-50`}
                    >
                      {Object.entries(MESSAGE_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}