/**
 * Generative UI Components
 * 
 * Tier-specific components that the agent renders during conversation.
 * Registered with CopilotKit via useCopilotAction.
 */

import React, { useState } from 'react';

// ── Simple Choice (Beginner) ──

interface SimpleChoiceProps {
  question: string;
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
}

export function SimpleChoice({ question, options, onSelect }: SimpleChoiceProps) {
  return (
    <div style={{
      padding: '24px',
      background: 'linear-gradient(135deg, #eff6ff, #f8fafc)',
      borderRadius: '16px',
      border: '2px solid #bfdbfe',
      marginBottom: '16px',
    }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e40af', marginBottom: '16px', textAlign: 'center' }}>
        {question}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            style={{
              padding: '20px',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#111827',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Fund Grid (Intermediate) ──

export interface FundOption {
  id: string;
  name: string;
  ticker: string;
  riskLabel: string;
  return1Y: number;
  category: string;
}

interface FundGridProps {
  funds: FundOption[];
  onSelect: (fundId: string) => void;
  selectedId?: string;
}

export function FundGrid({ funds, onSelect, selectedId }: FundGridProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
        📊 Top Fund Recommendations
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
        Based on your preferences, here are {funds.length} curated funds:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
        {funds.map(fund => {
          const isSelected = selectedId === fund.id;
          const isPositive = fund.return1Y >= 0;
          return (
            <button
              key={fund.id}
              onClick={() => onSelect(fund.id)}
              style={{
                padding: '16px',
                background: isSelected ? '#eff6ff' : 'white',
                border: isSelected ? '2px solid #2563eb' : '1px solid #e5e7eb',
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{fund.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{fund.ticker} · {fund.category}</div>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  background: fund.riskLabel === 'Low' ? '#dcfce7' : fund.riskLabel === 'Medium' ? '#fef3c7' : '#fee2e2',
                  color: fund.riskLabel === 'Low' ? '#166534' : fund.riskLabel === 'Medium' ? '#92400e' : '#991b1b',
                }}>
                  {fund.riskLabel} risk
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: isPositive ? '#16a34a' : '#dc2626',
                }}>
                  {isPositive ? '+' : ''}{fund.return1Y.toFixed(1)}%
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>1Y return</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Advanced Screener (Sophisticated) ──

interface AdvancedScreenerProps {
  funds: FundOption[];
  onSelect: (fundId: string) => void;
  onFilterChange: (filters: { risk?: string; minReturn?: number; category?: string }) => void;
}

export function AdvancedScreener({ funds, onSelect, onFilterChange }: AdvancedScreenerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [minReturn, setMinReturn] = useState(0);

  const filtered = funds.filter(f => {
    if (searchTerm && !f.name.toLowerCase().includes(searchTerm.toLowerCase()) && !f.ticker.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (riskFilter !== 'all' && f.riskLabel !== riskFilter) return false;
    if (f.return1Y < minReturn) return false;
    return true;
  });

  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
        🔍 Advanced Fund Screener
      </h3>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search funds..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem' }}
        />
        <select
          value={riskFilter}
          onChange={e => { setRiskFilter(e.target.value); onFilterChange({ risk: e.target.value }); }}
          style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem' }}
        >
          <option value="all">All Risk</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <select
          value={minReturn}
          onChange={e => { setMinReturn(Number(e.target.value)); onFilterChange({ minReturn: Number(e.target.value) }); }}
          style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem' }}
        >
          <option value={0}>Min Return: Any</option>
          <option value={5}>Min 5%</option>
          <option value={10}>Min 10%</option>
          <option value={15}>Min 15%</option>
          <option value={20}>Min 20%</option>
        </select>
      </div>

      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '12px' }}>
        Showing {filtered.length} of {funds.length} funds · {riskFilter === 'all' ? 'All risk levels' : `${riskFilter} risk`} · Min return: {minReturn}%
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
        {filtered.map(fund => (
          <div
            key={fund.id}
            onClick={() => onSelect(fund.id)}
            style={{
              padding: '14px 18px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {fund.name}
                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{fund.ticker}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                {fund.category}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 600,
                background: fund.riskLabel === 'Low' ? '#dcfce7' : fund.riskLabel === 'Medium' ? '#fef3c7' : '#fee2e2',
                color: fund.riskLabel === 'Low' ? '#166534' : fund.riskLabel === 'Medium' ? '#92400e' : '#991b1b',
              }}>
                {fund.riskLabel}
              </span>
              <span style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: fund.return1Y >= 0 ? '#16a34a' : '#dc2626',
              }}>
                {fund.return1Y >= 0 ? '+' : ''}{fund.return1Y.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Investment Confirmation (All Tiers) ──

interface ConfirmationProps {
  fundName: string;
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InvestmentConfirmation({ fundName, amount, onConfirm, onCancel }: ConfirmationProps) {
  return (
    <div style={{
      padding: '24px',
      background: '#f0fdf4',
      borderRadius: '16px',
      border: '2px solid #bbf7d0',
      textAlign: 'center',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '8px' }}>✅</div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
        Invest ${amount.toLocaleString()} in {fundName}?
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: '20px' }}>
        This matches your risk profile and investment goals.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={onConfirm}
          style={{
            padding: '14px 32px',
            background: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ✓ Yes, Invest
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '14px 32px',
            background: 'white',
            color: '#374151',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ✗ Not Yet
        </button>
      </div>
    </div>
  );
}

// ── Level-Up Notification ──

interface LevelUpProps {
  newCapability: string;
  message: string;
}

export function LevelUpNotification({ newCapability, message }: LevelUpProps) {
  return (
    <div style={{
      padding: '16px 20px',
      background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
      borderRadius: '12px',
      border: '2px solid #d8b4fe',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <span style={{ fontSize: '1.5rem' }}>⬆️</span>
      <div>
        <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.9rem' }}>
          Level Up! {newCapability} unlocked
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          {message}
        </div>
      </div>
    </div>
  );
}
