import {
  Visitor,
  Conversation,
  ConversationAnswer,
  ConversationStage,
  ChatMessage,
  MessageOption,
  QualificationStatus,
  NextAction
} from '../types';
import { getOrCreateVisitorId, getActiveConversationId, setActiveConversationId } from './visitor';

export interface EducationalTopic {
  id: string;
  title: string;
  summary: string;
  bulletPoints: string[];
  keyTakeaway: string;
  adviserRelevance: string;
}

export const APPROVED_EDUCATIONAL_TOPICS: Record<string, EducationalTopic> = {
  diversification: {
    id: 'diversification',
    title: 'Understanding Diversification',
    summary: 'Diversification is the practice of spreading your investments across different asset classes, sectors, and geographies to reduce overall portfolio risk.',
    bulletPoints: [
      'Different assets (like equities, bonds, cash, and property) react differently to economic events.',
      'Holding a mix of assets helps smooth out returns over time, reducing the impact of any single falling investment.',
      'Diversification does not guarantee against loss, but it is one of the most effective tools to manage volatility.'
    ],
    keyTakeaway: 'Avoid putting all your eggs in one basket; a balanced spread can help align your risk with your long-term goals.',
    adviserRelevance: 'An adviser can help construct an optimal asset allocation tailored to your specific risk tolerance and target timeline.'
  },
  risk_vs_return: {
    id: 'risk_vs_return',
    title: 'The Relationship Between Risk & Return',
    summary: 'Higher potential returns generally require accepting greater volatility and potential for short-term losses.',
    bulletPoints: [
      'Cash and high-quality government bonds offer lower risk but may not outpace inflation over long periods.',
      'Equities (stocks) historically offer higher potential growth over 5–10+ years, but with sharper short-term price fluctuations.',
      'Your risk capacity depends on your timeline: longer time horizons allow more time to recover from market downturns.'
    ],
    keyTakeaway: 'Match your risk level to your time horizon and comfort, ensuring you do not take more risk than needed to meet your objectives.',
    adviserRelevance: 'A qualified wealth planner conducts comprehensive risk profiling to balance your emotional comfort with mathematical growth requirements.'
  },
  pensions_and_isas: {
    id: 'pensions_and_isas',
    title: 'Tax-Efficient Investing: Pensions & ISAs',
    summary: 'Utilising tax-advantaged accounts in the UK can significantly boost net returns over the compounding horizon.',
    bulletPoints: [
      'ISAs (Individual Savings Accounts) allow you to invest up to the annual allowance where all capital gains and dividends grow 100% tax-free.',
      'Pensions benefit from upfront income tax relief (basic, higher, and additional rates) and employer contributions.',
      'Pension funds are accessible from normal minimum pension age (currently 55, rising to 57 in 2028).'
    ],
    keyTakeaway: 'Balancing contributions between ISAs (accessible flexibility) and Pensions (tax relief on retirement) is a cornerstone of financial planning.',
    adviserRelevance: 'Advisers provide holistic tax wrapper optimisation, lifetime cashflow modelling, and pension consolidation analysis.'
  },
  compounding_and_inflation: {
    id: 'compounding_and_inflation',
    title: 'The Power of Compounding vs. Inflation',
    summary: 'Compounding allows your investment earnings to generate their own earnings over time, acting as a crucial defence against inflation.',
    bulletPoints: [
      'Inflation erodes the purchasing power of idle cash savings year after year.',
      'Reinvesting dividends and interest creates an exponential growth curve over decades.',
      'Starting earlier gives your capital significantly more time to multiply, even with modest regular contributions.'
    ],
    keyTakeaway: 'Investing early and consistently helps preserve and expand your real purchasing power.',
    adviserRelevance: 'An adviser can model inflation-adjusted projections to ensure your future retirement income maintains its lifestyle standard.'
  },
  funds_and_etfs: {
    id: 'funds_and_etfs',
    title: 'Funds, ETFs & Equities Explained',
    summary: 'Funds and ETFs (Exchange Traded Funds) allow investors to purchase a basket of hundreds or thousands of securities in a single transaction.',
    bulletPoints: [
      'Passive index funds and ETFs track specific market benchmarks (e.g. FTSE 100, S&P 500, MSCI World) at low ongoing management costs.',
      'Active funds are managed by fund managers attempting to outperform indices, usually with higher fee structures.',
      'Collective funds provide instant diversification that would be costly and complex to build with individual single shares.'
    ],
    keyTakeaway: 'Baskets of diversified index funds form the core building blocks for most modern institutional and personal portfolios.',
    adviserRelevance: 'Advisers select cost-effective, institutional-grade portfolios with disciplined rebalancing frameworks.'
  },
  retirement_readiness: {
    id: 'retirement_readiness',
    title: 'Planning for a Comfortable Retirement',
    summary: 'Retirement planning is about transforming accumulated wealth into a sustainable, tax-efficient stream of lifetime income.',
    bulletPoints: [
      'Identify your desired annual income in retirement and account for essential vs discretionary spending.',
      'Trace all existing workplace pensions, personal SIPPs, and state pension forecasts.',
      'Consider your withdrawal strategy (drawdown vs annuities) to manage longevity and market sequence-of-returns risk.'
    ],
    keyTakeaway: 'A clear retirement roadmap replaces anxiety with a calculated step-by-step contribution and drawdown strategy.',
    adviserRelevance: 'Advisers provide comprehensive retirement income stress-testing, annuity comparison, and pension legacy planning.'
  }
};

class ClientLocalStore {
  private getStorageKey(key: string): string {
    return `fca_local_${key}`;
  }

  public getVisitor(visitorId: string): Visitor | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(`visitor_${visitorId}`));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public saveVisitor(visitor: Visitor): void {
    try {
      localStorage.setItem(this.getStorageKey(`visitor_${visitor.visitor_id}`), JSON.stringify(visitor));
    } catch (e) {
      console.warn('LocalStorage saveVisitor failed:', e);
    }
  }

  public getConversation(convId: string): Conversation | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(`conv_${convId}`));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public saveConversation(conv: Conversation): void {
    try {
      localStorage.setItem(this.getStorageKey(`conv_${conv.conversation_id}`), JSON.stringify(conv));
    } catch (e) {
      console.warn('LocalStorage saveConversation failed:', e);
    }
  }

  public getMessages(convId: string): ChatMessage[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(`msgs_${convId}`));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveMessages(convId: string, messages: ChatMessage[]): void {
    try {
      localStorage.setItem(this.getStorageKey(`msgs_${convId}`), JSON.stringify(messages));
    } catch (e) {
      console.warn('LocalStorage saveMessages failed:', e);
    }
  }

  public getAnswers(convId: string): ConversationAnswer[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(`answers_${convId}`));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveAnswers(convId: string, answers: ConversationAnswer[]): void {
    try {
      localStorage.setItem(this.getStorageKey(`answers_${convId}`), JSON.stringify(answers));
    } catch (e) {
      console.warn('LocalStorage saveAnswers failed:', e);
    }
  }
}

export const clientStore = new ClientLocalStore();

export function initializeClientConversation(params: {
  visitor_id: string;
  conversation_id?: string;
  source?: string;
  campaign?: string;
  medium?: string;
  content?: string;
  landing_page?: string;
  referrer?: string;
}): {
  visitor: Visitor;
  conversation: Conversation;
  messages: ChatMessage[];
  answers: ConversationAnswer[];
  isResumed: boolean;
} {
  const visitorId = params.visitor_id || getOrCreateVisitorId();
  let visitor = clientStore.getVisitor(visitorId);
  const now = new Date().toISOString();

  if (!visitor) {
    visitor = {
      id: `v_db_${Date.now()}`,
      visitor_id: visitorId,
      first_seen_at: now,
      last_seen_at: now,
      source: params.source,
      campaign: params.campaign,
      medium: params.medium,
      content: params.content,
      landing_page: params.landing_page,
      referrer: params.referrer,
      created_at: now,
      updated_at: now
    };
    clientStore.saveVisitor(visitor);
  }

  const convId = params.conversation_id || getActiveConversationId() || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  setActiveConversationId(convId);

  let conversation = clientStore.getConversation(convId);
  let messages = clientStore.getMessages(convId);
  let answers = clientStore.getAnswers(convId);
  let isResumed = false;

  if (conversation && messages.length > 0) {
    isResumed = true;
  } else {
    conversation = {
      id: `c_db_${Date.now()}`,
      conversation_id: convId,
      visitor_id: visitorId,
      status: 'active',
      started_at: now,
      last_activity_at: now,
      current_stage: 'welcome',
      source: params.source,
      campaign: params.campaign,
      medium: params.medium,
      content: params.content,
      landing_page: params.landing_page,
      referrer: params.referrer,
      qualification_status: 'not_ready',
      next_action: 'education',
      created_at: now,
      updated_at: now
    };

    let campaignIntro = '';
    if (params.campaign === 'retirement_campaign' || params.content === 'email_02') {
      campaignIntro = 'I noticed you were exploring our retirement planning briefings. ';
    }

    const initialGreeting: ChatMessage = {
      id: `msg_init_${Date.now()}`,
      conversation_id: convId,
      visitor_id: visitorId,
      sender: 'agent',
      mode: 'relationship_manager',
      text: `Hello and welcome. I'm Marcus Sterling, Senior Chartered Wealth Consultant here at Matt Strategy Futuristic.\n\n${campaignIntro}I work with clients to help clarify their financial objectives, assess existing assets, and structure their plans before we move to formal advice.\n\nWhat would you most like to explore together today?`,
      options: [
        { id: 'plan_retirement', label: 'Plan for retirement', value: 'plan_retirement' },
        { id: 'grow_wealth', label: 'Grow and structure wealth', value: 'grow_wealth' },
        { id: 'start_investing', label: 'Start investing', value: 'start_investing' },
        { id: 'review_finances', label: 'Review my existing finances', value: 'review_finances' },
        { id: 'protect_wealth', label: 'Protect my wealth & family', value: 'protect_wealth' },
        { id: 'something_else', label: 'Something else', value: 'something_else' }
      ],
      questionId: 'primary_goal',
      questionStage: 'welcome',
      created_at: now
    };

    messages = [initialGreeting];
    clientStore.saveConversation(conversation);
    clientStore.saveMessages(convId, messages);
    clientStore.saveAnswers(convId, []);
  }

  return {
    visitor,
    conversation,
    messages,
    answers,
    isResumed
  };
}

export function processClientAnswer(params: {
  visitor_id: string;
  conversation_id: string;
  question_id: string;
  question_text: string;
  answer_value: string;
  answer_label: string;
  raw_answer?: string;
  answer_type: 'button' | 'multi_select' | 'free_text' | 'amount' | 'email';
  stage: ConversationStage;
  submission_id?: string;
}): {
  answer: ConversationAnswer;
  conversation: Conversation;
  agentMessage: ChatMessage;
  answers: ConversationAnswer[];
} {
  const now = new Date().toISOString();
  let conversation = clientStore.getConversation(params.conversation_id);

  if (!conversation) {
    conversation = {
      id: `c_db_${Date.now()}`,
      conversation_id: params.conversation_id,
      visitor_id: params.visitor_id,
      status: 'active',
      started_at: now,
      last_activity_at: now,
      current_stage: params.stage,
      qualification_status: 'not_ready',
      next_action: 'education',
      created_at: now,
      updated_at: now
    };
  }

  // 1. Save new Answer immediately
  const existingAnswers = clientStore.getAnswers(params.conversation_id);
  const newAnswer: ConversationAnswer = {
    id: `ans_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    conversation_id: params.conversation_id,
    visitor_id: params.visitor_id,
    question_id: params.question_id,
    question_text: params.question_text,
    answer_value: params.answer_value,
    answer_label: params.answer_label,
    raw_answer: params.raw_answer,
    answer_type: params.answer_type,
    stage: params.stage,
    created_at: now,
    updated_at: now
  };

  // Upsert answer
  const updatedAnswers = [
    ...existingAnswers.filter((a) => a.question_id !== params.question_id),
    newAnswer
  ];
  clientStore.saveAnswers(params.conversation_id, updatedAnswers);

  // 2. Determine Next Stage & Options
  const nextStageConfig = determineNextClientStage(
    conversation.current_stage,
    params.question_id,
    params.answer_value,
    updatedAnswers
  );

  conversation.current_stage = nextStageConfig.stage;
  conversation.last_activity_at = now;
  conversation.updated_at = now;

  // Update qualification metrics
  const qual = computeQualification(updatedAnswers);
  conversation.qualification_status = qual.status;
  conversation.next_action = qual.nextAction;
  clientStore.saveConversation(conversation);

  // 3. Craft Agent Response
  const agentMessage: ChatMessage = {
    id: `msg_ag_${Date.now()}`,
    conversation_id: params.conversation_id,
    visitor_id: params.visitor_id,
    sender: 'agent',
    mode: nextStageConfig.mode,
    text: nextStageConfig.messageText,
    options: nextStageConfig.options,
    allowMultiSelect: nextStageConfig.allowMultiSelect,
    metadata: {
      topicKey: nextStageConfig.topicKey,
      adviserRelevance: nextStageConfig.adviserRelevance
    },
    questionId: nextStageConfig.questionId,
    questionStage: nextStageConfig.stage,
    created_at: now
  };

  const currentMessages = clientStore.getMessages(params.conversation_id);
  const userMessage: ChatMessage = {
    id: `msg_usr_${Date.now()}`,
    conversation_id: params.conversation_id,
    visitor_id: params.visitor_id,
    sender: 'user',
    text: params.raw_answer || params.answer_label || params.answer_value,
    questionId: params.question_id,
    questionStage: params.stage,
    created_at: now
  };

  clientStore.saveMessages(params.conversation_id, [...currentMessages, userMessage, agentMessage]);

  return {
    answer: newAnswer,
    conversation,
    agentMessage,
    answers: updatedAnswers
  };
}

export function processClientFreeText(params: {
  visitor_id: string;
  conversation_id: string;
  text: string;
}): {
  userMessage: ChatMessage;
  agentMessage: ChatMessage;
  conversation: Conversation;
} {
  const convId = params.conversation_id;
  const now = new Date().toISOString();
  let conversation = clientStore.getConversation(convId);

  if (!conversation) {
    conversation = {
      id: `c_db_${Date.now()}`,
      conversation_id: convId,
      visitor_id: params.visitor_id,
      status: 'active',
      started_at: now,
      last_activity_at: now,
      current_stage: 'goal_discovery',
      qualification_status: 'not_ready',
      next_action: 'education',
      created_at: now,
      updated_at: now
    };
  }

  const userMessage: ChatMessage = {
    id: `msg_usr_${Date.now()}`,
    conversation_id: convId,
    visitor_id: params.visitor_id,
    sender: 'user',
    text: params.text,
    created_at: now
  };

  // Generate smart conversational reply
  const lower = params.text.toLowerCase();
  let replyText = `Thank you for sharing that. At Matt Strategy Futuristic, we align our strategic advisory around your personal priorities.`;
  let options: MessageOption[] = [];
  let topicKey: string | undefined;

  if (lower.includes('retire') || lower.includes('pension')) {
    replyText = `Retirement and pension planning is a core specialty of our practice. Structuring your lifetime income drawdown and consolidating legacy pensions can create substantial tax efficiencies.\n\nWould you like to explore your retirement timeline or schedule a 1-on-1 strategy meeting?`;
    topicKey = 'retirement_readiness';
    options = [
      { id: 'plan_retirement', label: 'Explore retirement timeline', value: 'plan_retirement' },
      { id: 'book_now', label: 'Schedule 1-on-1 Consultation', value: 'book_now' }
    ];
  } else if (lower.includes('tax') || lower.includes('isa')) {
    replyText = `Tax wrapper optimisation (balancing ISAs, Pensions, and General Investment Accounts) is essential for compounding capital efficiently without unnecessary tax drag.`;
    topicKey = 'pensions_and_isas';
    options = [
      { id: 'grow_wealth', label: 'Structure my investments', value: 'grow_wealth' },
      { id: 'speak_adviser', label: 'Speak with Marcus Sterling', value: 'speak_adviser' }
    ];
  } else if (lower.includes('risk') || lower.includes('loss') || lower.includes('volatile')) {
    replyText = `Managing volatility while ensuring capital maintains long-term purchasing power is key. We structure portfolios according to measured risk capacity and distinct milestone horizons.`;
    topicKey = 'risk_vs_return';
    options = [
      { id: 'review_finances', label: 'Review my existing portfolio', value: 'review_finances' },
      { id: 'explore_diversification', label: 'Explore diversification strategy', value: 'explore_diversification' }
    ];
  } else {
    replyText = `I appreciate that context. Building a tailored strategy begins with understanding your key financial objectives and current timeline.\n\nLet's continue mapping out your financial picture together:`;
    options = [
      { id: 'plan_retirement', label: 'Plan for retirement', value: 'plan_retirement' },
      { id: 'grow_wealth', label: 'Grow and structure wealth', value: 'grow_wealth' },
      { id: 'start_investing', label: 'Start investing', value: 'start_investing' },
      { id: 'review_finances', label: 'Review my existing finances', value: 'review_finances' }
    ];
  }

  const agentMessage: ChatMessage = {
    id: `msg_ag_${Date.now()}`,
    conversation_id: convId,
    visitor_id: params.visitor_id,
    sender: 'agent',
    mode: 'relationship_manager',
    text: replyText,
    options,
    metadata: {
      topicKey
    },
    created_at: now
  };

  const msgs = clientStore.getMessages(convId);
  clientStore.saveMessages(convId, [...msgs, userMessage, agentMessage]);

  return {
    userMessage,
    agentMessage,
    conversation
  };
}

function determineNextClientStage(
  currentStage: ConversationStage,
  questionId: string,
  answerValue: string,
  answers: ConversationAnswer[]
): {
  stage: ConversationStage;
  questionId: string;
  mode: 'relationship_manager' | 'financial_educator' | 'adviser_connector';
  messageText: string;
  options: MessageOption[];
  allowMultiSelect?: boolean;
  inferredPersona?: string;
  topicKey?: string;
  adviserRelevance?: string;
} {
  // STAGE 1 -> STAGE 2 (Goal Discovery)
  if (questionId === 'primary_goal' || currentStage === 'welcome') {
    let inferredPersona = 'General Wealth Accumulator';
    if (answerValue === 'plan_retirement') inferredPersona = 'Retirement Planner';
    else if (answerValue === 'start_investing') inferredPersona = 'Novice Investor';
    else if (answerValue === 'protect_wealth') inferredPersona = 'Wealth Preserver';

    return {
      stage: 'goal_discovery',
      questionId: 'goal_details',
      mode: 'relationship_manager',
      inferredPersona,
      messageText: `What are you ultimately hoping your wealth and investments will help you achieve?`,
      options: [
        { id: 'g_fi', label: 'Financial independence', value: 'financial_independence' },
        { id: 'g_prop', label: 'Buy a property', value: 'buy_property' },
        { id: 'g_ltw', label: 'Build long-term wealth', value: 'build_long_term_wealth' },
        { id: 'g_fam', label: 'Provide for my family', value: 'provide_for_family' },
        { id: 'g_ret', label: 'Retire comfortably', value: 'retire_comfortably' },
        { id: 'g_ns', label: "I don't have a specific goal yet", value: 'no_specific_goal' }
      ]
    };
  }

  // STAGE 2 -> STAGE 3 (Financial Situation)
  if (questionId === 'goal_details' || currentStage === 'goal_discovery') {
    return {
      stage: 'financial_situation',
      questionId: 'financial_situation',
      mode: 'relationship_manager',
      messageText: `And where would you say you are in your financial journey today?`,
      options: [
        { id: 'fs_new', label: "I'm completely new to investing", value: 'completely_new' },
        { id: 'fs_savings', label: "I have savings but haven't invested much", value: 'savings_only' },
        { id: 'fs_active', label: 'I already have investments', value: 'already_have_investments' },
        { id: 'fs_established', label: 'I have an established investment portfolio', value: 'established_portfolio' },
        {
          id: 'fs_complex',
          label: 'I have several investments, pensions or assets and want professional advice',
          value: 'several_investments_advice'
        }
      ]
    };
  }

  // STAGE 3 -> STAGE 4 (Time Horizon)
  if (questionId === 'financial_situation' || currentStage === 'financial_situation') {
    return {
      stage: 'time_horizon',
      questionId: 'time_horizon',
      mode: 'relationship_manager',
      messageText: `Approximately when would you like to achieve this goal or transition?`,
      options: [
        { id: 'th_under3', label: 'Under 3 years', value: 'under_3_years' },
        { id: 'th_3_5', label: '3–5 years', value: '3_to_5_years' },
        { id: 'th_5_10', label: '5–10 years', value: '5_to_10_years' },
        { id: 'th_10plus', label: '10+ years', value: '10_plus_years' },
        { id: 'th_not_sure', label: 'Not sure', value: 'not_sure' }
      ]
    };
  }

  // STAGE 4 -> STAGE 5 (Investment Experience)
  if (questionId === 'time_horizon' || currentStage === 'time_horizon') {
    return {
      stage: 'investment_experience',
      questionId: 'investment_experience',
      mode: 'relationship_manager',
      messageText: `Which of these assets or vehicles are you already familiar with?`,
      allowMultiSelect: true,
      options: [
        { id: 'exp_cash', label: 'Cash / savings', value: 'cash_savings' },
        { id: 'exp_stocks', label: 'Stocks', value: 'stocks' },
        { id: 'exp_funds', label: 'Funds / ETFs', value: 'funds_etfs' },
        { id: 'exp_bonds', label: 'Bonds', value: 'bonds' },
        { id: 'exp_pensions', label: 'Pensions', value: 'pensions' },
        { id: 'exp_property', label: 'Property', value: 'property' },
        { id: 'exp_none', label: 'None of the above', value: 'none' }
      ]
    };
  }

  // STAGE 5 -> STAGE 6 (Risk and Priorities)
  if (questionId === 'investment_experience' || currentStage === 'investment_experience') {
    return {
      stage: 'risk_and_priorities',
      questionId: 'risk_concerns',
      mode: 'financial_educator',
      topicKey: 'risk_vs_return',
      messageText: `When you think about investing, what is your biggest question or concern?`,
      options: [
        { id: 'rc_lose', label: 'Losing money', value: 'losing_money' },
        { id: 'rc_enough', label: 'Not having enough for the future', value: 'not_having_enough' },
        { id: 'rc_know', label: "Not knowing what I'm doing", value: 'not_knowing_what_doing' },
        { id: 'rc_fees', label: 'High fees or bad advice', value: 'high_fees_bad_advice' },
        { id: 'rc_conf', label: "I'm fairly confident, just want a strategy", value: 'fairly_confident' }
      ]
    };
  }

  // STAGE 6 -> STAGE 7 (Investment Amount)
  if (questionId === 'risk_concerns' || currentStage === 'risk_and_priorities') {
    return {
      stage: 'investment_amount',
      questionId: 'investment_amount',
      mode: 'relationship_manager',
      messageText: `Roughly how much are you looking to invest, review, or structure? (This helps me provide the most relevant guidance)`,
      options: [
        { id: 'amt_u25', label: 'Under £25,000', value: 'under_25k' },
        { id: 'amt_25_50', label: '£25,000 – £50,000', value: '25k_50k' },
        { id: 'amt_50_100', label: '£50,000 – £100,000', value: '50k_100k' },
        { id: 'amt_100_250', label: '£100,000 – £250,000', value: '100k_250k' },
        { id: 'amt_250plus', label: '£250,000+', value: '250k_plus' },
        { id: 'amt_prefer_not', label: 'Prefer not to say right now', value: 'prefer_not_to_say' }
      ]
    };
  }

  // STAGE 7 -> STAGE 8 (Summary & Next Steps)
  return {
    stage: 'adviser_conversion',
    questionId: 'summary_confirmation',
    mode: 'adviser_connector',
    topicKey: 'retirement_readiness',
    messageText: `Thank you for sharing those details. I've compiled your Consultation Notes in your live profile panel.\n\nWould you like to schedule a complimentary 1-on-1 private strategy consultation with me?`,
    options: [
      { id: 'book_adviser', label: 'Book a 1-on-1 Consultation', value: 'book_adviser' },
      { id: 'ask_more', label: 'Ask another question first', value: 'ask_more' },
      { id: 'download_summary', label: 'Email me my summary notes', value: 'download_summary' }
    ]
  };
}

function computeQualification(answers: ConversationAnswer[]): {
  status: QualificationStatus;
  nextAction: NextAction;
} {
  const map = answers.reduce((acc, a) => {
    acc[a.question_id] = a.answer_value;
    return acc;
  }, {} as Record<string, string>);

  const amount = map['investment_amount'];
  const situation = map['financial_situation'];

  if (
    amount === '250k_plus' ||
    amount === '100k_250k' ||
    situation === 'several_investments_advice' ||
    situation === 'established_portfolio'
  ) {
    return {
      status: 'complex',
      nextAction: 'book_consultation'
    };
  }

  if (amount === '50k_100k' || situation === 'already_have_investments') {
    return {
      status: 'qualified',
      nextAction: 'book_consultation'
    };
  }

  return {
    status: 'not_ready',
    nextAction: 'education'
  };
}

export function getClientCRMData() {
  const visitorId = getOrCreateVisitorId();
  const convId = getActiveConversationId();
  const now = new Date().toISOString();
  const visitor: Visitor = clientStore.getVisitor(visitorId) || {
    id: `v_db_${Date.now()}`,
    visitor_id: visitorId,
    first_seen_at: now,
    last_seen_at: now,
    created_at: now,
    updated_at: now
  };
  const conversation: Conversation = (convId ? clientStore.getConversation(convId) : null) || {
    id: `c_db_${Date.now()}`,
    conversation_id: convId || 'conv_active',
    visitor_id: visitorId,
    status: 'active',
    started_at: now,
    last_activity_at: now,
    current_stage: 'welcome',
    qualification_status: 'not_ready',
    next_action: 'education',
    created_at: now,
    updated_at: now
  };
  const answers = convId ? clientStore.getAnswers(convId) : [];

  const enrichedVisitor = {
    ...visitor,
    conversations_count: 1,
    latest_conversation: conversation,
    answers,
    events: [],
    qualification_status: conversation.qualification_status || 'not_ready',
    next_action: conversation.next_action || 'education',
    client_summary: `Consultation notes for ${visitor.first_name || 'Prospect'} (${answers.length} answers captured)`
  };

  const analytics = {
    total_visitors: 1,
    total_conversations: 1,
    qualified_leads: conversation.qualification_status === 'qualified' || conversation.qualification_status === 'complex' ? 1 : 0,
    booked_consultations: conversation.status === 'booked' ? 1 : 0,
    abandoned_conversations: 0,
    emails_captured: visitor.email ? 1 : 0,
    conversion_rate: 100,
    campaigns: { [visitor.campaign || 'direct']: 1 },
    stages: { [conversation.current_stage]: 1 }
  };

  return {
    visitors: [enrichedVisitor],
    analytics
  };
}
