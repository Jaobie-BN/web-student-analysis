"use client";

import { useState, useEffect } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { calculateFinalGrade } from "@/utils/mathUtils";
import { Student } from "@/utils/db";
import {
  Sparkles,
  User,
  GraduationCap,
  Calendar,
  AlertTriangle,
  FileText,
  Printer,
  BrainCircuit,
  Search,
  CheckCircle,
  Clock,
  Mail
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

const parseRecommendations = (recommendationsStr: string): string[] => {
  if (!recommendationsStr) return [];
  try {
    const parsed = JSON.parse(recommendationsStr);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (e) {
    // Fall back to plain text parsing
  }

  return recommendationsStr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(\d+\.\s*|[-\s*•]+)/, "").trim());
};

export default function AIInsightsPage() {
  const {
    currentClassroom,
    students,
    assignments,
    attendance,
    scores,
    reports,
    saveAIReport
  } = useClassroom();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);
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

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Sparkles className="w-16 h-16 text-slate-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-700">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-500 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนการเปิดใช้งานระบบประเมินผลอัจฉริยะ AI</p>
      </div>
    );
  }

  // Find saved report for selected student
  const savedReport = selectedStudent
    ? reports.find((r) => r.student_id === selectedStudent.id)
    : null;

  // Calculate current student statistics
  const getStudentMetrics = (student: Student) => {
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
        }
      ),
    };
  };

  const selectedMetrics = selectedStudent ? getStudentMetrics(selectedStudent) : null;

  const handleGenerate = async () => {
    if (!selectedStudent || !selectedMetrics) return;

    setGenerating(true);
    setNotification(null);

    try {
      const res = await fetch("/api/ai-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentCode: selectedMetrics.student_code,
          studentName: `${selectedMetrics.prefix || ""}${selectedMetrics.first_name} ${selectedMetrics.last_name}`,
          attendanceRate: selectedMetrics.attendanceRate,
          behaviorScore: selectedMetrics.behaviorScore,
          finalPercentage: selectedMetrics.finalPercentage,
          grade: selectedMetrics.grade,
          risk: selectedMetrics.risk,
          componentScores: selectedMetrics.componentScores,
          notes: selectedMetrics.notes || "",
        }),
      });

      if (!res.ok) {
        throw new Error("ระบบ API ขัดข้องกรุณาลองใหม่อีกครั้ง");
      }

      const reportJson = await res.json();
      if (reportJson.error) {
        throw new Error(reportJson.error);
      }

      // Save report in state context
      await saveAIReport(
        selectedStudent.id,
        reportJson.summary,
        reportJson.strengths,
        reportJson.weaknesses,
        reportJson.recommendations
      );

      setNotification({
        type: "success",
        msg: reportJson.isMock
          ? "วิเคราะห์ข้อมูลนักเรียนเรียบร้อยแล้ว (การจำลองเนื่องจากไม่มี Gemini API Key)"
          : "วิเคราะห์พฤติกรรมและผลสัมฤทธิ์ด้วยปัญญาประดิษฐ์เสร็จสมบูรณ์!",
      });
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการประมวลผล AI" });
    } finally {
      setGenerating(false);
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
    if (!selectedStudent || !selectedMetrics) return [];

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

  return (
    <div className="space-y-8 animate-fade-in print-container">
      {/* Title */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            <span>รายงานและระบบวิเคราะห์รายบุคคล (Student Performance &amp; AI Diagnostics)</span>
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1.5">
            ประมวลผลสถิติคะแนน สถิติการส่งงานล่าช้า และสถิติการเข้าเรียนด้วยปัญญาประดิษฐ์เพื่อช่วยแนะนำแนวทางส่งเสริมการเรียนรู้
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border no-print ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          <CheckCircle className="w-5 h-5 shrink-0 text-success-emerald" />
          <span className="text-sm font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* Grid structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Student Roster Select Pane */}
        <div className="glass-panel rounded-2xl border border-slate-200 shadow-level-1 overflow-hidden flex flex-col bg-surface-container-lowest no-print">
          <div className="p-4 border-b border-slate-200 bg-surface-bright flex-shrink-0">
            <h3 className="text-label-md font-label-md font-bold text-on-surface mb-3">รายชื่อนักเรียน</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-slate-200 rounded-lg text-label-sm font-label-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-on-surface-variant" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[500px]">
            {filteredStudents.map((s) => {
              const metrics = getStudentMetrics(s);
              const active = selectedStudent?.id === s.id;
              
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between border transition-all cursor-pointer ${
                    active
                      ? "border-primary/30 bg-primary/5 shadow-level-2 text-primary font-bold"
                      : "border-transparent hover:border-slate-200 hover:bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {s.first_name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className={`text-label-md font-label-md truncate ${active ? "text-primary font-bold" : "text-slate-800"}`}>
                        {`${s.prefix || ""}${s.first_name} ${s.last_name}`}
                      </p>
                      <p className="text-label-sm font-label-sm text-outline">รหัส: {s.student_code}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] uppercase font-bold text-outline">เกรด</p>
                    <p className={`text-body-md font-body-md font-bold ${
                      metrics.risk === "red"
                        ? "text-critical-rose"
                        : metrics.risk === "yellow"
                        ? "text-warning-amber"
                        : "text-success-emerald"
                    }`}>
                      {metrics.grade}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Analysis Panel */}
        <div className="lg:col-span-2">
          {selectedStudent && selectedMetrics ? (
            <div className="space-y-6">
              
              {/* PRINT ONLY HEADER */}
              <div className="hidden print:block text-center mb-8">
                <h1 className="text-2xl font-bold">รายงานผลสัมฤทธิ์ทางการเรียนและพฤติกรรมรายบุคคล</h1>
                <p className="text-sm text-gray-600 mt-2">
                  วิชา {currentClassroom.name} • วันที่พิมพ์ {new Date().toLocaleDateString("th-TH")}
                </p>
              </div>

              {/* Student Overview Card */}
              <div className="bg-surface-container-lowest rounded-2xl border border-slate-200 shadow-level-1 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0">
                    {selectedStudent.first_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-headline-md font-headline-md font-bold text-on-surface flex items-center gap-2">
                      {`${selectedStudent.prefix || ""}${selectedStudent.first_name} ${selectedStudent.last_name}`}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${
                        selectedMetrics.risk === "red"
                          ? "bg-critical-rose/10 text-critical-rose"
                          : selectedMetrics.risk === "yellow"
                          ? "bg-warning-amber/10 text-warning-amber"
                          : "bg-success-emerald/10 text-success-emerald"
                      }`}>
                        {selectedMetrics.risk === "red" ? "วิกฤต (แดง)" : selectedMetrics.risk === "yellow" ? "ต้องเฝ้าระวัง" : "ปกติ (เขียว)"}
                      </span>
                    </h2>
                    <p className="text-label-md font-label-md text-on-surface-variant mt-0.5">
                      รหัสนักเรียน: <span className="font-mono text-primary font-bold">{selectedStudent.student_code}</span>
                      {selectedStudent.notes && ` • หมายเหตุ: ${selectedStudent.notes}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 no-print shrink-0 relative z-10">
                  <button
                    onClick={handlePrint}
                    className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 transition-all active:scale-95 cursor-pointer"
                    title="พิมพ์รายงาน"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <BrainCircuit className="w-4 h-4" />
                    <span>{generating ? "กำลังวิเคราะห์..." : savedReport ? "อัปเดตรายงาน AI" : "สร้างรายงานด้วย AI"}</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-bright rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-label-sm font-label-sm text-on-surface-variant mb-1">อัตราการเข้าเรียน</span>
                  <span className="text-headline-sm font-headline-sm font-bold text-on-surface">{selectedMetrics.attendanceRate}%</span>
                </div>

                <div className="bg-surface-bright rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-label-sm font-label-sm text-on-surface-variant mb-1">คะแนนความประพฤติ</span>
                  <span className="text-headline-sm font-headline-sm font-bold text-on-surface">{selectedMetrics.behaviorScore}/100</span>
                </div>

                <div className="bg-surface-bright rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-label-sm font-label-sm text-on-surface-variant mb-1">เกรดเฉลี่ยปัจจุบัน</span>
                  <span className={`text-headline-sm font-headline-sm font-bold ${
                    selectedMetrics.risk === "red"
                      ? "text-critical-rose"
                      : selectedMetrics.risk === "yellow"
                      ? "text-warning-amber"
                      : "text-success-emerald"
                  }`}>{selectedMetrics.grade}</span>
                </div>

                <div className="bg-surface-bright rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-label-sm font-label-sm text-on-surface-variant mb-1">สถานะส่งงาน</span>
                  <span className="text-headline-sm font-headline-sm font-bold text-on-surface">
                    {scores.filter((sc) => sc.student_id === selectedStudent.id && sc.is_late).length} ชิ้นล่าช้า
                  </span>
                </div>
              </div>

              {/* AI REPORT RESULT DISPLAY */}
              {generating ? (
                <div className="bg-surface-container-lowest rounded-2xl shadow-level-1 p-16 text-center flex flex-col items-center justify-center border border-slate-200">
                  <div className="relative w-16 h-16 flex items-center justify-center mb-4">
                    <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <BrainCircuit className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <h4 className="text-base font-bold text-primary animate-pulse">ปัญญาประดิษฐ์กำลังประมวลผลข้อมูลสะสม...</h4>
                  <p className="text-slate-500 text-xs mt-2 max-w-sm">
                    AI กำลังคำนวณจิตพิสัย อัตราส่งงานช้า อัตราเข้าชั้นเรียนของ {selectedStudent.first_name} เพื่อประมวลผลคำแนะนำส่งเสริมพัฒนาการศึกษา
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-6">
                  {/* AI Diagnostics Panel (Span 8) */}
                  <div className="col-span-12 md:col-span-8 bg-surface-container-lowest rounded-2xl shadow-level-1 relative overflow-hidden border-l-4 border-l-primary border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <BrainCircuit className="w-5 h-5 text-primary" />
                      <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">AI วิเคราะห์พฤติกรรมและผลการเรียน</h3>
                    </div>

                    {savedReport ? (
                      <div className="space-y-4">
                        <div className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
                          <p>{savedReport.performance_summary}</p>
                        </div>
                        
                        <div className="bg-surface-bright rounded-xl p-4 border border-slate-200/60">
                          <h4 className="text-label-md font-label-md font-bold text-primary mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            <span>แนวทางการสอนปรับปรุงสำหรับครูผู้สอน</span>
                          </h4>
                          <ul className="space-y-2">
                            {parseRecommendations(savedReport.recommendations).map((line, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-body-sm font-body-sm text-on-surface">
                                <CheckCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 italic text-xs">
                        ยังไม่มีบทวิเคราะห์ของนักเรียนรายนี้ คลิกปุ่ม &quot;สร้างรายงานด้วย AI&quot; เพื่อสร้างบทวิเคราะห์
                      </div>
                    )}
                  </div>

                  {/* Skills Radar Chart (Span 4) */}
                  <div className="col-span-12 md:col-span-4 bg-surface-container-lowest rounded-2xl shadow-level-1 border border-slate-200 p-5 flex flex-col justify-between min-h-[300px]">
                    <h3 className="text-label-md font-label-md font-bold text-on-surface mb-2">สัดส่วนประเมินผล (%)</h3>
                    <div className="flex-1 w-full h-[220px]">
                      {isClient && getRadarData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                            <PolarGrid stroke="#E2E8F0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#424751" }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                            <Radar
                              name="นักเรียน"
                              dataKey="student"
                              stroke="#004D99"
                              fill="#004D99"
                              fillOpacity={0.2}
                            />
                            <Radar
                              name="ค่าเฉลี่ยห้อง"
                              dataKey="classAvg"
                              stroke="#cbd5e1"
                              fill="#cbd5e1"
                              fillOpacity={0.1}
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
              )}

              {/* Line Chart Area (Score Trend) */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-level-1 border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-label-md font-label-md font-bold text-on-surface">แนวโน้มระดับผลสัมฤทธิ์ (Cumulative Score Trend)</h3>
                  <span className="text-xs text-outline bg-surface-bright border border-slate-100 rounded px-2.5 py-1">
                    เรียงตามลำดับเวลาชิ้นงาน
                  </span>
                </div>
                <div className="w-full h-64">
                  {isClient && assignments.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={getTrendData()} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
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
                          stroke="#cbd5e1"
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
            <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center bg-white border border-slate-200">
              <Sparkles className="w-12 h-12 text-slate-400 mb-3" />
              <h4 className="text-base font-bold text-slate-650">กรุณาเลือกนักเรียน</h4>
              <p className="text-slate-500 text-xs mt-1">
                คลิกเลือกนักเรียนในเมนูด้านซ้ายเพื่อเริ่มต้นดูรายงานพฤติกรรมและวิเคราะห์ผลสัมฤทธิ์
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
