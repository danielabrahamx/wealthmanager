/**
 * OnboardingFlow - 2-step onboarding
 */
import React, { useState } from 'react';
import type { UserTier, UserProfile } from '../../../shared/index.js';

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void;
}

const TIERS: { value: UserTier; label: string; desc: string; icon: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'New to investing — I want simple guidance', icon: '🌱' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience — show me the options', icon: '📈' },
  { value: 'sophisticated', label: 'Sophisticated', desc: 'Experienced investor — give me the full toolkit', icon: '🏦' },
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
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '560px',
        width: '90%',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      }}>
        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: s <= step ? '#2563eb' : '#e5e7eb',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>
              What best describes you?
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
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
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.background = '#f8faff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                      {label}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '2px' }}>
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
                  color: '#2563eb',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: 0,
                }}
              >
                ← Back to tier selection
              </button>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>
              I would like to invest my money.
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              How much would you like to deposit? (Simulated funds for this demo)
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                Investment Amount
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                  fontWeight: 600,
                }}>$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  placeholder="10,000"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 36px',
                    border: `2px solid ${error ? '#ef4444' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    fontSize: '1.25rem',
                    outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = error ? '#ef4444' : '#e5e7eb'}
                />
              </div>
              {error && (
                <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '6px' }}>{error}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {[1000, 10000, 50000, 100000].map(amt => (
                <button
                  key={amt}
                  onClick={() => { setAmount(amt.toString()); setError(''); }}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: amount === amt.toString() ? '#2563eb' : 'white',
                    color: amount === amt.toString() ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  
                </button>
              ))}
            </div>
            <button
              onClick={handleDeposit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? '#93c5fd' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '16px',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Setting up...' : `Deposit $${amount ? parseInt(amount).toLocaleString() : '0'} & Start Investing`}
            </button>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', textAlign: 'center', marginTop: '12px' }}>
              This is simulated money for demonstration purposes.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
