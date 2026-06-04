/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Award,
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  BookMarked,
  FolderLock
} from 'lucide-react';
import { TrainingRecord } from '../types';
import { getNormalizedCategory } from '../utils/compliance';

interface PolicyAuditorProps {
  records: TrainingRecord[];
}

export default function PolicyAuditor({ records }: PolicyAuditorProps) {
  // Navigation, search & filter states
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRankFilter, setAuditRankFilter] = useState('All');
  const [auditStatusFilter, setAuditStatusFilter] = useState('All');
  const [auditPage, setAuditPage] = useState(1);
  const itemsPerAuditPage = 8;

  // Selected/Expanded rows
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);

  // 1. Compile Unique Course Syllabus Catalog per Category (Fundamentals, CAT-A, CAT-B, CAT-C, CAT-D, Other)
  const uniqueTrainingsList = useMemo(() => {
    const titlesMap = new Map<string, { category: string; count: number; passedCount: number }>();
    
    records.forEach((r) => {
      const title = (r.trainingTitle || '').trim();
      if (!title) return;
      const cat = (r.category || '').trim();
      const isPassed = r.status?.trim().toLowerCase() === 'pass' || r?.status?.trim().toLowerCase() === 'completed';

      const existing = titlesMap.get(title);
      if (existing) {
        existing.count++;
        if (isPassed) existing.passedCount++;
        if (cat && !existing.category) {
          existing.category = cat;
        }
      } else {
        titlesMap.set(title, {
          category: cat || 'Uncategorized',
          count: 1,
          passedCount: isPassed ? 1 : 0,
        });
      }
    });

    return Array.from(titlesMap.entries()).map(([title, val]) => ({
      title,
      category: val.category,
      count: val.count,
      passedCount: val.passedCount,
    })).sort((a, b) => a.title.localeCompare(b.title));
  }, [records]);

  // Translate unique training lists per core category
  const categorySummary = useMemo(() => {
    const counts = {
      'Fundamentals': 0,
      'CAT-A': 0,
      'CAT-B': 0,
      'CAT-C': 0,
      'CAT-D': 0,
      'Other': 0
    };

    const lists: Record<string, string[]> = {
      'Fundamentals': [],
      'CAT-A': [],
      'CAT-B': [],
      'CAT-C': [],
      'CAT-D': [],
      'Other': []
    };

    uniqueTrainingsList.forEach((item) => {
      const catKey = getNormalizedCategory(item.category);
      counts[catKey]++;
      lists[catKey].push(item.title);
    });

    return { counts, lists };
  }, [uniqueTrainingsList]);

  // 2. Perform comprehensive policy auditing on employees
  const employeeComplianceList = useMemo(() => {
    const empGroups: Record<string, {
      employeeId: string;
      employeeName: string;
      rank: string;
      department: string;
      passedRecords: TrainingRecord[];
    }> = {};

    records.forEach((r) => {
      const empId = (r.employeeId || '').trim();
      if (!empId) return;
      const key = empId.toUpperCase();
      const isPassed = r.status?.trim().toLowerCase() === 'pass' || r.status?.trim().toLowerCase() === 'completed';

      if (!empGroups[key]) {
        empGroups[key] = {
          employeeId: r.employeeId,
          employeeName: r.employeeName || 'Unknown Employee',
          rank: r.rank || 'Staff',
          department: r.department || 'N/A',
          passedRecords: [],
        };
      }

      if (r.employeeName && empGroups[key].employeeName === 'Unknown Employee') {
        empGroups[key].employeeName = r.employeeName;
      }
      if (r.rank && (!empGroups[key].rank || empGroups[key].rank === 'Staff')) {
        empGroups[key].rank = r.rank;
      }
      if (r.department && (!empGroups[key].department || empGroups[key].department === 'N/A')) {
        empGroups[key].department = r.department;
      }

      if (isPassed) {
        empGroups[key].passedRecords.push(r);
      }
    });

    return Object.values(empGroups).map((emp) => {
      // Collect unique course titles they've successfully passed using getNormalizedCategory
      const completedByCategory: Record<string, string[]> = {
        'Fundamentals': [],
        'CAT-A': [],
        'CAT-B': [],
        'CAT-C': [],
        'CAT-D': [],
        'Other': []
      };

      const completedTitles = new Set<string>();

      emp.passedRecords.forEach((r) => {
        const title = (r.trainingTitle || '').trim();
        if (!title || completedTitles.has(title)) return;
        
        completedTitles.add(title);
        const normCat = getNormalizedCategory(r.category);
        completedByCategory[normCat].push(title);
      });

      // Analyze policy rank details
      const normRank = emp.rank.toLowerCase();
      const isAssistantManager = normRank.includes('assistant') && normRank.includes('manager');
      const isManager = !isAssistantManager && normRank.includes('manager');

      let rankClass: 'Assistant Manager' | 'Manager' | 'Other' = 'Other';
      if (isAssistantManager) rankClass = 'Assistant Manager';
      else if (isManager) rankClass = 'Manager';

      const requirements = {
        'Fundamentals': 0,
        'CAT-A': 0,
        'CAT-B': 0,
        'CAT-C': 0,
        'CAT-D': 0,
      };

      if (rankClass === 'Assistant Manager') {
        requirements['Fundamentals'] = categorySummary.counts['Fundamentals'];
        requirements['CAT-A'] = 5;
        requirements['CAT-B'] = 4;
        requirements['CAT-C'] = 1;
        requirements['CAT-D'] = 2;
      } else if (rankClass === 'Manager') {
        requirements['Fundamentals'] = categorySummary.counts['Fundamentals'];
        requirements['CAT-A'] = categorySummary.counts['CAT-A'];
        requirements['CAT-B'] = 6;
        requirements['CAT-C'] = 3;
        requirements['CAT-D'] = 4;
      }

      let isComplied = true;
      const categoryAudits = ['Fundamentals', 'CAT-A', 'CAT-B', 'CAT-C', 'CAT-D'].map((cat) => {
        const completedCount = completedByCategory[cat].length;
        const requiredCount = requirements[cat as keyof typeof requirements];
        const complied = completedCount >= requiredCount;
        
        if (requiredCount > 0 && !complied) {
          isComplied = false;
        }

        const gap = Math.max(0, requiredCount - completedCount);
        
        // Find uncompleted course options in category
        const masterList = categorySummary.lists[cat];
        const uncompletedTitles = masterList.filter(t => !completedByCategory[cat].includes(t));

        return {
          catName: cat,
          completedCount,
          requiredCount,
          complied,
          gap,
          uncompletedTitles,
        };
      });

      // Formulate detailed remaining guidance texts
      const remainingTexts: string[] = [];
      categoryAudits.forEach((aud) => {
        if (!aud.complied && aud.requiredCount > 0) {
          if (aud.catName === 'Fundamentals' || (aud.catName === 'CAT-A' && rankClass === 'Manager')) {
            remainingTexts.push(
              `${aud.catName}: Missing mandatory specific course(s): ${
                aud.uncompletedTitles.length > 0 ? aud.uncompletedTitles.slice(0, 4).join(', ') : 'N/A'
              }${aud.uncompletedTitles.length > 4 ? '...' : ''}`
            );
          } else {
            const extra = aud.uncompletedTitles.length > 0 
              ? ` (options include: ${aud.uncompletedTitles.slice(0, 2).join(', ')})`
              : '';
            remainingTexts.push(`${aud.catName}: Needs ${aud.gap} more course(s)${extra}`);
          }
        }
      });

      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        rank: emp.rank,
        rankClass,
        department: emp.department,
        completedByCategory,
        categoryAudits,
        isComplied: rankClass === 'Other' ? null : isComplied,
        remainingTexts,
        totalPassedCount: completedTitles.size,
      };
    });
  }, [records, categorySummary]);

  // Filtered employees listing
  const filteredAudits = useMemo(() => {
    return employeeComplianceList.filter((emp) => {
      const matchSearch = 
        emp.employeeName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(auditSearch.toLowerCase()) ||
        emp.department.toLowerCase().includes(auditSearch.toLowerCase());

      const matchRank = 
        auditRankFilter === 'All' ||
        (auditRankFilter === 'Assistant Manager' && emp.rankClass === 'Assistant Manager') ||
        (auditRankFilter === 'Manager' && emp.rankClass === 'Manager') ||
        (auditRankFilter === 'Other' && emp.rankClass === 'Other');

      const matchStatus = 
        auditStatusFilter === 'All' ||
        (auditStatusFilter === 'Complied' && emp.isComplied === true) ||
        (auditStatusFilter === 'Pending' && emp.isComplied === false) ||
        (auditStatusFilter === 'NA' && emp.isComplied === null);

      return matchSearch && matchRank && matchStatus;
    });
  }, [employeeComplianceList, auditSearch, auditRankFilter, auditStatusFilter]);

  // Paginated records
  const paginatedAudits = useMemo(() => {
    const startIdx = (auditPage - 1) * itemsPerAuditPage;
    return filteredAudits.slice(startIdx, startIdx + itemsPerAuditPage);
  }, [filteredAudits, auditPage]);

  const totalAuditPages = Math.ceil(filteredAudits.length / itemsPerAuditPage);

  // Quick stats recap bar
  const auditStatsRecap = useMemo(() => {
    const targetStaff = employeeComplianceList.filter(e => e.rankClass !== 'Other');
    const totalTarget = targetStaff.length;
    const compliedTarget = targetStaff.filter(e => e.isComplied === true).length;
    const pendingTarget = totalTarget - compliedTarget;
    const rate = totalTarget > 0 ? Math.round((compliedTarget / totalTarget) * 100) : 100;

    return {
      totalTarget,
      compliedTarget,
      pendingTarget,
      rate
    };
  }, [employeeComplianceList]);

  const resetFilters = () => {
    setAuditSearch('');
    setAuditRankFilter('All');
    setAuditStatusFilter('All');
    setAuditPage(1);
  };

  return (
    <div className="space-y-6" id="auditor-section-container">
      
      {/* 1. Explanatory banner card detailing compliance requirements */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="w-36 h-36 rotate-12" />
        </div>
        
        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/30 text-indigo-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest border border-indigo-400/20">
              Compliance Watch
            </span>
            <span className="bg-emerald-500/25 text-emerald-400 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase border border-emerald-500/20">
              Live Auditing Active
            </span>
          </div>
          
          <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
            Individual Employee Training Policy Auditor
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed">
            This workspace dynamically evaluates completed staff records (marked complete or passed) against standard legal rank regulations. If a course category is uploaded with synomic names, it is automatically resolved dynamically.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="font-bold text-indigo-300 flex items-center gap-1 mb-1">
                Assistant Manager Requirement
              </span>
              <ul className="space-y-0.5 text-slate-350 list-disc list-inside text-[11px] font-mono">
                <li>All Fundamentals ({categorySummary.counts['Fundamentals']} courses)</li>
                <li>05 Courses from CAT-A</li>
                <li>04 Courses from CAT-B</li>
                <li>01 Course from CAT-C</li>
                <li>02 Courses from CAT-D</li>
              </ul>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="font-bold text-amber-300 flex items-center gap-1 mb-1">
                Manager Requirement
              </span>
              <ul className="space-y-0.5 text-slate-350 list-disc list-inside text-[11px] font-mono">
                <li>All Fundamentals ({categorySummary.counts['Fundamentals']} courses)</li>
                <li>All CAT-A ({categorySummary.counts['CAT-A']} courses)</li>
                <li>06 Courses from CAT-B</li>
                <li>03 Courses from CAT-C</li>
                <li>04 Courses from CAT-D</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Micro Stats recap banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-450">Tracked Policy Officers</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{auditStatsRecap.totalTarget}</span>
            <span className="text-[10px] text-slate-400">AM & Manager Ranks</span>
          </div>
        </div>

        <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-450">Fully Complied</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">{auditStatsRecap.compliedTarget}</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">({auditStatsRecap.rate}%)</span>
          </div>
        </div>

        <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs border-l-4 border-l-amber-500">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-450">Pending Requirements</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">{auditStatsRecap.pendingTarget}</span>
            <span className="text-[10px] text-slate-400">Ongoing Training</span>
          </div>
        </div>

        <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-450">Course Catalog Pool</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-600 font-mono">{uniqueTrainingsList.length}</span>
            <span className="text-[10px] text-slate-400">Total Unique Syllabus</span>
          </div>
        </div>
      </div>

      {/* 3. The main interactive Ledger ledger table block */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Dynamic filter toolbar */}
        <div className="p-5 border-b border-slate-200/60 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Individual Auditor Ledger
              </h3>
              <p className="text-[11px] text-slate-400">
                Search and audit employee compliance. Expanding a row will reveal the precise courses complete or remaining in each policy category.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Name / ID / Dept..."
                  value={auditSearch}
                  onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-52 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Filter Rank Policy */}
              <select
                value={auditRankFilter}
                onChange={(e) => { setAuditRankFilter(e.target.value); setAuditPage(1); }}
                className="bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs font-sans text-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="All">All Official Ranks</option>
                <option value="Assistant Manager">Assistant Manager criteria Only</option>
                <option value="Manager">Manager criteria Only</option>
                <option value="Other">Other (No Policy tracked)</option>
              </select>

              {/* Filter Compliance Status Code */}
              <select
                value={auditStatusFilter}
                onChange={(e) => { setAuditStatusFilter(e.target.value); setAuditPage(1); }}
                className="bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs font-sans text-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="All">All Compliance States</option>
                <option value="Complied">Fully Complied State</option>
                <option value="Pending">Pending / In-Progress</option>
                <option value="NA">Not Applicable (Other ranks)</option>
              </select>

              {(auditSearch || auditRankFilter !== 'All' || auditStatusFilter !== 'All') && (
                <button 
                  onClick={resetFilters}
                  className="bg-slate-150 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs transition-colors font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ledger view table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-100/60 text-slate-500 border-b border-slate-200/60 font-semibold uppercase tracking-wider text-[10px]">
              <tr className="divide-x divide-slate-100">
                <th className="px-4 py-3 w-10 text-center">Audit</th>
                <th className="px-3 py-3">Employee Details</th>
                <th className="px-3 py-3 w-36">Rank Profile</th>
                <th className="px-3 py-3 w-32 text-center">Compliance Status</th>
                <th className="px-3 py-3 text-center w-56">Course Categories Ratio</th>
                <th className="px-4 py-3 text-right w-24">Passed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705">
              {paginatedAudits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-1 p-4">
                      <ShieldAlert className="w-8 h-8 text-slate-300 mb-1" />
                      <p className="font-bold text-slate-600 text-xs">No personnel records found matching current query</p>
                      <button 
                        onClick={resetFilters}
                        className="text-indigo-600 text-[10px] font-bold mt-2 hover:underline cursor-pointer"
                      >
                        Reset LEDGER filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAudits.map((item) => {
                  const isExpanded = expandedEmpId === item.employeeId;
                  const hasRemaining = item.remainingTexts.length > 0;

                  return (
                    <tbody key={item.employeeId} className={`divide-y divide-slate-100 ${isExpanded ? 'bg-indigo-50/5' : ''}`}>
                      {/* Main Summary data row info */}
                      <tr 
                        className={`hover:bg-slate-50/60 transition-colors cursor-pointer divide-x divide-slate-100/60 ${isExpanded ? 'bg-indigo-50/10' : ''}`}
                        onClick={() => setExpandedEmpId(isExpanded ? null : item.employeeId)}
                      >
                        {/* Accordion trigger cell */}
                        <td className="px-4 py-4 text-center">
                          <button 
                            className="p-1 text-slate-400 hover:text-slate-850 transition-transform cursor-pointer"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </td>

                        {/* Name panel and employee basic metadata */}
                        <td className="px-3 py-3.5">
                          <div>
                            <span className="font-bold text-slate-950 text-xs flex items-center gap-1.5 hover:text-indigo-600">
                              {item.employeeName}
                            </span>
                            <div className="text-[10px] text-slate-450 mt-1 flex items-center font-mono gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-700 bg-slate-50 border border-slate-150 rounded px-1 min-w-[30px] inline-block text-center">{item.employeeId}</span>
                              <span className="text-slate-400">•</span>
                              Dept: <span className="font-semibold text-slate-600">{item.department}</span>
                            </div>
                          </div>
                        </td>

                        {/* Rank tag info */}
                        <td className="px-3 py-3.5">
                          <div>
                            <span className="bg-slate-100 text-slate-700 border border-slate-200/90 font-semibold px-2 py-0.5 rounded text-[10px]">
                              {item.rank}
                            </span>
                            {item.rankClass !== 'Other' && (
                              <p className="text-[8px] text-indigo-650 font-bold tracking-tight uppercase mt-1">Has Policy Audit</p>
                            )}
                          </div>
                        </td>

                        {/* Overall Policy compliance status badge */}
                        <td className="px-3 py-3.5 text-center">
                          {item.rankClass === 'Other' ? (
                            <span className="text-slate-400 text-[9px] font-bold font-mono">N/A (No Policy)</span>
                          ) : item.isComplied ? (
                            <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full inline-block shadow-3xs">
                              ✓ Complied
                            </span>
                          ) : (
                            <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-extrabold px-2 py-0.5 rounded inline-block animate-pulse-subtle shadow-3xs">
                              Pending Tasks
                            </span>
                          )}
                        </td>

                        {/* category breakdown mini badges block */}
                        <td className="px-3 py-3.5">
                          <div className="flex flex-wrap items-center justify-center gap-1 text-[9px] font-mono">
                            {item.categoryAudits.map((aud) => {
                              const badgeColor = item.rankClass === 'Other' 
                                ? 'bg-slate-50 text-slate-450 border border-slate-150'
                                : aud.complied 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100';
                              return (
                                <span 
                                  key={aud.catName} 
                                  className={`${badgeColor} px-1.5 py-0.5 rounded font-bold`}
                                  title={`${aud.catName}: Passed ${aud.completedCount} / Required ${aud.requiredCount}`}
                                >
                                  {aud.catName === 'Fundamentals' ? 'Fnd' : aud.catName.split('-')[1] || aud.catName.substring(0, 4)}: {aud.completedCount}{item.rankClass !== 'Other' ? `/${aud.requiredCount}` : ''}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Grand Total pass */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800 text-xs">
                          {item.totalPassedCount} Passed
                        </td>
                      </tr>

                      {/* Expandable detailed card of compliance checklist and REMAINING training activities */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr className="bg-slate-50/20 divide-x divide-slate-100">
                            <td colSpan={6} className="px-6 py-4.5 border-t border-slate-100">
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs overflow-hidden"
                              >
                                {/* Left column: Mapped compliance overview */}
                                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-3xs space-y-3">
                                  <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] pb-1.5 border-b border-slate-100">
                                    <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                                    Training Policy Compliance Checklist: {item.rankClass} status
                                  </h5>

                                  <div className="space-y-2">
                                    {item.rankClass === 'Other' ? (
                                      <div className="py-2 text-slate-400 italic text-[10px] leading-relaxed">
                                        No direct training policy profile has been configured for the rank designation "{item.rank}". Standard status counts are evaluated only.
                                      </div>
                                    ) : (
                                      item.categoryAudits.map((aud) => (
                                        <div key={aud.catName} className="flex justify-between items-center text-[11px] py-0.5">
                                          <span className="text-slate-550 font-medium">{aud.catName} Syllabus</span>
                                          <div className="flex items-center gap-2 font-mono">
                                            <span className="font-bold text-slate-800">
                                              {aud.completedCount} completed / {aud.requiredCount} required
                                            </span>
                                            {aud.complied ? (
                                              <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">
                                                Fulfilled
                                              </span>
                                            ) : (
                                              <span className="bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">
                                                -{aud.gap} remaining
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* Right column: STRICT TASK REQUIREMENT "Remaining training activities" */}
                                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-3xs flex flex-col justify-between">
                                  <div>
                                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] pb-1.5 border-b border-slate-100">
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                      Remaining Required Training Activities
                                    </h5>

                                    <div className="mt-3.5 space-y-2">
                                      {item.rankClass === 'Other' ? (
                                        <p className="text-[10px] text-slate-450 italic leading-relaxed">
                                          This employee does not belong to a policy-tracked rank. No remaining activities are required.
                                        </p>
                                      ) : !hasRemaining ? (
                                        <div className="text-emerald-700 bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-100 text-[11px] font-bold flex items-center gap-2 leading-relaxed">
                                          <span className="text-base text-emerald-600 font-black">✓</span>
                                          Congratulations! All criteria complied successfully as per policy guidelines.
                                        </div>
                                      ) : (
                                        item.remainingTexts.map((text, idx) => (
                                          <div key={idx} className="flex items-start gap-2 text-[10px] text-slate-600 font-medium leading-relaxed">
                                            <span className="text-amber-500 text-xs mt-0.5 shrink-0">●</span>
                                            <span className="font-sans">{text}</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  {hasRemaining && item.rankClass !== 'Other' && (
                                    <p className="text-[9px] text-slate-400 mt-3 border-t border-slate-100 pt-2 italic">
                                      Please assign the missing courses above to complete the compliance loop.
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </tbody>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger pagination footer */}
        {totalAuditPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/65 bg-slate-50 text-[10px] font-mono text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{(auditPage - 1) * itemsPerAuditPage + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(auditPage * itemsPerAuditPage, filteredAudits.length)}</span> of{' '}
              <span className="font-bold text-slate-800">{filteredAudits.length}</span> audited profiles
            </div>

            <div className="flex items-center gap-1 font-mono">
              <button
                disabled={auditPage === 1}
                onClick={() => setAuditPage((p) => Math.max(p - 1, 1))}
                className="p-1 px-2.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalAuditPages }, (_, idx) => idx + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setAuditPage(p)}
                  className={`w-6 h-6 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    auditPage === p 
                      ? 'bg-indigo-600 text-white font-black shadow-xs' 
                      : 'border border-slate-200 text-slate-500 bg-white hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={auditPage === totalAuditPages}
                onClick={() => setAuditPage((p) => Math.min(p + 1, totalAuditPages))}
                className="p-1 px-2.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
