// Shared types for the Wealth Manager platform

export type UserTier = 'beginner' | 'intermediate' | 'sophisticated';

export interface UserProfile {
  userId: string;
  tier: UserTier;
  fundsDeposited: number;
  preferences: InvestmentPreferences | null;
  createdAt: string;
}

export interface InvestmentPreferences {
  riskTolerance: number; // 1-10
  investmentGoal: 'retirement' | 'growth' | 'income' | 'preservation';
  timeHorizon: 'short' | 'medium' | 'long';
}

export interface Fund {
  id: string;
  name: string;
  ticker: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  projectedReturn: number;
  historicalReturn: number;
  expenseRatio: number;
}

export interface PortfolioHolding {
  fundId: string;
  fundName: string;
  ticker: string;
  amount: number;
  allocation: number; // percentage
  currentValue: number;
  change: number;
  changePercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  holdings: PortfolioHolding[];
  lastUpdated: string;
}

export interface AgentMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  components?: RenderedComponent[];
}

export interface RenderedComponent {
  type: 'simple-choice' | 'fund-grid' | 'advanced-screener' | 'report-beginner' | 'report-intermediate' | 'report-sophisticated' | 'confirmation';
  props: Record<string, unknown>;
}

export interface RedisConfig {
  url: string;
}

export interface ConversationState {
  userId: string;
  tier: UserTier;
  stage: 'onboarding' | 'preference-discovery' | 'fund-selection' | 'confirmation' | 'reporting';
  messages: AgentMessage[];
  selectedFunds: string[];
  preferences: InvestmentPreferences | null;
}

// AG-UI event types
export type AGUIEventType = 
  | 'text-message'
  | 'tool-call'
  | 'state-snapshot'
  | 'state-delta'
  | 'agent-action'
  | 'agent-state';

export interface AGUIEvent {
  type: AGUIEventType;
  data: unknown;
  timestamp: string;
}
