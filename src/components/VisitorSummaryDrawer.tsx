import React from 'react';
import {
  X,
  Database,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Activity,
  FileText,
  Tag,
  Mail,
  Phone,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Visitor, Conversation, ConversationAnswer, ConversationEvent } from '../types';

interface VisitorSummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visitor: Visitor | null;
  conversation: Conversation | null;
  answers: ConversationAnswer[];
  events: ConversationEvent[];
  onOpenBooking?: () => void;
}

export const VisitorSummaryDrawer: React.FC<VisitorSummaryDrawerProps> = ({
  isOpen,
  onClose,
  visitor,
  conversation,
  answers,
  events,
  onOpenBooking
}) => {
  if (!isOpen) return null;

  return (
    <div id="visitor-drawer-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div
        id="visitor-summary-panel"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Consultation Dossier</h3>
              <p className="text-[11px] text-slate-400">Marcus Sterling's Private Client Notes</p>
            </div>
          </div>
          <button
            id="close-visitor-drawer-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-800 text-xs">
          {/* Identity Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Visitor Identity</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3" /> Auto-Persisted
              </span>
            </div>

            <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 break-all text-slate-700 select-all">
              <span className="text-slate-400">visitor_id: </span>
              {visitor?.visitor_id || 'Generating...'}
            </div>

            <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 break-all text-slate-700 select-all">
              <span className="text-slate-400">conversation_id: </span>
              {conversation?.conversation_id || 'Active'}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {visitor?.email && (
                <div className="flex items-center gap-1.5 text-slate-600 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{visitor.email}</span>
                </div>
              )}
              {visitor?.first_name && (
                <div className="flex items-center gap-1.5 text-slate-600 truncate">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{visitor.first_name} {visitor.last_name || ''}</span>
                </div>
              )}
              {conversation?.campaign && (
                <div className="flex items-center gap-1.5 text-slate-600 truncate col-span-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Campaign: <strong className="font-semibold">{conversation.campaign}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Qualification Status */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Qualification Status</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  conversation?.qualification_status === 'qualified'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : conversation?.qualification_status === 'complex'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {conversation?.qualification_status || 'In Progress'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-500">Current Stage:</span>
              <span className="font-semibold text-slate-800 capitalize">{conversation?.current_stage?.replace(/_/g, ' ') || 'Goal Discovery'}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Next Action:</span>
              <span className="font-semibold text-emerald-700 capitalize">{conversation?.next_action?.replace(/_/g, ' ') || 'Education / Discovery'}</span>
            </div>

            {conversation?.booking_slot && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Consultation Booked: <strong>{conversation.booking_slot}</strong></span>
              </div>
            )}
          </div>

          {/* Saved Answers Table (Immediate Persistence Proof) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Persisted Answers ({answers.length})
              </h4>
              <span className="text-[10px] text-emerald-600 font-medium">Real-time sync</span>
            </div>

            {answers.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No answers submitted yet. Select an option to save immediately.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {answers.map((ans, idx) => (
                  <div key={ans.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-mono text-slate-600 font-medium">{ans.question_id}</span>
                      <span className="capitalize text-slate-400">{ans.stage.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-normal">{ans.question_text}</div>
                    <div className="text-xs font-semibold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200/70 inline-block">
                      {ans.answer_label || ans.answer_value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Structured Adviser Summary */}
          {conversation?.client_summary && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Chartered Adviser Summary
              </h4>
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {conversation.client_summary}
              </div>
            </div>
          )}

          {/* Audit Event Trail */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-600" />
              Event Audit Trail ({events.length})
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {events.slice(-6).reverse().map((evt) => (
                <div key={evt.id} className="text-[10px] flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                  <span className="font-medium text-slate-700">{evt.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400">{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
          {onOpenBooking && (
            <button
              id="drawer-book-btn"
              onClick={onOpenBooking}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" /> Book Consultation
            </button>
          )}
          <button
            id="drawer-close-bottom-btn"
            onClick={onClose}
            className="py-2 px-4 border border-slate-300 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
