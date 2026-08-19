import React from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Award,
  TrendingUp,
  Compass,
  Briefcase,
  MapPin,
  Star,
  Building2,
  Lock,
  Globe2,
  LineChart,
  Sparkles
} from 'lucide-react';

interface LandingHeroProps {
  onStartCheckIn: (initialGoal?: string) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onStartCheckIn }) => {
  return (
    <div id="wealth-landing-hero" className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white border-b border-slate-800 relative overflow-hidden">
      
      {/* Subtle Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-18 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Institutional Brand & Consultant Discovery */}
          <div className="lg:col-span-7 space-y-7">
            
            {/* Prestige Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>MATT STRATEGY FUTURISTIC • PRIVATE CLIENT WEALTH ADVISORY</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
                Futuristic wealth architecture for high-conviction futures.
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-normal">
                Partner with <strong>Matt Strategy Futuristic</strong>. We combine strategic capital architecture, multi-asset portfolio review, and forward-looking retirement planning into a clear, personalized roadmap.
              </p>
            </div>

            {/* Strategic Value Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bespoke 1-on-1 private goal discovery</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Strategic pension & portfolio review</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Capital preservation & growth modeling</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct Chartered Consultant consultation</span>
              </div>
            </div>

            {/* Main Action Trigger */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                id="hero-start-checkin-btn"
                onClick={() => onStartCheckIn()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 inline-flex items-center justify-center gap-2.5 whitespace-nowrap transition hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                <span className="whitespace-nowrap">Start your confidential check-in</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Interactive discovery • Approx 3–5 minutes</span>
              </div>
            </div>

            {/* Institutional Trust & Accreditations Bar */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>FCA Regulated Practice Benchmark</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Chartered Financial Planning (CFP®)</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>UK & International Private Clients</span>
              </div>
            </div>

          </div>

          {/* Right Column: Lead Consultant Profile Card */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-700/70 shadow-2xl backdrop-blur-md space-y-5">
              
              {/* Firm & Consultant Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-emerald-500/40 flex items-center justify-center text-white text-base font-bold shadow-md">
                      MS
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" title="Online & Available" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Marcus Sterling</h3>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                        CFP®
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">Senior Wealth Strategist</p>
                    <p className="text-[11px] text-slate-400">Matt Strategy Futuristic</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                    <span>18+ Yrs Exp</span>
                  </div>
                </div>
              </div>

              {/* Personal Consultant Message */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed italic space-y-2">
                <p>
                  "At Matt Strategy Futuristic, we believe exceptional financial strategies are built on disciplined listening and strategic clarity. Let's explore your goals and map out your next milestone."
                </p>
              </div>

              {/* Consultation Steps */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between text-slate-300">
                  <span className="font-medium text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] flex items-center justify-center text-emerald-400 font-bold">1</span>
                    Goal Discovery
                  </span>
                  <span className="text-[11px] text-slate-400">Conversational check-in</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between text-slate-300">
                  <span className="font-medium text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] flex items-center justify-center text-emerald-400 font-bold">2</span>
                    Situation & Horizon
                  </span>
                  <span className="text-[11px] text-slate-400">Position & risk overview</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between text-slate-300">
                  <span className="font-medium text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-900/60 text-[11px] flex items-center justify-center text-emerald-300 font-bold">3</span>
                    Strategy Consultation
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold">1-on-1 private meeting</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Private Client Confidentiality
                </span>
                <span className="text-emerald-400 font-medium">
                  Direct Partner Access
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
