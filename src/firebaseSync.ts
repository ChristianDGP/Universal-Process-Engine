import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { ProcessDefinition } from "./types";
import { WAREHOUSE_LOGISTICS_PRESET, CLINICAL_TRIAGE_PRESET } from "./presets";

export interface SavedProcessEntry {
  id: string;
  savedAt: string;
  process: ProcessDefinition;
}

const COLLECTION_NAME = "processes";

// Seed default preset models into Firestore automatically if empty
export async function seedDefaultPresetModels(): Promise<boolean> {
  try {
    const entries: SavedProcessEntry[] = [
      {
        id: "proc_gestion_de_abastecimiento_y_logistica_de_bodega",
        savedAt: new Date().toLocaleString("es-CL"),
        process: WAREHOUSE_LOGISTICS_PRESET,
      },
      {
        id: "proc_triage_clinico_y_atencion_de_urgencias",
        savedAt: new Date().toLocaleString("es-CL"),
        process: CLINICAL_TRIAGE_PRESET,
      },
    ];
    await bulkSyncProcessesToCloud(entries);
    console.log("Successfully auto-seeded default preset models into Firebase Firestore");
    return true;
  } catch (err) {
    console.error("Error auto-seeding preset models to Firestore:", err);
    return false;
  }
}

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
        if (snapshot.empty) {
          console.log("Firestore collection is empty. Auto-seeding initial preset models...");
          seedDefaultPresetModels();
          return;
        }

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

// Generate normalized doc ID based on process name
export function getProcessDocId(processName: string): string {
  const cleanName = processName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `proc_${cleanName || "default"}`;
}

// Automatically sync the active process to Firestore
export async function autoSaveProcessToCloud(process: ProcessDefinition): Promise<boolean> {
  if (!process || !process.name || process.name === "Proceso Sin Definir (En Blanco)") {
    return false;
  }
  const id = getProcessDocId(process.name);
  const entry: SavedProcessEntry = {
    id,
    savedAt: new Date().toLocaleString("es-CL"),
    process,
  };
  return await saveProcessToCloud(entry);
}

// Save a single process entry to Firestore
export async function saveProcessToCloud(entry: SavedProcessEntry): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, entry.id);
    const cleanPayload = JSON.parse(JSON.stringify({
      id: entry.id,
      savedAt: entry.savedAt,
      process: entry.process,
      updatedAt: new Date().toISOString(),
    }));
    await setDoc(docRef, cleanPayload);
    console.log("Successfully saved process to Firebase Firestore:", entry.id);
    return true;
  } catch (err) {
    console.error("Error saving process to Firebase Cloud:", err);
    throw err;
  }
}

// Delete a process entry from Firestore
export async function deleteProcessFromCloud(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    console.log("Successfully deleted process from Firebase Firestore:", id);
    return true;
  } catch (err) {
    console.error("Error deleting process from Firebase Cloud:", err);
    throw err;
  }
}

// Bulk sync processes to Firestore
export async function bulkSyncProcessesToCloud(entries: SavedProcessEntry[]): Promise<boolean> {
  try {
    if (!entries || entries.length === 0) return true;
    const batch = writeBatch(db);
    entries.forEach((entry) => {
      const docRef = doc(db, COLLECTION_NAME, entry.id);
      const cleanPayload = JSON.parse(JSON.stringify({
        id: entry.id,
        savedAt: entry.savedAt,
        process: entry.process,
        updatedAt: new Date().toISOString(),
      }));
      batch.set(docRef, cleanPayload);
    });
    await batch.commit();
    console.log(`Successfully batch synced ${entries.length} processes to Firebase Firestore`);
    return true;
  } catch (err) {
    console.error("Error batch syncing to Firebase Cloud:", err);
    throw err;
  }
}
