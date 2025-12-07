
const DB_NAME = 'ai_manga_db';
const STORE_NAME = 'projects';
const DB_VERSION = 1;
const AUTO_SAVE_KEY = 'autosave_current';

export const storageService = {
  openDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  saveProjectData: async (data: any): Promise<void> => {
    const db = await storageService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, AUTO_SAVE_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  loadProjectData: async (): Promise<any | null> => {
    const db = await storageService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(AUTO_SAVE_KEY);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  clearProjectData: async (): Promise<void> => {
      const db = await storageService.openDB();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(AUTO_SAVE_KEY);
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }
};
