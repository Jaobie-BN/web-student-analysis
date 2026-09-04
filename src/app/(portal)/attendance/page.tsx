"use client";

import { useState, useEffect } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { useToast } from "@/context/ToastContext";
import { generateSessionDates, AttendanceStatus, parseMultipleThaiWeekdays } from "@/utils/mathUtils";
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  Calendar,
  ChevronDown,
  X
} from "lucide-react";

export default function AttendancePage() {
  const {
    currentClassroom,
    students,
    attendance,
    saveAttendance,
    loading
  } = useClassroom();
  const { success: toastSuccess, error: toastError } = useToast();

  const getWeekNumAndDayLabel = (dateStr: string, idx: number) => {
    if (!currentClassroom) return "";
    const targetWeekdays = parseMultipleThaiWeekdays(currentClassroom.weekly_schedule);
    const numDaysPerWeek = targetWeekdays.length > 0 ? targetWeekdays.length : 1;
    const weekNum = Math.floor(idx / numDaysPerWeek) + 1;
    
    const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const d = new Date(dateStr);
    const dayName = dayNames[d.getDay()];
    
    return `สัปดาห์ที่ ${weekNum} (${dayName})`;
  };

  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [studentStatuses, setStudentStatuses] = useState<{ [studentId: string]: AttendanceStatus }>({});
  const [filterStatus, setFilterStatus] = useState<"all" | AttendanceStatus>("all");
  
  // Custom date creation
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customDateVal, setCustomDateVal] = useState("");

  const [saving, setSaving] = useState(false);

  const [activeStudentIndex, setActiveStudentIndex] = useState<number>(0);

  // 1. Generate standard weekly dates based on classroom schedule
  useEffect(() => {
    if (currentClassroom) {
      const dates = generateSessionDates(
        currentClassroom.semester_start_date,
        currentClassroom.weekly_schedule,
        currentClassroom.total_weeks
      );
      setSessionDates(dates);
      
      // Default select the first date
      if (dates.length > 0) {
        setSelectedDate(dates[0]);
      }
    }
  }, [currentClassroom]);

  // 2. Load existing attendance statuses when selected date changes
  useEffect(() => {
    if (selectedDate && attendance.length > 0) {
      const statuses: { [studentId: string]: AttendanceStatus } = {};
      
      // Find all logs for the current selected date
      const dateLogs = attendance.filter((a) => a.session_date === selectedDate);
      
      // Map existing statuses, default others to "present" or empty
      students.forEach((s) => {
        const log = dateLogs.find((l) => l.student_id === s.id);
        statuses[s.id] = log ? log.status : "present"; // Default to Present for quicker logging
      });
      
      setStudentStatuses(statuses);
    } else if (students.length > 0) {
      // Default everyone to present if no records exist
      const defaultStatuses: { [studentId: string]: AttendanceStatus } = {};
      students.forEach((s) => {
        defaultStatuses[s.id] = "present";
      });
      setStudentStatuses(defaultStatuses);
    }
  }, [selectedDate, attendance, students]);

  // Copy attendance from previous session
  const handleCopyPreviousSession = () => {
    if (!selectedDate || sessionDates.length === 0) return;
    const currentIdx = sessionDates.indexOf(selectedDate);
    if (currentIdx <= 0) {
      toastError("ไม่มีคาบเรียนก่อนหน้านี้ให้คัดลอก");
      return;
    }
    const prevDate = sessionDates[currentIdx - 1];
    const prevLogs = attendance.filter((a) => a.session_date === prevDate);
    if (prevLogs.length === 0) {
      toastError(`ยังไม่มีการบันทึกข้อมูลของคาบวันที่ ${formatThaiDate(prevDate)}`);
      return;
    }

    const copied: { [studentId: string]: AttendanceStatus } = {};
    students.forEach((s) => {
      const log = prevLogs.find((l) => l.student_id === s.id);
      copied[s.id] = log ? log.status : "present";
    });
    setStudentStatuses(copied);
    toastSuccess(`คัดลอกสถานะจากคาบก่อนหน้า (${formatThaiDate(prevDate)}) เรียบร้อย`);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: { [studentId: string]: AttendanceStatus } = {};
    students.forEach((s) => {
      updated[s.id] = "present";
    });
    setStudentStatuses(updated);
    toastSuccess("ตั้งค่าทุกคนเป็น 'มาเรียน' เรียบร้อย");
  };

  const handleSave = async () => {
    if (!selectedDate) {
      toastError("กรุณาเลือกวันที่บันทึกเช็คชื่อ");
      return;
    }

    setSaving(true);

    const records = Object.keys(studentStatuses).map((studentId) => ({
      studentId,
      date: selectedDate,
      status: studentStatuses[studentId],
    }));

    try {
      await saveAttendance(records);
      toastSuccess("บันทึกการเช็คชื่อเข้าเรียนเสร็จสิ้น!");
      
      // If we added a custom date, append to list if not present
      if (isCustomDate && !sessionDates.includes(selectedDate)) {
        setSessionDates([...sessionDates, selectedDate].sort());
        setIsCustomDate(false);
      }
    } catch (err: any) {
      toastError(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  // Convert date format for Thai display e.g. 2026-05-18 -> 18 พ.ค. 2569
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const monthIndex = parseInt(m) - 1;
    const thaiYear = parseInt(y) + 543; // Buddhist Era
    return `${parseInt(d)} ${thaiMonths[monthIndex]} ${thaiYear}`;
  };

  // Check if date has already been logged in database
  const isDateLogged = (dateStr: string) => {
    return attendance.some((a) => a.session_date === dateStr);
  };

  // Filter student lists
  const filteredStudents = students.filter((s) => {
    const status = studentStatuses[s.id] || "present";
    return filterStatus === "all" || status === filterStatus;
  });

  // Global Keyboard Shortcuts (1=Present, 2=Late, 3=Sick, 4=Absent, ArrowUp/ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      if (filteredStudents.length === 0) return;

      const currentStudent = filteredStudents[activeStudentIndex];
      if (!currentStudent) return;

      if (e.key === "1") {
        e.preventDefault();
        handleStatusChange(currentStudent.id, "present");
        setActiveStudentIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === "2") {
        e.preventDefault();
        handleStatusChange(currentStudent.id, "late");
        setActiveStudentIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === "3") {
        e.preventDefault();
        handleStatusChange(currentStudent.id, "sick");
        setActiveStudentIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === "4") {
        e.preventDefault();
        handleStatusChange(currentStudent.id, "absent");
        setActiveStudentIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === "ArrowDown" || e.key === "j" || e.key === "Enter") {
        e.preventDefault();
        setActiveStudentIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setActiveStudentIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredStudents, activeStudentIndex]);

  // Auto scroll focused student row into view
  useEffect(() => {
    const activeEl = document.getElementById(`attendance-row-${activeStudentIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }
  }, [activeStudentIndex]);

  const countAll = students.length;
  const countPresent = students.filter(s => (studentStatuses[s.id] || "present") === "present").length;
  const countLate = students.filter(s => studentStatuses[s.id] === "late").length;
  const countSick = students.filter(s => studentStatuses[s.id] === "sick").length;
  const countAbsent = students.filter(s => studentStatuses[s.id] === "absent").length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse text-slate-900 dark:text-slate-100 font-body-md">
        <div className="mb-8">
          <div className="h-8 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-xl mb-2"></div>
          <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            ))}
          </div>
          <div className="flex-1 p-2 space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <CalendarCheck className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-500 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนทำการเช็คชื่อเข้าเรียน</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 font-body-md transition-colors">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">ระบบลงเวลาเข้าเรียน (Attendance Tracker)</h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">บันทึกและติดตามเวลาเรียนของนักเรียนในชั้นเรียนของคุณ</p>
        </div>

        {/* Keyboard Shortcuts Helper Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 shadow-sm font-mono">
          <span className="font-bold text-slate-700 dark:text-slate-200">⌨️ คีย์ลัด:</span>
          <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold text-emerald-600 dark:text-emerald-400">[1] มา</span>
          <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold text-amber-600 dark:text-amber-400">[2] สาย</span>
          <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold text-sky-600 dark:text-sky-400">[3] ลา</span>
          <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold text-rose-600 dark:text-rose-400">[4] ขาด</span>
          <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold">[↑↓] เลื่อนคน</span>
        </div>
      </div>

      {/* Date Selector Control Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-auto">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Calendar className="w-4 h-4" />
            </span>
            {isCustomDate ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="date"
                  value={customDateVal}
                  onChange={(e) => {
                    setCustomDateVal(e.target.value);
                    setSelectedDate(e.target.value);
                  }}
                  className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer w-full outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDate(false);
                    if (sessionDates.length > 0) setSelectedDate(sessionDates[0]);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative w-full sm:w-auto min-w-[240px]">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer outline-none"
                >
                  {sessionDates.map((date, idx) => {
                    const logged = isDateLogged(date);
                    return (
                      <option key={date} value={date}>
                        {getWeekNumAndDayLabel(date, idx)}: {formatThaiDate(date)} {logged ? "✓" : ""}
                      </option>
                    );
                  })}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </span>
              </div>
            )}
          </div>

          {!isCustomDate && (
            <button
              onClick={() => {
                setIsCustomDate(true);
                setCustomDateVal(new Date().toISOString().split("T")[0]);
                setSelectedDate(new Date().toISOString().split("T")[0]);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มวันสอนชดเชย</span>
            </button>
          )}

          {sessionDates.indexOf(selectedDate) > 0 && (
            <button
              onClick={handleCopyPreviousSession}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="คัดลอกสถานะจากคาบก่อนหน้า"
            >
              คัดลอกจากคาบก่อน
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-xl border border-emerald-500/20 whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400">มาเรียน {countPresent}/{countAll} คน</span>
          </div>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleMarkAllPresent}
              className="flex-grow sm:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              มาทุกคน
            </button>
            <button
              onClick={handleSave}
              disabled={saving || students.length === 0}
              className="flex-grow sm:flex-none px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกผล"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid/Table Area */}
      {students.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {/* Filters Row */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterStatus === "all"
                    ? "bg-primary dark:bg-sky-500 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                ทั้งหมด ({countAll})
              </button>
              <button
                onClick={() => setFilterStatus("present")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterStatus === "present"
                    ? "bg-emerald-500 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                มาเรียน ({countPresent})
              </button>
              <button
                onClick={() => setFilterStatus("late")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterStatus === "late"
                    ? "bg-amber-500 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                สาย ({countLate})
              </button>
              <button
                onClick={() => setFilterStatus("sick")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterStatus === "sick"
                    ? "bg-sky-500 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                ลา ({countSick})
              </button>
              <button
                onClick={() => setFilterStatus("absent")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterStatus === "absent"
                    ? "bg-rose-500 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                ขาด ({countAbsent})
              </button>
            </div>
          </div>

          {/* Horizontal Scroll Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {/* Header Row */}
              <div className="grid grid-cols-[80px_1fr_320px_1fr] gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-10 text-center sm:text-left">
                <div className="text-center">เลขที่ / รหัส</div>
                <div className="pl-4">ชื่อ - นามสกุล</div>
                <div className="text-center">สถานะการเข้าเรียน</div>
                <div className="pl-4">หมายเหตุ</div>
              </div>

              {/* Student List (Scrollable) */}
              <div className="p-2 space-y-1">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, idx) => {
                    const currentStatus = studentStatuses[student.id] || "present";
                    const isActive = activeStudentIndex === idx;
                    
                    return (
                      <div
                        key={student.id}
                        id={`attendance-row-${idx}`}
                        onClick={() => setActiveStudentIndex(idx)}
                        className={`grid grid-cols-[80px_1fr_320px_1fr] gap-4 items-center p-3 rounded-xl border transition-all cursor-pointer group scroll-mt-20 ${
                          isActive
                            ? "ring-2 ring-primary/40 dark:ring-sky-400/40 border-primary/40 bg-primary/5 dark:bg-sky-400/5 shadow-sm"
                            : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        } ${
                          currentStatus === "late"
                            ? "bg-amber-500/5 dark:bg-amber-500/10"
                            : currentStatus === "absent"
                            ? "bg-rose-500/5 dark:bg-rose-500/10"
                            : currentStatus === "sick"
                            ? "bg-sky-500/5 dark:bg-sky-500/10"
                            : ""
                        }`}
                      >
                        <div className="text-center">
                          <div className={`text-sm font-bold ${isActive ? "text-primary dark:text-sky-400" : "text-slate-800 dark:text-slate-200"}`}>{idx + 1}</div>
                          <div className="text-xs font-mono text-slate-400">{student.student_code}</div>
                        </div>

                        <div className="flex items-center gap-3 pl-4">
                          <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-primary/10 dark:bg-sky-400/10 flex items-center justify-center text-sm text-primary dark:text-sky-400 font-bold overflow-hidden shrink-0">
                            {student.first_name ? student.first_name.charAt(0) : ""}
                          </div>
                          <span className={`text-xs md:text-sm font-semibold truncate ${isActive ? "text-primary dark:text-sky-400 font-bold" : "text-slate-800 dark:text-slate-200"}`}>
                            {`${student.prefix || ""}${student.first_name} ${student.last_name}`}
                          </span>
                        </div>

                        <div className="w-[320px]">
                          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-1 bg-slate-100 dark:bg-slate-800 h-10">
                            {/* Present */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(student.id, "present");
                                setActiveStudentIndex(idx);
                              }}
                              className={`flex-grow flex items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                                currentStatus === "present"
                                  ? "bg-emerald-500 text-white font-bold shadow-sm"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                              }`}
                            >
                              มาเรียน (1)
                            </button>
                            {/* Late */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(student.id, "late");
                                setActiveStudentIndex(idx);
                              }}
                              className={`flex-grow flex items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                                currentStatus === "late"
                                  ? "bg-amber-500 text-white font-bold shadow-sm"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                              }`}
                            >
                              สาย (2)
                            </button>
                            {/* Leave */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(student.id, "sick");
                                setActiveStudentIndex(idx);
                              }}
                              className={`flex-grow flex items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                                currentStatus === "sick"
                                  ? "bg-sky-500 text-white font-bold shadow-sm"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                              }`}
                            >
                              ลา (3)
                            </button>
                            {/* Absent */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(student.id, "absent");
                                setActiveStudentIndex(idx);
                              }}
                              className={`flex-grow flex items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                                currentStatus === "absent"
                                  ? "bg-rose-500 text-white font-bold shadow-sm"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                              }`}
                            >
                              ขาด (4)
                            </button>
                          </div>
                        </div>

                        <div className="pl-4 pr-2">
                          <input
                            type="text"
                            placeholder="เพิ่มหมายเหตุ..."
                            value={student.notes || ""}
                            readOnly
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:border-primary focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 font-medium text-xs md:text-sm">
                    ไม่พบข้อมูลนักเรียนสำหรับตัวกรองนี้
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <CalendarCheck className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">ยังไม่มีรายชื่อนักเรียนในชั้นเรียนนี้</h4>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm">
            กรุณาเพิ่มนักเรียนในเมนู "รายชื่อนักเรียน (Roster)" หรือนำเข้าผ่านเทมเพลต Excel ก่อนดำเนินการเช็คชื่อเข้าเรียน
          </p>
        </div>
      )}
    </div>
  );
}
