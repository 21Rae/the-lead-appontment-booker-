export type ConversationStatus =
  | 'active'
  | 'completed'
  | 'abandoned'
  | 'paused'
  | 'qualified'
  | 'booked'
  | 'handoff'
  | 'nurture';

export type ConversationStage =
  | 'welcome'
  | 'goal_discovery'
  | 'financial_situation'
  | 'time_horizon'
  | 'investment_experience'
  | 'risk_and_priorities'
  | 'existing_portfolio'
  | 'investment_amount'
  | 'educational_response'
  | 'relationship_summary'
  | 'lead_qualification'
  | 'adviser_conversion'
  | 'email_capture'
  | 'adviser_booking'
  | 'education_nurture'
  | 'human_handoff'
  | 'completed'
  | 'handoff'
  | 'nurture';

export type AgentMode =
  | 'relationship_manager'
  | 'financial_educator'
  | 'adviser_connector';

export type QualificationStatus = 'qualified' | 'not_ready' | 'complex';

export type NextAction =
  | 'book_consultation'
  | 'education'
  | 'email_nurture'
  | 'human_handoff';

export interface Visitor {
  id: string;
  visitor_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  source?: string;
  campaign?: string;
  medium?: string;
  content?: string;
  landing_page?: string;
  referrer?: string;
  persona?: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  conversation_id: string;
  visitor_id: string;
  status: ConversationStatus;
  current_stage: ConversationStage;
  current_question?: string;
  persona?: string;
  source?: string;
  campaign?: string;
  medium?: string;
  content?: string;
  landing_page?: string;
  referrer?: string;
  started_at: string;
  last_activity_at: string;
  completed_at?: string;
  qualification_status?: QualificationStatus;
  next_action?: NextAction;
  client_summary?: string;
  booking_slot?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationAnswer {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface ConversationEvent {
  id: string;
  visitor_id: string;
  conversation_id: string;
  event_type:
    | 'conversation_started'
    | 'question_shown'
    | 'answer_submitted'
    | 'education_requested'
    | 'email_submitted'
    | 'qualification_completed'
    | 'adviser_requested'
    | 'booking_started'
    | 'booking_completed'
    | 'conversation_paused'
    | 'conversation_resumed'
    | 'conversation_abandoned'
    | 'conversation_completed'
    | 'human_handoff';
  event_data?: Record<string, any>;
  created_at: string;
}

export interface MessageOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  category?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  visitor_id: string;
  sender: 'agent' | 'user' | 'system';
  mode?: AgentMode;
  text: string;
  options?: MessageOption[];
  allowMultiSelect?: boolean;
  questionId?: string;
  questionStage?: ConversationStage;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AdviserSummary {
  primary_goal?: string;
  target_time_horizon?: string;
  financial_position?: string;
  investment_experience?: string;
  primary_concern?: string;
  investment_amount?: string;
  requested_help?: string;
  qualification_status?: QualificationStatus;
  next_action?: NextAction;
  notes?: string;
}
