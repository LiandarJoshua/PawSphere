// Web stub — AsyncStorage is replaced by localStorage in supabase.ts on web
const isLocalStorageAvailable =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const noopStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
  mergeItem: () => Promise.resolve(),
  clear: () => Promise.resolve(),
  getAllKeys: () => Promise.resolve([]),
  multiGet: (keys) => Promise.resolve(keys.map((k) => [k, null])),
  multiSet: () => Promise.resolve(),
  multiRemove: () => Promise.resolve(),
};

const localStorageAdapter = {
  getItem: (key) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
  mergeItem: () => Promise.resolve(),
  clear: () => Promise.resolve(localStorage.clear()),
  getAllKeys: () => Promise.resolve(Object.keys(localStorage)),
  multiGet: (keys) => Promise.resolve(keys.map((k) => [k, localStorage.getItem(k)])),
  multiSet: (pairs) => Promise.resolve(pairs.forEach(([k, v]) => localStorage.setItem(k, v))),
  multiRemove: (keys) => Promise.resolve(keys.forEach((k) => localStorage.removeItem(k))),
};

const AsyncStorage = isLocalStorageAvailable ? localStorageAdapter : noopStorage;
export default AsyncStorage;
