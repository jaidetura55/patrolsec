import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Checkpoint, Zone, Visitor } from '../types';

interface PatrolDB extends DBSchema {
  checkpoints: {
    key: number;
    value: Checkpoint;
  };
  biometrics: {
    key: string;
    value: {
      type: string;
      registered: boolean;
      date: string;
      snapshot?: string; // Base64 or Blob
    };
  };
  settings: {
    key: string;
    value: {
      id: string;
      value: any;
    };
  };
  logs: {
    key: number;
    value: {
      id?: number;
      action: string;
      timestamp: string;
      details: string;
    };
    indexes: { 'by-date': string };
  };
  users: {
    key: string;
    value: {
      id: string;
      password: string;
      name: string;
      role: 'officer' | 'admin';
    };
  };
  incidents: {
    key: number;
    value: {
      id?: number;
      type?: 'manual' | 'clone_attempt' | 'theft';
      timestamp: string;
      description: string;
      image?: string; // Base64 photo
      video?: string; // Base64 video
      location?: { lat: number; lng: number };
    };
  };
  zones: {
    key: number;
    value: Zone;
  };
  visitors: {
    key: number;
    value: Visitor;
    indexes: { 'by-status': string };
  };
  logbook: {
    key: number;
    value: {
      id?: number;
      timestamp: string;
      reason: string;
      media?: string; // Base64 image or video
      mediaType: 'image' | 'video';
    };
  };
}

const DB_NAME = 'PatrolSEC.db';
const DB_VERSION = 7; // Incremented for schema update logic if needed, though IDB is flexible

class DatabaseService {
  private dbPromise: Promise<IDBPDatabase<PatrolDB>>;

  constructor() {
    this.dbPromise = openDB<PatrolDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create Checkpoints Store
        if (!db.objectStoreNames.contains('checkpoints')) {
          db.createObjectStore('checkpoints', { keyPath: 'id' });
        }

        // Create Biometrics Store
        if (!db.objectStoreNames.contains('biometrics')) {
          db.createObjectStore('biometrics', { keyPath: 'type' });
        }

        // Create Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        
        // Create Logs Store
        if (!db.objectStoreNames.contains('logs')) {
           const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
           logStore.createIndex('by-date', 'timestamp');
        }

        // Create Users Store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          // Seed default user
          userStore.put({ 
            id: '88201', 
            password: '123456', 
            name: 'Officer 88201', 
            role: 'officer' 
          });
        }

        // Create Incidents Store
        if (!db.objectStoreNames.contains('incidents')) {
          db.createObjectStore('incidents', { keyPath: 'id', autoIncrement: true });
        }

        // Create Zones Store
        if (!db.objectStoreNames.contains('zones')) {
          db.createObjectStore('zones', { keyPath: 'id', autoIncrement: true });
        }

        // Create Visitors Store
        if (!db.objectStoreNames.contains('visitors')) {
          const visitorStore = db.createObjectStore('visitors', { keyPath: 'id', autoIncrement: true });
          visitorStore.createIndex('by-status', 'status');
        }

        // Create Logbook Store
        if (!db.objectStoreNames.contains('logbook')) {
          db.createObjectStore('logbook', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }

  // --- Users & Auth ---
  async verifyUser(id: string, password: string) {
    const db = await this.dbPromise;
    const user = await db.get('users', id);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  async getUser(id: string) {
      const db = await this.dbPromise;
      return await db.get('users', id);
  }

  // --- Checkpoints ---
  async getCheckpoints(): Promise<Checkpoint[]> {
    const db = await this.dbPromise;
    const checkpoints = await db.getAll('checkpoints');
    if (checkpoints.length === 0) {
      // Seed defaults if empty
      const defaults: Checkpoint[] = [
        { id: 1, position: 'Position: 1', name: 'Check Point 1', status: 'pending' },
        { id: 2, position: 'Position: 2', name: 'Check Point 2', status: 'pending' },
        { id: 3, position: 'Position: 3', name: 'Check Point 3', status: 'pending' },
        { id: 4, position: 'Position: 4', name: 'Check Point 4', status: 'pending' }
      ];
      const tx = db.transaction('checkpoints', 'readwrite');
      await Promise.all(defaults.map(cp => tx.store.put(cp)));
      await tx.done;
      return defaults;
    }
    return checkpoints.sort((a, b) => a.id - b.id);
  }

  async saveCheckpoint(checkpoint: Checkpoint) {
    const db = await this.dbPromise;
    await db.put('checkpoints', checkpoint);
  }

  async resetCheckpoints() {
    const db = await this.dbPromise;
    await db.clear('checkpoints');
    return this.getCheckpoints(); // Will re-seed
  }

  // --- Biometrics ---
  async saveBiometric(type: 'face' | 'fingerprint', data: any) {
    const db = await this.dbPromise;
    await db.put('biometrics', {
      type,
      registered: true,
      date: new Date().toISOString(),
      ...data
    });
  }

  async getBiometric(type: 'face' | 'fingerprint') {
    const db = await this.dbPromise;
    return await db.get('biometrics', type);
  }

  async getAllBiometrics() {
    const db = await this.dbPromise;
    return await db.getAll('biometrics');
  }

  // --- Settings ---
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const db = await this.dbPromise;
    const result = await db.get('settings', key);
    return result ? result.value : defaultValue;
  }

  async saveSetting(key: string, value: any) {
    const db = await this.dbPromise;
    await db.put('settings', { id: key, value });
  }

  // --- Logs (Audit Trail) ---
  async logAction(action: string, details: string) {
    const db = await this.dbPromise;
    await db.add('logs', {
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async getLogs() {
    const db = await this.dbPromise;
    // Get all logs, we will sort them in the application layer or use index
    return await db.getAllFromIndex('logs', 'by-date');
  }

  // --- Incidents ---
  async saveIncident(incident: Omit<PatrolDB['incidents']['value'], 'id'>) {
    const db = await this.dbPromise;
    await db.add('incidents', { ...incident, type: incident.type || 'manual' });
  }

  async getIncidents() {
    const db = await this.dbPromise;
    return await db.getAll('incidents');
  }

  async getCloneIncidents() {
      const db = await this.dbPromise;
      const all = await db.getAll('incidents');
      return all.filter(i => i.type === 'clone_attempt');
  }

  // --- Zones ---
  async saveZone(zone: Zone) {
    const db = await this.dbPromise;
    // For simplicity in this app, we might want to deactivate others if we assume single active zone
    if (zone.isActive) {
      const all = await db.getAll('zones');
      const tx = db.transaction('zones', 'readwrite');
      for (const z of all) {
        if (z.id !== zone.id && z.isActive) {
          await tx.store.put({ ...z, isActive: false });
        }
      }
      await tx.store.put(zone);
      await tx.done;
    } else {
      await db.put('zones', zone);
    }
  }

  async getZones() {
    const db = await this.dbPromise;
    return await db.getAll('zones');
  }
  
  async getActiveZone() {
      const db = await this.dbPromise;
      const zones = await db.getAll('zones');
      // Return the active one, or the last one created, or default
      return zones.find(z => z.isActive) || zones[zones.length - 1] || null;
  }

  async assignOfficerToActiveZone(details: { name: string; id: string; shift: 'Day' | 'Night'; biometrics: { face: boolean; fingerprint: boolean } }) {
      const db = await this.dbPromise;
      const zones = await db.getAll('zones');
      let activeZone = zones.find(z => z.isActive);
      
      // If no active zone, use the last one or create a dummy one
      if (!activeZone && zones.length > 0) {
          activeZone = zones[zones.length - 1];
      }

      if (activeZone) {
          activeZone.officerName = details.name;
          activeZone.officerId = details.id;
          activeZone.shift = details.shift;
          activeZone.biometrics = details.biometrics;
          await db.put('zones', activeZone);
      } else {
          // Fallback create
          await db.put('zones', {
              country: 'Malaysia',
              zoneName: 'Default Zone',
              officerName: details.name,
              officerId: details.id,
              unit: 'Security',
              shift: details.shift,
              biometrics: details.biometrics,
              isActive: true,
              timestamp: new Date().toISOString()
          });
      }
      
      // Also ensure user exists in users table for auth
      await db.put('users', {
          id: details.id,
          password: '123456', // Default password
          name: details.name,
          role: 'officer'
      });
  }

  async deleteOfficer(officerId: string) {
    const db = await this.dbPromise;
    
    // 1. Delete from users
    await db.delete('users', officerId);

    // 2. Update Zones (Unassign officer)
    const zones = await db.getAll('zones');
    for (const zone of zones) {
        if (zone.officerId === officerId) {
            zone.officerName = 'Unassigned';
            zone.officerId = '';
            zone.shift = 'Day'; // Reset to default
            zone.biometrics = { face: false, fingerprint: false };
            await db.put('zones', zone);
        }
    }

    // 3. Clear Device Biometrics 
    // (Assuming single-user device context, clearing globals ensures removal)
    await db.put('biometrics', { type: 'face', registered: false, date: '', snapshot: undefined });
    await db.put('biometrics', { type: 'fingerprint', registered: false, date: '' });
    
    await this.logAction('DELETE_OFFICER', `Officer ${officerId} removed from system.`);
  }

  // --- Visitors ---
  async checkInVisitor(visitor: Visitor) {
    const db = await this.dbPromise;
    await db.add('visitors', visitor);
    await this.logAction('VISITOR_IN', `Visitor ${visitor.name} checked in.`);
  }

  async checkOutVisitor(id: number) {
      const db = await this.dbPromise;
      const visitor = await db.get('visitors', id);
      if (visitor) {
          visitor.status = 'Checked Out';
          visitor.outTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          await db.put('visitors', visitor);
          await this.logAction('VISITOR_OUT', `Visitor ${visitor.name} checked out.`);
      }
  }

  async getActiveVisitors() {
      const db = await this.dbPromise;
      const all = await db.getAll('visitors');
      return all.filter(v => v.status === 'Active');
  }

  async getVisitorHistory() {
      const db = await this.dbPromise;
      return await db.getAll('visitors');
  }

  // --- Logbook ---
  async saveLogbookEntry(reason: string, media?: string, mediaType: 'image' | 'video' = 'image') {
    const db = await this.dbPromise;
    await db.add('logbook', {
      timestamp: new Date().toISOString(),
      reason,
      media,
      mediaType
    });
    await this.logAction('LOGBOOK_ENTRY', 'Logbook entry submitted.');
  }

  async getLogbookEntries() {
    const db = await this.dbPromise;
    return await db.getAll('logbook');
  }

  // --- System Sync ---
  async syncData() {
    console.log("Starting scheduled system sync...");
    // Simulate network delay for downloading updates
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // In a real app, we would fetch JSON from API and update stores here
    await this.logAction('SYSTEM_SYNC', 'Data synchronization completed (12H Schedule).');
    return true;
  }
}

export const dbService = new DatabaseService();