import fs from 'fs';
import path from 'path';
import { Visitor, Conversation, ConversationAnswer } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'telegram_state.json');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface TelegramPersistedState {
  chatIds: string[];
  botUsername: string | null;
  botFirstName: string | null;
  pendingQueue: string[];
  seededInitialDbSubmission: boolean;
}

const DEFAULT_OWNER_CHAT_IDS = ['8808224123'];

const state: TelegramPersistedState = {
  chatIds: [...DEFAULT_OWNER_CHAT_IDS],
  botUsername: 'MattStrategybot',
  botFirstName: 'Matt Strategy bot',
  pendingQueue: [],
  seededInitialDbSubmission: false
};

function loadState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.chatIds)) {
        state.chatIds = Array.from(new Set([...DEFAULT_OWNER_CHAT_IDS, ...parsed.chatIds.map(String)]));
      }
      if (parsed.botUsername) state.botUsername = parsed.botUsername;
      if (parsed.botFirstName) state.botFirstName = parsed.botFirstName;
      if (Array.isArray(parsed.pendingQueue)) {
        state.pendingQueue = parsed.pendingQueue;
      }
      if (parsed.seededInitialDbSubmission) {
        state.seededInitialDbSubmission = true;
      }
    }
  } catch (err) {
    console.warn('Failed to load telegram_state.json:', err);
  }

  // If we haven't seeded existing recent submissions from db.json into pendingQueue yet, do so
  if (!state.seededInitialDbSubmission) {
    try {
      if (fs.existsSync(DB_FILE)) {
        const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        const visitors = Object.values(dbData.visitors || {}) as Visitor[];
        const allAnswers = Object.values(dbData.answers || {}) as ConversationAnswer[];
        const realVisitors = visitors.filter((v) => v.visitor_id !== 'demo-visitor-101');

        for (const v of realVisitors) {
          const vAnswers = allAnswers.filter((a) => a.visitor_id === v.visitor_id);
          if (v.email || vAnswers.length > 0) {
            const msg = formatLeadProfileMessage({
              visitor: v,
              answers: vAnswers
            });
            if (!state.pendingQueue.includes(msg)) {
              state.pendingQueue.push(msg);
            }
          }
        }
      }
      state.seededInitialDbSubmission = true;
      saveState();
    } catch {
      // ignore
    }
  }
}

function saveState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save telegram_state.json:', err);
  }
}

loadState();

export function getTelegramToken(): string | null {
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN ||
    process.env.VITE_TELEGRAM_BOT_TOKEN ||
    process.env.VITE_TELEGRAM_TOKEN ||
    '';
  const cleaned = token.trim().replace(/['"]+/g, '');
  return cleaned || null;
}

export async function ensureBotIdentity(token: string): Promise<{ username: string | null; firstName: string | null }> {
  if (state.botUsername) {
    return { username: state.botUsername, firstName: state.botFirstName };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (res.ok) {
      const data: any = await res.json();
      if (data?.ok && data.result) {
        state.botUsername = data.result.username || null;
        state.botFirstName = data.result.first_name || null;
        saveState();
      }
    }
  } catch {
    // ignore
  }
  return { username: state.botUsername, firstName: state.botFirstName };
}

function extractChatIdFromUpdate(update: any): string | null {
  const chatId =
    update?.message?.chat?.id ||
    update?.edited_message?.chat?.id ||
    update?.channel_post?.chat?.id ||
    update?.edited_channel_post?.chat?.id ||
    update?.my_chat_member?.chat?.id ||
    update?.chat_member?.chat?.id ||
    update?.callback_query?.message?.chat?.id ||
    update?. callback_query?.from?.id ||
    update?.message?.from?.id;
  return chatId ? String(chatId) : null;
}

/**
 * Discovers all active chats/users who have interacted with the bot
 * using ONLY the TELEGRAM_BOT_TOKEN, and flushes any queued form messages.
 */
export async function discoverBotChatIds(token?: string | null): Promise<string[]> {
  const activeToken = token || getTelegramToken();
  if (!activeToken) return state.chatIds;

  await ensureBotIdentity(activeToken);

  const newlyDiscovered: string[] = [];

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/getUpdates?limit=100`);
    const data: any = await res.json().catch(() => null);

    if (data?.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        const chatId = extractChatIdFromUpdate(update);
        if (chatId && !state.chatIds.includes(chatId)) {
          state.chatIds.push(chatId);
          newlyDiscovered.push(chatId);
        }
      }
    } else if (data?.error_code === 409) {
      // Clear any conflicting webhook so getUpdates works
      await fetch(`https://api.telegram.org/bot${activeToken}/deleteWebhook`);
      const retryRes = await fetch(`https://api.telegram.org/bot${activeToken}/getUpdates?limit=100`);
      const retryData: any = await retryRes.json().catch(() => null);
      if (retryData?.ok && Array.isArray(retryData.result)) {
        for (const update of retryData.result) {
          const chatId = extractChatIdFromUpdate(update);
          if (chatId && !state.chatIds.includes(chatId)) {
            state.chatIds.push(chatId);
            newlyDiscovered.push(chatId);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Telegram getUpdates discovery error:', err);
  }

  if (newlyDiscovered.length > 0) {
    saveState();
    // Send immediate welcome message to newly linked chat(s)
    for (const chatId of newlyDiscovered) {
      await sendDirectToChatId(
        activeToken,
        chatId,
        [
          `✅ <b>Matt Strategy Bot Connected!</b>`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `🤖 <b>Bot:</b> @${state.botUsername || 'MattStrategybot'}`,
          `🆔 <b>Linked Chat ID:</b> <code>${chatId}</code>`,
          `📬 All live form submissions, questionnaire answers, and consultation bookings will now be delivered directly to this chat.`
        ].join('\n')
      );
    }
  }

  // If we have chatIds and pending messages, flush the queue
  if (state.chatIds.length > 0 && state.pendingQueue.length > 0) {
    await flushPendingQueue(activeToken);
  }

  return state.chatIds;
}

async function sendDirectToChatId(token: string, chatId: string, text: string): Promise<boolean> {
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
    if (res.ok) return true;
    const errBody: any = await res.json().catch(() => ({}));
    console.warn(`Telegram sendMessage failed for chat ${chatId}:`, errBody?.description || res.status);
    return false;
  } catch (err) {
    console.warn(`Telegram sendMessage network error for chat ${chatId}:`, err);
    return false;
  }
}

async function flushPendingQueue(token: string): Promise<void> {
  if (state.chatIds.length === 0 || state.pendingQueue.length === 0) return;

  const queueCopy = [...state.pendingQueue];
  state.pendingQueue = [];
  saveState();

  for (const msg of queueCopy) {
    let sent = false;
    for (const chatId of state.chatIds) {
      const ok = await sendDirectToChatId(token, chatId, msg);
      if (ok) sent = true;
    }
    if (!sent) {
      state.pendingQueue.push(msg);
    }
  }
  saveState();
}

export async function addManualChatId(chatIdInput: string): Promise<{ ok: boolean; error?: string }> {
  const token = getTelegramToken();
  if (!token) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured.' };
  }
  const cleanId = chatIdInput.trim();
  if (!cleanId) {
    return { ok: false, error: 'Please provide a valid Chat ID or @channel username.' };
  }

  const testOk = await sendDirectToChatId(
    token,
    cleanId,
    [
      `✅ <b>Matt Strategy Bot Connected!</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🆔 <b>Linked Chat:</b> <code>${escapeHtml(cleanId)}</code>`,
      `📬 Form outputs will now be delivered here immediately.`
    ].join('\n')
  );

  if (!testOk) {
    return {
      ok: false,
      error: `Telegram could not message "${cleanId}". Make sure you have tapped Start on @${state.botUsername || 'MattStrategybot'} in Telegram first.`
    };
  }

  if (!state.chatIds.includes(cleanId)) {
    state.chatIds.push(cleanId);
    saveState();
  }

  await flushPendingQueue(token);
  return { ok: true };
}

export async function getTelegramBotStatus() {
  const token = getTelegramToken();
  if (!token) {
    return {
      configured: false,
      botUsername: null,
      botFirstName: null,
      connected: false,
      chatIds: [],
      queuedCount: state.pendingQueue.length
    };
  }

  await discoverBotChatIds(token);

  return {
    configured: true,
    botUsername: state.botUsername || 'MattStrategybot',
    botFirstName: state.botFirstName || 'Matt Strategy bot',
    connected: state.chatIds.length > 0,
    chatIds: state.chatIds,
    queuedCount: state.pendingQueue.length
  };
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = getTelegramToken();
  if (!token) {
    return false;
  }

  const chatIds = await discoverBotChatIds(token);
  if (chatIds.length === 0) {
    // Queue the message so it is automatically delivered the instant the user starts the bot
    if (!state.pendingQueue.includes(text)) {
      state.pendingQueue.push(text);
      if (state.pendingQueue.length > 50) {
        state.pendingQueue.shift();
      }
      saveState();
    }
    return false;
  }

  let delivered = false;
  for (const chatId of chatIds) {
    const ok = await sendDirectToChatId(token, chatId, text);
    if (ok) {
      delivered = true;
    }
  }

  if (!delivered) {
    if (!state.pendingQueue.includes(text)) {
      state.pendingQueue.push(text);
      saveState();
    }
  }

  return delivered;
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendConsultationBookingToTelegram(params: {
  email: string;
  full_name?: string;
  phone?: string;
  selected_time_slot: string;
  consultant_name?: string;
  consultation_type?: string;
  conversation_id?: string;
  answers?: ConversationAnswer[];
}): Promise<boolean> {
  const answersMap: Record<string, string> = {};
  if (params.answers && Array.isArray(params.answers)) {
    for (const a of params.answers) {
      answersMap[a.question_id] = a.raw_answer || a.answer_label || a.answer_value;
    }
  }

  const lines: string[] = [
    `📅 <b>NEW CONSULTATION BOOKED</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Name:</b> ${escapeHtml(params.full_name || 'Prospect')}`,
    `✉️ <b>Email:</b> ${escapeHtml(params.email)}`,
    `📞 <b>Phone:</b> ${escapeHtml(params.phone || 'Not provided')}`,
    `🕒 <b>Selected Slot:</b> ${escapeHtml(params.selected_time_slot)}`,
    `👔 <b>Adviser:</b> ${escapeHtml(params.consultant_name || 'Marcus Sterling, CFP®')}`,
    `📋 <b>Session Type:</b> ${escapeHtml(params.consultation_type || '20-minute video discovery call')}`
  ];

  const hasAnswers = Object.keys(answersMap).length > 0;
  if (hasAnswers) {
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

  return sendTelegramMessage(lines.join('\n'));
}

export async function sendEmailGateToTelegram(params: {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  source?: string;
  campaign?: string;
}): Promise<boolean> {
  const fullName = [params.first_name, params.last_name].filter(Boolean).join(' ');
  const lines: string[] = [
    `🔔 <b>NEW VISITOR EMAIL CAPTURED</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✉️ <b>Email:</b> ${escapeHtml(params.email)}`,
    ...(fullName ? [`👤 <b>Name:</b> ${escapeHtml(fullName)}`] : []),
    ...(params.phone ? [`📞 <b>Phone:</b> ${escapeHtml(params.phone)}`] : []),
    `🌐 <b>Source:</b> ${escapeHtml(params.source || 'Direct')}`,
    ...(params.campaign ? [`📣 <b>Campaign:</b> ${escapeHtml(params.campaign)}`] : []),
    `🕒 <i>Captured: ${new Date().toUTCString()}</i>`
  ];

  return sendTelegramMessage(lines.join('\n'));
}

function formatLeadProfileMessage(params: {
  visitor?: Visitor | null;
  conversation?: Conversation | null;
  answers: ConversationAnswer[];
  latestAnswer?: ConversationAnswer;
  freeTextMessage?: string;
}): string {
  const { visitor, conversation, answers, latestAnswer, freeTextMessage } = params;
  const answersMap: Record<string, string> = {};
  for (const a of answers) {
    answersMap[a.question_id] = a.raw_answer || a.answer_label || a.answer_value;
  }

  const email = visitor?.email || answersMap['email'] || answersMap['email_capture'] || 'Visitor';
  const fullName = [visitor?.first_name, visitor?.last_name].filter(Boolean).join(' ');

  const lines: string[] = [
    `📝 <b>FORM / QUESTIONNAIRE SUBMISSION</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✉️ <b>Visitor Email:</b> ${escapeHtml(email)}`,
    ...(fullName ? [`👤 <b>Name:</b> ${escapeHtml(fullName)}`] : []),
    ...(latestAnswer
      ? [
          `❓ <b>Field:</b> ${escapeHtml(latestAnswer.question_id)}`,
          `✅ <b>Selected / Entered:</b> ${escapeHtml(latestAnswer.raw_answer || latestAnswer.answer_label || latestAnswer.answer_value)}`
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

  if (conversation?.booking_slot) {
    lines.push(`<b>📅 Booking Slot:</b> ${escapeHtml(conversation.booking_slot)}`);
  }

  lines.push(``, `🕒 <i>Updated: ${new Date().toUTCString()}</i>`);
  return lines.join('\n');
}

export async function sendLeadProfileUpdateToTelegram(params: {
  visitor?: Visitor | null;
  conversation?: Conversation | null;
  answers: ConversationAnswer[];
  latestAnswer?: ConversationAnswer;
  freeTextMessage?: string;
}): Promise<boolean> {
  const msg = formatLeadProfileMessage(params);
  return sendTelegramMessage(msg);
}

// Start background auto-discovery poller so the moment the user taps Start on @MattStrategybot,
// their chat_id is locked in and all queued submissions are immediately delivered.
let pollerStarted = false;
export function startTelegramAutoDiscovery() {
  if (pollerStarted) return;
  pollerStarted = true;

  discoverBotChatIds().catch(() => {});

  setInterval(() => {
    const token = getTelegramToken();
    if (!token) return;
    // Poll aggressively (every 3s) if no chat is connected yet or if there are queued messages
    if (state.chatIds.length === 0 || state.pendingQueue.length > 0) {
      discoverBotChatIds(token).catch(() => {});
    }
  }, 3000);
}
