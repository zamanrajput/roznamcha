'use client'

import { useState, useEffect } from 'react'
import { Delete } from 'lucide-react'
import { getSavedPin } from '@/lib/data'

interface PinScreenProps {
  onSuccess: () => void
}

export default function PinScreen({ onSuccess }: PinScreenProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [savedPin, setSavedPin] = useState('')

  useEffect(() => {
    getSavedPin().then(setSavedPin)
  }, [])

  const handleKey = (key: string) => {
    if (input.length >= 4) return
    const next = input + key
    setInput(next)
    setError('')
    if (next.length === 4) {
      setTimeout(() => {
        if (next === savedPin) {
          onSuccess()
        } else {
          setShake(true)
          setError('Wrong PIN — try again')
          setTimeout(() => { setInput(''); setShake(false) }, 600)
        }
      }, 150)
    }
  }

  const handleDel = () => {
    setInput(p => p.slice(0, -1))
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div
        className="w-full max-w-xs"
        style={{
          background: 'var(--s1)',
          border: '1px solid var(--border)',
          borderRadius: 24,
          padding: '40px 28px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{ fontSize: 44 }}>📱</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', letterSpacing: 1, marginTop: 6 }}>
            Bhatti Mobile Center
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>
            Roznamcha System
          </div>
        </div>

        {/* Dots */}
        <div className={`flex justify-center gap-3 mb-8 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                border: `2px solid ${i < input.length ? 'var(--accent)' : 'var(--border)'}`,
                background: i < input.length ? 'var(--accent)' : 'transparent',
                boxShadow: i < input.length ? '0 0 10px rgba(240,165,0,0.5)' : 'none',
                transition: 'all 0.15s',
              }}
            />
          ))}
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {['1','2','3','4','5','6','7','8','9'].map(n => (
            <button
              key={n}
              onClick={() => handleKey(n)}
              style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                fontWeight: 600,
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = 'var(--s3)'
                ;(e.target as HTMLElement).style.borderColor = 'var(--accent)'
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = 'var(--s2)'
                ;(e.target as HTMLElement).style.borderColor = 'var(--border)'
              }}
            >
              {n}
            </button>
          ))}
          {/* bottom row: empty, 0, del */}
          <div />
          <button
            onClick={() => handleKey('0')}
            style={{
              background: 'var(--s2)', border: '1px solid var(--border)',
              borderRadius: 14, color: 'var(--text)',
              fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600,
              padding: '16px', cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = 'var(--s3)'
              ;(e.target as HTMLElement).style.borderColor = 'var(--accent)'
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'var(--s2)'
              ;(e.target as HTMLElement).style.borderColor = 'var(--border)'
            }}
          >0</button>
          <button
            onClick={handleDel}
            style={{
              background: 'var(--s2)', border: '1px solid var(--border)',
              borderRadius: 14, color: 'var(--t2)',
              fontSize: 18, padding: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = 'var(--s3)'
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'var(--s2)'
            }}
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Error */}
        <div style={{ textAlign: 'center', marginTop: 16, height: 20, fontSize: 13, color: 'var(--red)' }}>
          {error}
        </div>
      </div>
    </div>
  )
}
