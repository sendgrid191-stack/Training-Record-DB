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
  Info,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  BookMarked,
  FolderLock,
  Grid,
  List,
  RefreshCw,
  SlidersHorizontal,
  GraduationCap,
  HelpCircle,
  X,
  Gauge,
  Lightbulb,
  ArrowUpRight,
  TrendingUp,
  UserCheck
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

  // View Layout state: 'table' vs 'grid'
  const [layoutMode, setLayoutMode] = useState<'table' | 'grid'>('table');

  // Dynamic Rank Simulation State: stores mocked ranks for specific employee IDs
  const [simulatedRanks, setSimulatedRanks] = useState<Record<string, 'Assistant Manager' | 'Manager' | null>>({});

  // Unique course syllabus browse modal toggle
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('All');

  // Selected/Expanded rows
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);

  // 1. Compile Unique Course Syllabus Catalog per Category
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

      // Analyze policy rank details (check if a simulated rank is specified for this user)
      const mockRank = simulatedRanks[emp.employeeId.toUpperCase()] || null;
      const actualRank = emp.rank;
      const effectiveRank = mockRank || actualRank;

      const normRank = effectiveRank.toLowerCase();
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
      let compliedCategoriesCount = 0;
      let totalCategoriesApplicable = 5;

      const categoryAudits = ['Fundamentals', 'CAT-A', 'CAT-B', 'CAT-C', 'CAT-D'].map((cat) => {
        const completedCount = completedByCategory[cat].length;
        const requiredCount = requirements[cat as keyof typeof requirements];
        const complied = completedCount >= requiredCount;
        
        if (requiredCount > 0 && !complied) {
          isComplied = false;
        }

        if (requiredCount > 0 && complied) {
          compliedCategoriesCount++;
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
                aud.uncompletedTitles.length > 0 ? aud.uncompletedTitles.slice(0, 3).join(', ') : 'N/A'
              }${aud.uncompletedTitles.length > 3 ? '...' : ''}`
            );
          } else {
            const extra = aud.uncompletedTitles.length > 0 
              ? ` (Recommended options: ${aud.uncompletedTitles.slice(0, 2).join(', ')})`
              : '';
            remainingTexts.push(`${aud.catName}: Must complete ${aud.gap} more course(s)${extra}`);
          }
        }
      });

      // Calculate a sleek aggregate progress percent
      let overallProgressPct = 0;
      let totalNeeded = 0;
      let totalAcquiredInRules = 0;

      Object.keys(requirements).forEach((k) => {
        const reqVal = requirements[k as keyof typeof requirements];
        totalNeeded += reqVal;
        totalAcquiredInRules += Math.min(reqVal, completedByCategory[k].length);
      });

      if (totalNeeded > 0) {
        overallProgressPct = Math.round((totalAcquiredInRules / totalNeeded) * 100);
      } else {
        overallProgressPct = 100; // Staff members default compliance representation
      }

      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        actualRank,
        mockRank,
        rank: effectiveRank,
        rankClass,
        department: emp.department,
        completedByCategory,
        categoryAudits,
        isComplied: rankClass === 'Other' ? null : isComplied,
        remainingTexts,
        totalPassedCount: completedTitles.size,
        overallProgressPct,
        compliedCategoriesCount,
        totalCategoriesApplicable
      };
    });
  }, [records, categorySummary, simulatedRanks]);

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

  // Quick stats recap metrics
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

  // Filter Catalog Courses List
  const filteredCatalogCourses = useMemo(() => {
    return uniqueTrainingsList.filter((course) => {
      const matchText = course.title.toLowerCase().includes(catalogSearch.toLowerCase());
      let matchCat = true;
      if (catalogCategoryFilter !== 'All') {
        const normCat = getNormalizedCategory(course.category);
        if (normCat !== catalogCategoryFilter) {
          matchCat = false;
        }
      }
      return matchText && matchCat;
    });
  }, [uniqueTrainingsList, catalogSearch, catalogCategoryFilter]);

  const resetFilters = () => {
    setAuditSearch('');
    setAuditRankFilter('All');
    setAuditStatusFilter('All');
    setAuditPage(1);
  };

  const clearSimulation = (empId: string) => {
    setSimulatedRanks(prev => {
      const next = { ...prev };
      delete next[empId.toUpperCase()];
      return next;
    });
    setExpandedEmpId(empId);
  };

  const applySimulation = (empId: string, rank: 'Assistant Manager' | 'Manager') => {
    setSimulatedRanks(prev => ({
      ...prev,
      [empId.toUpperCase()]: rank
    }));
    setExpandedEmpId(empId);
  };

  return (
    <div className="space-y-6" id="auditor-section-container">
      
      {/* 1. Explanatory banner card detailing compliance requirements */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="w-36 h-36 rotate-12 text-indigo-400" />
        </div>
        
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-indigo-500/30 text-indigo-200 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-400/20">
              Audit Intelligence
            </span>
            <span className="bg-emerald-500/25 text-emerald-300 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase border border-emerald-500/20">
              Live Compliance Framework
            </span>
            <span className="bg-amber-500/25 text-amber-300 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase border border-amber-500/20">
              Rank Simulator Available
            </span>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
            Compliance Policy Auditor & Promotion Simulator
          </h2>
          <p className="text-slate-350 text-xs leading-relaxed max-w-2xl">
            This module evaluates personnel records against mandatory state-guided compliance matrices. Use the <strong>Rank Simulator</strong> below to test potential promotions on staff and preview missing requirements before assigning new courses.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-indigo-400/25 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="font-bold text-indigo-200">
                  Assistant Manager (AM) Rules
                </span>
              </div>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px] list-none pl-1">
                <li className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Fundamentals List:</span>
                  <span className="text-indigo-400 font-bold">100% Matches ({categorySummary.counts['Fundamentals']} course{categorySummary.counts['Fundamentals'] !== 1 ? 's' : ''})</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Category-A (CAT-A):</span>
                  <span className="text-slate-205">Min. 5 courses passed</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Category-B (CAT-B):</span>
                  <span className="text-slate-205">Min. 4 courses passed</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Category-C (CAT-C):</span>
                  <span className="text-slate-205">Min. 1 course passed</span>
                </li>
                <li className="flex justify-between">
                  <span>Category-D (CAT-D):</span>
                  <span className="text-slate-205">Min. 2 courses passed</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-amber-400/25 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-bold text-amber-200">
                  Manager (MGR) Rules
                </span>
              </div>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px] list-none pl-1">
                <li className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Fundamentals List:</span>
                  <span className="text-amber-400 font-bold">100% Matches ({categorySummary.counts['Fundamentals']} course{categorySummary.counts['Fundamentals'] !== 1 ? 's' : ''})</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Category-A (CAT-A):</span>
                  <span className="text-amber-400 font-bold">100% Matches ({categorySummary.counts['CAT-A']} course{categorySummary.counts['CAT-A'] !== 1 ? 's' : ''})</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Category-B (CAT-B):</span>
                  <span className="text-slate-205">Min. 6 courses passed</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Category-C (CAT-C):</span>
                  <span className="text-slate-205">Min. 3 courses passed</span>
                </li>
                <li className="flex justify-between">
                  <span>Category-D (CAT-D):</span>
                  <span className="text-slate-205">Min. 4 courses passed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Micro Stats recap banner (Clicking cards filters list) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" id="stats-filter-quick-cards">
        
        <div 
          onClick={() => { setAuditRankFilter('All'); setAuditStatusFilter('All'); setAuditPage(1); }}
          className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          title="Clear filters and show all officers"
        >
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tracked Policy Officers</p>
            <Users className="w-4 h-4 text-slate-350 group-hover:text-indigo-500 transition-colors" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{auditStatsRecap.totalTarget}</span>
            <span className="text-[10px] text-indigo-650 bg-indigo-50 font-bold px-1.5 py-0.5 rounded">Compliance Ranks</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">Click to show all tracked positions</p>
        </div>

        <div 
          onClick={() => { setAuditStatusFilter('Complied'); setAuditRankFilter('All'); setAuditPage(1); }}
          className={`bg-white px-5 py-4 rounded-xl border hover:shadow-xs transition-all cursor-pointer group ${
            auditStatusFilter === 'Complied' ? 'bg-emerald-50/20 border-emerald-500 shadow-3xs' : 'border-slate-200 border-l-4 border-l-emerald-500'
          }`}
          title="Click to filter by fully complied officers only"
        >
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fully Complied</p>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{auditStatsRecap.compliedTarget}</span>
            <span className="text-[10px] text-emerald-600 font-bold font-mono">({auditStatsRecap.rate}%)</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">Click to display complying team</p>
        </div>

        <div 
          onClick={() => { setAuditStatusFilter('Pending'); setAuditRankFilter('All'); setAuditPage(1); }}
          className={`bg-white px-5 py-4 rounded-xl border hover:shadow-xs transition-all cursor-pointer group ${
            auditStatusFilter === 'Pending' ? 'bg-amber-50/20 border-amber-500 shadow-3xs' : 'border-slate-200 border-l-4 border-l-amber-500'
          }`}
          title="Click to filter by pending officers only"
        >
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending Requirements</p>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-600 font-mono">{auditStatsRecap.pendingTarget}</span>
            <span className="text-[10px] text-slate-400">Needs Training</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">Click to display in-progress team</p>
        </div>

        <div 
          onClick={() => setShowCatalogModal(true)}
          className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to open the Syllabus Catalog Search Modal"
        >
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Syllabus Course Pool</p>
            <BookMarked className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-indigo-600 font-mono">{uniqueTrainingsList.length}</span>
            <span className="text-[9px] text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.5 rounded">Browse Syllabus</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2 text-indigo-650 font-medium">Click to explore course categories</p>
        </div>

      </div>

      {/* 3. The main interactive Ledger Block container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Dynamic header / filter toolbar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-505" />
                Ledger Directory & Compliance Watch
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Audit personnel status, review completion lists, or mock promote employees to preview their custom training roadmap gaps.
              </p>
            </div>

            {/* Controls panel: switcher + filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* layout switcher buttons */}
              <div className="bg-slate-100 rounded-lg p-0.5 flex border border-slate-150 shrink-0">
                <button
                  type="button"
                  onClick={() => setLayoutMode('table')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    layoutMode === 'table' ? 'bg-white text-indigo-650 shadow-xs ring-1 ring-slate-100' : 'text-slate-450 hover:text-slate-800'
                  }`}
                  title="List Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    layoutMode === 'grid' ? 'bg-white text-indigo-650 shadow-xs ring-1 ring-slate-100' : 'text-slate-450 hover:text-slate-800'
                  }`}
                  title="Grid Cards view"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Text Search filter */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID, Name, or Unit..."
                  value={auditSearch}
                  onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-44 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Filter Rank Policy */}
              <select
                value={auditRankFilter}
                onChange={(e) => { setAuditRankFilter(e.target.value); setAuditPage(1); }}
                className="bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs font-sans text-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="All">All Ranks ({employeeComplianceList.length})</option>
                <option value="Assistant Manager">Assistant Manager Only</option>
                <option value="Manager">Manager Only</option>
                <option value="Other">Other Ranks / No Policy</option>
              </select>

              {/* Filter Compliance Status */}
              <select
                value={auditStatusFilter}
                onChange={(e) => { setAuditStatusFilter(e.target.value); setAuditPage(1); }}
                className="bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs font-sans text-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="All">All Compliance ({filteredAudits.length})</option>
                <option value="Complied">Complied</option>
                <option value="Pending">Pending</option>
                <option value="NA font-serif">N/A (Other Ranks)</option>
              </select>

              {(auditSearch || auditRankFilter !== 'All' || auditStatusFilter !== 'All') && (
                <button 
                  onClick={resetFilters}
                  className="bg-slate-150 hover:bg-slate-200 text-slate-705 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* -------------------- LAYOUT A: Ledger Table List View -------------------- */}
        {layoutMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-100/70 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                <tr className="divide-x divide-slate-100">
                  <th className="px-4 py-3 w-12 text-center">Status</th>
                  <th className="px-3 py-3 font-semibold text-slate-650">Employee Details</th>
                  <th className="px-3 py-3 w-40 text-left">Applied Rules Rank</th>
                  <th className="px-3 py-3 w-32 text-center">Policy Metric Met</th>
                  <th className="px-3 py-3 text-center w-56">Category Syllabus Ratios</th>
                  <th className="px-4 py-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedAudits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-1 p-4">
                        <ShieldAlert className="w-8 h-8 text-slate-300 mb-1" />
                        <p className="font-bold text-slate-600 text-xs">No personnel records found matching filters</p>
                        <button 
                          onClick={resetFilters}
                          className="text-indigo-600 text-[10px] font-bold mt-2 hover:underline cursor-pointer"
                        >
                          Reset active filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAudits.map((item) => {
                    const isExpanded = expandedEmpId === item.employeeId;
                    const hasRemaining = item.remainingTexts.length > 0;
                    const isMocked = !!item.mockRank;

                    return (
                      <tbody key={item.employeeId} className={`divide-y divide-slate-105 ${isExpanded ? 'bg-indigo-50/10' : ''}`}>
                        
                        {/* Main row */}
                        <tr 
                          className={`hover:bg-slate-50/70 transition-all cursor-pointer divide-x divide-slate-100/50 ${isExpanded ? 'bg-indigo-50/20' : ''}`}
                          onClick={() => setExpandedEmpId(isExpanded ? null : item.employeeId)}
                        >
                          
                          {/* 1. Expand trigger icon & status dot */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                                item.isComplied === null 
                                  ? 'bg-slate-300' 
                                  : item.isComplied 
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                                    : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              }`} />
                              <button 
                                className="p-0.5 text-slate-400 hover:text-slate-800 transition-transform cursor-pointer"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* 2. Employee Identity details */}
                          <td className="px-3 py-3">
                            <div>
                              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                {item.employeeName}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center font-mono gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-600 bg-slate-100 border border-slate-205 rounded px-1 text-[9px]">{item.employeeId}</span>
                                <span className="text-slate-300">•</span>
                                Unit: <span className="font-semibold text-slate-650">{item.department}</span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Rank indicator (with mock badge if simulated) */}
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <span className={`font-semibold px-2 py-0.5 rounded text-[10px] inline-block ${
                                isMocked 
                                  ? 'bg-cyan-50 text-cyan-705 border border-cyan-155 shadow-3xs' 
                                  : 'bg-slate-100 text-slate-650 border border-slate-200'
                              }`}>
                                {item.rank}
                              </span>
                              {isMocked && (
                                <p className="text-[8px] text-cyan-600 font-extrabold tracking-wider uppercase">
                                  SIMULATED PROFILE
                                </p>
                              )}
                              {!isMocked && item.rankClass !== 'Other' && (
                                <p className="text-[8px] text-indigo-550 font-bold uppercase tracking-wider">
                                  Standard Rule Audit
                                </p>
                              )}
                              {item.rankClass === 'Other' && (
                                <p className="text-[8px] text-slate-400 italic">
                                  No Policy Rule Map
                                </p>
                              )}
                            </div>
                          </td>

                          {/* 4. Policy progress percent */}
                          <td className="px-3 py-3 text-center">
                            {item.rankClass === 'Other' ? (
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-slate-400 text-[10px] font-bold font-mono">N/A</span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    applySimulation(item.employeeId, 'Assistant Manager');
                                  }}
                                  className="text-[9px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold mt-1"
                                >
                                  Run Mock Audit
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1.5 max-w-[80px] mx-auto">
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      item.isComplied ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${item.overallProgressPct}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-black font-mono ${
                                  item.isComplied ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                  {item.overallProgressPct}% Met
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 5. Course ratios summary badge list */}
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center justify-center gap-1 text-[9px] font-mono">
                              {item.categoryAudits.map((aud) => {
                                const badgeColor = item.rankClass === 'Other' 
                                  ? 'bg-slate-50 text-slate-450 border border-slate-200'
                                  : aud.complied 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-100';
                                return (
                                  <span 
                                    key={aud.catName} 
                                    className={`${badgeColor} px-1.5 py-0.5 rounded font-bold`}
                                    title={`${aud.catName}: Completed ${aud.completedCount} / Target: ${aud.requiredCount}`}
                                  >
                                    {aud.catName === 'Fundamentals' ? 'Fnd' : aud.catName.split('-')[1] || aud.catName.substring(0, 4)}: {aud.completedCount}{item.rankClass !== 'Other' ? `/${aud.requiredCount}` : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* 6. Action button list passed */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-mono font-bold text-slate-805 text-[11px]">
                                {item.totalPassedCount} Passed
                              </span>
                              <span className="text-[9px] text-indigo-500 hover:text-indigo-850 font-bold underline">
                                {isExpanded ? 'Collapse ▲' : 'Inspect ▼'}
                              </span>
                            </div>
                          </td>

                        </tr>

                        {/* Expand drawer card section with custom simulator panel options */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr className="bg-slate-50/15 divide-x divide-slate-100">
                              <td colSpan={6} className="px-6 py-5 border-t border-slate-100">
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="space-y-4 overflow-hidden"
                                >
                                  
                                  {/* Dynamic promotion simulator control drawer inside personnel data details */}
                                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                      <RefreshCw className={`w-4 h-4 text-cyan-600 ${isMocked ? 'animate-spin-slow' : ''}`} />
                                      <div>
                                        <p className="font-bold text-slate-800">Rank Compliance Promotion Simulator</p>
                                        <p className="text-[10px] text-slate-450 mt-0.5">
                                          {item.rankClass === 'Other' 
                                            ? "This employee is not bound by manager-rank legal compliance. Simulate a promotion below to test requirement gaps."
                                            : `Currently evaluated under ${item.rank} guidelines. You can mock audit another rank standard.`
                                          }
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 font-sans">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); applySimulation(item.employeeId, 'Assistant Manager'); }}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                          item.mockRank === 'Assistant Manager' || (item.mockRank === null && item.rankClass === 'Assistant Manager')
                                            ? 'bg-indigo-600 text-white border-indigo-650'
                                            : 'bg-white text-slate-650 border-slate-205 hover:bg-slate-100'
                                        }`}
                                      >
                                        Simulate AM rules
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); applySimulation(item.employeeId, 'Manager'); }}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                          item.mockRank === 'Manager' || (item.mockRank === null && item.rankClass === 'Manager')
                                            ? 'bg-indigo-600 text-white border-indigo-650'
                                            : 'bg-white text-slate-650 border-slate-205 hover:bg-slate-100'
                                        }`}
                                      >
                                        Simulate Manager rules
                                      </button>
                                      {isMocked && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); clearSimulation(item.employeeId); }}
                                          className="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-200 border border-slate-300 text-slate-700 hover:bg-slate-250 cursor-pointer transition-all"
                                          title="Restore standard employee records rank status"
                                        >
                                          Reset to Actual ({item.actualRank})
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                                    
                                    {/* Detailed compliant checklist */}
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-3xs space-y-4">
                                      <h5 className="font-bold text-slate-805 flex items-center gap-1.5 pb-2 border-b border-slate-100 text-[11px]">
                                        <CheckCircle className="w-4 h-4 text-indigo-500" />
                                        Compliance Matrix Syllabus Details
                                      </h5>

                                      <div className="space-y-3">
                                        {item.rankClass === 'Other' ? (
                                          <div className="py-2 text-slate-450 italic text-[11px] leading-relaxed flex items-start gap-2">
                                            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                            No policies configured for the rank "{item.actualRank}". Select a simulation option above to check mock criteria dynamically.
                                          </div>
                                        ) : (
                                          item.categoryAudits.map((aud) => {
                                            const pct = aud.requiredCount > 0 ? Math.round((aud.completedCount / aud.requiredCount) * 100) : 100;
                                            const barColor = aud.complied ? 'bg-emerald-500' : 'bg-amber-400';
                                            return (
                                              <div key={aud.catName} className="space-y-1">
                                                <div className="flex justify-between items-center text-[11px]">
                                                  <span className="font-bold text-slate-700 font-sans">{aud.catName}</span>
                                                  <span className="font-mono text-slate-500 font-semibold">
                                                    {aud.completedCount} / {aud.requiredCount} met ({pct}%)
                                                  </span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                                                  <div 
                                                    className={`h-full ${barColor} rounded-full`}
                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                  />
                                                </div>
                                                {/* Mini badge list details under category complete list */}
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                  {item.completedByCategory[aud.catName].length === 0 ? (
                                                    <span className="text-[9px] text-slate-400 italic">None completed yet</span>
                                                  ) : (
                                                    item.completedByCategory[aud.catName].map((t, tIdx) => (
                                                      <span key={tIdx} className="bg-slate-50 text-[9px] font-medium text-slate-600 px-1.5 py-0.5 rounded border border-slate-150 truncate max-w-[150px]" title={t}>
                                                        ✓ {t}
                                                      </span>
                                                    ))
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>

                                    {/* Action Guidance & missing directory files */}
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                                      <div>
                                        <h5 className="font-bold text-slate-805 flex items-center gap-1.5 pb-2 border-b border-slate-100 text-[11px]">
                                          <AlertCircle className="w-4 h-4 text-amber-500" />
                                          Uncompleted Required Training Log Checklist
                                        </h5>

                                        <div className="mt-3 space-y-2 mt-2">
                                          {item.rankClass === 'Other' ? (
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-slate-450 italic leading-relaxed text-[11px]">
                                              Standard personnel with rank "{item.actualRank}" are fully certified on their operational roster. Run Mock simulation to audit promotion paths.
                                            </div>
                                          ) : !hasRemaining ? (
                                            <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] font-bold flex items-start gap-2.5 leading-relaxed">
                                              <span className="text-base text-emerald-600 font-extrabold mt-0.5">✓</span>
                                              <div>
                                                <p className="font-black text-emerald-850">Criteria Cleared Successfully</p>
                                                <p className="text-[10px] text-emerald-600 font-normal font-sans mt-0.5">All mandatory and class category courses verified as Passed. This officer is compliant with rank procedures.</p>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                              <span className="text-[10px] font-bold text-slate-400 block pb-1">PENDING SYLLABUS DIRECTIVES:</span>
                                              {item.remainingTexts.map((text, idx) => (
                                                <div key={idx} className="bg-amber-50/45 border border-amber-100 rounded-lg p-2.5 flex items-start gap-2.5 text-[10px] text-slate-700 leading-relaxed font-sans">
                                                  <span className="text-amber-500 font-black text-xs leading-none shrink-0 mt-0.5">!</span>
                                                  <div>
                                                    <span className="font-semibold block text-slate-800">{text.split(': ')[0]}:</span>
                                                    <span className="text-slate-650">{text.split(': ')[1] || 'Syllabus courses required.'}</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {hasRemaining && item.rankClass !== 'Other' && (
                                        <div className="mt-4 border-t border-slate-100 pt-2.5 flex items-center gap-1.5 text-[10px] text-indigo-700 bg-indigo-50/50 p-2 rounded-lg">
                                          <Lightbulb className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                                          <p className="leading-relaxed">
                                            <strong>Advisory Guard:</strong> Ensure candidate enrolls in the listed missing syllabus activities before promoting on the training log master sheet.
                                          </p>
                                        </div>
                                      )}
                                    </div>

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
        )}

        {/* -------------------- LAYOUT B: Executive Cards Grid View -------------------- */}
        {layoutMode === 'grid' && (
          <div className="p-6 bg-slate-50/20" id="executive-grid-cards">
            {filteredAudits.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
                <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-600 text-sm">No personnel matched this grid filter query</p>
                <button 
                  onClick={resetFilters}
                  className="text-indigo-600 text-xs font-semibold mt-2 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
                {paginatedAudits.map((item) => {
                  const isExpanded = expandedEmpId === item.employeeId;
                  const hasRemaining = item.remainingTexts.length > 0;
                  const isMocked = !!item.mockRank;
                  const firstLetters = item.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2);

                  return (
                    <motion.div
                      layout
                      key={item.employeeId}
                      className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                        isExpanded ? 'border-indigo-500 ring-1 ring-indigo-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                      onClick={() => setExpandedEmpId(isExpanded ? null : item.employeeId)}
                    >
                      {/* Top identity banner */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Rank badge top row */}
                          <div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100">
                            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.isComplied === null 
                                ? 'bg-slate-100 text-slate-500' 
                                : item.isComplied 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100 hover:scale-105 transition-transform'
                            }`}>
                              {item.isComplied === null ? 'N/A Rank' : item.isComplied ? '✓ Complied' : '! Pending'}
                            </span>

                            <span className={`text-[9px] font-semibold px-2 py-0.2 rounded border ${
                              isMocked ? 'bg-cyan-50/80 text-cyan-700 border-cyan-155' : 'bg-slate-50 text-slate-650'
                            }`}>
                              {item.rank}
                            </span>
                          </div>

                          {/* Identity cards list */}
                          <div className="flex items-start gap-3 mt-3.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0 font-mono">
                              {firstLetters}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-905 text-xs truncate leading-snug">{item.employeeName}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {item.employeeId}</p>
                              <p className="text-[10px] font-bold text-indigo-650/80 mt-1">{item.department} division</p>
                            </div>
                          </div>
                        </div>

                        {/* Middle: progress indicator percent slider */}
                        <div className="pt-4 space-y-1.5">
                          {item.rankClass === 'Other' ? (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 text-[10px] text-slate-450 italic flex items-center justify-between">
                              <span>Promotion ready?</span>
                              <span className="text-indigo-600 font-bold hover:underline">Mock Audit →</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-sans font-bold">
                                <span className="text-slate-455">Compliance Meter:</span>
                                <span className={`font-mono ${item.isComplied ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {item.overallProgressPct}% met
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${item.isComplied ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                  style={{ width: `${item.overallProgressPct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom view details action block */}
                      <div className="bg-slate-50/60 p-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500 shrink-0">
                        <span className="font-bold text-slate-700">{item.totalPassedCount} passed records</span>
                        <div className="flex items-center gap-1 font-bold text-indigo-650">
                          <span>{isExpanded ? 'Hide Specs' : 'Show Specs'}</span>
                          <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </div>
                      </div>

                      {/* Render absolute expanded information block inline with height inside card */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-indigo-50/5 border-t border-slate-100 p-4 shrink-0 text-[11px]"
                            onClick={(e) => e.stopPropagation()} /* Prevent self container collapse */
                          >
                            {/* Syllabus Categories overview details */}
                            <div className="space-y-2 border-b border-slate-100 pb-3 mb-3 text-[10px]">
                              <p className="font-bold text-slate-700 block pb-1 uppercase tracking-[0.05em]">Syllabus Fulfilled:</p>
                              {item.rankClass === 'Other' ? (
                                <div className="space-y-2">
                                  <span className="text-[10px] text-slate-450 italic leading-snug">This card has no operational policy. Run Mock simulations:</span>
                                  <div className="grid grid-cols-2 gap-1.5 mt-1 text-center">
                                    <button 
                                      onClick={() => applySimulation(item.employeeId, 'Assistant Manager')}
                                      className="bg-white hover:bg-slate-150 py-1 rounded border border-slate-200 text-slate-705 text-[9px] font-bold"
                                    >
                                      Test AM
                                    </button>
                                    <button 
                                      onClick={() => applySimulation(item.employeeId, 'Manager')}
                                      className="bg-white hover:bg-slate-150 py-1 rounded border border-slate-200 text-slate-705 text-[9px] font-bold"
                                    >
                                      Test Manager
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                item.categoryAudits.map((aud) => (
                                  <div key={aud.catName} className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-500">{aud.catName}:</span>
                                    <span className={`font-mono font-bold ${aud.complied ? 'text-emerald-700' : 'text-slate-700'}`}>
                                      {aud.completedCount} / {aud.requiredCount} passed {aud.complied ? '✓' : ''}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Syllabus requirements gaps list */}
                            {item.rankClass !== 'Other' && (
                              <div className="space-y-1.5">
                                <span className="font-bold text-slate-750 uppercase tracking-[0.05em] block text-[10px]">Missing Action Instructions:</span>
                                {hasRemaining ? (
                                  <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                                    {item.remainingTexts.map((text, textIdx) => (
                                      <p key={textIdx} className="text-[9px] text-amber-750 bg-amber-50/50 p-1.5 rounded border border-amber-100/50 leading-relaxed font-sans font-medium">
                                        ● {text.split(': ')[0]}: {text.split(': ')[1] || 'Pending matches.'}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-emerald-700 font-bold block bg-emerald-50/50 border border-emerald-110 p-2 rounded-lg text-center text-[10px]">
                                    ✓ Complied! Candidate promoted.
                                  </span>
                                )}
                              </div>
                            )}

                            {isMocked && (
                              <button
                                onClick={() => clearSimulation(item.employeeId)}
                                className="w-full mt-3.5 py-1.5 text-center bg-slate-200 hover:bg-slate-250 border border-slate-300 rounded-lg text-[9px] font-bold text-slate-700 cursor-pointer"
                              >
                                Remove Simulation Roster
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Ledger pagination footer */}
        {totalAuditPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-205 bg-slate-50 text-[10px] font-mono text-slate-500 shrink-0">
            <div>
              Showing <span className="font-bold text-slate-800">{(auditPage - 1) * itemsPerAuditPage + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(auditPage * itemsPerAuditPage, filteredAudits.length)}</span> of{' '}
              <span className="font-bold text-slate-800">{filteredAudits.length}</span> audited profiles
            </div>

            <div className="flex items-center gap-1 font-mono">
              <button
                disabled={auditPage === 1}
                onClick={() => setAuditPage((p) => Math.max(p - 1, 1))}
                className="p-1 px-2.5 rounded bg-white border border-slate-220 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
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
                      : 'border border-slate-210 text-slate-500 bg-white hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={auditPage === totalAuditPages}
                onClick={() => setAuditPage((p) => Math.min(p + 1, totalAuditPages))}
                className="p-1 px-2.5 rounded bg-white border border-slate-210 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unique Course Catalog Dialog Modal View */}
      <AnimatePresence>
        {showCatalogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs" id="auditor-catalog-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
            >
              
              {/* Header */}
              <div className="bg-slate-950 px-6 py-4.5 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h4 className="font-bold text-sm tracking-tight text-white">Interactive Syllabus Directory Catalog</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Explore active course syllabi mapped into statutory categories</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCatalogModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search courses by keyword..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-full focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <select
                  value={catalogCategoryFilter}
                  onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-sans text-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="All">All Class categories</option>
                  <option value="Fundamentals">Fundamentals ({categorySummary.counts['Fundamentals']})</option>
                  <option value="CAT-A">Category A (CAT-A) ({categorySummary.counts['CAT-A']})</option>
                  <option value="CAT-B">Category B (CAT-B) ({categorySummary.counts['CAT-B']})</option>
                  <option value="CAT-C">Category C (CAT-C) ({categorySummary.counts['CAT-C']})</option>
                  <option value="CAT-D">Category D (CAT-D) ({categorySummary.counts['CAT-D']})</option>
                  <option value="Other">Uncategorized ({categorySummary.counts['Other']})</option>
                </select>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">S.No</th>
                      <th className="px-3 py-2">Mandatory Syllabus / Course Title</th>
                      <th className="px-3 py-2 w-32 text-center">Mapped Category</th>
                      <th className="px-3 py-2 w-24 text-right">Completions Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCatalogCourses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-450">
                          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                          No syllabus courses match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCatalogCourses.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 leading-loose divide-x divide-slate-100/40">
                          <td className="px-3 py-2 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="px-3 py-2 text-slate-900 font-semibold">{item.title}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="bg-slate-50 text-slate-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-slate-150 font-mono uppercase">
                              {getNormalizedCategory(item.category)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-620">{item.passedCount} passes</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 shrink-0 font-mono">
                <span>Showing {filteredCatalogCourses.length} of {uniqueTrainingsList.length} total mapped courses</span>
                <button 
                  onClick={() => setShowCatalogModal(false)}
                  className="bg-slate-900 hover:bg-slate-950 text-white font-bold px-4 py-1.5 rounded-lg cursor-pointer transition-colors text-xs"
                >
                  Close Catalog Directory
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
