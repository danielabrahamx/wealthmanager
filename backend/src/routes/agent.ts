/**
 * AG-UI Protocol Endpoint
 * 
 * Implements the AG-UI (Agent-User Interaction) protocol via SSE.
 * CopilotKit frontend connects here to get streaming agent responses.
 */

import { Router, Request, Response } from 'express';
import { runInvestmentAgent } from '../agent/investment-agent.js';
import { getUserProfile } from '../redis/client.js';
import type { UserTier, RenderedComponent } from '../../shared/index.js';

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
    const { userId, fundIds } = req.body as { userId: string; fundIds: string[] };
    
    const profile = await getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Simulate investment execution
    const holdings = fundIds.map((fundId, index) => {
      const fund = MOCK_FUNDS.find(f => f.id === fundId);
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
): Array<{ fund: typeof MOCK_FUNDS[0]; reason: string; score: number }> {
  const riskLevel = preferences?.riskTolerance 
    ? preferences.riskTolerance <= 3 ? 'low' : preferences.riskTolerance <= 7 ? 'medium' : 'high'
    : 'low';

  let filtered = MOCK_FUNDS.filter(f => {
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

// ── Mock Fund Database ──

const MOCK_FUNDS = [
  { id: 'vti', name: 'Vanguard Total Stock Market ETF', ticker: 'VTI', category: 'Equity', riskLevel: 'medium', description: 'Broad US stock market exposure', projectedReturn: 8.5, historicalReturn: 7.8, expenseRatio: 0.03 },
  { id: 'vxus', name: 'Vanguard Total International Stock ETF', ticker: 'VXUS', category: 'Equity', riskLevel: 'high', description: 'International equity diversification', projectedReturn: 9.0, historicalReturn: 6.2, expenseRatio: 0.08 },
  { id: 'bnd', name: 'Vanguard Total Bond Market ETF', ticker: 'BND', category: 'Bond', riskLevel: 'low', description: 'Broad US bond market', projectedReturn: 4.0, historicalReturn: 3.5, expenseRatio: 0.03 },
  { id: 'vnq', name: 'Vanguard Real Estate ETF', ticker: 'VNQ', category: 'Real Estate', riskLevel: 'medium', description: 'REIT exposure for income and growth', projectedReturn: 7.0, historicalReturn: 6.5, expenseRatio: 0.12 },
  { id: 'gld', name: 'SPDR Gold Shares', ticker: 'GLD', category: 'Commodity', riskLevel: 'medium', description: 'Gold exposure as inflation hedge', projectedReturn: 5.0, historicalReturn: 4.8, expenseRatio: 0.40 },
  { id: 'qqq', name: 'Invesco QQQ Trust', ticker: 'QQQ', category: 'Equity', riskLevel: 'high', description: 'Nasdaq-100 tech-heavy growth', projectedReturn: 12.0, historicalReturn: 14.2, expenseRatio: 0.20 },
  { id: 'agg', name: 'iShares Core US Aggregate Bond', ticker: 'AGG', category: 'Bond', riskLevel: 'low', description: 'Total US bond market', projectedReturn: 3.5, historicalReturn: 3.0, expenseRatio: 0.03 },
  { id: 'schd', name: 'Schwab US Dividend Equity ETF', ticker: 'SCHD', category: 'Equity', riskLevel: 'medium', description: 'Dividend growth stocks', projectedReturn: 8.0, historicalReturn: 7.5, expenseRatio: 0.06 },
  { id: 'arkk', name: 'ARK Innovation ETF', ticker: 'ARKK', category: 'Equity', riskLevel: 'high', description: 'Disruptive innovation companies', projectedReturn: 15.0, historicalReturn: 10.0, expenseRatio: 0.75 },
  { id: 'tlt', name: 'iShares 20+ Year Treasury Bond ETF', ticker: 'TLT', category: 'Bond', riskLevel: 'low', description: 'Long-term US Treasury bonds', projectedReturn: 3.0, historicalReturn: 2.5, expenseRatio: 0.15 },
  { id: 'xlf', name: 'Financial Select Sector SPDR', ticker: 'XLF', category: 'Equity', riskLevel: 'medium', description: 'US financial sector', projectedReturn: 7.5, historicalReturn: 8.0, expenseRatio: 0.09 },
  { id: 'xle', name: 'Energy Select Sector SPDR', ticker: 'XLE', category: 'Equity', riskLevel: 'high', description: 'US energy sector', projectedReturn: 9.5, historicalReturn: 11.0, expenseRatio: 0.09 },
  { id: 'vwo', name: 'Vanguard FTSE Emerging Markets', ticker: 'VWO', category: 'Equity', riskLevel: 'high', description: 'Emerging market equities', projectedReturn: 10.0, historicalReturn: 5.0, expenseRatio: 0.08 },
  { id: 'shy', name: 'iShares 1-3 Year Treasury Bond', ticker: 'SHY', category: 'Bond', riskLevel: 'low', description: 'Short-term Treasury bonds', projectedReturn: 2.5, historicalReturn: 2.0, expenseRatio: 0.15 },
  { id: 'vug', name: 'Vanguard Growth ETF', ticker: 'VUG', category: 'Equity', riskLevel: 'high', description: 'Large-cap growth stocks', projectedReturn: 11.0, historicalReturn: 12.5, expenseRatio: 0.04 },
  { id: 'vym', name: 'Vanguard High Dividend Yield ETF', ticker: 'VYM', category: 'Equity', riskLevel: 'medium', description: 'High dividend stocks', projectedReturn: 7.0, historicalReturn: 6.8, expenseRatio: 0.06 },
  { id: 'iwm', name: 'iShares Russell 2000 ETF', ticker: 'IWM', category: 'Equity', riskLevel: 'high', description: 'US small-cap stocks', projectedReturn: 9.0, historicalReturn: 7.8, expenseRatio: 0.19 },
  { id: 'tip', name: 'iShares TIPS Bond ETF', ticker: 'TIP', category: 'Bond', riskLevel: 'low', description: 'Treasury inflation-protected securities', projectedReturn: 3.8, historicalReturn: 3.2, expenseRatio: 0.19 },
  { id: 'xlk', name: 'Technology Select Sector SPDR', ticker: 'XLK', category: 'Equity', riskLevel: 'high', description: 'US technology sector', projectedReturn: 13.0, historicalReturn: 15.0, expenseRatio: 0.09 },
  { id: 'vht', name: 'Vanguard Health Care ETF', ticker: 'VHT', category: 'Equity', riskLevel: 'medium', description: 'US healthcare sector', projectedReturn: 8.0, historicalReturn: 9.2, expenseRatio: 0.10 },
  { id: 'bndx', name: 'Vanguard Total International Bond', ticker: 'BNDX', category: 'Bond', riskLevel: 'low', description: 'International bond diversification', projectedReturn: 3.2, historicalReturn: 2.8, expenseRatio: 0.07 },
  { id: 'vgt', name: 'Vanguard Information Technology', ticker: 'VGT', category: 'Equity', riskLevel: 'high', description: 'US tech sector fund', projectedReturn: 13.5, historicalReturn: 16.0, expenseRatio: 0.10 },
] as const;

export type MockFund = typeof MOCK_FUNDS[0];
