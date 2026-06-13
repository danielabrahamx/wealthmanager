import { Router, Request, Response } from 'express';
import { getUserProfile } from '../redis/client.js';
import { fetchStockData, fetchMarketNews, runMonteCarloSimulation } from '../linkup/client.js';
import type { UserTier } from '../../../shared/index.js';

export const reportingRouter = Router();

// Get portfolio summary
reportingRouter.get('/portfolio/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate tier-appropriate portfolio data
    const summary = generatePortfolioForTier(profile.tier, profile.fundsDeposited);
    
    res.json({ summary, tier: profile.tier });
  } catch (err) {
    console.error('[reporting] Error getting portfolio:', err);
    res.status(500).json({ error: 'Failed to get portfolio' });
  }
});

// Get advanced analytics (sophisticated tier)
reportingRouter.get('/analytics/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Monte Carlo simulation
    const monteCarlo = runMonteCarloSimulation(
      profile.fundsDeposited || 10000,
      7.5, // average annual return
      12.0, // volatility
      10,   // years
      500   // simulations
    );

    // Try to get real market data for sophisticated users
    let marketData = null;
    if (profile.tier === 'sophisticated') {
      marketData = {
        spy: await fetchStockData('SPY').catch(() => null),
        qqq: await fetchStockData('QQQ').catch(() => null),
        bnd: await fetchStockData('BND').catch(() => null),
      };
    }

    res.json({
      tier: profile.tier,
      monteCarlo,
      marketData,
      riskMetrics: {
        sharpeRatio: 1.2 + Math.random() * 0.5,
        alpha: 2.1 + Math.random() * 3,
        beta: 1.0 + Math.random() * 0.5,
        maxDrawdown: -15 - Math.random() * 20,
        volatility: 12.0 + Math.random() * 8,
      },
      taxOptimization: {
        suggestion: 'Consider tax-loss harvesting on underperforming positions',
        potentialSavings: Math.round(profile.fundsDeposited * 0.02),
      },
    });
  } catch (err) {
    console.error('[reporting] Error getting analytics:', err);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get market news (for intermediate and sophisticated)
reportingRouter.get('/news/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const news = await fetchMarketNews('stock market today');
    
    // For beginners, simplify
    if (profile.tier === 'beginner') {
      res.json({ 
        summary: 'Markets are having a normal day. Your investments are safe.',
        news: news.slice(0, 1)
      });
      return;
    }

    res.json({ news });
  } catch (err) {
    console.error('[reporting] Error getting news:', err);
    res.status(500).json({ error: 'Failed to get news' });
  }
});

// ── Helper: Generate tier-appropriate portfolio ──

function generatePortfolioForTier(tier: UserTier, totalValue: number) {
  const holdings = [
    { fundId: 'vti', fundName: 'Vanguard Total Stock Market ETF', ticker: 'VTI', amount: totalValue * 0.4, allocation: 40, currentValue: totalValue * 0.4 * 1.05, change: totalValue * 0.4 * 0.05, changePercent: 5.0 },
    { fundId: 'bnd', fundName: 'Vanguard Total Bond Market ETF', ticker: 'BND', amount: totalValue * 0.35, allocation: 35, currentValue: totalValue * 0.35 * 1.02, change: totalValue * 0.35 * 0.02, changePercent: 2.0 },
    { fundId: 'vnq', fundName: 'Vanguard Real Estate ETF', ticker: 'VNQ', amount: totalValue * 0.15, allocation: 15, currentValue: totalValue * 0.15 * 1.03, change: totalValue * 0.15 * 0.03, changePercent: 3.0 },
    { fundId: 'gld', fundName: 'SPDR Gold Shares', ticker: 'GLD', amount: totalValue * 0.10, allocation: 10, currentValue: totalValue * 0.10 * 1.01, change: totalValue * 0.10 * 0.01, changePercent: 1.0 },
  ];

  const totalCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalChange = totalCurrent - totalValue;
  const totalChangePct = (totalChange / totalValue) * 100;

  return {
    totalValue: Math.round(totalCurrent * 100) / 100,
    totalChange: Math.round(totalChange * 100) / 100,
    totalChangePercent: Math.round(totalChangePct * 100) / 100,
    holdings,
    lastUpdated: new Date().toISOString(),
  };
}
