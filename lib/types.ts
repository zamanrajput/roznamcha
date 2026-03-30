export type Account = 'cash' | 'jazz_retailer' | 'zong_retailer' | 'telenor_retailer' | 'ufone_retailer' | 'jazzcash_business'

export type TransactionType =
  | 'load'
  | 'package'
  | 'withdrawal'
  | 'send_money'
  | 'bill_payment'
  | 'accessories_repair'
  | 'data'
  | 'cash_to_jazzcash'
  | 'jazzcash_to_cash'
  | 'other'

export type Direction = 'in' | 'out'

export type BillType = 'wapda' | 'sngpl' | 'ptcl' | 'sui_gas' | 'other'

export interface OpeningBalances {
  cash: number
  jazz_retailer: number
  zong_retailer: number
  telenor_retailer: number
  ufone_retailer: number
  jazzcash_business: number
}

export interface Session {
  id: string
  date: string
  operator_name: string
  checkin_time: string
  checkout_time?: string
  status: 'open' | 'closed'
  opening_balances: OpeningBalances
  closing_balances?: OpeningBalances
  checksum_passed?: boolean
}

export interface Transaction {
  id: string
  session_id: string
  date: string
  time: string
  account: Account
  type: TransactionType
  description?: string
  amount: number
  direction: Direction
  group_id?: string
  is_commission?: boolean
  is_base?: boolean
}

export interface Bill {
  id: string
  customer_name: string
  bill_type: BillType
  amount: number
  due_date: string
  reminder_sent: boolean
  paid: boolean
  created_at: string
}

export const ACCOUNT_LABELS: Record<Account, string> = {
  cash: 'Cash',
  jazz_retailer: 'Jazz Retailer',
  zong_retailer: 'Zong Retailer',
  telenor_retailer: 'Telenor Retailer',
  ufone_retailer: 'Ufone Retailer',
  jazzcash_business: 'JazzCash Business',
}

export const ACCOUNT_COLORS: Record<Account, string> = {
  cash: '#f0a500',
  jazz_retailer: '#e30613',
  zong_retailer: '#00a651',
  telenor_retailer: '#005baa',
  ufone_retailer: '#7b2d8b',
  jazzcash_business: '#e30613',
}

export const ACCOUNT_SHORT: Record<Account, string> = {
  cash: 'CASH',
  jazz_retailer: 'JAZZ',
  zong_retailer: 'ZONG',
  telenor_retailer: 'TELE',
  ufone_retailer: 'UFON',
  jazzcash_business: 'JCB',
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  load: 'Load',
  package: 'Package',
  withdrawal: 'Withdrawal',
  send_money: 'Send Money',
  bill_payment: 'Bill Payment',
  accessories_repair: 'Accessories / Repair',
  data: 'Data',
  cash_to_jazzcash: 'Cash → JazzCash',
  jazzcash_to_cash: 'JazzCash → Cash',
  other: 'Other',
}

export const TYPE_ICONS: Record<TransactionType, string> = {
  load: '📶',
  package: '📦',
  withdrawal: '💸',
  send_money: '➡️',
  bill_payment: '🧾',
  accessories_repair: '🔧',
  data: '💾',
  cash_to_jazzcash: '🔄',
  jazzcash_to_cash: '🔄',
  other: '📝',
}

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  wapda: 'WAPDA (Electricity)',
  sngpl: 'SNGPL (Gas)',
  ptcl: 'PTCL',
  sui_gas: 'Sui Gas',
  other: 'Other',
}

export const ALL_ACCOUNTS: Account[] = [
  'cash',
  'jazzcash_business',
  'jazz_retailer',
  'zong_retailer',
  'telenor_retailer',
  'ufone_retailer',
]
