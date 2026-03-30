'use client'

const DB_NAME = 'roznamcha_db'
const DB_VERSION = 1

let db: IDBDatabase | null = null

export async function getDB(): Promise<IDBDatabase> {
  if (db) return db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains('sessions')) {
        database.createObjectStore('sessions', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('transactions')) {
        const txStore = database.createObjectStore('transactions', { keyPath: 'id' })
        txStore.createIndex('session_id', 'session_id', { unique: false })
        txStore.createIndex('date', 'date', { unique: false })
      }
      if (!database.objectStoreNames.contains('bills')) {
        database.createObjectStore('bills', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' })
      }
    }
    req.onsuccess = (e) => {
      db = (e.target as IDBOpenDBRequest).result
      resolve(db)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbPut(store: string, value: object): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readwrite')
    tx.objectStore(store).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbDelete(store: string, key: string): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbGetByIndex<T>(store: string, index: string, value: string): Promise<T[]> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readonly')
    const req = tx.objectStore(store).index(index).getAll(value)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
