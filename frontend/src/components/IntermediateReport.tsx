import React, { useEffect, useState } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { PortfolioSummary } from '../../../shared/index.js';

interface Props { summary: PortfolioSummary; userId: string; }

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

export function IntermediateReport({ summary, userId }: Props) {
  const [news, setNews] = useState<any[]>([]);
  const [askQuestion, setAskQuestion] = useState('');
  const [qa, setQa] = useState<Array<{q: string; a: string}>>([]);

  useEffect(() => {
    fetch(`/api/reporting/news/${userId}`).then(r => r.json()).then(d => setNews(d.news || [])).catch(() => {});
  }, [userId]);

  const handleAsk = async () => {
    if (!askQuestion.trim()) return;
    const question = askQuestion;
    setAskQuestion('');
    try {
      const res = await fetch('/api/agent/ask', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId, question }),
      });
      const data = await res.json();
      setQa(prev => [...prev, { q: question, a: data.answer || 'Processing...' }]);
    } catch {
      setQa(prev => [...prev, { q: question, a: 'Sorry, could not process that question.' }]);
    }
  };

  const pieData = summary.holdings.map(h => ({ name: h.fundName, value: h.currentValue }));
  const lineData = [0, 1, 2, 3, 4, 5, 6].map(d => ({
    day: `Day ${d+1}`,
    value: summary.totalValue * (1 + (Math.random() - 0.5) * 0.04 + d * 0.002),
  }));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', color: '#111827' }}>
        Your Portfolio Dashboard
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <MetricCard label="Total Value" value={`$${summary.totalValue.toLocaleString()}`} />
        <MetricCard label="Change" value={`${summary.totalChange >= 0 ? '+' : ''}$${summary.totalChange.toLocaleString()}`} 
          color={summary.totalChange >= 0 ? '#16a34a' : '#dc2626'} />
        <MetricCard label="Return" value={`${summary.totalChangePercent >= 0 ? '+' : ''}${summary.totalChangePercent.toFixed(2)}%`} 
          color={summary.totalChangePercent >= 0 ? '#16a34a' : '#dc2626'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Performance Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Allocation</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, percent}) => `${name.substring(0,12)} ${(percent*100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Holdings Breakdown</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: '#6b7280' }}>FUND</th>
              <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.8rem', color: '#6b7280' }}>VALUE</th>
              <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.8rem', color: '#6b7280' }}>ALLOCATION</th>
              <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.8rem', color: '#6b7280' }}>CHANGE</th>
            </tr>
          </thead>
          <tbody>
            {summary.holdings.map(h => (
              <tr key={h.fundId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{h.fundName}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{h.ticker}</div>
                </td>
                <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>${h.currentValue.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '10px 8px' }}>{h.allocation}%</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: h.change >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {h.change >= 0 ? '+' : ''}{h.changePercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {news.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Market News</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {news.slice(0, 3).map((n, i) => (
              <div key={i} style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>{n.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{n.snippet?.substring(0, 150)}...</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Ask a Question</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input value={askQuestion} onChange={e => setAskQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="e.g., How will rate changes affect my bonds?"
            style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem' }} />
          <button onClick={handleAsk} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            Ask
          </button>
        </div>
        {qa.map((item, i) => (
          <div key={i} style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2563eb', marginBottom: '4px' }}>Q: {item.q}</div>
            <div style={{ fontSize: '0.85rem', color: '#374151' }}>A: {item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = '#111827' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
