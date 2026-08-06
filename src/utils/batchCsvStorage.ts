export interface StoredBatchCsv {
  fileName: string;
  contents: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const BATCH_CSV_STORAGE_KEY = "monkeytactics.qrStudio.batchCsv.v1";

export function readStoredBatchCsv(storage: StorageLike = localStorage): StoredBatchCsv | null {
  try {
    const parsed = JSON.parse(storage.getItem(BATCH_CSV_STORAGE_KEY) ?? "null") as Partial<StoredBatchCsv> | null;
    if (!parsed || typeof parsed.fileName !== "string" || typeof parsed.contents !== "string") return null;
    return { fileName: parsed.fileName, contents: parsed.contents };
  } catch {
    return null;
  }
}

export function saveStoredBatchCsv(batch: StoredBatchCsv, storage: StorageLike = localStorage) {
  storage.setItem(BATCH_CSV_STORAGE_KEY, JSON.stringify(batch));
}

export function clearStoredBatchCsv(storage: StorageLike = localStorage) {
  storage.removeItem(BATCH_CSV_STORAGE_KEY);
}
