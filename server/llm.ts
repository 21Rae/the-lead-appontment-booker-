import { GoogleGenAI } from '@google/genai';
import { APPROVED_EDUCATIONAL_TOPICS } from './knowledge';
import { ConversationAnswer, Visitor, Conversation, ChatMessage } from '../src/types';

const CHATGPT_SYSTEM_MESSAGE = `# Chartered Wealth Consultant — System Message

You are Marcus Sterling, CFP®, Senior Chartered Wealth Consultant at Matt Strategy Futuristic.

You are conducting a private, 1-on-1 discovery consultation with a client.
Your goal is to understand their life story, financial ambitions, timelines, and existing position, educate them on relevant wealth-structuring principles, and help build their roadmap.

---

## 1. CONSULTATIVE STYLE

Always communicate with the warm, measured, articulate poise of a senior private wealth consultant.
Never sound like an automated questionnaire, chatbot, or form.
Speak in the first person ("I", "my team", "we at Matt Strategy Futuristic").
Ask one clear, insightful question at a time.
Acknowledge the client's specific situation and emotions before asking the next question.
Keep answers concise, polished, and empathetic (2-3 sentences max).

Example:
Client: "I want to retire around 60."
Good consultant response: "That gives us a clear horizon to work toward. When you envision life at 60, what would you like your retirement lifestyle to look like?"
Never respond with robotic phrases or question numbers.

---

## 2. CONSULTATIVE PRINCIPLE

Follow this mental model:
Person → Story → Goal → Problem → Impact → Education → Trust → Appropriate Next Step

Focus on understanding the person before discussing technical asset solutions.
Discovery & active listening: 70%
Insight & educational clarity: 30%
Never rush the client.

---

## 3. CONVERSATION STAGES CONTROLLED BY BACKEND

1. Welcome
2. Goal Discovery
3. Financial Situation
4. Time Horizon
5. Investment Experience
6. Risk / Priorities
7. Existing Portfolio
8. Investment Amount / Qualification
9. Educational Response
10. Relationship Summary ("Just so I know I've understood you correctly...")
11. Lead Qualification
12. Adviser Conversion
13. Email Capture
14. Adviser Booking
15. Education / Nurture
16. Human Handoff

---

## 4. QUESTION RULES & MEMORY

1. Ask one main question at a time.
2. Never ask the same question twice.
3. Do not ask a question if the answer is already known.
4. Use previous answers to make the next question relevant.
5. If the visitor asks an educational question, answer using approved general concepts, then offer to explore how it relates to their situation or connect with an adviser.
6. If the visitor corrects something during the Relationship Summary, acknowledge the correction and use the corrected info going forward.
7. If returning visitor, warmly acknowledge what was previously discussed without starting from zero.
`;

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];

export interface LLMContextPayload {
  visitor: Visitor;
  conversation: Conversation;
  currentStage: string;
  previousAnswers: ConversationAnswer[];
  questionsAlreadyAnswered: string[];
  missingInformation: string[];
  recentMessages: ChatMessage[];
  userMessage?: string;
  mode?: 'relationship_manager' | 'financial_educator' | 'adviser_connector';
  isReturningVisitor?: boolean;
}

/**
 * Calls OpenAI ChatGPT API (with seamless multi-model Gemini API & rule fallback)
 */
export async function generateChatResponse(payload: LLMContextPayload): Promise<string> {
  const openAiKey = process.env.OPENAI_API_KEY;

  const contextData = {
    visitor_id: payload.visitor.visitor_id,
    conversation_id: payload.conversation.conversation_id,
    current_stage: payload.currentStage,
    visitor_profile: {
      first_name: payload.visitor.first_name || 'Visitor',
      email: payload.visitor.email,
      persona: payload.visitor.persona || payload.conversation.persona || 'Unknown',
      campaign: payload.conversation.campaign || payload.visitor.campaign || 'direct',
      cta_source: payload.conversation.content || 'homepage'
    },
    is_returning_visitor: payload.isReturningVisitor || false,
    questions_already_answered: payload.questionsAlreadyAnswered,
    previous_answers: payload.previousAnswers.map((a) => ({
      question_id: a.question_id,
      stage: a.stage,
      question: a.question_text,
      answer: a.answer_label || a.answer_value
    })),
    missing_information: payload.missingInformation,
    approved_knowledge_topics: Object.keys(APPROVED_EDUCATIONAL_TOPICS)
  };

  const formattedUserPrompt = `CURRENT CONVERSATION CONTEXT (SOURCE OF TRUTH MANAGED BY BACKEND):
${JSON.stringify(contextData, null, 2)}

VISITOR JUST SAID: "${payload.userMessage || 'Continue to next stage'}"

INSTRUCTION:
Acknowledge the visitor's response warmly and naturally, relate it to the current stage (${payload.currentStage}), and ask the next single relevant conversational question. Strictly adhere to the System Message rules.`;

  // 1. Try OpenAI ChatGPT if OPENAI_API_KEY is available
  if (openAiKey && openAiKey.trim() !== '') {
    try {
      const messages = [
        { role: 'system', content: CHATGPT_SYSTEM_MESSAGE },
        ...payload.recentMessages.slice(-6).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: formattedUserPrompt }
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.5,
          max_tokens: 300
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
    } catch (err) {
      // Fall through to Gemini
    }
  }

  // 2. Multi-model Gemini fallback with high-demand resilience
  const gemini = getGeminiClient();
  if (gemini) {
    for (const modelName of FALLBACK_MODELS) {
      try {
        const response = await gemini.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${CHATGPT_SYSTEM_MESSAGE}\n\n${formattedUserPrompt}`
                }
              ]
            }
          ],
          config: {
            temperature: 0.4,
            maxOutputTokens: 300
          }
        });

        const text = response.text?.trim();
        if (text) return text;
      } catch (err) {
        // Try next fallback model
        continue;
      }
    }
  }

  // 3. Fallback to high-quality deterministic financial guidance response
  return generateRuleFallback(payload);
}

function generateRuleFallback(payload: LLMContextPayload): string {
  const stage = payload.currentStage;
  const answersMap = payload.previousAnswers.reduce((acc, a) => {
    acc[a.question_id] = a.answer_label || a.answer_value;
    return acc;
  }, {} as Record<string, string>);

  if (stage === 'goal_discovery') {
    return `Great. When you think about building wealth, what are you ultimately hoping the money will help you achieve?`;
  }
  if (stage === 'time_horizon') {
    const goal = answersMap['primary_goal'] || answersMap['goal_details'] || 'your goals';
    return `That gives us a useful starting point for ${goal}. Approximately when would you like to achieve this?`;
  }
  if (stage === 'financial_situation') {
    return `And where would you say you are today with your existing savings, investments, or pensions?`;
  }
  if (stage === 'investment_experience') {
    return `Which of these investment types are you already familiar with? (Select all that apply)`;
  }
  if (stage === 'risk_and_priorities') {
    return `What concerns you most about your current financial position, or what would make you feel most confident about your finances?`;
  }
  if (stage === 'existing_portfolio') {
    return `What would you most like professional help with regarding your existing investments?`;
  }
  if (stage === 'investment_amount' || stage === 'lead_qualification') {
    return `To help us understand what kind of support may be relevant, approximately how much are you currently considering investing or seeking advice about?`;
  }
  if (stage === 'relationship_summary') {
    const goal = answersMap['goal_details'] || answersMap['primary_goal'] || 'planning for the future';
    const timeline = answersMap['time_horizon'] || 'the medium to long term';
    const sit = answersMap['financial_situation'] || 'your current assets';
    return `Just so I know I've understood you correctly: you're focusing on ${goal} over approximately ${timeline}, starting from ${sit}. Is that a fair summary?`;
  }
  if (stage === 'adviser_conversion') {
    return `From what you've told me, speaking with a wealth adviser could help you explore these questions with cashflow modelling and tax optimisation. Would you like to arrange a conversation?`;
  }
  if (stage === 'email_capture') {
    return `I can send you a summary of the topics we've discussed and relevant educational information so you can continue exploring them later. What email address should I send this to?`;
  }

  return `I'm here to help you explore your goals and explain planning concepts. What would you like to focus on next?`;
}
