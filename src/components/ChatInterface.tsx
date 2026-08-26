import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Check,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  Clock,
  ArrowRight,
  Mail,
  Lock,
  Compass,
  AlertCircle,
  User,
  Star,
  Award
} from 'lucide-react';
import {
  ChatMessage,
  Conversation,
  Visitor,
  ConversationAnswer,
  MessageOption,
  ConversationStage
} from '../types';
import { APPROVED_EDUCATIONAL_TOPICS } from '../../server/knowledge';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  conversation: Conversation | null;
  visitor: Visitor | null;
  answers: ConversationAnswer[];
  isResumed: boolean;
  onSendAnswer: (params: {
    question_id: string;
    question_text: string;
    answer_value: string;
    answer_label: string;
    raw_answer?: string;
    answer_type: 'button' | 'multi_select' | 'free_text' | 'amount' | 'email';
    stage: ConversationStage;
  }) => Promise<void>;
  onSendFreeText: (text: string) => Promise<void>;
  onPauseResume: (action: 'pause' | 'resume') => Promise<void>;
  onOpenEducationHub: (topicId?: string) => void;
  onOpenProfileDrawer: () => void;
  onOpenBookingModal: () => void;
  onCaptureEmail: (email: string, firstName?: string) => Promise<void>;
  onStartFresh?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  conversation,
  visitor,
  answers,
  isResumed,
  onSendAnswer,
  onSendFreeText,
  onPauseResume,
  onOpenEducationHub,
  onOpenProfileDrawer,
  onOpenBookingModal,
  onCaptureEmail,
  onStartFresh
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showFreeTextInput, setShowFreeTextInput] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailConsent, setEmailConsent] = useState(true);
  const [hasDismissedResumeCard, setHasDismissedResumeCard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email Gate state
  const [gateEmail, setGateEmail] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [isSubmittingGate, setIsSubmittingGate] = useState(false);
  const gateEmailInputRef = useRef<HTMLInputElement>(null);

  const hasEmail = Boolean(visitor?.email && visitor.email.includes('@'));

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, saveStatus, isSubmitting, hasEmail]);

  // Initial Email submit handler
  const handleInitialEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = gateEmail.trim();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setGateError('Please provide a valid email address to continue.');
      gateEmailInputRef.current?.focus();
      return;
    }

    setIsSubmittingGate(true);
    setGateError(null);

    try {
      await onCaptureEmail(clean);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Email capture failed:', err);
      setGateError('Unable to save email right now. Please try again.');
    } finally {
      setIsSubmittingGate(false);
    }
  };

  const promptForEmail = () => {
    setGateError('Please enter your email above to begin.');
    gateEmailInputRef.current?.focus();
    gateEmailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Find latest agent question message
  const latestAgentMessage = [...messages].reverse().find((m) => m.sender === 'agent');
  const currentStage = conversation?.current_stage || 'welcome';

  // Calculate 3-Phase progress indicator
  const getProgressPhase = (): 1 | 2 | 3 => {
    if (
      currentStage === 'welcome' ||
      currentStage === 'goal_discovery' ||
      currentStage === 'financial_situation'
    ) {
      return 1;
    }
    if (
      currentStage === 'time_horizon' ||
      currentStage === 'investment_experience' ||
      currentStage === 'risk_and_priorities' ||
      currentStage === 'existing_portfolio' ||
      currentStage === 'investment_amount' ||
      currentStage === 'educational_response'
    ) {
      return 2;
    }
    return 3;
  };

  const progressPhase = getProgressPhase();

  // Handle single option button selection
  const handleSelectOption = async (option: MessageOption) => {
    if (!hasEmail) {
      promptForEmail();
      return;
    }

    if (!latestAgentMessage || isSubmitting) return;

    setIsSubmitting(true);
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      if (option.value === 'book_consultation' || option.value === 'yes_choose_time') {
        onOpenBookingModal();
      }

      await onSendAnswer({
        question_id: latestAgentMessage.questionId || `q_${Date.now()}`,
        question_text: latestAgentMessage.text,
        answer_value: option.value,
        answer_label: option.label,
        answer_type: 'button',
        stage: latestAgentMessage.questionStage || conversation?.current_stage || 'goal_discovery'
      });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      console.error('Answer submission error:', err);
      setErrorMessage(
        'Something went wrong while continuing our conversation. Your previous answers have been saved.'
      );
      setSaveStatus('idle');
    } finally {
      setIsSubmitting(false);
      setSelectedMulti([]);
      setShowFreeTextInput(false);
    }
  };

  // Handle multi-select toggle
  const toggleMultiSelect = (val: string) => {
    if (!hasEmail) {
      promptForEmail();
      return;
    }

    if (selectedMulti.includes(val)) {
      setSelectedMulti(selectedMulti.filter((v) => v !== val));
    } else {
      setSelectedMulti([...selectedMulti, val]);
    }
  };

  // Submit multi-select choices
  const handleSubmitMultiSelect = async () => {
    if (!hasEmail) {
      promptForEmail();
      return;
    }

    if (selectedMulti.length === 0 || !latestAgentMessage || isSubmitting) return;

    setIsSubmitting(true);
    setSaveStatus('saving');
    setErrorMessage(null);

    const labels = latestAgentMessage.options
      ?.filter((o) => selectedMulti.includes(o.value))
      .map((o) => o.label)
      .join(', ') || selectedMulti.join(', ');

    try {
      await onSendAnswer({
        question_id: latestAgentMessage.questionId || 'multi_selection',
        question_text: latestAgentMessage.text,
        answer_value: selectedMulti.join('|'),
        answer_label: labels,
        answer_type: 'multi_select',
        stage: latestAgentMessage.questionStage || conversation?.current_stage || 'investment_experience'
      });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setErrorMessage(
        'Something went wrong while continuing our conversation. Your previous answers have been saved.'
      );
      setSaveStatus('idle');
    } finally {
      setIsSubmitting(false);
      setSelectedMulti([]);
    }
  };

  // Submit free text message
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!hasEmail) {
      promptForEmail();
      return;
    }

    if (!inputText.trim() || isSubmitting) return;

    const text = inputText.trim();
    setInputText('');
    setIsSubmitting(true);
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      if (latestAgentMessage?.questionId) {
        await onSendAnswer({
          question_id: latestAgentMessage.questionId,
          question_text: latestAgentMessage.text,
          answer_value: text,
          answer_label: text,
          raw_answer: text,
          answer_type: 'free_text',
          stage: latestAgentMessage.questionStage || conversation?.current_stage || 'goal_discovery'
        });
      } else {
        await onSendFreeText(text);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setErrorMessage(
        'Something went wrong while continuing our conversation. Your previous answers have been saved.'
      );
      setSaveStatus('idle');
    } finally {
      setIsSubmitting(false);
      setShowFreeTextInput(false);
    }
  };

  // Handle email capture
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) return;
    setIsSubmitting(true);
    try {
      await onCaptureEmail(emailInput.trim());
      await onSendAnswer({
        question_id: 'email_capture',
        question_text: 'Email for summary & educational pack',
        answer_value: emailInput.trim(),
        answer_label: emailInput.trim(),
        answer_type: 'email',
        stage: 'email_capture'
      });
      setEmailInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Previous answer for returning visitor card
  const primaryGoalAnswer = answers.find(
    (a) => a.question_id === 'primary_goal' || a.question_id === 'goal_details'
  );

  return (
    <div id="digital-wealth-assistant-container" className="flex flex-col h-full bg-slate-50 relative">
      
      {/* 1. Header with Consultant Profile & Progress Indicator */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs sticky top-0 z-20">
        
        {/* Consultant Profile Details */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              MS
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" title="Online" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Marcus Sterling, CFP®</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                Senior Wealth Consultant
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Matt Strategy Futuristic • London & Global Consultations</p>
          </div>
        </div>

        {/* 2. Three-Phase Progress Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          <span className={progressPhase === 1 ? 'text-emerald-700 flex items-center gap-1' : 'text-slate-400'}>
            <span className={`w-1.5 h-1.5 rounded-full ${progressPhase === 1 ? 'bg-emerald-600' : 'bg-slate-300'}`} />
            Goals
          </span>
          <span className="text-slate-300">───</span>
          <span className={progressPhase === 2 ? 'text-emerald-700 flex items-center gap-1' : 'text-slate-400'}>
            <span className={`w-1.5 h-1.5 rounded-full ${progressPhase === 2 ? 'bg-emerald-600' : 'bg-slate-300'}`} />
            Your Position
          </span>
          <span className="text-slate-300">───</span>
          <span className={progressPhase === 3 ? 'text-emerald-700 flex items-center gap-1' : 'text-slate-400'}>
            <span className={`w-1.5 h-1.5 rounded-full ${progressPhase === 3 ? 'bg-emerald-600' : 'bg-slate-300'}`} />
            Next Step
          </span>
        </div>

        {/* Live Save Status Badge & Quick Controls */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
              Saving your notes...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Saved
            </span>
          )}

          <button
            id="chat-pause-btn"
            onClick={() => onPauseResume(conversation?.status === 'paused' ? 'resume' : 'pause')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title={conversation?.status === 'paused' ? 'Resume conversation' : 'Pause conversation'}
          >
            {conversation?.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3. Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
        
        {/* Returning Visitor Welcome Banner */}
        {isResumed && !hasDismissedResumeCard && primaryGoalAnswer && (
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-xs max-w-xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Welcome back
                </h4>
              </div>
              <span className="text-[10px] text-emerald-700">Notes Restored</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              I have your previous notes regarding: <strong>{primaryGoalAnswer.answer_label || primaryGoalAnswer.answer_value}</strong>. Would you like to continue our discussion from there?
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                id="resume-conversation-continue-btn"
                onClick={() => setHasDismissedResumeCard(true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
              >
                Continue our discussion
              </button>
              {onStartFresh && (
                <button
                  id="resume-conversation-fresh-btn"
                  onClick={() => {
                    setHasDismissedResumeCard(true);
                    onStartFresh();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium transition"
                >
                  Start fresh
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message Items */}
        {messages.map((msg, index) => {
          const isAgent = msg.sender === 'agent';

          return (
            <div
              key={msg.id || index}
              className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} max-w-2xl ${
                isAgent ? 'mr-auto' : 'ml-auto'
              }`}
            >
              {/* Sender label */}
              <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 font-medium px-1">
                {isAgent ? (
                  <>
                    <span className="font-semibold text-slate-800">Marcus Sterling, CFP®</span>
                    <span>•</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : (
                  <>
                    <span>You</span>
                    <span>•</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all shadow-xs ${
                  isAgent
                    ? 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
                    : 'bg-slate-900 text-white rounded-tr-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Educational Card Embed */}
                {isAgent && msg.metadata?.topicKey && APPROVED_EDUCATIONAL_TOPICS[msg.metadata.topicKey] && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-800 space-y-2">
                    <div className="font-bold text-blue-950 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>{APPROVED_EDUCATIONAL_TOPICS[msg.metadata.topicKey].title}</span>
                    </div>
                    <p className="text-slate-700">{APPROVED_EDUCATIONAL_TOPICS[msg.metadata.topicKey].summary}</p>
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => onOpenEducationHub(msg.metadata.topicKey)}
                        className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
                      >
                        Explore concept details →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Dynamic Question Card & Interaction Panel for the Latest Agent Message */}
        {latestAgentMessage && !isSubmitting && (
          <div className="max-w-2xl mr-auto space-y-3 pt-2">
            
            {/* MANDATORY EMAIL ACCESS GATE: User MUST provide email before interacting */}
            {!hasEmail ? (
              <div className="p-5 sm:p-6 bg-white rounded-2xl border-2 border-emerald-600/30 shadow-md space-y-4 max-w-xl">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Email Required to Begin
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                      Please provide your email to start your consultation
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Marcus Sterling, CFP® requires your email to securely preserve your bespoke wealth strategy dossier and consultation notes.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleInitialEmailSubmit} className="space-y-3 pt-1">
                  <div>
                    <label htmlFor="required-visitor-email" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Your Email Address <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="required-visitor-email"
                        ref={gateEmailInputRef}
                        value={gateEmail}
                        onChange={(e) => {
                          setGateEmail(e.target.value);
                          setGateError(null);
                        }}
                        placeholder="name@example.com"
                        required
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm text-slate-900 bg-slate-50/50 outline-none transition"
                        autoFocus
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {gateError && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {gateError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    id="required-email-submit-btn"
                    disabled={isSubmittingGate || !gateEmail.trim()}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>{isSubmittingGate ? 'Verifying...' : 'Begin Consultation with Marcus'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
                    <Lock className="w-3 h-3 text-emerald-700" />
                    <span>FCA-compliant encryption • We strictly protect your privacy</span>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {/* 1. Multi-Select Options if configured */}
                {latestAgentMessage.allowMultiSelect && latestAgentMessage.options && (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Select all that apply</span>
                      <span>{selectedMulti.length} selected</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {latestAgentMessage.options.map((opt) => {
                        const isSelected = selectedMulti.includes(opt.value);
                        return (
                          <button
                            key={opt.id}
                            id={`multi-opt-${opt.id}`}
                            onClick={() => toggleMultiSelect(opt.value)}
                            className={`p-3 rounded-xl text-left text-xs font-semibold transition border flex items-center justify-between ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      id="multi-select-continue-btn"
                      onClick={handleSubmitMultiSelect}
                      disabled={selectedMulti.length === 0}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 2. Structured Single-Choice Button Grid */}
                {!latestAgentMessage.allowMultiSelect &&
                  latestAgentMessage.options &&
                  latestAgentMessage.options.length > 0 &&
                  !showFreeTextInput && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {latestAgentMessage.options.map((opt) => (
                          <button
                            key={opt.id}
                            id={`chat-opt-btn-${opt.id}`}
                            onClick={() => handleSelectOption(opt)}
                            className="p-3.5 rounded-xl text-left bg-white hover:bg-emerald-50/60 border border-slate-200/90 hover:border-emerald-500/80 text-xs sm:text-sm font-semibold text-slate-800 hover:text-emerald-950 transition-all duration-150 shadow-2xs hover:shadow-xs flex items-center justify-between group active:scale-[0.99]"
                          >
                            <span>{opt.label}</span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                          </button>
                        ))}
                      </div>

                      {/* Toggle to type custom response */}
                      <div className="text-right">
                        <button
                          id="type-custom-answer-toggle-btn"
                          onClick={() => setShowFreeTextInput(true)}
                          className="text-[11px] font-medium text-slate-500 hover:text-emerald-700 underline px-1"
                        >
                          Other / I'd rather explain in my own words →
                        </button>
                      </div>
                    </div>
                  )}

                {/* 3. Free Text Input Card */}
                {(showFreeTextInput || (!latestAgentMessage.options && currentStage !== 'email_capture')) && (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Tell Marcus in your own words...
                    </label>
                    <form onSubmit={handleSendText} className="flex gap-2">
                      <input
                        type="text"
                        id="chat-free-text-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your response here..."
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        id="chat-free-text-send-btn"
                        disabled={!inputText.trim() || isSubmitting}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                      >
                        <span>Send</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>

                    {latestAgentMessage.options && latestAgentMessage.options.length > 0 && (
                      <button
                        onClick={() => setShowFreeTextInput(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                      >
                        ← Back to choices
                      </button>
                    )}
                  </div>
                )}

                {/* 4. Email Capture Card (Stage 13) */}
                {currentStage === 'email_capture' && (
                  <div className="p-5 bg-white rounded-2xl border border-emerald-200 shadow-xs space-y-4 max-w-lg">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Receive your consultation summary & planning pack
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Marcus will compile a structured summary of our discussion and relevant planning guides to your inbox.
                      </p>
                    </div>

                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Your Email Address
                        </label>
                        <input
                          type="email"
                          id="capture-email-input"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          id="email-consent-cb"
                          checked={emailConsent}
                          onChange={(e) => setEmailConsent(e.target.checked)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="email-consent-cb" className="text-[11px]">
                          I'd like to receive Marcus's quarterly wealth planning insights and market commentaries.
                        </label>
                      </div>

                      <button
                        type="submit"
                        id="capture-email-submit-btn"
                        disabled={!emailInput || isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-xs"
                      >
                        Send my consultation summary
                      </button>
                    </form>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Lock className="w-3 h-3" />
                      <span>Strict confidentiality • We never share your details with third parties.</span>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* Loading Bubble */}
        {isSubmitting && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-3 bg-white rounded-2xl border border-slate-200/70 max-w-xs shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Marcus is reviewing your response...</span>
          </div>
        )}

        {/* Error Handling */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 max-w-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setErrorMessage(null)}
                className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold"
              >
                Try again
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="px-3 py-1 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs"
              >
                Continue later
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Bottom Free Inquiry Bar */}
      <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 sticky bottom-0 z-20">
        <form
          onSubmit={(e) => {
            if (!hasEmail) {
              e.preventDefault();
              promptForEmail();
              return;
            }
            handleSendText(e);
          }}
          className="max-w-4xl mx-auto flex items-center gap-2"
        >
          <input
            type="text"
            id="chat-bottom-inquiry-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => {
              if (!hasEmail) {
                promptForEmail();
              }
            }}
            placeholder={
              hasEmail
                ? "Ask Marcus a question or explain your circumstances..."
                : "Please enter your email above to unlock the conversation..."
            }
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-800"
          />
          <button
            type="submit"
            id="chat-bottom-send-btn"
            disabled={isSubmitting || (hasEmail && !inputText.trim())}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>{hasEmail ? 'Send' : 'Email Required'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="max-w-4xl mx-auto text-center mt-1.5">
          <span className="text-[10px] text-slate-400">
            Matt Strategy Futuristic • Strategic wealth discovery & planning concepts • Bespoke portfolio mandates during private consultation
          </span>
        </div>
      </div>

    </div>
  );
};
