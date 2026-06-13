import React from 'react';
import type { PortfolioSummary } from '../../../shared/index.js';

interface Props {
  summary: PortfolioSummary;
  userId: string;
}

export function BeginnerReport({ summary }: Props) {
  const isPositive = summary.totalChange >= 0;
  
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Big number - total value */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px' }}>
          YOUR TOTAL INVESTMENT
        </p>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#111827' }}>
          ${summary.totalValue.toLocaleString()}
        </h1>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
          padding: '8px 20px',
          borderRadius: '24px',
          background: isPositive ? '#f0fdf4' : '#fef2f2',
        }}>
          <span style={{ fontSize: '1.5rem' }}>{isPositive ? '🟢' : '🔴'}</span>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: isPositive ? '#166534' : '#991b1b',
          }}>
            {isPositive ? '+' : ''}{summary.totalChangePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Plain English summary */}
      <div style={{
        padding: '24px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: '#334155' }}>
          📝 How your money is doing
        </h3>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#475569' }}>
          {isPositive ? (
            <>
              Great news! Your investment grew by <strong>${summary.totalChange.toLocaleString()}</strong> — 
              that's like earning <strong>${(summary.totalChange / 7).toFixed(0)}</strong> per day this week. 
              Your money is working for you in a diversified mix of stocks, bonds, and other investments 
              to keep things balanced and safe.
            </>
          ) : (
            <>
              Markets had a slight dip this week — your portfolio is down by <strong>${Math.abs(summary.totalChange).toLocaleString()}</strong>. 
              Don't worry! This is normal and temporary. Your money is spread across different investments 
              to protect against bigger drops. Over time, diversified portfolios tend to recover.
            </>
          )}
        </p>
      </div>

      {/* Simple allocation display */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: '#334155' }}>
          🎯 Where your money is
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {summary.holdings.map(h => (
            <div key={h.fundId} style={{
              padding: '12px 16px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                  {h.fundName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {h.allocation}% of your money
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                  ${h.currentValue.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: h.change >= 0 ? '#16a34a' : '#dc2626',
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
        padding: '16px',
        background: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
          💡 <strong>Remember:</strong> Investing is for the long term. Small ups and downs are normal.
          You can always ask me questions in the chat!
        </p>
      </div>
    </div>
  );
}
