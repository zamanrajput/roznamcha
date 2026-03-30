'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import type { Session, Transaction, OpeningBalances, Account } from '@/lib/types'
import { ACCOUNT_LABELS, ACCOUNT_COLORS, ACCOUNT_SHORT, ALL_ACCOUNTS } from '@/lib/types'
import { getSessionTransactions, calculateExpectedClosing, closeSession } from '@/lib/data'

interface CheckoutScreenProps {
  session: Session
  onDone: () => void
  onBack: () => void
}

export default function CheckoutScreen({ session, onDone, onBack }: CheckoutScreenProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [closing, setClosing] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [checksumResult, setChecksumResult] = useState<{ passed: boolean; mismatches: string[] } | null>(null)

  useEffect(() => {
    getSessionTransactions(session.id).then(setTransactions)
  }, [session.id])

  const expected = calculateExpectedClosing(session.opening_balances, transactions)

  const allFilled = ALL_ACCOUNTS.every(a => closing[a] !== undefined && closing[a] !== '')

  const handleSubmit = async () => {
    const closingBalances: OpeningBalances = {} as OpeningBalances
    for (const acc of ALL_ACCOUNTS) {
      closingBalances[acc as keyof OpeningBalances] = parseFloat(closing[acc] || '0') || 0
    }

    const mismatches: string[] = []
    for (const acc of ALL_ACCOUNTS) {
      const exp = expected[acc as keyof OpeningBalances]
      const actual = closingBalances[acc as keyof OpeningBalances]
      if (Math.abs(exp - actual) > 0.01) {
        mismatches.push(acc)
      }
    }

    const passed = mismatches.length === 0
    setChecksumResult({ passed, mismatches })
    setSubmitted(true)

    await closeSession(session.id, closingBalances, passed)
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--s3)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 16,
    padding: '11px 14px',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  }

  const totalIn = transactions.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)

  if (submitted && checksumResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div
          className="animate-pop"
          style={{
            width: '100%', maxWidth: 420,
            background: 'var(--s1)', border: `1px solid ${checksumResult.passed ? 'var(--green)' : 'var(--red)'}`,
            borderRadius: 24, padding: '36px 28px', textAlign: 'center',
            boxShadow: `0 0 40px ${checksumResult.passed ? 'rgba(0,200,150,0.15)' : 'rgba(255,71,87,0.15)'}`,
          }}
        >
          {checksumResult.passed ? (
            <>
              <CheckCircle size={56} color="var(--green)" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>Checksum Passed ✓</div>
              <div style={{ fontSize: 14, color: 'var(--t2)', marginTop: 8 }}>
                Sab balances match kar rahe hain. Din successfully close ho gaya.
              </div>
            </>
          ) : (
            <>
              <XCircle size={56} color="var(--red)" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)' }}>Mismatch Found!</div>
              <div style={{ fontSize: 14, color: 'var(--t2)', marginTop: 8, marginBottom: 16 }}>
                Inn accounts mein farq hai:
              </div>
              {checksumResult.mismatches.map(acc => {
                const exp = expected[acc as keyof OpeningBalances]
                const actual = parseFloat(closing[acc] || '0')
                const diff = actual - exp
                return (
                  <div key={acc} style={{
                    background: 'var(--red-dim)', border: '1px solid var(--red)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 8, textAlign: 'left',
                  }}>
                    <div style={{ fontWeight: 700 }}>{ACCOUNT_LABELS[acc as Account]}</div>
                    <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      Expected: Rs. {exp.toLocaleString()} | Actual: Rs. {actual.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: diff >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      Difference: {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Day summary */}
          <div style={{
            background: 'var(--s2)', borderRadius: 12, padding: '14px', marginTop: 20, textAlign: 'left',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
              Day Summary
            </div>
            <div className="flex justify-between" style={{ marginBottom: 6 }}>
              <span style={{ color: 'var(--t2)', fontSize: 13 }}>Total Entries</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{transactions.length}</span>
            </div>
            <div className="flex justify-between" style={{ marginBottom: 6 }}>
              <span style={{ color: 'var(--green)', fontSize: 13 }}>Total IN</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>+{totalIn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--red)', fontSize: 13 }}>Total OUT</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)' }}>-{totalOut.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={onDone}
            style={{
              width: '100%', marginTop: 24, padding: '15px',
              borderRadius: 12, border: 'none',
              background: 'var(--accent)', color: '#000',
              fontSize: 15, fontWeight: 800,
              fontFamily: 'var(--font-baloo)', cursor: 'pointer',
            }}
          >
            Done — Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Header */}
      <div style={{ background: 'var(--s1)', borderBottom: '1px solid var(--border)', padding: '14px 16px' }}>
        <div className="flex items-center gap-3" style={{ maxWidth: 640, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--t2)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Day Checkout</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>Closing balances fill karein</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', maxWidth: 640, width: '100%', margin: '0 auto' }}>

        {/* Stats */}
        <div style={{
          background: 'var(--s1)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '14px 16px', marginBottom: 20,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase' }}>Entries</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{transactions.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase' }}>IN</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{totalIn.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase' }}>OUT</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{totalOut.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 14 }}>
          Fill Closing Balances
        </div>

        {ALL_ACCOUNTS.map(acc => {
          const exp = expected[acc as keyof OpeningBalances]
          const actual = closing[acc] !== undefined ? parseFloat(closing[acc] || '0') : null
          const hasMismatch = actual !== null && Math.abs(actual - exp) > 0.01

          return (
            <div
              key={acc}
              style={{
                background: 'var(--s1)',
                border: `1px solid ${hasMismatch ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 16, padding: 16, marginBottom: 10,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: ACCOUNT_COLORS[acc as Account],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0,
                }}>
                  {ACCOUNT_SHORT[acc as Account]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{ACCOUNT_LABELS[acc as Account]}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                    Expected: Rs. {exp.toLocaleString()}
                  </div>
                </div>
                {actual !== null && !hasMismatch && (
                  <CheckCircle size={18} color="var(--green)" />
                )}
                {hasMismatch && (
                  <XCircle size={18} color="var(--red)" />
                )}
              </div>
              <input
                type="number"
                placeholder="Actual closing balance..."
                value={closing[acc] || ''}
                onChange={e => setClosing(p => ({ ...p, [acc]: e.target.value }))}
                style={{
                  ...inputStyle,
                  borderColor: hasMismatch ? 'var(--red)' : 'var(--border)',
                }}
              />
              {hasMismatch && actual !== null && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  Farq: {(actual - exp) >= 0 ? '+' : ''}{(actual - exp).toLocaleString()}
                </div>
              )}
            </div>
          )
        })}

        <button
          onClick={handleSubmit}
          disabled={!allFilled}
          style={{
            width: '100%', marginTop: 8, marginBottom: 40, padding: '16px',
            borderRadius: 12, border: 'none',
            background: allFilled ? 'var(--accent)' : 'var(--s3)',
            color: allFilled ? '#000' : 'var(--t3)',
            fontSize: 16, fontWeight: 800,
            fontFamily: 'var(--font-baloo)', cursor: allFilled ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          Verify & Close Day
        </button>
      </div>
    </div>
  )
}
