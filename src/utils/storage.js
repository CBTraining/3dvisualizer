/**
 * IndexedDB + LocalStorage storage manager for caching room projects and large assets
 */

const DB_NAME = '3D_RoomDesigner_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'assets';

class StorageManager {
  constructor() {
    this.db = null;
    this.dbReady = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to LocalStorage');
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          db.createObjectStore(STORE_ASSETS, { keyPath: 'key' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        resolve(null);
      };
    });
  }

  /**
   * Save active project state to cache
   */
  async saveProject(projectData) {
    try {
      await this.dbReady;
      const dataWithTimestamp = {
        id: 'active_project',
        timestamp: Date.now(),
        ...projectData
      };

      if (this.db) {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_PROJECTS, 'readwrite');
          const store = tx.objectStore(STORE_PROJECTS);
          const req = store.put(dataWithTimestamp);
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => {
            console.error('Failed to save to IndexedDB', e);
            this.fallbackSaveLocalStorage(dataWithTimestamp);
            resolve(false);
          };
        });
      } else {
        this.fallbackSaveLocalStorage(dataWithTimestamp);
        return true;
      }
    } catch (err) {
      console.error('saveProject error', err);
      return false;
    }
  }

  /**
   * Load active project state from cache
   */
  async loadProject() {
    try {
      await this.dbReady;
      if (this.db) {
        return new Promise((resolve) => {
          const tx = this.db.transaction(STORE_PROJECTS, 'readonly');
          const store = tx.objectStore(STORE_PROJECTS);
          const req = store.get('active_project');
          req.onsuccess = () => {
            if (req.result) {
              resolve(req.result);
            } else {
              resolve(this.fallbackLoadLocalStorage());
            }
          };
          req.onerror = () => {
            resolve(this.fallbackLoadLocalStorage());
          };
        });
      } else {
        return this.fallbackLoadLocalStorage();
      }
    } catch (err) {
      console.error('loadProject error', err);
      return this.fallbackLoadLocalStorage();
    }
  }

  fallbackSaveLocalStorage(data) {
    try {
      localStorage.setItem('3d_room_designer_active', JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage quota exceeded or unavailable', e);
    }
  }

  fallbackLoadLocalStorage() {
    try {
      const data = localStorage.getItem('3d_room_designer_active');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  async clearCache() {
    await this.dbReady;
    if (this.db) {
      const tx = this.db.transaction(STORE_PROJECTS, 'readwrite');
      tx.objectStore(STORE_PROJECTS).clear();
    }
    localStorage.removeItem('3d_room_designer_active');
  }
}

export const storage = new StorageManager();
