/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalizes a category string from raw upload data to one of the canonical categories:
 * - Fundamentals
 * - CAT-A
 * - CAT-B
 * - CAT-C
 * - CAT-D
 * - Other
 */
export function getNormalizedCategory(catStr: string): 'Fundamentals' | 'CAT-A' | 'CAT-B' | 'CAT-C' | 'CAT-D' | 'Other' {
  const s = (catStr || '').trim().toUpperCase();
  if (!s) return 'Other';

  if (
    s.includes('FUNDAMENTAL') || 
    s.includes('FND') || 
    s.includes('BASE') || 
    s.includes('BASIC') ||
    s.includes('MODULE 1') ||
    s.includes('MODULE-1') ||
    s.includes('BASICS')
  ) {
    return 'Fundamentals';
  }

  // Standardize terms like 'CATEGORY' or 'CLASS' or 'SECTION' with 'CAT'
  const clean = s.replace(/CATEGORY/g, 'CAT')
                 .replace(/CLASS/g, 'CAT')
                 .replace(/[\s\.\-_]/g, ''); // Remove spaces, dots, dashes, underscores

  if (clean.includes('CATA') || clean === 'A' || clean === 'CATAEDUY' || clean.endsWith('CATA')) {
    return 'CAT-A';
  }
  if (clean.includes('CATB') || clean === 'B' || clean.endsWith('CATB')) {
    return 'CAT-B';
  }
  if (clean.includes('CATC') || clean === 'C' || clean.endsWith('CATC')) {
    return 'CAT-C';
  }
  if (clean.includes('CATD') || clean === 'D' || clean.endsWith('CATD')) {
    return 'CAT-D';
  }

  // Backup regex checks for patterns like "CAT A", "-A", "CAT-A"
  if (s === 'A' || s.endsWith(' A') || s.startsWith('A ') || s.includes('-A') || s.includes('_A')) {
    return 'CAT-A';
  }
  if (s === 'B' || s.endsWith(' B') || s.startsWith('B ') || s.includes('-B') || s.includes('_B')) {
    return 'CAT-B';
  }
  if (s === 'C' || s.endsWith(' C') || s.startsWith('C ') || s.includes('-C') || s.includes('_C')) {
    return 'CAT-C';
  }
  if (s === 'D' || s.endsWith(' D') || s.startsWith('D ') || s.includes('-D') || s.includes('_D')) {
    return 'CAT-D';
  }

  return 'Other';
}
