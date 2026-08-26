import fs from 'fs';
import path from 'path';
import {
  Visitor,
  Conversation,
  ConversationAnswer,
  ConversationEvent,
  ChatMessage,
  ConversationStage,
  ConversationStatus,
  QualificationStatus,
  NextAction
} from '../src/types';
import {
  syncVisitorToSupabase,
  syncConversationToSupabase,
  syncAnswerToSupabase,
  syncMessageToSupabase,
  syncEventToSupabase,
  syncLeadSubmissionToSupabase
} from './supabase';

interface DatabaseSchema {
  visitors: Record<string, Visitor>;
  conversations: Record<string, Conversation>;
  answers: Record<string, ConversationAnswer>;
  events: ConversationEvent[];
  messages: Record<string, ChatMessage>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class RelationalDB {
  private data: DatabaseSchema = {
    visitors: {},
    conversations: {},
    answers: {},
    events: [],
    messages: {}
  };

  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.isLoaded = true;
      } else {
        this.seedInitialData();
        this.save();
        this.isLoaded = true;
      }
    } catch (err) {
      console.error('Error initializing database file, using memory storage:', err);
      this.seedInitialData();
      this.isLoaded = true;
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  private seedInitialData() {
    // Optional starter visitors for CRM showcase
    const demoVisitorId = 'demo-visitor-101';
    const demoConvId = 'demo-conv-201';
    const now = new Date(Date.now() - 3600000 * 4).toISOString();

    const sampleVisitor: Visitor = {
      id: 'v_seed_1',
      visitor_id: demoVisitorId,
      first_name: 'Eleanor',
      last_name: 'Vane',
      email: 'eleanor.vane@example.com',
      phone: '+44 7700 900123',
      source: 'email',
      campaign: 'retirement_campaign',
      medium: 'email',
      content: 'email_02',
      landing_page: '/chat?campaign=retirement_campaign&cta=financial_goals',
      persona: 'Pre-Retiree High Earner',
      first_seen_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now
    };

    const sampleConv: Conversation = {
      id: 'c_seed_1',
      conversation_id: demoConvId,
      visitor_id: demoVisitorId,
      status: 'qualified',
      current_stage: 'adviser_booking',
      current_question: 'adviser_booking',
      persona: 'Pre-Retiree High Earner',
      source: 'email',
      campaign: 'retirement_campaign',
      medium: 'email',
      content: 'email_02',
      landing_page: '/chat?campaign=retirement_campaign&cta=financial_goals',
      started_at: now,
      last_activity_at: now,
      qualification_status: 'qualified',
      next_action: 'book_consultation',
      client_summary: `Client Conversation Summary\n\nPrimary Goal:\nRetirement planning (Target: 60)\n\nCurrent Position:\nEstablished portfolio (£250k+) with multiple legacy workplace pensions.\n\nPrimary Concern:\nTax efficiency and sustainable income drawdown.\n\nNext Action:\nChartered Financial Planner Consultation scheduled.`,
      created_at: now,
      updated_at: now
    };

    this.data.visitors[demoVisitorId] = sampleVisitor;
    this.data.conversations[demoConvId] = sampleConv;

    const sampleAnswers: Array<Partial<ConversationAnswer>> = [
      {
        question_id: 'primary_goal',
        question_text: 'What would you most like help with?',
        answer_value: 'plan_for_retirement',
        answer_label: 'Plan for retirement',
        answer_type: 'button',
        stage: 'goal_discovery'
      },
      {
        question_id: 'goal_details',
        question_text: 'When you think about building wealth, what are you hoping to achieve?',
        answer_value: 'retire_comfortably',
        answer_label: 'Retire comfortably around 60',
        answer_type: 'button',
        stage: 'goal_discovery'
      },
      {
        question_id: 'time_horizon',
        question_text: 'Approximately when would you like to achieve this goal?',
        answer_value: '5_10_years',
        answer_label: '5–10 years',
        answer_type: 'button',
        stage: 'time_horizon'
      },
      {
        question_id: 'financial_situation',
        question_text: 'And where would you say you are today?',
        answer_value: 'several_investments_advice',
        answer_label: 'I have several investments/pensions/assets and want professional advice',
        answer_type: 'button',
        stage: 'financial_situation'
      },
      {
        question_id: 'investment_amount',
        question_text: 'Approximately how much are you currently considering investing or seeking advice about?',
        answer_value: '250k_plus',
        answer_label: '£250,000+',
        answer_type: 'amount',
        stage: 'lead_qualification'
      }
    ];

    sampleAnswers.forEach((ans, idx) => {
      const ansId = `ans_seed_${idx + 1}`;
      this.data.answers[ansId] = {
        id: ansId,
        conversation_id: demoConvId,
        visitor_id: demoVisitorId,
        question_id: ans.question_id!,
        question_text: ans.question_text!,
        answer_value: ans.answer_value!,
        answer_label: ans.answer_label!,
        raw_answer: ans.answer_label!,
        answer_type: ans.answer_type as any,
        stage: ans.stage as any,
        created_at: now,
        updated_at: now
      };
    });
  }

  // --- Visitors Operations ---
  public getOrCreateVisitor(params: {
    visitor_id: string;
    source?: string;
    campaign?: string;
    medium?: string;
    content?: string;
    landing_page?: string;
    referrer?: string;
  }): Visitor {
    const existing = this.data.visitors[params.visitor_id];
    const now = new Date().toISOString();

    if (existing) {
      existing.last_seen_at = now;
      existing.updated_at = now;
      if (params.source && !existing.source) existing.source = params.source;
      if (params.campaign && !existing.campaign) existing.campaign = params.campaign;
      if (params.medium && !existing.medium) existing.medium = params.medium;
      if (params.content && !existing.content) existing.content = params.content;
      if (params.landing_page && !existing.landing_page) existing.landing_page = params.landing_page;
      this.save();
      syncVisitorToSupabase(existing).catch(() => {});
      return existing;
    }

    const newVisitor: Visitor = {
      id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      visitor_id: params.visitor_id,
      source: params.source || 'direct',
      campaign: params.campaign,
      medium: params.medium,
      content: params.content,
      landing_page: params.landing_page,
      referrer: params.referrer,
      first_seen_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now
    };

    this.data.visitors[params.visitor_id] = newVisitor;
    this.save();
    syncVisitorToSupabase(newVisitor).catch(() => {});
    return newVisitor;
  }

  public getVisitor(visitor_id: string): Visitor | undefined {
    return this.data.visitors[visitor_id];
  }

  public updateVisitor(visitor_id: string, updates: Partial<Visitor>): Visitor | null {
    const visitor = this.data.visitors[visitor_id];
    if (!visitor) return null;

    Object.assign(visitor, updates, {
      updated_at: new Date().toISOString()
    });

    this.save();
    syncVisitorToSupabase(visitor).catch(() => {});

    // Sync any active conversations for this visitor to lead_submissions
    const convs = Object.values(this.data.conversations).filter((c) => c.visitor_id === visitor_id);
    for (const conv of convs) {
      const answers = this.getConversationAnswers(conv.conversation_id);
      syncLeadSubmissionToSupabase({ visitor, conversation: conv, answers }).catch(() => {});
    }

    return visitor;
  }

  public listVisitors(): Visitor[] {
    return Object.values(this.data.visitors).sort(
      (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
    );
  }

  // --- Conversations Operations ---
  public getOrCreateConversation(params: {
    visitor_id: string;
    conversation_id?: string;
    source?: string;
    campaign?: string;
    medium?: string;
    content?: string;
    landing_page?: string;
    referrer?: string;
  }): Conversation {
    const now = new Date().toISOString();

    // 1. If explicit conversation_id is passed and exists, return it
    if (params.conversation_id && this.data.conversations[params.conversation_id]) {
      const conv = this.data.conversations[params.conversation_id];
      conv.last_activity_at = now;
      conv.updated_at = now;
      if (conv.status === 'paused' || conv.status === 'abandoned') {
        conv.status = 'active';
      }
      this.save();
      return conv;
    }

    // 2. Look for active or paused conversation for this visitor
    const visitorConvs = Object.values(this.data.conversations)
      .filter((c) => c.visitor_id === params.visitor_id)
      .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());

    const activeOrPaused = visitorConvs.find(
      (c) => c.status === 'active' || c.status === 'paused'
    );

    if (activeOrPaused) {
      activeOrPaused.last_activity_at = now;
      activeOrPaused.updated_at = now;
      if (activeOrPaused.status === 'paused') {
        activeOrPaused.status = 'active';
      }
      this.save();
      syncConversationToSupabase(activeOrPaused).catch(() => {});
      return activeOrPaused;
    }

    // 3. Create a brand new conversation
    const newConvId = params.conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newConv: Conversation = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      conversation_id: newConvId,
      visitor_id: params.visitor_id,
      status: 'active',
      current_stage: 'welcome',
      current_question: 'welcome_initial',
      source: params.source || 'direct',
      campaign: params.campaign,
      medium: params.medium,
      content: params.content,
      landing_page: params.landing_page,
      referrer: params.referrer,
      started_at: now,
      last_activity_at: now,
      created_at: now,
      updated_at: now
    };

    this.data.conversations[newConvId] = newConv;

    this.logEvent({
      visitor_id: params.visitor_id,
      conversation_id: newConvId,
      event_type: 'conversation_started',
      event_data: { source: params.source, campaign: params.campaign }
    });

    this.save();
    syncConversationToSupabase(newConv).catch(() => {});
    return newConv;
  }

  public getConversation(conversation_id: string): Conversation | undefined {
    return this.data.conversations[conversation_id];
  }

  public listVisitorConversations(visitor_id: string): Conversation[] {
    return Object.values(this.data.conversations)
      .filter((c) => c.visitor_id === visitor_id)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  public listAllConversations(): Conversation[] {
    return Object.values(this.data.conversations).sort(
      (a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
    );
  }

  public updateConversation(
    conversation_id: string,
    updates: Partial<Conversation>
  ): Conversation | null {
    const conv = this.data.conversations[conversation_id];
    if (!conv) return null;

    Object.assign(conv, updates, {
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.save();
    syncConversationToSupabase(conv).catch(() => {});

    // Sync updated conversation state to lead_submissions
    const visitor = this.getVisitor(conv.visitor_id);
    const answers = this.getConversationAnswers(conversation_id);
    syncLeadSubmissionToSupabase({ visitor, conversation: conv, answers }).catch(() => {});

    return conv;
  }

  // --- Answers Operations (Immediate Persistence & Idempotency) ---
  public saveAnswer(answer: {
    conversation_id: string;
    visitor_id: string;
    question_id: string;
    question_text: string;
    answer_value: string;
    answer_label: string;
    raw_answer?: string;
    answer_type: 'button' | 'multi_select' | 'free_text' | 'amount' | 'email';
    stage: ConversationStage;
    submission_id?: string;
  }): ConversationAnswer {
    const now = new Date().toISOString();

    // Idempotency check: see if matching answer with same submission_id or conv+question already exists
    const existing = Object.values(this.data.answers).find((a) => {
      if (answer.submission_id && a.submission_id === answer.submission_id) return true;
      return a.conversation_id === answer.conversation_id && a.question_id === answer.question_id;
    });

    if (existing) {
      existing.answer_value = answer.answer_value;
      existing.answer_label = answer.answer_label;
      existing.raw_answer = answer.raw_answer || answer.answer_label;
      existing.answer_type = answer.answer_type;
      existing.stage = answer.stage;
      existing.updated_at = now;
      this.save();
      syncAnswerToSupabase(existing).catch(() => {});

      // Sync updated answers to dedicated columns in lead_submissions
      const visitor = this.getVisitor(answer.visitor_id);
      const conv = this.getConversation(answer.conversation_id);
      const allAnswers = this.getConversationAnswers(answer.conversation_id);
      syncLeadSubmissionToSupabase({ visitor, conversation: conv, answers: allAnswers }).catch(() => {});

      return existing;
    }

    const answerId = `ans_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newAnswer: ConversationAnswer = {
      id: answerId,
      conversation_id: answer.conversation_id,
      visitor_id: answer.visitor_id,
      question_id: answer.question_id,
      question_text: answer.question_text,
      answer_value: answer.answer_value,
      answer_label: answer.answer_label,
      raw_answer: answer.raw_answer || answer.answer_label,
      answer_type: answer.answer_type,
      stage: answer.stage,
      submission_id: answer.submission_id,
      created_at: now,
      updated_at: now
    };

    this.data.answers[answerId] = newAnswer;

    // Log answer event
    this.logEvent({
      visitor_id: answer.visitor_id,
      conversation_id: answer.conversation_id,
      event_type: 'answer_submitted',
      event_data: {
        question_id: answer.question_id,
        answer_value: answer.answer_value,
        stage: answer.stage
      }
    });

    // Update conversation last_activity_at
    const conv = this.data.conversations[answer.conversation_id];
    if (conv) {
      conv.last_activity_at = now;
      conv.updated_at = now;
    }

    this.save();
    syncAnswerToSupabase(newAnswer).catch(() => {});

    // Sync immediate answer to dedicated column in lead_submissions
    const visitor = this.getVisitor(answer.visitor_id);
    const allAnswers = this.getConversationAnswers(answer.conversation_id);
    syncLeadSubmissionToSupabase({ visitor, conversation: conv, answers: allAnswers }).catch(() => {});

    return newAnswer;
  }

  public getConversationAnswers(conversation_id: string): ConversationAnswer[] {
    return Object.values(this.data.answers)
      .filter((a) => a.conversation_id === conversation_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public getVisitorAnswers(visitor_id: string): ConversationAnswer[] {
    return Object.values(this.data.answers)
      .filter((a) => a.visitor_id === visitor_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // --- Messages Operations ---
  public saveMessage(message: {
    conversation_id: string;
    visitor_id: string;
    sender: 'agent' | 'user' | 'system';
    mode?: any;
    text: string;
    options?: any[];
    allowMultiSelect?: boolean;
    questionId?: string;
    questionStage?: ConversationStage;
    metadata?: Record<string, any>;
  }): ChatMessage {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const newMsg: ChatMessage = {
      id: msgId,
      conversation_id: message.conversation_id,
      visitor_id: message.visitor_id,
      sender: message.sender,
      mode: message.mode,
      text: message.text,
      options: message.options,
      allowMultiSelect: message.allowMultiSelect,
      questionId: message.questionId,
      questionStage: message.questionStage,
      metadata: message.metadata,
      created_at: now
    };

    this.data.messages[msgId] = newMsg;

    const conv = this.data.conversations[message.conversation_id];
    if (conv) {
      conv.last_activity_at = now;
      conv.updated_at = now;
    }

    this.save();
    syncMessageToSupabase(newMsg).catch(() => {});
    return newMsg;
  }

  public getConversationMessages(conversation_id: string): ChatMessage[] {
    return Object.values(this.data.messages)
      .filter((m) => m.conversation_id === conversation_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // --- Events Operations ---
  public logEvent(event: {
    visitor_id: string;
    conversation_id: string;
    event_type: ConversationEvent['event_type'];
    event_data?: Record<string, any>;
  }): ConversationEvent {
    const newEvent: ConversationEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      visitor_id: event.visitor_id,
      conversation_id: event.conversation_id,
      event_type: event.event_type,
      event_data: event.event_data,
      created_at: new Date().toISOString()
    };

    this.data.events.push(newEvent);
    this.save();
    syncEventToSupabase(newEvent).catch(() => {});
    return newEvent;
  }

  public getConversationEvents(conversation_id: string): ConversationEvent[] {
    return this.data.events.filter((e) => e.conversation_id === conversation_id);
  }

  public getVisitorEvents(visitor_id: string): ConversationEvent[] {
    return this.data.events.filter((e) => e.visitor_id === visitor_id);
  }

  // --- Abandoned Conversations Sweep ---
  public checkAndMarkAbandoned(thresholdMinutes = 30): number {
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const now = Date.now();
    let updatedCount = 0;

    Object.values(this.data.conversations).forEach((conv) => {
      if (conv.status === 'active' || conv.status === 'paused') {
        const lastAct = new Date(conv.last_activity_at).getTime();
        if (now - lastAct > thresholdMs) {
          conv.status = 'abandoned';
          conv.updated_at = new Date().toISOString();
          this.logEvent({
            visitor_id: conv.visitor_id,
            conversation_id: conv.conversation_id,
            event_type: 'conversation_abandoned',
            event_data: { inactiveMinutes: Math.round((now - lastAct) / 60000) }
          });
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      this.save();
    }
    return updatedCount;
  }

  // --- Clear / Reset (for test isolation) ---
  public resetData() {
    this.data = {
      visitors: {},
      conversations: {},
      answers: {},
      events: [],
      messages: {}
    };
    this.seedInitialData();
    this.save();
  }
}

export const db = new RelationalDB();
