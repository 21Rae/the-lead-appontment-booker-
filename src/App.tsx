import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Users,
  Database,
  BookOpen,
  ShieldCheck,
  Calendar,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Compass,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import {
  Visitor,
  Conversation,
  ConversationAnswer,
  ConversationEvent,
  ChatMessage,
  ConversationStage
} from './types';
import {
  getOrCreateVisitorId,
  getActiveConversationId,
  setActiveConversationId,
  clearActiveConversationId,
  extractTrackingParams,
  resetVisitorIdentity
} from './lib/visitor';
import {
  initializeClientConversation,
  processClientAnswer,
  processClientFreeText,
  clientStore
} from './lib/clientFallbackEngine';
import {
  notifyTelegramConsultationBooking,
  notifyTelegramEmailCaptured,
  notifyTelegramFormAnswer,
  fetchTelegramConnectionStatus,
  connectManualTelegramChatId,
  triggerTestTelegramPing,
  TelegramConnectionStatus
} from './lib/telegram';
import { LandingHero } from './components/LandingHero';
import { GoalCardsSection } from './components/GoalCardsSection';
import { ChatInterface } from './components/ChatInterface';
import { FinancialPicturePanel } from './components/FinancialPicturePanel';
import { AdminCRMView } from './components/AdminCRMView';
import { VisitorSummaryDrawer } from './components/VisitorSummaryDrawer';
import { EducationHubModal } from './components/EducationHubModal';
import { BookingModal } from './components/BookingModal';
import { CampaignSimulatorBar } from './components/CampaignSimulatorBar';

export default function App() {
  const [viewMode, setViewMode] = useState<'chat' | 'crm'>('chat');
  const [visitorId, setVisitorId] = useState<string>('');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answers, setAnswers] = useState<ConversationAnswer[]>([]);
  const [events, setEvents] = useState<ConversationEvent[]>([]);
  const [isResumed, setIsResumed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals / Drawers
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEducationOpen, setIsEducationOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedEduTopic, setSelectedEduTopic] = useState<string | undefined>();

  // Telegram Bot live connection state
  const [telegramStatus, setTelegramStatus] = useState<TelegramConnectionStatus | null>(null);
  const [manualChatId, setManualChatId] = useState('');
  const [telegramNotice, setTelegramNotice] = useState<string | null>(null);
  const [hideConnectedBanner, setHideConnectedBanner] = useState(false);

  // Current tracking attribution
  const [tracking, setTracking] = useState(extractTrackingParams());

  const refreshTelegramStatus = useCallback(async () => {
    const status = await fetchTelegramConnectionStatus();
    setTelegramStatus(status);
  }, []);

  useEffect(() => {
    refreshTelegramStatus();
    const timer = setInterval(() => {
      refreshTelegramStatus();
    }, 3000);
    return () => clearInterval(timer);
  }, [refreshTelegramStatus]);

  // Initialize or resume conversation session
  const initSession = useCallback(async (forcedVisitorId?: string, overrideTracking?: any) => {
    setIsLoading(true);
    const vId = forcedVisitorId || getOrCreateVisitorId();
    setVisitorId(vId);

    const track = overrideTracking || extractTrackingParams();
    setTracking(track);

    const activeConvId = getActiveConversationId();

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_id: vId,
          conversation_id: activeConvId || undefined,
          source: track.source,
          campaign: track.campaign,
          medium: track.medium,
          content: track.content,
          landing_page: track.landing_page,
          referrer: track.referrer
        })
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setVisitor(data.visitor);
          setConversation(data.conversation);
          setMessages(data.messages && data.messages.length > 0 ? data.messages : []);
          setAnswers(data.answers || []);
          setIsResumed(data.isResumed || false);

          if (data.conversation?.conversation_id) {
            setActiveConversationId(data.conversation.conversation_id);
          }

          if (data.messages && data.messages.length > 0) {
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Backend API unreachable or offline, activating client resilient engine:', err);
    }

    // Fallback: Client Resilient Engine (ensures never blank on Vercel / static / offline)
    const localData = initializeClientConversation({
      visitor_id: vId,
      conversation_id: activeConvId || undefined,
      source: track.source,
      campaign: track.campaign,
      medium: track.medium,
      content: track.content,
      landing_page: track.landing_page,
      referrer: track.referrer
    });

    setVisitor(localData.visitor);
    setConversation(localData.conversation);
    setMessages(localData.messages);
    setAnswers(localData.answers);
    setIsResumed(localData.isResumed);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Handle immediate answer submission
  const handleSendAnswer = async (params: {
    question_id: string;
    question_text: string;
    answer_value: string;
    answer_label: string;
    raw_answer?: string;
    answer_type: 'button' | 'multi_select' | 'free_text' | 'amount' | 'email';
    stage: ConversationStage;
  }) => {
    if (!conversation || !visitor) return;

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    try {
      const res = await fetch(`/api/conversations/${conversation.conversation_id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_id: visitor.visitor_id,
          question_id: params.question_id,
          question_text: params.question_text,
          answer_value: params.answer_value,
          answer_label: params.answer_label,
          raw_answer: params.raw_answer,
          answer_type: params.answer_type,
          stage: params.stage,
          submission_id: submissionId
        })
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setConversation(data.conversation);
          setAnswers(data.answers);
          if (!data.telegramSent) {
            notifyTelegramFormAnswer({
              visitor,
              conversation: data.conversation,
              answers: data.answers,
              latestAnswer: {
                question_id: params.question_id,
                question_text: params.question_text,
                answer_label: params.raw_answer || params.answer_label || params.answer_value
              }
            });
          }
          setMessages((prev) => [
            ...prev,
            {
              id: `usr_${Date.now()}`,
              conversation_id: conversation.conversation_id,
              visitor_id: visitor.visitor_id,
              sender: 'user',
              text: params.raw_answer || params.answer_label || params.answer_value,
              created_at: new Date().toISOString()
            },
            data.agentMessage
          ]);
          return;
        }
      }
    } catch (err) {
      console.warn('API error during answer processing, using client fallback:', err);
    }

    // Client fallback execution
    const fallbackRes = processClientAnswer({
      visitor_id: visitor.visitor_id,
      conversation_id: conversation.conversation_id,
      question_id: params.question_id,
      question_text: params.question_text,
      answer_value: params.answer_value,
      answer_label: params.answer_label,
      raw_answer: params.raw_answer,
      answer_type: params.answer_type,
      stage: params.stage,
      submission_id: submissionId
    });

    setConversation(fallbackRes.conversation);
    setAnswers(fallbackRes.answers);
    notifyTelegramFormAnswer({
      visitor,
      conversation: fallbackRes.conversation,
      answers: fallbackRes.answers,
      latestAnswer: {
        question_id: params.question_id,
        question_text: params.question_text,
        answer_label: params.raw_answer || params.answer_label || params.answer_value
      }
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `usr_${Date.now()}`,
        conversation_id: conversation.conversation_id,
        visitor_id: visitor.visitor_id,
        sender: 'user',
        text: params.raw_answer || params.answer_label || params.answer_value,
        created_at: new Date().toISOString()
      },
      fallbackRes.agentMessage
    ]);
  };

  // Handle free text message
  const handleSendFreeText = async (text: string) => {
    if (!conversation || !visitor) return;

    try {
      const res = await fetch(`/api/conversations/${conversation.conversation_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_id: visitor.visitor_id,
          text
        })
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (!data.telegramSent) {
            notifyTelegramFormAnswer({
              visitor,
              conversation,
              answers,
              freeTextMessage: text
            });
          }
          setMessages((prev) => [
            ...prev,
            data.userMessage,
            data.agentMessage
          ]);
          return;
        }
      }
    } catch (err) {
      console.warn('API error during free text, using client fallback:', err);
    }

    // Client fallback execution
    const fallbackRes = processClientFreeText({
      visitor_id: visitor.visitor_id,
      conversation_id: conversation.conversation_id,
      text
    });

    notifyTelegramFormAnswer({
      visitor,
      conversation,
      answers,
      freeTextMessage: text
    });

    setMessages((prev) => [
      ...prev,
      fallbackRes.userMessage,
      fallbackRes.agentMessage
    ]);
  };

  // Pause / Resume conversation
  const handlePauseResume = async (action: 'pause' | 'resume') => {
    if (!conversation) return;

    try {
      const res = await fetch(`/api/conversations/${conversation.conversation_id}/${action}`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        return;
      }
    } catch {
      // Local state toggle
    }

    const updated = {
      ...conversation,
      status: (action === 'pause' ? 'paused' : 'active') as any
    };
    setConversation(updated);
    clientStore.saveConversation(updated);
  };

  // Capture email
  const handleCaptureEmail = async (email: string, firstName?: string) => {
    if (!visitor || !conversation) return;

    try {
      const res = await fetch(`/api/visitors/${visitor.visitor_id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName,
          conversation_id: conversation.conversation_id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVisitor(data.visitor);
        if (!data.telegramSent) {
          notifyTelegramEmailCaptured({
            email,
            first_name: firstName || visitor.first_name,
            phone: visitor.phone,
            source: visitor.source,
            campaign: visitor.campaign
          });
        }
        return;
      }
    } catch {
      // Local fallback
    }

    const updatedVisitor = {
      ...visitor,
      email,
      first_name: firstName || visitor.first_name
    };
    setVisitor(updatedVisitor);
    clientStore.saveVisitor(updatedVisitor);
    notifyTelegramEmailCaptured({
      email,
      first_name: firstName || visitor.first_name,
      phone: visitor.phone,
      source: visitor.source,
      campaign: visitor.campaign
    });
  };

  // Confirm booking
  const handleConfirmBooking = async (
    slot: string,
    details: { firstName: string; email: string; phone?: string }
  ) => {
    if (!conversation || !visitor) return;

    // Update visitor email first
    await handleCaptureEmail(details.email, details.firstName);

    try {
      const res = await fetch(`/api/conversations/${conversation.conversation_id}/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot,
          adviser_name: 'Marcus Sterling, CFP®',
          email: details.email,
          first_name: details.firstName,
          phone: details.phone
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        if (!data.telegramSent) {
          notifyTelegramConsultationBooking({
            email: details.email,
            full_name: details.firstName,
            phone: details.phone,
            selected_time_slot: slot,
            consultant_name: 'Marcus Sterling, CFP®',
            consultation_type: '20-minute video discovery call',
            conversation_id: conversation.conversation_id,
            answers
          });
        }
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        return;
      }
    } catch {
      // Local fallback
    }

    // Fallback: send consultation booking directly to Telegram from client if backend API is unavailable
    notifyTelegramConsultationBooking({
      email: details.email,
      full_name: details.firstName,
      phone: details.phone,
      selected_time_slot: slot,
      consultant_name: 'Marcus Sterling, CFP®',
      consultation_type: '20-minute video discovery call',
      conversation_id: conversation.conversation_id,
      answers
    });

    const updatedConv = {
      ...conversation,
      booked_consultation: true,
      booked_slot: slot,
      adviser_assigned: 'Marcus Sterling, CFP®'
    };
    setConversation(updatedConv);
    clientStore.saveConversation(updatedConv);

    const bookingMsg: ChatMessage = {
      id: `msg_book_${Date.now()}`,
      conversation_id: conversation.conversation_id,
      visitor_id: visitor.visitor_id,
      sender: 'agent',
      mode: 'adviser_connector',
      text: `Your private 1-on-1 strategy consultation is confirmed with Marcus Sterling, CFP® for ${slot}.\n\nA calendar invitation and your consultation dossier brief have been dispatched to ${details.email}.`,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, bookingMsg]);
  };

  // Trigger specific goal from Hero or Goal Card
  const handleSelectGoalPathway = (goalKey: string, goalLabel: string) => {
    const chatContainer = document.getElementById('chat-workspace-section');
    if (chatContainer) {
      chatContainer.scrollIntoView({ behavior: 'smooth' });
    }

    if (!visitor?.email || !visitor.email.includes('@')) {
      const emailInput = document.getElementById('required-visitor-email');
      if (emailInput) {
        emailInput.focus();
      }
      return;
    }

    handleSendAnswer({
      question_id: 'primary_goal',
      question_text: 'What would you most like help with?',
      answer_value: goalKey,
      answer_label: goalLabel,
      answer_type: 'button',
      stage: 'welcome'
    });
  };

  // Campaign simulator handlers
  const handleSimulateCampaign = (campaign: string, cta: string, source: string) => {
    const newTracking = {
      source,
      campaign,
      medium: 'email',
      content: cta,
      cta,
      landing_page: `/chat?campaign=${campaign}&cta=${cta}`
    };
    clearActiveConversationId();
    initSession(undefined, newTracking);
  };

  const handleResetVisitor = () => {
    const newVid = resetVisitorIdentity();
    initSession(newVid);
  };

  return (
    <div id="financial-agent-app" className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Main Navigation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <img
              src="https://www.mattstrategyfuturistic.com/logo.png"
              alt="Brand Logo"
              className="h-8 max-w-[180px] object-contain rounded"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">Matt Strategy Futuristic</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                Wealth Advisory & Strategy
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Explore • Understand • Chartered Strategy</p>
          </div>
        </div>
      </header>

      {/* Telegram Bot Activation Banner (shown when Bot Token is valid but Telegram hasn't received /start from user yet) */}
      {telegramStatus?.configured && !telegramStatus.connected && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 sm:px-6 py-3 text-slate-900">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>
                  One-Time Telegram Bot Activation Required (@{telegramStatus.botUsername || 'MattStrategybot'})
                </span>
                {telegramStatus.queuedCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-100 text-[10px] font-semibold">
                    {telegramStatus.queuedCount} submission{telegramStatus.queuedCount === 1 ? '' : 's'} queued & ready to send
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-900/90">
                Telegram bots cannot message you until you press <strong>Start</strong> or send 1 message (e.g. <code>hi</code>) to{' '}
                <strong>@{telegramStatus.botUsername || 'MattStrategybot'}</strong> in Telegram so Telegram reveals your Chat ID. As soon as you send a message, all queued form outputs will arrive automatically.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={`https://t.me/${telegramStatus.botUsername || 'MattStrategybot'}?start=connect`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
              >
                <span>1. Open @{telegramStatus.botUsername || 'MattStrategybot'} &amp; Tap Start</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={manualChatId}
                  onChange={(e) => setManualChatId(e.target.value)}
                  placeholder="Or Chat ID / @channel"
                  className="px-2.5 py-1.5 rounded-lg border border-amber-400/60 bg-white text-xs text-slate-800 w-36 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (manualChatId.trim()) {
                      const res = await connectManualTelegramChatId(manualChatId);
                      if (!res.ok) {
                        setTelegramNotice(res.error || 'Could not connect Chat ID.');
                      } else {
                        setTelegramNotice('Connected! Queued form outputs sent to Telegram.');
                        setManualChatId('');
                      }
                    }
                    await refreshTelegramStatus();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
          {telegramNotice && (
            <div className="max-w-7xl mx-auto mt-1.5 text-[11px] font-medium text-amber-950">
              {telegramNotice}
            </div>
          )}
        </div>
      )}

      {telegramStatus?.configured && telegramStatus.connected && !hideConnectedBanner && (
        <div className="bg-emerald-950 text-emerald-100 border-b border-emerald-800 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                Connected to <strong>@{telegramStatus.botUsername || 'MattStrategybot'}</strong> (Chat ID:{' '}
                <code>{telegramStatus.chatIds.join(', ')}</code>) — All form outputs are being delivered live to Telegram.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await triggerTestTelegramPing();
                  setTelegramNotice(res.ok ? 'Test message delivered to Telegram!' : res.error || 'Failed');
                  setTimeout(() => setTelegramNotice(null), 4000);
                }}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition cursor-pointer"
              >
                Send Test Message
              </button>
              <button
                type="button"
                onClick={() => setHideConnectedBanner(true)}
                className="text-emerald-300 hover:text-white text-[11px] px-1.5 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
          {telegramNotice && (
            <div className="max-w-7xl mx-auto mt-1 text-[11px] text-emerald-300">
              {telegramNotice}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="ml-2">Initializing secure wealth planning session...</span>
          </div>
        ) : viewMode === 'chat' ? (
          <div className="flex-1 overflow-y-auto">
            {/* 1. Landing Hero (Plan your financial future with greater clarity) */}
            <LandingHero
              onStartCheckIn={() => {
                const el = document.getElementById('chat-workspace-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* 2. Goal Pathway Cards (Retirement | Investing | Wealth | Family | Review) */}
            <GoalCardsSection onSelectGoal={handleSelectGoalPathway} />

            {/* 3. Primary Two-Column Chat & Live Financial Picture Workspace */}
            <div id="chat-workspace-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
                
                {/* Left Column: Digital Wealth Assistant Chat Stream (8 cols) */}
                <div className="lg:col-span-8 h-full rounded-2xl border border-slate-200 shadow-xs overflow-hidden bg-white">
                  <ChatInterface
                    messages={messages}
                    conversation={conversation}
                    visitor={visitor}
                    answers={answers}
                    isResumed={isResumed}
                    onSendAnswer={handleSendAnswer}
                    onSendFreeText={handleSendFreeText}
                    onPauseResume={handlePauseResume}
                    onOpenEducationHub={(topicId) => {
                      setSelectedEduTopic(topicId);
                      setIsEducationOpen(true);
                    }}
                    onOpenProfileDrawer={() => setIsDrawerOpen(true)}
                    onOpenBookingModal={() => setIsBookingOpen(true)}
                    onCaptureEmail={handleCaptureEmail}
                    onStartFresh={handleResetVisitor}
                  />
                </div>

                {/* Right Column: "Your Financial Picture" Live Panel (4 cols) */}
                <div className="lg:col-span-4 h-full hidden lg:block">
                  <FinancialPicturePanel
                    answers={answers}
                    conversation={conversation}
                    onOpenEducation={() => setIsEducationOpen(true)}
                    onOpenBooking={() => setIsBookingOpen(true)}
                    onClarify={() => {
                      handleSendFreeText("I'd like to update one of my previous answers.");
                    }}
                  />
                </div>

              </div>
            </div>
          </div>
        ) : (
          <AdminCRMView />
        )}
      </main>

      {/* Modals & Drawers */}
      <VisitorSummaryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        visitor={visitor}
        conversation={conversation}
        answers={answers}
        events={events}
        onOpenBooking={() => {
          setIsDrawerOpen(false);
          setIsBookingOpen(true);
        }}
      />

      <EducationHubModal
        isOpen={isEducationOpen}
        onClose={() => setIsEducationOpen(false)}
        initialTopicId={selectedEduTopic}
        onSelectTopicForChat={(topicId) => {
          handleSendFreeText(`Could you explain more about ${topicId.replace(/_/g, ' ')}?`);
        }}
        onRequestAdviser={() => setIsBookingOpen(true)}
      />

      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        conversation={conversation}
        visitor={visitor}
        onConfirmBooking={handleConfirmBooking}
      />
    </div>
  );
}
