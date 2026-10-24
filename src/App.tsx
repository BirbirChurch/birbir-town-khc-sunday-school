/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  CalendarCheck2,
  Music,
  BookOpen,
  Award,
  Target,
  UserCheck,
  BookMarked,
  KeyRound
} from 'lucide-react';
import { Role, Teacher, Student, AbsenteeRecord, ChoirMember, SpiritualMember, AnnualPlanItem, AppData } from './types';
import { CLASS_LIST, DEFAULT_ANNUAL_PLAN } from './constants/initialData';
import { subscribeToAppData, syncAppDataToFirebase, countStudentsInData, exportBackupJSON } from './services/firebase';
import { Header } from './components/Header';
import { LoginPortal } from './components/LoginPortal';
import { ClassesTab } from './components/ClassesTab';
import { AttendanceTab } from './components/AttendanceTab';
import { ChoirTab } from './components/ChoirTab';
import { SpiritualTab } from './components/SpiritualTab';
import { TopAchieversTab } from './components/TopAchieversTab';
import { PlanReportTab } from './components/PlanReportTab';
import { TeachersTab } from './components/TeachersTab';
import { SubjectsTab } from './components/SubjectsTab';
import { PinManageTab } from './components/PinManageTab';
import { FirebaseSyncModal } from './components/FirebaseSyncModal';

export default function App() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'saving' | 'offline' | 'error'>('connected');
  const [currentYear, setCurrentYear] = useState<string>('2019');
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>(CLASS_LIST[3]); // 1ኛ ክፍል ሀ
  const [activeTab, setActiveTab] = useState<string>('classesTab');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Connect to Firebase Realtime Database and Firestore
  useEffect(() => {
    const unsubscribe = subscribeToAppData(
      (data) => {
        setAppData(data);
        if (data.years && data.years.length > 0 && !data.years.includes(currentYear)) {
          setCurrentYear(data.years[0]);
        }
      },
      (status) => {
        setSyncStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Update cloud helper
  const updateAppData = useCallback((updater: (prev: AppData) => AppData) => {
    setAppData((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      setSyncStatus('saving');
      syncAppDataToFirebase(updated)
        .then(() => setSyncStatus('connected'))
        .catch(() => setSyncStatus('offline'));
      return updated;
    });
  }, []);

  // Handlers for Login
  const handleLoginSuccess = (role: Role, teacher?: Teacher) => {
    setCurrentUserRole(role);
    if (role === 'teacher' && teacher) {
      setLoggedInTeacher(teacher);
      setSelectedClass(teacher.assignedClass);
    } else {
      setLoggedInTeacher(null);
    }
    setActiveTab('classesTab');
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    setLoggedInTeacher(null);
    setActiveTab('classesTab');
  };

  // Add academic year
  const handleAddYear = (newYear: string) => {
    updateAppData((prev) => ({
      ...prev,
      years: prev.years.includes(newYear) ? prev.years : [...prev.years, newYear]
    }));
    setCurrentYear(newYear);
  };

  // Students handlers
  const currentClassStudents = useMemo(() => {
    if (!appData) return [];
    return appData.students?.[currentYear]?.[selectedClass] || [];
  }, [appData, currentYear, selectedClass]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    updateAppData((prev) => {
      const yearStudents = prev.students?.[currentYear] || {};
      const classStudents = yearStudents[selectedClass] || [];
      const updatedList = classStudents.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));

      return {
        ...prev,
        students: {
          ...prev.students,
          [currentYear]: {
            ...yearStudents,
            [selectedClass]: updatedList
          }
        }
      };
    });
  };

  const handleAddStudent = (newStudent: Omit<Student, 'id'>) => {
    const studentWithId: Student = {
      ...newStudent,
      id: Date.now()
    };

    updateAppData((prev) => {
      const yearStudents = prev.students?.[currentYear] || {};
      const classStudents = yearStudents[selectedClass] || [];

      return {
        ...prev,
        students: {
          ...prev.students,
          [currentYear]: {
            ...yearStudents,
            [selectedClass]: [...classStudents, studentWithId]
          }
        }
      };
    });
  };

  const handleDeleteStudent = (studentId: number) => {
    updateAppData((prev) => {
      const yearStudents = prev.students?.[currentYear] || {};
      const classStudents = yearStudents[selectedClass] || [];

      return {
        ...prev,
        students: {
          ...prev.students,
          [currentYear]: {
            ...yearStudents,
            [selectedClass]: classStudents.filter((s) => s.id !== studentId)
          }
        }
      };
    });
  };

  const handleClearClassStudents = (className: string) => {
    updateAppData((prev) => {
      const yearStudents = prev.students?.[currentYear] || {};
      return {
        ...prev,
        students: {
          ...prev.students,
          [currentYear]: {
            ...yearStudents,
            [className]: []
          }
        }
      };
    });
  };

  const handleClearClassScores = (className: string) => {
    updateAppData((prev) => {
      const yearStudents = prev.students?.[currentYear] || {};
      const classStudents = yearStudents[className] || [];
      const cleared = classStudents.map((s) => ({
        ...s,
        m1: 0,
        m2: 0,
        m3: 0,
        m4: 0,
        m5: 0,
        m6: 0,
        m7: 0
      }));
      return {
        ...prev,
        students: {
          ...prev.students,
          [currentYear]: {
            ...yearStudents,
            [className]: cleared
          }
        }
      };
    });
  };

  // Attendance handlers
  const handleAddAttendance = (record: Omit<AbsenteeRecord, 'id'>) => {
    const recWithId: AbsenteeRecord = {
      ...record,
      id: Date.now()
    };
    updateAppData((prev) => ({
      ...prev,
      attendance: [...(prev.attendance || []), recWithId]
    }));
  };

  const handleDeleteAttendance = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      attendance: (prev.attendance || []).filter((a) => a.id !== id)
    }));
  };

  // Choir handlers
  const handleAddChoirMember = (member: Omit<ChoirMember, 'id'>) => {
    const mWithId: ChoirMember = {
      ...member,
      id: Date.now()
    };
    updateAppData((prev) => ({
      ...prev,
      choirMembers: [...(prev.choirMembers || []), mWithId]
    }));
  };

  const handleDeleteChoirMember = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      choirMembers: (prev.choirMembers || []).filter((m) => m.id !== id)
    }));
  };

  const handleAddChoirGroup = (groupName: string) => {
    updateAppData((prev) => ({
      ...prev,
      choirGroups: [...(prev.choirGroups || []), groupName]
    }));
  };

  // Spiritual handlers
  const handleAddSpiritualMember = (member: Omit<SpiritualMember, 'id'>) => {
    const mWithId: SpiritualMember = {
      ...member,
      id: Date.now()
    };
    updateAppData((prev) => ({
      ...prev,
      spiritualMembers: [...(prev.spiritualMembers || []), mWithId]
    }));
  };

  const handleDeleteSpiritualMember = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      spiritualMembers: (prev.spiritualMembers || []).filter((m) => m.id !== id)
    }));
  };

  const handleAddSpiritualGroup = (groupName: string) => {
    updateAppData((prev) => ({
      ...prev,
      spiritualGroups: [...(prev.spiritualGroups || []), groupName]
    }));
  };

  // Plan handlers
  const handleUpdatePlan = (updatedPlan: AnnualPlanItem) => {
    updateAppData((prev) => ({
      ...prev,
      plans: (prev.plans || []).map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    }));
  };

  const handleAddPlan = (newPlan: Omit<AnnualPlanItem, 'id'>) => {
    const planWithId: AnnualPlanItem = {
      ...newPlan,
      id: Date.now()
    };
    updateAppData((prev) => ({
      ...prev,
      plans: [...(prev.plans || []), planWithId]
    }));
  };

  const handleDeletePlan = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      plans: (prev.plans || []).filter((p) => p.id !== id)
    }));
  };

  const handleImportPlans = (newPlans: AnnualPlanItem[]) => {
    updateAppData((prev) => ({
      ...prev,
      plans: newPlans
    }));
  };

  // Teacher handlers
  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t))
    }));
  };

  const handleAddTeacher = (newTeacher: Omit<Teacher, 'id'>) => {
    const tWithId: Teacher = {
      ...newTeacher,
      id: Date.now()
    };
    updateAppData((prev) => ({
      ...prev,
      teachers: [...prev.teachers, tWithId]
    }));
  };

  const handleDeleteTeacher = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== id)
    }));
  };

  // Subjects handlers
  const handleAddSubject = (subjectName: string) => {
    updateAppData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, subjectName]
    }));
  };

  const handleDeleteSubject = (index: number) => {
    updateAppData((prev) => {
      const nextSubs = [...prev.subjects];
      nextSubs.splice(index, 1);
      return {
        ...prev,
        subjects: nextSubs
      };
    });
  };

  const handleUpdateClassSubjects = (newClassSubjects: { [className: string]: string[] }) => {
    updateAppData((prev) => ({
      ...prev,
      classSubjects: newClassSubjects
    }));
  };

  const handleReorderTeachers = (reorderedTeachers: Teacher[]) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: reorderedTeachers
    }));
  };

  // Save Role PINs
  const handleSavePins = (adminPin: string, leaderPin: string) => {
    updateAppData((prev) => ({
      ...prev,
      pins: {
        admin: adminPin,
        leader: leaderPin
      }
    }));
  };

  if (!appData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h2>
        <p className="text-xs text-blue-300 mt-1">ዳታቤዝ በመገናኘት ላይ ነው...</p>
      </div>
    );
  }

  // Navigation tab definitions
  const tabs = [
    { id: 'classesTab', label: 'የክፍል ደረጃዎች & ውጤት', icon: GraduationCap, roles: ['admin', 'leader', 'teacher'] },
    { id: 'attendanceTab', label: 'የዕለቱ የቀሪዎች ሪፖርት', icon: CalendarCheck2, roles: ['admin', 'leader', 'teacher'] },
    { id: 'choirTab', label: 'የመዘምራንና ኪነ-ጥበብ ቡድኖች', icon: Music, roles: ['admin', 'leader', 'teacher'] },
    { id: 'spiritualTab', label: 'መንፈሳዊ ትምህርት ቡድኖች', icon: BookOpen, roles: ['admin', 'leader', 'teacher'] },
    { id: 'topAchieversTab', label: 'ከ1ኛ - 3ኛ ደረጃዎች', icon: Award, roles: ['admin', 'leader', 'teacher'] },
    { id: 'planReportTab', label: 'የዓመት ዕቅድ & ሩብ ሪፖርት', icon: Target, roles: ['admin'] },
    { id: 'teachersTab', label: 'የመምህራን ዝርዝር & PIN', icon: UserCheck, roles: ['admin', 'leader'] },
    { id: 'subjectsTab', label: 'የትምህርት ዓይነቶች', icon: BookMarked, roles: ['admin', 'leader'] },
    { id: 'pinManageTab', label: 'የመግቢያ ቁልፍ ቅንብር', icon: KeyRound, roles: ['admin'] },
  ];

  const visibleTabs = tabs.filter((t) => currentUserRole && t.roles.includes(currentUserRole));

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Header
        currentYear={currentYear}
        years={appData?.years || ['2019']}
        onYearChange={setCurrentYear}
        onAddYear={handleAddYear}
        currentUserRole={currentUserRole}
        loggedInTeacherName={loggedInTeacher?.name}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Reassurance & Fast Data Protection Banner */}
      {appData && (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white px-4 py-2.5 border-b border-emerald-700/50 print:hidden text-xs shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold text-emerald-100">
                ✓ የሰሩት ስራ አልጠፋም! በደህንነት ተቀምጧል
              </span>
              <span className="text-emerald-300/90 hidden md:inline">
                (በስርዓቱ ውስጥ፦ {countStudentsInData(appData)} ተማሪዎች፣ {appData.teachers?.length || 0} መምህራን ተመዝግበዋል)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => exportBackupJSON(appData)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition flex items-center gap-1 shadow"
                title="የሰሩትን ሙሉ መረጃ ወዲያውኑ ወደ ኮምፒዩተርዎ ያውርዱ"
              >
                <span>💾 ባክአፕ አውርድ (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="bg-blue-800 hover:bg-blue-700 text-amber-300 font-bold px-3 py-1 rounded-lg text-[11px] transition flex items-center gap-1 border border-blue-700 shadow"
                title="የFirebase ግንኙነት ማስተካከያና የቀድሞ ስራ መፈለጊያ"
              >
                <span>⚙️ ዳታቤዝ ማስተካከያ & የቀድሞ ስራ መፈለጊያ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!currentUserRole ? (
          <LoginPortal
            teachers={appData.teachers}
            adminPin={appData.pins?.admin || '1234'}
            leaderPin={appData.pins?.leader || '5678'}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <div className="space-y-6">
            {/* Top Navigation Tabs */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
              <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-thin py-1 px-1">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-900 text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Contents */}
            <div>
              {activeTab === 'classesTab' && (
                <ClassesTab
                  currentYear={currentYear}
                  classList={CLASS_LIST}
                  selectedClass={selectedClass}
                  onSelectClass={setSelectedClass}
                  teachers={appData.teachers}
                  students={currentClassStudents}
                  onUpdateStudent={handleUpdateStudent}
                  onAddStudent={handleAddStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onClearClassStudents={handleClearClassStudents}
                  onClearClassScores={handleClearClassScores}
                  currentUserRole={currentUserRole}
                  loggedInTeacher={loggedInTeacher}
                  subjects={appData.subjects}
                  classSubjects={appData.classSubjects || {}}
                  onUpdateClassSubjects={handleUpdateClassSubjects}
                />
              )}

              {activeTab === 'attendanceTab' && (
                <AttendanceTab
                  currentYear={currentYear}
                  classList={CLASS_LIST}
                  attendance={appData.attendance || []}
                  onAddAttendance={handleAddAttendance}
                  onDeleteAttendance={handleDeleteAttendance}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'choirTab' && (
                <ChoirTab
                  groups={appData.choirGroups || []}
                  members={appData.choirMembers || []}
                  onAddMember={handleAddChoirMember}
                  onDeleteMember={handleDeleteChoirMember}
                  onAddGroup={handleAddChoirGroup}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'spiritualTab' && (
                <SpiritualTab
                  groups={appData.spiritualGroups || []}
                  members={appData.spiritualMembers || []}
                  onAddMember={handleAddSpiritualMember}
                  onDeleteMember={handleDeleteSpiritualMember}
                  onAddGroup={handleAddSpiritualGroup}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'topAchieversTab' && (
                <TopAchieversTab
                  currentYear={currentYear}
                  classList={CLASS_LIST}
                  studentsByClass={appData.students?.[currentYear] || {}}
                />
              )}

              {activeTab === 'planReportTab' && currentUserRole === 'admin' && (
                <PlanReportTab
                  currentYear={currentYear}
                  plans={appData.plans || DEFAULT_ANNUAL_PLAN}
                  onUpdatePlan={handleUpdatePlan}
                  onAddPlan={handleAddPlan}
                  onDeletePlan={handleDeletePlan}
                  onImportPlans={handleImportPlans}
                />
              )}

              {activeTab === 'teachersTab' && (currentUserRole === 'admin' || currentUserRole === 'leader') && (
                <TeachersTab
                  teachers={appData.teachers}
                  classList={CLASS_LIST}
                  subjects={appData.subjects}
                  currentUserRole={currentUserRole}
                  onUpdateTeacher={handleUpdateTeacher}
                  onAddTeacher={handleAddTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                  onReorderTeachers={handleReorderTeachers}
                />
              )}

              {activeTab === 'subjectsTab' && (currentUserRole === 'admin' || currentUserRole === 'leader') && (
                <SubjectsTab
                  subjects={appData.subjects}
                  classList={CLASS_LIST}
                  classSubjects={appData.classSubjects || {}}
                  onUpdateClassSubjects={handleUpdateClassSubjects}
                  onAddSubject={handleAddSubject}
                  onDeleteSubject={handleDeleteSubject}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'pinManageTab' && currentUserRole === 'admin' && (
                <PinManageTab
                  adminPin={appData.pins?.admin || '1234'}
                  leaderPin={appData.pins?.leader || '5678'}
                  onSavePins={handleSavePins}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {currentYear} የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን - የልጆች አገልግሎት ዘርፍ
          </span>
          <span className="text-[11px] text-slate-400">
            የመረጃ፣ የውጤትና የዓመት ዕቅድ ማኔጅመንት ሲስተም
          </span>
        </div>
      </footer>

      {appData && (
        <FirebaseSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          appData={appData}
          onDataRestored={(newData) => {
            setAppData(newData);
            syncAppDataToFirebase(newData);
          }}
          syncStatus={syncStatus}
        />
      )}
    </div>
  );
}
