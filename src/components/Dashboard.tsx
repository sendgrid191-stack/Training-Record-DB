/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  Award,
  BookOpen,
  RotateCw,
  Search,
  CheckCircle,
  X,
  TrendingUp,
  FileCheck2,
  FolderCheck,
  BookMarked,
  Sparkles,
} from 'lucide-react';
import { TrainingRecord, UploadBatch } from '../types';
import { getNormalizedCategory } from '../utils/compliance';

interface DashboardProps {
  records: TrainingRecord[];
  batches: UploadBatch[];
}

export default function Dashboard({ records, batches }: DashboardProps) {
  // Modal toggle for unique training activities directory
  const [showUniqueTrainingsModal, setShowUniqueTrainingsModal] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('All');

  // 1. Core unique training course syllabus lookup
  const uniqueTrainingsList = useMemo(() => {
    const titlesMap = new Map<string, { category: string; count: number; passedCount: number }>();
    
    records.forEach((r) => {
      const title = (r.trainingTitle || '').trim();
      if (!title) return;
      const cat = (r.category || '').trim();
      const isPassed = r.status?.trim().toLowerCase() === 'pass' || r.status?.trim().toLowerCase() === 'completed';

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

  // 2. Count unique training activities per core compliance categories accurately
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

  // 3. Totals and Rotations calculations
  const rotationStats = useMemo(() => {
    const uniqueEmployees = new Set(records.map((r) => r.employeeId).filter(Boolean)).size;
    const passedRecords = records.filter(
      (r) =>
        r.status?.trim().toLowerCase() === 'pass' ||
        r.status?.trim().toLowerCase() === 'completed'
    );
    const totalPassedRotations = passedRecords.length;
    const avgPassedPerEmployee = uniqueEmployees > 0 
      ? (totalPassedRotations / uniqueEmployees).toFixed(1) 
      : '0.0';

    return {
      totalPassedRotations,
      avgPassedPerEmployee,
      uniqueEmployees,
    };
  }, [records]);

  // 4. Employee dynamic compliance summaries for pie visualization
  const employeeComplianceList = useMemo(() => {
    const empGroups: Record<string, {
      employeeId: string;
      rank: string;
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
          rank: r.rank || 'Staff',
          passedRecords: [],
        };
      }
      if (isPassed) {
        empGroups[key].passedRecords.push(r);
      }
    });

    return Object.values(empGroups).map((emp) => {
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
      for (const cat of ['Fundamentals', 'CAT-A', 'CAT-B', 'CAT-C', 'CAT-D']) {
        const completedCount = completedByCategory[cat].length;
        const requiredCount = requirements[cat as keyof typeof requirements];
        if (completedCount < requiredCount) {
          isComplied = false;
          break;
        }
      }

      return {
        isComplied: rankClass === 'Other' ? null : isComplied,
        rankClass,
      };
    });
  }, [records, categorySummary]);

  // High-level metadata rates
  const complianceStats = useMemo(() => {
    const policyRankEmployees = employeeComplianceList.filter(e => e.rankClass !== 'Other');
    const totalWithPolicy = policyRankEmployees.length;
    const compliedCount = policyRankEmployees.filter(e => e.isComplied === true).length;
    const rate = totalWithPolicy > 0 ? Math.round((compliedCount / totalWithPolicy) * 100) : 100;

    const departmentSummaryCount = new Set(records.map((r) => r.department).filter(Boolean)).size;

    return {
      rate,
      compliedCount,
      totalWithPolicy,
      departmentSummaryCount,
    };
  }, [employeeComplianceList, records]);

  // Course filter list inside catalog
  const filteredUniqueCourses = useMemo(() => {
    return uniqueTrainingsList.filter((course) => {
      const matchText = course.title.toLowerCase().includes(courseSearch.toLowerCase());
      
      let matchCat = true;
      if (courseCategoryFilter !== 'All') {
        const normCat = getNormalizedCategory(course.category);
        if (normCat !== courseCategoryFilter) {
          matchCat = false;
        }
      }

      return matchText && matchCat;
    });
  }, [uniqueTrainingsList, courseSearch, courseCategoryFilter]);

  // Dept bar chart counts
  const deptData = useMemo(() => {
    const map: Record<string, { department: string; Pass: number; Others: number }> = {};
    records.forEach((r) => {
      const dept = r.department || 'General';
      if (!map[dept]) {
        map[dept] = { department: dept, Pass: 0, Others: 0 };
      }
      const st = r.status?.trim().toLowerCase();
      if (st === 'pass' || st === 'completed') {
        map[dept].Pass++;
      } else {
        map[dept].Others++;
      }
    });
    return Object.values(map);
  }, [records]);

  // Pie chart counts
  const statusPieData = useMemo(() => {
    const policyRankEmployees = employeeComplianceList.filter(e => e.rankClass !== 'Other');
    const compliedCount = policyRankEmployees.filter(e => e.isComplied === true).length;
    const pendingCount = policyRankEmployees.filter(e => e.isComplied === false).length;
    return [
      { name: 'Complied Officers', value: compliedCount, color: '#10B981' },
      { name: 'Pending Compliance', value: pendingCount, color: '#F59E0B' },
    ].filter(v => v.value > 0);
  }, [employeeComplianceList]);

  return (
    <div className="space-y-6" id="dashboard-container">
      
      {/* 4 Premium Metric Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Employees Profile Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">Trained Personnel</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-950 mt-0.5">{rotationStats.uniqueEmployees}</h3>
            <p className="text-[10px] text-slate-505 mt-1 truncate">
              Across <span className="font-semibold text-indigo-600">{complianceStats.departmentSummaryCount}</span> active units
            </p>
          </div>
        </div>

        {/* Card 2: Interactive Total Training Activities (Unique Entries) - Clickable */}
        <div 
          onClick={() => setShowUniqueTrainingsModal(true)}
          className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer flex items-center space-x-4 group"
          title="Click to view full course catalog directory"
          id="metric-course-inventories"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 rounded-lg shrink-0 transition-colors">
            <BookMarked className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              Unique Course Syllabus
              <span className="bg-indigo-105 text-indigo-700 text-[8px] font-bold px-1.5 py-0.5 rounded animate-pulse">VIEW ALL</span>
            </p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-955 mt-0.5 group-hover:text-indigo-650 transition-colors flex items-center gap-1">
              {uniqueTrainingsList.length}
              <span className="text-slate-400 text-xs font-normal font-mono group-hover:translate-x-1 duration-150 inline-block">→</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              Unique syllabus courses in dataset (Click)
            </p>
          </div>
        </div>

        {/* Card 3: Total number of training rotations passed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <RotateCw className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">Workforce Rotations Passed</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-950 mt-0.5">{rotationStats.totalPassedRotations}</h3>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              Avg of <span className="font-bold text-slate-800">{rotationStats.avgPassedPerEmployee}</span> rotations per worker
            </p>
          </div>
        </div>

        {/* Card 4: Executive Policy Compliance Rate (%) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Compliance Rate</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-955 mt-0.5">{complianceStats.rate}%</h3>
            <p className="text-[10px] text-slate-501 mt-1 truncate">
              <span className="font-medium text-emerald-600">{complianceStats.compliedCount}</span> of {complianceStats.totalWithPolicy} core rank officers complied
            </p>
          </div>
        </div>

      </div>

      {/* Category wise unique training activities display grid */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs" id="category-distribution-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderCheck className="w-4.5 h-4.5 text-indigo-500" />
              Category-Wise Course Inventory Distribution
            </h3>
            <p className="text-[11px] text-slate-450">
              Total compilation of unique individual training course syllabi categorized for compliance audit (Total: {uniqueTrainingsList.length})
            </p>
          </div>
          <span className="bg-indigo-50 text-indigo-705 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase self-start sm:self-auto border border-indigo-100">
            Auditable Database
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[
            { key: 'Fundamentals', displayName: 'Fundamentals', bg: 'bg-emerald-50/55', text: 'text-emerald-700', border: 'border-emerald-100', bar: 'bg-emerald-500' },
            { key: 'CAT-A', displayName: 'Category A (CAT-A)', bg: 'bg-indigo-50/55', text: 'text-indigo-700', border: 'border-indigo-100', bar: 'bg-indigo-500' },
            { key: 'CAT-B', displayName: 'Category B (CAT-B)', bg: 'bg-teal-50/55', text: 'text-teal-700', border: 'border-teal-100', bar: 'bg-teal-500' },
            { key: 'CAT-C', displayName: 'Category C (CAT-C)', bg: 'bg-amber-50/55', text: 'text-amber-750', border: 'border-amber-100', bar: 'bg-amber-500' },
            { key: 'CAT-D', displayName: 'Category D (CAT-D)', bg: 'bg-rose-50/55', text: 'text-rose-700', border: 'border-rose-100', bar: 'bg-rose-500' },
          ].map((cat) => {
            const count = categorySummary.counts[cat.key as keyof typeof categorySummary.counts] || 0;
            const percentage = uniqueTrainingsList.length > 0 ? (count / uniqueTrainingsList.length) * 100 : 0;
            return (
              <div 
                key={cat.key}
                className={`${cat.bg} p-4 rounded-xl border ${cat.border} flex flex-col justify-between hover:shadow-xs duration-150 transition-all`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{cat.displayName}</span>
                  <div className={`text-2xl font-black mt-1 font-mono ${cat.text}`}>
                    {count.toString().padStart(2, '0')}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5 italic">Unique Course activities</p>
                </div>
                
                {/* Micro Progress Indicator bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center text-[9px] text-slate-450 font-bold font-mono mb-1">
                    <span>Syllabus share</span>
                    <span>{Math.round(percentage)}%</span>
                  </div>
                  <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${cat.bar} rounded-full transition-all duration-500`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graphical Chart Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Department Success Distribution chart block */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs lg:col-span-2">
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-3.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Active Department Passing Rates vs Other actions
          </h4>
          <div className="h-64">
            {deptData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">
                No departmental action recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="department" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                  <Bar dataKey="Pass" name="Completed / Passed" fill="#10B981" radius={[3, 3, 0, 0]} barSize={28} />
                  <Bar dataKey="Others" name="Other Records (Fail/Withdrawn/Pending)" fill="#94A3B8" radius={[3, 3, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Manager/AM Policy compliance pie visualization widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
              Compliance Ledger Proportion
            </h4>
            <p className="text-[10px] text-slate-405">Ranks: Assistant Manager & Manager</p>
          </div>

          <div className="h-44 relative my-2">
            {statusPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No policy rank employee data found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-900">{complianceStats.rate}%</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Achieved</span>
            </div>
          </div>

          {/* Key label maps */}
          <div className="space-y-1.5 shrink-0 text-[11px] font-sans">
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
              <span className="text-slate-550 font-medium flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Complied Officers
              </span>
              <span className="font-bold text-slate-800">{complianceStats.compliedCount} office{complianceStats.compliedCount !== 1 ? 'rs' : ''}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
              <span className="text-slate-550 font-medium flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending Criteria
              </span>
              <span className="font-bold text-slate-800">{complianceStats.totalWithPolicy - complianceStats.compliedCount} office{complianceStats.totalWithPolicy - complianceStats.compliedCount !== 1 ? 'rs' : ''}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Unique Course Directory Catalog Dialog Modal */}
      <AnimatePresence>
        {showUniqueTrainingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs" id="course-directory-directory-modal">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in duration-200 flex flex-col max-h-[85vh]">
              
              {/* Header */}
              <div className="bg-slate-950 px-6 py-5 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-indigo-450" />
                  <div>
                    <h4 className="font-bold text-sm tracking-tight text-white">Unique Course Directory Catalog</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">List of unique courses parsed from test data uploaded</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowUniqueTrainingsModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick search & category filter toolbar inside catalog */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search course activities by title..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-full focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden font-sans"
                  />
                </div>

                <select
                  value={courseCategoryFilter}
                  onChange={(e) => setCourseCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-sans text-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="All">All Categories</option>
                  <option value="Fundamentals">Fundamentals</option>
                  <option value="CAT-A">Category A (CAT-A)</option>
                  <option value="CAT-B">Category B (CAT-B)</option>
                  <option value="CAT-C">Category C (CAT-C)</option>
                  <option value="CAT-D">Category D (CAT-D)</option>
                  <option value="Other">Uncategorized / Other</option>
                </select>
              </div>

              {/* List Table viewport */}
              <div className="flex-1 overflow-y-auto p-4 animate-in slide-in-from-bottom-2 duration-200">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">S.No</th>
                      <th className="px-3 py-2">Training Activity / Title</th>
                      <th className="px-3 py-2 w-32 text-center">Mapped Category</th>
                      <th className="px-3 py-2 w-24 text-right">Completions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-701">
                    {filteredUniqueCourses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-450">
                          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No training courses match this search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUniqueCourses.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 duration-100 divide-x divide-slate-100/40">
                          <td className="px-3 py-2.5 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="px-3 py-2.5 text-slate-900 font-semibold">{item.title}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="bg-slate-50 text-slate-650 text-[9px] font-extrabold px-2 py-0.5 rounded border border-slate-150 font-mono uppercase tracking-wider">
                              {getNormalizedCategory(item.category)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-600">{item.passedCount} pass{item.passedCount !== 1 ? 'es' : ''}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer view */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 shrink-0 font-mono">
                <span>Showing {filteredUniqueCourses.length} of {uniqueTrainingsList.length} unique syllabus activities</span>
                <button 
                  onClick={() => setShowUniqueTrainingsModal(false)}
                  className="bg-slate-900 hover:bg-slate-950 text-white font-bold px-4 py-1.5 rounded-lg cursor-pointer transition-colors text-xs"
                >
                  Close Directory
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
