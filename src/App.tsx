/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  LayoutDashboard,
  Database,
  Lock,
  LogOut,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

import { TrainingRecord, UploadBatch, CustomHeader } from './types';
import {
  mergeUploadedRecords,
  addRecordManually,
  updateRecordManually,
  deleteRecord,
  deleteRecords,
  addCustomHeader,
  deleteCustomHeader,
} from './db/storage';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';

// Import Components
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import TrainingTable from './components/TrainingTable';
import UploadModal from './components/UploadModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records'>('dashboard');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Success / Warning notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // Setup real-time authentication listener (fallback/optional compatibility)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem('isLoggedIn', 'true');
        setIsAuthenticated(true);
      } else {
        // Do not force logout on unauthenticated Firebase user if local session is valid
        if (localStorage.getItem('isLoggedIn') !== 'true') {
          setIsAuthenticated(false);
          setRecords([]);
          setBatches([]);
        }
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Setup real-time data listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeRecords = onSnapshot(
      collection(db, 'records'),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => doc.data() as TrainingRecord);
        // Sort descending by uploadedAt timestamp
        list.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
        setRecords(list);
      },
      (error) => {
        console.error('[Firestore records subscription Error]:', error);
        triggerNotification('Permissions warning: access restricted or user unauthorized.', 'warning');
      }
    );

    const unsubscribeBatches = onSnapshot(
      collection(db, 'batches'),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => doc.data() as UploadBatch);
        // Sort descending by uploadedAt timestamp
        list.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
        setBatches(list);
      },
      (error) => {
        console.error('[Firestore batches subscription Error]:', error);
      }
    );

    const unsubscribeHeaders = onSnapshot(
      collection(db, 'custom_headers'),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => doc.data() as CustomHeader);
        // Sort ascending by key layout
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setCustomHeaders(list);
      },
      (error) => {
        console.error('[Firestore custom_headers subscription Error]:', error);
      }
    );

    return () => {
      unsubscribeRecords();
      unsubscribeBatches();
      unsubscribeHeaders();
    };
  }, [isAuthenticated]);

  const triggerNotification = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500); // clear after 4.5s
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    triggerNotification('Authenticated successfully. Welcome back to the training records portal.', 'success');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('isLoggedIn');
      await signOut(auth).catch(() => {});
      setIsAuthenticated(false);
      triggerNotification('Logged out of administrative portal session.', 'info');
    } catch (e: any) {
      console.error('Logout error:', e);
      triggerNotification('Failed to complete sign out.', 'warning');
    }
  };

  // Transaction merge handler for Excel spreadsheets
  const handleImportComplete = async (
    newRecords: Omit<TrainingRecord, 'id' | 'uploadedAt' | 'uploadBatchId'>[],
    filename: string,
    hasWarnings: boolean
  ) => {
    try {
      const result = await mergeUploadedRecords(newRecords, filename, hasWarnings);
      triggerNotification(
        `Successfully synced ${filename}: Added ${result.added} new records, updated ${result.updated} duplicates.`,
        hasWarnings ? 'warning' : 'success'
      );
    } catch (e: any) {
      console.error(e);
      triggerNotification('Failed to process spreadsheet merge transaction.', 'warning');
    }
  };

  const handleAddRecord = async (record: Omit<TrainingRecord, 'id' | 'uploadedAt' | 'uploadBatchId'>) => {
    try {
      await addRecordManually(record);
      triggerNotification(`Manually added 1 training record for ${record.employeeName}.`, 'success');
    } catch (e: any) {
      console.error(e);
      triggerNotification('Database write denied. Administrator approval required.', 'warning');
    }
  };

  const handleUpdateRecord = async (id: string, updatedFields: Partial<TrainingRecord>) => {
    try {
      const success = await updateRecordManually(id, updatedFields);
      if (success) {
        triggerNotification('Successfully updated the training record details.', 'success');
      }
    } catch (e: any) {
      console.error(e);
      triggerNotification('Database update denied. Administrator approval required.', 'warning');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const success = await deleteRecord(id);
      if (success) {
        triggerNotification('Training record has been deleted from the master database.', 'info');
      }
    } catch (e: any) {
      console.error(e);
      triggerNotification('Database operation denied. Administrator approval required.', 'warning');
    }
  };

  const handleDeleteRecords = async (ids: string[]) => {
    try {
      const success = await deleteRecords(ids);
      if (success) {
        triggerNotification(`Successfully deleted ${ids.length} selected training records from the master database.`, 'info');
      }
    } catch (e: any) {
      console.error(e);
      triggerNotification('Database operation denied. Administrator approval required.', 'warning');
    }
  };

  const handleAddCustomHeader = async (name: string, type: 'string' | 'number' | 'boolean') => {
    try {
      await addCustomHeader(name, type);
      triggerNotification(`New custom column header "${name}" was successfully registered.`, 'success');
    } catch (e: any) {
      console.error(e);
      triggerNotification('Failed to create custom header.', 'warning');
    }
  };

  const handleDeleteCustomHeader = async (id: string) => {
    try {
      await deleteCustomHeader(id);
      triggerNotification(`Custom column header "${id}" has been removed.`, 'info');
    } catch (e: any) {
      console.error(e);
      triggerNotification('Failed to delete custom header.', 'warning');
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden" id="entrypoint-app-root">
      
      {/* Floating Animated Toast Notifications */}
      <AnimatePresence>
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full" id="global-toast-notification">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3.5 ${
                notification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : notification.type === 'warning'
                  ? 'bg-amber-50 border-amber-100 text-amber-805'
                  : 'bg-slate-900 border-slate-800 text-white shadow-slate-950/20'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : notification.type === 'warning' ? (
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs font-semibold leading-relaxed">
                {notification.message}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isLoadingAuth ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-4 bg-slate-50 h-full w-full">
          <span className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400 font-mono tracking-widest uppercase">Verifying Cloud Session...</span>
        </div>
      ) : !isAuthenticated ? (
        // Secure Login Screen State
        <div className="flex-1 flex justify-center items-center p-4 bg-slate-50 overflow-y-auto">
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        // High Density Left Sidebar + Content Workspace Layout
        <div className="flex-1 flex h-full w-full overflow-hidden">
          {/* Left Navigation Sidebar */}
          <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col shrink-0 border-r border-slate-800">
            <div className="p-5 flex items-center gap-3 border-b border-slate-800 shrink-0">
              <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white text-sm">
                TM
              </div>
              <span className="font-semibold tracking-tight text-white text-sm">TrainLogic Pro</span>
            </div>
            
            <nav className="flex-1 py-4 flex flex-col gap-0.5">
              <div className="px-5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Main Console</div>
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center px-5 py-3 text-xs font-semibold transition-colors text-left cursor-pointer w-full ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white border-l-4 border-indigo-400 font-semibold'
                    : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-3 opacity-70" /> Dashboard
              </button>

              <button
                onClick={() => setActiveTab('records')}
                className={`flex items-center px-5 py-3 text-xs font-semibold transition-colors text-left cursor-pointer w-full ${
                  activeTab === 'records'
                    ? 'bg-indigo-600 text-white border-l-4 border-indigo-400 font-semibold'
                    : 'text-slate-400 hover:bg-slate-855 hover:text-white'
                }`}
              >
                <Database className="w-4 h-4 mr-3 opacity-70" /> Training Records
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center px-5 py-3 text-xs font-semibold transition-colors text-left cursor-pointer w-full text-slate-400 hover:bg-slate-860 hover:text-white"
              >
                <FileSpreadsheet className="w-4 h-4 mr-3 opacity-70" /> Upload Excel
              </button>

              <div className="mt-6 px-5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reports & Insights</div>
              
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  triggerNotification('Navigated to dashboard summary charts.', 'info');
                }}
                className="flex items-center px-5 py-3 text-xs font-semibold transition-colors text-left cursor-pointer w-full text-slate-400 hover:bg-slate-870 hover:text-white"
              >
                <span className="mr-3 opacity-70">⎙</span> Compliance Summary
              </button>

              <button
                onClick={() => {
                  setActiveTab('records');
                  triggerNotification('Use the database control panel below to download spreadsheet files.', 'info');
                }}
                className="flex items-center px-5 py-3 text-xs font-semibold transition-colors text-left cursor-pointer w-full text-slate-400 hover:bg-slate-880 hover:text-white"
              >
                <span className="mr-3 opacity-70">↓</span> Export Master Database
              </button>
            </nav>

            {/* Admin User Profile Section */}
            <div className="p-4 border-t border-slate-800 shrink-0">
              <div className="flex items-center gap-3 p-2 rounded bg-slate-800/40 border border-slate-800/40">
                <div className="w-7 h-7 rounded-sm bg-slate-700 font-bold text-xs flex items-center justify-center text-slate-300">
                  U
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate text-white">Admin User</p>
                  <p className="text-[9px] text-slate-500 truncate">{auth.currentUser?.email || 'admin@trainlogic.io'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                  title="Sign out of administrative workspace"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Workspace viewport */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {/* Top Toolbar Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-2xs">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Admin Portal: Employee Training Records
              </h1>
              
              <div className="flex items-center gap-3.5">
                {/* Connection check */}
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded text-[10px] font-mono text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>DB: CONNECTED</span>
                </div>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold tracking-wide shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>⊕</span> New Upload
                </button>
                
                {/* Mobile Logout trigger */}
                <button
                  onClick={handleLogout}
                  className="md:hidden p-1.5 text-slate-400 hover:text-red-650 rounded-lg text-sm transition-colors"
                  title="Logout session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Mobile Tab-Navigation Header bar (displayed on mobile layout instead of sidebar) */}
            <div className="md:hidden flex bg-white border-b border-slate-200 p-2 gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 py-2 text-center font-bold text-xs rounded-lg transition-colors ${
                  activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`flex-1 py-2 text-center font-bold text-xs rounded-lg transition-colors ${
                  activeTab === 'records' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Grid View
              </button>
            </div>

            {/* Scrollable interior viewport for active database components */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' ? (
                  <motion.div
                    key="dashboard-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <Dashboard records={records} batches={batches} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="records-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <TrainingTable
                      records={records}
                      customHeaders={customHeaders}
                      onAddRecord={handleAddRecord}
                      onUpdateRecord={handleUpdateRecord}
                      onDeleteRecord={handleDeleteRecord}
                      onDeleteRecords={handleDeleteRecords}
                      onAddCustomHeader={handleAddCustomHeader}
                      onDeleteCustomHeader={handleDeleteCustomHeader}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}

      {/* Spreadsheet Upload Modal Drawer Overlay */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onImportComplete={handleImportComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
