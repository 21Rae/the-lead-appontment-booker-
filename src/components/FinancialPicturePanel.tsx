import React from 'react';
import {
  Compass,
  Clock,
  Briefcase,
  TrendingUp,
  Shield,
  Layers,
  Edit3,
  BookOpen,
  Calendar,
  Sparkles,
  Award,
  CheckCircle2
} from 'lucide-react';
import { ConversationAnswer, Conversation } from '../types';

interface FinancialPicturePanelProps {
  answers: ConversationAnswer[];
  conversation: Conversation | null;
  onOpenEducation: () => void;
  onOpenBooking: () => void;
  onClarify: () => void;
}

export const FinancialPicturePanel: React.FC<FinancialPicturePanelProps> = ({
  answers,
  conversation,
  onOpenEducation,
  onOpenBooking,
  onClarify
}) => {
  const answersMap = answers.reduce((acc, a) => {
    acc[a.question_id] = a.answer_label || a.answer_value;
    return acc;
  }, {} as Record<string, string>);

  const primaryGoal = answersMap['primary_goal'] || answersMap['goal_details'];
  const timeHorizon = answersMap['time_horizon'];
  const financialPosition = answersMap['financial_situation'];
  const investmentExperience = answersMap['investment_experience'];
  const priorities = answersMap['risk_concerns'] || answersMap['financial_priority'];
  const investmentAmount = answersMap['investment_amount'];

  const answeredCount = [
    primaryGoal,
    timeHorizon,
    financialPosition,
    investmentExperience,
    priorities,
    investmentAmount
  ].filter(Boolean).length;

  return (
    <div id="financial-picture-panel" className="bg-white rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col overflow-hidden">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Consultation Notes
            </h3>
          </div>
          <p className="text-[11px] text-slate-500">Live summary compiled by Marcus Sterling</p>
        </div>

        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-700 shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{answeredCount} of 6 captured</span>
        </div>
      </div>

      {/* Structured Picture Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        
        {/* 1. Primary Goal */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 font-semibold text-slate-600">
              <Compass className="w-3.5 h-3.5 text-emerald-600" /> Primary Focus
            </span>
          </div>
          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
            {primaryGoal || <span className="text-slate-400 font-normal italic">In discussion with Marcus...</span>}
          </p>
        </div>

        {/* 2. Target Time Horizon */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 font-semibold text-slate-600">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Target Timeframe
            </span>
          </div>
          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
            {timeHorizon || <span className="text-slate-400 font-normal italic">To be determined...</span>}
          </p>
        </div>

        {/* 3. Existing Situation */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 font-semibold text-slate-600">
              <Briefcase className="w-3.5 h-3.5 text-amber-600" /> Existing Assets & Position
            </span>
          </div>
          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
            {financialPosition || <span className="text-slate-400 font-normal italic">To be explored...</span>}
          </p>
        </div>

        {/* 4. Investment Experience */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 font-semibold text-slate-600">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Investment Background
            </span>
          </div>
          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
            {investmentExperience || <span className="text-slate-400 font-normal italic">To be explored...</span>}
          </p>
        </div>

        {/* 5. Key Concerns / Priorities */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 font-semibold text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> Priorities & Risk Attitude
            </span>
          </div>
          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
            {priorities || <span className="text-slate-400 font-normal italic">To be discussed...</span>}
          </p>
        </div>

        {/* 6. Estimated Scope / Capacity */}
        {investmentAmount && (
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium">
              <span className="flex items-center gap-1.5 font-semibold">
                <Layers className="w-3.5 h-3.5 text-emerald-700" /> Scope Under Consideration
              </span>
            </div>
            <p className="font-bold text-emerald-950 text-xs sm:text-sm">
              {investmentAmount}
            </p>
          </div>
        )}

        {/* Clarify or Update Previous Notes */}
        {answeredCount > 0 && (
          <div className="pt-1 text-center">
            <button
              onClick={onClarify}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 transition"
            >
              <Edit3 className="w-3 h-3" />
              <span>Update or clarify these notes</span>
            </button>
          </div>
        )}

      </div>

      {/* Panel Bottom Quick Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
        <button
          id="panel-book-adviser-btn"
          onClick={onOpenBooking}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Book 1-on-1 Consultation with Marcus</span>
        </button>

        <button
          id="panel-open-education-btn"
          onClick={onOpenEducation}
          className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span>Explore Planning Concepts</span>
        </button>
      </div>

    </div>
  );
};
