import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function normalizeClientUrl(rawUrl: string): string {
  let url = rawUrl.trim().replace(/['"]+/g, '');
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/v1\/?$/, '').replace(/\/$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  // Access public environment variables safe for Vite frontend
  const rawUrl =
    (import.meta.env.VITE_SUPABASE_URL as string) ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
    
  const rawKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);

  if (!rawUrl || !rawKey) {
    return null;
  }

  const supabaseUrl = normalizeClientUrl(rawUrl);
  const supabaseAnonKey = rawKey.trim().replace(/['"]+/g, '');

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (err) {
    console.warn('Could not initialize client-side Supabase instance:', err);
    return null;
  }
}

export async function checkSupabaseStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  message: string;
}> {
  try {
    const res = await fetch('/api/supabase/status');
    if (res.ok) {
      const data = await res.json();
      return {
        configured: data.configured,
        connected: data.connected,
        message: data.error || (data.connected ? 'Connected to Supabase' : 'Not configured')
      };
    }
  } catch (e) {
    // API not reachable
  }

  // Fallback to client config check
  const client = getSupabaseClient();
  if (!client) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase credentials not configured in environment variables'
    };
  }

  return {
    configured: true,
    connected: true,
    message: 'Client-side Supabase credentials configured'
  };
}

export async function logVisitorToSupabase(visitor: any) {
  if (!visitor?.email) return;
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('visitors').upsert({
      email: visitor.email.toLowerCase().trim(),
      first_name: visitor.first_name || null,
      last_name: visitor.last_name || null,
      phone: visitor.phone || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });
  } catch (e) {
    console.warn('Supabase visitor log skipped/failed:', e);
  }
}

export async function logLeadSubmissionToSupabase(data: {
  visitor: any;
  conversation: any;
  answers: any[];
}) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { visitor, conversation: conv, answers } = data;
    const answersMap: Record<string, string> = {};
    for (const a of answers) {
      answersMap[a.question_id] = a.raw_answer || a.answer_label || a.answer_value;
    }

    const email = visitor?.email || answersMap['email'] || answersMap['email_capture_input'] || null;
    if (!email) return;

    await client.from('visitors').upsert({
      email: email.toLowerCase().trim(),
      first_name: visitor?.first_name || answersMap['first_name'] || null,
      last_name: visitor?.last_name || answersMap['last_name'] || null,
      phone: visitor?.phone || answersMap['phone'] || null,

      primary_goal: answersMap['primary_goal'] || null,
      goal_details: answersMap['goal_details'] || null,
      financial_situation: answersMap['financial_situation'] || null,
      time_horizon: answersMap['time_horizon'] || null,
      investment_experience: answersMap['investment_experience'] || null,
      risk_concerns: answersMap['risk_concerns'] || null,
      existing_portfolio_focus: answersMap['existing_portfolio_focus'] || null,
      investment_amount: answersMap['investment_amount'] || null,
      summary_confirmation: answersMap['summary_confirmation'] || null,
      adviser_conversion_choice: answersMap['adviser_conversion_choice'] || null,
      booking_slot: conv?.booking_slot || answersMap['booking_slot'] || null,

      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });
  } catch (e) {
    console.warn('Supabase lead_submissions log skipped/failed:', e);
  }
}

export async function logConsultationToSupabase(booking: {
  email: string;
  full_name?: string;
  phone?: string;
  selected_time_slot: string;
  consultant_name?: string;
  consultation_type?: string;
  conversation_id?: string;
}) {
  if (!booking?.email) return;
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('consultations').insert({
      email: booking.email.toLowerCase().trim(),
      full_name: booking.full_name || null,
      phone: booking.phone || null,
      selected_time_slot: booking.selected_time_slot,
      consultant_name: booking.consultant_name || 'Marcus Sterling, CFP®',
      consultation_type: booking.consultation_type || '20-minute video discovery call',
      status: 'confirmed',
      conversation_id: booking.conversation_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Supabase consultation log skipped/failed:', e);
  }
}

export async function logConversationToSupabase(_conversation: any) {}
export async function logEventToSupabase(_event: any) {}
export async function logAnswerToSupabase(_answer: any) {}
export async function logChatMessageToSupabase(_msg: any) {}
