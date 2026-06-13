/**
 * AG-UI Protocol Endpoint
 * 
 * Implements the AG-UI (Agent-User Interaction) protocol via SSE.
 * CopilotKit frontend connects here to get streaming agent responses.
 */

import { Router, Request, Response } from 'express';
import { runInvestmentAgent, FUNDS } from '../agent/investment-agent.js';
import { getUserProfile } from '../redis/client.js';
import type { UserTier, RenderedComponent, Fund, UserProfile } from '../../../shared/index.js';

export const agentRouter = Router();

// Main AG-UI endpoint - handles agent communication via SSE
agentRouter.post('/chat', async (req: Request, res: Response) => {
  const { userId, message, conversationHistory } = req.body as {
    userId: string;
    message: string;
    conversationHistory?: Array<{ role: 'user' | 'agent'; content: string }>;
  };

  if (!userId || !message) {
    res.status(400).json({ error: 'userId and message are required' });
    return;
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    res.status(404).json({ error: 'User not found. Complete onboarding first.' });
    return;
  }

  // Run the LangGraph agent
  const result = await runInvestmentAgent(
    userId,
    profile.tier,
    profile.fundsDeposited,
    message,
    conversationHistory || [],
    profile.preferences,
  );

  // Return the response with any rendered components
  res.json({
    message: result.response,
    content: result.response,
    component: result.componentType ? { type: result.componentType, props: { funds: result.recommendedFunds, recommendation: result.response } } : null,
    funds: result.recommendedFunds || [],
    stage: result.stage,
    recommendation: result.response,
    preferences: result.preferences,
  });
});

// Free-form Q&A from the report view (IntermediateReport "Ask a Question").
// Returns { answer } so the frontend can render it directly.
agentRouter.post('/ask', async (req: Request, res: Response) => {
  try {
    const { userId, question } = req.body as { userId: string; question: string };

    if (!userId || !question) {
      res.status(400).json({ error: 'userId and question are required' });
      return;
    }

    // Resolve the profile; degrade gracefully if Redis/profile is unavailable
    // (same pattern as POST /api/agui).
    let profile: UserProfile | null = await getUserProfile(userId).catch(() => null);
    if (!profile) {
      profile = {
        userId,
        tier: 'beginner',
        fundsDeposited: 0,
        preferences: null,
        createdAt: new Date().toISOString(),
      };
    }

    const result = await runInvestmentAgent(
      userId,
      profile.tier,
      profile.fundsDeposited,
      question,
      [],
      profile.preferences,
    );

    res.json({ answer: result.response });
  } catch (err) {
    console.error('[agent] Error answering question:', err);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

// SSE streaming endpoint for AG-UI
agentRouter.get('/stream', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  
  if (!userId) {
    res.status(400).json({ error: 'userId query parameter is required' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection event
  const event = {
    type: 'agent-state',
    data: { status: 'connected', userId },
    timestamp: new Date().toISOString(),
  };
  res.write(`data: ${JSON.stringify(event)}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// Get recommended funds for a user (based on their tier and preferences)
agentRouter.get('/recommendations/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate recommendations based on tier
    const recommendations = generateRecommendationsByTier(
      profile.tier,
      profile.preferences,
      profile.fundsDeposited
    );

    res.json({ recommendations });
  } catch (err) {
    console.error('[agent] Error getting recommendations:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Execute investment (confirm and invest)
agentRouter.post('/invest', async (req: Request, res: Response) => {
  try {
    const { userId, fundIds: rawFundIds } = req.body as { userId: string; fundIds?: string[] };
    
    const profile = await getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Guard: the frontend may omit fundIds. Fall back to a sensible default set
    // sized to the user's tier so we never call .map on undefined or divide by 0.
    const fundIds = Array.isArray(rawFundIds) && rawFundIds.length > 0
      ? rawFundIds
      : FUNDS.slice(0, profile.tier === 'beginner' ? 1 : profile.tier === 'intermediate' ? 5 : 8).map(f => f.id);

    // Simulate investment execution
    const holdings = fundIds.map((fundId) => {
      const fund = FUNDS.find(f => f.id === fundId);
      const allocation = 100 / fundIds.length;
      return {
        fundId,
        fundName: fund?.name || 'Unknown Fund',
        ticker: fund?.ticker || 'N/A',
        amount: (profile.fundsDeposited * allocation) / 100,
        allocation,
        currentValue: (profile.fundsDeposited * allocation) / 100,
        change: 0,
        changePercent: 0,
      };
    });

    const portfolio = {
      totalValue: profile.fundsDeposited,
      totalChange: 0,
      totalChangePercent: 0,
      holdings,
      lastUpdated: new Date().toISOString(),
    };

    res.json({ success: true, portfolio });
  } catch (err) {
    console.error('[agent] Error executing investment:', err);
    res.status(500).json({ error: 'Failed to execute investment' });
  }
});

// ── Recommendation Engine ──

function generateRecommendationsByTier(
  tier: UserTier,
  preferences: { riskTolerance?: number; investmentGoal?: string; timeHorizon?: string } | null,
  fundsDeposited: number
): Array<{ fund: Fund; reason: string; score: number }> {
  const riskLevel = preferences?.riskTolerance 
    ? preferences.riskTolerance <= 3 ? 'low' : preferences.riskTolerance <= 7 ? 'medium' : 'high'
    : 'low';

  let filtered = FUNDS.filter(f => {
    if (tier === 'beginner') return f.riskLevel === 'low' || f.riskLevel === 'medium';
    if (tier === 'sophisticated') return true;
    return f.riskLevel === riskLevel || f.riskLevel === 'medium';
  });

  const scored = filtered.map(fund => {
    let score = 0;
    if (fund.riskLevel === riskLevel) score += 30;
    if (preferences?.investmentGoal === 'growth' && fund.projectedReturn > 8) score += 20;
    if (preferences?.investmentGoal === 'income' && fund.category === 'Bond') score += 20;
    if (preferences?.investmentGoal === 'preservation' && fund.riskLevel === 'low') score += 25;
    score += fund.historicalReturn * 2;
    score -= fund.expenseRatio;
    return { fund, reason: `Matches your ${preferences?.investmentGoal || 'balanced'} profile`, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, tier === 'beginner' ? 3 : tier === 'intermediate' ? 10 : 20);
}

// Fund data is sourced from the single canonical `FUNDS` export in
// `agent/investment-agent.ts` (imported above). The previous local
// `MOCK_FUNDS` duplicate was removed to keep one source of truth.
