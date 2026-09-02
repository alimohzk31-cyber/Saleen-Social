import { supabase } from '../lib/supabase';
import { getOwnerId } from './useServices';

// Message types supported by the contact form
export type ContactMessageType =
  | 'bug'
  | 'suggestion'
  | 'advice'
  | 'complaint'
  | 'other';

// Status values used by the admin panel
export type ContactMessageStatus = 'new' | 'review' | 'resolved';

export const MESSAGE_TYPES: { value: ContactMessageType; label: string }[] = [
  { value: 'bug', label: 'مشكلة في البرنامج' },
  { value: 'suggestion', label: 'اقتراح' },
  { value: 'advice', label: 'نصيحة' },
  { value: 'complaint', label: 'شكوى' },
  { value: 'other', label: 'ملاحظة أخرى' },
];

export const MESSAGE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  MESSAGE_TYPES.map(t => [t.value, t.label])
);

export const MESSAGE_STATUS_LABELS: Record<ContactMessageStatus, string> = {
  new: 'جديدة',
  review: 'قيد المراجعة',
  resolved: 'تم الحل',
};

export interface ContactMessage {
  id: number;
  message_type: string;
  message: string;
  image_url?: string | null;
  owner_id?: string | null;
  status: string;
  created_at?: string | null;
}

// Identify the user. The project has no real login system for regular users,
// so we reuse the same device-based owner identity used across the app.
export function getUserOwnerId(): string {
  return getOwnerId();
}

// Send a new message straight into public.contact_messages.
// No mock/offline fallback: if the table is missing we surface the real error
// so the user knows to run the migration.
export async function sendContactMessage(input: {
  message_type: ContactMessageType;
  message: string;
  image_url?: string | null;
}): Promise<ContactMessage> {
  const { data, error } = await supabase
    .from('contact_messages')
    .insert({
      message_type: input.message_type,
      message: input.message,
      image_url: input.image_url || null,
      owner_id: getUserOwnerId(),
      status: 'new',
    })
    .select()
    .single();

  if (error) {
    console.error('[Contact] send failed:', {
      message: error.message, code: error.code, details: error.details, hint: error.hint,
    });
    throw error;
  }
  return data as ContactMessage;
}

// Fetch all messages (newest first) for the admin panel.
export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Contact] fetch failed:', {
      message: error.message, code: error.code, details: error.details, hint: error.hint,
    });
    throw error;
  }
  return (data as ContactMessage[]) || [];
}

// Update the status of a message (admin panel).
export async function updateContactMessageStatus(
  id: number,
  status: ContactMessageStatus
): Promise<void> {
  const { error } = await supabase
    .from('contact_messages')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('[Contact] status update failed:', {
      message: error.message, code: error.code, details: error.details, hint: error.hint,
    });
    throw error;
  }
}