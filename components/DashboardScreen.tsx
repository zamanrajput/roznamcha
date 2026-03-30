'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, LogOut, FileText, Trash2, Bell } from 'lucide-react'
import type { Session, Transaction, Account, TransactionType, Direction } from '@/lib/types'
import { ACCOUNT_LABELS, ACCOUNT_COLORS, ACCOUNT_SHORT, ALL_ACCOUNTS, TYPE_LABELS } from '@/lib/types'
import { getSessionTransactions, addTransactions, deleteTransaction, calculateExpectedClosing } from '@/lib/data'
import AddTransactionModal from './AddTransactionModal'

interface DashboardProps {
  session: Session
  onCheckout: () => void
  onBills: () => void
}

export default function DashboardScreen({ session, onCheckout, onBills }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [liveTime, setLiveTime] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const txs = await getSessionTransactions(session.id)
    setTransactions(txs)
  }, [session.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const tick = () => setLiveTime(new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleAdd = async (entries: Omit<Transaction, 'id'>[]) => {
    await addTransactions(entries)
    setShowAdd(false)
    load()
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await deleteTransaction(id)
    setDeleting(null)
    load()
  }

  const expected = calculateExpectedClosing(session.opening_balances, transactions)

  const totalIn = transactions.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)

  const cardStyle = {
    background: 'var(--s1)',
    border: '1px solid var(--border)',
    borderRadius: 16,
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Header */}
      <div style={{ background: 'var(--s1)', borderBottom: '1px solid var(--border)', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="flex items-center justify-between" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>📱 Bhatti Mobile Center</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
              {new Date(session.date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })} — {session.operator_name}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--t2)', textAlign: 'right' }}>
            {liveTime}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', maxWidth: 640, width: '100%', margin: '0 auto' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ ...cardStyle, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Total IN</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {totalIn.toLocaleString()}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Total OUT</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {totalOut.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Current balances */}
        <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Current Balances
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ALL_ACCOUNTS.map(acc => (
              <div key={acc} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: ACCOUNT_COLORS[acc],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, color: 'white',
                  }}>
                    {ACCOUNT_SHORT[acc]}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--t2)' }}>{ACCOUNT_LABELS[acc]}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  Rs. {(expected[acc as keyof typeof expected] || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>
            Entries ({transactions.length})
          </div>
        </div>

        {transactions.length === 0 && (
          <div style={{ ...cardStyle, padding: '40px 20px', textAlign: 'center', color: 'var(--t3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14 }}>Koi entry nahi — Add karein</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 100 }}>
          {transactions.map(tx => (
            <div
              key={tx.id}
              className="animate-fade"
              style={{
                ...cardStyle,
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: deleting === tx.id ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {/* Account badge */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: ACCOUNT_COLORS[tx.account as Account],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: 'white',
              }}>
                {ACCOUNT_SHORT[tx.account as Account]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {TYPE_LABELS[tx.type as keyof typeof TYPE_LABELS]}
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700,
                    background: tx.direction === 'in' ? 'var(--green-dim)' : 'var(--red-dim)',
                    color: tx.direction === 'in' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {tx.direction === 'in' ? '↑ IN' : '↓ OUT'}
                  </span>
                </div>
                {tx.description && (
                  <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {new Date(tx.time).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Amount */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
                  color: tx.direction === 'in' ? 'var(--green)' : 'var(--red)',
                }}>
                  {tx.direction === 'in' ? '+' : '-'}{tx.amount.toLocaleString()}
                </div>
                <button
                  onClick={() => handleDelete(tx.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', marginTop: 4, padding: 2 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--s1)', borderTop: '1px solid var(--border)',
        padding: '12px 16px', zIndex: 50,
        display: 'flex', gap: 10, maxWidth: 640, margin: '0 auto',
      }}>
        <button
          onClick={onBills}
          style={{
            flex: 1, padding: '13px',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--s2)', color: 'var(--t2)',
            fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--font-baloo)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Bell size={16} /> Bills
        </button>

        <button
          onClick={() => setShowAdd(true)}
          style={{
            flex: 2, padding: '13px',
            borderRadius: 12, border: 'none',
            background: 'var(--accent)', color: '#000',
            fontSize: 15, fontWeight: 800,
            fontFamily: 'var(--font-baloo)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Plus size={18} /> New Entry
        </button>

        <button
          onClick={onCheckout}
          style={{
            flex: 1, padding: '13px',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--s2)', color: 'var(--t2)',
            fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--font-baloo)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <LogOut size={16} /> Close
        </button>
      </div>

      {showAdd && (
        <AddTransactionModal
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
          sessionId={session.id}
          sessionDate={session.date}
        />
      )}
    </div>
  )
}
