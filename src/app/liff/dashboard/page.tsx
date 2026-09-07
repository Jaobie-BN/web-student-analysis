"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  XCircle,
} from "lucide-react";

declare global {
  interface Window {
    liff?: any;
  }
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const classroomId = searchParams.get("classroomId");
  const studentId = searchParams.get("studentId");
  const lineUserId = searchParams.get("lineUserId");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams();
        if (classroomId) query.set("classroomId", classroomId);
        if (studentId) query.set("studentId", studentId);
        if (lineUserId) query.set("lineUserId", lineUserId);

        const res = await fetch(`/api/line/student-data?${query.toString()}`);
        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.error || "ไม่สามารถโหลดข้อมูลนักเรียนได้");
        }

        setData(result);
      } catch (err: any) {
        setErrorMsg(err.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classroomId, studentId, lineUserId]);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.liff && window.liff.isInClient()) {
      window.liff.closeWindow();
    } else {
      window.close();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">กำลังคำนวณคะแนนและสถิติ...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3">
          <XCircle className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">ไม่สามารถแสดงข้อมูลได้</h3>
        <p className="text-xs text-slate-500 max-w-xs mb-6">{errorMsg || "กรุณาผูกบัญชีกับห้องเรียนก่อนเข้าใช้งาน"}</p>
        <button
          onClick={handleClose}
          className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-medium"
        >
          กลับสู่ห้องแชท
        </button>
      </div>
    );
  }

  const { scoreReport, missingAssignments, attendanceStats } = data;
  const { student, classroom, finalGrade, finalPercentage, components, behaviorScore } = scoreReport;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen pb-10">
      {/* Top Header */}
      <div className="bg-slate-900 text-white p-6 pb-8 rounded-b-3xl shadow-lg relative">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-emerald-400 text-xs font-mono mb-1 tracking-wider uppercase">
          {classroom.name} {classroom.room_code ? `#${classroom.room_code}` : ""}
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-1">
          {student.prefix || ""}{student.first_name} {student.last_name}
        </h1>
        <p className="text-xs text-slate-400">รหัสนักเรียน: {student.student_code}</p>

        {/* Hero Score Badge */}
        <div className="mt-6 bg-slate-800/90 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">เกรดคาดการณ์</p>
              <p className="text-2xl font-black text-white">{finalGrade}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-medium">คะแนนสะสมรวม</p>
            <p className="text-xl font-bold text-emerald-400">{finalPercentage.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-3 space-y-4">
        {/* Component Scores Progress Bars */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>สัดส่วนคะแนนแต่ละหมวด</span>
          </h2>
          <div className="space-y-3.5">
            {components.map((c: any) => {
              const pct = Math.min(100, Math.max(0, c.score));
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{c.name}</span>
                    <span className="font-bold text-slate-900">{c.score.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Behavior score item */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">คะแนนจิตพิสัย (พฤติกรรม)</span>
                <span className="font-bold text-emerald-600">{behaviorScore} / 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Missing Assignments */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>งานค้างที่ยังไม่ส่ง</span>
            </h2>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                missingAssignments.length === 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {missingAssignments.length === 0 ? "ครบทุกชิ้น" : `${missingAssignments.length} งาน`}
            </span>
          </div>

          {missingAssignments.length === 0 ? (
            <div className="py-4 text-center text-slate-500 flex flex-col items-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
              <p className="text-xs font-medium text-slate-700">ไม่มีงานค้างในระบบ</p>
              <p className="text-[10px] text-slate-400">คุณส่งงานครบทุกชิ้นแล้ว ยอดเยี่ยมมากครับ</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {missingAssignments.map((m: any, idx: number) => (
                <div key={m.id || idx} className="py-2.5 flex items-start justify-between">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-400">หมวด: {m.grade_component}</p>
                  </div>
                  <span className="text-xs font-bold text-red-500 whitespace-nowrap">
                    เต็ม {m.max_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>สถิติการเข้าเรียน</span>
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center mb-3">
            <div className="bg-emerald-50 rounded-xl p-2.5">
              <p className="text-[10px] text-emerald-700 font-medium">มาเรียน</p>
              <p className="text-lg font-bold text-emerald-800">{attendanceStats.present}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-2.5">
              <p className="text-[10px] text-amber-700 font-medium">มาสาย</p>
              <p className="text-lg font-bold text-amber-800">{attendanceStats.late}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2.5">
              <p className="text-[10px] text-blue-700 font-medium">ลา</p>
              <p className="text-lg font-bold text-blue-800">{attendanceStats.sick}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-2.5">
              <p className="text-[10px] text-red-700 font-medium">ขาด</p>
              <p className="text-lg font-bold text-red-800">{attendanceStats.absent}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-600">ร้อยละเวลาเรียนสะสม</span>
            <span
              className={`font-bold ${
                attendanceStats.percentage >= 80 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {attendanceStats.percentage.toFixed(1)}% {attendanceStats.percentage >= 80 ? "✓ มีสิทธิ์สอบ" : "⚠️ เสี่ยงหมดสิทธิ์สอบ"}
            </span>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"
        >
          กลับสู่ห้องแชท LINE
        </button>
      </div>
    </div>
  );
}

export default function LiffDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">กำลังโหลดแดชบอร์ด...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
