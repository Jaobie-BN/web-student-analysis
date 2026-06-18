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

// Import recharts dynamically or guard with mounting check to avoid hydration issues
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function Dashboard() {
  const { currentClassroom, students, assignments, attendance, scores } = useClassroom();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <GraduationCap className="w-16 h-16 text-slate-600 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-300">ยังไม่มีห้องเรียนที่เลือก</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-md">
          กรุณาสร้างห้องเรียนใหม่หรือเลือกห้องเรียนบนแถบนำทางด้านบนเพื่อแสดงแผงควบคุมสถิติเชิงลึก
        </p>
        <Link
          href="/classes"
          className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold text-sm transition-all active:scale-95 shadow-md shadow-primary-500/10"
        >
          จัดการห้องเรียน
        </Link>
      </div>
    );
  }

  const maxAbs = currentClassroom.behavior_config?.maxAbsencesAllowed ?? 4;

  // Calculate stats for all students in this class
  const studentsWithGrades = students.map((std) => {
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
      absences: absencesCount,
    };
  });

  const totalStudents = students.length;
  
  // Class averages
  const avgAttendance =
    totalStudents > 0
      ? parseFloat(
          (studentsWithGrades.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStudents).toFixed(1)
        )
      : 100;

  // Calculate week-on-week attendance rate trend compared to the previous week
  const lpa = currentClassroom.behavior_config?.latesPerAbsence ?? 3;
  
  let attendanceTrend = 0;
  let hasTrend = false;
  
  if (attendance.length > 0) {
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

  // Grade distributions count
  const gradeDistribution: { [key: string]: number } = {
    "4": 0,
    "3.5": 0,
    "3": 0,
    "2.5": 0,
    "2": 0,
    "1.5": 0,
    "1": 0,
    "0": 0,
  };

  studentsWithGrades.forEach((s) => {
    gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
  });

  // Recharts Formats
  const gradeChartData = Object.keys(gradeDistribution).map((g) => ({
    grade: `เกรด ${g}`,
    จำนวนนักเรียน: gradeDistribution[g],
  })).reverse(); // order from grade 0 to 4

  const riskPieData = [
    { name: "ดีเยี่ยม (Green)", value: greenRiskCount, color: "#10b981" },
    { name: "กลุ่มเสี่ยง (Yellow)", value: yellowRiskCount, color: "#f59e0b" },
    { name: "กลุ่มวิกฤต (Red)", value: redRiskCount, color: "#f43f5e" },
  ].filter((d) => d.value > 0);

  // Filters search/risk list
  const filteredStudents = studentsWithGrades.filter((s) => {
    const matchesSearch =
      `${s.prefix || ""}${s.first_name} ${s.last_name}`.includes(searchQuery) ||
      s.student_code.includes(searchQuery);
    const matchesRisk = riskFilter === "all" || s.risk === riskFilter;
    return matchesSearch && matchesRisk;
  });

  // Generate classroom AI health assessment locally
  const healthInfo = totalStudents > 0
    ? (() => {
        let status = "ปกติ (ดีเยี่ยม)";
        let color = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
        if (redRiskCount > 0) {
          status = "ต้องการความช่วยเหลือเร่งด่วน (วิกฤต)";
          color = "text-rose-400 border-rose-500/20 bg-rose-500/5";
        } else if (yellowRiskCount > 0 || avgAttendance < 85) {
          status = "เฝ้าระวัง (ระดับปานกลาง)";
          color = "text-amber-400 border-amber-500/20 bg-amber-500/5";
        }

        return {
          status,
          color,
          text: `จากการประมวลผลระบบสถิติห้องเรียน ${currentClassroom.name} ปัจจุบันมีผลการประเมินวิเคราะห์อยู่ในสภาวะ "${status}" อัตราการเข้าชั้นเรียนของห้องสะสมเฉลี่ยอยู่ที่ ${avgAttendance}% คะแนนสัมฤทธิ์ของวิชาเฉลี่ยสะสมที่ ${avgFinalScore}%. พบนักเรียนวิกฤตผลสอบตก ${redRiskCount} คน และต้องการการใส่ใจใกล้ชิด (สีเหลือง) อีก ${yellowRiskCount} คน ครูควรเพิ่มการกระตุ้นและส่งเสริมติดตามงานอย่างต่อเนื่อง`
        };
      })()
    : { status: "รอรับข้อมูล", color: "text-slate-400 border-slate-800 bg-slate-900/10", text: "ยังไม่มีประวัตินักเรียน หรือไม่มีประวัติคะแนนเพื่อนำมาวิเคราะห์แนวโน้มผลสัมฤทธิ์" };

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

  return (
    <div className="flex flex-col gap-stack-gap-lg text-slate-900 font-body-md">
      {/* Welcome & classroom name banner */}
      <div className="mb-stack-gap-lg">
        <h2 className="text-headline-lg font-headline-lg text-slate-900 mb-1">{currentClassroom.name}</h2>
        <p className="text-body-md font-body-md text-outline">
          ตารางสอน: {currentClassroom.weekly_schedule} | ภาคเรียนที่ 1/2567
        </p>
      </div>

      {/* AI Assistant Classroom Insights Widget */}
      <div className="bg-surface border-l-4 border-primary rounded-xl p-card-padding shadow-level-1 mb-stack-gap-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-container/5 to-transparent pointer-events-none"></div>
        <div className="flex items-start gap-4 z-10">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary flex-shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-headline-sm font-headline-sm text-slate-900">ระบบประเมินห้องเรียนอัจฉริยะ (AI Assistant)</h3>
              {totalStudents > 0 ? (
                redRiskCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-critical-rose/10 text-critical-rose text-label-sm font-label-sm border border-critical-rose/20 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    สถานะ: วิกฤต
                  </span>
                ) : yellowRiskCount > 0 || avgAttendance < 85 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-warning-amber/10 text-warning-amber text-label-sm font-label-sm border border-warning-amber/20 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    สถานะ: เฝ้าระวัง
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-success-emerald/10 text-success-emerald text-label-sm font-label-sm border border-success-emerald/20 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    สถานะ: ปกติ
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-label-sm font-label-sm border border-slate-200 flex items-center gap-1">
                  สถานะ: รอรับข้อมูล
                </span>
              )}
            </div>
            <p className="text-body-sm font-body-sm text-slate-600 max-w-3xl">
              {healthInfo.text}
            </p>
          </div>
        </div>
        <Link href="/ai-insights" className="z-10 shrink-0 bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 rounded-lg text-label-md font-label-md transition-colors shadow-sm cursor-pointer whitespace-nowrap">
          ดูรายงานฉบับเต็ม
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-gutter mb-stack-gap-lg">
        {/* Card 1: Total Students */}
        <div 
          onClick={() => setRiskFilter("all")} 
          className="glass-panel glass-panel-hover rounded-xl p-card-padding cursor-pointer relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-label-md font-label-md text-outline mb-1">จำนวนนักเรียนทั้งหมด</p>
            <h4 className="text-headline-lg font-headline-lg text-slate-900">{totalStudents} คน</h4>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/50 flex items-center gap-2 text-success-emerald">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="text-label-sm font-label-sm text-slate-500">ทั้งหมด (คลิกเพื่อรีเซ็ตตัวกรอง)</span>
          </div>
        </div>

        {/* Card 2: Avg Attendance */}
        <div className="glass-panel glass-panel-hover rounded-xl p-card-padding">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-success-emerald/10 flex items-center justify-center text-success-emerald">
              <Calendar className="w-5 h-5" />
            </div>
            {hasTrend ? (
              attendanceTrend > 0 ? (
                <span className="flex items-center text-success-emerald text-label-sm font-label-sm font-bold bg-success-emerald/10 px-2 py-1 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +{attendanceTrend}%
                </span>
              ) : attendanceTrend < 0 ? (
                <span className="flex items-center text-critical-rose text-label-sm font-label-sm font-bold bg-critical-rose/10 px-2 py-1 rounded-md">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  {attendanceTrend}%
                </span>
              ) : (
                <span className="flex items-center text-slate-500 text-label-sm font-label-sm font-bold bg-slate-100 px-2 py-1 rounded-md">
                  0.0%
                </span>
              )
            ) : (
              <span className="text-slate-400 text-[10px] font-medium bg-slate-100 px-2 py-0.5 rounded-md" title="ต้องบันทึกเช็คชื่ออย่างน้อย 2 สัปดาห์เพื่อเปรียบเทียบ">
                ไม่มีข้อมูลสัปดาห์ก่อนหน้า
              </span>
            )}
          </div>
          <div>
            <p className="text-label-md font-label-md text-outline mb-1">อัตราเข้าเรียนเฉลี่ย</p>
            <h4 className="text-headline-lg font-headline-lg text-slate-900">{avgAttendance}%</h4>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/50">
            <div className="w-full bg-slate-100/50 h-1.5 rounded-full overflow-hidden">
              <div className="bg-success-emerald h-full rounded-full" style={{ width: `${avgAttendance}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 3: On-Time Submission Rate */}
        <div className="glass-panel glass-panel-hover rounded-xl p-card-padding">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-warning-amber/10 flex items-center justify-center text-warning-amber">
              <Clock className="w-5 h-5" />
            </div>
            <span className="flex items-center text-warning-amber text-[10px] font-bold bg-warning-amber/10 px-2 py-1 rounded-md">
              ตรงเวลา
            </span>
          </div>
          <div>
            <p className="text-label-md font-label-md text-outline mb-1">ส่งงานตรงเวลาเฉลี่ย</p>
            <h4 className="text-headline-lg font-headline-lg text-slate-900">{onTimeSubmissionRate}%</h4>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/50">
            <div className="w-full bg-slate-100/50 h-1.5 rounded-full overflow-hidden">
              <div className="bg-warning-amber h-full rounded-full" style={{ width: `${onTimeSubmissionRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 4: Avg Final Score */}
        <div className="glass-panel glass-panel-hover rounded-xl p-card-padding">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-sky-blue/10 flex items-center justify-center text-sky-blue">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="flex items-center text-sky-blue text-label-sm font-label-sm bg-sky-blue/10 px-2 py-1 rounded-md font-semibold">
              <Activity className="w-3.5 h-3.5 mr-1" />
              ถ่วงน้ำหนัก
            </span>
          </div>
          <div>
            <p className="text-label-md font-label-md text-outline mb-1">คะแนนเก็บเฉลี่ยห้อง</p>
            <h4 className="text-headline-lg font-headline-lg text-slate-900">{avgFinalScore}%</h4>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/50">
            <div className="w-full bg-slate-100/50 h-1.5 rounded-full overflow-hidden">
              <div className="bg-sky-blue h-full rounded-full" style={{ width: `${avgFinalScore}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 5: Risks */}
        <div className="glass-panel glass-panel-hover rounded-xl p-card-padding border-l-4 border-l-critical-rose">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-critical-rose/10 flex items-center justify-center text-critical-rose">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-label-md font-label-md text-outline mb-1">กลุ่มเฝ้าระวัง/เสี่ยง</p>
            <h4 className="text-headline-lg font-headline-lg text-critical-rose">{redRiskCount + yellowRiskCount} คน</h4>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/50 flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setRiskFilter("red"); }} 
              className={`px-2 py-1 text-[10px] rounded-md font-bold transition-all cursor-pointer ${
                riskFilter === "red" 
                  ? "bg-critical-rose text-white shadow-sm" 
                  : "bg-critical-rose/10 text-critical-rose hover:bg-critical-rose/20"
              }`}
            >
              วิกฤต {redRiskCount}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setRiskFilter("yellow"); }} 
              className={`px-2 py-1 text-[10px] rounded-md font-bold transition-all cursor-pointer ${
                riskFilter === "yellow" 
                  ? "bg-warning-amber text-white shadow-sm" 
                  : "bg-warning-amber/10 text-warning-amber hover:bg-warning-amber/20"
              }`}
            >
              เฝ้าระวัง {yellowRiskCount}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Graphs & Alerts Widgets Section */}
      {mounted && totalStudents > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-stack-gap-lg">
          {/* Grade distribution graph */}
          <div className="lg:col-span-2 glass-panel glass-panel-hover rounded-xl p-card-padding">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100/50">
              <h3 className="text-headline-sm font-headline-sm text-slate-900">การกระจายผลสัมฤทธิ์ (กลางภาค)</h3>
              <Link href="/gradebook" className="text-sky-blue text-label-sm font-label-sm hover:underline">ดูรายละเอียด</Link>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={gradeChartData}>
                  <XAxis dataKey="grade" stroke="#727782" fontSize={11} tickLine={false} />
                  <YAxis stroke="#727782" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "8px",
                      color: "#191c1e",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                    }}
                  />
                  <Bar dataKey="จำนวนนักเรียน" fill="#004D99" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Pie Chart */}
          <div className="glass-panel glass-panel-hover rounded-xl p-card-padding flex flex-col justify-between">
            <h3 className="text-headline-sm font-headline-sm text-slate-900 mb-6 pb-4 border-b border-slate-100/50">การประเมินอัตราเสี่ยงของห้อง</h3>
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
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riskPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "8px",
                        color: "#191c1e",
                        fontSize: "12px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-sm">ไม่มีข้อมูลประมวลผล</div>
              )}
              {/* Inner details */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-headline-md font-headline-md font-bold text-slate-900">{totalStudents}</span>
                <span className="text-label-sm font-label-sm text-outline">คน</span>
              </div>
            </div>

            {/* Legends */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-body-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success-emerald" />
                  <span>ปกติ (Green)</span>
                </div>
                <span className="font-bold">{greenRiskCount} คน</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-warning-amber" />
                  <span>กลุ่มเสี่ยง (Yellow)</span>
                </div>
                <span className="font-bold">{yellowRiskCount} คน</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-critical-rose" />
                  <span>กลุ่มวิกฤต (Red)</span>
                </div>
                <span className="font-bold text-critical-rose">{redRiskCount} คน</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Alerts List Widget (Shows up only if alerts exist) */}
      {alerts.length > 0 && (
        <div className="glass-panel rounded-xl p-card-padding mb-stack-gap-lg">
          <h4 className="text-headline-sm font-headline-sm text-slate-900 mb-4 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-500 animate-bounce" />
            <span>รายการเตือนสติและพฤติกรรม (Classroom Alerts)</span>
            <span className="px-2.5 py-0.5 rounded bg-critical-rose/10 border border-critical-rose/25 text-critical-rose text-[10px] font-bold">
              ตรวจพบ {alerts.length} รายการ
            </span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[250px] overflow-y-auto pr-1">
            {alerts.map((alert, idx) => (
              <div
                key={`${alert.id}-${idx}`}
                className={`p-3.5 rounded-lg border flex items-start gap-3 transition-all hover:shadow-level-1 cursor-pointer ${
                  alert.type === "critical"
                    ? "border-critical-rose/30 bg-critical-rose/5 hover:bg-critical-rose/10"
                    : "border-warning-amber/30 bg-warning-amber/5 hover:bg-warning-amber/10"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {alert.type === "critical" ? (
                    <AlertTriangle className="w-4 h-4 text-critical-rose" />
                  ) : (
                    <Activity className="w-4 h-4 text-warning-amber" />
                  )}
                </div>
                <div>
                  <h5 className={`text-xs font-bold ${alert.type === "critical" ? "text-critical-rose" : "text-slate-800"}`}>
                    {alert.studentName} <span className="font-mono text-outline">({alert.code})</span>
                  </h5>
                  <p className="text-[10px] text-slate-600 mt-1">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success state if no alerts are triggered */}
      {totalStudents > 0 && alerts.length === 0 && (
        <div className="glass-panel rounded-xl p-5 border-success-emerald/20 bg-success-emerald/5 flex items-center gap-3 mb-stack-gap-lg shadow-sm">
          <CheckCircle className="w-5 h-5 text-success-emerald" />
          <p className="text-xs text-slate-750 font-semibold leading-relaxed py-0.5">
            ยอดเยี่ยม! สภาพการเรียนและเข้าชั้นเรียนของนักเรียนทุกคนปกติเป็นระเบียบเรียบร้อย ไม่พบรายงานพฤติกรรมผิดปรกติ
          </p>
        </div>
      )}

      {/* Roster list with details */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-card-padding border-b border-slate-100/50 flex flex-wrap items-center justify-between gap-4 bg-slate-50/20">
          <h3 className="text-headline-sm font-headline-sm text-slate-900">รายชื่อนักเรียน</h3>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="ค้นหารายชื่อ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-slate-200 rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-outline" />
            </div>

            {/* Risk filter select */}
            <div className="relative">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="appearance-none bg-surface border border-slate-200 rounded-lg py-2 pl-4 pr-10 text-label-md font-label-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="all">ความเสี่ยงทั้งหมด</option>
                <option value="green">ปกติ (ดีเยี่ยม)</option>
                <option value="yellow">เฝ้าระวัง</option>
                <option value="red">วิกฤต</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
            </div>
          </div>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-label-md font-label-md text-outline border-b border-slate-200">
                  <th className="p-4 font-semibold whitespace-nowrap">รหัสนักเรียน</th>
                  <th className="p-4 font-semibold">ชื่อ - นามสกุล</th>
                  <th className="p-4 font-semibold text-center">อัตราเข้าเรียน</th>
                  <th className="p-4 font-semibold text-center">คะแนนรวม (%)</th>
                  <th className="p-4 font-semibold text-center">เกรดคาดการณ์</th>
                  <th className="p-4 font-semibold text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-body-sm font-body-sm text-slate-800 divide-y divide-slate-100">
                {filteredStudents.map((std) => (
                  <tr
                    key={std.id}
                    className={`hover:bg-sky-blue/5 transition-colors group cursor-pointer ${
                      std.risk === "red"
                        ? "bg-critical-rose/5"
                        : std.risk === "yellow"
                        ? "bg-warning-amber/5"
                        : ""
                    }`}
                  >
                    <td className="p-4 font-code text-slate-500">{std.student_code}</td>
                    <td className={`p-4 font-semibold ${std.risk === "red" ? "text-critical-rose" : "text-slate-900"}`}>
                      {`${std.prefix || ""}${std.first_name} ${std.last_name}`}
                    </td>
                    <td className={`p-4 text-center font-mono ${
                      std.absences > maxAbs
                        ? "text-critical-rose font-bold"
                        : std.absences === maxAbs
                        ? "text-warning-amber font-bold"
                        : ""
                    }`}>
                      {std.attendanceRate}%
                      <span className="text-[10px] text-outline font-normal block mt-0.5">
                        (ขาด {std.absences} รอบ)
                      </span>
                    </td>
                    <td className={`p-4 text-center font-semibold ${
                      std.finalPercentage < 50
                        ? "text-critical-rose font-bold"
                        : std.finalPercentage < 60
                        ? "text-warning-amber font-bold"
                        : ""
                    }`}>{std.finalPercentage}%</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded font-bold ${
                        std.grade === "0" 
                          ? "bg-critical-rose/10 text-critical-rose" 
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {std.grade}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-label-sm font-bold ${
                          std.risk === "red"
                            ? "bg-critical-rose/20 text-on-error-container"
                            : std.risk === "yellow"
                            ? "bg-warning-amber/20 text-tertiary-container"
                            : "bg-success-emerald/10 text-success-emerald"
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
          <div className="text-center py-12 text-slate-400 font-medium font-body-sm">
            ไม่พบข้อมูลนักเรียนที่ตรงกับการค้นหาหรือเงื่อนไขตัวกรอง
          </div>
        )}
      </div>
    </div>
  );
}
