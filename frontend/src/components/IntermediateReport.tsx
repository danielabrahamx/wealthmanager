import React, { useEffect, useState } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { PortfolioSummary } from '../../../shared/index.js';
import { color, radius, shadow, font } from '../lib/theme';

interface Props { summary: PortfolioSummary; userId: string; }

const COLORS = ['#533afd', '#665efd', '#1c1e54', '#f96bee', '#15be53', '#ea2261'];

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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', fontFamily: font.sans }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.03em', marginBottom: '24px', color: color.heading }}>
        Your Portfolio Dashboard
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <MetricCard label="Total Value" value={`$${summary.totalValue.toLocaleString()}`} />
        <MetricCard label="Change" value={`${summary.totalChange >= 0 ? '+' : ''}$${summary.totalChange.toLocaleString()}`} 
          color={summary.totalChange >= 0 ? color.successText : color.danger} />
        <MetricCard label="Return" value={`${summary.totalChangePercent >= 0 ? '+' : ''}${summary.totalChangePercent.toFixed(2)}%`} 
          color={summary.totalChangePercent >= 0 ? color.successText : color.danger} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: color.white, padding: '20px', borderRadius: radius.lg, border: `1px solid ${color.border}`, boxShadow: shadow.ambient }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '12px', color: color.heading }}>Performance Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="value" stroke={color.purple} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: color.white, padding: '20px', borderRadius: radius.lg, border: `1px solid ${color.border}`, boxShadow: shadow.ambient }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '12px', color: color.heading }}>Allocation</h3>
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

      <div style={{ background: color.white, padding: '20px', borderRadius: radius.lg, border: `1px solid ${color.border}`, boxShadow: shadow.ambient, marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '12px', color: color.heading }}>Holdings Breakdown</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${color.border}` }}>
              <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.72rem', color: color.body, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Fund</th>
              <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.72rem', color: color.body, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Value</th>
              <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.72rem', color: color.body, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Allocation</th>
              <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.72rem', color: color.body, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {summary.holdings.map(h => (
              <tr key={h.fundId} style={{ borderBottom: `1px solid ${color.border}` }}>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', color: color.heading }}>{h.fundName}</div>
                  <div style={{ fontSize: '0.7rem', color: color.body }}>{h.ticker}</div>
                </td>
                <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 500, color: color.heading, fontFeatureSettings: font.tnum }}>${h.currentValue.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: color.label, fontFeatureSettings: font.tnum }}>{h.allocation}%</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: h.change >= 0 ? color.successText : color.danger, fontWeight: 500, fontFeatureSettings: font.tnum }}>
                  {h.change >= 0 ? '+' : ''}{h.changePercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {news.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '12px', color: color.heading }}>Market News</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {news.slice(0, 3).map((n, i) => (
              <div key={i} style={{ padding: '12px', background: color.white, borderRadius: radius.md, border: `1px solid ${color.border}`, boxShadow: shadow.ambient }}>
                <div style={{ fontWeight: 500, fontSize: '0.85rem', marginBottom: '4px', color: color.heading }}>{n.title}</div>
                <div style={{ fontSize: '0.75rem', color: color.body }}>{n.snippet?.substring(0, 150)}...</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: color.white, padding: '20px', borderRadius: radius.lg, border: `1px solid ${color.border}`, boxShadow: shadow.ambient }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '12px', color: color.heading }}>Ask a Question</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input value={askQuestion} onChange={e => setAskQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="e.g., How will rate changes affect my bonds?"
            style={{ flex: 1, padding: '10px 12px', border: `1px solid ${color.border}`, borderRadius: radius.md, fontSize: '0.9rem', fontWeight: 300, color: color.heading, outline: 'none' }}
            onFocus={e => (e.target.style.borderColor = color.purple)}
            onBlur={e => (e.target.style.borderColor = color.border)} />
          <button className="btn-press" onClick={handleAsk} style={{ padding: '10px 20px', background: color.purple, color: 'white', border: 'none', borderRadius: radius.md, cursor: 'pointer', fontWeight: 400, boxShadow: shadow.elevated }}>
            Ask
          </button>
        </div>
        {qa.map((item, i) => (
          <div key={i} style={{ marginBottom: '12px', padding: '12px 14px', background: color.purpleTint, borderRadius: radius.md, border: `1px solid ${color.borderSoftPurple}` }}>
            <div style={{ fontWeight: 500, fontSize: '0.85rem', color: color.purpleDeep, marginBottom: '4px' }}>Q: {item.q}</div>
            <div style={{ fontSize: '0.85rem', color: color.label, fontWeight: 300, lineHeight: 1.5 }}>A: {item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color: valueColor = color.heading }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: color.white, padding: '20px', borderRadius: radius.lg, border: `1px solid ${color.border}`, boxShadow: shadow.ambient, textAlign: 'center' }}>
      <div style={{ fontSize: '0.72rem', color: color.body, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 400, color: valueColor, fontFeatureSettings: font.tnum }}>{value}</div>
    </div>
  );
}
