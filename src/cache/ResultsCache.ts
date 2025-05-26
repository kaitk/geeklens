// db.ts
const DB_NAME = 'GeekLensCache';
const STORE_NAME = 'instructionSets';
const DB_VERSION = 1;

// Currently only ISA info is saved, but more might be added in the future
interface BenchmarkResultRecord {
    resultId: string;
    instructionSet: string;
    timestamp: number;
}

export class ResultsCache {
    private dbPromise: Promise<IDBDatabase>;

    constructor() {
        this.dbPromise = this.initDB();
    }

    private initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('GeekLens: Error opening IndexedDB', event);
                reject('Failed to open database');
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'resultId' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                resolve(db);
            };
        });
    }

    async storeInstructionSet(resultId: string, instructionSet: string): Promise<void> {
        try {
            const db = await this.dbPromise;
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const record: BenchmarkResultRecord = {
                resultId,
                instructionSet,
                timestamp: Date.now()
            };

            return new Promise((resolve, reject) => {
                const request = store.put(record);
                request.onsuccess = () => resolve();
                request.onerror = (e) => {
                    console.error('GeekLens: Error storing instruction set', e);
                    reject('Failed to store instruction set');
                };
            });
        } catch (error) {
            console.error('GeekLens: DB error storing instruction set', error);
            throw error;
        }
    }

    async getInstructionSet(resultId: string): Promise<string | null> {
        try {
            const db = await this.dbPromise;
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.get(resultId);

                request.onsuccess = (event) => {
                    const result = (event.target as IDBRequest).result as BenchmarkResultRecord | undefined;
                    resolve(result?.instructionSet || null);
                };

                request.onerror = (e) => {
                    console.error('GeekLens: Error retrieving instruction set', e);
                    reject('Failed to retrieve instruction set');
                };
            });
        } catch (error) {
            console.error('GeekLens: DB error retrieving instruction set', error);
            return null;
        }
    }

}

// Export singleton instance
export const resultsCache = new ResultsCache();
