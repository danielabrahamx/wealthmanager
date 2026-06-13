/**
 * LLM client - DeepSeek via the OpenAI-compatible API.
 *
 * DeepSeek exposes an OpenAI-compatible endpoint, so we reuse @langchain/openai's
 * ChatOpenAI with a base-URL override. If DEEPSEEK_API_KEY is absent (or a call
 * fails) the caller falls back to the deterministic rule-based responder, so the
 * app always works without a key.
 *
 * Env:
 *   DEEPSEEK_API_KEY   required to enable the LLM
 *   DEEPSEEK_MODEL     optional, defaults to "deepseek-v4-flash"
 *   DEEPSEEK_BASE_URL  optional, defaults to "https://api.deepseek.com/v1"
 */
import { ChatOpenAI } from '@langchain/openai';
import type { Fund, InvestmentPreferences, UserTier } from '../../shared/index.js';

let cached: ChatOpenAI | null | undefined;

export function getChatModel(): ChatOpenAI | null {
  if (cached !== undefined) return cached;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    cached = null;
    return null;
  }

  cached = new ChatOpenAI({
    apiKey,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    temperature: 0.4,
    maxTokens: 320,
    configuration: { baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1' },
  });
  return cached;
}

export function isLlmEnabled(): boolean {
  return getChatModel() !== null;
}

interface ReplyContext {
  tier: UserTier;
  message: string;
  history: Array<{ role: string; content: string }>;
  preferences: Partial<InvestmentPreferences> | null;
  recommendedFunds: Fund[];
  stage: string;
}

/**
 * Per-tier persona. Each tier gets a genuinely different assistant: a different
 * vocabulary ceiling, sentence length, and what it's even allowed to mention.
 * The beginner persona is the strictest - no tickers, no jargon, no numbers.
 */
const PERSONA: Record<UserTier, string[]> = {
  beginner: [
    'You are talking to a COMPLETE BEGINNER who has never invested before and finds money stressful.',
    'Tone: warm, calm, encouraging - like a kind friend, not a banker.',
    'HARD RULES:',
    '- NEVER use ticker symbols (e.g. VTI, BND, SPY) or fund names. Say "a mix of investments" instead.',
    '- NEVER use jargon: no "diversified", "allocation", "equities", "bonds", "expense ratio", "volatility", "portfolio".',
    '- NEVER quote percentages, returns, or risk numbers.',
    '- Use everyday analogies (a savings jar, planting a tree, a balanced meal).',
    '- Max 3 short sentences. Reassure them they are making a smart, safe choice.',
  ],
  intermediate: [
    'You are talking to someone comfortable with investing basics who wants practical guidance.',
    'Tone: clear, practical, confident. Light financial terms are welcome.',
    'You MAY reference fund names, ticker symbols, and projected returns from the list provided.',
    'Explain the "why" briefly (e.g. growth vs. stability) without lecturing. Max ~80 words.',
  ],
  sophisticated: [
    'You are talking to an experienced investor fluent in markets and risk.',
    'Tone: direct, data-aware, concise. No hand-holding, no basic definitions.',
    'Reference tickers, risk levels, projected returns, and metrics (Sharpe, beta, drawdown) where relevant.',
    'Be precise and efficient. Max ~80 words.',
  ],
};

/**
 * Generate the user-facing assistant reply with DeepSeek. The structured
 * decisions (which UI to render, which funds) are made deterministically by the
 * agent; the LLM only writes the natural-language message that accompanies them.
 * Returns null if the LLM is unavailable or errors (caller keeps rule-based text).
 */
export async function generateAgentReply(ctx: ReplyContext): Promise<string | null> {
  const model = getChatModel();
  if (!model) return null;

  // Beginners never see tickers - describe funds generically so the LLM can't
  // leak symbols. Higher tiers get the full ticker/return detail to reference.
  const fundList =
    ctx.tier === 'beginner'
      ? ''
      : ctx.recommendedFunds
          .slice(0, 12)
          .map((f) => `${f.ticker} (${f.name}, ${f.riskLevel} risk, ~${f.projectedReturn}% projected)`)
          .join('; ');

  const system = [
    ...PERSONA[ctx.tier],
    'A separate system renders the interactive UI (fund cards / choices) - do NOT describe buttons or UI.',
    'Never invent tickers, prices, or returns.',
    'Do not use markdown headings.',
    fundList ? `Recommended funds you may reference: ${fundList}` : '',
    ctx.preferences ? `Known preferences: ${JSON.stringify(ctx.preferences)}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const messages = [
    { role: 'system' as const, content: system },
    ...ctx.history.slice(-6).map((m) => ({
      role: (m.role === 'agent' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as 'assistant' | 'user' | 'system',
      content: m.content,
    })),
    { role: 'user' as const, content: ctx.message },
  ];

  try {
    const res = await model.invoke(messages);
    const text = typeof res.content === 'string' ? res.content : String(res.content ?? '');
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (err) {
    console.warn('[llm] DeepSeek call failed, using rule-based reply:', (err as Error).message?.slice(0, 120));
    return null;
  }
}
