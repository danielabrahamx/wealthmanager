/**
 * OnboardingFlow - 2-step onboarding
 */
import React, { useState } from 'react';
import type { UserTier, UserProfile } from '../../../shared/index.js';
import { color, radius, shadow, font } from '../lib/theme';

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void;
}

const TIERS: { value: UserTier; label: string; desc: string; icon: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'New to investing - I want simple guidance', icon: '🌱' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience - show me the options', icon: '📈' },
  { value: 'sophisticated', label: 'Sophisticated', desc: 'Experienced investor - give me the full toolkit', icon: '🏦' },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState<UserTier | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTierSelect = async (selectedTier: UserTier) => {
    setTier(selectedTier);
    setStep(2);
  };

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Save tier
      const tierRes = await fetch('/api/onboarding/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const { userId, profile } = await tierRes.json();

      // Step 2: Deposit funds
      const depositRes = await fetch('/api/onboarding/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: depositAmount }),
      });
      const { profile: updatedProfile } = await depositRes.json();

      onComplete(updatedProfile);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: font.sans,
      background: `radial-gradient(120% 120% at 50% 0%, ${color.brandDark} 0%, #0d1133 55%, #06081f 100%)`,
    }}>
      <div style={{
        background: color.white,
        borderRadius: radius.lg,
        padding: '40px',
        maxWidth: '560px',
        width: '90%',
        boxShadow: shadow.deep,
      }}>
        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              background: s <= step ? color.purple : color.border,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.04em', marginBottom: '8px', color: color.heading }}>
              What best describes you?
            </h2>
            <p style={{ color: color.body, marginBottom: '24px', fontWeight: 300 }}>
              Your experience level helps us tailor the right interface for you.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {TIERS.map(({ value, label, desc, icon }) => (
                <button
                  key={value}
                  onClick={() => handleTierSelect(value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    border: `1px solid ${color.border}`,
                    borderRadius: radius.lg,
                    background: color.white,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = color.purple;
                    e.currentTarget.style.background = color.purpleTint;
                    e.currentTarget.style.boxShadow = shadow.elevated;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = color.border;
                    e.currentTarget.style.background = color.white;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 500, color: color.heading, fontSize: '1.05rem' }}>
                      {label}
                    </div>
                    <div style={{ color: color.body, fontSize: '0.875rem', marginTop: '2px', fontWeight: 300 }}>
                      {desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: color.purple,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: 0,
                }}
              >
                ← Back to tier selection
              </button>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.04em', marginBottom: '8px', color: color.heading }}>
              I would like to invest my money.
            </h2>
            <p style={{ color: color.body, marginBottom: '24px', fontWeight: 300 }}>
              How much would you like to deposit? (Simulated funds for this demo)
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: color.label }}>
                Investment Amount
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: color.body,
                  fontWeight: 500,
                }}>$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  placeholder="10,000"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 36px',
                    border: `1px solid ${error ? color.danger : color.border}`,
                    borderRadius: radius.md,
                    fontSize: '1.25rem',
                    fontFeatureSettings: font.tnum,
                    color: color.heading,
                    outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = color.purple}
                  onBlur={(e) => e.target.style.borderColor = error ? color.danger : color.border}
                />
              </div>
              {error && (
                <p style={{ color: color.danger, fontSize: '0.875rem', marginTop: '6px' }}>{error}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {[1000, 10000, 50000, 100000].map(amt => (
                <button
                  key={amt}
                  onClick={() => { setAmount(amt.toString()); setError(''); }}
                  style={{
                    padding: '8px 14px',
                    border: `1px solid ${amount === amt.toString() ? color.purple : color.border}`,
                    borderRadius: radius.md,
                    background: amount === amt.toString() ? color.purple : color.white,
                    color: amount === amt.toString() ? color.white : color.label,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    fontFeatureSettings: font.tnum,
                  }}
                >
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>
            <button
              className="btn-press"
              onClick={handleDeposit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? color.purpleSoft : color.purple,
                color: 'white',
                border: 'none',
                borderRadius: radius.md,
                fontSize: '1.05rem',
                fontWeight: 400,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '16px',
                boxShadow: loading ? 'none' : shadow.elevated,
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Setting up...' : `Deposit $${amount ? parseInt(amount).toLocaleString() : '0'} & Start Investing`}
            </button>
            <p style={{ color: color.body, fontSize: '0.75rem', textAlign: 'center', marginTop: '12px' }}>
              This is simulated money for demonstration purposes.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
