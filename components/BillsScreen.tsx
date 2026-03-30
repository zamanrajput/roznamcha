'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, Trash2, CheckCircle, Bell, X } from 'lucide-react'
import type { Bill, BillType } from '@/lib/types'
import { BILL_TYPE_LABELS } from '@/lib/types'
import { getAllBills, addBill, markBillPaid, deleteBill, markReminderSent } from '@/lib/data'

interface BillsScreenProps {
  onBack: () => void
}

const BILL_TYPES: BillType[] = ['wapda', 'sngpl', 'ptcl', 'sui_gas', 'other']

export default function BillsScreen({ onBack }: BillsScreenProps) {
  const [bills, setBills] = useState<Bill[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ customer_name: '', bill_type: 'wapda' as BillType, amount: '', due_date: '' })

  const load = useCallback(async () => {
    const b = await getAllBills()
    setBills(b)
  }, [])

  useEffect(() => { load() }, [load])

  // Check reminders every minute
  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date()
      for (const bill of bills) {
        if (bill.reminder_sent || bill.paid) continue
        const due = new Date(bill.due_date + 'T23:59:00')
        const diffMs = due.getTime() - now.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        if (diffHours <= 2 && diffHours >= 0) {
          // Browser notification
          if (Notification.permission === 'granted') {
            new Notification('⚠️ Bill Due Soon!', {
              body: `${bill.customer_name} — ${BILL_TYPE_LABELS[bill.bill_type]} — Rs. ${bill.amount}`,
              icon: '/favicon.ico',
            })
          }
          // Email notification
          try {
            await fetch('/api/send-reminder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerName: bill.customer_name,
                billType: BILL_TYPE_LABELS[bill.bill_type],
                amount: bill.amount,
                dueDate: bill.due_date,
              }),
            })
          } catch (e) { /* silent fail */ }
          await markReminderSent(bill.id)
        }
      }
    }

    const id = setInterval(checkReminders, 60000)
    checkReminders()
    return () => clearInterval(id)
  }, [bills])

  // Request notification permission
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const handleAdd = async () => {
    if (!form.customer_name || !form.amount || !form.due_date) return
    await addBill({
      customer_name: form.customer_name,
      bill_type: form.bill_type,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
    })
    setForm({ customer_name: '', bill_type: 'wapda', amount: '', due_date: '' })
    setShowAdd(false)
    load()
  }

  const getDueStatus = (dueDate: string) => {
    const now = new Date()
    const due = new Date(dueDate + 'T23:59:00')
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffMs < 0) return { label: 'Overdue!', color: 'var(--red)', bg: 'var(--red-dim)' }
    if (diffDays <= 1) return { label: 'Due Today!', color: 'var(--red)', bg: 'var(--red-dim)' }
    if (diffDays <= 3) return { label: `${diffDays}d left`, color: '#f0a500', bg: 'rgba(240,165,0,0.12)' }
    return { label: `${diffDays}d left`, color: 'var(--t2)', bg: 'var(--s3)' }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--s3)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 15,
    padding: '12px 14px',
    outline: 'none',
    fontFamily: 'var(--font-baloo)',
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Header */}
      <div style={{ background: 'var(--s1)', borderBottom: '1px solid var(--border)', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="flex items-center gap-3" style={{ maxWidth: 640, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--t2)' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Bills</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>Due date reminders active</div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: 10,
              padding: '8px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, color: '#000',
            }}
          >
            <Plus size={16} /> Add Bill
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', maxWidth: 640, width: '100%', margin: '0 auto' }}>
        {bills.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>
            <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div style={{ fontSize: 14 }}>Koi pending bill nahi</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bills.map(bill => {
            const status = getDueStatus(bill.due_date)
            return (
              <div
                key={bill.id}
                className="animate-fade"
                style={{
                  background: 'var(--s1)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '16px',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{bill.customer_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2 }}>
                      {BILL_TYPE_LABELS[bill.bill_type]}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                        Rs. {bill.amount.toLocaleString()}
                      </span>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: status.bg, color: status.color,
                      }}>
                        {status.label}
                      </span>
                      {bill.reminder_sent && (
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'var(--green-dim)', color: 'var(--green)' }}>
                          Reminded ✓
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      Due: {new Date(bill.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={async () => { await markBillPaid(bill.id); load() }}
                      title="Mark paid"
                      style={{ background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--green)' }}
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={async () => { await deleteBill(bill.id); load() }}
                      title="Delete"
                      style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--red)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Bill Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div className="animate-pop" style={{
            width: '100%', maxWidth: 540,
            background: 'var(--s1)', border: '1px solid var(--border)',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px',
          }}>
            <div className="flex items-center justify-between mb-6">
              <div style={{ fontSize: 17, fontWeight: 800 }}>Add Bill</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'var(--s3)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--t2)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Customer Name</div>
                <input style={inputStyle} placeholder="Customer ka naam..." value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Bill Type</div>
                <select
                  value={form.bill_type}
                  onChange={e => setForm(p => ({ ...p, bill_type: e.target.value as BillType }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {BILL_TYPES.map(t => <option key={t} value={t}>{BILL_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Amount (Rs.)</div>
                <input type="number" style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontWeight: 600 }} placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Due Date</div>
                <input type="date" style={inputStyle} value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <button
                onClick={handleAdd}
                disabled={!form.customer_name || !form.amount || !form.due_date}
                style={{
                  width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                  background: (form.customer_name && form.amount && form.due_date) ? 'var(--accent)' : 'var(--s3)',
                  color: (form.customer_name && form.amount && form.due_date) ? '#000' : 'var(--t3)',
                  fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-baloo)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Plus size={18} /> Save Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
