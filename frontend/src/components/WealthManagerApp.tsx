/**
 * WealthManagerApp — main application component.
 *
 * Wires the chat surface to the real AG-UI + A2UI pipeline:
 *   - Chat turns / button actions POST to `/api/agui` (see lib/agui.ts).
 *   - TEXT_MESSAGE_CONTENT deltas stream into the assistant chat bubble.
 *   - CUSTOM "a2ui" events feed `useA2UI().processMessages`, rendered by
 *     <A2UIRenderer> (the CopilotKit a2ui-renderer).
 *   - CUSTOM directives (`view_report`) drive stage transitions.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  A2UIProvider,
  A2UIRenderer,
  useA2UI,
  basicCatalog,
  defaultTheme,
  type A2UIClientEventMessage,
} from '@copilotkit/a2ui-renderer';
import { OnboardingFlow } from './OnboardingFlow';
import { PortfolioReport } from './PortfolioReport';
import { streamAgui } from '../lib/agui';
import { color, radius, shadow, font, tierAccent } from '../lib/theme';
import type { UserTier, UserProfile } from '../../../shared/index.js';

type AppStage = 'onboarding' | 'chat' | 'reporting';

const A2UI_SURFACE_ID = 'wealth-surface';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

const greetingFor = (tier: UserTier): string =>
  tier === 'beginner'
    ? "Hi! I'm your investment assistant. I'll keep things simple for you. Just tell me: would you prefer a conservative, risky, or balanced approach?"
    : tier === 'intermediate'
    ? 'Welcome! I can help you select from curated funds with performance data and projections. What are your investment goals?'
    : 'Welcome, sophisticated investor. I have access to real-time market data, advanced analytics, and Monte Carlo simulations. What would you like to explore?';

export function WealthManagerApp() {
  const [stage, setStage] = useState<AppStage>('onboarding');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [effectiveTier, setEffectiveTier] = useState<UserTier>('beginner');

  // Bridge: A2UIProvider owns `onAction`, but the handler (which feeds
  // processMessages from useA2UI) lives inside ChatStage. The ref lets the
  // provider call the latest handler without lifting useA2UI out of the tree.
  const actionRef = useRef<((msg: A2UIClientEventMessage) => void) | null>(null);
  const handleProviderAction = useCallback((msg: A2UIClientEventMessage) => {
    actionRef.current?.(msg);
  }, []);

  const handleOnboardingComplete = useCallback((userProfile: UserProfile) => {
    setUserId(userProfile.userId);
    setProfile(userProfile);
    setEffectiveTier(userProfile.tier);
    setStage('chat');
  }, []);

  if (stage === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: font.sans, background: color.page }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          padding: '14px 24px', borderBottom: `1px solid ${color.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 300, letterSpacing: '-0.02em', color: color.heading }}>Adaptive Wealth Manager</h1>
            {profile && (
              <span style={{
                fontSize: '0.7rem', padding: '4px 10px', borderRadius: radius.md, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.5px',
                background: tierAccent[effectiveTier].bg,
                color: tierAccent[effectiveTier].fg,
              }}>
                {effectiveTier} tier
                {effectiveTier !== profile.tier && ' ⬆'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {stage === 'chat' && <button onClick={() => setStage('reporting')} className="btn btn-secondary">View Portfolio</button>}
            {stage === 'reporting' && <button onClick={() => setStage('chat')} className="btn btn-secondary">Back to Chat</button>}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {stage === 'chat' && userId && (
            <A2UIProvider theme={defaultTheme} catalog={basicCatalog} onAction={handleProviderAction}>
              <ChatStage
                userId={userId}
                profile={profile}
                tier={effectiveTier}
                onTierChange={setEffectiveTier}
                onViewReport={() => setStage('reporting')}
                actionRef={actionRef}
              />
            </A2UIProvider>
          )}

          {stage === 'reporting' && profile && (
            <PortfolioReport userId={profile.userId} tier={effectiveTier} />
          )}
        </div>
      </div>
    </div>
  );
}

interface ChatStageProps {
  userId: string;
  profile: UserProfile | null;
  tier: UserTier;
  onTierChange: (tier: UserTier) => void;
  onViewReport: () => void;
  actionRef: React.MutableRefObject<((msg: A2UIClientEventMessage) => void) | null>;
}

// Complex terms that signal the user is ready for a richer (higher) tier.
const COMPLEX_TERMS = [
  'monte carlo', 'simulation', 'sharpe ratio', 'alpha', 'beta',
  'standard deviation', 'correlation', 'hedge', 'options', 'derivatives',
  'interest rate', 'tax optimization', 'scenario analysis', 'volatility',
  'drawdown', 'risk-adjusted', 'portfolio optimization',
];

function detectLevelUp(message: string): boolean {
  const lower = message.toLowerCase();
  return COMPLEX_TERMS.filter((t) => lower.includes(t)).length >= 2;
}

function ChatStage({ userId, profile, tier, onTierChange, onViewReport, actionRef }: ChatStageProps) {
  const { processMessages } = useA2UI();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'greeting', role: 'agent', content: greetingFor(tier) },
  ]);
  const [hasSurface, setHasSurface] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  // Run one AG-UI turn (chat message or A2UI action) and stream the result.
  const runTurn = useCallback(
    async (body: { message?: string; action?: { name: string; context?: Record<string, unknown> } }) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setIsLoading(true);

      const streamId = `agent-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        ...(body.message ? [{ id: `user-${Date.now()}`, role: 'user' as const, content: body.message }] : []),
        { id: streamId, role: 'agent', content: '' },
      ]);

      let acc = '';
      try {
        await streamAgui(
          {
            userId,
            message: body.message,
            action: body.action,
            tier,
            fundsDeposited: profile?.fundsDeposited || 0,
            conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
          },
          {
            onText: (delta) => {
              acc += delta;
              setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: acc } : m)));
            },
            onA2ui: (a2uiMessages) => {
              processMessages(a2uiMessages);
              setHasSurface(true);
            },
            onDirective: (name) => {
              if (name === 'view_report') onViewReport();
            },
          },
        );
        if (!acc) {
          setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: '…' } : m)));
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === streamId ? { ...m, content: 'Sorry, I encountered an error. Please try again.' } : m)),
        );
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [userId, tier, profile, messages, processMessages, onViewReport],
  );

  // A2UI button clicks arrive here via the provider bridge. The renderer wraps
  // the button's event in `userAction` ({ name, context, surfaceId, ... }).
  const handleAction = useCallback(
    (msg: A2UIClientEventMessage) => {
      const action = msg.userAction;
      if (!action?.name) return;
      runTurn({ action: { name: action.name, context: action.context } });
    },
    [runTurn],
  );
  useEffect(() => {
    actionRef.current = handleAction;
  }, [actionRef, handleAction]);

  const handleSend = useCallback(() => {
    const message = input.trim();
    if (!message || isLoading) return;
    setInput('');

    // Adaptive tier: complex questions unlock a richer surface on the next turn.
    if (tier !== 'sophisticated' && detectLevelUp(message)) {
      onTierChange(tier === 'beginner' ? 'intermediate' : 'sophisticated');
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 5000);
    }

    runTurn({ message });
  }, [input, isLoading, tier, onTierChange, runTurn]);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {showLevelUp && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: radius.lg,
          background: color.purpleTint, border: `1px solid ${color.borderSoftPurple}`, color: color.purpleDeep, fontSize: '0.85rem',
        }}>
          ⬆ Interface upgraded to <strong>{tier.toUpperCase()}</strong> tier — you're asking advanced questions!
        </div>
      )}

      <div style={{ marginBottom: '16px', padding: '14px 16px', background: color.successBg, borderRadius: radius.lg, border: `1px solid ${color.successBorder}` }}>
        <p style={{ fontSize: '0.875rem', color: color.successText, fontWeight: 400 }}>
          ${profile?.fundsDeposited?.toLocaleString() || '0'} deposited — ready to invest.
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            padding: '14px 18px', marginBottom: '10px', borderRadius: radius.lg,
            background: msg.role === 'agent' ? color.white : color.purpleTint,
            border: `1px solid ${msg.role === 'agent' ? color.border : color.borderSoftPurple}`,
            boxShadow: msg.role === 'agent' ? shadow.ambient : 'none',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: msg.role === 'agent' ? color.purple : color.label, marginBottom: '6px' }}>
              {msg.role === 'agent' ? 'Assistant' : 'You'}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 300, color: color.heading, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {msg.content || (isLoading ? '…' : '')}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ padding: '12px 16px', color: color.body, fontSize: '0.85rem' }}>Thinking...</div>
        )}
      </div>

      {/* A2UI generative surface (rendered by the CopilotKit a2ui-renderer). */}
      {hasSurface && (
        <div style={{ marginBottom: '16px' }}>
          <A2UIRenderer surfaceId={A2UI_SURFACE_ID} fallback={null} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me about investing..."
          disabled={isLoading}
          style={{
            flex: 1, padding: '12px 16px', border: `1px solid ${color.border}`,
            borderRadius: radius.md, fontSize: '0.95rem', fontWeight: 300, color: color.heading, outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = color.purple)}
          onBlur={(e) => (e.target.style.borderColor = color.border)}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '12px 24px', background: color.purple, color: 'white',
            border: 'none', borderRadius: radius.md, cursor: 'pointer', fontWeight: 400,
            boxShadow: isLoading || !input.trim() ? 'none' : shadow.elevated,
            opacity: isLoading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
