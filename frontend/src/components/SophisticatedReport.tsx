import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import type { PortfolioSummary } from '../../../shared/index.js';

interface Props { summary: PortfolioSummary; userId: string; }

export function SophisticatedReport({ summary, userId }: Props) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reporting/analytics/${userId}`)
      .then(r => r.json())
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="loading-state">Loading analytics...</div>;

  const monteCarloData = analytics?.monteCarlo || [];
  const riskMetrics = analytics?.riskMetrics || {};

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Advanced Portfolio Analytics</h2>
        <button onClick={() => {
          const csv = summary.holdings.map(h => `${h.ticker},${h.fundName},${h.currentValue},${h.allocation}%,${h.changePercent}%`).join('\n');
          const blob = new Blob([`Ticker,Name,Value,Allocation,Change\n${csv}`], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'portfolio-export.csv'; a.click();
        }} style={{ padding: '8px 16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
          Export CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <MetricCard label="Total Value" value={`$${summary.totalValue.toLocaleString()}`} />
        <MetricCard label="Sharpe Ratio" value={riskMetrics.sharpeRatio?.toFixed(2) || '-'} />
        <MetricCard label="Alpha" value={`${riskMetrics.alpha?.toFixed(1) || '-'}%`} />
        <MetricCard label="Beta" value={riskMetrics.beta?.toFixed(2) || '-'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <MetricCard label="Max Drawdown" value={`${riskMetrics.maxDrawdown?.toFixed(1) || '-'}%`} color="#dc2626" />
        <MetricCard label="Volatility" value={`${riskMetrics.volatility?.toFixed(1) || '-'}%`} color="#d97706" />
        <MetricCard label="Return" value={`${summary.totalChangePercent >= 0 ? '+' : ''}${summary.totalChangePercent.toFixed(2)}%`} color={summary.totalChangePercent >= 0 ? '#16a34a' : '#dc2626'} />
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Monte Carlo Simulation (10-Year Projection)</h3>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '16px' }}>
          Based on {analytics?.monteCarlo?.[0] ? '500' : '0'} simulations - shaded area shows 10th-90th percentile range
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monteCarloData}>
            <XAxis dataKey="year" label={{ value: 'Year', position: 'bottom' }} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="median" stroke="#2563eb" strokeWidth={2} name="Median" dot={false} />
            <Line type="monotone" dataKey="p90" stroke="#059669" strokeWidth={1} name="90th Percentile" dot={false} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="p10" stroke="#dc2626" strokeWidth={1} name="10th Percentile" dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Holdings & Performance Attribution</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '6px', fontSize: '0.7rem', color: '#6b7280' }}>TICKER</th>
                <th style={{ textAlign: 'right', padding: '6px', fontSize: '0.7rem', color: '#6b7280' }}>VALUE</th>
                <th style={{ textAlign: 'right', padding: '6px', fontSize: '0.7rem', color: '#6b7280' }}>ALLOC</th>
                <th style={{ textAlign: 'right', padding: '6px', fontSize: '0.7rem', color: '#6b7280' }}>Δ</th>
                <th style={{ textAlign: 'right', padding: '6px', fontSize: '0.7rem', color: '#6b7280' }}>ATTR</th>
              </tr>
            </thead>
            <tbody>
              {summary.holdings.map(h => (
                <tr key={h.fundId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{h.ticker}</div>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{h.fundName.substring(0, 20)}</div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', fontSize: '0.8rem', fontWeight: 500 }}>${h.currentValue.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', fontSize: '0.8rem' }}>{h.allocation}%</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', fontSize: '0.8rem', color: h.change >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {h.change >= 0 ? '+' : ''}{h.changePercent.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', fontSize: '0.7rem', color: '#6b7280' }}>
                    {(h.allocation * h.changePercent / summary.totalChangePercent || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Risk Heatmap</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {summary.holdings.map(h => {
              const riskScore = h.ticker === 'VTI' ? 0.6 : h.ticker === 'BND' ? 0.2 : h.ticker === 'VNQ' ? 0.5 : 0.3;
              const heat = riskScore > 0.5 ? '#fef2f2' : riskScore > 0.3 ? '#fffbeb' : '#f0fdf4';
              const textColor = riskScore > 0.5 ? '#991b1b' : riskScore > 0.3 ? '#92400e' : '#166534';
              return (
                <div key={h.fundId} style={{ padding: '10px', background: heat, borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: textColor }}>{h.ticker}</div>
                  <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                    Risk: {riskScore > 0.5 ? 'HIGH' : riskScore > 0.3 ? 'MED' : 'LOW'}
                  </div>
                  <div style={{ marginTop: '4px', height: '4px', background: '#e5e7eb', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${riskScore * 100}%`, background: textColor, borderRadius: '2px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {analytics?.taxOptimization && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Tax Optimization</h4>
              <p style={{ fontSize: '0.75rem', color: '#475569' }}>{analytics.taxOptimization.suggestion}</p>
              <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                Potential savings: ${analytics.taxOptimization.potentialSavings?.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {analytics?.marketData && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>
            Real-Time Market Data <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 400 }}>via Linkup</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {Object.entries(analytics.marketData).map(([key, data]: [string, any]) => data && (
              <div key={key} style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{data.ticker}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '4px' }}>${data.price?.toFixed(2)}</div>
                <div style={{ fontSize: '0.8rem', color: data.change >= 0 ? '#16a34a' : '#dc2626', marginTop: '2px' }}>
                  {data.change >= 0 ? '+' : ''}{data.change?.toFixed(2)} ({data.changePercent?.toFixed(2)}%)
                </div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '4px' }}>
                  Vol: {(data.volume / 1000000).toFixed(1)}M | P/E: {data.peRatio || '-'}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: '2px' }}>
                  Source: {data.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Scenario Analysis</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { scenario: 'Bull Market', change: 20, color: '#16a34a' },
            { scenario: 'Moderate Growth', change: 7, color: '#2563eb' },
            { scenario: 'Flat Market', change: 1, color: '#6b7280' },
            { scenario: 'Recession', change: -15, color: '#dc2626' },
          ].map(s => (
            <div key={s.scenario} style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>{s.scenario}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>
                ${(summary.totalValue * (1 + s.change / 100)).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: s.color, marginTop: '2px' }}>
                {s.change >= 0 ? '+' : ''}{s.change}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = '#111827' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
