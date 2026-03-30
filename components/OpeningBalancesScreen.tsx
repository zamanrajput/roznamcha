'use client'

import { useState } from 'react'
import { Wallet, ChevronRight } from 'lucide-react'
import type { OpeningBalances, Account } from '@/lib/types'
import { ACCOUNT_LABELS, ACCOUNT_COLORS, ACCOUNT_SHORT, ALL_ACCOUNTS } from '@/lib/types'

interface OpeningBalancesScreenProps {
  onSubmit: (balances: OpeningBalances) => void
  operatorName: string
}

export default function OpeningBalancesScreen({ onSubmit, operatorName }: OpeningBalancesScreenProps) {
  const [balances, setBalances] = useState<Record<string, string>>({
    cash: '',
    jazzcash_business: '',
    jazz_retailer: '',
    zong_retailer: '',
    telenor_retailer: '',
    ufone_retailer: '',
  })

  const [jazzcashImg, setJazzcashImg] = useState<string | null>(null)

  const handleSubmit = () => {
    const parsed: OpeningBalances = {} as OpeningBalances
    for (const acc of ALL_ACCOUNTS) {
      parsed[acc as keyof OpeningBalances] = parseFloat(balances[acc] || '0') || 0
    }
    onSubmit(parsed)
  }

  const allFilled = ALL_ACCOUNTS.every(a => balances[a] !== '')

  const inputStyle = {
    width: '100%',
    background: 'var(--s3)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 16,
    padding: '12px 14px',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Header */}
      <div style={{ background: 'var(--s1)', borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>Opening Balances</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Welcome, {operatorName} — fill all balances to start</div>
      </div>

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto', maxWidth: 600, width: '100%', margin: '0 auto' }}>

        {/* JazzCash Business — special with image */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10, marginTop: 4 }}>
            JazzCash Business
          </div>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--jazz)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: 'white' }}>
                JCB
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>JazzCash Business</div>
                <div style={{ fontSize: 12, color: 'var(--t2)' }}>Check app balance & enter below</div>
              </div>
            </div>
            <input
              type="number"
              placeholder="Rs. 0.00"
              value={balances['jazzcash_business']}
              onChange={e => setBalances(p => ({ ...p, jazzcash_business: e.target.value }))}
              style={inputStyle}
            />
            {/* Image upload proof */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 6 }}>
                Screenshot proof (optional)
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--s3)', border: '1px dashed var(--border)',
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                fontSize: 13, color: 'var(--t2)',
              }}>
                📷 Upload screenshot
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = ev => setJazzcashImg(ev.target?.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
              </label>
              {jazzcashImg && (
                <img src={jazzcashImg} alt="proof" style={{ marginTop: 8, width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover' }} />
              )}
            </div>
          </div>
        </div>

        {/* Cash */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10, marginTop: 20 }}>
          Cash in Shop
        </div>
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 10 }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} color="#000" />
            </div>
            <div style={{ fontWeight: 700 }}>Cash</div>
          </div>
          <input
            type="number"
            placeholder="Rs. 0.00"
            value={balances['cash']}
            onChange={e => setBalances(p => ({ ...p, cash: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* Retailer SIMs */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10, marginTop: 20 }}>
          Retailer SIM Balances
        </div>
        {(['jazz_retailer', 'zong_retailer', 'telenor_retailer', 'ufone_retailer'] as Account[]).map(acc => (
          <div
            key={acc}
            style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 10 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: ACCOUNT_COLORS[acc],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 11, color: 'white',
              }}>
                {ACCOUNT_SHORT[acc]}
              </div>
              <div style={{ fontWeight: 700 }}>{ACCOUNT_LABELS[acc]}</div>
            </div>
            <input
              type="number"
              placeholder="Rs. 0.00"
              value={balances[acc]}
              onChange={e => setBalances(p => ({ ...p, [acc]: e.target.value }))}
              style={inputStyle}
            />
          </div>
        ))}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          style={{
            width: '100%', marginTop: 16, padding: '16px',
            borderRadius: 14, border: 'none',
            background: 'var(--accent)',
            color: '#000', fontSize: 16, fontWeight: 800,
            fontFamily: 'var(--font-baloo)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: allFilled ? 1 : 0.5,
          }}
          disabled={!allFilled}
        >
          Start Day <ChevronRight size={20} />
        </button>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
