import { db } from './db';
import { APPROVED_EDUCATIONAL_TOPICS } from './knowledge';
import { generateChatResponse } from './llm';
import { generateAdviserSummary } from './gemini';
import {
  Visitor,
  Conversation,
  ConversationAnswer,
  ConversationStage,
  ChatMessage,
  MessageOption,
  QualificationStatus,
  NextAction
} from '../src/types';

export interface ProcessAnswerRequest {
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
  user_text?: string;
}

export class ConversationEngine {
  /**
   * Initialize a new or resumed conversation session with messages
   */
  public async initializeConversation(params: {
    visitor_id: string;
    conversation_id?: string;
    source?: string;
    campaign?: string;
    medium?: string;
    content?: string;
    landing_page?: string;
    referrer?: string;
  }): Promise<{
    visitor: Visitor;
    conversation: Conversation;
    messages: ChatMessage[];
    answers: ConversationAnswer[];
    isResumed: boolean;
  }> {
    const visitor = db.getOrCreateVisitor({
      visitor_id: params.visitor_id,
      source: params.source,
      campaign: params.campaign,
      medium: params.medium,
      content: params.content,
      landing_page: params.landing_page,
      referrer: params.referrer
    });

    const conversation = db.getOrCreateConversation({
      visitor_id: params.visitor_id,
      conversation_id: params.conversation_id,
      source: params.source,
      campaign: params.campaign,
      medium: params.medium,
      content: params.content,
      landing_page: params.landing_page,
      referrer: params.referrer
    });

    const answers = db.getConversationAnswers(conversation.conversation_id);
    let messages = db.getConversationMessages(conversation.conversation_id);

    let isResumed = false;

    // If conversation already has answers / messages, craft a resume message if needed
    if (messages.length > 0) {
      isResumed = true;
      db.logEvent({
        visitor_id: visitor.visitor_id,
        conversation_id: conversation.conversation_id,
        event_type: 'conversation_resumed',
        event_data: { stage: conversation.current_stage, answerCount: answers.length }
      });
    } else {
      // First time initializing conversation: deliver initial greeting message
      const initialMsg = this.createInitialGreetingMessage(visitor, conversation);
      db.saveMessage(initialMsg);
      messages = [initialMsg];
    }

    return {
      visitor,
      conversation,
      messages,
      answers,
      isResumed
    };
  }

  /**
   * Primary Step: Process user answer, SAVE IMMEDIATELY, determine next step, generate ChatGPT response
   */
  public async processAnswer(req: ProcessAnswerRequest): Promise<{
    answer: ConversationAnswer;
    conversation: Conversation;
    agentMessage: ChatMessage;
    answers: ConversationAnswer[];
    qualification?: {
      status: QualificationStatus;
      nextAction: NextAction;
      summary?: string;
    };
  }> {
    const visitor = db.getVisitor(req.visitor_id) || db.getOrCreateVisitor({ visitor_id: req.visitor_id });
    const conversation = db.getConversation(req.conversation_id) || db.getOrCreateConversation({
      visitor_id: req.visitor_id,
      conversation_id: req.conversation_id
    });

    // 1. SAVE USER MESSAGE
    db.saveMessage({
      conversation_id: req.conversation_id,
      visitor_id: req.visitor_id,
      sender: 'user',
      text: req.raw_answer || req.answer_label || req.answer_value,
      questionId: req.question_id,
      questionStage: req.stage
    });

    // 2. SAVE ANSWER IMMEDIATELY TO DATABASE (MANDATORY RULE)
    const savedAnswer = db.saveAnswer({
      conversation_id: req.conversation_id,
      visitor_id: req.visitor_id,
      question_id: req.question_id,
      question_text: req.question_text,
      answer_value: req.answer_value,
      answer_label: req.answer_label,
      raw_answer: req.raw_answer,
      answer_type: req.answer_type,
      stage: req.stage,
      submission_id: req.submission_id
    });

    // Fetch all updated answers for context
    const allAnswers = db.getConversationAnswers(req.conversation_id);
    const questionsAnswered = allAnswers.map((a) => a.question_id);
    const allPossibleQuestions = [
      'primary_goal',
      'goal_details',
      'financial_situation',
      'time_horizon',
      'investment_experience',
      'risk_concerns',
      'existing_portfolio_focus',
      'investment_amount',
      'summary_confirmation',
      'adviser_conversion'
    ];
    const missingInfo = allPossibleQuestions.filter((q) => !questionsAnswered.includes(q));

    // 3. DETERMINE NEXT STAGE & MODE
    const nextStep = this.determineNextStage(req.stage, req.question_id, req.answer_value, allAnswers);

    // Update conversation state in DB
    db.updateConversation(req.conversation_id, {
      current_stage: nextStep.stage,
      current_question: nextStep.questionId,
      persona: nextStep.inferredPersona || conversation.persona
    });

    if (nextStep.inferredPersona && !visitor.persona) {
      db.updateVisitor(visitor.visitor_id, { persona: nextStep.inferredPersona });
    }

    // 4. CHECK QUALIFICATION
    let qualificationData: any = undefined;
    if (
      nextStep.stage === 'lead_qualification' ||
      nextStep.stage === 'relationship_summary' ||
      nextStep.stage === 'adviser_conversion' ||
      nextStep.stage === 'email_capture' ||
      nextStep.stage === 'adviser_booking' ||
      nextStep.stage === 'education_nurture' ||
      nextStep.stage === 'human_handoff'
    ) {
      const q = this.computeQualification(allAnswers, conversation);
      qualificationData = q;

      const summary = await generateAdviserSummary(visitor, allAnswers, conversation);
      db.updateConversation(req.conversation_id, {
        qualification_status: q.status,
        next_action: q.nextAction,
        client_summary: summary
      });
      qualificationData.summary = summary;
    }

    // 5. GENERATE NEXT AGENT MESSAGE VIA CHATGPT (with context payload)
    const recentMessages = db.getConversationMessages(req.conversation_id);
    let agentText = nextStep.messageText;

    try {
      const generatedText = await generateChatResponse({
        visitor,
        conversation,
        currentStage: nextStep.stage,
        previousAnswers: allAnswers,
        questionsAlreadyAnswered: questionsAnswered,
        missingInformation: missingInfo,
        recentMessages,
        userMessage: req.raw_answer || req.answer_label || req.answer_value,
        mode: nextStep.mode
      });

      if (generatedText && generatedText.trim().length > 0) {
        agentText = generatedText;
      }
    } catch (e) {
      console.warn('LLM text generation fallback to template:', e);
    }

    const agentMsg = db.saveMessage({
      conversation_id: req.conversation_id,
      visitor_id: req.visitor_id,
      sender: 'agent',
      mode: nextStep.mode,
      text: agentText,
      options: nextStep.options,
      allowMultiSelect: nextStep.allowMultiSelect,
      questionId: nextStep.questionId,
      questionStage: nextStep.stage,
      metadata: {
        topicKey: nextStep.topicKey,
        adviserRelevance: nextStep.adviserRelevance
      }
    });

    db.logEvent({
      visitor_id: req.visitor_id,
      conversation_id: req.conversation_id,
      event_type: 'question_shown',
      event_data: {
        stage: nextStep.stage,
        question_id: nextStep.questionId,
        mode: nextStep.mode
      }
    });

    const updatedConv = db.getConversation(req.conversation_id)!;

    return {
      answer: savedAnswer,
      conversation: updatedConv,
      agentMessage: agentMsg,
      answers: allAnswers,
      qualification: qualificationData
    };
  }

  /**
   * Process custom free-text question or educational inquiry from visitor
   */
  public async handleFreeTextInquiry(params: {
    visitor_id: string;
    conversation_id: string;
    userText: string;
  }): Promise<{
    userMessage: ChatMessage;
    agentMessage: ChatMessage;
    conversation: Conversation;
  }> {
    const visitor = db.getVisitor(params.visitor_id) || db.getOrCreateVisitor({ visitor_id: params.visitor_id });
    const conversation = db.getConversation(params.conversation_id) || db.getOrCreateConversation({
      visitor_id: params.visitor_id,
      conversation_id: params.conversation_id
    });

    // Save user message
    const userMsg = db.saveMessage({
      conversation_id: params.conversation_id,
      visitor_id: params.visitor_id,
      sender: 'user',
      text: params.userText
    });

    const answers = db.getConversationAnswers(params.conversation_id);
    const questionsAnswered = answers.map((a) => a.question_id);
    const recentMessages = db.getConversationMessages(params.conversation_id);

    // Detect mode
    const lower = params.userText.toLowerCase();
    let mode: 'relationship_manager' | 'financial_educator' | 'adviser_connector' = 'relationship_manager';

    if (
      lower.includes('diversif') ||
      lower.includes('risk') ||
      lower.includes('pension') ||
      lower.includes('isa') ||
      lower.includes('compound') ||
      lower.includes('fund') ||
      lower.includes('etf')
    ) {
      mode = 'financial_educator';
    } else if (lower.includes('adviser') || lower.includes('speak') || lower.includes('book') || lower.includes('cost')) {
      mode = 'adviser_connector';
    }

    const aiText = await generateChatResponse({
      visitor,
      conversation,
      currentStage: conversation.current_stage,
      previousAnswers: answers,
      questionsAlreadyAnswered: questionsAnswered,
      missingInformation: [],
      recentMessages,
      userMessage: params.userText,
      mode
    });

    let options: MessageOption[] = [];
    if (mode === 'financial_educator') {
      options = [
        { id: 'opt_relate', label: 'Explore how this relates to my goals', value: 'relate_to_situation' },
        { id: 'opt_speak_adviser', label: 'Speak with an adviser', value: 'speak_with_adviser' },
        { id: 'opt_more_topics', label: 'Explore other topics', value: 'explore_more_topics' }
      ];
    } else {
      options = [
        { id: 'opt_cont_discovery', label: 'Continue my discovery plan', value: 'continue_discovery' },
        { id: 'opt_book_now', label: 'Arrange a 20-min consultation', value: 'book_consultation' }
      ];
    }

    const agentMsg = db.saveMessage({
      conversation_id: params.conversation_id,
      visitor_id: params.visitor_id,
      sender: 'agent',
      mode,
      text: aiText,
      options
    });

    return {
      userMessage: userMsg,
      agentMessage: agentMsg,
      conversation
    };
  }

  /**
   * Build initial welcoming message (Stage 1) from consultant
   */
  private createInitialGreetingMessage(visitor: Visitor, conversation: Conversation): ChatMessage {
    let campaignIntro = '';
    if (conversation.campaign === 'retirement_campaign' || conversation.content === 'email_02') {
      campaignIntro = 'I noticed you were exploring our retirement planning briefings. ';
    }

    return {
      id: `msg_init_${Date.now()}`,
      conversation_id: conversation.conversation_id,
      visitor_id: visitor.visitor_id,
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
      created_at: new Date().toISOString()
    };
  }

  /**
   * State Machine determining the stage progression
   */
  private determineNextStage(
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
    const answersMap = answers.reduce((acc, a) => {
      acc[a.question_id] = a.answer_value;
      return acc;
    }, {} as Record<string, string>);

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
        messageText: `What are you ultimately hoping your money will help you achieve?`,
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
        messageText: `And where would you say you are today?`,
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
        messageText: `Approximately when would you like to achieve this goal?`,
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
        messageText: `Which of these are you already familiar with?`,
        allowMultiSelect: true,
        options: [
          { id: 'exp_cash', label: 'Cash / savings', value: 'cash_savings' },
          { id: 'exp_stocks', label: 'Stocks', value: 'stocks' },
          { id: 'exp_funds', label: 'Funds / ETFs', value: 'funds_etfs' },
          { id: 'exp_bonds', label: 'Bonds', value: 'bonds' },
          { id: 'exp_pensions', label: 'Pensions', value: 'pensions' },
          { id: 'exp_property', label: 'Property', value: 'property' },
          { id: 'exp_other', label: 'Other investments', value: 'other' }
        ]
      };
    }

    // STAGE 5 -> STAGE 6 (Risk and Priorities)
    if (questionId === 'investment_experience' || currentStage === 'investment_experience') {
      return {
        stage: 'risk_and_priorities',
        questionId: 'risk_concerns',
        mode: 'relationship_manager',
        messageText: `What concerns you most about your current financial position?`,
        options: [
          {
            id: 'rc_retirement_shortfall',
            label: 'Ensuring I have enough income and do not run out of money',
            value: 'retirement_security'
          },
          {
            id: 'rc_market_dips',
            label: 'Protecting capital against market downturns and inflation',
            value: 'capital_protection'
          },
          {
            id: 'rc_tax_drag',
            label: 'Minimising unnecessary tax on growth and withdrawals',
            value: 'tax_efficiency'
          },
          {
            id: 'rc_consolidation',
            label: 'Consolidating multiple pensions and scattered accounts',
            value: 'consolidation'
          },
          {
            id: 'rc_growth',
            label: 'Maximising long-term compound growth for my family',
            value: 'growth_maximisation'
          }
        ]
      };
    }

    // STAGE 6 -> STAGE 7 (Existing Portfolio) or STAGE 8 (Investment Amount)
    if (questionId === 'risk_concerns' || currentStage === 'risk_and_priorities') {
      const situation = answersMap['financial_situation'];
      const hasInvestments =
        situation === 'already_have_investments' ||
        situation === 'established_portfolio' ||
        situation === 'several_investments_advice';

      if (hasInvestments) {
        return {
          stage: 'existing_portfolio',
          questionId: 'existing_portfolio_focus',
          mode: 'relationship_manager',
          messageText: `What would you most like professional help with?`,
          options: [
            { id: 'ep_div', label: "Understanding whether I'm diversified", value: 'understanding_diversification' },
            { id: 'ep_ret', label: 'Planning for retirement', value: 'planning_for_retirement' },
            { id: 'ep_sav', label: 'Making better use of existing savings', value: 'better_use_of_savings' },
            { id: 'ep_risk', label: 'Understanding investment risk', value: 'understanding_investment_risk' },
            { id: 'ep_rev', label: 'Reviewing my existing portfolio', value: 'reviewing_existing_portfolio' },
            { id: 'ep_bring', label: 'Bringing different investments together', value: 'bringing_investments_together' },
            { id: 'ep_other', label: 'Something else', value: 'something_else' }
          ]
        };
      } else {
        return {
          stage: 'investment_amount',
          questionId: 'investment_amount',
          mode: 'adviser_connector',
          messageText: `To help us understand what kind of support may be relevant, approximately how much are you currently considering investing or seeking advice about?`,
          options: [
            { id: 'amt_under10k', label: 'Under £10,000', value: 'under_10k' },
            { id: 'amt_10k_50k', label: '£10,000–£50,000', value: '10k_to_50k' },
            { id: 'amt_50k_100k', label: '£50,000–£100,000', value: '50k_to_100k' },
            { id: 'amt_100k_250k', label: '£100,000–£250,000', value: '100k_to_250k' },
            { id: 'amt_250k_plus', label: '£250,000+', value: '250k_plus' },
            { id: 'amt_prefer_not_say', label: 'Prefer not to say', value: 'prefer_not_to_say' }
          ]
        };
      }
    }

    // STAGE 7 (Existing Portfolio) -> STAGE 8 (Investment Amount)
    if (questionId === 'existing_portfolio_focus' || currentStage === 'existing_portfolio') {
      return {
        stage: 'investment_amount',
        questionId: 'investment_amount',
        mode: 'adviser_connector',
        messageText: `To help us understand what kind of support may be relevant, approximately how much are you currently considering investing or seeking advice about?`,
        options: [
          { id: 'amt_under10k', label: 'Under £10,000', value: 'under_10k' },
          { id: 'amt_10k_50k', label: '£10,000–£50,000', value: '10k_to_50k' },
          { id: 'amt_50k_100k', label: '£50,000–£100,000', value: '50k_to_100k' },
          { id: 'amt_100k_250k', label: '£100,000–£250,000', value: '100k_to_250k' },
          { id: 'amt_250k_plus', label: '£250,000+', value: '250k_plus' },
          { id: 'amt_prefer_not_say', label: 'Prefer not to say', value: 'prefer_not_to_say' }
        ]
      };
    }

    // STAGE 8 (Investment Amount) -> STAGE 10 (Relationship Summary)
    if (questionId === 'investment_amount' || currentStage === 'investment_amount') {
      const goal = answersMap['goal_details'] || answersMap['primary_goal'] || 'planning for the future';
      const time = answersMap['time_horizon'] || 'the medium term';
      const pos = answersMap['financial_situation'] || 'your existing arrangements';

      return {
        stage: 'relationship_summary',
        questionId: 'summary_confirmation',
        mode: 'relationship_manager',
        messageText: `Just so I know I've understood you correctly: you're focusing on ${goal} over approximately ${time}, looking closely at ${pos}. Is that a fair summary?`,
        options: [
          { id: 'sum_yes', label: 'Yes, that captures it well', value: 'yes_accurate' },
          { id: 'sum_clarify', label: 'I’d like to clarify a detail', value: 'clarify_details' }
        ]
      };
    }

    // STAGE 10 (Relationship Summary) -> STAGE 12 (Adviser Conversion) or STAGE 13 (Email Capture)
    if (questionId === 'summary_confirmation' || currentStage === 'relationship_summary') {
      return {
        stage: 'adviser_conversion',
        questionId: 'adviser_conversion_choice',
        mode: 'adviser_connector',
        messageText: `From what you've told me, speaking with a wealth adviser could help you explore these questions in more detail. Your adviser can review your circumstances, objectives and priorities before discussing any personalised recommendations.\n\nWould you like to arrange a conversation?`,
        options: [
          { id: 'adv_yes', label: 'Yes — choose a time', value: 'yes_choose_time' },
          { id: 'adv_info', label: "I'd like more information first", value: 'more_info_first' },
          { id: 'adv_no', label: 'Not right now', value: 'not_right_now' }
        ]
      };
    }

    // STAGE 12 (Adviser Conversion) -> STAGE 13 (Email Capture) or STAGE 14 (Booking)
    if (questionId === 'adviser_conversion_choice' || currentStage === 'adviser_conversion') {
      if (answerValue === 'yes_choose_time') {
        return {
          stage: 'adviser_booking',
          questionId: 'adviser_booking_time',
          mode: 'adviser_connector',
          messageText: `Wonderful. Let's schedule a 20-minute introductory discovery session with one of our Chartered Financial Planners.`,
          options: [
            { id: 'slot_1', label: 'Thursday, 11:00 AM (BST)', value: 'Thursday 11:00 AM' },
            { id: 'slot_2', label: 'Thursday, 2:30 PM (BST)', value: 'Thursday 2:30 PM' },
            { id: 'slot_3', label: 'Friday, 10:00 AM (BST)', value: 'Friday 10:00 AM' },
            { id: 'slot_4', label: 'Next Monday, 11:30 AM (BST)', value: 'Next Monday 11:30 AM' }
          ]
        };
      } else {
        return {
          stage: 'email_capture',
          questionId: 'email_capture_input',
          mode: 'financial_educator',
          messageText: `I can send you a summary of the topics we've discussed and relevant educational information so you can continue exploring them later.`,
          options: [
            { id: 'em_send', label: 'Email me my summary and guide', value: 'send_summary' },
            { id: 'em_explore', label: 'Explore financial concepts here', value: 'explore_concepts' }
          ]
        };
      }
    }

    // Default fallback
    return {
      stage: 'adviser_booking',
      questionId: 'next_action',
      mode: 'adviser_connector',
      messageText: `Would you like to schedule an introductory video consultation with a wealth planner, or explore educational guides?`,
      options: [
        { id: 'opt_book_consult', label: 'Schedule introductory consultation', value: 'book_consultation' },
        { id: 'opt_nurture_guide', label: 'Email me educational guides', value: 'email_nurture' }
      ]
    };
  }

  /**
   * Determine Qualification Status and Next Action
   */
  private computeQualification(
    answers: ConversationAnswer[],
    conversation: Conversation
  ): {
    status: QualificationStatus;
    nextAction: NextAction;
  } {
    const answersMap = answers.reduce((acc, a) => {
      acc[a.question_id] = a.answer_value;
      return acc;
    }, {} as Record<string, string>);

    const amt = answersMap['investment_amount'];
    const situation = answersMap['financial_situation'];

    // Complex: multi-pension / business assets / trusts
    if (situation === 'several_investments_advice' && amt === '250k_plus') {
      return { status: 'complex', nextAction: 'human_handoff' };
    }

    // Qualified for adviser consultation: £50k+ or established portfolio
    if (
      amt === '50k_to_100k' ||
      amt === '100k_to_250k' ||
      amt === '250k_plus' ||
      situation === 'established_portfolio' ||
      situation === 'several_investments_advice'
    ) {
      return { status: 'qualified', nextAction: 'book_consultation' };
    }

    // Early stage / learning
    if (amt === 'under_10k' || situation === 'completely_new') {
      return { status: 'not_ready', nextAction: 'email_nurture' };
    }

    return { status: 'qualified', nextAction: 'book_consultation' };
  }
}

export const conversationEngine = new ConversationEngine();
