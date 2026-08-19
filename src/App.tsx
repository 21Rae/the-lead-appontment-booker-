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

  // Current tracking attribution
  const [tracking, setTracking] = useState(extractTrackingParams());

  // Initialize or resume conversation session
  const initSession = useCallback(async (forcedVisitorId?: string, overrideTracking?: any) => {
    setIsLoading(true);
    try {
      const vId = forcedVisitorId || getOrCreateVisitorId();
      setVisitorId(vId);

      const track = overrideTracking || extractTrackingParams();
      setTracking(track);

      const activeConvId = getActiveConversationId();

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
        const data = await res.json();
        setVisitor(data.visitor);
        setConversation(data.conversation);
        setMessages(data.messages || []);
        setAnswers(data.answers || []);
        setIsResumed(data.isResumed || false);

        if (data.conversation?.conversation_id) {
          setActiveConversationId(data.conversation.conversation_id);
        }
      }
    } catch (err) {
      console.error('Session initialization error:', err);
    } finally {
      setIsLoading(false);
    }
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
      const data = await res.json();
      setConversation(data.conversation);
      setAnswers(data.answers);
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
    }
  };

  // Handle free text message
  const handleSendFreeText = async (text: string) => {
    if (!conversation || !visitor) return;

    const res = await fetch(`/api/conversations/${conversation.conversation_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: visitor.visitor_id,
        text
      })
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        data.userMessage,
        data.agentMessage
      ]);
    }
  };

  // Pause / Resume conversation
  const handlePauseResume = async (action: 'pause' | 'resume') => {
    if (!conversation) return;

    const res = await fetch(`/api/conversations/${conversation.conversation_id}/${action}`, {
      method: 'POST'
    });

    if (res.ok) {
      const data = await res.json();
      setConversation(data.conversation);
    }
  };

  // Capture email
  const handleCaptureEmail = async (email: string, firstName?: string) => {
    if (!visitor || !conversation) return;

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
    }
  };

  // Confirm booking
  const handleConfirmBooking = async (
    slot: string,
    details: { firstName: string; email: string; phone?: string }
  ) => {
    if (!conversation || !visitor) return;

    // Update visitor email first
    await handleCaptureEmail(details.email, details.firstName);

    const res = await fetch(`/api/conversations/${conversation.conversation_id}/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot,
        adviser_name: 'Marcus Sterling, CFP®'
      })
    });

    if (res.ok) {
      const data = await res.json();
      setConversation(data.conversation);
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    }
  };

  // Trigger specific goal from Hero or Goal Card
  const handleSelectGoalPathway = (goalKey: string, goalLabel: string) => {
    const chatContainer = document.getElementById('chat-workspace-section');
    if (chatContainer) {
      chatContainer.scrollIntoView({ behavior: 'smooth' });
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

      {/* Floating Action Trigger for Live Profile Drawer */}
      {viewMode === 'chat' && (
        <button
          id="floating-profile-drawer-btn"
          onClick={() => setIsDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-30 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2 transition hover:scale-105"
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Consultation Dossier ({answers.length} Notes Captured)</span>
        </button>
      )}

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
