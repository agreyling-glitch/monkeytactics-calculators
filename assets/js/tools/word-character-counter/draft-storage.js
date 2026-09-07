const databaseName = "monkeytactics-word-counter";
const databaseVersion = 1;
const storeName = "drafts";
const activeDraftKey = "active";
let databasePromise;

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is unavailable"));
        return;
      }
      const request = indexedDB.open(databaseName, databaseVersion);
      request.addEventListener("upgradeneeded", function () {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
      });
      request.addEventListener("success", function () { resolve(request.result); });
      request.addEventListener("error", function () { reject(request.error || new Error("Could not open draft storage")); });
      request.addEventListener("blocked", function () { reject(new Error("Draft storage upgrade was blocked")); });
    }).catch(function (error) {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function runTransaction(mode, operation) {
  const database = await openDatabase();
  return new Promise(function (resolve, reject) {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    try {
      result = operation(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.addEventListener("complete", function () { resolve(result?.result); });
    transaction.addEventListener("abort", function () { reject(transaction.error || new Error("Draft storage transaction was aborted")); });
    transaction.addEventListener("error", function () { reject(transaction.error || new Error("Draft storage transaction failed")); });
  });
}

export function saveDraftToBrowser(draft) {
  return runTransaction("readwrite", store => store.put(draft, activeDraftKey));
}

export function loadDraftFromBrowser() {
  return runTransaction("readonly", store => store.get(activeDraftKey));
}

export function deleteDraftFromBrowser() {
  return runTransaction("readwrite", store => store.delete(activeDraftKey));
}
