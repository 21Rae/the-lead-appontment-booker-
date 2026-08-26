import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Mail,
  Phone,
  Tag,
  Clock,
  Layers,
  FileText,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  TrendingUp,
  ShieldCheck,
  Server
} from 'lucide-react';
import { Visitor, Conversation, ConversationAnswer, ConversationEvent, ChatMessage } from '../types';
import { getClientCRMData, clientStore } from '../lib/clientFallbackEngine';
import { checkSupabaseStatus } from '../lib/supabase';

interface EnrichedVisitor extends Visitor {
  conversations_count: number;
  latest_conversation?: Conversation;
  answers: ConversationAnswer[];
  events: ConversationEvent[];
  qualification_status: string;
  next_action: string;
  client_summary?: string;
}

interface AnalyticsData {
  total_visitors: number;
  total_conversations: number;
  qualified_leads: number;
  booked_consultations: number;
  abandoned_conversations: number;
  emails_captured: number;
  conversion_rate: number;
  campaigns: Record<string, number>;
  stages: Record<string, number>;
}

export const AdminCRMView: React.FC = () => {
  const [visitors, setVisitors] = useState<EnrichedVisitor[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<EnrichedVisitor | null>(null);
  const [selectedConvMessages, setSelectedConvMessages] = useState<ChatMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    connected: boolean;
    message: string;
  } | null>(null);

  const fetchCRMData = async () => {
    setIsLoading(true);
    try {
      const [resVisitors, resAnalytics] = await Promise.all([
        fetch('/api/admin/visitors'),
        fetch('/api/admin/analytics')
      ]);

      if (resVisitors.ok && resAnalytics.ok) {
        const data = await resVisitors.json();
        const analyticsData = await resAnalytics.json();
        setVisitors(data.visitors || []);
        if (data.visitors && data.visitors.length > 0 && !selectedVisitor) {
          setSelectedVisitor(data.visitors[0]);
        }
        setAnalytics(analyticsData);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('API fetch failed, utilizing client CRM store:', err);
    }

    // Local client CRM data fallback
    const localCRM = getClientCRMData();
    setVisitors(localCRM.visitors as any);
    if (localCRM.visitors && localCRM.visitors.length > 0 && !selectedVisitor) {
      setSelectedVisitor(localCRM.visitors[0] as any);
    }
    setAnalytics(localCRM.analytics as any);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCRMData();
    checkSupabaseStatus().then((status) => setSupabaseStatus(status));
  }, []);

  // Fetch messages when selected visitor changes
  useEffect(() => {
    if (selectedVisitor && selectedVisitor.latest_conversation) {
      const convId = selectedVisitor.latest_conversation.conversation_id;
      fetch(`/api/conversations/${convId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then((data) => {
          setSelectedConvMessages(data.messages || []);
        })
        .catch(() => {
          // Fallback to local store
          const localMsgs = clientStore.getMessages(convId);
          setSelectedConvMessages(localMsgs);
        });
    }
  }, [selectedVisitor]);

  const handleResetData = async () => {
    if (confirm('Reset database to clean initial state?')) {
      await fetch('/api/admin/reset', { method: 'POST' });
      fetchCRMData();
    }
  };

  // Filter visitors
  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch =
      !searchTerm ||
      v.visitor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.campaign?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      v.latest_conversation?.status === statusFilter ||
      v.qualification_status === statusFilter;

    const matchesCampaign =
      campaignFilter === 'all' ||
      v.campaign === campaignFilter ||
      v.latest_conversation?.campaign === campaignFilter;

    return matchesSearch && matchesStatus && matchesCampaign;
  });

  return (
    <div id="admin-crm-container" className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Top Action & KPI Bar */}
      <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Wealth Advisory CRM & Lead Pipeline</h2>
            <p className="text-[11px] text-slate-400">Visitor-level tracking, immediate answer persistence & adviser handoff</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Supabase Status Pill */}
          <div
            id="supabase-status-pill"
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border ${
              supabaseStatus?.connected
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50'
                : supabaseStatus?.configured
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={supabaseStatus?.message || 'Checking Supabase connection...'}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {supabaseStatus?.connected
                ? 'Supabase Connected'
                : supabaseStatus?.configured
                ? 'Supabase Configured'
                : 'Supabase Ready (Set Keys in .env)'}
            </span>
          </div>

          <button
            id="crm-refresh-btn"
            onClick={fetchCRMData}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Pipeline
          </button>
          <button
            id="crm-reset-db-btn"
            onClick={handleResetData}
            className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Reset Seed Data
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-white border-b border-slate-200">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Visitors</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{analytics.total_visitors}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Unique tracked IDs</div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase">Qualified Leads</div>
            <div className="text-xl font-bold text-emerald-900 mt-1">{analytics.qualified_leads}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">{analytics.conversion_rate}% qualification rate</div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-[11px] font-semibold text-blue-800 uppercase">Consultations Booked</div>
            <div className="text-xl font-bold text-blue-900 mt-1">{analytics.booked_consultations}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">Direct into calendar</div>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
            <div className="text-[11px] font-semibold text-purple-800 uppercase">Emails Captured</div>
            <div className="text-xl font-bold text-purple-900 mt-1">{analytics.emails_captured}</div>
            <div className="text-[10px] text-purple-700 mt-0.5">Nurture subscribers</div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <div className="text-[11px] font-semibold text-amber-800 uppercase">Abandoned Sessions</div>
            <div className="text-xl font-bold text-amber-900 mt-1">{analytics.abandoned_conversations}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Resumable on return</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Sessions</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{analytics.total_conversations}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across all visitors</div>
          </div>
        </div>
      )}

      {/* Main CRM Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Prospect Table / List */}
        <div className="w-full md:w-5/12 lg:w-4/12 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                id="crm-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search visitor ID, email, name..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                id="crm-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="qualified">Qualified</option>
                <option value="booked">Booked</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="abandoned">Abandoned</option>
              </select>

              <select
                id="crm-campaign-filter"
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Campaigns</option>
                <option value="retirement_campaign">Retirement Campaign</option>
                <option value="wealth_discovery">Wealth Discovery</option>
                <option value="portfolio_strategy">Portfolio Strategy</option>
                <option value="direct">Direct</option>
              </select>
            </div>
          </div>

          {/* Visitor List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredVisitors.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No prospects match the filter criteria.
              </div>
            ) : (
              filteredVisitors.map((v) => {
                const isSelected = selectedVisitor?.visitor_id === v.visitor_id;
                const status = v.latest_conversation?.status || 'active';
                const isBooked = status === 'booked';
                const isQualified = v.qualification_status === 'qualified' || status === 'qualified';

                return (
                  <button
                    key={v.visitor_id}
                    id={`visitor-row-${v.visitor_id}`}
                    onClick={() => setSelectedVisitor(v)}
                    className={`w-full text-left p-3.5 transition flex items-start justify-between ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {v.first_name ? `${v.first_name} ${v.last_name || ''}` : 'Anonymous Visitor'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isBooked
                              ? 'bg-blue-100 text-blue-800'
                              : isQualified
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'abandoned'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {v.email || v.visitor_id}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span>{v.answers?.length || 0} Answers</span>
                        <span>•</span>
                        <span>{v.campaign || 'direct'}</span>
                        <span>•</span>
                        <span>{new Date(v.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 mt-1 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed Prospect Dossier */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-5 space-y-5">
          {selectedVisitor ? (
            <div className="space-y-5 max-w-4xl">
              {/* Header Dossier */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedVisitor.first_name ? `${selectedVisitor.first_name} ${selectedVisitor.last_name || ''}` : 'Prospect Profile'}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        selectedVisitor.latest_conversation?.status === 'booked'
                          ? 'bg-blue-100 text-blue-800'
                          : selectedVisitor.qualification_status === 'qualified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {selectedVisitor.latest_conversation?.status || 'In Progress'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Permanent ID: {selectedVisitor.visitor_id}
                  </p>
                </div>

                {selectedVisitor.latest_conversation?.booking_slot && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Booked: <strong>{selectedVisitor.latest_conversation.booking_slot}</strong></span>
                  </div>
                )}
              </div>

              {/* Grid: Client Summary & Attribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Attribution info */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" /> Campaign & Attribution
                  </h4>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Campaign:</span>
                      <span className="font-semibold text-slate-800">{selectedVisitor.campaign || 'Direct / Organic'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Source / Medium:</span>
                      <span>{selectedVisitor.source || 'website'} / {selectedVisitor.medium || 'direct'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Content / CTA:</span>
                      <span>{selectedVisitor.content || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">First Seen:</span>
                      <span>{new Date(selectedVisitor.first_seen_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Last Seen:</span>
                      <span>{new Date(selectedVisitor.last_seen_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Adviser Handoff Summary */}
                <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" /> Chartered Adviser Briefing
                  </h4>
                  <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedVisitor.client_summary ||
                      'Client summary is generated automatically as answers are recorded during the conversation.'}
                  </div>
                </div>
              </div>

              {/* Immediate Persisted Answers Table */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" /> Persisted Answers Table ({selectedVisitor.answers.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">Real-time DB sync</span>
                </div>

                {selectedVisitor.answers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No answers recorded yet for this visitor.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                          <th className="py-2 px-3">Stage</th>
                          <th className="py-2 px-3">Question</th>
                          <th className="py-2 px-3">Saved Answer</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Saved At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedVisitor.answers.map((ans) => (
                          <tr key={ans.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-medium text-slate-700 capitalize">{ans.stage.replace(/_/g, ' ')}</td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-xs">{ans.question_text}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {ans.answer_label || ans.answer_value}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">{ans.answer_type}</td>
                            <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                              {new Date(ans.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Full Conversation Replay */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-600" /> Full Conversation Transcript
                </h4>
                <div className="space-y-3 max-h-80 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {selectedConvMessages.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-4">No messages recorded in this session.</div>
                  ) : (
                    selectedConvMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl text-xs max-w-xl ${
                          m.sender === 'agent'
                            ? 'bg-white border border-slate-200 text-slate-800 mr-auto'
                            : 'bg-slate-900 text-white ml-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-60 mb-1">
                          <span className="font-semibold capitalize">{m.sender}</span>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Select a visitor from the list to view their complete dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
