// IndexedDB for Admin Dashboard
const DB_NAME = 'facistore_admin';
const DB_VERSION = 3; // Incremented for new stores

let db: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Clients store
      if (!database.objectStoreNames.contains('clients')) {
        const clientsStore = database.createObjectStore('clients', { keyPath: 'id' });
        clientsStore.createIndex('name', 'name', { unique: false });
        clientsStore.createIndex('status', 'status', { unique: false });
      }
      
      // Settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
      
      // Backup history store
      if (!database.objectStoreNames.contains('backup_history')) {
        const historyStore = database.createObjectStore('backup_history', { keyPath: 'id', autoIncrement: true });
        historyStore.createIndex('clientId', 'clientId', { unique: false });
        historyStore.createIndex('date', 'date', { unique: false });
      }
      
      // Notes store
      if (!database.objectStoreNames.contains('notes')) {
        const notesStore = database.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
        notesStore.createIndex('clientId', 'clientId', { unique: false });
        notesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Schedule store
      if (!database.objectStoreNames.contains('schedule')) {
        const scheduleStore = database.createObjectStore('schedule', { keyPath: 'id', autoIncrement: true });
        scheduleStore.createIndex('clientId', 'clientId', { unique: false });
        scheduleStore.createIndex('date', 'date', { unique: false });
        scheduleStore.createIndex('completed', 'completed', { unique: false });
      }
    };
  });
};

// Generic CRUD operations
export const getAll = async <T>(storeName: string): Promise<T[]> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getById = async <T>(storeName: string, id: string | number): Promise<T | undefined> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const add = async <T>(storeName: string, item: T): Promise<T> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
};

export const update = async <T>(storeName: string, item: T): Promise<T> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
};

export const remove = async (storeName: string, id: string | number): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Settings helpers
export const getSetting = async (key: string): Promise<string | null> => {
  const result = await getById<{ key: string; value: string }>('settings', key);
  return result?.value || null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  await update('settings', { key, value });
};

export const getSettings = async (): Promise<{ token: string; chatId: string }> => {
  const token = await getSetting('bot_token') || '';
  const chatId = await getSetting('default_chat_id') || '';
  return { token, chatId };
};

export const saveSettings = async (settings: { token: string; chatId: string }): Promise<void> => {
  await update('settings', { key: 'bot_token', value: settings.token });
  await update('settings', { key: 'default_chat_id', value: settings.chatId });
};

// Client helpers
export interface Client {
  id: string;
  name: string;
  supabaseUrl?: string; // Made optional for manual clients
  supabaseKey?: string; // Made optional
  telegramChatId?: string; // Made optional
  phone?: string; // Added phone field
  lastBackup?: string;
  status: 'active' | 'inactive';
  subscriptionStart?: string;
  subscriptionEnd?: string;
  paid?: boolean;
  notes?: string;
}

export const getClients = () => getAll<Client>('clients');
export const getClient = (id: string) => getById<Client>('clients', id);
export const addClient = (client: Client) => add('clients', client);
export const updateClient = (client: Client) => update('clients', client);
export const deleteClient = (id: string) => remove('clients', id);

// Backup history
export interface BackupRecord {
  id?: number;
  clientId: string;
  clientName: string;
  date: string;
  status: 'success' | 'failed';
  stats?: { 
    customers: number; 
    contracts: number; 
    payments: number;
    totalRevenue?: number;
    totalDebt?: number;
  };
}

// Notes
export interface Note {
  id?: number;
  clientId?: string;
  clientName?: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Schedule/Events
export interface ScheduleEvent {
  id?: number;
  clientId?: string;
  clientName?: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  type: 'installation' | 'followup' | 'payment' | 'meeting' | 'other';
  completed: boolean;
  createdAt: string;
}

export const addBackupRecord = (record: BackupRecord) => add('backup_history', record);
export const getBackupHistory = () => getAll<BackupRecord>('backup_history');
export const updateBackupRecord = (record: BackupRecord) => update('backup_history', record);
export const deleteBackupRecord = (id: number) => remove('backup_history', id);

// Notes helpers
export const getNotes = () => getAll<Note>('notes');
export const addNote = (note: Note) => add('notes', note);
export const updateNote = (note: Note) => update('notes', note);
export const deleteNote = (id: number) => remove('notes', id);

// Schedule helpers
export const getSchedule = () => getAll<ScheduleEvent>('schedule');
export const addScheduleEvent = (event: ScheduleEvent) => add('schedule', event);
export const updateScheduleEvent = (event: ScheduleEvent) => update('schedule', event);
export const deleteScheduleEvent = (id: number) => remove('schedule', id);
