'use client'

import { idbGet, idbPut, idbGetAll, idbGetByIndex, idbDelete } from './idb'
import { supabase } from './supabase'
import type { Session, Transaction, Bill, OpeningBalances } from './types'

const isOnline = () => typeof navigator !== 'undefined' && navigator.onLine

// ─── PIN ──────────────────────────────────────────────────────────────────────
export async function getSavedPin(): Promise<string> {
  const setting = await idbGet<{ key: string; value: string }>('settings', 'pin')
  if (setting) return setting.value
  // default pin
  await idbPut('settings', { key: 'pin', value: '5858' })
  return '5858'
}

export async function savePin(pin: string): Promise<void> {
  await idbPut('settings', { key: 'pin', value: pin })
}

// ─── SESSIONS ─────────────────────────────────────────────────────────────────
export async function getTodaySession(): Promise<Session | null> {
  const today = new Date().toISOString().split('T')[0]
  const local = await idbGet<Session>('sessions', today)
  if (local) return local

  if (isOnline()) {
    const { data } = await supabase.from('sessions').select('*').eq('date', today).single()
    if (data) {
      await idbPut('sessions', { ...data, id: data.date })
      return data as Session
    }
  }
  return null
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
    await supabase.from('sessions').upsert({ ...session, id: crypto.randomUUID() })
  }
  return session
}

export async function closeSession(
  sessionId: string,
  closingBalances: OpeningBalances,
  checksumPassed: boolean
): Promise<void> {
  const session = await idbGet<Session>('sessions', sessionId)
  if (!session) return
  const updated = {
    ...session,
    status: 'closed' as const,
    checkout_time: new Date().toISOString(),
    closing_balances: closingBalances,
    checksum_passed: checksumPassed,
  }
  await idbPut('sessions', updated)

  if (isOnline()) {
    await supabase.from('sessions').update({
      status: 'closed',
      checkout_time: updated.checkout_time,
      closing_balances: closingBalances,
      checksum_passed: checksumPassed,
    }).eq('date', sessionId)
  }
}

export async function getAllSessions(): Promise<Session[]> {
  const sessions = await idbGetAll<Session>('sessions')
  return sessions.sort((a, b) => b.date.localeCompare(a.date))
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
export async function getSessionTransactions(sessionId: string): Promise<Transaction[]> {
  const txs = await idbGetByIndex<Transaction>('transactions', 'session_id', sessionId)
  return txs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
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
  for (const tx of newTxs) {
    await idbPut('transactions', tx)
  }
  if (isOnline()) {
    await supabase.from('transactions').insert(newTxs)
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
  let bills = await idbGetAll<Bill>('bills')

  if (isOnline() && bills.length === 0) {
    const { data } = await supabase.from('bills').select('*').eq('paid', false)
    if (data && data.length > 0) {
      for (const b of data) await idbPut('bills', b)
      bills = data as Bill[]
    }
  }
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
  const updated = { ...bill, paid: true }
  await idbPut('bills', updated)
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
