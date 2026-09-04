"use client";

import { useState, useEffect, useMemo } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { useToast } from "@/context/ToastContext";
import { calculateFinalGrade, generateSmartStudentReport } from "@/utils/mathUtils";
import { Student } from "@/utils/db";
import {
  Sparkles,
  Printer,
  LineChart as LineChartIcon,
  Search,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Award,
  Save
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export default function AnalyticsPage() {
  const {
    currentClassroom,
    students,
    assignments,
    attendance,
    scores,
    reports,
    saveAIReport
  } = useClassroom();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true on mount to avoid hydration mismatches for charts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Set default student
  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0]);
    } else if (students.length === 0) {
      setSelectedStudent(null);
    }
  }, [students, selectedStudent]);

  // Calculate current student statistics
  const getStudentMetrics = (student: Student) => {
    if (!currentClassroom) return null;
    const studentAssignments = assignments.map((a) => {
      const scoreRec = scores.find((sc) => sc.student_id === student.id && sc.assignment_id === a.id);
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

    const stdAttendance = attendance.filter((a) => a.student_id === student.id);

    return {
      ...student,
      ...calculateFinalGrade(
        currentClassroom.grade_weights,
        currentClassroom.grade_weight_modes || {},
        studentAssignments,
        stdAttendance,
        currentClassroom.grade_thresholds,
        {
          ...currentClassroom.behavior_config,
          totalWeeks: currentClassroom.total_weeks,
          weeklySchedule: currentClassroom.weekly_schedule,
        }
      ),
    };
  };

  const selectedMetrics = selectedStudent ? getStudentMetrics(selectedStudent) : null;

  // Calculate classroom averages for benchmarking
  const classAvgAttendance = currentClassroom && students.length > 0
    ? Math.round(students.reduce((sum, s) => {
        const m = getStudentMetrics(s);
        return sum + (m ? m.attendanceRate : 0);
      }, 0) / students.length)
    : 100;

  const classAvgPercentage = currentClassroom && students.length > 0
    ? Math.round(students.reduce((sum, s) => {
        const m = getStudentMetrics(s);
        return sum + (m ? m.finalPercentage : 0);
      }, 0) / students.length)
    : 0;

  const totalLateScoresCount = scores.filter((sc) => sc.is_late).length;
  const classAvgLate = students.length > 0
    ? parseFloat((totalLateScoresCount / students.length).toFixed(1))
    : 0;

  // Instant Smart Rule-Based Diagnostics (Zero Latency)
  const smartReport = useMemo(() => {
    if (!currentClassroom || !selectedStudent || !selectedMetrics) return null;
    const lateCount = scores.filter((sc) => sc.student_id === selectedStudent.id && sc.is_late).length;
    const missingCount = assignments.filter((a) => {
      const sc = scores.find((s) => s.student_id === selectedStudent.id && s.assignment_id === a.id);
      return !sc || sc.score === null;
    }).length;

    return generateSmartStudentReport({
      studentCode: selectedMetrics.student_code,
      studentName: `${selectedMetrics.prefix || ""}${selectedMetrics.first_name} ${selectedMetrics.last_name}`,
      attendanceRate: selectedMetrics.attendanceRate,
      totalAbsences: selectedMetrics.totalAbsences,
      finalPercentage: selectedMetrics.finalPercentage,
      grade: selectedMetrics.grade,
      risk: selectedMetrics.risk,
      componentScores: selectedMetrics.componentScores,
      lateCount,
      missingCount,
      notes: selectedMetrics.notes || "",
      classroomName: currentClassroom.name,
    });
  }, [selectedStudent, selectedMetrics, scores, assignments, currentClassroom]);

  const handleSaveToReportStore = async () => {
    if (!selectedStudent || !smartReport) return;
    setSavingNotes(true);
    try {
      await saveAIReport(
        selectedStudent.id,
        smartReport.summary,
        smartReport.strengths,
        smartReport.weaknesses,
        JSON.stringify(smartReport.recommendations)
      );
      toastSuccess("บันทึกบทวิเคราะห์ลงในรายงานทางการสำเร็จ!");
    } catch (err: any) {
      toastError(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingNotes(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter students based on search query
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.student_code.includes(q) ||
      `${s.prefix || ""}${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
  });

  // Calculate radar chart data (individual student vs class average for components)
  const getRadarData = () => {
    if (!currentClassroom || !selectedStudent || !selectedMetrics) return [];

    const activeComps = Object.keys(currentClassroom.grade_weights).filter(
      (k) => currentClassroom.grade_weights[k] > 0
    );

    // Calculate class averages for each component
    const averages: { [key: string]: number } = {};
    activeComps.forEach((comp) => {
      let sum = 0;
      let count = 0;
      students.forEach((s) => {
        const studentAssignments = assignments.map((a) => {
          const scoreRec = scores.find((sc) => sc.student_id === s.id && sc.assignment_id === a.id);
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
        const stdAttendance = attendance.filter((att) => att.student_id === s.id);
        const res = calculateFinalGrade(
          currentClassroom.grade_weights,
          currentClassroom.grade_weight_modes || {},
          studentAssignments,
          stdAttendance,
          currentClassroom.grade_thresholds,
          {
            ...currentClassroom.behavior_config,
            totalWeeks: currentClassroom.total_weeks,
            weeklySchedule: currentClassroom.weekly_schedule,
          }
        );
        if (res.componentScores[comp] !== undefined) {
          sum += res.componentScores[comp];
          count++;
        }
      });
      averages[comp] = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    });

    const isLockedCategory = (name: string) => {
      const lower = name.toLowerCase().trim();
      return (
        lower === "attendance" ||
        name.trim() === "เวลาเรียน" ||
        name.trim() === "จิตพิสัย" ||
        name.trim() === "จิตพิสัย/เข้าเรียน" ||
        name.trim() === "การเข้าเรียน" ||
        name.trim() === "เช็คชื่อเข้าเรียน" ||
        name.trim() === "การเช็คชื่อ"
      );
    };

    const getComponentThaiName = (comp: string) => {
      if (isLockedCategory(comp)) return "จิตพิสัย";
      switch (comp) {
        case "homework":
          return "การบ้าน";
        case "midterm":
          return "กลางภาค";
        case "final":
          return "ปลายภาค";
        default:
          return comp;
      }
    };

    return activeComps.map((comp) => {
      const label = getComponentThaiName(comp);

      return {
        subject: label,
        student: Math.round(selectedMetrics.componentScores[comp] || 0),
        classAvg: Math.round(averages[comp] || 0),
      };
    });
  };

  // Calculate trend line chart data (student cumulative score over assignments)
  const getTrendData = () => {
    if (!selectedStudent || assignments.length === 0) return [];

    // Use assignments in their natural database order
    const sortedAssignments = assignments;

    return sortedAssignments.map((ass, index) => {
      const subsetAsss = sortedAssignments.slice(0, index + 1);

      // Student cumulative percentage
      const getStudentCumulative = (sId: string) => {
        let obtainedSum = 0;
        let maxSum = 0;
        subsetAsss.forEach((a) => {
          const scoreRec = scores.find((sc) => sc.student_id === sId && sc.assignment_id === a.id);
          const scoreVal = scoreRec ? scoreRec.score : null;
          if (scoreVal !== null) {
            obtainedSum += scoreVal;
            maxSum += a.max_score;
          }
        });
        return maxSum > 0 ? Math.round((obtainedSum / maxSum) * 100) : 0;
      };

      // Class average cumulative percentage
      let classSum = 0;
      let classCount = 0;
      students.forEach((s) => {
        classSum += getStudentCumulative(s.id);
        classCount++;
      });

      return {
        name: `งาน #${index + 1}`,
        student: getStudentCumulative(selectedStudent.id),
        classAvg: classCount > 0 ? Math.round(classSum / classCount) : 0,
      };
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1">
          <p className="font-bold">{label}</p>
          {payload.map((item: any, idx: number) => (
            <p key={idx} style={{ color: item.color }}>
              {item.name}: {item.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <LineChartIcon className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-500 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนการเปิดใช้งานระบบวิเคราะห์รายบุคคล</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in print-container text-slate-900 dark:text-slate-100">
      {/* Title */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 dark:bg-sky-400/10 text-primary dark:text-sky-400">
              <TrendingUp className="w-7 h-7" />
            </div>
            <span>วิเคราะห์ผลสัมฤทธิ์และวินิจฉัยรายบุคคล (Smart Analytics)</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            ประมวลผลสถิติคะแนน สถิติการส่งงานล่าช้า และสถิติการเข้าเรียนเชิงลึกแบบอัตโนมัติ เพื่อช่วยวางแผนพัฒนาผู้เรียน
          </p>
        </div>
      </div>

      {/* Grid structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Student Roster Select Pane */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col no-print">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex-shrink-0">
            <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5">รายชื่อนักเรียน</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-primary transition-all text-slate-800 dark:text-slate-100"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[520px]">
            {filteredStudents.map((s) => {
              const metrics = getStudentMetrics(s);
              const active = selectedStudent?.id === s.id;
              
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between border transition-all cursor-pointer ${
                    active
                      ? "border-primary/40 bg-primary/10 dark:bg-sky-400/15 text-primary dark:text-sky-400 font-bold shadow-sm"
                      : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-sky-400/10 text-primary dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {s.first_name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className={`text-xs md:text-sm truncate ${active ? "text-primary dark:text-sky-400 font-bold" : "text-slate-800 dark:text-slate-200"}`}>
                        {`${s.prefix || ""}${s.first_name} ${s.last_name}`}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">รหัส: {s.student_code}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] uppercase font-bold text-slate-400">เกรด</p>
                    <p className={`text-sm font-bold ${
                      metrics?.risk === "red"
                        ? "text-rose-500"
                        : metrics?.risk === "yellow"
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}>
                      {metrics?.grade || "-"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Analysis Panel */}
        <div className="lg:col-span-2">
          {selectedStudent && selectedMetrics && smartReport ? (
            <div className="space-y-6">
              
              {/* PRINT ONLY HEADER */}
              <div className="hidden print:block text-center mb-8">
                <h1 className="text-2xl font-bold">รายงานผลสัมฤทธิ์ทางการเรียนและพฤติกรรมรายบุคคล</h1>
                <p className="text-sm text-gray-600 mt-2">
                  วิชา {currentClassroom.name} • วันที่พิมพ์ {new Date().toLocaleDateString("th-TH")}
                </p>
              </div>

              {/* Student Overview Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 dark:from-sky-400/5 to-transparent rounded-bl-full pointer-events-none"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-sky-400/10 text-primary dark:text-sky-400 flex items-center justify-center font-bold text-xl shrink-0">
                    {selectedStudent.first_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {`${selectedStudent.prefix || ""}${selectedStudent.first_name} ${selectedStudent.last_name}`}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ml-2 ${
                        selectedMetrics.risk === "red"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : selectedMetrics.risk === "yellow"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {selectedMetrics.risk === "red" ? "วิกฤต (แดง)" : selectedMetrics.risk === "yellow" ? "ต้องเฝ้าระวัง" : "ปกติ (เขียว)"}
                      </span>
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      รหัสนักเรียน: <span className="font-mono text-primary dark:text-sky-400 font-bold">{selectedStudent.student_code}</span>
                      {selectedStudent.notes && ` • หมายเหตุ: ${selectedStudent.notes}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 no-print shrink-0 relative z-10">
                  <button
                    onClick={handlePrint}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-700 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="พิมพ์รายงาน"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSaveToReportStore}
                    disabled={savingNotes}
                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingNotes ? "กำลังบันทึก..." : "บันทึกลงในรายงาน"}</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid Indicators with Classroom Benchmarks */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">อัตราการเข้าเรียน</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedMetrics.attendanceRate}%</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">เฉลี่ยห้อง: {classAvgAttendance}%</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">คะแนนสะสมรวม</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedMetrics.finalPercentage}%</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">เฉลี่ยห้อง: {classAvgPercentage}%</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">เกรดคาดการณ์</span>
                  <span className={`text-xl font-bold ${
                    selectedMetrics.risk === "red"
                      ? "text-rose-600 dark:text-rose-400"
                      : selectedMetrics.risk === "yellow"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}>{selectedMetrics.grade}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">เกณฑ์ประเมินรายวิชา</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">สถานะส่งงาน</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {scores.filter((sc) => sc.student_id === selectedStudent.id && sc.is_late).length} ชิ้นล่าช้า
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">เฉลี่ยห้อง: {classAvgLate} ชิ้น/คน</span>
                </div>
              </div>

              {/* Instant Rule-Based Diagnostics Display */}
              <div className="grid grid-cols-12 gap-6">
                {/* Diagnostics Detail Panel (Span 8) */}
                <div className="col-span-12 md:col-span-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 border-l-4 border-l-primary dark:border-l-sky-400 p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <TrendingUp className="w-5 h-5 text-primary dark:text-sky-400" />
                    <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
                      บทวิเคราะห์ผลสัมฤทธิ์และวินิจฉัยพฤติกรรม (Smart Diagnostics)
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      <p>{smartReport.summary}</p>
                    </div>

                    {/* Strengths & Areas for Support */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                        <h5 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>จุดเด่นและศักยภาพ</span>
                        </h5>
                        <p className="leading-relaxed">{smartReport.strengths}</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                        <h5 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>ประเด็นที่ต้องสนับสนุน</span>
                        </h5>
                        <p className="leading-relaxed">{smartReport.weaknesses}</p>
                      </div>
                    </div>
                    
                    {/* Actionable Recommendations */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-xs md:text-sm font-bold text-primary dark:text-sky-400 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>แนวทางการส่งเสริมและพัฒนาการเรียนรู้ (Actionable Recommendations)</span>
                      </h4>
                      <ul className="space-y-2">
                        {smartReport.recommendations.map((line, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-slate-700 dark:text-slate-200">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Skills Radar Chart (Span 4) */}
                <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between min-h-[300px] shadow-sm">
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">สัดส่วนประเมินผล (%)</h3>
                  <div className="flex-1 w-full h-[220px]">
                    {isClient && getRadarData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                          <PolarGrid stroke="#64748b" strokeOpacity={0.2} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: "#94a3b8" }} />
                          <Radar
                            name="นักเรียน"
                            dataKey="student"
                            stroke="#0EA5E9"
                            fill="#0EA5E9"
                            fillOpacity={0.3}
                          />
                          <Radar
                            name="ค่าเฉลี่ยห้อง"
                            dataKey="classAvg"
                            stroke="#94a3b8"
                            fill="#94a3b8"
                            fillOpacity={0.15}
                          />
                          <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        ไม่มีข้อมูลแสดงผลชาร์ต
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Chart Area (Score Trend) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100">แนวโน้มระดับผลสัมฤทธิ์ (Cumulative Score Trend)</h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                    เรียงตามลำดับเวลาชิ้นงาน
                  </span>
                </div>
                <div className="w-full h-64">
                  {isClient && assignments.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={getTrendData()} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.15} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#64748b" strokeOpacity={0.3} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#64748b" strokeOpacity={0.3} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          name="นักเรียน"
                          type="monotone"
                          dataKey="student"
                          stroke="#0EA5E9"
                          activeDot={{ r: 6 }}
                          strokeWidth={2.5}
                        />
                        <Line
                          name="ค่าเฉลี่ยห้องเรียน"
                          type="monotone"
                          dataKey="classAvg"
                          stroke="#94a3b8"
                          strokeDasharray="5 5"
                          dot={false}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      ยังไม่มีงานมอบหมายสะสมเพื่อคำนวณแนวโน้ม
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <Sparkles className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">กรุณาเลือกนักเรียน</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                คลิกเลือกนักเรียนในเมนูด้านซ้ายเพื่อเริ่มต้นดูรายงานพฤติกรรมและวิเคราะห์ผลสัมฤทธิ์
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
