import React, { useState } from 'react';
import {
  UserPlus,
  Printer,
  Download,
  Upload,
  Search,
  Trash2,
  Award,
  UserCheck,
  RotateCcw,
  Eraser,
  Compass,
  ArrowDownUp
} from 'lucide-react';
import { Student, Teacher, Role } from '../types';
import { downloadCSV, readCSVFile } from '../utils/csv';

interface ClassesTabProps {
  currentYear: string;
  classList: string[];
  selectedClass: string;
  onSelectClass: (className: string) => void;
  teachers: Teacher[];
  students: Student[];
  onUpdateStudent: (student: Student) => void;
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onDeleteStudent: (studentId: number) => void;
  onClearClassStudents?: (className: string) => void;
  onClearClassScores?: (className: string) => void;
  currentUserRole: Role | null;
  loggedInTeacher: Teacher | null;
  subjects?: string[];
  classSubjects?: { [className: string]: string[] };
  onUpdateClassSubjects?: (classSubjects: { [className: string]: string[] }) => void;
}

export const ClassesTab: React.FC<ClassesTabProps> = ({
  currentYear,
  classList,
  selectedClass,
  onSelectClass,
  teachers,
  students,
  onUpdateStudent,
  onAddStudent,
  onDeleteStudent,
  onClearClassStudents,
  onClearClassScores,
  currentUserRole,
  loggedInTeacher,
  subjects = [],
  classSubjects = {},
  onUpdateClassSubjects
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAge, setNewStudentAge] = useState('7');
  const [newStudentGender, setNewStudentGender] = useState('ወ');

  const assignedTeacher = teachers.find((t) => t.assignedClass === selectedClass);
  const canEdit =
    currentUserRole === 'admin' ||
    (currentUserRole === 'teacher' && loggedInTeacher?.assignedClass === selectedClass);

  // Configuration of 7 assessments with their max scores and styling
  const assessmentsConfig = [
    { key: 'm1' as const, label: 'ምዘና 1 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm2' as const, label: 'ምዘና 2 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm3' as const, label: 'ምዘና 3 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm4' as const, label: 'ምዘና 4 (20)', max: 20, bg: 'bg-indigo-50/40', inputFocus: 'focus:border-indigo-600' },
    { key: 'm5' as const, label: 'ምዘና 5 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm6' as const, label: 'ምዘና 6 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm7' as const, label: 'ምዘና 7 (30)', max: 30, bg: 'bg-amber-50/40', inputFocus: 'focus:border-amber-600' },
  ];

  // Compute calculated totals and rankings (clean 0 scores so blank students don't clutter)
  const calculatedStudents = students.map((s) => {
    const m1 = Number(s.m1) || 0;
    const m2 = Number(s.m2) || 0;
    const m3 = Number(s.m3) || 0;
    const m4 = Number(s.m4) || 0;
    const m5 = Number(s.m5) || 0;
    const m6 = Number(s.m6) || 0;
    const m7 = Number(s.m7) || 0;

    const hasAnyScore = m1 > 0 || m2 > 0 || m3 > 0 || m4 > 0 || m5 > 0 || m6 > 0 || m7 > 0;
    const total = m1 + m2 + m3 + m4 + m5 + m6 + m7;
    return { ...s, total, hasAnyScore };
  });

  const studentsWithScores = calculatedStudents.filter((s) => s.hasAnyScore);
  const sortedTotals = [...studentsWithScores].sort((a, b) => b.total - a.total);

  const rankedStudents = calculatedStudents.map((s) => {
    if (!s.hasAnyScore) {
      return { ...s, rank: undefined };
    }
    const rank = sortedTotals.findIndex((item) => item.total === s.total) + 1;
    return { ...s, rank };
  });

  const filteredStudents = rankedStudents.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalCount = rankedStudents.length;
  const maleCount = rankedStudents.filter((s) => s.gender === 'ወ').length;
  const femaleCount = rankedStudents.filter((s) => s.gender === 'ሴ').length;
  const gradedCount = studentsWithScores.length;
  const avgScore =
    gradedCount > 0
      ? (studentsWithScores.reduce((sum, s) => sum + (s.total || 0), 0) / gradedCount).toFixed(1)
      : '-';
  const highestScore =
    gradedCount > 0 ? Math.max(...studentsWithScores.map((s) => s.total || 0)) : 0;

  // Horizontal and vertical keyboard navigation (↑ ↓ ← → and Enter)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    const totalRows = filteredStudents.length;
    const totalCols = assessmentsConfig.length;

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      targetRow = Math.min(totalRows - 1, rowIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow = Math.max(0, rowIndex - 1);
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (
        input.selectionEnd === input.value.length ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        if (colIndex < totalCols - 1) {
          e.preventDefault();
          targetCol = colIndex + 1;
        }
      } else {
        return;
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (
        input.selectionStart === 0 ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        if (colIndex > 0) {
          e.preventDefault();
          targetCol = colIndex - 1;
        }
      } else {
        return;
      }
    } else {
      return;
    }

    const nextElem = document.getElementById(`score-input-${targetRow}-${targetCol}`) as HTMLInputElement | null;
    if (nextElem) {
      nextElem.focus();
      nextElem.select();
    }
  };

  const handleScoreChange = (
    student: Student,
    field: 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7',
    val: string,
    maxVal: number
  ) => {
    if (val.trim() === '') {
      onUpdateStudent({
        ...student,
        [field]: 0
      });
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num) || num < 0) num = 0;
    if (num > maxVal) {
      alert(`ከፍተኛው ነጥብ ${maxVal} መሆን አለበት!`);
      num = maxVal;
    }
    onUpdateStudent({
      ...student,
      [field]: num
    });
  };

  // Clear single student's scores to blank
  const handleClearStudentScores = (student: Student) => {
    if (!canEdit) return;
    if (window.confirm(`የ"${student.name}"ን ውጤት በሙሉ አጽድተው ባዶ ማድረግ ይፈልጋሉ?`)) {
      onUpdateStudent({
        ...student,
        m1: 0,
        m2: 0,
        m3: 0,
        m4: 0,
        m5: 0,
        m6: 0,
        m7: 0
      });
    }
  };

  // Bulk actions: Clear all scores in class
  const handleClearClassScores = () => {
    if (!canEdit || students.length === 0) return;
    if (
      window.confirm(
        `እርግጠኛ ነዎት? በ${selectedClass} ያሉትን የ${students.length} ተማሪዎች ውጤት በሙሉ አጽድተው ባዶ ማድረግ ይፈልጋሉ? (የተማሪዎች ስም አይጠፋም)`
      )
    ) {
      if (onClearClassScores) {
        onClearClassScores(selectedClass);
      } else {
        students.forEach((s) => {
          onUpdateStudent({
            ...s,
            m1: 0,
            m2: 0,
            m3: 0,
            m4: 0,
            m5: 0,
            m6: 0,
            m7: 0
          });
        });
      }
    }
  };

  // Bulk actions: Delete all students in class
  const handleClearAllStudents = () => {
    if (!canEdit || students.length === 0) return;
    if (
      window.confirm(
        `⚠️ ማስጠንቀቂያ፡ በ${selectedClass} ውስጥ ያሉትን ሁሉንም (${students.length}) ተማሪዎች ከመዝገብ ሙሉ በሙሉ መሰረዝ ይፈልጋሉ? ይህ እርምጃ አይመለስም!`
      )
    ) {
      if (onClearClassStudents) {
        onClearClassStudents(selectedClass);
      } else {
        students.forEach((s) => onDeleteStudent(s.id));
      }
    }
  };

  const handleInfoChange = (
    student: Student,
    field: 'name' | 'age' | 'gender',
    val: string
  ) => {
    onUpdateStudent({
      ...student,
      [field]: val
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      alert('እባክዎ የተማሪውን ሙሉ ስም ያስገቡ!');
      return;
    }
    onAddStudent({
      name: newStudentName.trim(),
      age: newStudentAge.trim() || '7',
      gender: newStudentGender,
      m1: 0,
      m2: 0,
      m3: 0,
      m4: 0,
      m5: 0,
      m6: 0,
      m7: 0
    });
    setNewStudentName('');
    setNewStudentAge('7');
    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    let csv =
      '\uFEFFተ.ቁ,የተማሪው ስም,ዕድሜ,ፆታ,ምዘና 1 (10),ምዘና 2 (10),ምዘና 3 (10),ምዘና 4 (20),ምዘና 5 (10),ምዘና 6 (10),ምዘና 7 (30),አጠቃላይ ድምር (100),ደረጃ\n';
    rankedStudents.forEach((s, idx) => {
      csv += `${idx + 1},"${s.name}",${s.age},${s.gender},${s.m1},${s.m2},${s.m3},${s.m4},${s.m5},${s.m6},${s.m7},${s.total},${s.rank}\n`;
    });
    downloadCSV(csv, `${selectedClass}_የውጤት_መዝገብ_${currentYear}.csv`);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readCSVFile(file);
      if (rows.length <= 1) {
        alert('የተመረጠው ፋይል ባዶ ወይም ትክክለኛ የኤክሴል/CSV ፎርማት አይደለም!');
        return;
      }

      let count = 0;
      const startIdx = (rows[0][0]?.includes('ተ.ቁ') || rows[0][1]?.includes('ስም') || rows[0][0]?.toLowerCase().includes('name')) ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 2) continue;

        let nameVal = '';
        let ageVal = '7';
        let genderVal = 'ወ';
        let m1 = 0, m2 = 0, m3 = 0, m4 = 0, m5 = 0, m6 = 0, m7 = 0;

        if (isNaN(Number(cols[0])) && cols[0].length > 1) {
          nameVal = cols[0];
          ageVal = cols[1] || '7';
          genderVal = cols[2] === 'ሴ' || cols[2]?.toLowerCase() === 'f' ? 'ሴ' : 'ወ';
          m1 = parseFloat(cols[3]) || 0;
          m2 = parseFloat(cols[4]) || 0;
          m3 = parseFloat(cols[5]) || 0;
          m4 = parseFloat(cols[6]) || 0;
          m5 = parseFloat(cols[7]) || 0;
          m6 = parseFloat(cols[8]) || 0;
          m7 = parseFloat(cols[9]) || 0;
        } else {
          nameVal = cols[1] || '';
          ageVal = cols[2] || '7';
          genderVal = cols[3] === 'ሴ' || cols[3]?.toLowerCase() === 'f' ? 'ሴ' : 'ወ';
          m1 = parseFloat(cols[4]) || 0;
          m2 = parseFloat(cols[5]) || 0;
          m3 = parseFloat(cols[6]) || 0;
          m4 = parseFloat(cols[7]) || 0;
          m5 = parseFloat(cols[8]) || 0;
          m6 = parseFloat(cols[9]) || 0;
          m7 = parseFloat(cols[10]) || 0;
        }

        if (nameVal.trim()) {
          onAddStudent({
            name: nameVal.trim(),
            age: ageVal,
            gender: genderVal,
            m1, m2, m3, m4, m5, m6, m7
          });
          count++;
        }
      }

      alert(`✓ ${count} ተማሪዎች ከኤክሴል/CSV ፋይል በተሳካ ሁኔታ ተጭነዋል!`);
    } catch {
      alert('ፋይሉን ማንበብ አልተሳካም። እባክዎ ትክክለኛ የCSV/ኤክሴል ፋይል መሆኑን ያረጋግጡ።');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Printable Sheet Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-semibold">የልጆች አገልግሎት ዘርፍ የውጤት መዝገብ</h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>ክፍል፦ {selectedClass}</span>
          <span>የትምህርት ዘመን፦ {currentYear} ዓ/ም</span>
          <span>መምህር፦ {assignedTeacher ? assignedTeacher.name : 'ልዩ አልተመደበም'}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                ክፍል ይምረጡ፦
              </label>
              <select
                value={selectedClass}
                onChange={(e) => onSelectClass(e.target.value)}
                disabled={currentUserRole === 'teacher'}
                className="bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:opacity-80"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                የክፍሉ መምህር፦ {assignedTeacher ? `${assignedTeacher.name}${assignedTeacher.assignedSubject ? ` (${assignedTeacher.assignedSubject})` : ''}` : 'ልዩ አልተመደበም'}
              </span>

              {/* Class Subjects Badge & Picker Button */}
              <button
                type="button"
                onClick={() => setShowSubjectModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-semibold hover:bg-blue-100 transition"
                title="ለዚህ ክፍል የትምህርት ዓይነቶች ምረጥ"
              >
                <span>ትምህርቶች፦ {(classSubjects[selectedClass] || []).length > 0 ? (classSubjects[selectedClass] || []).join('፣ ') : 'አጠቃላይ'}</span>
                {canEdit && <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold">+ ምረጥ</span>}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="በተማሪ ስም ፈልግ..."
                className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-44"
              />
            </div>

            {(canEdit || currentUserRole === 'leader') && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + ተማሪ
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="ገጹን ወደ PDF ቀይር ወይም አትም"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="ውጤቱን ወደ Excel/CSV አውርድ"
            >
              <Download className="w-3.5 h-3.5" />
              Excel አውርድ
            </button>

            {canEdit && (
              <>
                <label
                  className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="የተማሪዎችን ስምና ውጤት ከExcel/CSV ፋይል ወደ ስርዓቱ ጫን"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Excel ጫን
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>

                {/* Clear / Delete Buttons */}
                <button
                  type="button"
                  onClick={handleClearClassScores}
                  disabled={students.length === 0}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-40 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-amber-300"
                  title="የክፍሉን ተማሪዎች ውጤት በሙሉ አጽዳ (ደልት)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  ውጤት አጽዳ
                </button>

                <button
                  type="button"
                  onClick={handleClearAllStudents}
                  disabled={students.length === 0}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-40 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-rose-300"
                  title="በዚህ ክፍል ያሉትን ተማሪዎች በሙሉ ከመዝገብ ሰርዝ (ደልት)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ተማሪዎችን ሰርዝ
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tip Bar for Computers */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 bg-blue-50/80 text-blue-900 border border-blue-200 px-3 py-1.5 rounded-xl font-medium">
            <Compass className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong>የኮምፒውተር መመሪያ፦</strong> በኪቦርድ ቀስቶች (<strong>↑ ወደ ላይ</strong>፣ <strong>↓ ወደ ታች</strong>፣ <strong>→ ወደ ቀኝ</strong>፣ <strong>← ወደ ግራ</strong>) ወይም በ <strong>Enter</strong> በፍጥነት እየተዘዋወሩ ውጤት ማስገባት ይችላሉ። 0 ውጤቶች ባዶ ሆነዋል።
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span>ጠቅላላ፦ <strong className="text-slate-800">{totalCount}</strong></span>
            <span>ውጤት የገባቸው፦ <strong className="text-teal-700">{gradedCount}</strong></span>
            <span>አማካይ፦ <strong className="text-blue-800">{avgScore}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Table with Sticky Header & Sticky Columns */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[72vh] overflow-y-auto relative scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                <th className="py-3 px-2 border-r border-slate-200 sticky left-0 z-30 bg-slate-100 w-12">
                  ተ.ቁ
                </th>
                <th className="py-3 px-3 border-r border-slate-200 min-w-[170px] text-left sticky left-12 z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  የተማሪው ሙሉ ስም
                </th>
                <th className="py-3 px-2 border-r border-slate-200 w-14">ዕድሜ</th>
                <th className="py-3 px-2 border-r border-slate-200 w-12">ፆታ</th>
                {assessmentsConfig.map((ass) => (
                  <th key={ass.key} className={`py-3 px-2 border-r border-slate-200 w-16 ${ass.bg}`}>
                    {ass.label}
                  </th>
                ))}
                <th className="py-3 px-2 border-r border-slate-200 w-20 bg-slate-200 font-extrabold text-slate-900">
                  ድምር (100)
                </th>
                <th className="py-3 px-2 border-r border-slate-200 w-16">ደረጃ</th>
                {currentUserRole !== 'leader' && (
                  <th className="py-3 px-2 print:hidden w-24" id="actionHeaderTh">
                    ተግባር / መደለቻ
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    ምንም ተማሪ አልተገኘም። አዲስ ተማሪ ለማስገባት "+ ተማሪ" የሚለውን ይጫኑ ወይም ከ Excel ይጫኑ።
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, index) => {
                  const isTopThree = s.rank !== undefined && s.rank <= 3;
                  return (
                    <tr
                      key={s.id}
                      className={`group hover:bg-slate-50/80 transition ${
                        isTopThree ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Sticky Index Column */}
                      <td className="py-2.5 px-2 border-r border-slate-200 font-medium text-slate-500 sticky left-0 z-10 bg-white group-hover:bg-slate-50 w-12">
                        {index + 1}
                      </td>

                      {/* Sticky Name Column */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-left font-semibold text-slate-900 sticky left-12 z-10 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {canEdit ? (
                          <input
                            type="text"
                            value={s.name}
                            onChange={(e) => handleInfoChange(s, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs outline-none"
                          />
                        ) : (
                          <span>{s.name}</span>
                        )}
                      </td>

                      {/* Age */}
                      <td className="py-2.5 px-1 border-r border-slate-200">
                        {canEdit ? (
                          <input
                            type="text"
                            value={s.age}
                            onChange={(e) => handleInfoChange(s, 'age', e.target.value)}
                            className="w-10 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs outline-none"
                          />
                        ) : (
                          <span>{s.age}</span>
                        )}
                      </td>

                      {/* Gender */}
                      <td className="py-2.5 px-1 border-r border-slate-200">
                        {canEdit ? (
                          <select
                            value={s.gender}
                            onChange={(e) => handleInfoChange(s, 'gender', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 rounded px-1 py-0.5 text-xs outline-none"
                          >
                            <option value="ወ">ወ</option>
                            <option value="ሴ">ሴ</option>
                          </select>
                        ) : (
                          <span
                            className={`font-semibold ${
                              s.gender === 'ወ' ? 'text-blue-600' : 'text-rose-600'
                            }`}
                          >
                            {s.gender}
                          </span>
                        )}
                      </td>

                      {/* Assessments 1 - 7 with Keyboard Arrow Navigation and Zero-score Blanking */}
                      {assessmentsConfig.map((ass, colIdx) => {
                        const val = s[ass.key];
                        const displayVal = val && Number(val) > 0 ? val : '';
                        return (
                          <td key={ass.key} className={`py-2 px-1 border-r border-slate-200 ${ass.bg}`}>
                            <input
                              id={`score-input-${index}-${colIdx}`}
                              type="number"
                              value={displayVal}
                              placeholder=""
                              disabled={!canEdit}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => handleKeyDown(e, index, colIdx)}
                              onChange={(e) => handleScoreChange(s, ass.key, e.target.value, ass.max)}
                              className={`w-12 text-center py-1.5 rounded-lg border border-slate-300 ${ass.inputFocus} focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-transparent disabled:border-transparent font-bold text-slate-900 text-xs transition`}
                              min="0"
                              max={ass.max}
                            />
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-2.5 px-2 border-r border-slate-200 font-extrabold text-sm text-slate-900 bg-slate-100/60">
                        {s.hasAnyScore ? s.total : '-'}
                      </td>

                      {/* Rank */}
                      <td className="py-2.5 px-2 border-r border-slate-200 font-semibold">
                        {s.rank !== undefined ? (
                          isTopThree ? (
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-xs ${
                                s.rank === 1
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : s.rank === 2
                                  ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                  : 'bg-orange-100 text-orange-800 border border-orange-300'
                              }`}
                            >
                              <Award className="w-3 h-3" />
                              {s.rank}ኛ
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">{s.rank}ኛ</span>
                          )
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* Actions: Clear student scores or delete student */}
                      {currentUserRole !== 'leader' && (
                        <td className="py-2.5 px-2 print:hidden">
                          {canEdit ? (
                            <div className="flex items-center justify-center gap-1">
                              {s.hasAnyScore && (
                                <button
                                  type="button"
                                  onClick={() => handleClearStudentScores(s)}
                                  className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-50 transition"
                                  title="የተማሪውን ውጤት አጽዳ (ደልት)"
                                >
                                  <Eraser className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`"${s.name}" የተባለውን ተማሪ ከመዝገብ ሙሉ በሙሉ መሰረዝ ይፈልጋሉ?`)) {
                                    onDeleteStudent(s.id);
                                  }
                                }}
                                className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                                title="ተማሪ ሰርዝ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Printable Signature Section */}
      <div className="hidden print:flex justify-between pt-10 text-xs font-semibold text-slate-800">
        <div>
          <p>የክፍሉ መምህር ስም፦ _______________________</p>
          <p className="mt-2">ፊርማ፦ _________________ ቀን፦ ___________</p>
        </div>
        <div>
          <p>የሰንበት ት/ቤት አስተባባሪ፦ ___________________</p>
          <p className="mt-2">ፊርማ፦ _________________ ቀን፦ ___________</p>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">አዲስ ተማሪ መዝግብ</h3>
            <p className="text-xs text-slate-500 mb-4">ክፍል፦ {selectedClass}</p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የተማሪው ሙሉ ስም፦
                </label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="የተማሪውን ሙሉ ስም ያስገቡ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ዕድሜ፦
                  </label>
                  <input
                    type="number"
                    value={newStudentAge}
                    onChange={(e) => setNewStudentAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    min="1"
                    max="25"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ፆታ፦
                  </label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="ወ">ወንድ (ወ)</option>
                    <option value="ሴ">ሴት (ሴ)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-blue-800 hover:bg-blue-700 text-white rounded-xl font-semibold shadow"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Picker Modal for Current Class */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ለ{selectedClass} የትምህርት ዓይነቶች መምረጫ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ይህ ክፍል የሚማራቸውን ትምህርቶች ይምረጡ ወይም ምልክት (Check) ያድርጉ
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {subjects.map((sub) => {
                const currentList = classSubjects[selectedClass] || [];
                const isChecked = currentList.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      if (!onUpdateClassSubjects) return;
                      const next = isChecked
                        ? currentList.filter((s) => s !== sub)
                        : [...currentList, sub];
                      onUpdateClassSubjects({
                        ...classSubjects,
                        [selectedClass]: next
                      });
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                      isChecked
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{sub}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isChecked ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isChecked ? 'ተመርጧል' : 'አልተመረጠም'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 text-xs bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow"
              >
                እሺ / ተጠናቋል
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
