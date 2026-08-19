/**
 * Visitor Identification & Tracking Utility
 * Generates and preserves unique visitor_id across sessions, cookies, and local storage.
 */

export interface TrackingParams {
  source?: string;
  campaign?: string;
  medium?: string;
  content?: string;
  cta?: string;
  landing_page?: string;
  referrer?: string;
}

const VISITOR_ID_KEY = 'fca_visitor_id';
const CONVERSATION_ID_KEY = 'fca_conversation_id';

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'visitor_' + Math.random().toString(36).substr(2, 9);

  // Check URL query first (if passed via cross-link)
  const urlParams = new URLSearchParams(window.location.search);
  const paramVisitorId = urlParams.get('visitor_id');
  if (paramVisitorId) {
    localStorage.setItem(VISITOR_ID_KEY, paramVisitorId);
    setCookie(VISITOR_ID_KEY, paramVisitorId, 365);
    return paramVisitorId;
  }

  // Check localStorage
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (visitorId) return visitorId;

  // Check Cookie
  visitorId = getCookie(VISITOR_ID_KEY);
  if (visitorId) {
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
    return visitorId;
  }

  // Generate new UUID v4-like ID
  visitorId = 'v_' + crypto.randomUUID?.() || 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(VISITOR_ID_KEY, visitorId);
  setCookie(VISITOR_ID_KEY, visitorId, 365);
  return visitorId;
}

export function getActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONVERSATION_ID_KEY);
}

export function setActiveConversationId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONVERSATION_ID_KEY, id);
}

export function clearActiveConversationId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONVERSATION_ID_KEY);
}

export function resetVisitorIdentity(): string {
  if (typeof window === 'undefined') return '';
  localStorage.removeItem(VISITOR_ID_KEY);
  localStorage.removeItem(CONVERSATION_ID_KEY);
  deleteCookie(VISITOR_ID_KEY);
  return getOrCreateVisitorId();
}

export function extractTrackingParams(): TrackingParams {
  if (typeof window === 'undefined') return {};

  const searchParams = new URLSearchParams(window.location.search);

  const campaign = searchParams.get('campaign') || searchParams.get('utm_campaign') || undefined;
  const source = searchParams.get('source') || searchParams.get('utm_source') || (campaign ? 'email' : 'website');
  const medium = searchParams.get('medium') || searchParams.get('utm_medium') || (campaign ? 'email' : 'direct');
  const content = searchParams.get('content') || searchParams.get('cta') || searchParams.get('utm_content') || undefined;
  const cta = searchParams.get('cta') || undefined;

  return {
    source,
    campaign,
    medium,
    content,
    cta,
    landing_page: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined
  };
}

function setCookie(name: string, value: string, days: number) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) {
    // Ignore cookie errors
  }
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  } catch (e) {
    return null;
  }
}

function deleteCookie(name: string) {
  try {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
  } catch (e) {
    // Ignore
  }
}
