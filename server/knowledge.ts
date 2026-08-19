export interface EducationalTopic {
  id: string;
  title: string;
  summary: string;
  bulletPoints: string[];
  keyTakeaway: string;
  adviserRelevance: string;
}

export const APPROVED_EDUCATIONAL_TOPICS: Record<string, EducationalTopic> = {
  diversification: {
    id: 'diversification',
    title: 'Understanding Diversification',
    summary: 'Diversification is the practice of spreading your investments across different asset classes, sectors, and geographies to reduce overall portfolio risk.',
    bulletPoints: [
      'Different assets (like equities, bonds, cash, and property) react differently to economic events.',
      'Holding a mix of assets helps smooth out returns over time, reducing the impact of any single falling investment.',
      'Diversification does not guarantee against loss, but it is one of the most effective tools to manage volatility.'
    ],
    keyTakeaway: 'Avoid putting all your eggs in one basket; a balanced spread can help align your risk with your long-term goals.',
    adviserRelevance: 'An adviser can help construct an optimal asset allocation tailored to your specific risk tolerance and target timeline.'
  },
  risk_vs_return: {
    id: 'risk_vs_return',
    title: 'The Relationship Between Risk & Return',
    summary: 'Higher potential returns generally require accepting greater volatility and potential for short-term losses.',
    bulletPoints: [
      'Cash and high-quality government bonds offer lower risk but may not outpace inflation over long periods.',
      'Equities (stocks) historically offer higher potential growth over 5–10+ years, but with sharper short-term price fluctuations.',
      'Your risk capacity depends on your timeline: longer time horizons allow more time to recover from market downturns.'
    ],
    keyTakeaway: 'Match your risk level to your time horizon and comfort, ensuring you do not take more risk than needed to meet your objectives.',
    adviserRelevance: 'A qualified wealth planner conducts comprehensive risk profiling to balance your emotional comfort with mathematical growth requirements.'
  },
  pensions_and_isas: {
    id: 'pensions_and_isas',
    title: 'Tax-Efficient Investing: Pensions & ISAs',
    summary: 'Utilising tax-advantaged accounts in the UK can significantly boost net returns over the compounding horizon.',
    bulletPoints: [
      'ISAs (Individual Savings Accounts) allow you to invest up to the annual allowance where all capital gains and dividends grow 100% tax-free.',
      'Pensions benefit from upfront income tax relief (basic, higher, and additional rates) and employer contributions.',
      'Pension funds are accessible from normal minimum pension age (currently 55, rising to 57 in 2028).'
    ],
    keyTakeaway: 'Balancing contributions between ISAs (accessible flexibility) and Pensions (tax relief on retirement) is a cornerstone of financial planning.',
    adviserRelevance: 'Advisers provide holistic tax wrapper optimisation, lifetime cashflow modelling, and pension consolidation analysis.'
  },
  compounding_and_inflation: {
    id: 'compounding_and_inflation',
    title: 'The Power of Compounding vs. Inflation',
    summary: 'Compounding allows your investment earnings to generate their own earnings over time, acting as a crucial defence against inflation.',
    bulletPoints: [
      'Inflation erodes the purchasing power of idle cash savings year after year.',
      'Reinvesting dividends and interest creates an exponential growth curve over decades.',
      'Starting earlier gives your capital significantly more time to multiply, even with modest regular contributions.'
    ],
    keyTakeaway: 'Investing early and consistently helps preserve and expand your real purchasing power.',
    adviserRelevance: 'An adviser can model inflation-adjusted projections to ensure your future retirement income maintains its lifestyle standard.'
  },
  funds_and_etfs: {
    id: 'funds_and_etfs',
    title: 'Funds, ETFs & Equities Explained',
    summary: 'Funds and ETFs (Exchange Traded Funds) allow investors to purchase a basket of hundreds or thousands of securities in a single transaction.',
    bulletPoints: [
      'Passive index funds and ETFs track specific market benchmarks (e.g. FTSE 100, S&P 500, MSCI World) at low ongoing management costs.',
      'Active funds are managed by fund managers attempting to outperform indices, usually with higher fee structures.',
      'Collective funds provide instant diversification that would be costly and complex to build with individual single shares.'
    ],
    keyTakeaway: 'Baskets of diversified index funds form the core building blocks for most modern institutional and personal portfolios.',
    adviserRelevance: 'Advisers select cost-effective, institutional-grade portfolios with disciplined rebalancing frameworks.'
  },
  retirement_readiness: {
    id: 'retirement_readiness',
    title: 'Planning for a Comfortable Retirement',
    summary: 'Retirement planning is about transforming accumulated wealth into a sustainable, tax-efficient stream of lifetime income.',
    bulletPoints: [
      'Identify your desired annual income in retirement and account for essential vs discretionary spending.',
      'Trace all existing workplace pensions, personal SIPPs, and state pension forecasts.',
      'Consider your withdrawal strategy (drawdown vs annuities) to manage longevity and market sequence-of-returns risk.'
    ],
    keyTakeaway: 'A clear retirement roadmap replaces anxiety with a calculated step-by-step contribution and drawdown strategy.',
    adviserRelevance: 'Comprehensive cashflow forecasting by an adviser shows precisely when you can retire and how long your funds will last.'
  }
};
