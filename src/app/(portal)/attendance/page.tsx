"use client";

import { useState, useEffect } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { generateSessionDates, AttendanceStatus } from "@/utils/mathUtils";
import {
  CalendarCheck,
  Check,
  Save,
  UserCheck,
  AlertCircle,
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
    saveAttendance
  } = useClassroom();

  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [studentStatuses, setStudentStatuses] = useState<{ [studentId: string]: AttendanceStatus }>({});
  const [filterStatus, setFilterStatus] = useState<"all" | AttendanceStatus>("all");
  
  // Custom date creation
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customDateVal, setCustomDateVal] = useState("");

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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
      setNotification(null);
    } else if (students.length > 0) {
      // Default everyone to present if no records exist
      const defaultStatuses: { [studentId: string]: AttendanceStatus } = {};
      students.forEach((s) => {
        defaultStatuses[s.id] = "present";
      });
      setStudentStatuses(defaultStatuses);
    }
  }, [selectedDate, attendance, students]);

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <CalendarCheck className="w-16 h-16 text-slate-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-700">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-500 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนทำการเช็คชื่อเข้าเรียน</p>
      </div>
    );
  }

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
    setNotification(null);
  };

  const handleMarkAllPresent = () => {
    const updated: { [studentId: string]: AttendanceStatus } = {};
    students.forEach((s) => {
      updated[s.id] = "present";
    });
    setStudentStatuses(updated);
    setNotification(null);
  };

  const handleSave = async () => {
    if (!selectedDate) {
      setNotification({ type: "error", msg: "กรุณาเลือกวันที่บันทึกเช็คชื่อ" });
      return;
    }

    setSaving(true);
    setNotification(null);

    const records = Object.keys(studentStatuses).map((studentId) => ({
      studentId,
      date: selectedDate,
      status: studentStatuses[studentId],
    }));

    try {
      await saveAttendance(records);
      setNotification({ type: "success", msg: "บันทึกการเช็คชื่อเข้าเรียนเสร็จสิ้น!" });
      
      // If we added a custom date, append to list if not present
      if (isCustomDate && !sessionDates.includes(selectedDate)) {
        setSessionDates([...sessionDates, selectedDate].sort());
        setIsCustomDate(false);
      }
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
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

  const countAll = students.length;
  const countPresent = students.filter(s => (studentStatuses[s.id] || "present") === "present").length;
  const countLate = students.filter(s => studentStatuses[s.id] === "late").length;
  const countSick = students.filter(s => studentStatuses[s.id] === "sick").length;
  const countAbsent = students.filter(s => studentStatuses[s.id] === "absent").length;

  return (
    <div className="space-y-stack-gap-lg animate-fade-in text-slate-900 font-body-md">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-headline-lg font-headline-lg text-on-surface mb-2">ระบบลงเวลาเข้าเรียน (Classroom Attendance Tracker)</h2>
        <p className="text-body-md font-body-md text-on-surface-variant">บันทึกและติดตามเวลาเรียนของนักเรียนในชั้นเรียนของคุณ</p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            notification.type === "success"
              ? "bg-success-emerald/10 border-success-emerald/20 text-success-emerald"
              : "bg-critical-rose/10 border-critical-rose/20 text-critical-rose"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* Date Selector Control Panel */}
      <div className="bg-surface-container-lowest rounded-xl border border-slate-200 p-card-padding mb-8 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-auto">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
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
                  className="pl-10 pr-4 py-2.5 bg-background border border-slate-200 rounded-lg text-label-md font-label-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer w-full"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDate(false);
                    if (sessionDates.length > 0) setSelectedDate(sessionDates[0]);
                  }}
                  className="p-2.5 rounded-lg bg-surface-container-low border border-slate-200 text-outline hover:text-on-surface-variant cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative w-full sm:w-auto min-w-[240px]">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-background border border-slate-200 rounded-lg text-label-md font-label-md text-on-surface appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  {sessionDates.map((date, idx) => {
                    const logged = isDateLogged(date);
                    return (
                      <option key={date} value={date}>
                        สัปดาห์ที่ {idx + 1}: {formatThaiDate(date)} {logged ? "✓" : ""}
                      </option>
                    );
                  })}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
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
              className="w-full sm:w-auto px-4 py-2.5 bg-surface-container-lowest border border-slate-200 text-label-md font-label-md text-slate-900 hover:bg-surface-container-low rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มวันสอนชดเชย</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 px-4 py-2 bg-success-emerald/10 rounded-lg border border-success-emerald/20 whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4 text-success-emerald" />
            <span className="text-label-md font-label-md text-success-emerald">มาเรียน {countPresent}/{countAll} คน</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={handleMarkAllPresent}
              className="flex-grow sm:flex-none px-4 py-2.5 bg-secondary-container/10 text-secondary border border-secondary/20 rounded-lg text-label-md font-label-md hover:bg-secondary-container/20 transition-colors whitespace-nowrap cursor-pointer"
            >
              เช็คชื่อทุกคนเป็น "มาเรียน"
            </button>
            <button
              onClick={handleSave}
              disabled={saving || students.length === 0}
              className="flex-grow sm:flex-none px-6 py-2.5 bg-primary-container text-on-primary rounded-lg text-label-md font-label-md hover:bg-primary transition-colors whitespace-nowrap shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกผล"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid/Table Area */}
      {students.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {/* Filters Row */}
          <div className="p-4 border-b border-slate-200 bg-surface-bright flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-4 py-1.5 rounded-full text-label-sm font-label-sm cursor-pointer transition-colors ${
                  filterStatus === "all"
                    ? "bg-primary-container text-on-primary"
                    : "bg-background border border-slate-200 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                ทั้งหมด ({countAll})
              </button>
              <button
                onClick={() => setFilterStatus("present")}
                className={`px-4 py-1.5 rounded-full text-label-sm font-label-sm cursor-pointer transition-colors ${
                  filterStatus === "present"
                    ? "bg-success-emerald text-white"
                    : "bg-background border border-slate-200 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                มาเรียน ({countPresent})
              </button>
              <button
                onClick={() => setFilterStatus("late")}
                className={`px-4 py-1.5 rounded-full text-label-sm font-label-sm cursor-pointer transition-colors ${
                  filterStatus === "late"
                    ? "bg-warning-amber text-white"
                    : "bg-background border border-slate-200 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                สาย ({countLate})
              </button>
              <button
                onClick={() => setFilterStatus("sick")}
                className={`px-4 py-1.5 rounded-full text-label-sm font-label-sm cursor-pointer transition-colors ${
                  filterStatus === "sick"
                    ? "bg-secondary text-white"
                    : "bg-background border border-slate-200 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                ลา ({countSick})
              </button>
              <button
                onClick={() => setFilterStatus("absent")}
                className={`px-4 py-1.5 rounded-full text-label-sm font-label-sm cursor-pointer transition-colors ${
                  filterStatus === "absent"
                    ? "bg-critical-rose text-white"
                    : "bg-background border border-slate-200 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                ขาด ({countAbsent})
              </button>
            </div>
          </div>

          {/* Header Row */}
          <div className="grid grid-cols-[80px_1fr_auto_1fr] gap-4 p-4 border-b border-slate-200 bg-surface-container-low text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider sticky top-0 z-10 text-center sm:text-left">
            <div className="text-center">เลขที่ / รหัส</div>
            <div className="pl-4">ชื่อ - นามสกุล</div>
            <div className="w-[320px] text-center">สถานะการเข้าเรียน</div>
            <div className="pl-4">หมายเหตุ</div>
          </div>

          {/* Student List (Scrollable) */}
          <div className="flex-1 p-2 space-y-1">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, idx) => {
                const currentStatus = studentStatuses[student.id] || "present";
                
                return (
                  <div
                    key={student.id}
                    className={`grid grid-cols-[80px_1fr_auto_1fr] gap-4 items-center p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-surface-container-lowest transition-colors group ${
                      currentStatus === "late"
                        ? "bg-warning-amber/5"
                        : currentStatus === "absent"
                        ? "bg-critical-rose/5"
                        : currentStatus === "sick"
                        ? "bg-sky-blue/5"
                        : ""
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-label-md font-label-md text-on-surface font-bold">{idx + 1}</div>
                      <div className="text-code font-code text-outline">{student.student_code}</div>
                    </div>

                    <div className="flex items-center gap-3 pl-4">
                      <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-label-md text-primary font-bold overflow-hidden">
                        {student.first_name ? student.first_name.charAt(0) : ""}
                      </div>
                      <span className="text-body-md font-body-md text-on-surface font-semibold">
                        {`${student.prefix || ""}${student.first_name} ${student.last_name}`}
                      </span>
                    </div>

                    <div className="w-[320px]">
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden p-1 bg-background h-10">
                        {/* Present */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, "present")}
                          className={`flex-grow flex items-center justify-center rounded-md text-label-sm font-label-sm cursor-pointer transition-colors ${
                            currentStatus === "present"
                              ? "bg-success-emerald text-white font-bold"
                              : "text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          มาเรียน
                        </button>
                        {/* Late */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, "late")}
                          className={`flex-grow flex items-center justify-center rounded-md text-label-sm font-label-sm cursor-pointer transition-colors ${
                            currentStatus === "late"
                              ? "bg-warning-amber text-white font-bold"
                              : "text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          สาย
                        </button>
                        {/* Leave */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, "sick")}
                          className={`flex-grow flex items-center justify-center rounded-md text-label-sm font-label-sm cursor-pointer transition-colors ${
                            currentStatus === "sick"
                              ? "bg-secondary text-white font-bold"
                              : "text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          ลา
                        </button>
                        {/* Absent */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, "absent")}
                          className={`flex-grow flex items-center justify-center rounded-md text-label-sm font-label-sm cursor-pointer transition-colors ${
                            currentStatus === "absent"
                              ? "bg-critical-rose text-white font-bold"
                              : "text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          ขาด
                        </button>
                      </div>
                    </div>

                    <div className="pl-4 pr-2">
                      <input
                        type="text"
                        placeholder="เพิ่มหมายเหตุ..."
                        value={student.notes || ""}
                        readOnly
                        className="w-full px-3 py-2 bg-background border border-slate-200 rounded-lg text-body-sm font-body-sm text-on-surface focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400 font-medium font-body-sm col-span-4">
                ไม่พบข้อมูลนักเรียนสำหรับตัวกรองนี้
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <CalendarCheck className="w-12 h-12 text-slate-400 mb-3" />
          <h4 className="text-base font-bold text-slate-700">ยังไม่มีรายชื่อนักเรียนในชั้นเรียนนี้</h4>
          <p className="text-slate-500 text-xs mt-1 max-w-sm">
            กรุณาเพิ่มนักเรียนในเมนู "รายชื่อนักเรียน (Roster)" หรือนำเข้าผ่านเทมเพลต Excel ก่อนดำเนินการเช็คชื่อเข้าเรียน
          </p>
        </div>
      )}
    </div>
  );
}
