/**
 * AG-UI endpoint — the agentic generative-UI surface.
 *
 * POST /api/agui streams a spec-compliant AG-UI event sequence (text + A2UI
 * surface) for a chat turn or a UI action dispatched from an A2UI button.
 * CopilotKit (a2ui-renderer) on the frontend consumes the A2UI envelopes.
 */
import { Router, Request, Response } from 'express';
import { runInvestmentAgent, FUNDS } from '../agent/investment-agent.js';
import { getUserProfile } from '../redis/client.js';
import { runMonteCarloSimulation } from '../linkup/client.js';
import { buildSurfaceFor, buildConfirmation } from '../a2ui/builder.js';
import { streamAguiRun } from '../agui/stream.js';
import type { UserProfile, UserTier } from '../../shared/index.js';

export const aguiRouter = Router();

interface AguiBody {
  userId: string;
  message?: string;
  action?: { name: string; context?: Record<string, unknown> };
  tier?: UserTier;
  fundsDeposited?: number;
  conversationHistory?: Array<{ role: 'user' | 'agent' | 'system'; content: string }>;
}

const hasLinkup = (): boolean => !!process.env.LINKUP_API_KEY;

aguiRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body as AguiBody;
  const { userId, message, action, conversationHistory } = body;

  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  // Resolve the profile; degrade gracefully if Redis is unavailable.
  let profile: UserProfile | null = await getUserProfile(userId).catch(() => null);
  if (!profile) {
    profile = {
      userId,
      tier: body.tier || 'beginner',
      fundsDeposited: body.fundsDeposited || 0,
      preferences: null,
      createdAt: new Date().toISOString(),
    };
  }
  const tier: UserTier = body.tier || profile.tier;
  const threadId = userId;

  // ── UI action dispatched from an A2UI button ──
  if (action) {
    await handleAction(res, { action, tier, profile, threadId });
    return;
  }

  // ── Normal chat turn ──
  const result = await runInvestmentAgent(
    userId,
    tier,
    profile.fundsDeposited,
    message || '',
    conversationHistory || [],
    profile.preferences,
  );

  const a2ui = buildSurfaceFor(result.componentType, tier, result.response, result.recommendedFunds, {
    hasLiveData: hasLinkup(),
  });

  streamAguiRun(res, { threadId, text: result.response, a2ui });
});

async function handleAction(
  res: Response,
  ctx: { action: { name: string; context?: Record<string, unknown> }; tier: UserTier; profile: UserProfile; threadId: string },
): Promise<void> {
  const { action, tier, profile, threadId } = ctx;
  const context = action.context || {};
  const fundIds = Array.isArray(context.fundIds) ? (context.fundIds as string[]) : [];

  switch (action.name) {
    case 'invest':
    case 'select_fund': {
      const picked = FUNDS.filter((f) => fundIds.includes(f.id));
      const names = picked.length ? picked.map((f) => f.ticker).join(', ') : 'your selected funds';
      const text =
        tier === 'beginner'
          ? "All set! Your money is now invested in a safe, diversified mix. You can check on it any time."
          : `Investment confirmed across ${names}. Your portfolio is now active.`;
      streamAguiRun(res, { threadId, text, a2ui: buildConfirmation(text), directive: { name: 'invest_complete' } });
      return;
    }

    case 'view_report': {
      streamAguiRun(res, {
        threadId,
        text: 'Opening your portfolio dashboard.',
        a2ui: null,
        directive: { name: 'view_report' },
      });
      return;
    }

    case 'monte_carlo': {
      const sim = runMonteCarloSimulation(profile.fundsDeposited || 10000, 7.5, 12.0, 10, 500);
      const last = sim[sim.length - 1];
      const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
      const text = `Monte Carlo (10y, 500 runs): median ${fmt(last.median)}, 10th–90th percentile ${fmt(last.p10)}–${fmt(last.p90)}.`;
      const a2ui = buildSurfaceFor('advanced-screener', tier, text, FUNDS, { hasLiveData: hasLinkup() });
      streamAguiRun(res, { threadId, text, a2ui });
      return;
    }

    case 'explain':
    default: {
      const result = await runInvestmentAgent(
        profile.userId,
        tier,
        profile.fundsDeposited,
        'Tell me more about this recommendation and why it fits me.',
        [],
        profile.preferences,
      );
      const a2ui = buildSurfaceFor(result.componentType, tier, result.response, result.recommendedFunds, {
        hasLiveData: hasLinkup(),
      });
      streamAguiRun(res, { threadId, text: result.response, a2ui });
      return;
    }
  }
}
