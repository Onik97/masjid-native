import Storage from 'expo-sqlite/kv-store';

/** Synchronous on-device key-value storage, shared by the query cache and the persisted stores. */
export const storage = {
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => void Storage.removeItemSync(key),
};
