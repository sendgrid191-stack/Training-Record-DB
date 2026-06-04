/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TrainingRecord {
  id: string; // Unique entry ID
  
  // New baseline headers from test data
  trainingTitle: string;    // Mapped from 'Training Title'
  category: string;         // Mapped from 'Category'
  sNo: string;              // Mapped from 'S No'
  rank: string;             // Mapped from 'Rank'
  employeeName: string;     // Mapped from 'Employee Name'
  employeeId: string;       // Mapped from 'Employee ID'
  department: string;       // Mapped from 'Department'
  status: string;           // Mapped from 'Status' (e.g. Pass, Fail, Withdrawn, Completed)

  // System and dynamic support fields
  uploadedAt: string;       // YYYY-MM-DD HH:mm:ss
  uploadBatchId: string;    // Batch ID / upload context
  
  // Dynamic fields added by "Create New Header" feature
  customFields?: Record<string, any>;
}

export interface CustomHeader {
  id: string;               // lower-case identifier, e.g. 'trainer' or 'hours'
  name: string;             // Display name, e.g. 'Trainer' or 'Hours'
  type: 'string' | 'number' | 'boolean';
  createdAt: string;
}

export interface UploadBatch {
  id: string;
  filename: string;
  uploadedAt: string;
  recordsCount: number;
  status: 'Success' | 'Completed with warnings' | 'Failed';
  remarks?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ExcelParseResult {
  validRecords: Omit<TrainingRecord, 'id' | 'uploadedAt' | 'uploadBatchId'>[];
  errors: ValidationError[];
}
