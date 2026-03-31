'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Session, OpeningBalances } from '@/lib/types'
import { getTodaySession, createSession, syncLocalToCloud } from '@/lib/data'

const PinScreen = dynamic(() => import('@/components/PinScreen'), { ssr: false })
const CheckinScreen = dynamic(() => import('@/components/CheckinScreen'), { ssr: false })
const OpeningBalancesScreen = dynamic(() => import('@/components/OpeningBalancesScreen'), { ssr: false })
const DashboardScreen = dynamic(() => import('@/components/DashboardScreen'), { ssr: false })
const CheckoutScreen = dynamic(() => import('@/components/CheckoutScreen'), { ssr: false })
const BillsScreen = dynamic(() => import('@/components/BillsScreen'), { ssr: false })

type AppState = 'loading' | 'pin' | 'checkin' | 'balances' | 'dashboard' | 'checkout' | 'bills'

export default function Home() {
  const [state, setState] = useState<AppState>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [operatorName, setOperatorName] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        // One-time sync of any local data to cloud
        syncLocalToCloud()
        const existing = await getTodaySession()
        if (existing && existing.status === 'open') {
          setSession(existing)
        }
      } catch {}
      setState('pin')
    }
    init()
  }, [])

  const handlePinSuccess = async () => {
    const existing = await getTodaySession()
    if (existing && existing.status === 'open') {
      setSession(existing)
      setState('dashboard')
    } else {
      setState('checkin')
    }
  }

  const handleCheckin = (name: string) => {
    setOperatorName(name)
    setState('balances')
  }

  const handleBalancesSubmit = async (balances: OpeningBalances) => {
    const newSession = await createSession(operatorName, balances)
    setSession(newSession)
    setState('dashboard')
  }

  const handleDone = () => {
    setSession(null)
    setOperatorName('')
    setState('pin')
  }

  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 44 }}>📱</div>
        <div style={{ fontSize: 14, color: 'var(--t2)' }}>Loading Roznamcha...</div>
      </div>
    )
  }

  return (
    <>
      {state === 'pin' && <PinScreen onSuccess={handlePinSuccess} />}
      {state === 'checkin' && <CheckinScreen onCheckin={handleCheckin} />}
      {state === 'balances' && <OpeningBalancesScreen onSubmit={handleBalancesSubmit} operatorName={operatorName} />}
      {state === 'dashboard' && session && (
        <DashboardScreen
          session={session}
          onCheckout={() => setState('checkout')}
          onBills={() => setState('bills')}
        />
      )}
      {state === 'checkout' && session && (
        <CheckoutScreen
          session={session}
          onDone={handleDone}
          onBack={() => setState('dashboard')}
        />
      )}
      {state === 'bills' && <BillsScreen onBack={() => setState('dashboard')} />}
    </>
  )
}