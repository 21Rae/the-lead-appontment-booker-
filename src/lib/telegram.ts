const CHAT_IDS_STORAGE_KEY = 'matt_strategy_telegram_chat_ids';
const QUEUE_STORAGE_KEY = 'matt_strategy_telegram_queue';
const BOT_INFO_STORAGE_KEY = 'matt_strategy_telegram_bot_info';

export const AUTHORIZED_TELEGRAM_USERNAME = 'TokenPockeit';
let clientAuthorizedChatId: string | null = null;
const knownClientChatIds = new Set<string>();

function loadStoredChatIds(): string[] {
  try {
    const stored = localStorage.getItem(CHAT_IDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        clientAuthorizedChatId = parsed[0];
        return [parsed[0]];
      }
    }
  } catch {
    // ignore
  }
  return clientAuthorizedChatId ? [clientAuthorizedChatId] : [];
}

function saveStoredChatIds(chatId?: string | null) {
  try {
    if (chatId) {
      clientAuthorizedChatId = chatId;
      localStorage.setItem(CHAT_IDS_STORAGE_KEY, JSON.stringify([chatId]));
    } else {
      localStorage.removeItem(CHAT_IDS_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function getClientQueue(): string[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveClientQueue(queue: string[]) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(-50)));
  } catch {
    // ignore
  }
}

function enqueueClientMessage(text: string) {
  const q = getClientQueue();
  if (!q.includes(text)) {
    q.push(text);
    saveClientQueue(q);
  }
}

export function getClientTelegramToken(): string | null {
  const raw =
    (import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string) ||
    (import.meta.env.VITE_TELEGRAM_TOKEN as string) ||
    (typeof process !== 'undefined'
      ? process.env?.VITE_TELEGRAM_BOT_TOKEN ||
        process.env?.TELEGRAM_BOT_TOKEN ||
        process.env?.VITE_TELEGRAM_TOKEN ||
        process.env?.TELEGRAM_TOKEN
      : undefined) ||
    '';
  const cleaned = String(raw).trim().replace(/['"]+/g, '');
  return cleaned || null;
}

export async function getClientBotInfo(token: string): Promise<{ username: string; firstName: string }> {
  try {
    const cached = localStorage.getItem(BOT_INFO_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.username) return parsed;
    }
  } catch {
    // ignore
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (res.ok) {
      const data: any = await res.json();
      if (data?.ok && data.result) {
        const info = {
          username: data.result.username || 'MattStrategybot',
          firstName: data.result.first_name || 'Matt Strategy bot'
        };
        try {
          localStorage.setItem(BOT_INFO_STORAGE_KEY, JSON.stringify(info));
        } catch {
          // ignore
        }
        return info;
      }
    }
  } catch {
    // ignore
  }

  return { username: 'MattStrategybot', firstName: 'Matt Strategy bot' };
}

function extractChatId(update: any): string | null {
  const id =
    update?.message?.chat?.id ||
    update?.edited_message?.chat?.id ||
    update?.channel_post?.chat?.id ||
    update?.edited_channel_post?.chat?.id ||
    update?.my_chat_member?.chat?.id ||
    update?.chat_member?.chat?.id ||
    update?.callback_query?.message?.chat?.id ||
    update?.callback_query?.from?.id ||
    update?.message?.from?.id;
  return id ? String(id) : null;
}

async function sendDirectClientMessage(token: string, chatId: string, text: string): Promise<boolean> {
  // CRITICAL PRIVACY GUARD: Only allow dispatch to the verified @TokenPockeit account
  if (!clientAuthorizedChatId || chatId !== clientAuthorizedChatId) {
    console.warn(`[Security] Blocked client attempt to send to unauthorized chat ID: ${chatId}. Locked to @${AUTHORIZED_TELEGRAM_USERNAME}`);
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function flushClientQueue(token: string): Promise<void> {
  if (!clientAuthorizedChatId) return;
  const queue = getClientQueue();
  if (queue.length === 0) return;

  saveClientQueue([]);
  const failed: string[] = [];

  for (const msg of queue) {
    const ok = await sendDirectClientMessage(token, clientAuthorizedChatId, msg);
    if (!ok) failed.push(msg);
  }

  if (failed.length > 0) {
    saveClientQueue(failed);
  }
}

/**
 * Automatically discovers active chat for @TokenPockeit using the bot token.
 * Prevents non-authorized chats from ever receiving responses.
 */
export async function discoverClientBotChatIds(token?: string | null): Promise<string[]> {
  loadStoredChatIds();
  const activeToken = token || getClientTelegramToken();
  if (!activeToken) return clientAuthorizedChatId ? [clientAuthorizedChatId] : [];

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/getUpdates?limit=100`);
    const data: any = await res.json().catch(() => null);
    if (data?.error_code === 409) {
      await fetch(`https://api.telegram.org/bot${activeToken}/deleteWebhook`);
      await fetch(`https://api.telegram.org/bot${activeToken}/getUpdates?limit=100`);
    }
  } catch (err) {
    console.warn('Telegram client getUpdates auto-discovery error:', err);
  }

  if (clientAuthorizedChatId && getClientQueue().length > 0) {
    await flushClientQueue(activeToken);
  }

  return clientAuthorizedChatId ? [clientAuthorizedChatId] : [];
}

export interface TelegramConnectionStatus {
  configured: boolean;
  botUsername: string | null;
  botFirstName: string | null;
  connected: boolean;
  chatIds: string[];
  authorizedUsername?: string;
  ownerChatId?: string | null;
  ownerUsername?: string;
  isPrivateRestricted?: boolean;
  queuedCount: number;
}

export async function fetchTelegramConnectionStatus(): Promise<TelegramConnectionStatus> {
  // 1. Try backend endpoint first
  try {
    const res = await fetch('/api/telegram/status');
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const serverStatus: TelegramConnectionStatus = await res.json();
        if (serverStatus.ownerChatId) {
          saveStoredChatIds(serverStatus.ownerChatId);
        }

        const token = getClientTelegramToken();
        if (token && clientAuthorizedChatId && getClientQueue().length > 0) {
          await flushClientQueue(token);
        }

        return {
          ...serverStatus,
          authorizedUsername: AUTHORIZED_TELEGRAM_USERNAME,
          ownerUsername: AUTHORIZED_TELEGRAM_USERNAME,
          isPrivateRestricted: true,
          queuedCount: Math.max(serverStatus.queuedCount || 0, getClientQueue().length)
        };
      }
    }
  } catch {
    // Fallback to client-side check
  }

  const token = getClientTelegramToken();
  if (!token) {
    return {
      configured: false,
      botUsername: null,
      botFirstName: null,
      connected: false,
      chatIds: [],
      authorizedUsername: AUTHORIZED_TELEGRAM_USERNAME,
      ownerChatId: null,
      ownerUsername: AUTHORIZED_TELEGRAM_USERNAME,
      isPrivateRestricted: true,
      queuedCount: getClientQueue().length
    };
  }

  const botInfo = await getClientBotInfo(token);

  return {
    configured: true,
    botUsername: botInfo.username,
    botFirstName: botInfo.firstName,
    connected: !!clientAuthorizedChatId,
    chatIds: clientAuthorizedChatId ? [clientAuthorizedChatId] : [],
    authorizedUsername: AUTHORIZED_TELEGRAM_USERNAME,
    ownerChatId: clientAuthorizedChatId,
    ownerUsername: AUTHORIZED_TELEGRAM_USERNAME,
    isPrivateRestricted: true,
    queuedCount: getClientQueue().length
  };
}

export async function connectManualTelegramChatId(chatIdInput: string): Promise<{ ok: boolean; error?: string }> {
  const cleanId = chatIdInput.trim();
  if (!cleanId) return { ok: false, error: `Please enter Chat ID or @${AUTHORIZED_TELEGRAM_USERNAME}.` };

  try {
    const res = await fetch('/api/telegram/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: cleanId })
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.ok) {
          if (data.status?.ownerChatId) {
            saveStoredChatIds(data.status.ownerChatId);
          }
          const token = getClientTelegramToken();
          if (token && clientAuthorizedChatId) await flushClientQueue(token);
          return { ok: true };
        }
        return { ok: false, error: data.error };
      }
    }
  } catch {
    // Fallback to client direct
  }

  return {
    ok: false,
    error: `Please open @MattStrategybot in Telegram from your @${AUTHORIZED_TELEGRAM_USERNAME} account and tap Start.`
  };
}

export async function triggerTestTelegramPing(): Promise<{ ok: boolean; error?: string }> {
  const testMsg = [
    `🔔 <b>TEST MESSAGE FROM MATT STRATEGY APP</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ Your Telegram Bot integration is live and delivering form outputs!`,
    `🕒 <i>Sent: ${new Date().toUTCString()}</i>`
  ].join('\n');

  try {
    const res = await fetch('/api/telegram/test', { method: 'POST' });
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.ok) return { ok: true };
      }
    }
  } catch {
    // Fallback to client
  }

  const sent = await sendClientTelegramMessage(testMsg);
  if (sent) return { ok: true };
  return {
    ok: false,
    error: 'Waiting for you to tap Start or send a message to @MattStrategybot in Telegram.'
  };
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendClientTelegramMessage(text: string): Promise<boolean> {
  const token = getClientTelegramToken();
  if (!token) return false;

  const chatIds = await discoverClientBotChatIds(token);
  if (chatIds.length === 0) {
    enqueueClientMessage(text);
    return false;
  }

  let delivered = false;
  for (const chatId of chatIds) {
    const ok = await sendDirectClientMessage(token, chatId, text);
    if (ok) delivered = true;
  }

  if (!delivered) {
    enqueueClientMessage(text);
  }
  return delivered;
}

export async function notifyTelegramConsultationBooking(booking: {
  email: string;
  full_name?: string;
  phone?: string;
  selected_time_slot: string;
  consultant_name?: string;
  consultation_type?: string;
  conversation_id?: string;
  answers?: any[];
}): Promise<void> {
  const answersMap: Record<string, string> = {};
  if (booking.answers && Array.isArray(booking.answers)) {
    for (const a of booking.answers) {
      answersMap[a.question_id] = a.raw_answer || a.answer_label || a.answer_value;
    }
  }

  const lines: string[] = [
    `📅 <b>NEW CONSULTATION BOOKED</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Name:</b> ${escapeHtml(booking.full_name || 'Prospect')}`,
    `✉️ <b>Email:</b> ${escapeHtml(booking.email)}`,
    `📞 <b>Phone:</b> ${escapeHtml(booking.phone || 'Not provided')}`,
    `🕒 <b>Selected Slot:</b> ${escapeHtml(booking.selected_time_slot)}`,
    `👔 <b>Adviser:</b> ${escapeHtml(booking.consultant_name || 'Marcus Sterling, CFP®')}`,
    `📋 <b>Session Type:</b> ${escapeHtml(booking.consultation_type || '20-minute video discovery call')}`
  ];

  if (Object.keys(answersMap).length > 0) {
    lines.push(``, `📊 <b>FINANCIAL DISCOVERY DOSSIER</b>`, `━━━━━━━━━━━━━━━━━━━━━━`);
    if (answersMap['primary_goal']) lines.push(`🎯 <b>Primary Goal:</b> ${escapeHtml(answersMap['primary_goal'])}`);
    if (answersMap['goal_details']) lines.push(`📌 <b>Goal Details:</b> ${escapeHtml(answersMap['goal_details'])}`);
    if (answersMap['financial_situation']) lines.push(`💼 <b>Current Position:</b> ${escapeHtml(answersMap['financial_situation'])}`);
    if (answersMap['time_horizon']) lines.push(`⏳ <b>Time Horizon:</b> ${escapeHtml(answersMap['time_horizon'])}`);
    if (answersMap['investment_experience']) lines.push(`📈 <b>Experience:</b> ${escapeHtml(answersMap['investment_experience'])}`);
    if (answersMap['risk_concerns']) lines.push(`🛡️ <b>Risk Priorities:</b> ${escapeHtml(answersMap['risk_concerns'])}`);
    if (answersMap['existing_portfolio_focus']) lines.push(`🏦 <b>Portfolio Focus:</b> ${escapeHtml(answersMap['existing_portfolio_focus'])}`);
    if (answersMap['investment_amount']) lines.push(`💷 <b>Investable Assets:</b> ${escapeHtml(answersMap['investment_amount'])}`);
  }

  lines.push(``, `🕒 <i>Submitted: ${new Date().toUTCString()}</i>`);

  await sendClientTelegramMessage(lines.join('\n'));
}

export async function notifyTelegramEmailCaptured(params: {
  email: string;
  first_name?: string;
  phone?: string;
  source?: string;
  campaign?: string;
}): Promise<void> {
  const lines: string[] = [
    `🔔 <b>NEW VISITOR EMAIL CAPTURED</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✉️ <b>Email:</b> ${escapeHtml(params.email)}`,
    ...(params.first_name ? [`👤 <b>Name:</b> ${escapeHtml(params.first_name)}`] : []),
    ...(params.phone ? [`📞 <b>Phone:</b> ${escapeHtml(params.phone)}`] : []),
    `🌐 <b>Source:</b> ${escapeHtml(params.source || 'Direct')}`,
    ...(params.campaign ? [`📣 <b>Campaign:</b> ${escapeHtml(params.campaign)}`] : []),
    `🕒 <i>Captured: ${new Date().toUTCString()}</i>`
  ];

  await sendClientTelegramMessage(lines.join('\n'));
}

export async function notifyTelegramFormAnswer(params: {
  visitor?: any;
  conversation?: any;
  answers: any[];
  latestAnswer?: {
    question_id: string;
    question_text: string;
    answer_label: string;
  };
  freeTextMessage?: string;
}): Promise<void> {
  const { visitor, conversation, answers = [], latestAnswer, freeTextMessage } = params;
  const answersMap: Record<string, string> = {};
  for (const a of answers) {
    answersMap[a.question_id] = a.raw_answer || a.answer_label || a.answer_value;
  }

  const email = visitor?.email || answersMap['email'] || answersMap['email_capture'] || 'Visitor';
  const lines: string[] = [
    `📝 <b>FORM / QUESTIONNAIRE SUBMISSION</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✉️ <b>Visitor Email:</b> ${escapeHtml(email)}`,
    ...(visitor?.first_name ? [`👤 <b>Name:</b> ${escapeHtml(visitor.first_name)}`] : []),
    ...(latestAnswer
      ? [
          `❓ <b>Field:</b> ${escapeHtml(latestAnswer.question_id)}`,
          `✅ <b>Selected / Entered:</b> ${escapeHtml(latestAnswer.answer_label)}`
        ]
      : []),
    ...(freeTextMessage ? [`💬 <b>Direct Message:</b> ${escapeHtml(freeTextMessage)}`] : []),
    ``,
    `📂 <b>CAPTURED FORM FIELDS (${answers.length})</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`
  ];

  const fieldLabels: Record<string, string> = {
    primary_goal: '🎯 Primary Goal',
    goal_details: '📌 Goal Details',
    financial_situation: '💼 Current Situation',
    time_horizon: '⏳ Time Horizon',
    investment_experience: '📈 Experience',
    risk_concerns: '🛡️ Risk Priorities',
    existing_portfolio_focus: '🏦 Portfolio Focus',
    investment_amount: '💷 Investment Amount',
    summary_confirmation: '✔️ Summary Confirmed',
    adviser_conversion: '🤝 Next Step Choice',
    adviser_conversion_choice: '🤝 Next Step Choice',
    email_capture: '📧 Captured Email'
  };

  for (const [key, val] of Object.entries(answersMap)) {
    const label = fieldLabels[key] || `• ${key}`;
    lines.push(`<b>${escapeHtml(label)}:</b> ${escapeHtml(val)}`);
  }

  if (conversation?.booking_slot || conversation?.booked_slot) {
    lines.push(`<b>📅 Booking Slot:</b> ${escapeHtml(conversation.booking_slot || conversation.booked_slot)}`);
  }

  lines.push(``, `🕒 <i>Updated: ${new Date().toUTCString()}</i>`);

  await sendClientTelegramMessage(lines.join('\n'));
}
