/**
 * Storage utility for measurement logs
 * Works on both native (AsyncStorage) and web (localStorage)
 */

import { Platform } from 'react-native';

const STORAGE_KEY = '@GPSMeasurementPro:logs';

interface MeasurementLog {
  id: string;
  type: 'distance' | 'area';
  value: number;
  points: Array<{ latitude: number; longitude: number }>;
  timestamp: string; // ISO string for storage
  unit: string;
}

// For native platforms
const getAsyncStorage = () => {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    return require('@react-native-async-storage/async-storage').default;
  } catch (e) {
    console.warn('AsyncStorage not available');
    return null;
  }
};

// Load logs from storage
export const loadLogs = async (): Promise<MeasurementLog[]> => {
  try {
    console.log('loadLogs: Platform.OS =', Platform.OS);
    if (Platform.OS === 'web') {
      // Use localStorage for web
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('loadLogs: Web - stored value:', stored ? 'exists' : 'null');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('loadLogs: Web - parsed logs count:', parsed.length);
          return parsed;
        }
      }
      return [];
    } else {
      // Use AsyncStorage for native
      const AsyncStorage = getAsyncStorage();
      console.log('loadLogs: Native - AsyncStorage available:', !!AsyncStorage);
      if (AsyncStorage) {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('loadLogs: Native - stored value:', stored ? 'exists' : 'null');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('loadLogs: Native - parsed logs count:', parsed.length);
          return parsed;
        }
      } else {
        // Fallback to in-memory storage
        const stored = inMemoryStorage[STORAGE_KEY];
        console.log('loadLogs: Using in-memory storage:', stored ? 'exists' : 'null');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('loadLogs: In-memory - parsed logs count:', parsed.length);
          return parsed;
        }
      }
      return [];
    }
  } catch (error) {
    console.error('Error loading logs:', error);
    return [];
  }
};

// Save logs to storage
export const saveLogs = async (logs: MeasurementLog[]): Promise<void> => {
  try {
    const logsToStore = JSON.stringify(logs);
    console.log('saveLogs: Saving', logs.length, 'logs to storage');
    
    if (Platform.OS === 'web') {
      // Use localStorage for web
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, logsToStore);
        console.log('saveLogs: Saved to web localStorage');
      }
    } else {
      // Use AsyncStorage for native
      const AsyncStorage = getAsyncStorage();
      if (AsyncStorage) {
        await AsyncStorage.setItem(STORAGE_KEY, logsToStore);
        console.log('saveLogs: Saved to AsyncStorage');
      } else {
        // Fallback to in-memory storage
        inMemoryStorage[STORAGE_KEY] = logsToStore;
        console.log('saveLogs: Saved to in-memory storage (not persistent)');
      }
    }
  } catch (error) {
    console.error('Error saving logs:', error);
  }
};

// Clear logs from storage
export const clearLogs = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      const AsyncStorage = getAsyncStorage();
      if (AsyncStorage) {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        // Clear from in-memory storage
        delete inMemoryStorage[STORAGE_KEY];
      }
    }
  } catch (error) {
    console.error('Error clearing logs:', error);
  }
};
