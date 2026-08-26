import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Visitor,
  Conversation,
  ConversationAnswer
} from '../src/types';

let supabaseServerClient: SupabaseClient | null = null;

function normalizeSupabaseUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  // Remove any trailing slashes, quotes, or accidental path segments like /rest/v1 or /dashboard
  url = url.replace(/['"]+/g, '');
  url = url.replace(/\/rest\/v1\/?$/, '');
  url = url.replace(/\/v1\/?$/, '');
  url = url.replace(/\/$/, '');
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

function normalizeKey(rawKey: string): string {
  return rawKey.trim().replace(/['"]+/g, '');
}

/**
 * Returns the initialized Supabase client if credentials exist in environment variables.
 * Uses lazy initialization so that the server starts normally even before credentials are set.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (supabaseServerClient) {
    return supabaseServerClient;
  }

  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!rawUrl || !rawKey) {
    return null;
  }

  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  const supabaseKey = normalizeKey(rawKey);

  try {
    supabaseServerClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return supabaseServerClient;
  } catch (err: any) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Checks connection health to Supabase database.
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  configured: boolean;
  url?: string;
  error?: string | null;
}> {
  const client = getSupabaseServerClient();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  if (!client || !supabaseUrl) {
    return {
      connected: false,
      configured: false,
      error: 'Supabase credentials not configured in environment variables (SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).'
    };
  }

  try {
    const { error } = await client.from('visitors').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        return {
          connected: true,
          configured: true,
          url: supabaseUrl,
          error: 'Connected to Supabase, but "visitors" table has not been created yet. Run supabase_schema.sql in your Supabase SQL Editor.'
        };
      }
      return {
        connected: false,
        configured: true,
        url: supabaseUrl,
        error: error.message
      };
    }

    return {
      connected: true,
      configured: true,
      url: supabaseUrl,
      error: null
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      url: supabaseUrl,
      error: err.message
    };
  }
}

/**
 * Syncs user answers directly to the single `visitors` table using `email` as PRIMARY KEY.
 */
export async function syncLeadSubmissionToSupabase(params: {
  visitor?: Visitor | null;
  conversation?: Conversation | null;
  answers: ConversationAnswer[];
}): Promise<void> {
  const client = getSupabaseServerClient();
  if (!client) return;

  const conv = params.conversation;
  const visitor = params.visitor;
  const answers = params.answers || [];

  // Map each question_id to its answer display label or raw value
  const answersMap: Record<string, string> = {};
  let detectedEmail: string | null = visitor?.email || null;
  let detectedFirstName: string | null = visitor?.first_name || null;
  let detectedLastName: string | null = visitor?.last_name || null;
  let detectedPhone: string | null = visitor?.phone || null;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  for (const a of answers) {
    const val = a.raw_answer || a.answer_label || a.answer_value;
    answersMap[a.question_id] = val;

    if (!detectedEmail && val) {
      const match = val.match(emailRegex);
      if (match) detectedEmail = match[0];
    }
  }

  // Look for email in answers map
  const finalEmail = detectedEmail || answersMap['email'] || answersMap['email_capture_input'] || null;

  if (!finalEmail) {
    // If no email yet, we cannot write with email as primary key
    return;
  }

  const payload = {
    email: finalEmail.toLowerCase().trim(),
    first_name: detectedFirstName || answersMap['first_name'] || null,
    last_name: detectedLastName || answersMap['last_name'] || null,
    phone: detectedPhone || answersMap['phone'] || null,

    // Question Columns
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
  };

  try {
    const { error } = await client.from('visitors').upsert(payload, { onConflict: 'email' });
    if (error) {
      console.warn('Supabase visitors upsert error:', error.message || error);
    } else {
      console.log('✅ Supabase visitors table updated for:', payload.email);
    }
  } catch (err) {
    console.warn('Supabase visitors sync exception:', err);
  }
}

/**
 * Direct sync for visitor profile updates
 */
export async function syncVisitorToSupabase(visitor: Visitor): Promise<void> {
  if (!visitor.email) return;
  const client = getSupabaseServerClient();
  if (!client) return;

  try {
    await client.from('visitors').upsert(
      {
        email: visitor.email.toLowerCase().trim(),
        first_name: visitor.first_name || null,
        last_name: visitor.last_name || null,
        phone: visitor.phone || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'email' }
    );
  } catch (err) {
    console.warn('Supabase visitor sync error:', err);
  }
}

/**
 * Syncs consultation form bookings to the consultations table
 */
export async function syncConsultationToSupabase(booking: {
  email: string;
  full_name?: string;
  phone?: string;
  selected_time_slot: string;
  consultant_name?: string;
  consultation_type?: string;
  conversation_id?: string;
}): Promise<void> {
  if (!booking.email) return;
  const client = getSupabaseServerClient();
  if (!client) return;

  try {
    const { error } = await client.from('consultations').insert({
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

    if (error) {
      console.warn('Supabase consultation insert error:', error.message || error);
    } else {
      console.log('✅ Supabase consultation saved for:', booking.email);
    }
  } catch (err) {
    console.warn('Supabase consultation sync exception:', err);
  }
}

// Retain empty/noop stubs for unused tables to maintain clean imports
export async function syncConversationToSupabase(_conv: Conversation): Promise<void> {}
export async function syncAnswerToSupabase(_answer: ConversationAnswer): Promise<void> {}
export async function syncMessageToSupabase(_msg: any): Promise<void> {}
export async function syncChatMessageToSupabase(_msg: any): Promise<void> {}
export async function syncEventToSupabase(_event: any): Promise<void> {}
