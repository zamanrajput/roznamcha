'use client'

import { idbGet, idbPut, idbGetAll, idbGetByIndex, idbDelete } from './idb'
import { supabase } from './supabase'
import type { Session, Transaction, Bill, OpeningBalances } from './types'

const isOnline = () => typeof navigator !== 'undefined' && navigator.onLine

// ─── PIN ──────────────────────────────────────────────────────────────────────
export async function getSavedPin(): Promise<string> {
  const setting = await idbGet<{ key: string; value: string }>('settings', 'pin')
  if (setting) return setting.value
  await idbPut('settings', { key: 'pin', value: '5858' })
  return '5858'
}

export async function savePin(pin: string): Promise<void> {
  await idbPut('settings', { key: 'pin', value: pin })
}

// ─── SESSIONS ─────────────────────────────────────────────────────────────────
export async function getTodaySession(): Promise<Session | null> {
  const today = new Date().toISOString().split('T')[0]

  // Always try Supabase first if online — so all devices stay in sync
  if (isOnline()) {
    const { data } = await supabase.from('sessions').select('*').eq('date', today).maybeSingle()
    if (data) {
      const session = { ...data, id: data.date } as Session
      await idbPut('sessions', session)
      return session
    }
  }

  // Fallback to local
  const local = await idbGet<Session>('sessions', today)
  return local || null
}

export async function createSession(operatorName: string, openingBalances: OpeningBalances): Promise<Session> {
  const today = new Date().toISOString().split('T')[0]
  const session: Session = {
    id: today,
    date: today,
    operator_name: operatorName,
    checkin_time: new Date().toISOString(),
    status: 'open',
    opening_balances: openingBalances,
  }
  await idbPut('sessions', session)

  if (isOnline()) {
    const { error } = await supabase.from('sessions').upsert(session)
    if (error) console.error('Session save error:', error)
  }
  return session
}

export async function closeSession(
  sessionId: string,
  closingBalances: OpeningBalances,
  checksumPassed: boolean,
  explanation?: string
): Promise<void> {
  const session = await idbGet<Session>('sessions', sessionId)
  if (!session) return
  const updated = {
    ...session,
    status: 'closed' as const,
    checkout_time: new Date().toISOString(),
    closing_balances: closingBalances,
    checksum_passed: checksumPassed,
    checksum_explanation: explanation || null,
  }
  await idbPut('sessions', updated)

  if (isOnline()) {
    await supabase.from('sessions').update({
      status: 'closed',
      checkout_time: updated.checkout_time,
      closing_balances: closingBalances,
      checksum_passed: checksumPassed,
      checksum_explanation: explanation || null,
    }).eq('date', sessionId)
  }
}

export async function getAllSessions(): Promise<Session[]> {
  if (isOnline()) {
    const { data } = await supabase.from('sessions').select('*').order('date', { ascending: false }).limit(30)
    if (data) {
      for (const s of data) await idbPut('sessions', { ...s, id: s.date })
      return data.map(s => ({ ...s, id: s.date })) as Session[]
    }
  }
  const sessions = await idbGetAll<Session>('sessions')
  return sessions.sort((a, b) => b.date.localeCompare(a.date))
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
export async function getSessionTransactions(sessionId: string): Promise<Transaction[]> {
  // Always fetch from Supabase if online — ensures all devices see same data
  if (isOnline()) {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('session_id', sessionId)
      .order('time', { ascending: false })

    if (data && data.length > 0) {
      // Sync to local IDB
      for (const tx of data) await idbPut('transactions', tx)
      return data as Transaction[]
    }
  }

  // Fallback to local
  const txs = await idbGetByIndex<Transaction>('transactions', 'session_id', sessionId)
  return txs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}

export async function syncAllToCloud(): Promise<{ sessions: number; transactions: number }> {
  if (!isOnline()) throw new Error('Internet nahi hai')

  // Sync sessions
  const localSessions = await idbGetAll<Session>('sessions')
  let syncedSessions = 0
  for (const session of localSessions) {
    const { error } = await supabase.from('sessions').upsert({ ...session, id: session.date })
    if (!error) syncedSessions++
  }

  // Sync transactions
  const localTxs = await idbGetAll<Transaction>('transactions')
  let syncedTxs = 0
  if (localTxs.length > 0) {
    // Get existing IDs from Supabase to avoid duplicates
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .in('id', localTxs.map(t => t.id))

    const existingIds = new Set((existing || []).map((e: { id: string }) => e.id))
    const newTxs = localTxs.filter(t => !existingIds.has(t.id))

    if (newTxs.length > 0) {
      const { error } = await supabase.from('transactions').insert(newTxs)
      if (!error) syncedTxs = newTxs.length
    }
  }

  return { sessions: syncedSessions, transactions: syncedTxs }
}

export async function addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  const newTx: Transaction = { ...tx, id: crypto.randomUUID() }
  await idbPut('transactions', newTx)
  if (isOnline()) {
    await supabase.from('transactions').insert(newTx)
  }
  return newTx
}

export async function addTransactions(txs: Omit<Transaction, 'id'>[]): Promise<Transaction[]> {
  const newTxs: Transaction[] = txs.map(tx => ({ ...tx, id: crypto.randomUUID() }))
  for (const tx of newTxs) await idbPut('transactions', tx)

  if (isOnline()) {
    // Ensure session exists in Supabase first
    if (newTxs.length > 0) {
      const sessionId = newTxs[0].session_id
      const session = await idbGet<Session>('sessions', sessionId)
      if (session) {
        await supabase.from('sessions').upsert(session)
      }
    }
    const { error } = await supabase.from('transactions').insert(newTxs)
    if (error) console.error('Transaction insert error:', error)
  }
  return newTxs
}

export async function deleteTransaction(id: string): Promise<void> {
  await idbDelete('transactions', id)
  if (isOnline()) {
    await supabase.from('transactions').delete().eq('id', id)
  }
}

// ─── BILLS ────────────────────────────────────────────────────────────────────
export async function getAllBills(): Promise<Bill[]> {
  if (isOnline()) {
    const { data } = await supabase.from('bills').select('*').eq('paid', false)
    if (data) {
      for (const b of data) await idbPut('bills', b)
      return (data as Bill[]).sort((a, b) => a.due_date.localeCompare(b.due_date))
    }
  }
  const bills = await idbGetAll<Bill>('bills')
  return bills.filter(b => !b.paid).sort((a, b) => a.due_date.localeCompare(b.due_date))
}

export async function addBill(bill: Omit<Bill, 'id' | 'reminder_sent' | 'paid' | 'created_at'>): Promise<Bill> {
  const newBill: Bill = {
    ...bill,
    id: crypto.randomUUID(),
    reminder_sent: false,
    paid: false,
    created_at: new Date().toISOString(),
  }
  await idbPut('bills', newBill)
  if (isOnline()) {
    await supabase.from('bills').insert(newBill)
  }
  return newBill
}

export async function markBillPaid(id: string): Promise<void> {
  const bill = await idbGet<Bill>('bills', id)
  if (!bill) return
  await idbPut('bills', { ...bill, paid: true })
  if (isOnline()) {
    await supabase.from('bills').update({ paid: true }).eq('id', id)
  }
}

export async function deleteBill(id: string): Promise<void> {
  await idbDelete('bills', id)
  if (isOnline()) {
    await supabase.from('bills').delete().eq('id', id)
  }
}

export async function markReminderSent(id: string): Promise<void> {
  const bill = await idbGet<Bill>('bills', id)
  if (!bill) return
  await idbPut('bills', { ...bill, reminder_sent: true })
  if (isOnline()) {
    await supabase.from('bills').update({ reminder_sent: true }).eq('id', id)
  }
}

// ─── TWO-WAY SYNC ─────────────────────────────────────────────────────────────

// Push all local-only data to Supabase
export async function pushLocalToCloud(): Promise<void> {
  if (!isOnline()) return
  try {
    // Sessions
    const localSessions = await idbGetAll<Session>('sessions')
    for (const session of localSessions) {
      await supabase.from('sessions').upsert(session, { onConflict: 'id' })
    }

    // Transactions — only push ones not in cloud
    const localTxs = await idbGetAll<Transaction>('transactions')
    if (localTxs.length > 0) {
      const { data: existing } = await supabase
        .from('transactions').select('id')
        .in('id', localTxs.map(t => t.id))
      const existingSet = new Set((existing || []).map((r: { id: string }) => r.id))
      const toUpload = localTxs.filter(t => !existingSet.has(t.id))
      for (let i = 0; i < toUpload.length; i += 50) {
        await supabase.from('transactions').insert(toUpload.slice(i, i + 50))
      }
    }

    // Bills
    const localBills = await idbGetAll<Bill>('bills')
    for (const bill of localBills) {
      await supabase.from('bills').upsert(bill, { onConflict: 'id' })
    }
  } catch (e) {
    console.error('Push to cloud error:', e)
  }
}

// Pull all cloud data into local IDB
export async function pullFromCloud(): Promise<void> {
  if (!isOnline()) return
  try {
    // Sessions
    const { data: sessions } = await supabase.from('sessions').select('*')
    if (sessions) {
      for (const s of sessions) await idbPut('sessions', { ...s, id: s.date })
    }

    // Transactions — last 90 days
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const { data: txs } = await supabase
      .from('transactions').select('*')
      .gte('date', since.toISOString().split('T')[0])
    if (txs) {
      for (const tx of txs) await idbPut('transactions', tx)
    }

    // Bills
    const { data: bills } = await supabase.from('bills').select('*').eq('paid', false)
    if (bills) {
      for (const b of bills) await idbPut('bills', b)
    }
  } catch (e) {
    console.error('Pull from cloud error:', e)
  }
}

// Full two-way sync — call on app load and when internet comes back
export async function syncLocalToCloud(): Promise<void> {
  if (!isOnline()) return
  await pushLocalToCloud()
  await pullFromCloud()
  console.log('✓ Two-way sync complete')
}

// Register online event — auto sync when internet comes back
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Internet back — syncing...')
    syncLocalToCloud()
  })
}

// ─── CHECKSUM ─────────────────────────────────────────────────────────────────
export function calculateExpectedClosing(
  opening: OpeningBalances,
  transactions: Transaction[]
): OpeningBalances {
  const result = { ...opening }
  for (const tx of transactions) {
    const acc = tx.account as keyof OpeningBalances
    if (tx.direction === 'in') {
      result[acc] = (result[acc] || 0) + tx.amount
    } else {
      result[acc] = (result[acc] || 0) - tx.amount
    }
  }
  return result
}