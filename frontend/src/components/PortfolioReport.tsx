/**
 * PortfolioReport - Tier-appropriate reporting dashboard
 * 
 * Renders different views based on user tier:
 * - Beginner: Big numbers, plain English, simple indicators
 * - Intermediate: Charts, allocation, Q&A
 * - Sophisticated: Full analytics, scenario tools, data export
 */

import React, { useEffect, useState } from 'react';
import type { UserTier, PortfolioSummary } from '../../../shared/index.js';
import { BeginnerReport } from './BeginnerReport';
import { IntermediateReport } from './IntermediateReport';
import { SophisticatedReport } from './SophisticatedReport';

interface PortfolioReportProps {
  userId: string;
  tier: UserTier;
}

export function PortfolioReport({ userId, tier }: PortfolioReportProps) {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const res = await fetch(`/api/reporting/portfolio/${userId}`);
        const data = await res.json();
        setSummary(data.summary);
      } catch {
        setError('Failed to load portfolio data');
      } finally {
        setLoading(false);
      }
    }
    fetchPortfolio();
  }, [userId]);

  if (loading) {
    return <div className="loading-state">Loading your portfolio...</div>;
  }

  if (error || !summary) {
    return <div className="error-state">{error || 'No portfolio data available'}</div>;
  }

  const reportProps = { summary, userId };

  switch (tier) {
    case 'beginner':
      return <BeginnerReport {...reportProps} />;
    case 'intermediate':
      return <IntermediateReport {...reportProps} />;
    case 'sophisticated':
      return <SophisticatedReport {...reportProps} />;
    default:
      return <BeginnerReport {...reportProps} />;
  }
}
