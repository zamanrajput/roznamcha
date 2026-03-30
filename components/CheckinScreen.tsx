'use client'

import { useState } from 'react'
import { LogIn } from 'lucide-react'

interface CheckinScreenProps {
  onCheckin: (name: string) => void
}

export default function CheckinScreen({ onCheckin }: CheckinScreenProps) {
  const [name, setName] = useState('')
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })

  const inputStyle = {
    width: '100%',
    background: 'var(--s2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--text)',
    fontSize: 16,
    padding: '14px 16px',
    outline: 'none',
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      <div
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--s1)', border: '1px solid var(--border)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}
        className="animate-fade"
      >
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, var(--s2), var(--s3))', padding: '36px 28px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 52 }}>🏪</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>Daily Check-In</div>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
            {dateStr}
          </div>
          <div style={{ fontSize: 20, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 4 }}>
            {timeStr}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '28px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
            Operator Name
          </label>
          <input
            style={inputStyle}
            placeholder="Apna naam likhein..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onCheckin(name.trim())}
            autoFocus
          />

          <button
            onClick={() => name.trim() && onCheckin(name.trim())}
            disabled={!name.trim()}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '16px',
              borderRadius: 12,
              border: 'none',
              background: name.trim() ? 'var(--accent)' : 'var(--s3)',
              color: name.trim() ? '#000' : 'var(--t3)',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font-baloo)',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <LogIn size={18} />
            Check In & Start Day
          </button>
        </div>
      </div>
    </div>
  )
}
