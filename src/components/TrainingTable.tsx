/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  SlidersHorizontal,
  Download,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  FileDown,
  Check,
  Settings,
  Grid3X3,
} from 'lucide-react';
import { TrainingRecord, CustomHeader } from '../types';

interface TrainingTableProps {
  records: TrainingRecord[];
  customHeaders: CustomHeader[];
  onAddRecord: (record: Omit<TrainingRecord, 'id' | 'uploadedAt' | 'uploadBatchId'>) => Promise<any>;
  onUpdateRecord: (id: string, record: Partial<TrainingRecord>) => Promise<any>;
  onDeleteRecord: (id: string) => Promise<any>;
  onDeleteRecords: (ids: string[]) => Promise<any>;
  onAddCustomHeader: (name: string, type: 'string' | 'number' | 'boolean') => Promise<any>;
  onDeleteCustomHeader: (id: string) => Promise<any>;
}

export default function TrainingTable({
  records,
  customHeaders,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onDeleteRecords,
  onAddCustomHeader,
  onDeleteCustomHeader,
}: TrainingTableProps) {
  // Queries and Filters States
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Row selection for batch operations
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showSelectChoice, setShowSelectChoice] = useState(false);

  // Modals visibility
  const [showFormModal, setShowFormModal] = useState(false);
  const [showHeadersModal, setShowHeadersModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);

  // Custom header form input
  const [newHeaderName, setNewHeaderName] = useState('');
  const [newHeaderType, setNewHeaderType] = useState<'string' | 'number' | 'boolean'>('string');
  const [isHeaderSubmitting, setIsHeaderSubmitting] = useState(false);

  // Manual Form Fields
  const [formFields, setFormFields] = useState({
    sNo: '',
    rank: '',
    employeeId: '',
    employeeName: '',
    department: '',
    trainingTitle: '',
    category: '',
    status: 'Pass',
  });

  // Dynamic custom fields input form values
  const [customFieldsInput, setCustomFieldsInput] = useState<Record<string, string>>({});

  // Action double confirmation state for deletes
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Reset helper
  const clearAllFilters = () => {
    setSearch('');
    setSelectedDept('');
    setSelectedStatus('');
    setSelectedCategory('');
    setCurrentPage(1);
  };

  // Derive unique Departments, Categories and Statuses for filter dropdowns safely
  const filtersData = useMemo(() => {
    const depts = new Set(records.map((r) => r.department).filter(Boolean));
    const categories = new Set(records.map((r) => r.category).filter(Boolean));
    const statuses = new Set(records.map((r) => r.status).filter(Boolean));
    return {
      departments: Array.from(depts).sort(),
      categories: Array.from(categories).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [records]);

  // Compute final filtered record items list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Fuzzy general query match (ID, Name, Title, Department, Rank, Category)
      const query = search.trim().toLowerCase();
      const matchQuery =
        !query ||
        r.employeeId.toLowerCase().includes(query) ||
        r.employeeName.toLowerCase().includes(query) ||
        r.trainingTitle.toLowerCase().includes(query) ||
        r.department.toLowerCase().includes(query) ||
        r.rank?.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query) ||
        (r.customFields &&
          Object.values(r.customFields).some(
            (val) => val && String(val).toLowerCase().includes(query)
          ));

      // 2. Department match
      const matchDept = !selectedDept || r.department === selectedDept;

      // 3. Status match
      const matchStatus = !selectedStatus || r.status === selectedStatus;

      // 4. Category match
      const matchCategory = !selectedCategory || r.category === selectedCategory;

      return matchQuery && matchDept && matchStatus && matchCategory;
    });
  }, [records, search, selectedDept, selectedStatus, selectedCategory]);

  // Handle Pagination indexing
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Prevent pagination index overflow when list shrinks
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setShowSelectChoice(true);
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setFormFields({
      sNo: String(records.length + 1),
      rank: 'Manager',
      employeeId: '',
      employeeName: '',
      department: '',
      trainingTitle: '',
      category: '',
      status: 'Pass',
    });

    // Reset dynamic inputs
    const defaultCustoms: Record<string, string> = {};
    customHeaders.forEach((ch) => {
      defaultCustoms[ch.id] = '';
    });
    setCustomFieldsInput(defaultCustoms);
    setShowFormModal(true);
  };

  const openEditModal = (rec: TrainingRecord) => {
    setEditingRecord(rec);
    setFormFields({
      sNo: rec.sNo || '',
      rank: rec.rank || '',
      employeeId: rec.employeeId,
      employeeName: rec.employeeName,
      department: rec.department,
      trainingTitle: rec.trainingTitle,
      category: rec.category || '',
      status: rec.status,
    });

    // Populate dynamic custom fields inputs values
    const dynamicInputValues: Record<string, string> = {};
    customHeaders.forEach((ch) => {
      dynamicInputValues[ch.id] = rec.customFields?.[ch.id] ? String(rec.customFields[ch.id]) : '';
    });
    setCustomFieldsInput(dynamicInputValues);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Map any custom field inputs based on correct types
    const typedCustomFields: Record<string, any> = {};
    customHeaders.forEach((ch) => {
      const val = customFieldsInput[ch.id];
      if (val !== undefined && val !== '') {
        if (ch.type === 'number') {
          const parsed = parseFloat(val);
          typedCustomFields[ch.id] = isNaN(parsed) ? val : parsed;
        } else if (ch.type === 'boolean') {
          typedCustomFields[ch.id] = val === 'true';
        } else {
          typedCustomFields[ch.id] = val.trim();
        }
      }
    });

    const recordData = {
      sNo: formFields.sNo.trim(),
      rank: formFields.rank.trim(),
      employeeId: formFields.employeeId.trim(),
      employeeName: formFields.employeeName.trim(),
      department: formFields.department.trim(),
      trainingTitle: formFields.trainingTitle.trim(),
      category: formFields.category.trim(),
      status: formFields.status.trim(),
      customFields: typedCustomFields,
    };

    try {
      if (editingRecord) {
        await onUpdateRecord(editingRecord.id, recordData);
      } else {
        await onAddRecord(recordData);
      }
      setShowFormModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCustomHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeaderName.trim()) return;

    setIsHeaderSubmitting(true);
    try {
      await onAddCustomHeader(newHeaderName, newHeaderType);
      setNewHeaderName('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsHeaderSubmitting(false);
    }
  };

  const handleDeleteHeaderItem = async (headerId: string) => {
    if (confirm(`Are you sure you want to delete column "${headerId}"? This will hide the field from all visual tables.`)) {
      await onDeleteCustomHeader(headerId);
    }
  };

  // Excel generation matching user format using ExcelJS / SheetJS style
  const exportToExcelFormat = (onlySelected: boolean) => {
    const listToExport = onlySelected
      ? records.filter((r) => selectedRows.includes(r.id))
      : filteredRecords;

    if (listToExport.length === 0) {
      alert('There is no data to export.');
      return;
    }

    // Map list to flattened objects dynamically using Custom Fields
    const formattedData = listToExport.map((r) => {
      const baseRow: Record<string, any> = {
        'S No': r.sNo || '',
        'Rank': r.rank || '',
        'Employee ID': r.employeeId,
        'Employee Name': r.employeeName,
        'Department': r.department,
        'Training Title': r.trainingTitle,
        'Category': r.category || '',
        'Status': r.status,
      };

      // Add dynamic customizable customFields as flat output spreadsheet rows
      customHeaders.forEach((ch) => {
        baseRow[ch.name] = r.customFields?.[ch.id] !== undefined ? r.customFields[ch.id] : '';
      });

      baseRow['System Last Uploaded At'] = r.uploadedAt;
      return baseRow;
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Training Matrix Report');
    XLSX.writeFile(wb, `Training_Records_Overall_Export_${Date.now().toString().substring(6)}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden" id="training-database-panel">
      {/* Search Header toolbar bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200/60" id="toolbar-actions">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Action search input box form */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, Name, Title, Rank, Category, comments..."
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
              id="search-employee-db"
            />
          </div>

          {/* Action buttons (Manual Entry & Export) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Dynamic Customizable Columns Control */}
            <button
              onClick={() => setShowHeadersModal(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/85 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Add or remove training record dynamic headers"
              id="manage-custom-headers-btn"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-slate-500" />
              Manage Columns
            </button>

            {selectedRows.length > 0 ? (
              <>
                <button
                  onClick={() => exportToExcelFormat(true)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="export-selected-rows-btn"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Export Selected ({selectedRows.length})
                </button>

                {showBulkDeleteConfirm ? (
                  <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                    <span className="text-[10px] text-red-600 font-bold mr-1">Delete {selectedRows.length} entries?</span>
                    <button
                      onClick={async () => {
                        await onDeleteRecords(selectedRows);
                        setSelectedRows([]);
                        setShowBulkDeleteConfirm(false);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-0.5 px-2 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      id="confirm-bulk-delete-btn"
                    >
                      <Check className="w-3 h-3" />
                      Yes
                    </button>
                    <button
                      onClick={() => setShowBulkDeleteConfirm(false)}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] py-0.5 px-1.5 rounded-md transition-all cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    id="bulk-delete-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => exportToExcelFormat(false)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                id="export-overall-master-btn"
              >
                <Download className="w-3.5 h-3.5" />
                Export Master Report
              </button>
            )}

            <button
              onClick={openAddModal}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              id="add-manual-record-btn"
            >
              <Plus className="w-3.5 h-3.5 animate-bounce" />
              Add Record
            </button>
          </div>
        </div>

        {/* Detailed High Density Dropdown Filters Panel */}
        <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200/50" id="filters-accordion-panel">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Filter: Department */}
            <div className="col-span-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-md text-xs py-1 px-2 text-slate-700 focus:outline-hidden focus:border-slate-800"
              >
                <option value="">All Departments</option>
                {filtersData.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Category */}
            <div className="col-span-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-md text-xs py-1 px-2 text-slate-700 focus:outline-hidden focus:border-slate-800"
              >
                <option value="">All Categories</option>
                {filtersData.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Status */}
            <div className="col-span-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Training Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-md text-xs py-1 px-2 text-slate-700 focus:outline-hidden focus:border-slate-800"
              >
                <option value="">All Statuses</option>
                {filtersData.statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters helper button */}
            <div className="col-span-1 flex items-end">
              <button
                onClick={clearAllFilters}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] py-1 px-2 rounded-md transition-all cursor-pointer text-center"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Database Master Training Records Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse" id="master-training-table-element">
          <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200/60 font-semibold">
            <tr className="divide-x divide-slate-100/40">
              <th className="px-3 py-2 text-center w-8">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedRows.includes(r.id))}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                />
              </th>
              <th className="px-2 py-2 font-bold w-12 text-center">S No</th>
              <th className="px-2 py-2 w-14">Rank</th>
              <th className="px-3 py-2 w-28">Employee ID</th>
              <th className="px-3 py-2 w-32">Employee Name</th>
              <th className="px-3 py-2 w-24">Department</th>
              <th className="px-3 py-2 max-w-[250px]">Training Title</th>
              <th className="px-3 py-2 w-24">Category</th>
              <th className="px-3 py-2 w-20 text-center">Status</th>

              {/* Dynamic Added Customizable Column Headers */}
              {customHeaders.map((ch) => (
                <th key={ch.id} className="px-3 py-2 text-slate-600 italic bg-yellow-50/20 max-w-[120px] truncate" title={ch.name}>
                  {ch.name}
                </th>
              ))}

              <th className="px-4 py-2 text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/85 text-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={10 + customHeaders.length} className="px-6 py-14 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <SlidersHorizontal className="w-6 h-6 text-slate-350" />
                    <p className="font-bold text-slate-600 text-xs">No training records found</p>
                    <p className="text-[10px] text-slate-450">Try resetting filters above or upload a fresh Excel log sheet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r) => (
                <tr
                  key={r.id}
                  className={`hover:bg-slate-50/50 transition-colors divide-x divide-slate-100/40 ${
                    selectedRows.includes(r.id) ? 'bg-indigo-50/15' : ''
                  }`}
                >
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(r.id)}
                      onChange={(e) => handleSelectRow(r.id, e.target.checked)}
                      className="rounded-sm border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-slate-400">{r.sNo || '-'}</td>
                  <td className="px-2 py-1.5 truncate text-slate-500">{r.rank || '-'}</td>
                  <td className="px-3 py-1.5 font-mono font-bold text-slate-800">{r.employeeId}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-900">{r.employeeName}</td>
                  <td className="px-3 py-1.5 text-slate-600 truncate">{r.department}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800 max-w-[280px] break-words" title={r.trainingTitle}>
                    {r.trainingTitle}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded border border-slate-200">
                      {r.category || 'N/A'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        r.status?.trim().toLowerCase() === 'pass' || r.status?.trim().toLowerCase() === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : r.status?.trim().toLowerCase() === 'fail' || r.status?.trim().toLowerCase() === 'failed'
                          ? 'bg-red-50 text-red-700 border border-red-10 border-red-200'
                          : r.status?.trim().toLowerCase() === 'withdrawn'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>

                  {/* Render dynamically added custom values */}
                  {customHeaders.map((ch) => (
                    <td key={ch.id} className="px-3 py-1.5 font-sans font-medium text-slate-600 max-w-[120px] truncate bg-yellow-50/5">
                      {r.customFields?.[ch.id] !== undefined ? String(r.customFields[ch.id]) : '-'}
                    </td>
                  ))}

                  {/* Row manual actions */}
                  <td className="px-4 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center gap-1 bg-red-100 p-0.5 rounded border border-red-200">
                          <button
                            onClick={async () => {
                              await onDeleteRecord(r.id);
                              setConfirmDeleteId(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white p-0.5 rounded text-[9px] font-bold"
                            title="Confirm delete"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-white text-slate-500 hover:text-slate-700 p-0.5 rounded text-[9px]"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(r.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Grid Navigation Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-slate-200/60 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[10px] text-slate-450">
            Showing <span className="font-bold text-slate-755 font-mono">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-bold text-slate-755 font-mono">
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
            </span>{' '}
            of <span className="font-bold text-slate-755 font-mono">{filteredRecords.length}</span> master entries
          </div>

          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 border border-slate-200 rounded bg-white text-slate-500 hover:text-slate-750 disabled:opacity-50 disabled:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                  currentPage === p
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'border border-slate-200 text-slate-500 bg-white hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 border border-slate-200 rounded bg-white text-slate-500 hover:text-slate-750 disabled:opacity-50 disabled:bg-slate-100 transition-colors"
              id="next-page-btn"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Headers Administration Modal */}
      <AnimatePresence>
        {showHeadersModal && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-slate-350" />
                  Define Customizable Columns
                </h3>
                <button onClick={() => setShowHeadersModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4 flex-1">
                {/* Creator form */}
                <form onSubmit={handleCreateCustomHeader} className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/70 space-y-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Add Training Column Header</div>
                  
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Column Label/Name *</label>
                    <input
                      type="text"
                      required
                      value={newHeaderName}
                      onChange={(e) => setNewHeaderName(e.target.value)}
                      placeholder="e.g. Score, Expiry Date, Trainer"
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Data Type</label>
                    <select
                      value={newHeaderType}
                      onChange={(e) => setNewHeaderType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800"
                    >
                      <option value="string">Text (Plain string)</option>
                      <option value="number">Numeric (Float/Decimal)</option>
                      <option value="boolean">Logical checkbox (Boolean)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isHeaderSubmitting}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-md transition-colors"
                  >
                    {isHeaderSubmitting ? 'Registering Column...' : 'Add Column Header'}
                  </button>
                </form>

                {/* List of active custom columns */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dynamic Customizable Columns ({customHeaders.length})</div>
                  {customHeaders.length === 0 ? (
                    <div className="text-center p-4 text-[10px] text-slate-400 bg-slate-50 rounded italic border">
                      No custom column headers defined.
                    </div>
                  ) : (
                    <div className="divide-y border rounded bg-white overflow-hidden max-h-48 overflow-y-auto">
                      {customHeaders.map((ch) => (
                        <div key={ch.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-800">{ch.name}</span>
                            <span className="font-mono text-[9px] text-slate-400 ml-1.5">({ch.type})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteHeaderItem(ch.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Delete Column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit manual record Overlay Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="manual-record-form-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              id="manual-record-form-container"
            >
              {/* Form title */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  {editingRecord ? 'Edit Training Record entry' : 'New Manual Training Record entry'}
                </h3>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content panel */}
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">S No</label>
                    <input
                      type="text"
                      value={formFields.sNo}
                      onChange={(e) => setFormFields({ ...formFields, sNo: e.target.value })}
                      placeholder="e.g. 1"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Rank</label>
                    <input
                      type="text"
                      value={formFields.rank}
                      onChange={(e) => setFormFields({ ...formFields, rank: e.target.value })}
                      placeholder="e.g. Manager"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Employee ID *</label>
                    <input
                      type="text"
                      required
                      value={formFields.employeeId}
                      onChange={(e) => setFormFields({ ...formFields, employeeId: e.target.value })}
                      placeholder="e.g. ADIC(O)/0001"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Employee Name *</label>
                    <input
                      type="text"
                      required
                      value={formFields.employeeName}
                      onChange={(e) => setFormFields({ ...formFields, employeeName: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Department *</label>
                    <input
                      type="text"
                      required
                      value={formFields.department}
                      onChange={(e) => setFormFields({ ...formFields, department: e.target.value })}
                      placeholder="e.g. FCS"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Training Title *</label>
                    <input
                      type="text"
                      required
                      value={formFields.trainingTitle}
                      onChange={(e) => setFormFields({ ...formFields, trainingTitle: e.target.value })}
                      placeholder="e.g. Flight Control Design"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Category</label>
                    <input
                      type="text"
                      value={formFields.category}
                      onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
                      placeholder="e.g. Course 01-25"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Status</label>
                    <input
                      type="text"
                      required
                      value={formFields.status}
                      onChange={(e) => setFormFields({ ...formFields, status: e.target.value })}
                      placeholder="e.g. Pass, Fail, Withdrawn"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800 font-bold"
                    />
                  </div>
                </div>

                {/* Dynamically Defined Inputs Block */}
                {customHeaders.length > 0 && (
                  <div className="border-t border-slate-150 pt-2.5 mt-2.5 space-y-2.5">
                    <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Dynamic Columns Values</div>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      {customHeaders.map((ch) => (
                        <div key={ch.id}>
                          <label className="text-[9px] font-bold text-slate-500 block mb-0.5">{ch.name}</label>
                          {ch.type === 'boolean' ? (
                            <select
                              value={customFieldsInput[ch.id] || 'false'}
                              onChange={(e) => setCustomFieldsInput({ ...customFieldsInput, [ch.id]: e.target.value })}
                              className="w-full bg-slate-50/70 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800"
                            >
                              <option value="false">False / Unchecked</option>
                              <option value="true">True / Checked</option>
                            </select>
                          ) : (
                            <input
                              type={ch.type === 'number' ? 'number' : 'text'}
                              value={customFieldsInput[ch.id] || ''}
                              onChange={(e) => setCustomFieldsInput({ ...customFieldsInput, [ch.id]: e.target.value })}
                              placeholder={`Type ${ch.type} value`}
                              className="w-full bg-slate-50/70 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-slate-800"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-1.5 text-xs font-semibold text-slate-550 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Select All Choice Dialog Box Modal */}
      <AnimatePresence>
        {showSelectChoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="select-all-prompt-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl p-5 space-y-4 text-slate-800"
              id="select-all-choice-card"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Grid3X3 className="w-4 h-4 text-slate-500" />
                  Select Range Mode
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSelectChoice(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Selection Range Preference</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  You triggered a bulk select. Please choose which training records you would like to select:
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {/* 1. Current Page selection */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRows(paginatedRecords.map((r) => r.id));
                    setShowSelectChoice(false);
                  }}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100/90 active:bg-slate-200 text-slate-800 text-xs py-2.5 px-3.5 rounded-xl border border-slate-200/85 font-semibold transition-all flex items-center justify-between cursor-pointer"
                  id="select-current-page-only-btn"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-450"></span>
                    Current Page Only
                  </span>
                  <span className="bg-slate-250 text-slate-700 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md">
                    {paginatedRecords.length} items
                  </span>
                </button>

                {/* 2. Filter result selection (only if active filters are applied and it differs from overall size) */}
                {(search.trim() !== '' || selectedDept !== '' || selectedStatus !== '' || selectedCategory !== '') && filteredRecords.length !== records.length && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRows(filteredRecords.map((r) => r.id));
                      setShowSelectChoice(false);
                    }}
                    className="w-full text-left bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-900 text-xs py-2.5 px-3.5 rounded-xl border border-teal-200/60 font-semibold transition-all flex items-center justify-between cursor-pointer"
                    id="select-filtered-only-btn"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                      Matching Filter Results
                    </span>
                    <span className="bg-teal-250 text-teal-800 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md">
                      {filteredRecords.length} items
                    </span>
                  </button>
                )}

                {/* 3. Entire master database */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRows(records.map((r) => r.id));
                    setShowSelectChoice(false);
                  }}
                  className="w-full text-left bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-150 text-indigo-900 text-xs py-2.5 px-3.5 rounded-xl border border-indigo-250/80 font-bold transition-all flex items-center justify-between cursor-pointer"
                  id="select-all-db-btn"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Entire Database
                  </span>
                  <span className="bg-indigo-150 text-indigo-800 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md">
                    {records.length} items
                  </span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 italic">Total database: {records.length} records</span>
                <button
                  type="button"
                  onClick={() => setShowSelectChoice(false)}
                  className="text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
