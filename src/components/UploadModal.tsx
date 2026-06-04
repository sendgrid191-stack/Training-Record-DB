/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  Eye,
  Trash2,
  Table,
} from 'lucide-react';
import { parseTrainingExcel } from '../utils/trainingParser';
import { ExcelParseResult, ValidationError, TrainingRecord } from '../types';

interface UploadModalProps {
  onClose: () => void;
  onImportComplete: (
    validRecords: Omit<TrainingRecord, 'id' | 'uploadedAt' | 'uploadBatchId'>[],
    filename: string,
    hasWarnings: boolean
  ) => void;
}

export default function UploadModal({ onClose, onImportComplete }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [currentTab, setCurrentTab] = useState<'preview' | 'messages'>('preview');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFile(droppedFiles[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFile(selectedFiles[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv' && ext !== 'ods') {
      alert('Unsupported file format. Please upload an Excel (.xlsx, .xls, .ods) or CSV file.');
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);
    setParseResult(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = await parseTrainingExcel(buffer, selectedFile.name);
      setParseResult(result);
      
      // Auto-focus notifications if errors occur and no healthy records are found
      if (result.validRecords.length === 0 && result.errors.length > 0) {
        setCurrentTab('messages');
      } else {
        setCurrentTab('preview');
      }
    } catch (err) {
      console.error(err);
      alert('Error parsing training spreadsheet. Please verify the spreadsheet is not password protected or corrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  const executeMerge = () => {
    if (!parseResult || parseResult.validRecords.length === 0) return;
    
    const hasWarnings = parseResult.errors.some((e) => e.severity === 'warning');
    onImportComplete(parseResult.validRecords, file?.name || 'Uploaded File', hasWarnings);
    onClose();
  };

  const resetUploader = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group errors by severity
  const errors = parseResult?.errors.filter((e) => e.severity === 'error') || [];
  const warnings = parseResult?.errors.filter((e) => e.severity === 'warning') || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="uploader-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-4xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        id="uploader-modal-container"
      >
        {/* Header section */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Upload Excel Training File</h3>
              <p className="text-[11px] text-slate-400">Validate and continuously merge record batches into master DB.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
          <AnimatePresence mode="wait">
            {!file ? (
              // 1. Dropzone stage
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-10 cursor-pointer text-center flex flex-col items-center justify-center min-h-[350px] transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/20 shadow-inner'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                }`}
                id="uploader-drop-target"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv,.ods"
                  className="hidden"
                />
                
                <div className="w-16 h-16 bg-white border border-slate-100 shadow-sm text-indigo-600 rounded-2xl flex items-center justify-center mb-5">
                  <Upload className="w-8 h-8" />
                </div>
                
                <h4 className="text-base font-bold text-slate-800">Drag & drop your Excel or CSV training record</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                  Supports <span className="font-semibold text-slate-700">.xlsx, .xls, .ods, and .csv</span> spreadsheet templates. Synonyms mapping is applied automatically.
                </p>
                <button
                  type="button"
                  className="mt-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-xs pointer-events-none"
                >
                  Choose File manually
                </button>
              </motion.div>
            ) : isLoading ? (
              // 2. Loading / Processing stage
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
                id="uploader-loading"
              >
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-6">Analyzing Spreadsheet Schema</h4>
                <p className="text-xs text-slate-400 mt-1">Applying headers dictionary and running validation audits...</p>
              </motion.div>
            ) : (
              // 3. Analysis Reports/Preview stage
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* File summary bar */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs">
                      XLS
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 truncate max-w-[250px]">{file.name}</h4>
                      <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB • Completed audit</p>
                    </div>
                  </div>
                  <button
                    onClick={resetUploader}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset File
                  </button>
                </div>

                {/* Grid validation blocks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Block 1: Passed Rows */}
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-emerald-800">Clear Records</h5>
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        {parseResult?.validRecords.length} records ready to merge.
                      </p>
                    </div>
                  </div>

                  {/* Block 2: Critical Errors */}
                  <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-red-800">Critical Errors</h5>
                      <p className="text-[10px] text-red-600 mt-0.5">
                        {errors.length} row(s) failed strict parameters (skipped).
                      </p>
                    </div>
                  </div>

                  {/* Block 3: Warnings entries */}
                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-800">Import Warnings</h5>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        {warnings.length} issues registered (auto resolved).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabs to toggle preview vs messages */}
                <div className="border-b border-slate-100 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentTab('preview')}
                      className={`pb-2.5 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
                        currentTab === 'preview'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Table className="w-4 h-4" />
                        Preview Draft ({parseResult?.validRecords.length})
                      </span>
                    </button>
                    {(errors.length > 0 || warnings.length > 0) && (
                      <button
                        onClick={() => setCurrentTab('messages')}
                        className={`pb-2.5 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
                          currentTab === 'messages'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-red-500">
                          <AlertCircle className="w-4 h-4" />
                          Validation Report ({parseResult?.errors.length})
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs contents */}
                <div>
                  {currentTab === 'preview' ? (
                    parseResult && parseResult.validRecords.length > 0 ? (
                      <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto max-h-[300px]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200 shadow-2xs font-semibold">
                              <tr>
                                <th className="px-4 py-3">Emp ID</th>
                                <th className="px-4 py-3">Employee Name</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Training Title</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Hours</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parseResult.validRecords.map((r, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-2.5 font-bold font-mono text-slate-700">{r.employeeId}</td>
                                  <td className="px-4 py-2.5 font-medium text-slate-600">{r.employeeName}</td>
                                  <td className="px-4 py-2.5 text-slate-500">{r.department}</td>
                                  <td className="px-4 py-2.5 font-medium text-slate-700 truncate max-w-[150px]">{r.trainingTitle}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                      {r.trainingCategory || 'Compliance'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        r.status === 'Completed'
                                          ? 'bg-emerald-50 text-emerald-600'
                                          : r.status === 'Pending'
                                          ? 'bg-amber-50 text-amber-600'
                                          : 'bg-red-50 text-red-600'
                                      }`}
                                    >
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-600">{r.hours} hrs</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        No clear records were identified in the spreadsheet. All rows have critical validation errors.
                      </div>
                    )
                  ) : (
                    // Messages validation list view
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {parseResult?.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                            err.severity === 'error'
                              ? 'bg-red-50 border-red-100 text-red-700'
                              : 'bg-amber-50 border-amber-100 text-amber-800'
                          }`}
                        >
                          <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${err.severity === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
                          <div className="flex-1">
                            <span className="font-bold font-mono text-[10px] bg-white border border-black/10 px-1.5 py-0.5 rounded-sm mr-2 shadow-2xs">
                              ROW {err.row || 'Schema'}
                            </span>
                            {err.field && <span className="font-bold uppercase tracking-wider text-[10px] opacity-75 mr-1.5">{err.field}:</span>}
                            <span>{err.message}</span>
                            {err.value && (
                              <div className="mt-1 font-mono text-[10px] opacity-60 truncate">
                                Value read: "{err.value}"
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          {file && parseResult && parseResult.validRecords.length > 0 && (
            <button
              onClick={executeMerge}
              className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-2 hover:shadow-lg transition-all"
              id="uploader-sync-records-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Merge & Sync {parseResult.validRecords.length} Records
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
