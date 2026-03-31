'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, TrendingUp, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { getAllSessions, getSessionTransactions } from '@/lib/data'
import type { Session, Transaction, Account } from '@/lib/types'
import { ACCOUNT_LABELS, ACCOUNT_COLORS, TYPE_LABELS } from '@/lib/types'

// Dynamic import recharts to avoid SSR issues
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })

interface ReportsScreenProps {
  onBack: () => void
}

type Range = '7d' | '30d' | '90d' | '1yr'

const RANGE_DAYS: Record<Range, number> = {
  '7d': 7, '30d': 30, '90d': 90, '1yr': 365,
}

interface DaySummary {
  session: Session
  transactions: Transaction[]
  totalIn: number
  totalOut: number
  commission: number
  profit: number
}

export default function ReportsScreen({ onBack }: ReportsScreenProps) {
  const [range, setRange] = useState<Range>('30d')
  const [tab, setTab] = useState<'charts' | 'history'>('charts')
  const [loading, setLoading] = useState(true)
  const [summaries, setSummaries] = useState<DaySummary[]>([])
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const sessions = await getAllSessions()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range])

    const filtered = sessions.filter(s => new Date(s.date) >= cutoff)

    const results: DaySummary[] = []
    for (const session of filtered) {
      const txs = await getSessionTransactions(session.id)
      const totalIn = txs.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
      const totalOut = txs.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
      const commission = txs.filter(t => t.is_commission).reduce((s, t) => s + t.amount, 0)
      const profit = txs.filter(t => t.direction === 'in' && t.is_commission).reduce((s, t) => s + t.amount, 0)
      results.push({ session, transactions: txs, totalIn, totalOut, commission, profit })
    }
    setSummaries(results)
    setLoading(false)
  }, [range])

  useEffect(() => { load() }, [load])

  // Chart data
  const barData = [...summaries]
    .sort((a, b) => a.session.date.localeCompare(b.session.date))
    .map(s => ({
      date: new Date(s.session.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
      IN: s.totalIn,
      OUT: s.totalOut,
      Profit: s.profit,
    }))

  // Commission/profit trend
  const profitData = [...summaries]
    .sort((a, b) => a.session.date.localeCompare(b.session.date))
    .map(s => ({
      date: new Date(s.session.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
      Commission: s.commission,
    }))

  // Transaction type breakdown
  const typeMap: Record<string, number> = {}
  for (const s of summaries) {
    for (const tx of s.transactions) {
      if (!typeMap[tx.type]) typeMap[tx.type] = 0
      typeMap[tx.type] += tx.amount
    }
  }
  const pieData = Object.entries(typeMap)
    .map(([type, value]) => ({ name: TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // Account usage
  const accountMap: Record<string, number> = {}
  for (const s of summaries) {
    for (const tx of s.transactions) {
      if (tx.direction === 'out') {
        if (!accountMap[tx.account]) accountMap[tx.account] = 0
        accountMap[tx.account] += tx.amount
      }
    }
  }

  // Totals
  const grandIn = summaries.reduce((s, d) => s + d.totalIn, 0)
  const grandOut = summaries.reduce((s, d) => s + d.totalOut, 0)
  const grandCommission = summaries.reduce((s, d) => s + d.commission, 0)
  const totalDays = summaries.length

  const PIE_COLORS = ['#f0a500', '#00c896', '#4a9eff', '#ff4757', '#a855f7', '#ff6b35']

  const cardStyle = {
    background: 'var(--s1)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  }

  const tooltipStyle = {
    background: 'var(--s2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 12,
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Header */}
      <div style={{ background: 'var(--s1)', borderBottom: '1px solid var(--border)', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="flex items-center gap-3" style={{ maxWidth: 720, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--t2)' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Reports & History</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>Bhatti Mobile Center</div>
          </div>
          {/* Range selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['7d', '30d', '90d', '1yr'] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: `1px solid ${range === r ? 'var(--accent)' : 'var(--border)'}`,
                  background: range === r ? 'var(--accent-dim)' : 'var(--s2)',
                  color: range === r ? 'var(--accent)' : 'var(--t2)',
                  cursor: 'pointer',
                }}
              >{r}</button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 720, margin: '12px auto 0', display: 'flex', gap: 4 }}>
          {(['charts', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
                background: tab === t ? 'var(--accent-dim)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--t2)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {t === 'charts' ? <TrendingUp size={14} /> : <Calendar size={14} />}
              {t === 'charts' ? 'Charts' : 'History'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', maxWidth: 720, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div>Loading data...</div>
          </div>
        ) : (
          <>
            {/* Summary cards - always visible */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Total IN</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {grandIn.toLocaleString()}
                </div>
              </div>
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Total OUT</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {grandOut.toLocaleString()}
                </div>
              </div>
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Commission Earned</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {grandCommission.toLocaleString()}
                </div>
              </div>
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Working Days</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {totalDays}
                </div>
              </div>
            </div>

            {/* CHARTS TAB */}
            {tab === 'charts' && (
              <>
                {/* Daily IN vs OUT */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--t2)' }}>Daily IN vs OUT</div>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fill: 'var(--t3)', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: 'var(--t3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `Rs. ${Number(v).toLocaleString()}`} />
                        <Bar dataKey="IN" fill="#00c896" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="OUT" fill="#ff4757" radius={[4, 4, 0, 0]} />
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--t2)' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Commission/Profit trend */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--t2)' }}>Daily Commission Earned</div>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={profitData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fill: 'var(--t3)', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: 'var(--t3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `Rs. ${Number(v).toLocaleString()}`} />
                        <Line type="monotone" dataKey="Commission" stroke="#f0a500" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Transaction type breakdown */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--t2)' }}>Transaction Type Breakdown</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `Rs. ${Number(v).toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1 }}>
                      {pieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                          <div className="flex items-center gap-2">
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--t2)' }}>{item.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Account usage */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--t2)' }}>Account Usage (OUT)</div>
                  {Object.entries(accountMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([acc, amt]) => {
                      const max = Math.max(...Object.values(accountMap))
                      const pct = (amt / max) * 100
                      return (
                        <div key={acc} style={{ marginBottom: 12 }}>
                          <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
                            <div className="flex items-center gap-2">
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: ACCOUNT_COLORS[acc as Account], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: 'white' }}>
                                {acc.slice(0, 2).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--t2)' }}>{ACCOUNT_LABELS[acc as Account] || acc}</span>
                            </div>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {amt.toLocaleString()}</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--s3)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: ACCOUNT_COLORS[acc as Account] || 'var(--accent)', borderRadius: 3, transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </>
            )}

            {/* HISTORY TAB */}
            {tab === 'history' && (
              <div>
                {summaries.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                    <div>Koi history nahi is range mein</div>
                  </div>
                )}
                {[...summaries].sort((a, b) => b.session.date.localeCompare(a.session.date)).map(summary => {
                  const isExpanded = expandedDay === summary.session.date
                  return (
                    <div key={summary.session.date} style={{ marginBottom: 10 }}>
                      {/* Day header */}
                      <button
                        onClick={() => setExpandedDay(isExpanded ? null : summary.session.date)}
                        style={{
                          width: '100%', background: 'var(--s1)',
                          border: `1px solid ${summary.session.checksum_passed === false ? 'var(--red)' : summary.session.checksum_passed ? 'var(--green)' : 'var(--border)'}`,
                          borderRadius: isExpanded ? '16px 16px 0 0' : 16,
                          padding: '14px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                        }}
                      >
                        {/* Date */}
                        <div style={{ flexShrink: 0, textAlign: 'center', background: 'var(--s2)', borderRadius: 10, padding: '6px 10px' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                            {new Date(summary.session.date).getDate()}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                            {new Date(summary.session.date).toLocaleDateString('en-PK', { month: 'short' })}
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            {new Date(summary.session.date).toLocaleDateString('en-PK', { weekday: 'long' })}
                            <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                              background: summary.session.status === 'closed' ? 'var(--green-dim)' : 'rgba(74,158,255,0.12)',
                              color: summary.session.status === 'closed' ? 'var(--green)' : 'var(--blue)',
                            }}>
                              {summary.session.status === 'closed' ? 'Closed' : 'Open'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
                            {summary.session.operator_name} · {summary.transactions.length} entries
                          </div>
                        </div>

                        {/* Amounts */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>+{summary.totalIn.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>-{summary.totalOut.toLocaleString()}</div>
                        </div>
                        {isExpanded ? <ChevronDown size={16} color="var(--t3)" /> : <ChevronRight size={16} color="var(--t3)" />}
                      </button>

                      {/* Expanded entries */}
                      {isExpanded && (
                        <div style={{
                          background: 'var(--s1)', border: '1px solid var(--border)',
                          borderTop: 'none', borderRadius: '0 0 16px 16px',
                          padding: '12px 16px',
                        }}>
                          {/* Day summary bar */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                            {[
                              { label: 'IN', val: summary.totalIn, color: 'var(--green)' },
                              { label: 'OUT', val: summary.totalOut, color: 'var(--red)' },
                              { label: 'Commission', val: summary.commission, color: 'var(--accent)' },
                            ].map(item => (
                              <div key={item.label} style={{ background: 'var(--s2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                  {item.val.toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Checksum explanation if any */}
                          {summary.session.checksum_explanation && (
                            <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--t2)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--red)' }}>Explanation: </span>
                              {summary.session.checksum_explanation}
                            </div>
                          )}

                          {/* Transactions list */}
                          {summary.transactions.length === 0 ? (
                            <div style={{ color: 'var(--t3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Koi entry nahi</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {summary.transactions.map(tx => (
                                <div key={tx.id} style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  background: 'var(--s2)', borderRadius: 10, padding: '10px 12px',
                                }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                    background: ACCOUNT_COLORS[tx.account as Account] || 'var(--s3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 800, color: 'white',
                                  }}>
                                    {tx.account.slice(0, 3).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                                      {TYPE_LABELS[tx.type as keyof typeof TYPE_LABELS] || tx.type}
                                      {tx.is_commission && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>Commission</span>}
                                    </div>
                                    {tx.description && <div style={{ fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>}
                                  </div>
                                  <div style={{
                                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, flexShrink: 0,
                                    color: tx.direction === 'in' ? 'var(--green)' : 'var(--red)',
                                  }}>
                                    {tx.direction === 'in' ? '+' : '-'}{tx.amount.toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div style={{ height: 40 }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}