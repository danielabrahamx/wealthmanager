/**
 * Investment Agent - LangGraph-based conversation agent
 * 
 * Uses LangGraph StateGraph to orchestrate investment conversations.
 * Determines user preferences and generates tier-appropriate recommendations.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { z } from 'zod';
import type { UserTier, Fund, InvestmentPreferences } from '../../../shared/index.js';
import { generateAgentReply } from './llm.js';

// ── State Schema ──

export const InvestmentAgentState = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'agent', 'system']),
    content: z.string(),
  })),
  userId: z.string(),
  tier: z.enum(['beginner', 'intermediate', 'sophisticated']),
  stage: z.enum(['onboarding', 'preference-discovery', 'fund-selection', 'confirmation', 'reporting']),
  fundsDeposited: z.number(),
  preferences: z.object({
    riskTolerance: z.number().optional(),
    investmentGoal: z.enum(['retirement', 'growth', 'income', 'preservation']).optional(),
    timeHorizon: z.enum(['short', 'medium', 'long']).optional(),
  }).nullable(),
  recommendedFunds: z.array(z.string()),
  selectedFunds: z.array(z.string()),
  renderedComponent: z.string().nullable(),
  isDefaultConservative: z.boolean(),
});

export type InvestmentAgentStateType = z.infer<typeof InvestmentAgentState>;

// ── Mock Fund Data ──

const FUNDS: Fund[] = [
  { id: 'vti', name: 'Vanguard Total Stock Market ETF', ticker: 'VTI', category: 'Equity', riskLevel: 'medium', description: 'Broad US stock market exposure', projectedReturn: 8.5, historicalReturn: 10.2, expenseRatio: 0.03 },
  { id: 'vxus', name: 'Vanguard Total International Stock ETF', ticker: 'VXUS', category: 'International Equity', riskLevel: 'medium', description: 'Global stock exposure outside US', projectedReturn: 7.8, historicalReturn: 6.5, expenseRatio: 0.08 },
  { id: 'bnd', name: 'Vanguard Total Bond Market ETF', ticker: 'BND', category: 'Bond', riskLevel: 'low', description: 'Broad US bond market exposure', projectedReturn: 4.2, historicalReturn: 1.5, expenseRatio: 0.03 },
  { id: 'vwo', name: 'Vanguard FTSE Emerging Markets ETF', ticker: 'VWO', category: 'Emerging Markets', riskLevel: 'high', description: 'Emerging market equity exposure', projectedReturn: 10.5, historicalReturn: 3.8, expenseRatio: 0.08 },
  { id: 'vgt', name: 'Vanguard Information Technology ETF', ticker: 'VGT', category: 'Sector - Tech', riskLevel: 'high', description: 'Technology sector focused fund', projectedReturn: 14.2, historicalReturn: 20.1, expenseRatio: 0.10 },
  { id: 'vym', name: 'Vanguard High Dividend Yield ETF', ticker: 'VYM', category: 'Dividend', riskLevel: 'low', description: 'High dividend paying US stocks', projectedReturn: 6.5, historicalReturn: 7.8, expenseRatio: 0.06 },
  { id: 'vgsx', name: 'Vanguard Real Estate ETF', ticker: 'VNQ', category: 'Real Estate', riskLevel: 'medium', description: 'REIT and real estate exposure', projectedReturn: 7.2, historicalReturn: 5.4, expenseRatio: 0.12 },
  { id: 'gld', name: 'SPDR Gold Shares', ticker: 'GLD', category: 'Commodity', riskLevel: 'medium', description: 'Gold bullion trust', projectedReturn: 5.0, historicalReturn: 7.2, expenseRatio: 0.40 },
  { id: 'tlt', name: 'iShares 20+ Year Treasury Bond ETF', ticker: 'TLT', category: 'Bond', riskLevel: 'low', description: 'Long-term US Treasury bonds', projectedReturn: 3.8, historicalReturn: -5.2, expenseRatio: 0.15 },
  { id: 'qqq', name: 'Invesco QQQ Trust', ticker: 'QQQ', category: 'Equity', riskLevel: 'high', description: 'Nasdaq-100 tracking ETF', projectedReturn: 12.5, historicalReturn: 18.4, expenseRatio: 0.20 },
  { id: 'schd', name: 'Schwab US Dividend Equity ETF', ticker: 'SCHD', category: 'Dividend', riskLevel: 'low', description: 'Quality dividend growth stocks', projectedReturn: 7.0, historicalReturn: 11.5, expenseRatio: 0.06 },
  { id: 'arkk', name: 'ARK Innovation ETF', ticker: 'ARKK', category: 'Growth', riskLevel: 'high', description: 'Disruptive innovation companies', projectedReturn: 16.0, historicalReturn: -12.5, expenseRatio: 0.75 },
  { id: 'bndx', name: 'Vanguard Total International Bond ETF', ticker: 'BNDX', category: 'International Bond', riskLevel: 'low', description: 'International bond exposure', projectedReturn: 3.5, historicalReturn: -0.8, expenseRatio: 0.07 },
  { id: 'voe', name: 'Vanguard Mid-Cap Value ETF', ticker: 'VOE', category: 'Mid-Cap Value', riskLevel: 'medium', description: 'Mid-cap value stocks', projectedReturn: 8.0, historicalReturn: 9.8, expenseRatio: 0.07 },
  { id: 'vbr', name: 'Vanguard Small-Cap Value ETF', ticker: 'VBR', category: 'Small-Cap Value', riskLevel: 'medium', description: 'Small-cap value stocks', projectedReturn: 9.2, historicalReturn: 8.9, expenseRatio: 0.07 },
  { id: 'spy', name: 'SPDR S&P 500 ETF Trust', ticker: 'SPY', category: 'Equity', riskLevel: 'medium', description: 'S&P 500 index tracking', projectedReturn: 9.0, historicalReturn: 12.1, expenseRatio: 0.09 },
  { id: 'iwm', name: 'iShares Russell 2000 ETF', ticker: 'IWM', category: 'Small-Cap', riskLevel: 'high', description: 'US small-cap stocks', projectedReturn: 8.8, historicalReturn: 7.5, expenseRatio: 0.19 },
  { id: 'eem', name: 'iShares MSCI Emerging Markets ETF', ticker: 'EEM', category: 'Emerging Markets', riskLevel: 'high', description: 'Broad emerging markets', projectedReturn: 10.0, historicalReturn: 2.1, expenseRatio: 0.70 },
  { id: 'xlf', name: 'Financial Select Sector SPDR Fund', ticker: 'XLF', category: 'Sector - Financials', riskLevel: 'medium', description: 'US financial sector', projectedReturn: 7.5, historicalReturn: 11.2, expenseRatio: 0.09 },
  { id: 'xle', name: 'Energy Select Sector SPDR Fund', ticker: 'XLE', category: 'Sector - Energy', riskLevel: 'high', description: 'US energy sector', projectedReturn: 9.5, historicalReturn: 15.8, expenseRatio: 0.09 },
  { id: 'vixy', name: 'ProShares VIX Short-Term Futures ETF', ticker: 'VIXY', category: 'Volatility', riskLevel: 'high', description: 'VIX futures exposure', projectedReturn: -5.0, historicalReturn: -35.2, expenseRatio: 0.85 },
  { id: 'shy', name: 'iShares 1-3 Year Treasury Bond ETF', ticker: 'SHY', category: 'Bond', riskLevel: 'low', description: 'Short-term US treasuries', projectedReturn: 4.0, historicalReturn: 1.8, expenseRatio: 0.15 },
];

// ── System Prompt ──

const SYSTEM_PROMPT = `You are a knowledgeable wealth management AI assistant helping users invest their money.

You are NOT limited to a fixed fund list. You can discuss and reason about any security the user
asks about - individual stocks (e.g. NVDA, AAPL), sectors, crypto, bonds, macro trends, and
strategies. When live market research is provided to you, use it for current facts and figures.
When you lack hard data, reason transparently and say what you're estimating rather than refusing.

Helpful principles (guidance, not hard limits):
1. Diversification generally reduces risk.
2. Risk tolerance should consider time horizon (longer horizon = more room for risk).
3. Conservative portfolios lean toward capital preservation; aggressive portfolios lean toward growth.

Conversation guidelines:
- If the user says "I don't care, just put my money somewhere secure", recommend a conservative
  portfolio (e.g., ~60% bonds, ~40% diversified equities).
- Otherwise gather what you need (risk tolerance, goals, time horizon) but don't interrogate - infer
  sensible defaults and move forward rather than re-asking the same question.
- Match the user's sophistication: beginners get plain language and analogies; sophisticated users
  get direct, data-aware analysis.

You may reference the curated funds when relevant, but you are free to answer broader questions too.`;

// ── Node: Classify Intent ──

function detectDefaultConservative(message: string): boolean {
  const patterns = [
    /i don'?t care/i,
    /just put (my|the) money/i,
    /somewhere (safe|secure)/i,
    /do(n'?t)? (know|care) what/i,
    /whatever you think/i,
    /surprise me/i,
    /you decide/i,
    /anywhere/i,
  ];
  return patterns.some(p => p.test(message));
}

function detectLevelUpQuestion(message: string, tier: UserTier): boolean {
  if (tier === 'sophisticated') return false; // Already at top
  
  const sophisticatedIndicators = [
    /monte carlo/i,
    /sharpe ratio/i,
    /standard deviation/i,
    /beta coefficient/i,
    /alpha generation/i,
    /tax.*(loss|optimiz)/i,
    /correlation matrix/i,
    /var.*(95|99)/i,
    /scenario analysis/i,
    /stress test/i,
    /factor (exposure|analysis)/i,
    /interest rate.*(cut|hike|effect)/i,
    /federal reserve/i,
    /yield curve/i,
    /quantitative/i,
    /hedge/i,
    /derivatives/i,
    /options.*strategy/i,
  ];
  
  return sophisticatedIndicators.some(p => p.test(message));
}

/**
 * Extract any preferences expressed in a single user message. `prevAgent` is the
 * assistant message that immediately preceded it, used for context so a bare
 * answer ("5", "conservative") is interpreted against the question that was asked.
 */
function extractPreferences(message: string, prevAgent: string = ''): Partial<InvestmentPreferences> {
  const prefs: Partial<InvestmentPreferences> = {};
  const askedRisk = /risk tolerance|scale of 1-10|1\s*-\s*10|how risky|risk comfort|risk level|risk parameters/i.test(prevAgent);
  const askedHorizon = /time horizon|how long|when (do|will) you need|need this money/i.test(prevAgent);

  // Risk tolerance detection
  const riskMatch = message.match(/risk.*?(\d{1,2})/i) || message.match(/(\d{1,2}).*risk/i);
  const bareNumber = message.trim().match(/^\s*(\d{1,2})\s*(?:\/\s*10)?\s*$/);
  if (riskMatch) {
    prefs.riskTolerance = clampRisk(parseInt(riskMatch[1]));
  } else if (bareNumber && askedRisk) {
    // A lone number answering "rate your risk tolerance 1-10".
    prefs.riskTolerance = clampRisk(parseInt(bareNumber[1]));
  } else if (/very.*(safe|low|conservative)/i.test(message) || /no risk/i.test(message)) {
    prefs.riskTolerance = 2;
  } else if (/high.*risk/i.test(message) || /aggressive/i.test(message) || /risky/i.test(message)) {
    prefs.riskTolerance = 9;
  } else if (/\bconservative\b|\bcautious\b/i.test(message)) {
    prefs.riskTolerance = 2;
  } else if (/\b(balanced|moderate|middle|in between|in-between)\b/i.test(message)) {
    prefs.riskTolerance = 5;
  } else if (/\b(growth|grow)\b/i.test(message) && askedRisk) {
    prefs.riskTolerance = 8;
  }

  // Goal detection
  if (/retire/i.test(message)) prefs.investmentGoal = 'retirement';
  else if (/grow/i.test(message) || /growth/i.test(message)) prefs.investmentGoal = 'growth';
  else if (/income/i.test(message) || /dividend/i.test(message)) prefs.investmentGoal = 'income';
  else if (/preserv/i.test(message) || /\bsafe\b/i.test(message) || /secur/i.test(message) || /\bconservative\b/i.test(message) || /capital.*protect/i.test(message)) prefs.investmentGoal = 'preservation';

  // Time horizon detection
  if (/short.*term/i.test(message) || /soon/i.test(message) || /year or two/i.test(message)) prefs.timeHorizon = 'short';
  else if (/long.*term/i.test(message) || /decade/i.test(message) || /distant/i.test(message) || /\d{2,}\s*year/i.test(message)) prefs.timeHorizon = 'long';
  else if (/medium/i.test(message) || /few.*year/i.test(message) || /5.*year/i.test(message)) prefs.timeHorizon = 'medium';
  else if (askedHorizon && /\b(short)\b/i.test(message)) prefs.timeHorizon = 'short';
  else if (askedHorizon && /\b(long)\b/i.test(message)) prefs.timeHorizon = 'long';

  return prefs;
}

function clampRisk(n: number): number {
  if (Number.isNaN(n)) return 5;
  return Math.max(1, Math.min(10, n));
}

/**
 * Walk the WHOLE conversation and accumulate preferences turn-by-turn. This is
 * the fix for the "agent re-asks the same question" loop: state is rebuilt from
 * the full transcript each turn instead of relying on a single message or on
 * preferences that were never persisted between turns.
 */
function deriveConversationState(
  messages: Array<{ role: string; content: string }>,
  existingPrefs: InvestmentPreferences | null,
): { preferences: Partial<InvestmentPreferences>; isDefaultConservative: boolean } {
  let preferences: Partial<InvestmentPreferences> = { ...(existingPrefs || {}) };
  let isDefaultConservative = false;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    const prevAgent = messages.slice(0, i).reverse().find((x) => x.role === 'agent')?.content || '';

    if (detectDefaultConservative(m.content)) isDefaultConservative = true;

    const ext = extractPreferences(m.content, prevAgent);
    if (ext.riskTolerance !== undefined) preferences.riskTolerance = ext.riskTolerance;
    if (ext.investmentGoal !== undefined) preferences.investmentGoal = ext.investmentGoal;
    if (ext.timeHorizon !== undefined) preferences.timeHorizon = ext.timeHorizon;
  }

  return { preferences, isDefaultConservative };
}

// ── Node: Get Fund Recommendations ──

function getRecommendedFunds(prefs: Partial<InvestmentPreferences> | null, isDefaultConservative: boolean): Fund[] {
  if (isDefaultConservative || (prefs?.investmentGoal === 'preservation') || (prefs?.riskTolerance && prefs.riskTolerance <= 3)) {
    // Conservative: bonds + dividend + broad market
    return FUNDS.filter(f => ['BND', 'SCHD', 'SHY', 'VTI', 'BNDX'].includes(f.ticker.toUpperCase()));
  }
  
  if (prefs?.riskTolerance && prefs.riskTolerance >= 8) {
    // Aggressive: growth, tech, emerging
    return FUNDS.filter(f => ['VGT', 'QQQ', 'ARKK', 'VWO', 'IWM', 'EEM', 'SPY', 'XLE'].includes(f.ticker.toUpperCase()));
  }
  
  // Default: Balanced - return 10 funds for intermediate, 20+ for sophisticated
  const balanced = FUNDS.filter(f => ['VTI', 'VXUS', 'BND', 'SPY', 'VWO', 'VGT', 'SCHD', 'VNQ', 'GLD', 'QQQ'].includes(f.ticker.toUpperCase()));
  return balanced;
}

function generateAgentResponse(state: InvestmentAgentStateType): string {
  const tier = state.tier;
  const lastMsg = state.messages[state.messages.length - 1]?.content || '';
  const isDefaultCon = state.isDefaultConservative;
  
  if (isDefaultCon) {
    if (tier === 'beginner') {
      return "I understand - you want your money somewhere safe and simple. I'll recommend a conservative portfolio that prioritizes protecting your money while still giving you modest growth. This portfolio is about 60% bonds and 40% diversified stocks. Think of it like a steady, reliable car rather than a race car. Would you like to see my recommendation?";
    }
    return "Understood. Based on your preference for security, I'm recommending a conservative portfolio: 60% bonds, 40% diversified equities. This prioritizes capital preservation with modest growth potential. I'll show you the matching funds now.";
  }
  
  // Check what we know vs what we still need to ask
  const prefs = state.preferences;
  if (!prefs?.riskTolerance) {
    if (tier === 'beginner') {
      return "To find the right investment for you, I have a simple question: How comfortable are you with ups and downs? Would you prefer something very safe (your money stays stable), something with more growth potential (but some ups and downs), or somewhere in between?";
    }
    if (tier === 'intermediate') {
      return "Let me understand your investment profile. On a scale of 1-10, how would you rate your risk tolerance? (1 = I want to preserve my capital at all costs, 10 = I'm comfortable with significant volatility for higher returns)";
    }
    return "Let's calibrate your risk parameters. On a scale of 1-10, what's your risk tolerance? Also, any specific sectors or strategies you're interested in exploring?";
  }
  
  if (!prefs?.investmentGoal) {
    if (tier === 'beginner') {
      return "And what's your main goal for this money? Are you saving for retirement down the road, looking for steady income now, or hoping to grow your money over time?";
    }
    return "What's your primary investment objective - retirement planning, capital growth, income generation, or capital preservation?";
  }
  
  if (!prefs?.timeHorizon) {
    if (tier === 'beginner') {
      return "One more thing - when do you think you'll need this money? Is it for something soon (a year or two), a few years from now, or way down the road?";
    }
    return "What's your investment time horizon? Short-term (1-2 years), medium-term (3-7 years), or long-term (8+ years)?";
  }
  
  // All preferences gathered - recommend funds
  const funds = getRecommendedFunds(prefs, isDefaultCon);
  if (tier === 'beginner') {
    return `Great! Based on what you've told me, I found a fund that matches your needs perfectly. It's diversified, matches your comfort level, and aligns with your goals. Ready to see it?`;
  }
  if (tier === 'intermediate') {
    return `I've analyzed your preferences and selected ${funds.length} funds that match your profile. Each option shows projected returns and key metrics. Review them and select the ones that feel right to you.`;
  }
  return `Based on your risk profile (${prefs?.riskTolerance}/10), ${prefs?.investmentGoal} objective, and ${prefs?.timeHorizon} time horizon, I've screened ${funds.length} funds across multiple asset classes. You can filter, sort, and analyze each holding. Real-time market data is available for deep analysis.`;
}

function getRenderedComponentType(state: InvestmentAgentStateType): string | null {
  const stage = state.stage;
  const tier = state.tier;
  const prefs = state.preferences;
  const isDefaultCon = state.isDefaultConservative;
  
  // Check level-up
  const lastMsg = state.messages[state.messages.length - 1]?.content || '';
  if (detectLevelUpQuestion(lastMsg, tier)) {
    return 'advanced-screener'; // Level-up: show sophisticated component
  }

  // Beginners always get tappable option buttons while we're still discovering
  // their risk appetite - this is the "button they previously had".
  if (tier === 'beginner' && stage === 'preference-discovery' && !prefs?.riskTolerance && !isDefaultCon) {
    return 'beginner-choice';
  }

  if (stage === 'preference-discovery' && (prefs?.riskTolerance || isDefaultCon)) {
    return tier === 'beginner' ? 'simple-choice' : 
           tier === 'intermediate' ? 'fund-grid' : 
           'advanced-screener';
  }
  
  if (stage === 'fund-selection') {
    return tier === 'beginner' ? 'simple-choice' : 
           tier === 'intermediate' ? 'fund-grid' : 
           'advanced-screener';
  }
  
  if (stage === 'confirmation') {
    return 'confirmation';
  }
  
  if (stage === 'reporting') {
    return `report-${tier}`;
  }
  
  return null;
}

// ── Graph Nodes ──

async function classifyNode(state: InvestmentAgentStateType): Promise<Partial<InvestmentAgentStateType>> {
  const lastUserMsg = [...state.messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) {
    return { stage: 'preference-discovery' };
  }
  const content = lastUserMsg.content;

  // Accumulate preferences across the ENTIRE conversation (fixes the re-ask loop).
  const { preferences, isDefaultConservative } = deriveConversationState(
    state.messages,
    (state.preferences as InvestmentPreferences | null) ?? null,
  );

  // "I don't care, just keep it safe" → jump straight to a conservative recommendation.
  if (isDefaultConservative) {
    return {
      stage: 'fund-selection',
      isDefaultConservative: true,
      preferences: {
        riskTolerance: preferences.riskTolerance ?? 3,
        investmentGoal: 'preservation',
        timeHorizon: preferences.timeHorizon ?? 'medium',
      },
    };
  }

  const hasRisk = preferences.riskTolerance !== undefined;
  const hasGoal = preferences.investmentGoal !== undefined;
  const hasHorizon = preferences.timeHorizon !== undefined;

  // Beginners only need a risk signal (one button tap) before we recommend - we
  // infer the rest so they aren't interrogated. Higher tiers gather all three.
  const beginnerReady = state.tier === 'beginner' && hasRisk;
  const advancedReady = state.tier !== 'beginner' && hasRisk && hasGoal && hasHorizon;

  // Explicit confirmation only counts once we already have a recommendation to confirm.
  if (hasRisk && /^(yes|yep|ok(ay)?|sure|accept|confirm|go ahead|let'?s do it|do it)\b/i.test(content.trim())) {
    return { stage: 'confirmation', preferences: fillDefaults(preferences) };
  }

  if (beginnerReady || advancedReady) {
    return { stage: 'fund-selection', preferences: fillDefaults(preferences) };
  }

  // Still gathering - keep whatever we know so generateAgentResponse asks the next gap.
  return { stage: 'preference-discovery', preferences: preferences as any };
}

/** Fill any missing preference fields with sensible defaults for fund selection. */
function fillDefaults(prefs: Partial<InvestmentPreferences>): InvestmentPreferences {
  return {
    riskTolerance: prefs.riskTolerance ?? 5,
    investmentGoal: prefs.investmentGoal ?? 'growth',
    timeHorizon: prefs.timeHorizon ?? 'medium',
  };
}

async function agentResponseNode(state: InvestmentAgentStateType): Promise<Partial<InvestmentAgentStateType>> {
  const response = generateAgentResponse(state);
  const componentType = getRenderedComponentType(state);
  const recommendedFunds = getRecommendedFunds(state.preferences, state.isDefaultConservative);
  
  return {
    messages: [
      ...state.messages,
      { role: 'agent' as const, content: response },
    ],
    renderedComponent: componentType,
    recommendedFunds: recommendedFunds.map(f => f.id),
  };
}

async function confirmationNode(state: InvestmentAgentStateType): Promise<Partial<InvestmentAgentStateType>> {
  return {
    stage: 'reporting',
    messages: [
      ...state.messages,
      { 
        role: 'agent' as const, 
        content: state.tier === 'beginner' 
          ? '✅ Your investment is confirmed! Your money is now working for you. Let me show you how it\'s doing.'
          : '✅ Investment confirmed. Your portfolio is now active. Here\'s your personalized dashboard.',
      },
    ],
    renderedComponent: `report-${state.tier}`,
    selectedFunds: state.recommendedFunds.slice(0, state.tier === 'beginner' ? 1 : state.tier === 'intermediate' ? 10 : 20),
  };
}

// ── Build the Graph ──

function buildInvestmentGraph() {
  const graph = new StateGraph(InvestmentAgentState)
    .addNode('classify', classifyNode as any)
    .addNode('agentResponse', agentResponseNode as any)
    .addNode('confirmation', confirmationNode as any)
    .addEdge(START, 'classify')
    .addConditionalEdges('classify', (state: InvestmentAgentStateType) => {
      if (state.stage === 'confirmation') return 'confirmation';
      return 'agentResponse';
    }, { confirmation: 'confirmation', agentResponse: 'agentResponse' })
    .addConditionalEdges('agentResponse', (state: InvestmentAgentStateType) => {
      if (state.stage === 'confirmation') return 'confirmation';
      return END;
    }, { confirmation: 'confirmation', [END]: END })
    .addEdge('confirmation', END)
    .compile();
  
  return graph;
}

// ── Public API ──

export async function runInvestmentAgent(
  userId: string,
  tier: UserTier,
  fundsDeposited: number,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'agent' | 'system'; content: string }> = [],
  existingPrefs: InvestmentPreferences | null = null,
): Promise<{
  response: string;
  stage: string;
  componentType: string | null;
  recommendedFunds: Fund[];
  selectedFunds: Fund[];
  preferences: Partial<InvestmentPreferences> | null;
}> {
  const graph = buildInvestmentGraph();
  
  const initialState: InvestmentAgentStateType = {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message },
    ],
    userId,
    tier,
    stage: 'preference-discovery',
    fundsDeposited,
    preferences: existingPrefs as any,
    recommendedFunds: [],
    selectedFunds: [],
    renderedComponent: null,
    isDefaultConservative: false,
  };
  
  // Compute the deterministic result (which UI to render, which funds, stage).
  let base: Awaited<ReturnType<typeof runInvestmentAgent>>;
  try {
    const typedResult = (await graph.invoke(initialState)) as InvestmentAgentStateType;
    base = {
      response: typedResult.messages[typedResult.messages.length - 1]?.content || '',
      stage: typedResult.stage,
      componentType: typedResult.renderedComponent,
      recommendedFunds: FUNDS.filter(f => typedResult.recommendedFunds.includes(f.id)),
      selectedFunds: FUNDS.filter(f => typedResult.selectedFunds.includes(f.id)),
      preferences: typedResult.preferences as any,
    };
  } catch (err) {
    console.warn('[agent] LangGraph invoke failed, using fallback:', (err as Error).message?.substring(0, 100));
    base = fallbackAgentResponse(tier, fundsDeposited, message, conversationHistory, existingPrefs);
  }

  // Enhance the user-facing text with the LLM (DeepSeek) when configured.
  // The structured decisions above are preserved; only `response` is rewritten.
  const llmText = await generateAgentReply({
    tier,
    message,
    history: conversationHistory,
    preferences: base.preferences,
    recommendedFunds: base.recommendedFunds,
    stage: base.stage,
  });

  return llmText ? { ...base, response: llmText } : base;
}

// ── Fallback Agent (no AI required) ──

function fallbackAgentResponse(
  tier: UserTier,
  fundsDeposited: number,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  existingPrefs: InvestmentPreferences | null
): ReturnType<typeof runInvestmentAgent> extends Promise<infer T> ? T : never {
  const lower = message.toLowerCase();
  const isDefault = /don't care|just put|somewhere secure|whatever/i.test(lower);
  
  let response: string;
  let componentType: string | null = null;
  let recommendedFunds = FUNDS;
  let preferences = existingPrefs || {};
  let stage = 'preference-discovery';

  if (tier === 'beginner') {
    if (isDefault) {
      response = "I understand - let's keep things safe and simple. I recommend our Conservative Portfolio: 60% in bonds (BND) and 40% in diversified stocks (VTI). This is a low-risk approach that prioritizes keeping your money secure while earning modest returns. Would you like to accept this recommendation?";
      componentType = 'simple-choice';
      recommendedFunds = FUNDS.filter(f => f.riskLevel === 'low' || f.id === 'vti');
      preferences = { riskTolerance: 3, investmentGoal: 'preservation', timeHorizon: 'short' };
      stage = 'fund-selection';
    } else if (lower.includes('risky') || lower.includes('aggressive') || lower.includes('high risk')) {
      response = "An aggressive approach could grow your money faster but comes with more ups and downs. For a higher-risk strategy, I recommend focusing on growth stocks like VUG and sector funds. Just remember - with higher potential returns comes more volatility. Would you like to see this option?";
      componentType = 'simple-choice';
      recommendedFunds = FUNDS.filter(f => f.riskLevel === 'high');
      preferences = { riskTolerance: 8, investmentGoal: 'growth', timeHorizon: 'long' };
      stage = 'fund-selection';
    } else {
      response = "A balanced approach is the sweet spot - you get growth potential with some protection. I recommend mixing stocks and bonds. Would you prefer a conservative (safer), balanced (moderate), or aggressive (higher growth) mix?";
      componentType = 'simple-choice';
    }
  } else if (tier === 'intermediate') {
    if (isDefault) {
      response = "I'll put together a diversified portfolio with a moderate risk profile. Here are 10 funds spanning stocks, bonds, and real estate. Each shows projected returns and key metrics.";
      componentType = 'fund-grid';
      recommendedFunds = FUNDS.slice(0, 10);
      preferences = { riskTolerance: 5, investmentGoal: 'growth', timeHorizon: 'medium' };
      stage = 'fund-selection';
    } else if (lower.includes('growth') || lower.includes('tech') || lower.includes('aggressive')) {
      response = "For growth-focused investing, I've selected funds with strong historical returns and above-average growth potential. Here are the top options:";
      componentType = 'fund-grid';
      recommendedFunds = FUNDS.filter(f => f.projectedReturn >= 8).slice(0, 10);
      preferences = { riskTolerance: 7, investmentGoal: 'growth', timeHorizon: 'long' };
      stage = 'fund-selection';
    } else {
      response = "Based on a balanced approach, here are curated funds across different asset classes. Each shows performance projections to help you decide:";
      componentType = 'fund-grid';
      recommendedFunds = FUNDS.slice(0, 10);
      preferences = { riskTolerance: 5, investmentGoal: 'growth', timeHorizon: 'medium' };
      stage = 'fund-selection';
    }
  } else {
    // Sophisticated tier
    response = "I've compiled the full fund universe with real-time market data (powered by Linkup). You can filter by sector, risk level, or performance metrics. Monte Carlo simulations are available for any portfolio combination you'd like to test.";
    componentType = 'advanced-screener';
    recommendedFunds = FUNDS;
    preferences = { riskTolerance: 7, investmentGoal: 'growth', timeHorizon: 'long' };
    stage = 'fund-selection';
  }

  // Handle preference questions
  if (/risk tolerance|how risky|risk level/i.test(lower)) {
    response = "On a scale of 1-10, where would you place your risk comfort? 1-3 is conservative (preserve capital), 4-7 is moderate, 8-10 is aggressive (maximize growth).";
  } else if (/goal|purpose|retirement|saving for/i.test(lower)) {
    response = "What's your main goal? Options: retirement planning, wealth growth, generating income, or capital preservation.";
  } else if (/horizon|how long|when do you need/i.test(lower)) {
    response = "When do you need this money? Short term (1-3 years), medium term (3-10 years), or long term (10+ years)?";
  }

  return {
    response,
    stage,
    componentType,
    recommendedFunds,
    selectedFunds: [],
    preferences,
  };
}

export { FUNDS, detectLevelUpQuestion };
