import { GoogleGenAI } from '@google/genai';
import { APPROVED_EDUCATIONAL_TOPICS } from './knowledge';
import { ConversationAnswer, Visitor, Conversation } from '../src/types';

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export interface AIGenerationInput {
  userMessage?: string;
  answers: ConversationAnswer[];
  visitor: Visitor;
  conversation: Conversation;
  currentStage: string;
  mode: 'relationship_manager' | 'financial_educator' | 'adviser_connector';
  requestedTopic?: string;
}

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];

export async function generateAIResponse(input: AIGenerationInput): Promise<{
  text: string;
  suggestedFollowUp?: string;
  summary?: string;
}> {
  const client = getGeminiClient();

  if (client) {
    const approvedTopicsText = Object.values(APPROVED_EDUCATIONAL_TOPICS)
      .map(
        (t) =>
          `### Topic: ${t.title}\nSummary: ${t.summary}\nKey Points:\n${t.bulletPoints.map((b) => `- ${b}`).join('\n')}\nTakeaway: ${t.keyTakeaway}\nAdviser Context: ${t.adviserRelevance}`
      )
      .join('\n\n');

    const answerHistoryText = input.answers
      .map((a) => `- [${a.stage}] ${a.question_text} => "${a.answer_label || a.answer_value}"`)
      .join('\n');

    const systemInstruction = `You are an AI Financial Conversation Agent for an authorized wealth advisory and financial planning firm.

CRITICAL SAFETY & COMPLIANCE:
1. Provide general financial education and discovery, but NEVER make personalised investment recommendations (e.g. NEVER recommend specific funds or stocks).
2. Warm, professional, concise, empathetic tone.
3. 2-4 sentences max per response, asking one single relevant question.

APPROVED KNOWLEDGE:
${approvedTopicsText}

VISITOR CONTEXT:
Visitor ID: ${input.visitor.visitor_id}
Stage: ${input.currentStage}
Mode: ${input.mode}
Answers History:
${answerHistoryText || 'None'}`;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemInstruction}\n\nVisitor said: "${input.userMessage || 'Continue to next stage'}"\nGenerate next response.`
                }
              ]
            }
          ],
          config: {
            temperature: 0.4,
            maxOutputTokens: 300
          }
        });

        const responseText = response.text?.trim();
        if (responseText) {
          return { text: responseText };
        }
      } catch (err: any) {
        // Silently try next fallback model
        continue;
      }
    }
  }

  // Fallback / deterministic safe response
  return {
    text: generateDeterministicResponse(input)
  };
}

export async function generateAdviserSummary(
  visitor: Visitor,
  answers: ConversationAnswer[],
  conversation: Conversation
): Promise<string> {
  const client = getGeminiClient();

  const answersMap = answers.reduce((acc, a) => {
    acc[a.question_id] = a.answer_label || a.answer_value;
    return acc;
  }, {} as Record<string, string>);

  const primaryGoal = answersMap['primary_goal'] || answersMap['goal_details'] || 'Long-term Wealth & Financial Planning';
  const targetHorizon = answersMap['time_horizon'] || '5–10 years';
  const financialPosition = answersMap['financial_situation'] || 'Established savings / investments';
  const investmentExperience = answersMap['investment_experience'] || 'Familiar with core investments';
  const investmentAmount = answersMap['investment_amount'] || '£50,000–£100,000+';
  const concerns = answersMap['risk_concerns'] || answersMap['financial_priority'] || 'Optimising portfolio risk and long-term tax efficiency';

  const defaultSummary = `Client Conversation Summary

Primary Goal:
${primaryGoal}

Target Horizon:
${targetHorizon}

Current Position:
${financialPosition}

Investment Experience:
${investmentExperience}

Investment Scope / Capacity:
${investmentAmount}

Primary Concerns & Priorities:
${concerns}

Requested Help:
Understanding how existing assets and future contributions align with retirement and wealth objectives.

Next Action:
Chartered Financial Planner Consultation / Tailored Review`;

  if (!client) {
    return defaultSummary;
  }

  const prompt = `Based on the following prospect conversation details, create a crisp, professional "Client Conversation Summary" for a human financial adviser to review before a consultation call.

Prospect: ${visitor.first_name || 'Prospect'} (${visitor.email || 'Email not yet provided'})
Source / Campaign: ${conversation.campaign || visitor.source || 'Website'}
Answers:
${JSON.stringify(answersMap, null, 2)}

Format with:
Primary Goal:
Target Timeframe:
Current Position:
Investment Experience:
Estimated Scope:
Primary Concerns & Priorities:
Recommended Handoff Focus:`;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const res = await client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { temperature: 0.2, maxOutputTokens: 350 }
      });

      if (res.text && res.text.trim()) {
        return res.text.trim();
      }
    } catch (err) {
      // Continue to next model or fallback to structured defaultSummary
      continue;
    }
  }

  return defaultSummary;
}

function generateDeterministicResponse(input: AIGenerationInput): string {
  if (input.mode === 'financial_educator' && input.requestedTopic && APPROVED_EDUCATIONAL_TOPICS[input.requestedTopic]) {
    const topic = APPROVED_EDUCATIONAL_TOPICS[input.requestedTopic];
    return `${topic.summary} ${topic.keyTakeaway}\n\nWould you like to explore how this applies to your overall plan, or would you like to speak with an adviser?`;
  }

  if (input.currentStage === 'goal_discovery') {
    return `Great. When you think about building wealth, what are you ultimately hoping the money will help you achieve?`;
  }
  if (input.currentStage === 'time_horizon') {
    return `Approximately when would you like to achieve this goal? Having a clear timeframe helps determine the most appropriate approach.`;
  }
  if (input.currentStage === 'financial_situation') {
    return `And where would you say you are today with your existing savings, investments, or pensions?`;
  }
  if (input.currentStage === 'investment_experience') {
    return `Which of these investment types are you already familiar with? (Select all that apply)`;
  }
  if (input.currentStage === 'risk_and_priorities') {
    return `What concerns you most about your current financial position, or what would make you feel most confident about your future?`;
  }
  if (input.currentStage === 'lead_qualification') {
    return `To help us understand what kind of support may be relevant, approximately how much are you currently considering investing or seeking advice about?`;
  }

  return `I'm here to help you explore your goals and explain planning concepts. What would you like to focus on next?`;
}
