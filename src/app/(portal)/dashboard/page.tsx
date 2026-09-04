"use client";

import { useState, useEffect } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { calculateFinalGrade, calculateAttendancePercentage } from "@/utils/mathUtils";
import {
  Users,
  Calendar,
  GraduationCap,
  AlertTriangle,
  Search,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Sparkles,
  BellRing,
  CheckCircle,
  Activity,
  ChevronDown,
  Clock
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

const getGradeBarColor = (rawGrade: string, isSelected: boolean) => {
  if (isSelected) return "#8b5cf6"; // Selected/Active: Vivid Purple
  switch (rawGrade) {
    case "0":
      return "#ef4444"; // Grade 0: Red 500 (วิกฤต)
    case "1":
    case "1.5":
      return "#f59e0b"; // Grade 1/1.5: Amber 500 (เฝ้าระวัง)
    case "2":
    case "2.5":
      return "#0ea5e9"; // Grade 2/2.5: Sky 500
    case "3":
    case "3.5":
      return "#3b82f6"; // Grade 3/3.5: Blue 500
    case "4":
      return "#10b981"; // Grade 4: Emerald 500
    default:
      return "#0284c7";
  }
};

export default function Dashboard() {
  const { currentClassroom, students, assignments, attendance, scores, loading } = useClassroom();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Move calculations before early returns safely

  const maxAbs = currentClassroom?.behavior_config?.maxAbsencesAllowed ?? 4;

  // Calculate stats for all students in this class
  const studentsWithGrades = currentClassroom
    ? students.map((std) => {
        // Map assignments list for calculation
        const stdAssignments = assignments.map((a) => {
          const scoreRec = scores.find((sc) => sc.student_id === std.id && sc.assignment_id === a.id);
          return {
            assignmentId: a.id,
            score: scoreRec ? scoreRec.score : null,
            maxScore: a.max_score,
            assignmentType: a.assignment_type as "score" | "check",
            isLate: scoreRec ? scoreRec.is_late : false,
            gradeComponent: a.grade_component,
            manualWeight: a.assignment_weight,
          };
        });

        const stdAttendance = attendance.filter((a) => a.student_id === std.id);

        const gradeInfo = calculateFinalGrade(
          currentClassroom.grade_weights,
          currentClassroom.grade_weight_modes || {},
          stdAssignments,
          stdAttendance,
          currentClassroom.grade_thresholds,
          {
            ...currentClassroom.behavior_config,
            totalWeeks: currentClassroom.total_weeks,
            weeklySchedule: currentClassroom.weekly_schedule,
          }
        );

        const lpa = currentClassroom.behavior_config?.latesPerAbsence ?? 3;
        const realAbsences = stdAttendance.filter((a) => a.status === "absent").length;
        const realLates = stdAttendance.filter((a) => a.status === "late").length;
        const absencesCount = realAbsences + Math.floor(realLates / lpa);

        return {
          ...std,
          ...gradeInfo,
          rawAssignments: stdAssignments,
          absences: absencesCount,
        };
      })
    : [];

  const totalStudents = students.length;
  
  // Class averages
  const avgAttendance =
    totalStudents > 0
      ? parseFloat(
          (studentsWithGrades.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStudents).toFixed(1)
        )
      : 100;

  // Calculate week-on-week attendance rate trend compared to the previous week
  const lpa = currentClassroom?.behavior_config?.latesPerAbsence ?? 3;
  
  let attendanceTrend = 0;
  let hasTrend = false;
  
  if (currentClassroom && attendance.length > 0) {
    const getWeekNumber = (dateStr: string) => {
      const date = new Date(dateStr);
      const start = new Date(currentClassroom.semester_start_date || new Date());
      const startSunday = new Date(start);
      startSunday.setDate(start.getDate() - start.getDay());
      startSunday.setHours(0, 0, 0, 0);
      
      const dateSunday = new Date(date);
      dateSunday.setDate(date.getDate() - date.getDay());
      dateSunday.setHours(0, 0, 0, 0);
      
      const diffMs = dateSunday.getTime() - startSunday.getTime();
      return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    };

    const attendanceByWeek: { [weekNum: number]: typeof attendance } = {};
    attendance.forEach((rec) => {
      const weekNum = getWeekNumber(rec.session_date);
      if (!attendanceByWeek[weekNum]) {
        attendanceByWeek[weekNum] = [];
      }
      attendanceByWeek[weekNum].push(rec);
    });

    const loggedWeeks = Object.keys(attendanceByWeek)
      .map(Number)
      .sort((a, b) => a - b);

    if (loggedWeeks.length >= 2) {
      const latestWeek = loggedWeeks[loggedWeeks.length - 1];
      const previousWeek = loggedWeeks[loggedWeeks.length - 2];

      const latestRecords = attendanceByWeek[latestWeek];
      const previousRecords = attendanceByWeek[previousWeek];

      const latestRate = calculateAttendancePercentage(latestRecords, lpa);
      const previousRate = calculateAttendancePercentage(previousRecords, lpa);

      attendanceTrend = parseFloat((latestRate - previousRate).toFixed(1));
      hasTrend = true;
    }
  }

  const avgFinalScore =
    totalStudents > 0
      ? parseFloat(
          (studentsWithGrades.reduce((sum, s) => sum + s.finalPercentage, 0) / totalStudents).toFixed(1)
        )
      : 0;

  // Calculate On-Time Submission Rate for all students in this class
  const studentIdsForOnTime = students.map((s) => s.id);
  const classScores = scores.filter((sc) => studentIdsForOnTime.includes(sc.student_id));
  const lateSubmissions = classScores.filter((sc) => sc.is_late).length;
  const onTimeSubmissionRate = classScores.length > 0
    ? Math.round(((classScores.length - lateSubmissions) / classScores.length) * 100)
    : 100;

  // Risk groupings
  const redRiskCount = studentsWithGrades.filter((s) => s.risk === "red").length;
  const yellowRiskCount = studentsWithGrades.filter((s) => s.risk === "yellow").length;
  const greenRiskCount = studentsWithGrades.filter((s) => s.risk === "green").length;

  // Action Center: Unscored assignments
  const unscoredAssignments = assignments.map((a) => {
    const missingCount = students.filter((s) => {
      const sc = scores.find((x) => x.student_id === s.id && x.assignment_id === a.id);
      return !sc || sc.score === null;
    }).length;
    return {
      id: a.id,
      name: a.name,
      grade_component: a.grade_component,
      missingCount,
      total: students.length,
    };
  }).filter((a) => a.missingCount > 0);

  // Action Center: Critical absences
  const criticalAbsenceStudents = studentsWithGrades.filter(
    (s) => s.absences >= maxAbs - 1 && s.absences > 0
  );

  // Grade distributions count (ordered from 0 to 4)
  const GRADE_ORDER = ["0", "1", "1.5", "2", "2.5", "3", "3.5", "4"];
  const gradeDistribution: { [key: string]: number } = {
    "0": 0,
    "1": 0,
    "1.5": 0,
    "2": 0,
    "2.5": 0,
    "3": 0,
    "3.5": 0,
    "4": 0,
  };

  studentsWithGrades.forEach((s) => {
    if (gradeDistribution[s.grade] !== undefined) {
      gradeDistribution[s.grade] += 1;
    }
  });

  // Recharts Formats - sorted in ascending order from Grade 0 to 4
  const gradeChartData = GRADE_ORDER.map((g) => ({
    grade: `เกรด ${g}`,
    rawGrade: g,
    จำนวนนักเรียน: gradeDistribution[g] || 0,
  }));

  const riskPieData = [
    { name: "ดีเยี่ยม (Green)", rawRisk: "green", value: greenRiskCount, color: "#10b981" },
    { name: "กลุ่มเสี่ยง (Yellow)", rawRisk: "yellow", value: yellowRiskCount, color: "#f59e0b" },
    { name: "กลุ่มวิกฤต (Red)", rawRisk: "red", value: redRiskCount, color: "#f43f5e" },
  ].filter((d) => d.value > 0);

  // Filters search/risk/grade list with interactive drilldown support
  const filteredStudents = studentsWithGrades.filter((s) => {
    const matchesSearch =
      `${s.prefix || ""}${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_code.includes(searchQuery);

    let matchesRisk = true;
    if (riskFilter === "risk_all") {
      matchesRisk = s.risk === "red" || s.risk === "yellow";
    } else if (riskFilter === "attendance_low") {
      matchesRisk = s.attendanceRate < 80;
    } else if (riskFilter === "missing_hw") {
      matchesRisk = s.rawAssignments.some((a) => a.score === null || a.isLate);
    } else if (riskFilter === "score_low") {
      matchesRisk = s.finalPercentage < 60;
    } else if (riskFilter !== "all") {
      matchesRisk = s.risk === riskFilter;
    }

    const matchesGrade = gradeFilter === "all" || s.grade === gradeFilter;
    return matchesSearch && matchesRisk && matchesGrade;
  });

  // Generate classroom AI health assessment locally
  const healthInfo = totalStudents > 0 && currentClassroom
    ? (() => {
        let status = "ปกติ (ดีเยี่ยม)";
        if (redRiskCount > 0) {
          status = "ต้องการความช่วยเหลือเร่งด่วน (วิกฤต)";
        } else if (yellowRiskCount > 0 || avgAttendance < 85) {
          status = "เฝ้าระวัง (ระดับปานกลาง)";
        }

        return {
          status,
          text: `จากการประมวลผลระบบสถิติห้องเรียน ${currentClassroom.name} ปัจจุบันมีผลการประเมินวิเคราะห์อยู่ในสภาวะ "${status}" อัตราการเข้าชั้นเรียนของห้องสะสมเฉลี่ยอยู่ที่ ${avgAttendance}% คะแนนสัมฤทธิ์ของวิชาเฉลี่ยสะสมที่ ${avgFinalScore}%. พบนักเรียนวิกฤตผลสอบตก ${redRiskCount} คน และต้องการการใส่ใจใกล้ชิด (สีเหลือง) อีก ${yellowRiskCount} คน ครูควรเพิ่มการกระตุ้นและส่งเสริมติดตามงานอย่างต่อเนื่อง`
        };
      })()
    : { status: "รอรับข้อมูล", text: "ยังไม่มีประวัตินักเรียน หรือไม่มีประวัติคะแนนเพื่อนำมาวิเคราะห์แนวโน้มผลสัมฤทธิ์" };

  // Generate dynamic classroom alerts
  const alerts: { id: string; studentName: string; code: string; type: "critical" | "warning"; message: string }[] = [];
  if (totalStudents > 0) {
    studentsWithGrades.forEach((s) => {
      const fullName = `${s.prefix || ""}${s.first_name} ${s.last_name}`;
      
      // 1. Attendance alerts based on absence counts
      if (s.absences > maxAbs) {
        alerts.push({
          id: `att-crit-${s.id}`,
          studentName: fullName,
          code: s.student_code,
          type: "critical",
          message: `ขาดเรียนเกินเกณฑ์ที่กำหนด (ขาด ${s.absences}/${maxAbs} รอบ)`
        });
      } else if (s.absences === maxAbs) {
        alerts.push({
          id: `att-warn-${s.id}`,
          studentName: fullName,
          code: s.student_code,
          type: "warning",
          message: `ขาดเรียนถึงเกณฑ์จำกัดสูงสุด (ขาด ${s.absences}/${maxAbs} รอบ)`
        });
      }

      // 2. Academic alerts based on actual grades
      if (s.finalPercentage < 50) {
        alerts.push({
          id: `grade-red-${s.id}`,
          studentName: fullName,
          code: s.student_code,
          type: "critical",
          message: `ความเสี่ยงผลการเรียนระดับวิกฤต (คะแนน ${s.finalPercentage}%)`
        });
      } else if (s.finalPercentage < 60) {
        alerts.push({
          id: `grade-yel-${s.id}`,
          studentName: fullName,
          code: s.student_code,
          type: "warning",
          message: `ผลการเรียนต่ำเกณฑ์เฝ้าระวัง (คะแนน ${s.finalPercentage}%)`
        });
      }

      // 3. Behavioral alerts
      if (s.behaviorScore < 85) {
        alerts.push({
          id: `beh-${s.id}`,
          studentName: fullName,
          code: s.student_code,
          type: "warning",
          message: `จิตพิสัยต่ำกว่าเป้าหมาย (${s.behaviorScore} คะแนน)`
        });
      }
    });
  }

  const resetFilters = () => {
    setRiskFilter("all");
    setGradeFilter("all");
    setSearchQuery("");
  };

  const scrollToRoster = () => {
    const el = document.getElementById("student-roster-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 text-slate-900 dark:text-slate-100 font-body-md">
        <div className="mb-2 animate-pulse">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl mb-2"></div>
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border-l-4 border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-2 animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 animate-pulse bg-white dark:bg-slate-900 h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <GraduationCap className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">ยังไม่มีห้องเรียนที่เลือก</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-md">
          กรุณาสร้างห้องเรียนใหม่หรือเลือกห้องเรียนบนแถบนำทางด้านบนเพื่อแสดงแผงควบคุมสถิติเชิงลึก
        </p>
        <Link
          href="/classes"
          className="mt-6 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all active:scale-95 shadow-md shadow-primary/20"
        >
          จัดการห้องเรียน
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-slate-900 dark:text-slate-100 font-body-md transition-colors">
      {/* Welcome & classroom name banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{currentClassroom.name}</h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            ตารางสอน: {currentClassroom.weekly_schedule} | ภาคเรียนที่ 1/2567
          </p>
        </div>
      </div>

      {/* AI Assistant Classroom Insights Widget */}
      <div className="bg-white dark:bg-slate-900/90 border-l-4 border-primary dark:border-sky-400 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 dark:from-sky-400/5 to-transparent pointer-events-none"></div>
        <div className="flex items-start gap-4 z-10">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-sky-400/10 flex items-center justify-center text-primary dark:text-sky-400 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ระบบประเมินห้องเรียนอัจฉริยะ (AI Assistant)</h3>
              {totalStudents > 0 ? (
                redRiskCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    สถานะ: วิกฤต
                  </span>
                ) : yellowRiskCount > 0 || avgAttendance < 85 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    สถานะ: เฝ้าระวัง
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    สถานะ: ปกติ
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  สถานะ: รอรับข้อมูล
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {healthInfo.text}
            </p>
          </div>
        </div>
        <Link href="/ai-insights" className="z-10 shrink-0 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap">
          ดูรายงานฉบับเต็ม
        </Link>
      </div>

      {/* TEACHER ACTION CENTER (งานค้างและแจ้งเตือนด่วน) */}
      {(unscoredAssignments.length > 0 || criticalAbsenceStudents.length > 0) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>ศูนย์เตือนสิ่งที่ต้องทำด่วน (Teacher Action Center)</span>
            </h3>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              ต้องจัดการ {unscoredAssignments.length + (criticalAbsenceStudents.length > 0 ? 1 : 0)} รายการ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unscoredAssignments.length > 0 && (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-start justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span>📝 งานที่ยังกรอกคะแนนไม่ครบ ({unscoredAssignments.length} ชิ้น)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {unscoredAssignments.slice(0, 2).map((a) => `"${a.name}" (ค้าง ${a.missingCount} คน)`).join(", ")}
                    {unscoredAssignments.length > 2 && ` และอีก ${unscoredAssignments.length - 2} ชิ้น`}
                  </p>
                </div>
                <Link
                  href="/gradebook"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition-all shadow-xs"
                >
                  ไปกรอกคะแนน →
                </Link>
              </div>
            )}

            {criticalAbsenceStudents.length > 0 && (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 flex items-start justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>⚠️ ขาดเรียนใกล้เกินเกณฑ์ ({criticalAbsenceStudents.length} คน)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {criticalAbsenceStudents.slice(0, 3).map((s) => `${s.first_name} (ขาด ${s.absences}/${maxAbs})`).join(", ")}
                    {criticalAbsenceStudents.length > 3 && ` และอีก ${criticalAbsenceStudents.length - 3} คน`}
                  </p>
                </div>
                <Link
                  href="/attendance"
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shrink-0 transition-all shadow-xs"
                >
                  ดูเวลาเรียน →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards Grid (Interactive Drilldowns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Students */}
        <div 
          onClick={() => { resetFilters(); scrollToRoster(); }} 
          className="rounded-2xl p-5 cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary dark:hover:border-sky-400 transition-all active:scale-[0.99] group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">จำนวนนักเรียนทั้งหมด</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{totalStudents} <span className="text-xs font-normal text-slate-400">คน</span></h4>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>คลิกดูทั้งหมด / รีเซ็ต</span>
          </div>
        </div>

        {/* Card 2: Avg Attendance */}
        <div 
          onClick={() => {
            setRiskFilter(riskFilter === "attendance_low" ? "all" : "attendance_low");
            scrollToRoster();
          }}
          className={`rounded-2xl p-5 bg-white dark:bg-slate-900 border shadow-sm hover:border-emerald-500 transition-all cursor-pointer active:scale-[0.99] ${
            riskFilter === "attendance_low" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            {hasTrend ? (
              attendanceTrend > 0 ? (
                <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +{attendanceTrend}%
                </span>
              ) : attendanceTrend < 0 ? (
                <span className="flex items-center text-rose-600 dark:text-rose-400 text-xs font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  {attendanceTrend}%
                </span>
              ) : (
                <span className="flex items-center text-slate-500 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                  0.0%
                </span>
              )
            ) : (
              <span className="text-slate-400 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                สัปดาห์แรก
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">อัตราเข้าเรียนเฉลี่ย</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{avgAttendance}%</h4>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${avgAttendance}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 3: On-Time Submission Rate */}
        <div 
          onClick={() => {
            setRiskFilter(riskFilter === "missing_hw" ? "all" : "missing_hw");
            scrollToRoster();
          }}
          className={`rounded-2xl p-5 bg-white dark:bg-slate-900 border shadow-sm hover:border-amber-500 transition-all cursor-pointer active:scale-[0.99] ${
            riskFilter === "missing_hw" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="flex items-center text-amber-600 dark:text-amber-400 text-[10px] font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">
              ตรงเวลา
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">ส่งงานตรงเวลาเฉลี่ย</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{onTimeSubmissionRate}%</h4>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${onTimeSubmissionRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 4: Avg Final Score */}
        <div 
          onClick={() => {
            setRiskFilter(riskFilter === "score_low" ? "all" : "score_low");
            scrollToRoster();
          }}
          className={`rounded-2xl p-5 bg-white dark:bg-slate-900 border shadow-sm hover:border-sky-500 transition-all cursor-pointer active:scale-[0.99] ${
            riskFilter === "score_low" ? "border-sky-500 ring-2 ring-sky-500/20" : "border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="flex items-center text-sky-600 dark:text-sky-400 text-[10px] font-bold bg-sky-500/10 px-2 py-0.5 rounded-md">
              <Activity className="w-3 h-3 mr-1" />
              ถ่วงน้ำหนัก
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">คะแนนเก็บเฉลี่ยห้อง</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{avgFinalScore}%</h4>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${avgFinalScore}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 5: Risks */}
        <div 
          onClick={() => {
            setRiskFilter(riskFilter === "risk_all" ? "all" : "risk_all");
            scrollToRoster();
          }}
          className={`rounded-2xl p-5 border-l-4 border-l-rose-500 bg-white dark:bg-slate-900 border shadow-sm hover:border-rose-500 transition-all cursor-pointer active:scale-[0.99] ${
            riskFilter === "risk_all" ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">กลุ่มเฝ้าระวัง/เสี่ยง</p>
            <h4 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{redRiskCount + yellowRiskCount} <span className="text-xs font-normal text-slate-400">คน</span></h4>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setRiskFilter(riskFilter === "red" ? "all" : "red"); scrollToRoster(); }} 
              className={`px-2 py-1 text-[10px] rounded-lg font-bold transition-all cursor-pointer ${
                riskFilter === "red" 
                  ? "bg-rose-500 text-white shadow-sm" 
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
              }`}
            >
              วิกฤต {redRiskCount}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setRiskFilter(riskFilter === "yellow" ? "all" : "yellow"); scrollToRoster(); }} 
              className={`px-2 py-1 text-[10px] rounded-lg font-bold transition-all cursor-pointer ${
                riskFilter === "yellow" 
                  ? "bg-amber-500 text-white shadow-sm" 
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              เฝ้าระวัง {yellowRiskCount}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Graphs & Interactive Widgets Section */}
      {mounted && totalStudents > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Grade distribution graph */}
          <div className="lg:col-span-2 rounded-2xl p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">การกระจายเกรดสะสมปัจจุบัน</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">คลิกที่แท่งกราฟเพื่อกรองรายชื่อนักเรียนตามเกรด</p>
              </div>
              {gradeFilter !== "all" && (
                <button
                  onClick={() => setGradeFilter("all")}
                  className="text-xs text-primary dark:text-sky-400 font-bold bg-primary/10 dark:bg-sky-400/10 px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-all cursor-pointer"
                >
                  ล้างเกรด ({gradeFilter}) ✕
                </button>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={gradeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.15} vertical={false} />
                  <XAxis dataKey="grade" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                    }}
                    itemStyle={{ color: "#f8fafc" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                    cursor={{ fill: "rgba(14, 165, 233, 0.08)" }}
                  />
                  <Bar
                    dataKey="จำนวนนักเรียน"
                    radius={[6, 6, 0, 0]}
                    fill="#0ea5e9"
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data?.rawGrade) {
                        setGradeFilter(gradeFilter === data.rawGrade ? "all" : data.rawGrade);
                      }
                    }}
                  >
                    {gradeChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getGradeBarColor(entry.rawGrade, gradeFilter === entry.rawGrade)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Pie Chart */}
          <div className="rounded-2xl p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">การประเมินอัตราเสี่ยงของห้อง</h3>
              {riskFilter !== "all" && (
                <button
                  onClick={() => setRiskFilter("all")}
                  className="text-xs text-primary dark:text-sky-400 font-bold bg-primary/10 dark:bg-sky-400/10 px-2 py-0.5 rounded-lg hover:bg-primary/20 transition-all cursor-pointer"
                >
                  ล้าง ({riskFilter}) ✕
                </button>
              )}
            </div>
            
            <div className="h-40 flex items-center justify-center relative">
              {riskPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={riskPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      cursor="pointer"
                      onClick={(entry: any) => {
                        if (entry?.rawRisk) {
                          setRiskFilter(riskFilter === entry.rawRisk ? "all" : entry.rawRisk);
                        }
                      }}
                    >
                      {riskPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#f8fafc",
                        fontSize: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                      }}
                      itemStyle={{ color: "#f8fafc" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-sm">ไม่มีข้อมูลประมวลผล</div>
              )}
              {/* Inner details */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalStudents}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">คน</span>
              </div>
            </div>

            {/* Legends with Clickable Filter */}
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setRiskFilter(riskFilter === "green" ? "all" : "green")}
                className={`w-full flex items-center justify-between text-xs p-2 rounded-xl transition-all cursor-pointer ${
                  riskFilter === "green" ? "bg-emerald-500/15 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 dark:text-slate-300">ปกติ (Green)</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{greenRiskCount} คน</span>
              </button>

              <button
                onClick={() => setRiskFilter(riskFilter === "yellow" ? "all" : "yellow")}
                className={`w-full flex items-center justify-between text-xs p-2 rounded-xl transition-all cursor-pointer ${
                  riskFilter === "yellow" ? "bg-amber-500/15 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-700 dark:text-slate-300">กลุ่มเสี่ยง (Yellow)</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{yellowRiskCount} คน</span>
              </button>

              <button
                onClick={() => setRiskFilter(riskFilter === "red" ? "all" : "red")}
                className={`w-full flex items-center justify-between text-xs p-2 rounded-xl transition-all cursor-pointer ${
                  riskFilter === "red" ? "bg-rose-500/15 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-700 dark:text-slate-300">กลุ่มวิกฤต (Red)</span>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400">{redRiskCount} คน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Alerts List Widget (Shows up only if alerts exist) */}
      {alerts.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-500 animate-bounce" />
            <span>รายการเตือนสติและพฤติกรรม (Classroom Alerts)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold">
              ตรวจพบ {alerts.length} รายการ
            </span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[260px] overflow-y-auto pr-1">
            {alerts.map((alert, idx) => (
              <div
                key={`${alert.id}-${idx}`}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all hover:shadow-md cursor-pointer ${
                  alert.type === "critical"
                    ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20"
                    : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {alert.type === "critical" ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Activity className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div>
                  <h5 className={`text-xs font-bold ${alert.type === "critical" ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"}`}>
                    {alert.studentName} <span className="font-mono text-slate-400 text-[10px]">({alert.code})</span>
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success state if no alerts are triggered */}
      {totalStudents > 0 && alerts.length === 0 && (
        <div className="glass-panel rounded-2xl p-4 md:p-5 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 flex items-center gap-3 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
            ยอดเยี่ยม! สภาพการเรียนและเข้าชั้นเรียนของนักเรียนทุกคนปกติเป็นระเบียบเรียบร้อย ไม่พบรายงานพฤติกรรมผิดปกติ
          </p>
        </div>
      )}

      {/* Roster list with details */}
      <div id="student-roster-section" className="glass-panel rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 scroll-mt-6">
        <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">รายชื่อนักเรียน ({filteredStudents.length} คน)</h3>
            {(riskFilter !== "all" || gradeFilter !== "all" || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs text-slate-400">ตัวกรองใช้งาน:</span>
                {riskFilter !== "all" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-sky-400 text-xs font-semibold flex items-center gap-1">
                    {riskFilter === "risk_all"
                      ? "⚠️ กลุ่มเสี่ยงและวิกฤต (Red/Yellow)"
                      : riskFilter === "attendance_low"
                      ? "📅 ขาด/เข้าเรียน < 80%"
                      : riskFilter === "missing_hw"
                      ? "📝 ค้างส่งงาน/ส่งช้า"
                      : riskFilter === "score_low"
                      ? "🎯 คะแนนเฉลี่ย < 60%"
                      : `สถานะ: ${riskFilter}`}
                    <button onClick={() => setRiskFilter("all")} className="hover:text-rose-500 ml-1">✕</button>
                  </span>
                )}
                {gradeFilter !== "all" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-sky-400 text-xs font-semibold flex items-center gap-1">
                    เกรด: {gradeFilter}
                    <button onClick={() => setGradeFilter("all")} className="hover:text-rose-500 ml-1">✕</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1">
                    ค้นหา: "{searchQuery}"
                    <button onClick={() => setSearchQuery("")} className="hover:text-rose-500 ml-1">✕</button>
                  </span>
                )}
                <button
                  onClick={resetFilters}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold ml-1 cursor-pointer transition-colors"
                >
                  ล้างทั้งหมด ✕
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="ค้นหารายชื่อหรือรหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>

            {/* Risk filter select */}
            <div className="relative">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-4 pr-10 text-xs md:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="all">ความเสี่ยงทั้งหมด</option>
                <option value="green">ปกติ (ดีเยี่ยม)</option>
                <option value="yellow">เฝ้าระวัง</option>
                <option value="red">วิกฤต</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="p-4 whitespace-nowrap">รหัสนักเรียน</th>
                  <th className="p-4">ชื่อ - นามสกุล</th>
                  <th className="p-4 text-center">อัตราเข้าเรียน</th>
                  <th className="p-4 text-center">คะแนนรวม (%)</th>
                  <th className="p-4 text-center">เกรดคาดการณ์</th>
                  <th className="p-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-200 divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((std) => (
                  <tr
                    key={std.id}
                    className={`hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group ${
                      std.risk === "red"
                        ? "bg-rose-500/5 dark:bg-rose-950/15"
                        : std.risk === "yellow"
                        ? "bg-amber-500/5 dark:bg-amber-950/15"
                        : ""
                    }`}
                  >
                    <td className="p-4 font-mono font-bold text-primary dark:text-sky-400">{std.student_code}</td>
                    <td className={`p-4 font-semibold ${std.risk === "red" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                      {`${std.prefix || ""}${std.first_name} ${std.last_name}`}
                    </td>
                    <td className={`p-4 text-center font-mono ${
                      std.absences > maxAbs
                        ? "text-rose-600 dark:text-rose-400 font-bold"
                        : std.absences === maxAbs
                        ? "text-amber-600 dark:text-amber-400 font-bold"
                        : ""
                    }`}>
                      {std.attendanceRate}%
                      <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                        (ขาด {std.absences} รอบ)
                      </span>
                    </td>
                    <td className={`p-4 text-center font-semibold ${
                      std.finalPercentage < 50
                        ? "text-rose-600 dark:text-rose-400 font-bold"
                        : std.finalPercentage < 60
                        ? "text-amber-600 dark:text-amber-400 font-bold"
                        : ""
                    }`}>{std.finalPercentage}%</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                        std.grade === "0" 
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}>
                        เกรด {std.grade}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          std.risk === "red"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : std.risk === "yellow"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {std.risk === "red" ? "วิกฤต" : std.risk === "yellow" ? "เฝ้าระวัง" : "ปกติ"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-medium text-xs md:text-sm">
            ไม่พบข้อมูลนักเรียนที่ตรงกับการค้นหาหรือเงื่อนไขตัวกรอง
          </div>
        )}
      </div>
    </div>
  );
}
