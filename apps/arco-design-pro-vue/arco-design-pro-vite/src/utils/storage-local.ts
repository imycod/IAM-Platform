export default function storageLocal() {
  return {
    getItem<T>(key: string): T | null {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    setItem(key: string, value: unknown) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem(key: string) {
      localStorage.removeItem(key);
    },
  };
}
