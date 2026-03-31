'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { Account, TransactionType, Direction, Transaction, BillType } from '@/lib/types'
import { ACCOUNT_LABELS, ACCOUNT_COLORS, ACCOUNT_SHORT, TYPE_LABELS, TYPE_ICONS, BILL_TYPE_LABELS } from '@/lib/types'
import { addBill } from '@/lib/data'

interface AddTransactionModalProps {
  onAdd: (entries: Omit<Transaction, 'id'>[]) => void
  onClose: () => void
  sessionId: string
  sessionDate: string
}

const SIM_ACCOUNTS: Account[] = ['jazz_retailer', 'zong_retailer', 'telenor_retailer', 'ufone_retailer']
const NEEDS_SIM: TransactionType[] = ['load', 'package']
const NEEDS_FEE: TransactionType[] = ['withdrawal', 'send_money']
const NEEDS_SIM_COST: TransactionType[] = ['load', 'package']
const NEEDS_COMMISSION: TransactionType[] = ['bill_payment']
const FLEXIBLE_ACCOUNT: TransactionType[] = ['accessories_repair', 'other']
const ALL_TYPES: TransactionType[] = [
  'load', 'package', 'withdrawal', 'send_money',
  'bill_payment', 'data', 'accessories_repair',
  'cash_to_jazzcash', 'jazzcash_to_cash', 'internal', 'other',
]

type InternalSubType = 'ghar_se_laya' | 'ghar_wapas' | 'personal_expense' | 'staff_payment'

const INTERNAL_SUBTYPES: { key: InternalSubType; label: string; icon: string; direction: Direction }[] = [
  { key: 'ghar_se_laya',      label: 'Ghar se laya',     icon: '🏠', direction: 'in' },
  { key: 'ghar_wapas',        label: 'Ghar wapas diya',  icon: '↩️', direction: 'out' },
  { key: 'personal_expense',  label: 'Personal expense', icon: '👤', direction: 'out' },
  { key: 'staff_payment',     label: 'Staff payment',    icon: '👷', direction: 'out' },
]

const FEE_RATES: Record<string, number> = {
  withdrawal: 20,
  send_money: 10,
}

function calcAutoFee(type: string, amount: string): string {
  const amt = parseFloat(amount || '0')
  if (!amt || !FEE_RATES[type]) return ''
  return String(Math.round((amt * FEE_RATES[type]) / 1000))
}

export default function AddTransactionModal({ onAdd, onClose, sessionId, sessionDate }: AddTransactionModalProps) {
  const [type, setType] = useState<TransactionType | ''>('')
  const [simAccount, setSimAccount] = useState<Account>('jazz_retailer')
  const [flexAccount, setFlexAccount] = useState<Account>('cash')
  const [flexDir, setFlexDir] = useState<Direction>('in')
  const [internalSubType, setInternalSubType] = useState<InternalSubType>('ghar_se_laya')
  const [amount, setAmount] = useState('')
  const [simCost, setSimCost] = useState('')
  const [fee, setFee] = useState('')
  const [commission, setCommission] = useState('')
  const [description, setDescription] = useState('')
  // Bill specific fields
  const [billCustomer, setBillCustomer] = useState('')
  const [billType, setBillType] = useState<BillType>('wapda')
  const [billRef, setBillRef] = useState('')
  const [billDueDate, setBillDueDate] = useState('')

  const now = new Date().toISOString()
  const groupId = crypto.randomUUID()

  const canSubmit = (() => {
    if (!type || !amount || parseFloat(amount) <= 0) return false
    if (NEEDS_SIM_COST.includes(type as TransactionType) && (!simCost || parseFloat(simCost) <= 0)) return false
    if (NEEDS_COMMISSION.includes(type as TransactionType) && commission !== '' && parseFloat(commission) < 0) return false
    if (type === 'bill_payment' && !billCustomer) return false
    return true
  })()

  const buildEntries = (): Omit<Transaction, 'id'>[] => {
    if (!type) return []
    const amt = parseFloat(amount || '0')
    const simAmt = parseFloat(simCost || '0')
    const feeAmt = parseFloat(fee || '0')
    const commAmt = parseFloat(commission || '0')
    const base = { session_id: sessionId, date: sessionDate, time: now, type: type as TransactionType, description, group_id: groupId }

    switch (type) {
      case 'load':
      case 'package':
        return [
          { ...base, account: 'cash', direction: 'in', amount: amt, is_base: false, description: `${description || TYPE_LABELS[type]} — Customer se liya` },
          { ...base, account: simAccount, direction: 'out', amount: simAmt, is_base: true, description: `${description || TYPE_LABELS[type]} — SIM cost` },
        ]

      case 'withdrawal':
        return [
          { ...base, account: 'jazzcash_business', direction: 'in', amount: amt + feeAmt, description: description || 'Withdrawal — JazzCash IN (with fee)' },
          { ...base, account: 'cash', direction: 'out', amount: amt, description: description || 'Withdrawal — Cash OUT' },
          ...(feeAmt > 0 ? [{ ...base, account: 'cash' as Account, direction: 'in' as Direction, amount: feeAmt, is_commission: true, description: 'Withdrawal Fee' }] : []),
        ]

      case 'send_money':
        return [
          { ...base, account: 'cash', direction: 'in', amount: amt, description: description || 'Send Money — Cash IN' },
          { ...base, account: 'jazzcash_business', direction: 'out', amount: amt, description: description || 'Send Money — JazzCash OUT' },
          ...(feeAmt > 0 ? [{ ...base, account: 'cash' as Account, direction: 'in' as Direction, amount: feeAmt, is_commission: true, description: 'Send Money Fee' }] : []),
        ]

      case 'bill_payment':
        return [
          { ...base, account: 'cash', direction: 'in', amount: amt, is_base: true, description: `${description || 'Bill'} — Base amount` },
          ...(commAmt > 0 ? [{ ...base, account: 'cash' as Account, direction: 'in' as Direction, amount: commAmt, is_commission: true, description: `${description || 'Bill'} — Commission` }] : []),
        ]

      case 'data':
        return [
          { ...base, account: 'cash', direction: 'in', amount: amt, is_commission: true, description: description || 'Data fee' },
        ]

      case 'internal': {
        const sub = INTERNAL_SUBTYPES.find(s => s.key === internalSubType)!
        return [
          { ...base, account: 'cash', direction: sub.direction, amount: amt, description: description || sub.label },
        ]
      }

      case 'accessories_repair':
      case 'other':
        return [
          { ...base, account: flexAccount, direction: flexDir, amount: amt, description },
        ]

      case 'cash_to_jazzcash':
        return [
          { ...base, account: 'cash', direction: 'out', amount: amt, description: description || 'Cash → JazzCash' },
          { ...base, account: 'jazzcash_business', direction: 'in', amount: amt, description: description || 'Cash → JazzCash' },
        ]

      case 'jazzcash_to_cash':
        return [
          { ...base, account: 'jazzcash_business', direction: 'out', amount: amt, description: description || 'JazzCash → Cash' },
          { ...base, account: 'cash', direction: 'in', amount: amt, description: description || 'JazzCash → Cash' },
        ]

      default:
        return []
    }
  }

  const preview = buildEntries()
  const profit = (type === 'load' || type === 'package')
    ? (parseFloat(amount || '0') - parseFloat(simCost || '0'))
    : null

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

  const label = (text: string, sub?: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: 8 }}>
      {text} {sub && <span style={{ color: 'var(--t3)', fontWeight: 400, textTransform: 'none' as const }}>{sub}</span>}
    </div>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-pop"
        style={{
          width: '100%', maxWidth: 540,
          background: 'var(--s1)', border: '1px solid var(--border)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 36px',
          maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div style={{ fontSize: 18, fontWeight: 800 }}>New Entry</div>
          <button onClick={onClose} style={{ background: 'var(--s3)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--t2)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Type grid */}
        {label('Type')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {ALL_TYPES.map(t => (
            <button key={t} onClick={() => { setType(t); setAmount(''); setSimCost(''); setFee(''); setCommission('') }}
              style={{
                padding: '10px 6px', borderRadius: 10,
                border: `1px solid ${type === t ? 'var(--accent)' : 'var(--border)'}`,
                background: type === t ? 'var(--accent-dim)' : 'var(--s2)',
                color: type === t ? 'var(--accent)' : 'var(--t2)',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-baloo)',
                cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', lineHeight: 1.3,
              }}
            >
              <div style={{ fontSize: 16, marginBottom: 3 }}>{TYPE_ICONS[t]}</div>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* SIM selector */}
        {type && NEEDS_SIM.includes(type as TransactionType) && (
          <div style={{ marginBottom: 16 }} className="animate-fade">
            {label('SIM')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {SIM_ACCOUNTS.map(acc => (
                <button key={acc} onClick={() => setSimAccount(acc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                    border: `1px solid ${simAccount === acc ? 'var(--accent)' : 'var(--border)'}`,
                    background: simAccount === acc ? 'var(--accent-dim)' : 'var(--s2)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: ACCOUNT_COLORS[acc], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {ACCOUNT_SHORT[acc]}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: simAccount === acc ? 'var(--accent)' : 'var(--text)' }}>
                    {ACCOUNT_LABELS[acc]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Flexible account selector */}
        {type && FLEXIBLE_ACCOUNT.includes(type as TransactionType) && (
          <div style={{ marginBottom: 16 }} className="animate-fade">
            {label('Payment Via')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {(['cash', 'jazzcash_business'] as Account[]).map(acc => (
                <button key={acc} onClick={() => setFlexAccount(acc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10,
                    border: `1px solid ${flexAccount === acc ? 'var(--accent)' : 'var(--border)'}`,
                    background: flexAccount === acc ? 'var(--accent-dim)' : 'var(--s2)', cursor: 'pointer',
                  }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: ACCOUNT_COLORS[acc], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: 'white' }}>
                    {ACCOUNT_SHORT[acc]}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: flexAccount === acc ? 'var(--accent)' : 'var(--text)' }}>{ACCOUNT_LABELS[acc]}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['in', 'out'] as Direction[]).map(d => (
                <button key={d} onClick={() => setFlexDir(d)}
                  style={{
                    padding: '9px', borderRadius: 10,
                    border: `1px solid ${flexDir === d ? (d === 'in' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                    background: flexDir === d ? (d === 'in' ? 'var(--green-dim)' : 'var(--red-dim)') : 'var(--s2)',
                    color: flexDir === d ? (d === 'in' ? 'var(--green)' : 'var(--red)') : 'var(--t2)',
                    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-baloo)', cursor: 'pointer',
                  }}>
                  {d === 'in' ? '↑ Money IN' : '↓ Money OUT'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Internal sub-type selector */}
        {type === 'internal' && (
          <div style={{ marginBottom: 16 }} className="animate-fade">
            {label('Sub Type')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {INTERNAL_SUBTYPES.map(sub => (
                <button
                  key={sub.key}
                  onClick={() => setInternalSubType(sub.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px', borderRadius: 12,
                    border: `1px solid ${internalSubType === sub.key ? (sub.direction === 'in' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                    background: internalSubType === sub.key ? (sub.direction === 'in' ? 'var(--green-dim)' : 'var(--red-dim)') : 'var(--s2)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{sub.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: internalSubType === sub.key ? (sub.direction === 'in' ? 'var(--green)' : 'var(--red)') : 'var(--text)' }}>
                      {sub.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                      Cash {sub.direction === 'in' ? '↑ IN' : '↓ OUT'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount fields */}
        {type && (
          <div className="animate-fade">
            {/* Customer amount */}
            <div style={{ marginBottom: 14 }}>
              {label(
                type === 'load' || type === 'package' ? 'Customer se liya (Rs.)' :
                type === 'withdrawal' ? 'Customer ko dena (Rs.)' :
                type === 'send_money' ? 'Customer se liya (Rs.)' :
                type === 'bill_payment' ? 'Bill Amount (Rs.)' :
                type === 'data' ? 'Fee (Rs.)' : 'Amount (Rs.)'
              )}
              <input type="number" placeholder="0" value={amount}
                onChange={e => {
                  setAmount(e.target.value)
                  if (NEEDS_FEE.includes(type as TransactionType)) {
                    setFee(calcAutoFee(type as string, e.target.value))
                  }
                }}
                style={{ ...inputStyle, fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 700 }} autoFocus />
            </div>

            {/* SIM cost for load/package */}
            {NEEDS_SIM_COST.includes(type as TransactionType) && (
              <div style={{ marginBottom: 14 }}>
                {label('SIM Cost (Rs.)', '— actual amount')}
                <input type="number" placeholder="0" value={simCost} onChange={e => setSimCost(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                {profit !== null && parseFloat(amount) > 0 && parseFloat(simCost) > 0 && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 8,
                    background: profit >= 0 ? 'var(--green-dim)' : 'var(--red-dim)',
                    color: profit >= 0 ? 'var(--green)' : 'var(--red)',
                    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  }}>
                    Profit: {profit >= 0 ? '+' : ''}Rs. {profit.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Fee for withdrawal/send_money */}
            {NEEDS_FEE.includes(type as TransactionType) && (
              <div style={{ marginBottom: 14 }}>
                {label('Fee (Rs.)', '— auto calculated, editable')}
                <input type="number" placeholder="0" value={fee} onChange={e => setFee(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                {parseFloat(amount || '0') > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--green-dim)', color: 'var(--green)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      Fee: Rs. {parseFloat(fee || '0').toLocaleString()}
                    </div>
                    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {type === 'withdrawal' ? 'Customer bheje ga' : 'Total OUT'}: Rs. {(parseFloat(amount || '0') + parseFloat(fee || '0')).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Commission for bill_payment */}
            {NEEDS_COMMISSION.includes(type as TransactionType) && (
              <div style={{ marginBottom: 14 }}>
                {label('Commission (Rs.)', '— tumhari kamai')}
                <input type="number" placeholder="0" value={commission} onChange={e => setCommission(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
              </div>
            )}

            {/* Bill specific fields */}
            {type === 'bill_payment' && (
              <div className="animate-fade">
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
                  🧾 Bill Details
                </div>
                <div style={{ marginBottom: 12 }}>
                  {label('Customer Name')}
                  <input type="text" placeholder="Customer ka naam..." value={billCustomer}
                    onChange={e => setBillCustomer(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  {label('Bill Type')}
                  <select value={billType} onChange={e => setBillType(e.target.value as BillType)}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {(['wapda', 'sngpl', 'ptcl', 'sui_gas', 'other'] as BillType[]).map(t => (
                      <option key={t} value={t}>{BILL_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  {label('Reference No', '(optional)')}
                  <input type="text" placeholder="e.g. 1234567890" value={billRef}
                    onChange={e => setBillRef(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  {label('Due Date', '(optional)')}
                  <input type="date" value={billDueDate}
                    onChange={e => setBillDueDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              {label('Note', '(optional)')}
              <input type="text" placeholder="koi detail..." value={description} onChange={e => setDescription(e.target.value)}
                style={inputStyle} />
            </div>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }} className="animate-fade">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
              Entry Preview
            </div>
            {preview.map((e, i) => (
              <div key={i} className="flex items-center justify-between" style={{ marginBottom: i < preview.length - 1 ? 8 : 0 }}>
                <div className="flex items-center gap-2">
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: ACCOUNT_COLORS[e.account], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: 'white' }}>
                    {ACCOUNT_SHORT[e.account]}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{ACCOUNT_LABELS[e.account]}</div>
                    {e.is_commission && <div style={{ fontSize: 10, color: 'var(--accent)' }}>Commission / Fee</div>}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: e.direction === 'in' ? 'var(--green)' : 'var(--red)' }}>
                  {e.direction === 'in' ? '+' : '-'}Rs. {e.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={async () => {
            // If bill_payment — also save to bills list
            if (type === 'bill_payment' && billCustomer) {
              await addBill({
                customer_name: billCustomer,
                bill_type: billType,
                amount: parseFloat(amount),
                due_date: billDueDate || sessionDate,
                reference_no: billRef || undefined,
              })
            }
            onAdd(buildEntries())
          }}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '15px', borderRadius: 12, border: 'none',
            background: canSubmit ? 'var(--accent)' : 'var(--s3)',
            color: canSubmit ? '#000' : 'var(--t3)',
            fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-baloo)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <Plus size={18} /> Add Entry
        </button>
      </div>
    </div>
  )
}