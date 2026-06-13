import React from 'react';
import type { PortfolioSummary } from '../../../shared/index.js';
import { color, radius, shadow, font } from '../lib/theme';

interface Props {
  summary: PortfolioSummary;
  userId: string;
}

export function BeginnerReport({ summary }: Props) {
  const isPositive = summary.totalChange >= 0;
  const accent = isPositive ? color.successText : color.danger;
  const accentBg = isPositive ? color.successBg : color.dangerBg;

  return (
    <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px', fontFamily: font.sans }}>
      {/* Big number - total value */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p style={{ fontSize: '0.72rem', color: color.body, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 500 }}>
          Your total investment
        </p>
        <h1 style={{ fontSize: '3.25rem', fontWeight: 300, letterSpacing: '-0.04em', color: color.heading, fontFeatureSettings: font.tnum }}>
          ${summary.totalValue.toLocaleString()}
        </h1>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '12px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: accentBg,
          color: accent,
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, display: 'inline-block' }} />
          <span style={{ fontSize: '1rem', fontWeight: 500, fontFeatureSettings: font.tnum }}>
            {isPositive ? '+' : ''}{summary.totalChangePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Plain English summary */}
      <div style={{
        padding: '24px',
        background: color.white,
        borderRadius: radius.lg,
        border: `1px solid ${color.border}`,
        boxShadow: shadow.ambient,
        marginBottom: '16px',
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '10px', color: color.heading }}>
          How your money is doing
        </h3>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: color.label, fontWeight: 300 }}>
          {isPositive ? (
            <>
              Great news. Your investment grew by <strong style={{ fontWeight: 500, color: color.heading }}>${summary.totalChange.toLocaleString()}</strong>,
              about <strong style={{ fontWeight: 500, color: color.heading }}>${(summary.totalChange / 7).toFixed(0)}</strong> per day this week.
              Your money is working for you in a balanced mix of stocks, bonds, and other investments
              to keep things steady and safe.
            </>
          ) : (
            <>
              Markets had a slight dip this week, so your portfolio is down by <strong style={{ fontWeight: 500, color: color.heading }}>${Math.abs(summary.totalChange).toLocaleString()}</strong>.
              This is normal and temporary. Your money is spread across different investments
              to protect against bigger drops, and diversified portfolios tend to recover over time.
            </>
          )}
        </p>
      </div>

      {/* Simple allocation display */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 500, margin: '0 0 12px 4px', color: color.heading }}>
          Where your money is
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {summary.holdings.map((h, i) => (
            <div key={h.fundId} className="stagger-item" style={{
              animationDelay: `${i * 50}ms`,
              padding: '14px 18px',
              background: color.white,
              border: `1px solid ${color.border}`,
              borderRadius: radius.lg,
              boxShadow: shadow.ambient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: color.heading }}>
                  {h.fundName}
                </div>
                <div style={{ fontSize: '0.75rem', color: color.body, marginTop: '2px' }}>
                  {h.allocation}% of your money
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: color.heading, fontFeatureSettings: font.tnum }}>
                  ${h.currentValue.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  fontFeatureSettings: font.tnum,
                  color: h.change >= 0 ? color.successText : color.danger,
                }}>
                  {h.change >= 0 ? '+' : ''}{h.changePercent.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reassurance */}
      <div style={{
        padding: '16px 18px',
        background: color.purpleTint,
        borderRadius: radius.lg,
        border: `1px solid ${color.borderSoftPurple}`,
      }}>
        <p style={{ fontSize: '0.85rem', color: color.label, fontWeight: 300, lineHeight: 1.6 }}>
          <strong style={{ fontWeight: 500, color: color.purpleDeep }}>Remember:</strong> investing is for the long term.
          Small ups and downs are normal, and you can always ask me questions in the chat.
        </p>
      </div>
    </div>
  );
}
