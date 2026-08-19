import React from 'react';
import { Mail, RefreshCw, Sparkles, ExternalLink, UserPlus } from 'lucide-react';

interface CampaignSimulatorBarProps {
  currentCampaign?: string;
  currentCta?: string;
  onSimulateCampaign: (campaign: string, cta: string, source: string) => void;
  onResetVisitor: () => void;
}

export const CampaignSimulatorBar: React.FC<CampaignSimulatorBarProps> = ({
  currentCampaign,
  currentCta,
  onSimulateCampaign,
  onResetVisitor
}) => {
  const campaigns = [
    {
      id: 'email_01',
      campaign: 'wealth_discovery',
      cta: 'financial_goals',
      label: 'Email 01: Financial Goals CTA'
    },
    {
      id: 'email_02',
      campaign: 'retirement_campaign',
      cta: 'retirement_checkin',
      label: 'Email 02: Retirement Check-in CTA'
    },
    {
      id: 'email_03',
      campaign: 'portfolio_strategy',
      cta: 'diversification_quiz',
      label: 'Email 03: Diversification CTA'
    },
    {
      id: 'email_05',
      campaign: 'wealth_advisory',
      cta: 'meet_wealth_adviser',
      label: 'Email 05: Meet Adviser CTA'
    },
    {
      id: 'direct',
      campaign: 'direct',
      cta: 'homepage',
      label: 'Direct Website Visitor'
    }
  ];

  return (
    <div id="campaign-simulator-bar" className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
          <Mail className="w-3 h-3" /> Email-to-Chatbot Simulation
        </span>
        <span className="text-slate-400 hidden sm:inline">
          Active: <strong className="text-white font-medium">{currentCampaign || 'direct'}</strong>
          {currentCta && <span className="text-slate-500"> ({currentCta})</span>}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-400 mr-1 hidden md:inline">Simulate Inbound Source:</span>
        {campaigns.map((c) => {
          const isActive = currentCampaign === c.campaign;
          return (
            <button
              key={c.id}
              id={`sim-btn-${c.id}`}
              onClick={() => onSimulateCampaign(c.campaign, c.cta, 'email')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition font-medium ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {c.label.split(':')[0]}
            </button>
          );
        })}

        <button
          id="new-visitor-sim-btn"
          onClick={onResetVisitor}
          title="Create a fresh visitor session to test identity persistence"
          className="ml-2 px-2.5 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition"
        >
          <UserPlus className="w-3 h-3" /> New Visitor
        </button>
      </div>
    </div>
  );
};
