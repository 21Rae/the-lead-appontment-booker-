import React from 'react';
import {
  Compass,
  TrendingUp,
  ShieldAlert,
  Users,
  Briefcase,
  Layers,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

interface GoalCardsSectionProps {
  onSelectGoal: (goalKey: string, goalLabel: string) => void;
}

const GOALS = [
  {
    id: 'plan_retirement',
    title: 'Retirement Strategy',
    tagline: 'Discuss with Marcus',
    description: 'Explore lifestyle goals, pension consolidation, and sustainable retirement income.',
    icon: Compass,
    color: 'emerald'
  },
  {
    id: 'start_investing',
    title: 'Investment Advisory',
    tagline: 'Discuss with Marcus',
    description: 'Explore asset allocation, risk balancing, and long-term compound growth.',
    icon: TrendingUp,
    color: 'blue'
  },
  {
    id: 'grow_wealth',
    title: 'Wealth Structuring',
    tagline: 'Discuss with Marcus',
    description: 'Structure multi-asset wealth, tax-efficient ISAs, and disciplined capital growth.',
    icon: Briefcase,
    color: 'amber'
  },
  {
    id: 'protect_wealth',
    title: 'Family & Estate Planning',
    tagline: 'Discuss with Marcus',
    description: 'Safeguard assets, prepare inheritance strategies, and protect loved ones.',
    icon: Users,
    color: 'purple'
  },
  {
    id: 'review_finances',
    title: 'Comprehensive Review',
    tagline: 'Discuss with Marcus',
    description: 'Evaluate existing portfolios, scattered accounts, fees, and overall financial health.',
    icon: Layers,
    color: 'slate'
  }
];

export const GoalCardsSection: React.FC<GoalCardsSectionProps> = ({ onSelectGoal }) => {
  return (
    <div id="goal-cards-section" className="py-12 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Consultation Focus Areas</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            What would you like to discuss today?
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Select a pathway to begin your confidential discussion with Marcus Sterling.
          </p>
        </div>

        {/* 5 Distinct Goal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {GOALS.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                id={`goal-card-${g.id}`}
                onClick={() => onSelectGoal(g.id, g.title)}
                className="group text-left p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500/60 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-700 transition flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition">
                      {g.title}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">{g.tagline}</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {g.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-emerald-600 transition">
                  <span>Start discussion</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
