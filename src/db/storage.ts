/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { TrainingRecord, UploadBatch, CustomHeader } from '../types';

// Seed initial data to showcase beautiful dashboard on initial load using the user's domain style!
export const MOCK_RECORDS: TrainingRecord[] = [
  {
    id: 'tr-1',
    sNo: '1257',
    rank: 'Manager',
    employeeId: 'ADIC(O)/0001',
    employeeName: 'Asad Zubair',
    department: 'FCS',
    trainingTitle: '(Course 01-25) FCS Design for Fixed Wing Aircraft Level-I',
    category: 'Course 01-25',
    status: 'Pass',
    uploadedAt: '2026-06-04 09:00:00',
    uploadBatchId: 'batch-init-1',
  },
  {
    id: 'tr-2',
    sNo: '3053',
    rank: 'Manager',
    employeeId: 'ADIC(O)/0001',
    employeeName: 'Asad Zubair',
    department: 'FCS',
    trainingTitle: '(Course 25-25) Flight Control Design Level-II',
    category: '(Course 25-25)',
    status: 'Pass',
    uploadedAt: '2026-06-04 09:00:00',
    uploadBatchId: 'batch-init-1',
  },
  {
    id: 'tr-3',
    sNo: '1',
    rank: 'Manager',
    employeeId: 'ADIC(O)/0003',
    employeeName: 'Muneeb Ahsan',
    department: 'Aerodynamics',
    trainingTitle: 'AI & Data Analytics',
    category: '(Workshop 11-25)',
    status: 'Pass',
    uploadedAt: '2026-06-04 09:00:00',
    uploadBatchId: 'batch-init-1',
  },
  {
    id: 'tr-4',
    sNo: '10',
    rank: 'Manager',
    employeeId: 'ADIC(O)/0006',
    employeeName: 'Zia Ur Rehman',
    department: 'Aerodynamics',
    trainingTitle: 'Introduction of Standard & Compliance',
    category: '(Workshop 15-25)',
    status: 'Withdrawn',
    uploadedAt: '2026-06-04 09:00:00',
    uploadBatchId: 'batch-init-1',
  },
  {
    id: 'tr-5',
    sNo: '11',
    rank: 'Manager',
    employeeId: 'ADIC(O)/0007',
    employeeName: 'Ali Zahid Bhatty',
    department: 'Structures',
    trainingTitle: 'Workshop on Introduction to HPC',
    category: '(Workshop 01-25)',
    status: 'Fail',
    uploadedAt: '2026-06-04 09:00:00',
    uploadBatchId: 'batch-init-1',
  },
];

export const MOCK_BATCHES: UploadBatch[] = [
  {
    id: 'batch-init-1',
    filename: 'Training_Log_Master_PAC.xlsx',
    uploadedAt: '2026-06-04 09:00:00',
    recordsCount: 5,
    status: 'Success',
    remarks: 'Initial training session matrix of core research teams.',
  },
];

export const MOCK_HEADERS: CustomHeader[] = [
  {
    id: 'score',
    name: 'Score',
    type: 'string',
    createdAt: '2026-06-04 12:00:00',
  },
  {
    id: 'trainer',
    name: 'Trainer',
    type: 'string',
    createdAt: '2026-06-04 12:00:00',
  }
];

/**
 * Seeds the database if it is currently unpopulated on the cloud.
 */
export async function seedDatabaseIfNeeded(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'records'));
    if (snapshot.empty) {
      console.log('[Firestore]: Seeding mock dataset...');
      for (const rec of MOCK_RECORDS) {
        await setDoc(doc(db, 'records', rec.id), rec);
      }
      for (const bat of MOCK_BATCHES) {
        await setDoc(doc(db, 'batches', bat.id), bat);
      }
      for (const head of MOCK_HEADERS) {
        await setDoc(doc(db, 'custom_headers', head.id), head);
      }

      // Bootstrap current authenticated admin account representation
      const currentAdmin = auth.currentUser;
      if (currentAdmin && currentAdmin.uid && currentAdmin.email) {
        await setDoc(doc(db, 'admins', currentAdmin.uid), {
          email: currentAdmin.email
        });
      }
    }
  } catch (error) {
    console.error('Failed to seed Database records:', error);
  }
}

/**
 * Async query for Training records
 */
export async function fetchLiveRecords(): Promise<TrainingRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, 'records'));
    return snapshot.docs.map((doc) => doc.data() as TrainingRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'records');
    return [];
  }
}

/**
 * Async query for Upload batches
 */
export async function fetchLiveBatches(): Promise<UploadBatch[]> {
  try {
    const snapshot = await getDocs(collection(db, 'batches'));
    return snapshot.docs.map((doc) => doc.data() as UploadBatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'batches');
    return [];
  }
}

/**
 * Fetch dynamic Custom Headers
 */
export async function fetchCustomHeaders(): Promise<CustomHeader[]> {
  try {
    const snapshot = await getDocs(collection(db, 'custom_headers'));
    return snapshot.docs.map((doc) => doc.data() as CustomHeader);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'custom_headers');
    return [];
  }
}

/**
 * Create a new dynamic column Custom Header in the database
 */
export async function addCustomHeader(name: string, type: 'string' | 'number' | 'boolean'): Promise<CustomHeader> {
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const newHeader: CustomHeader = {
    id,
    name: name.trim(),
    type,
    createdAt: nowStr,
  };

  try {
    await setDoc(doc(db, 'custom_headers', id), newHeader);
    return newHeader;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `custom_headers/${id}`);
    throw error;
  }
}

/**
 * Delete a custom header
 */
export async function deleteCustomHeader(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'custom_headers', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `custom_headers/${id}`);
    return false;
  }
}

/**
 * A helper function to recursively delete all undefined keys inside an object.
 * This prevents the Firestore SDK from throwing "Unsupported field value: undefined" errors.
 */
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as Record<string, any>)[key];
      if (val !== undefined) {
        res[key] = cleanUndefined(val);
      }
    }
    return res as T;
  }
  return obj;
}

/**
 * Merges a list of parsed records with the existing historical training records inside Firestore.
 * Checks for duplicates (match on employeeId and trainingTitle).
 * If duplicate found, it keeps the latest version.
 * Otherwise, inserts the record.
 */
export async function mergeUploadedRecords(
  newRecords: Omit<TrainingRecord, 'id' | 'uploadedAt' | 'uploadBatchId'>[],
  filename: string,
  hasWarnings: boolean
): Promise<{ added: number; updated: number; batchId: string }> {
  const batchId = `batch-${Date.now()}`;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  let addedCount = 0;
  let updatedCount = 0;

  // Pull existing records to verify duplicates
  const existing = await fetchLiveRecords() || [];
  const mergedList = [...existing];

  for (const raw of newRecords) {
    // Check key match with complete null/undefined string protection
    const duplicateIndex = mergedList.findIndex(
      (r) =>
        (r?.employeeId || '').trim().toUpperCase() === (raw?.employeeId || '').trim().toUpperCase() &&
        (r?.trainingTitle || '').trim().toUpperCase() === (raw?.trainingTitle || '').trim().toUpperCase()
    );

    const recordId = duplicateIndex >= 0 ? mergedList[duplicateIndex].id : `tr-${Math.random().toString(36).substr(2, 9)}`;

    const completeRecord = cleanUndefined<TrainingRecord>({
      ...raw,
      id: recordId,
      uploadedAt: nowStr,
      uploadBatchId: batchId,
    });

    if (duplicateIndex >= 0) {
      mergedList[duplicateIndex] = completeRecord;
      updatedCount++;
    } else {
      mergedList.push(completeRecord);
      addedCount++;
    }

    // Persist doc in Firestore safely
    try {
      await setDoc(doc(db, 'records', recordId), completeRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `records/${recordId}`);
    }
  }

  // Record upload Batch context
  const newBatch = cleanUndefined<UploadBatch>({
    id: batchId,
    filename,
    uploadedAt: nowStr,
    recordsCount: newRecords.length,
    status: hasWarnings ? 'Completed with warnings' : 'Success',
    remarks: `Merged successfully: ${addedCount} added, ${updatedCount} updated.`,
  });

  try {
    await setDoc(doc(db, 'batches', batchId), newBatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `batches/${batchId}`);
  }

  return { added: addedCount, updated: updatedCount, batchId };
}

// Add, Update, Delete for records manually on Firestore
export async function addRecordManually(
  record: Omit<TrainingRecord, 'id' | 'uploadedAt' | 'uploadBatchId'>
): Promise<TrainingRecord> {
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const id = `tr-${Math.random().toString(36).substr(2, 9)}`;
  const newRecord = cleanUndefined<TrainingRecord>({
    ...record,
    id,
    uploadedAt: nowStr,
    uploadBatchId: 'manual',
  });

  try {
    await setDoc(doc(db, 'records', id), newRecord);
    return newRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `records/${id}`);
    throw error;
  }
}

export async function updateRecordManually(id: string, updatedFields: Partial<TrainingRecord>): Promise<boolean> {
  try {
    const cleanedFields = cleanUndefined<Partial<TrainingRecord>>({
      ...updatedFields,
      id
    });
    await setDoc(doc(db, 'records', id), cleanedFields, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `records/${id}`);
    return false;
  }
}

export async function deleteRecord(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'records', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `records/${id}`);
    return false;
  }
}

export async function deleteRecords(ids: string[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      batch.delete(doc(db, 'records', id));
    });
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `batch-delete (${ids.length} docs)`);
    return false;
  }
}
