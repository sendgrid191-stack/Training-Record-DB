/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { ExcelParseResult, ValidationError, TrainingRecord } from '../types';

// Map of canonical keys structure to fuzzy synonyms (case-insensitive, space-insensitive matches)
const FIELD_SYNONYMS: Record<string, string[]> = {
  employeeId: ['employee id', 'employeeid', 'emp id', 'empid', 'id', 'employee code', 'employeecode', 'staff id', 'staffid', 'service no', 'service number', 'service_no'],
  employeeName: ['employee name', 'employeename', 'emp name', 'name', 'employee', 'staff name', 'staffname', 'full name', 'fullname'],
  department: ['department', 'dept', 'division', 'team', 'dep', 'organization', 'org', 'vertical'],
  trainingTitle: ['training title', 'trainingtitle', 'title', 'course', 'training name', 'training', 'course name', 'class', 'workshop', 'training activity', 'activity'],
  category: ['category', 'training category', 'trainingcategory', 'course category', 'type', 'genre', 'topic', 'code'],
  sNo: ['s no', 'sno', 'serial no', 'serial number', 's.no', 'sr no', 'sr.no', 'serialnum'],
  rank: ['rank', 'designation', 'position', 'level', 'employee rank', 'emp rank'],
  status: ['status', 'completion status', 'result', 'state', 'completed?', 'outcome', 'remarks'],
};

/**
 * Finds the closest matching canonical key from raw Excel headers.
 */
function findMatchingKey(headerKey: string): string | null {
  const cleanHeader = headerKey.trim().toLowerCase().replace(/[-_]/g, ' ');
  for (const [canonicalKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    if (canonicalKey.toLowerCase() === cleanHeader) return canonicalKey;
    for (const syn of synonyms) {
      if (syn.toLowerCase() === cleanHeader) return canonicalKey;
    }
  }
  return null;
}

/**
 * Converts spreadsheet dates to YYYY-MM-DD.
 * Handles Excel serial numbers as well as string formats.
 */
function parseExcelDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null;

  // If it's already a Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }

  // If it's a number (Excel date serial)
  if (typeof val === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch {
      return null;
    }
  }

  const str = String(val).trim();
  // Try direct parsing
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  // Custom DD-MM-YYYY or DD/MM/YYYY parse patterns if browser fails
  const matchDmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (matchDmy) {
    const [_, d, m, y] = matchDmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parsers file buffer into standard ExcelParseResult
 */
export function parseTrainingExcel(arrayBuffer: ArrayBuffer, filename: string): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    try {
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert spreadsheet to raw row array with headers
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        resolve({
          validRecords: [],
          errors: [{ row: 1, field: 'file', value: '', message: 'The uploaded file contains no data rows.', severity: 'error' }],
        });
        return;
      }

      // Detect and map headers
      const sampleRow = rawRows[0];
      const headerKeys = Object.keys(sampleRow);
      const keyMap: Record<string, string> = {}; // Raw header -> Canonical field name
      const customHeadersMap: Record<string, string> = {}; // Raw header -> raw name (for unmapped custom keys)

      headerKeys.forEach((hk) => {
        const canonical = findMatchingKey(hk);
        if (canonical) {
          keyMap[hk] = canonical;
        } else {
          customHeadersMap[hk] = hk.trim();
        }
      });

      const validRecords: Omit<TrainingRecord, 'id' | 'uploadedAt' | 'uploadBatchId'>[] = [];
      const errors: ValidationError[] = [];

      // Required standard fields
      const requiredFields = ['employeeId', 'employeeName', 'trainingTitle'];
      const mappedCanonicalFields = Object.values(keyMap);
      const missingFields = requiredFields.filter((f) => !mappedCanonicalFields.includes(f));

      if (missingFields.length > 0) {
        // Map missing fields to user readable versions
        const friendlyNames: Record<string, string> = {
          employeeId: 'Employee ID',
          employeeName: 'Employee Name',
          trainingTitle: 'Training Title',
        };
        const missingUserFriendly = missingFields.map((f) => friendlyNames[f] || f);
        resolve({
          validRecords: [],
          errors: [
            {
              row: 0,
              field: 'headers',
              value: headerKeys.join(', '),
              message: `Missing required schema columns: ${missingUserFriendly.join(', ')}. Please adjust headers.`,
              severity: 'error',
            },
          ],
        });
        return;
      }

      // Process and validate rows (excluding empty rows)
      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2; // Row offset for user visibility (headers is row 1)
        
        // Skip completely empty rows
        const isRowEmpty = Object.values(row).every((v) => String(v).trim() === '');
        if (isRowEmpty) return;

        const recordRaw: Record<string, any> = {};
        const customFieldsRaw: Record<string, any> = {};

        // Apply mapped values
        Object.entries(row).forEach(([rawKey, val]) => {
          const canonical = keyMap[rawKey];
          if (canonical) {
            recordRaw[canonical] = val;
          } else {
            const rawCustomHeaderName = customHeadersMap[rawKey];
            if (rawCustomHeaderName) {
              customFieldsRaw[rawCustomHeaderName] = val;
            }
          }
        });

        // 1. Employee ID Validation
        let empId = String(recordRaw.employeeId || '').trim();
        if (!empId) {
          errors.push({
            row: rowNum,
            field: 'Employee ID',
            value: '',
            message: 'Employee ID cannot be empty.',
            severity: 'error',
          });
        }

        // 2. Employee Name Validation
        let empName = String(recordRaw.employeeName || '').trim();
        if (!empName) {
          errors.push({
            row: rowNum,
            field: 'Employee Name',
            value: '',
            message: 'Employee Name cannot be empty.',
            severity: 'error',
          });
        }

        // 3. Department Validation
        let dept = String(recordRaw.department || '').trim() || 'General';

        // 4. Training Title Validation
        let title = String(recordRaw.trainingTitle || '').trim();
        if (!title) {
          errors.push({
            row: rowNum,
            field: 'Training Title',
            value: '',
            message: 'Training Title or Course Name cannot be empty.',
            severity: 'error',
          });
        }

        // 5. Category
        let category = String(recordRaw.category || '').trim() || 'Compliance';

        // 6. S No
        let sNo = String(recordRaw.sNo || '').trim();

        // 7. Rank
        let rank = String(recordRaw.rank || '').trim();

        // 8. Status Alignment (e.g. Pass, Fail, Withdrawn, Completed)
        let status = String(recordRaw.status || '').trim() || 'Pass';

        // Only register critical-error free rows
        const rowHasCriticalError = errors.some((err) => err.row === rowNum && err.severity === 'error');
        if (!rowHasCriticalError && empId && empName && title) {
          validRecords.push({
            employeeId: empId,
            employeeName: empName,
            department: dept,
            trainingTitle: title,
            category: category,
            sNo: sNo,
            rank: rank,
            status: status,
            customFields: Object.keys(customFieldsRaw).length > 0 ? customFieldsRaw : undefined,
          });
        }
      });

      resolve({
        validRecords,
        errors,
      });
    } catch (err) {
      reject(err);
    }
  });
}
