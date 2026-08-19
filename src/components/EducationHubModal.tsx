import React, { useState } from 'react';
import { X, BookOpen, ShieldCheck, CheckCircle2, ChevronRight, ArrowRight, UserCheck } from 'lucide-react';
import { APPROVED_EDUCATIONAL_TOPICS, EducationalTopic } from '../../server/knowledge';

interface EducationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopicForChat?: (topicId: string) => void;
  onRequestAdviser?: () => void;
  initialTopicId?: string;
}

export const EducationHubModal: React.FC<EducationHubModalProps> = ({
  isOpen,
  onClose,
  onSelectTopicForChat,
  onRequestAdviser,
  initialTopicId
}) => {
  const topics = Object.values(APPROVED_EDUCATIONAL_TOPICS);
  const [activeTopic, setActiveTopic] = useState<EducationalTopic>(
    (initialTopicId && APPROVED_EDUCATIONAL_TOPICS[initialTopicId]) || topics[0]
  );

  if (!isOpen) return null;

  return (
    <div id="education-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div id="education-modal-card" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Approved Financial Education Hub</h2>
              <p className="text-xs text-slate-500">Impartial concepts verified for financial planning</p>
            </div>
          </div>
          <button
            id="close-education-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Topic List */}
          <div className="w-full md:w-72 border-r border-slate-100 bg-slate-50/50 p-3 overflow-y-auto space-y-1">
            {topics.map((t) => {
              const isSelected = activeTopic.id === t.id;
              return (
                <button
                  key={t.id}
                  id={`topic-btn-${t.id}`}
                  onClick={() => setActiveTopic(t)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <span className="truncate pr-2">{t.title}</span>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Topic Details */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Approved General Guidance
              </div>
              <h3 className="text-xl font-bold text-slate-900">{activeTopic.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{activeTopic.summary}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Key Principles</h4>
              <ul className="space-y-2.5">
                {activeTopic.bulletPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900">
              <span className="font-semibold">Core Takeaway: </span>
              {activeTopic.keyTakeaway}
            </div>

            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900">
              <span className="font-semibold">How an Adviser Helps: </span>
              {activeTopic.adviserRelevance}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {onSelectTopicForChat && (
                <button
                  id="discuss-topic-btn"
                  onClick={() => {
                    onSelectTopicForChat(activeTopic.id);
                    onClose();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg inline-flex items-center gap-2 transition"
                >
                  Discuss this in chat <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onRequestAdviser && (
                <button
                  id="modal-request-adviser-btn"
                  onClick={() => {
                    onRequestAdviser();
                    onClose();
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-medium rounded-lg inline-flex items-center gap-2 transition"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Speak with an adviser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <div className="px-6 py-2.5 bg-slate-100/80 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Impartial educational material. Does not constitute personal investment advice.</span>
          <span>FCA Guidance Standards</span>
        </div>
      </div>
    </div>
  );
};
