import { collection, doc, setDoc, getDoc, deleteDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { db, UserRole } from "./firebase";
import { ProcessDefinition } from "./types";
import { WAREHOUSE_LOGISTICS_PRESET, CLINICAL_TRIAGE_PRESET } from "./presets";

export interface SavedProcessEntry {
  id: string;
  savedAt: string;
  process: ProcessDefinition;
}

export interface UserPermissions {
  taxonomyFilters: { view: boolean; edit: boolean }; // Filtros de Estructura Taxonómica (Proceso Activo)
  docAccess: boolean; // 1. Documentación
  docComponents: {
    generalInfo: { view: boolean; edit: boolean };   // 1. Información General del Proceso
    fce: { view: boolean; edit: boolean };           // Ficha FCE / Caracterización
    tobeDiagram: { view: boolean; edit: boolean };   // Diagrama de Flujo (BPMN 2.0 / Subprocesos)
    riskMatrix: { view: boolean; edit: boolean };    // Matriz de Riesgos & Controles
    additionalDocs: { view: boolean; edit: boolean };// Glosario, SIPOC, Indicadores y Roles
  };
  simAccess: boolean; // 2. Simulador & KPIs Dashboard
  simComponents: {
    monteCarlo: boolean;
    kpisDashboard: boolean;
    riskMatrix: boolean;
    reports: boolean;
  };
}

export const DEFAULT_ANALYST_PERMISSIONS: UserPermissions = {
  taxonomyFilters: { view: false, edit: false },
  docAccess: false,
  docComponents: {
    generalInfo: { view: false, edit: false },
    fce: { view: false, edit: false },
    tobeDiagram: { view: false, edit: false },
    riskMatrix: { view: false, edit: false },
    additionalDocs: { view: false, edit: false },
  },
  simAccess: false,
  simComponents: {
    monteCarlo: false,
    kpisDashboard: false,
    riskMatrix: false,
    reports: false,
  },
};

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  taxonomyFilters: { view: true, edit: true },
  docAccess: true,
  docComponents: {
    generalInfo: { view: true, edit: true },
    fce: { view: true, edit: true },
    tobeDiagram: { view: true, edit: true },
    riskMatrix: { view: true, edit: true },
    additionalDocs: { view: true, edit: true },
  },
  simAccess: true,
  simComponents: {
    monteCarlo: true,
    kpisDashboard: true,
    riskMatrix: true,
    reports: true,
  },
};

export interface UserProfile {
  email: string;
  role: UserRole;
  displayName?: string | null;
  photoURL?: string | null;
  permissions?: UserPermissions;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

const COLLECTION_NAME = "processes";
const USERS_COLLECTION = "users";
const MAIN_SUPER_ADMIN = "carayag@ugp-ssmso.cl";

export function getUserDocId(email: string): string {
  const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `user_${cleanEmail}`;
}

/**
 * Sync user login profile into Firestore 'users' collection.
 * Default role is 'admin' ONLY for 'carayag@ugp-ssmso.cl', and 'analyst' for all others.
 */
export async function syncUserProfile(user: {
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<UserProfile> {
  if (!user || !user.email) {
    throw new Error("Invalid user for syncUserProfile");
  }

  const normalizedEmail = user.email.trim().toLowerCase();
  const isMainAdmin = normalizedEmail === MAIN_SUPER_ADMIN;
  const docId = getUserDocId(normalizedEmail);
  const userDocRef = doc(db, USERS_COLLECTION, docId);

  try {
    const docSnap = await getDoc(userDocRef);
    const now = new Date().toISOString();

    if (docSnap.exists()) {
      const existingData = docSnap.data() as UserProfile;
      // carayag@ugp-ssmso.cl is strictly hardcoded as 'admin'
      const activeRole: UserRole = isMainAdmin ? "admin" : (existingData.role || "analyst");

      const updatedProfile: UserProfile = {
        ...existingData,
        email: normalizedEmail,
        role: activeRole,
        displayName: user.displayName || existingData.displayName || normalizedEmail.split("@")[0],
        photoURL: user.photoURL || existingData.photoURL || null,
        lastLoginAt: now,
        updatedAt: now,
      };

      await setDoc(userDocRef, JSON.parse(JSON.stringify(updatedProfile)), { merge: true });
      return updatedProfile;
    } else {
      // Create new user profile with default restricted permissions
      const newProfile: UserProfile = {
        email: normalizedEmail,
        role: isMainAdmin ? "admin" : "analyst",
        displayName: user.displayName || normalizedEmail.split("@")[0],
        photoURL: user.photoURL || null,
        permissions: isMainAdmin ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_ANALYST_PERMISSIONS,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userDocRef, JSON.parse(JSON.stringify(newProfile)));
      return newProfile;
    }
  } catch (err) {
    console.error("Error syncing user profile to Firestore:", err);
    // Fallback profile if Firestore is offline
    return {
      email: normalizedEmail,
      role: isMainAdmin ? "admin" : "analyst",
      displayName: user.displayName || normalizedEmail.split("@")[0],
      photoURL: user.photoURL || null,
      permissions: isMainAdmin ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_ANALYST_PERMISSIONS,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Subscribe to all users in Firestore 'users' collection (Real-time User Manager)
 */
export function subscribeToAllUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const usersList: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          if (data && data.email) {
            // Ensure main admin is always reflected as admin
            const isMainAdmin = data.email.trim().toLowerCase() === MAIN_SUPER_ADMIN;
            usersList.push({
              ...data,
              role: isMainAdmin ? "admin" : (data.role || "analyst"),
            });
          }
        });

        // Ensure carayag@ugp-ssmso.cl exists in the list even if database was empty
        if (!usersList.some((u) => u.email.toLowerCase() === MAIN_SUPER_ADMIN)) {
          usersList.unshift({
            email: MAIN_SUPER_ADMIN,
            role: "admin",
            displayName: "Administrador UPE",
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        // Sort: Admin first, then alphabetically by email
        usersList.sort((a, b) => {
          if (a.email.toLowerCase() === MAIN_SUPER_ADMIN) return -1;
          if (b.email.toLowerCase() === MAIN_SUPER_ADMIN) return 1;
          if (a.role === b.role) return a.email.localeCompare(b.email);
          return a.role === "admin" ? -1 : 1;
        });

        onData(usersList);
      },
      (error) => {
        console.error("Error subscribing to users collection:", error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error("Firebase init users snapshot error:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Subscribe to current user's profile in Firestore for real-time role changes
 */
export function subscribeToUserProfile(
  email: string,
  onData: (profile: UserProfile) => void
) {
  if (!email) return () => {};
  const normalizedEmail = email.trim().toLowerCase();
  const docId = getUserDocId(normalizedEmail);
  const userDocRef = doc(db, USERS_COLLECTION, docId);

  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        const isMainAdmin = normalizedEmail === MAIN_SUPER_ADMIN;
        onData({
          ...data,
          role: isMainAdmin ? "admin" : (data.role || "analyst"),
        });
      }
    },
    (err) => {
      console.error("Error listening to user profile:", err);
    }
  );
}

/**
 * Update user role in Firestore (Admin tool)
 */
export async function updateUserRole(
  email: string,
  newRole: UserRole,
  updatedByEmail: string
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === MAIN_SUPER_ADMIN && newRole !== "admin") {
    throw new Error("El rol de la cuenta carayag@ugp-ssmso.cl no puede ser modificado (Administrador Principal).");
  }

  const docId = getUserDocId(normalizedEmail);
  const userDocRef = doc(db, USERS_COLLECTION, docId);
  const now = new Date().toISOString();

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      await setDoc(
        userDocRef,
        {
          role: newRole,
          updatedAt: now,
          updatedBy: updatedByEmail,
        },
        { merge: true }
      );
    } else {
      const newProfile: UserProfile = {
        email: normalizedEmail,
        role: newRole,
        displayName: normalizedEmail.split("@")[0],
        permissions: newRole === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_ANALYST_PERMISSIONS,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
        updatedBy: updatedByEmail,
      };
      await setDoc(userDocRef, JSON.parse(JSON.stringify(newProfile)));
    }
    return true;
  } catch (err) {
    console.error("Error updating user role in Firestore:", err);
    throw err;
  }
}

/**
 * Update user permissions in Firestore (Admin tool)
 */
export async function updateUserPermissions(
  email: string,
  permissions: UserPermissions,
  updatedByEmail: string
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const docId = getUserDocId(normalizedEmail);
  const userDocRef = doc(db, USERS_COLLECTION, docId);
  const now = new Date().toISOString();

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      await setDoc(
        userDocRef,
        {
          permissions,
          updatedAt: now,
          updatedBy: updatedByEmail,
        },
        { merge: true }
      );
    } else {
      const isMainAdmin = normalizedEmail === MAIN_SUPER_ADMIN;
      const newProfile: UserProfile = {
        email: normalizedEmail,
        role: isMainAdmin ? "admin" : "analyst",
        displayName: normalizedEmail.split("@")[0],
        permissions,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
        updatedBy: updatedByEmail,
      };
      await setDoc(userDocRef, JSON.parse(JSON.stringify(newProfile)));
    }
    return true;
  } catch (err) {
    console.error("Error updating user permissions in Firestore:", err);
    throw err;
  }
}

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

let initialSeedAttempted = false;

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
          if (!initialSeedAttempted) {
            initialSeedAttempted = true;
            console.log("Firestore collection is empty on initial load. Auto-seeding default preset models...");
            seedDefaultPresetModels();
          } else {
            console.log("Firestore collection is now empty.");
            onData([]);
          }
          return;
        }

        initialSeedAttempted = true;
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
