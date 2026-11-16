import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "chess-universe:";

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(`${PREFIX}${key}`);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
}

export async function removeStored(key: string) {
  await AsyncStorage.removeItem(`${PREFIX}${key}`);
}

/** Clear app-owned local game and learning data after confirmed account deletion. */
export async function clearStoredData() {
  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter((key) => key.startsWith(PREFIX));
  if (appKeys.length > 0) await AsyncStorage.multiRemove(appKeys);
}
