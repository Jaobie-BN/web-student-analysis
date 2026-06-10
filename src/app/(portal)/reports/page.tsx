"use client";

import { useState } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { calculateFinalGrade, generateSessionDates } from "@/utils/mathUtils";
import {
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";

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

const getComponentThaiName = (comp: string, mode: "long" | "short" = "long") => {
  if (isLockedCategory(comp)) {
    return mode === "long" ? "คะแนนเวลาเรียน/จิตพิสัย" : "จิตพิสัย";
  }
  switch (comp) {
    case "homework":
      return mode === "long" ? "คะแนนเก็บ/การบ้าน" : "งานเก็บ";
    case "midterm":
      return mode === "long" ? "คะแนนสอบกลางภาค" : "กลางภาค";
    case "final":
      return mode === "long" ? "คะแนนสอบปลายภาค" : "ปลายภาค";
    default:
      return comp;
  }
};

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

export default function ReportsPage() {
  const {
    currentClassroom,
    students,
    assignments,
    attendance,
    scores,
    reports
  } = useClassroom();

  const [printMode, setPrintMode] = useState<"none" | "pap5" | "progress">("none");
  const [exportLoading, setExportLoading] = useState(false);

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Download className="w-16 h-16 text-slate-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-700">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-500 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนการเปิดเมนูออกรายงาน</p>
      </div>
    );
  }

  // Pre-calculate grades and metrics for all students
  const studentMetrics = students.map((std) => {
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

    const finalGrade = calculateFinalGrade(
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

    // Count attendance types
    const totalSessions = stdAttendance.length;
    const presentCount = stdAttendance.filter((a) => a.status === "present").length;
    const lateCount = stdAttendance.filter((a) => a.status === "late").length;
    const sickCount = stdAttendance.filter((a) => a.status === "sick").length;
    const absentCount = stdAttendance.filter((a) => a.status === "absent").length;

    return {
      student: std,
      ...finalGrade,
      totalSessions,
      presentCount,
      lateCount,
      sickCount,
      absentCount,
      rawAssignments: stdAssignments,
      rawAttendance: stdAttendance,
    };
  });

  // Get active components
  const activeComponents = Object.keys(currentClassroom.grade_weights).filter(
    (key) => currentClassroom.grade_weights[key] > 0
  );

  // Generate date list
  const sessionDates = generateSessionDates(
    currentClassroom.semester_start_date,
    currentClassroom.weekly_schedule,
    currentClassroom.total_weeks
  );

  // --- EXCEL GENERATION ENGINE ---
  const handleExportExcel = () => {
    setExportLoading(true);

    try {
      // ----------------------------------------------------
      // SHEET 1: สรุปผลการเรียน (Summary)
      // ----------------------------------------------------
      const summaryHeaders = [
        "รหัสนักเรียน",
        "คำนำหน้า",
        "ชื่อจริง",
        "นามสกุล",
        "คาบเรียนทั้งหมด",
        "มาเรียน (ครั้ง)",
        "สาย (ครั้ง)",
        "ขาด (ครั้ง)",
        "ลา (ครั้ง)",
        "เข้าเรียน (%)",
        "จิตพิสัย/พฤติกรรม (100)",
      ];

      // Append active grade components to headers
      activeComponents.forEach((comp) => {
        let compName = getComponentThaiName(comp, "long");
        summaryHeaders.push(`${compName} (${currentClassroom.grade_weights[comp]}%)`);
      });

      summaryHeaders.push("คะแนนรวม (%)", "เกรด (Grade)");

      const summaryRows = studentMetrics.map((sm) => {
        const rowData: any[] = [
          sm.student.student_code,
          sm.student.prefix || "",
          sm.student.first_name,
          sm.student.last_name,
          sm.totalSessions,
          sm.presentCount,
          sm.lateCount,
          sm.absentCount,
          sm.sickCount,
          sm.attendanceRate,
          sm.behaviorScore,
        ];

        activeComponents.forEach((comp) => {
          const score100 = sm.componentScores[comp];
          const weight = currentClassroom.grade_weights[comp] || 0;
          const scaledScore = score100 !== undefined ? (score100 / 100) * weight : null;
          rowData.push(scaledScore !== null ? scaledScore.toFixed(2) : "-");
        });

        rowData.push(sm.finalPercentage, sm.grade);
        return rowData;
      });

      const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);

      // ----------------------------------------------------
      // SHEET 2: สถิติการเข้าเรียน (Attendance Details)
      // ----------------------------------------------------
      const attHeaders = ["รหัสนักเรียน", "ชื่อ - นามสกุล"];
      sessionDates.forEach((date, i) => {
        attHeaders.push(`ครั้งที่ ${i + 1} (${date})`);
      });

      const attRows = studentMetrics.map((sm) => {
        const rowData: any[] = [
          sm.student.student_code,
          `${sm.student.prefix || ""}${sm.student.first_name} ${sm.student.last_name}`,
        ];

        sessionDates.forEach((date) => {
          const log = sm.rawAttendance.find((a) => a.session_date === date);
          let statusText = "-";
          if (log) {
            if (log.status === "present") statusText = "มาเรียน";
            else if (log.status === "late") statusText = "สาย";
            else if (log.status === "sick") statusText = "ลา";
            else if (log.status === "absent") statusText = "ขาด";
          }
          rowData.push(statusText);
        });

        return rowData;
      });

      const wsAttendance = XLSX.utils.aoa_to_sheet([attHeaders, ...attRows]);

      // ----------------------------------------------------
      // SHEET 3: คะแนนเก็บรายชิ้น (Assignment Details)
      // ----------------------------------------------------
      const assHeaders = ["รหัสนักเรียน", "ชื่อ - นามสกุล"];
      assignments.forEach((ass) => {
        assHeaders.push(`${ass.name} (เต็ม ${ass.max_score})`);
      });

      const assRows = studentMetrics.map((sm) => {
        const rowData: any[] = [
          sm.student.student_code,
          `${sm.student.prefix || ""}${sm.student.first_name} ${sm.student.last_name}`,
        ];

        assignments.forEach((ass) => {
          const scoreRec = sm.rawAssignments.find((a) => a.assignmentId === ass.id);
          let text = "-";
          if (scoreRec && scoreRec.score !== null) {
            text = `${scoreRec.score} ${scoreRec.isLate ? "(ช้า)" : "(ตรงเวลา)"}`;
          }
          rowData.push(text);
        });

        return rowData;
      });

      const wsAssignments = XLSX.utils.aoa_to_sheet([assHeaders, ...assRows]);

      // Assemble and Download Workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปผลการเรียน");
      XLSX.utils.book_append_sheet(wb, wsAttendance, "สถิติการเข้าเรียน");
      XLSX.utils.book_append_sheet(wb, wsAssignments, "คะแนนเก็บรายชิ้น");

      XLSX.writeFile(wb, `รายงานผลการเรียน_${currentClassroom.name}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ Excel");
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrint = (mode: "pap5" | "progress") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const closePrintPreview = () => {
    setPrintMode("none");
  };

  return (
    <div className="space-y-8 animate-fade-in print-container">
      
      {/* NORMAL SYSTEM VIEW */}
      {printMode === "none" && (
        <>
          <div>
            <h2 className="text-headline-lg font-headline-lg text-on-surface flex items-center gap-3">
              <Download className="w-8 h-8 text-primary" />
              <span>ระบบจัดทำรายงานและส่งออกข้อมูล (Reports Hub)</span>
            </h2>
            <p className="text-body-md font-body-md text-on-surface-variant mt-1.5">
              พิมพ์ใบคะแนนสะสม รายงานบัญชีเรียกชื่อวิชาหลัก ปพ.5 หรือดึงไฟล์ Excel รายบุคคลและรายเทอมได้ตามต้องการ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Excel Exporter */}
            <div className="glass-panel rounded-xl p-card-padding bg-surface-container-lowest border border-slate-200 shadow-level-1 hover:shadow-level-2 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-success-emerald/10 text-success-emerald border border-success-emerald/20 w-fit">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">ส่งออกชีตข้อมูลนักเรียนทั้งหมด (.xlsx)</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  ดาวน์โหลดรายงาน Excel ประกอบไปด้วย 3 แผ่นชีตหลัก: สรุปเกรดเฉลี่ยห้องเรียน, รายละเอียดประวัติการเช็คชื่อรายครั้ง และตารางแสดงคะแนนรายชิ้น
                </p>
              </div>

              <button
                onClick={handleExportExcel}
                disabled={exportLoading || students.length === 0}
                className="w-full mt-6 py-3 rounded-xl bg-success-emerald/15 hover:bg-success-emerald/20 border border-success-emerald/30 text-success-emerald font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{exportLoading ? "กำลังประมวลผล..." : "ดาวน์โหลด Excel (3 แผ่นชีต)"}</span>
              </button>
            </div>

            {/* Card 2: Print PAP.5 */}
            <div className="glass-panel rounded-xl p-card-padding bg-surface-container-lowest border border-slate-200 shadow-level-1 hover:shadow-level-2 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 w-fit">
                  <Printer className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">พิมพ์สมุดประเมินผลการเรียน (ปพ.5 Style)</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  สร้างรายงานในหน้าพิมพ์สมบูรณ์แบบเพื่อจัดทำบัญชีเรียกชื่อ ตารางเช็คชื่อ ตารางคะแนนชิ้นงานสะสม และการคำนวณสัดส่วนเกรดตามระเบียบโรงเรียน
                </p>
              </div>

              <button
                onClick={() => handlePrint("pap5")}
                disabled={students.length === 0}
                className="w-full mt-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>จัดเตรียมแบบพิมพ์ ปพ.5</span>
              </button>
            </div>

            {/* Card 3: Progress Report Cards */}
            <div className="glass-panel rounded-xl p-card-padding bg-surface-container-lowest border border-slate-200 shadow-level-1 hover:shadow-level-2 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-secondary-container/10 text-secondary border border-secondary-container/20 w-fit">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">พิมพ์ใบรายงานความก้าวหน้ารายบุคคล</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  พิมพ์รายงานผลการศึกษาของนักเรียนทุกคนพร้อมแถบผลสัมฤทธิ์ สถิติการเข้าเรียน จิตพิสัย คำอธิบาย และรวมถึงบันทึกคำแนะนำจาก AI
                </p>
              </div>

              <button
                onClick={() => handlePrint("progress")}
                disabled={students.length === 0}
                className="w-full mt-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>พิมพ์ใบรายงานรายบุคคล</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ----------------------------------------------------
         PRINT VIEW 1: ปพ.5 (Class Grade Book Table)
         ---------------------------------------------------- */}
      {printMode === "pap5" && (
        <div className="bg-white text-black p-8 max-w-full font-serif print:p-0">
          <button
            onClick={closePrintPreview}
            className="mb-6 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold no-print flex items-center gap-1.5 cursor-pointer"
          >
            ← กลับสู่หน้าระบบรายงาน
          </button>

          <div className="text-center space-y-2 mb-6">
            <h1 className="text-xl font-bold">บัญชีเรียกชื่อและสมุดบันทึกผลสัมฤทธิ์ทางการเรียน (ปพ.5)</h1>
            <p className="text-sm">
              ห้องเรียน/วิชา: <span className="font-semibold">{currentClassroom.name}</span> • ตารางเรียน: {currentClassroom.weekly_schedule}
            </p>
            <p className="text-xs text-gray-500">
              วันเปิดเรียน: {currentClassroom.semester_start_date} • คาบเรียนตลอดเทอม: {currentClassroom.total_weeks} สัปดาห์
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 font-bold border border-black">
                  <th className="border border-black px-2 py-3" rowSpan={2}>รหัส</th>
                  <th className="border border-black px-2 py-3 text-left" rowSpan={2}>ชื่อ - นามสกุล</th>
                  <th className="border border-black px-2 py-1" colSpan={4}>สถิติเข้าเรียน (วัน)</th>
                  <th className="border border-black px-2 py-1" colSpan={activeComponents.length}>คะแนนสะสมแยกตามสัดส่วนคอลัมน์ (%)</th>
                  <th className="border border-black px-2 py-3" rowSpan={2}>คะแนนรวม (%)</th>
                  <th className="border border-black px-2 py-3" rowSpan={2}>เกรด</th>
                </tr>
                <tr className="bg-gray-100 font-bold border border-black">
                  <th className="border border-black px-1 py-1.5 text-[10px]">มา</th>
                  <th className="border border-black px-1 py-1.5 text-[10px]">สาย</th>
                  <th className="border border-black px-1 py-1.5 text-[10px]">ขาด</th>
                  <th className="border border-black px-1 py-1.5 text-[10px]">ลา</th>
                  
                  {activeComponents.map((comp) => {
                    let text = getComponentThaiName(comp, "short");
                    return (
                      <th key={comp} className="border border-black px-1 py-1.5 text-[10px]">
                        {text} ({currentClassroom.grade_weights[comp]}%)
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {studentMetrics.map((sm) => (
                  <tr key={sm.student.id} className="border border-black">
                    <td className="border border-black px-2 py-2 font-mono font-bold">{sm.student.student_code}</td>
                    <td className="border border-black px-2 py-2 text-left font-semibold">
                      {`${sm.student.prefix || ""}${sm.student.first_name} ${sm.student.last_name}`}
                    </td>
                    <td className="border border-black px-1 py-2">{sm.presentCount}</td>
                    <td className="border border-black px-1 py-2">{sm.lateCount}</td>
                    <td className="border border-black px-1 py-2">{sm.absentCount}</td>
                    <td className="border border-black px-1 py-2">{sm.sickCount}</td>

                    {activeComponents.map((comp) => {
                      const score100 = sm.componentScores[comp];
                      const weight = currentClassroom.grade_weights[comp] || 0;
                      const scaledScore = score100 !== undefined ? (score100 / 100) * weight : null;
                      return (
                        <td key={comp} className="border border-black px-1 py-2 font-mono">
                          {scaledScore !== null ? scaledScore.toFixed(1) : "-"}
                        </td>
                      );
                    })}

                    <td className="border border-black px-2 py-2 font-mono font-bold">{sm.finalPercentage}%</td>
                    <td className="border border-black px-2 py-2 font-bold">{sm.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-12 pt-8 text-black">
            <div className="text-center w-64">
              <div className="border-b border-black h-8 w-full" />
              <p className="text-xs mt-2">ลงชื่อ: ____________________________ ครูผู้สอน</p>
            </div>
            <div className="text-center w-64">
              <div className="border-b border-black h-8 w-full" />
              <p className="text-xs mt-2">ลงชื่อ: ____________________________ ฝ่ายวิชาการ</p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
         PRINT VIEW 2: INDIVIDUAL STUDENT REPORT CARDS
         ---------------------------------------------------- */}
      {printMode === "progress" && (
        <div className="bg-white text-black p-4 font-serif">
          <button
            onClick={closePrintPreview}
            className="mb-6 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold no-print flex items-center gap-1.5 cursor-pointer"
          >
            ← กลับสู่หน้าระบบรายงาน
          </button>

          {studentMetrics.map((sm, idx) => {
            const report = reports.find((r) => r.student_id === sm.student.id);

            return (
              <div
                key={sm.student.id}
                className={`p-6 border border-gray-400 rounded-3xl bg-white text-black max-w-2xl mx-auto space-y-6 ${
                  idx > 0 ? "page-break mt-12" : ""
                }`}
              >
                {/* Header */}
                <div className="text-center border-b border-gray-300 pb-4">
                  <h2 className="text-lg font-bold">ใบแจ้งผลการประเมินการศึกษาและความประพฤติรายบุคคล</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    วิชา {currentClassroom.name} • ภาคการศึกษาแบบบันทึกคะแนนสะสม ปพ.5
                  </p>
                </div>

                {/* Profile Details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 font-bold uppercase tracking-wider">ข้อมูลส่วนตัวนักเรียน</span>
                    <h3 className="text-sm font-bold mt-1">
                      {`${sm.student.prefix || ""}${sm.student.first_name} ${sm.student.last_name}`}
                    </h3>
                    <p className="text-gray-500 mt-0.5">เลขประจำตัวนักเรียน: {sm.student.student_code}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">วันออกเอกสาร</span>
                    <p className="text-sm font-bold mt-1">{new Date().toLocaleDateString("th-TH")}</p>
                  </div>
                </div>

                {/* Summary Table */}
                <div>
                  <table className="w-full text-xs text-center border-collapse border border-gray-350">
                    <thead>
                      <tr className="bg-gray-100 border border-gray-350 font-bold">
                        <th className="border border-gray-350 px-2 py-2">หัวข้อคะแนน (สัดส่วน)</th>
                        <th className="border border-gray-350 px-2 py-2">ประเมินได้ (%)</th>
                        <th className="border border-gray-350 px-2 py-2">คาบเรียนทั้งหมด</th>
                        <th className="border border-gray-350 px-2 py-2">เข้าเรียน (%)</th>
                        <th className="border border-gray-350 px-2 py-2">เกรดเฉลี่ยสะสม</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border border-gray-350">
                        <td className="border border-gray-350 px-2 py-2 text-left">
                          {activeComponents.map((comp) => {
                            let text = getComponentThaiName(comp, "short");
                            return `${text} (${currentClassroom.grade_weights[comp]}%)`;
                          }).join(", ")}
                        </td>
                        <td className="border border-gray-350 px-2 py-2 font-mono font-bold">{sm.finalPercentage}%</td>
                        <td className="border border-gray-350 px-2 py-2">{sm.totalSessions}</td>
                        <td className="border border-gray-350 px-2 py-2 font-mono">{sm.attendanceRate}%</td>
                        <td className="border border-gray-350 px-2 py-2 font-bold text-sm text-primary">{sm.grade}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-2 gap-4 text-[10px]">
                  <div className="border border-gray-300 rounded-xl p-3">
                    <h4 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-2">สรุปสถิติเข้าเรียน</h4>
                    <p className="flex justify-between"><span>เข้าเรียนตรงเวลา:</span> <span className="font-bold">{sm.presentCount} วัน</span></p>
                    <p className="flex justify-between mt-1"><span>เข้าเรียนล่าช้า (สาย):</span> <span className="font-bold">{sm.lateCount} วัน</span></p>
                    <p className="flex justify-between mt-1"><span>ลาป่วย/ลากิจ (ลา):</span> <span className="font-bold">{sm.sickCount} วัน</span></p>
                    <p className="flex justify-between mt-1"><span>ขาดเรียนโดยไม่มีใบลา:</span> <span className="font-bold text-red-650">{sm.absentCount} วัน</span></p>
                  </div>

                  <div className="border border-gray-300 rounded-xl p-3">
                    <h4 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-2">พฤติกรรมคุณลักษณะอันพึงประสงค์</h4>
                    <p className="flex justify-between"><span>จิตพิสัยพฤติกรรม:</span> <span className="font-bold">{sm.behaviorScore} / 100</span></p>
                    <p className="flex justify-between mt-1"><span>ระดับความเสี่ยง:</span> <span className="font-bold">{sm.risk === "red" ? "วิกฤต (ความเสี่ยงสูง)" : sm.risk === "yellow" ? "เฝ้าระวัง" : "ปกติ"}</span></p>
                  </div>
                </div>

                {/* AI Psychologist Report / Teacher Comment */}
                <div className="border border-gray-300 rounded-xl p-4 text-xs space-y-2">
                  <h4 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-2">บทวิเคราะห์ระบบอัจฉริยะ AI & ข้อเสนอแนะคุณครู</h4>
                  {report ? (
                    <div className="space-y-3">
                      <p className="leading-relaxed"><span className="font-bold">สรุปผลการเรียน:</span> {report.performance_summary}</p>
                      <div className="leading-relaxed space-y-1">
                        <span className="font-bold">ข้อเสนอแนะส่งเสริม:</span>
                        <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                          {parseRecommendations(report.recommendations).map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">ไม่มีข้อมูลบทวิเคราะห์จาก AI หรือข้อแนะนำเพิ่มเติมของครูผู้สอนสำหรับนักเรียนท่านนี้</p>
                  )}
                </div>

                {/* Signature footer */}
                <div className="flex justify-between pt-6 text-black text-[10px]">
                  <div className="text-center w-40">
                    <div className="border-b border-black h-6 w-full" />
                    <p className="mt-1">ผู้ปกครอง</p>
                  </div>
                  <div className="text-center w-40">
                    <div className="border-b border-black h-6 w-full" />
                    <p className="mt-1">ครูผู้สอน</p>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
