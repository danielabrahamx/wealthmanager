/**
 * WealthManagerApp - Main application component
 */
import React, { useState, useCallback } from 'react';
import { CopilotChat } from '@copilotkit/react-ui';
import { useCopilotReadable } from '@copilotkit/react-core';
import { OnboardingFlow } from './OnboardingFlow';
import { PortfolioReport } from './PortfolioReport';
import { 
  SimpleChoice, FundGrid, AdvancedScreener, InvestmentConfirmation, LevelUpNotification 
} from './GenerativeUI';
import type { UserTier, UserProfile } from '../../../shared/index.js';

type AppStage = 'onboarding' | 'chat' | 'reporting';

interface RenderedUI {
  type: 'simple-choice' | 'fund-grid' | 'advanced-screener' | 'confirmation' | null;
  props: Record<string, unknown>;
}

export function WealthManagerApp() {
  const [stage, setStage] = useState<AppStage>('onboarding');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [agentMessages, setAgentMessages] = useState<Array<{role: string; content: string}>>([]);
  const [renderedUI, setRenderedUI] = useState<RenderedUI>({ type: null, props: {} });
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState<UserTier>('beginner');
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useCopilotReadable({
    description: 'Current user context including tier and preferences',
    value: profile ? {
      userId: profile.userId, tier: profile.tier,
      fundsDeposited: profile.fundsDeposited,
      preferences: profile.preferences,
    } : { tier: 'beginner', fundsDeposited: 0 },
  });

  const handleOnboardingComplete = useCallback((userProfile: UserProfile) => {
    setUserId(userProfile.userId);
    setProfile(userProfile);
    setEffectiveTier(userProfile.tier);
    setStage('chat');
    setAgentMessages([{
      role: 'agent',
      content: userProfile.tier === 'beginner'
        ? "Hi! I'm your investment assistant. I'll keep things simple for you. Just tell me: would you prefer a conservative, risky, or balanced approach?"
        : userProfile.tier === 'intermediate'
        ? "Welcome! I can help you select from curated funds with performance data and projections. What are your investment goals?"
        : "Welcome, sophisticated investor. I have access to real-time market data, advanced analytics, and Monte Carlo simulations. What would you like to explore?",
    }]);
  }, []);

  // Level-up detection - monitor for complex questions
  const detectLevelUp = (message: string): boolean => {
    const complexTerms = [
      'monte carlo', 'simulation', 'sharpe ratio', 'alpha', 'beta',
      'standard deviation', 'correlation', 'hedge', 'options', 'derivatives',
      'interest rate', 'tax optimization', 'scenario analysis', 'volatility',
      'drawdown', 'risk-adjusted', 'portfolio optimization'
    ];
    const lower = message.toLowerCase();
    const complexCount = complexTerms.filter(t => lower.includes(t)).length;
    return complexCount >= 2;
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !userId || isLoading) return;
    const message = chatInput.trim();
    setChatInput('');
    setIsLoading(true);

    // Check for level-up
    if (profile && effectiveTier !== 'sophisticated' && detectLevelUp(message)) {
      setShowLevelUp(true);
      if (effectiveTier === 'beginner') setEffectiveTier('intermediate');
      else if (effectiveTier === 'intermediate') setEffectiveTier('sophisticated');
      setTimeout(() => setShowLevelUp(false), 5000);
    }

    const newMessages = [...agentMessages, { role: 'user', content: message }];
    setAgentMessages(newMessages);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message,
          tier: effectiveTier,
          fundsDeposited: profile?.fundsDeposited || 0,
          conversationHistory: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      
      setAgentMessages(prev => [...prev, { 
        role: 'agent', content: data.message || data.content || 'Processing...' 
      }]);

      // Render tier-appropriate UI based on response
      if (data.component) {
        setRenderedUI({ type: data.component.type, props: data.component.props || {} });
      } else if (data.funds && data.funds.length > 0) {
        if (effectiveTier === 'beginner') {
          setRenderedUI({ type: 'simple-choice', props: { funds: data.funds, recommendation: data.recommendation } });
        } else if (effectiveTier === 'sophisticated') {
          setRenderedUI({ type: 'advanced-screener', props: { funds: data.funds } });
        } else {
          setRenderedUI({ type: 'fund-grid', props: { funds: data.funds } });
        }
      }

      if (data.investmentComplete) {
        setRenderedUI({ type: null, props: {} });
      }
    } catch (err) {
      setAgentMessages(prev => [...prev, { 
        role: 'agent', content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvestment = async () => {
    if (!userId) return;
    try {
      await fetch('/api/agent/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setRenderedUI({ type: null, props: {} });
      setAgentMessages(prev => [...prev, { 
        role: 'agent', content: '✅ Investment confirmed! Go to your Portfolio to see your personalized report.' 
      }]);
    } catch {
      setAgentMessages(prev => [...prev, { 
        role: 'agent', content: 'Investment could not be completed. Please try again.' 
      }]);
    }
  };

  const handleViewReport = () => setStage('reporting');
  const handleBackToChat = () => setStage('chat');

  if (stage === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          padding: '12px 20px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white',
        }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Adaptive Wealth Manager</h1>
            {profile && (
              <span style={{
                fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px',
                background: effectiveTier === 'beginner' ? '#dbeafe' : effectiveTier === 'intermediate' ? '#dcfce7' : '#fef3c7',
                color: effectiveTier === 'beginner' ? '#1e40af' : effectiveTier === 'intermediate' ? '#166534' : '#92400e',
                marginLeft: '8px',
              }}>
                {effectiveTier.toUpperCase()} TIER
                {effectiveTier !== profile.tier && ' ⬆'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {stage === 'chat' && <button onClick={handleViewReport} className="btn btn-secondary">View Portfolio</button>}
            {stage === 'reporting' && <button onClick={handleBackToChat} className="btn btn-secondary">Back to Chat</button>}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {stage === 'chat' && (
            <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
              {/* Level-up notification */}
              {showLevelUp && <LevelUpNotification newTier={effectiveTier} />}

              {/* Funds display */}
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: '0.875rem', color: '#166534' }}>
                  💰 ${profile?.fundsDeposited?.toLocaleString() || '0'} deposited — ready to invest!
                </p>
              </div>

              {/* Chat messages */}
              <div style={{ marginBottom: '24px' }}>
                {agentMessages.map((msg, i) => (
                  <div key={i} style={{
                    padding: '12px 16px', marginBottom: '8px', borderRadius: '8px',
                    background: msg.role === 'agent' ? '#f8fafc' : '#eff6ff',
                    border: msg.role === 'agent' ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
                      {msg.role === 'agent' ? '🤖 Assistant' : '👤 You'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ padding: '12px 16px', color: '#6b7280', fontSize: '0.85rem' }}>
                    Thinking...
                  </div>
                )}
              </div>

              {/* Generative UI components */}
              {renderedUI.type === 'simple-choice' && (
                <SimpleChoice
                  funds={renderedUI.props.funds as any[]}
                  recommendation={renderedUI.props.recommendation as string}
                  onAccept={handleAcceptInvestment}
                />
              )}
              {renderedUI.type === 'fund-grid' && (
                <FundGrid funds={renderedUI.props.funds as any[]} onSelect={(funds) => {
                  handleAcceptInvestment();
                }} />
              )}
              {renderedUI.type === 'advanced-screener' && (
                <AdvancedScreener funds={renderedUI.props.funds as any[]} onSelect={(funds) => {
                  handleAcceptInvestment();
                }} />
              )}

              {/* Chat input */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me about investing..."
                  disabled={isLoading}
                  style={{
                    flex: 1, padding: '12px 16px', border: '1px solid #e5e7eb',
                    borderRadius: '8px', fontSize: '0.9rem', outline: 'none',
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !chatInput.trim()}
                  style={{
                    padding: '12px 24px', background: '#2563eb', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                    opacity: isLoading || !chatInput.trim() ? 0.5 : 1,
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {stage === 'reporting' && profile && (
            <PortfolioReport userId={profile.userId} tier={effectiveTier} />
          )}
        </div>
      </div>

      {/* CopilotKit Chat Sidebar */}
      <div style={{ width: '420px', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: 'white' }}>
        <CopilotChat
          labels={{
            title: 'Investment Assistant',
            initial: profile
              ? `I analyze your questions and adapt the interface to your level. Try asking something complex!`
              : 'Complete onboarding to start.',
            placeholder: 'Type your investment question...',
          }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
