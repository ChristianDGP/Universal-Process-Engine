import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { ProcessDefinition } from "./types";

export interface SavedProcessEntry {
  id: string;
  savedAt: string;
  process: ProcessDefinition;
}

const COLLECTION_NAME = "processes";

// Subscribe to real-time changes in Firestore processes collection
export function subscribeToCloudProcesses(
  onData: (entries: SavedProcessEntry[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const entries: SavedProcessEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.process) {
            entries.push({
              id: docSnap.id,
              savedAt: data.savedAt || new Date().toLocaleString("es-CL"),
              process: data.process,
            });
          }
        });
        // Sort descending by savedAt if possible or timestamp
        entries.sort((a, b) => b.id.localeCompare(a.id));
        onData(entries);
      },
      (error) => {
        console.error("Firebase Firestore subscription error:", error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error("Firebase init snapshot error:", err);
    if (onError) onError(err);
    return () => {};
  }
}

// Save a single process entry to Firestore
export async function saveProcessToCloud(entry: SavedProcessEntry): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, entry.id);
    await setDoc(docRef, {
      id: entry.id,
      savedAt: entry.savedAt,
      process: entry.process,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error("Error saving process to Firebase Cloud:", err);
    return false;
  }
}

// Delete a process entry from Firestore
export async function deleteProcessFromCloud(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error("Error deleting process from Firebase Cloud:", err);
    return false;
  }
}

// Bulk sync processes to Firestore
export async function bulkSyncProcessesToCloud(entries: SavedProcessEntry[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    entries.forEach((entry) => {
      const docRef = doc(db, COLLECTION_NAME, entry.id);
      batch.set(docRef, {
        id: entry.id,
        savedAt: entry.savedAt,
        process: entry.process,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.error("Error batch syncing to Firebase Cloud:", err);
    return false;
  }
}
