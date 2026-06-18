"use client";

import { useState, useEffect } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { Classroom } from "@/utils/db";
import {
  Settings,
  Plus,
  Trash2,
  Calendar,
  Save,
  CheckCircle,
  AlertCircle,
  Sliders,
  ChevronRight,
  BookOpen,
  Lock,
  AlertTriangle
} from "lucide-react";

const WEEKDAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const WEEKDAYS_SHORT = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const parseScheduleDaysStr = (scheduleStr: string): string[] => {
  if (!scheduleStr) return ["จันทร์"];
  const days: string[] = [];
  for (const day of WEEKDAYS) {
    if (scheduleStr.includes(day)) {
      days.push(day);
    }
  }
  return days.length > 0 ? days : ["จันทร์"];
};

export default function ClassroomsPage() {
  const {
    classrooms,
    currentClassroom,
    setCurrentClassroom,
    createClassroom,
    updateClassroom,
    deleteClassroom,
    cleanupClassroomData
  } = useClassroom();

  // New classroom state
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newWeeklySchedule, setNewWeeklySchedule] = useState("ทุกวันจันทร์");
  const [newWeeklyScheduleDays, setNewWeeklyScheduleDays] = useState<string[]>(["จันทร์"]);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTotalWeeks, setNewTotalWeeks] = useState(18);

  // Editing state (loaded from currentClassroom)
  const [editName, setEditName] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editScheduleDays, setEditScheduleDays] = useState<string[]>([]);
  const [editStartDate, setEditStartDate] = useState("");
  const [editTotalWeeks, setEditTotalWeeks] = useState(18);

  // Dynamic Categories (attendance, homework, midterm, final, custom...)
  const [categories, setCategories] = useState<{ id: string; name: string; weight: number; mode: string }[]>([]);

  // Thresholds (g4, g35, g3, g25, g2, g15, g1)
  const [thresholds, setThresholds] = useState({
    g4: 80,
    g35: 75,
    g3: 70,
    g25: 65,
    g2: 60,
    g15: 55,
    g1: 50,
  });

  // Behavioral Deduction Config
  const [behaviorConfig, setBehaviorConfig] = useState({
    deductAbsent: 5,
    deductLate: 2,
    deductMissing: 2,
    deductLateSubmission: 1,
    gradingMode: "auto",
    maxAbsencesAllowed: 4,
    latesPerAbsence: 3,
    scoreCalculationMethod: "deductive" as "active_rescaling" | "deductive",
  });

  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Semester Cleanup feature state
  const [cleanAttendance, setCleanAttendance] = useState(false);
  const [cleanScores, setCleanScores] = useState(false);
  const [cleanReports, setCleanReports] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [cleanupConfirmText, setCleanupConfirmText] = useState("");
  const [isCleaning, setIsCleaning] = useState(false);

  // Sync edits when currentClassroom changes
  useEffect(() => {
    if (currentClassroom) {
      setEditName(currentClassroom.name || "");
      setEditSchedule(currentClassroom.weekly_schedule || "ทุกวันจันทร์");
      setEditScheduleDays(parseScheduleDaysStr(currentClassroom.weekly_schedule || "ทุกวันจันทร์"));
      setEditStartDate(currentClassroom.semester_start_date || new Date().toISOString().split("T")[0]);
      setEditTotalWeeks(currentClassroom.total_weeks || 18);
      
      const clsWeights = currentClassroom.grade_weights || { attendance: 10, homework: 30, midterm: 30, final: 30 };
      const clsModes = currentClassroom.grade_weight_modes || {};
      
      setCategories(Object.keys(clsWeights).map((key, idx) => ({
        id: `cat-${key}-${idx}`,
        name: key === "attendance" ? "จิตพิสัย" : key,
        weight: clsWeights[key],
        mode: clsModes[key] || "proportional",
      })));

      setThresholds({
        g4: currentClassroom.grade_thresholds?.g4 ?? 80,
        g35: currentClassroom.grade_thresholds?.g35 ?? 75,
        g3: currentClassroom.grade_thresholds?.g3 ?? 70,
        g25: currentClassroom.grade_thresholds?.g25 ?? 65,
        g2: currentClassroom.grade_thresholds?.g2 ?? 60,
        g15: currentClassroom.grade_thresholds?.g15 ?? 55,
        g1: currentClassroom.grade_thresholds?.g1 ?? 50,
      });

      setBehaviorConfig({
        deductAbsent: currentClassroom.behavior_config?.deductAbsent ?? 5,
        deductLate: currentClassroom.behavior_config?.deductLate ?? 2,
        deductMissing: currentClassroom.behavior_config?.deductMissing ?? 2,
        deductLateSubmission: currentClassroom.behavior_config?.deductLateSubmission ?? 1,
        gradingMode: currentClassroom.behavior_config?.gradingMode ?? "auto",
        maxAbsencesAllowed: currentClassroom.behavior_config?.maxAbsencesAllowed ?? 4,
        latesPerAbsence: currentClassroom.behavior_config?.latesPerAbsence ?? 3,
        scoreCalculationMethod: currentClassroom.behavior_config?.scoreCalculationMethod ?? "deductive",
      });
    }
  }, [currentClassroom]);

  // Sync when selected classroom changes (selection callback)
  const handleSelectClass = (cls: Classroom) => {
    setCurrentClassroom(cls);
    setEditName(cls.name);
    setEditSchedule(cls.weekly_schedule);
    setEditScheduleDays(parseScheduleDaysStr(cls.weekly_schedule));
    setEditStartDate(cls.semester_start_date);
    setEditTotalWeeks(cls.total_weeks);

    const clsWeights = cls.grade_weights || { attendance: 10, homework: 30, midterm: 30, final: 30 };
    const clsModes = cls.grade_weight_modes || {};
    
    setCategories(Object.keys(clsWeights).map((key, idx) => ({
      id: `cat-${key}-${idx}-${Date.now()}`,
      name: key === "attendance" ? "จิตพิสัย" : key,
      weight: clsWeights[key],
      mode: clsModes[key] || "proportional",
    })));

    setThresholds({
      g4: cls.grade_thresholds?.g4 ?? 80,
      g35: cls.grade_thresholds?.g35 ?? 75,
      g3: cls.grade_thresholds?.g3 ?? 70,
      g25: cls.grade_thresholds?.g25 ?? 65,
      g2: cls.grade_thresholds?.g2 ?? 60,
      g15: cls.grade_thresholds?.g15 ?? 55,
      g1: cls.grade_thresholds?.g1 ?? 50,
    });

    setBehaviorConfig({
      deductAbsent: cls.behavior_config?.deductAbsent ?? 5,
      deductLate: cls.behavior_config?.deductLate ?? 2,
      deductMissing: cls.behavior_config?.deductMissing ?? 2,
      deductLateSubmission: cls.behavior_config?.deductLateSubmission ?? 1,
      gradingMode: cls.behavior_config?.gradingMode ?? "auto",
      maxAbsencesAllowed: cls.behavior_config?.maxAbsencesAllowed ?? 4,
      latesPerAbsence: cls.behavior_config?.latesPerAbsence ?? 3,
      scoreCalculationMethod: cls.behavior_config?.scoreCalculationMethod ?? "deductive",
    });

    setNotification(null);
  };

  // Helper functions to manage dynamic categories
  const handleUpdateCategoryName = (id: string, newName: string) => {
    setCategories(categories.map((c) => (c.id === id ? { ...c, name: newName } : c)));
  };

  const handleUpdateCategoryWeight = (id: string, newWeight: number) => {
    setCategories(categories.map((c) => (c.id === id ? { ...c, weight: newWeight } : c)));
  };

  const handleUpdateCategoryMode = (id: string, newMode: string) => {
    setCategories(categories.map((c) => (c.id === id ? { ...c, mode: newMode } : c)));
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      setNotification({ type: "error", msg: "ต้องมีหมวดหมู่ประเมินผลอย่างน้อย 1 หมวดหมู่" });
      return;
    }
    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleAddCategory = () => {
    const defaultNum = categories.length + 1;
    setCategories([
      ...categories,
      {
        id: `cat-new-${Date.now()}-${Math.random()}`,
        name: `หมวดหมู่ใหม่ ${defaultNum}`,
        weight: 0,
        mode: "proportional",
      },
    ]);
  };

  // Locked category check (linked to attendance / behavior engine)
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!newClassName.trim()) return;

    if (newWeeklyScheduleDays.length === 0) {
      setNotification({ type: "error", msg: "กรุณาเลือกวันเรียนอย่างน้อย 1 วัน" });
      return;
    }

    try {
      const scheduleString = newWeeklyScheduleDays.join(", ");
      const cls = await createClassroom(newClassName, scheduleString, newStartDate, newTotalWeeks);
      setIsCreating(false);
      setNewClassName("");
      setNewWeeklyScheduleDays(["จันทร์"]);
      handleSelectClass(cls);
      setNotification({ type: "success", msg: "สร้างห้องเรียนสำเร็จ!" });
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการสร้างห้องเรียน" });
    }
  };

  const handleSaveConfig = async () => {
    setNotification(null);
    setSaving(true);

    // Validate category names
    if (categories.some((cat) => !cat.name.trim())) {
      setNotification({ type: "error", msg: "กรุณาระบุชื่อหมวดหมู่คะแนนให้ครบถ้วน" });
      setSaving(false);
      return;
    }
    const names = categories.map((cat) => cat.name.trim());
    const hasDuplicates = names.some((name, idx) => names.indexOf(name) !== idx);
    if (hasDuplicates) {
      setNotification({ type: "error", msg: "ชื่อหมวดหมู่คะแนนต้องไม่ซ้ำกัน" });
      setSaving(false);
      return;
    }

    // Validate weights total
    const sum = categories.reduce((s, cat) => s + cat.weight, 0);
    if (sum !== 100) {
      setNotification({ type: "error", msg: `สัดส่วนคะแนนสะสมต้องรวมกันได้ 100% เสมอ (ขณะนี้รวมได้ ${sum}%)` });
      setSaving(false);
      return;
    }

    // Validate thresholds order
    const isOrderCorrect =
      thresholds.g4 > thresholds.g35 &&
      thresholds.g35 > thresholds.g3 &&
      thresholds.g3 > thresholds.g25 &&
      thresholds.g25 > thresholds.g2 &&
      thresholds.g2 > thresholds.g15 &&
      thresholds.g15 > thresholds.g1;

    if (!isOrderCorrect) {
      setNotification({ type: "error", msg: "เกณฑ์คะแนนเกรดไม่ถูกต้อง กรุณาตั้งค่าลดหลั่นกันตามลำดับ (เกรด 4 สูงสุด และเกรด 1 ต่ำสุด)" });
      setSaving(false);
      return;
    }

    if (editScheduleDays.length === 0) {
      setNotification({ type: "error", msg: "กรุณาเลือกวันเรียนอย่างน้อย 1 วัน" });
      setSaving(false);
      return;
    }

    const scheduleString = editScheduleDays.join(", ");

    const finalWeights: { [key: string]: number } = {};
    const finalModes: { [key: string]: string } = {};
    categories.forEach((cat) => {
      finalWeights[cat.name.trim()] = cat.weight;
      finalModes[cat.name.trim()] = cat.mode;
    });

    try {
      await updateClassroom({
        name: editName,
        weekly_schedule: scheduleString,
        semester_start_date: editStartDate,
        total_weeks: editTotalWeeks,
        grade_weights: finalWeights as any,
        grade_weight_modes: finalModes as any,
        grade_thresholds: thresholds,
        behavior_config: behaviorConfig,
      });
      setNotification({ type: "success", msg: "บันทึกการปรับตั้งค่าระบบสำเร็จ!" });
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบห้องเรียนนี้? ข้อมูลนักเรียน คะแนน และสถิติทั้งหมดจะถูกลบถาวร!")) return;
    try {
      await deleteClassroom(id);
      setNotification({ type: "success", msg: "ลบห้องเรียนสำเร็จแล้ว" });
    } catch (err: any) {
      setNotification({ type: "error", msg: "เกิดข้อผิดพลาดในการลบห้องเรียน" });
    }
  };

  const handleExecuteCleanup = async () => {
    if (!currentClassroom) return;
    if (cleanupConfirmText !== currentClassroom.name) {
      setNotification({ type: "error", msg: "กรุณาพิมพ์ชื่อห้องเรียนให้ถูกต้องเพื่อยืนยัน" });
      return;
    }

    if (!cleanAttendance && !cleanScores && !cleanReports) {
      setNotification({ type: "error", msg: "กรุณาเลือกข้อมูลอย่างน้อย 1 รายการเพื่อล้างข้อมูล" });
      return;
    }

    setIsCleaning(true);
    setNotification(null);

    try {
      await cleanupClassroomData({
        attendance: cleanAttendance,
        scores: cleanScores,
        reports: cleanReports,
      });
      setNotification({ type: "success", msg: "ล้างข้อมูลภาคเรียนเสร็จสิ้น!" });
      setShowCleanupConfirm(false);
      setCleanupConfirmText("");
      setCleanAttendance(false);
      setCleanScores(false);
      setCleanReports(false);
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการล้างข้อมูล" });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary-600" />
            <span>ตั้งค่าห้องเรียนและเกณฑ์คะแนน</span>
          </h2>
          <p className="text-slate-550 text-sm mt-1.5">
            ปรับแต่งสัดส่วนคะแนนสะสม เกณฑ์คะแนนตัดเกรด และข้อมูลวันเปิดเทอมรายวิชา
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างห้องเรียน</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
              : "bg-rose-50 border-rose-200 text-rose-600"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* Grid: Create or List + Config Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Class list */}
        <div className="glass-panel rounded-3xl p-6 bg-white border border-slate-200 lg:col-span-1 space-y-4">
          <h3 className="text-base font-bold text-slate-800">ห้องเรียนทั้งหมด</h3>
          
          {isCreating ? (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 glow-input">
              <h4 className="text-sm font-bold text-primary-600">สร้างวิชาใหม่</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">ชื่อห้องเรียน/วิชา</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ม.6/2 คอมพิวเตอร์"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-primary-500 outline-none text-xs text-slate-800 glow-input"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">วันเรียนในสัปดาห์ (เลือกได้หลายวัน)</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {WEEKDAYS.map((day, idx) => {
                      const isSelected = newWeeklyScheduleDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (newWeeklyScheduleDays.length > 1) {
                                setNewWeeklyScheduleDays(newWeeklyScheduleDays.filter((d) => d !== day));
                              }
                            } else {
                              setNewWeeklyScheduleDays([...newWeeklyScheduleDays, day]);
                            }
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                          title={day}
                        >
                          {WEEKDAYS_SHORT[idx]}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    วันเรียน: {newWeeklyScheduleDays.join(", ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">วันเปิดเทอม</label>
                    <input
                      type="date"
                      required
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-primary-500 outline-none text-[10px] text-slate-700 glow-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">สัปดาห์ทั้งหมด</label>
                    <input
                      type="number"
                      required
                      value={newTotalWeeks}
                      onChange={(e) => setNewTotalWeeks(parseInt(e.target.value) || 18)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-primary-500 outline-none text-xs text-slate-700 glow-input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          ) : null}

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {classrooms.map((cls) => (
              <div
                key={cls.id}
                onClick={() => handleSelectClass(cls)}
                className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center cursor-pointer transition-all ${
                  currentClassroom?.id === cls.id
                    ? "bg-primary-50 border-primary-200 text-primary-755 shadow-md shadow-primary-600/5"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${currentClassroom?.id === cls.id ? "bg-primary-100 text-primary-700" : "bg-slate-200/50 text-slate-500"}`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${currentClassroom?.id === cls.id ? "text-primary-800" : "text-slate-700"}`}>{cls.name}</h4>
                    <p className="text-[10px] text-slate-450 mt-1">{cls.weekly_schedule}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cls.id);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    title="ลบห้องเรียน"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
            
            {classrooms.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                ยังไม่มีการสร้างห้องเรียน
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Configuration editor */}
        <div className="lg:col-span-2 space-y-6">
          {currentClassroom ? (
            <div className="glass-panel rounded-3xl p-6 bg-white border border-slate-200 space-y-6">
              
              {/* Part 1: Info */}
              <div className="border-b border-slate-100 pb-6">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Calendar className="w-4.5 h-4.5 text-primary-600" />
                  <span>ข้อมูลวิชา: {currentClassroom.name}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">ชื่อห้องเรียน/วิชา</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full mt-1.5 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary-500 outline-none text-sm text-slate-805 font-semibold glow-input"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">วันเรียนในสัปดาห์ (เลือกได้หลายวัน)</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {WEEKDAYS.map((day, idx) => {
                        const isSelected = editScheduleDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (editScheduleDays.length > 1) {
                                  setEditScheduleDays(editScheduleDays.filter((d) => d !== day));
                                }
                              } else {
                                setEditScheduleDays([...editScheduleDays, day]);
                              }
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                            title={day}
                          >
                            {WEEKDAYS_SHORT[idx]}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      วันเรียน: {editScheduleDays.join(", ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400">วันเปิดเทอม</label>
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full mt-1.5 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary-500 outline-none text-xs text-slate-700 font-semibold glow-input"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400">สัปดาห์ทั้งหมด</label>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={editTotalWeeks}
                        onChange={(e) => setEditTotalWeeks(parseInt(e.target.value) || 18)}
                        className="w-full mt-1.5 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary-500 outline-none text-sm text-slate-700 font-semibold glow-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 2: Weights & Categories Configurations */}
              <div className="border-b border-slate-100 pb-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Sliders className="w-4.5 h-4.5 text-primary-600" />
                      <span>สัดส่วนและหมวดหมู่การประเมิน (Grade Categories & Weights)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ครูสามารถเพิ่ม ลบ หรือแก้ไขหมวดหมู่ได้ สัดส่วนของทุกหมวดหมู่รวมกันต้องเท่ากับ 100% เสมอ
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                        categories.reduce((s, cat) => s + cat.weight, 0) === 100
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : "bg-rose-50 border-rose-200 text-rose-600"
                      }`}
                    >
                      รวมกัน: {categories.reduce((s, cat) => s + cat.weight, 0)}%
                    </span>

                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มหมวดหมู่</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {categories.map((cat) => {
                    const locked = isLockedCategory(cat.name);
                    return (
                      <div
                        key={cat.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4 hover:border-slate-300 transition-colors"
                      >
                        {/* Name Input */}
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ชื่อหมวดหมู่คะแนน</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={cat.name}
                              disabled={locked}
                              onChange={(e) => handleUpdateCategoryName(cat.id, e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border outline-none text-xs font-semibold glow-input ${
                                locked
                                  ? "bg-slate-200/60 border-slate-300 text-slate-500 pl-8 cursor-not-allowed"
                                  : "bg-white border-slate-200 text-slate-800 focus:border-primary-500"
                              }`}
                              placeholder="เช่น ใบงาน, Quiz"
                            />
                            {locked && (
                              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          {locked && (
                            <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                              🔒 ล็อคระบบ (จำเป็นต่อการคิดคะแนนจิตพิสัย/พฤติกรรมการเข้าเรียน)
                            </span>
                          )}
                        </div>

                        {/* Weight Slider + Value input */}
                        <div className="flex-1 min-w-[180px]">
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1">
                            <span>สัดส่วนน้ำหนักคะแนน</span>
                            <span className="text-primary-600 font-bold text-xs">{cat.weight}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={cat.weight}
                              onChange={(e) => handleUpdateCategoryWeight(cat.id, parseInt(e.target.value) || 0)}
                              className="flex-1 accent-primary-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                            />
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={cat.weight}
                              onChange={(e) => handleUpdateCategoryWeight(cat.id, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                              className="w-16 text-center px-2 py-1 bg-white border border-slate-200 focus:border-primary-500 outline-none rounded-lg text-xs font-bold glow-input"
                            />
                          </div>
                        </div>

                        {/* Calculation Mode Dropdown */}
                        <div className="w-full md:w-[180px]">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">วิธีการคำนวณคะแนนย่อย</label>
                          <select
                            value={cat.mode}
                            onChange={(e) => handleUpdateCategoryMode(cat.id, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-primary-500 outline-none text-xs font-semibold text-slate-700 glow-input"
                          >
                            <option value="proportional">ตามสัดส่วนคะแนนเต็ม (Proportional)</option>
                            <option value="equal">เฉลี่ยน้ำหนักเท่ากันทุกงาน (Equal)</option>
                            <option value="manual">กำหนดแยกชิ้นงาน (Manual Weight)</option>
                          </select>
                        </div>

                        {/* Delete Button */}
                        <div className="md:pt-4 flex justify-end">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => handleDeleteCategory(cat.id)}
                            className={`p-2.5 rounded-xl border transition-all ${
                              locked
                                ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-50"
                                : "bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100 hover:border-rose-200 active:scale-[0.95]"
                            }`}
                            title={locked ? "ไม่สามารถลบหมวดหมู่ระบบได้" : "ลบหมวดหมู่"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {categories.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      กรุณากดปุ่ม &quot;เพิ่มหมวดหมู่&quot; เพื่อเริ่มต้นกำหนดน้ำหนักการคิดเกรด
                    </div>
                  )}
                </div>

                {/* Grade Calculation Method Settings */}
                <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      โมเดลการคิดคะแนนรวมวิชา (Final Grade Calculation Model)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      กำหนดวิธีคำนวณคะแนนรวมสะสมเมื่อสิ้นสุดภาคเรียน หรือการกระจายสัดส่วนคะแนนชิ้นงาน
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="w-full sm:w-[450px]">
                      <select
                        value={behaviorConfig.scoreCalculationMethod || "deductive"}
                        onChange={(e) => setBehaviorConfig({ ...behaviorConfig, scoreCalculationMethod: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-primary-500 outline-none text-xs font-semibold text-slate-750 glow-input"
                      >
                        <option value="deductive">คะแนนตั้งต้นเต็ม 100% แล้วหักออก (Deductive Weighting - แนะนำ)</option>
                        <option value="active_rescaling">คำนวณตามสัดส่วนงานที่มีจริง ณ ปัจจุบัน (Active Rescaling)</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      {behaviorConfig.scoreCalculationMethod === "deductive" ? (
                        <span className="text-emerald-600 font-medium">
                          💡 แนะนำ: หมวดที่ยังไม่สั่งงานจะเปรียบเสมือนได้เต็มชั่วคราว การขาดส่งงานแรกจะไม่ทำให้คะแนนรวมตกฮวบ (เช่น ขาดงานแรก 15% เกรดรวมลดเหลือ 85% แทนที่จะตกเหลือ 50% หรือ 0%)
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">
                          ⚠️ คำนวณตามงานที่มีจริง: หมวดที่ยังไม่สั่งงานจะถูกตัดออกและปรับส่วนที่เหลือขึ้นมาแทน (เช่น ถ้าเพิ่งสร้างแค่งานแรกแล้วขาดส่ง เกรดรวมจะตกเหลือ 50% หรือ 0% ทันที)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Behavioral Score Settings */}
                <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      ระบบคำนวณคะแนนหมวดจิตพิสัย (Behavioral & Attendance Score Engine)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      เลือกให้ระบบคำนวณคะแนนในหมวด &quot;จิตพิสัย&quot; อัตโนมัติจากการเช็คชื่อเข้าเรียนและการส่งงาน หรือสร้างชิ้นงานกรอกคะแนนสะสมเอง
                    </p>
                  </div>
                  
                  <div className="w-full sm:w-[350px]">
                    <select
                      value={behaviorConfig.gradingMode || "auto"}
                      onChange={(e) => setBehaviorConfig({ ...behaviorConfig, gradingMode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-primary-500 outline-none text-xs font-semibold text-slate-750 glow-input"
                    >
                      <option value="auto">คำนวณอัตโนมัติ (จากระบบเช็คชื่อและประวัติส่งงาน)</option>
                      <option value="manual">กรอกคะแนนเอง (สร้างชิ้นงานย่อยเองเหมือนหมวดหมู่อื่น)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400">จำนวนครั้งที่ขาดได้สูงสุด (Max Absences)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={behaviorConfig.maxAbsencesAllowed ?? 4}
                        onChange={(e) => setBehaviorConfig({ ...behaviorConfig, maxAbsencesAllowed: parseInt(e.target.value) || 4 })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-xs text-slate-800 glow-input font-bold"
                      />
                      <p className="text-[9px] text-slate-400 mt-1">ขาดเกินกำหนดจะขึ้นสถานะเสี่ยงวิกฤต (สีแดง) ทันที</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400">มาสายสะสมเท่ากับขาด 1 ครั้ง (Lates to Absence)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={behaviorConfig.latesPerAbsence ?? 3}
                        onChange={(e) => setBehaviorConfig({ ...behaviorConfig, latesPerAbsence: parseInt(e.target.value) || 3 })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-xs text-slate-800 glow-input font-bold"
                      />
                      <p className="text-[9px] text-slate-400 mt-1">เมื่อสายครบทุกๆ N ครั้ง จะแปลงเป็นวันขาดเรียน 1 วัน</p>
                    </div>
                  </div>

                  {(behaviorConfig.gradingMode || "auto") === "auto" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200/60">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">หักขาดเรียน (ครั้งละ)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={behaviorConfig.deductAbsent}
                          onChange={(e) => setBehaviorConfig({ ...behaviorConfig, deductAbsent: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none text-xs text-center text-slate-800 glow-input font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">หักมาสาย (ครั้งละ)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={behaviorConfig.deductLate}
                          onChange={(e) => setBehaviorConfig({ ...behaviorConfig, deductLate: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none text-xs text-center text-slate-800 glow-input font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">หักขาดส่งงาน (ชิ้นละ)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={behaviorConfig.deductMissing}
                          onChange={(e) => setBehaviorConfig({ ...behaviorConfig, deductMissing: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none text-xs text-center text-slate-800 glow-input font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">หักส่งงานช้า (ชิ้นละ)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={behaviorConfig.deductLateSubmission}
                          onChange={(e) => setBehaviorConfig({ ...behaviorConfig, deductLateSubmission: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none text-xs text-center text-slate-800 glow-input font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Part 3: Thresholds configurations */}
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Settings className="w-4.5 h-4.5 text-primary-600" />
                  <span>เกณฑ์การตัดเกรด (Grade Thresholds)</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">เกรด 4.0 (คะแนนขึ้นไป)</label>
                    <input
                      type="number"
                      value={thresholds.g4}
                      onChange={(e) => setThresholds({ ...thresholds, g4: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm text-center text-slate-800 glow-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">เกรด 3.5 (คะแนนขึ้นไป)</label>
                    <input
                      type="number"
                      value={thresholds.g35}
                      onChange={(e) => setThresholds({ ...thresholds, g35: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm text-center text-slate-800 glow-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">เกรด 3.0 (คะแนนขึ้นไป)</label>
                    <input
                      type="number"
                      value={thresholds.g3}
                      onChange={(e) => setThresholds({ ...thresholds, g3: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm text-center text-slate-800 glow-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">เกรด 2.5 (คะแนนขึ้นไป)</label>
                    <input
                      type="number"
                      value={thresholds.g25}
                      onChange={(e) => setThresholds({ ...thresholds, g25: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm text-center text-slate-800 glow-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">เกรด 2.0 (คะแนนขึ้นไป)</label>
                    <input
                      type="number"
                      value={thresholds.g2}
                      onChange={(e) => setThresholds({ ...thresholds, g2: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm text-center text-slate-800 glow-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">เกรด 1.5 (คะแนนขึ้นไป)</label>
                    <input
                      type="number"
                      value={thresholds.g15}
                      onChange={(e) => setThresholds({ ...thresholds, g15: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm text-center text-slate-800 glow-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">เกรด 1.0 (คะแนนขึ้นไป)</label>
                    <input
                      type="number"
                      value={thresholds.g1}
                      onChange={(e) => setThresholds({ ...thresholds, g1: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm text-center text-slate-800 glow-input"
                    />
                  </div>
                  <div className="flex flex-col justify-end text-center p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                    <span className="text-[10px] uppercase font-bold text-rose-500">เกรด 0 (มีคะแนนต่ำกว่า)</span>
                    <span className="text-sm font-black mt-1.5">&lt; {thresholds.g1} คะแนน</span>
                  </div>
                </div>
              </div>

              {/* Part 4: Cleanup & Storage Management Section */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                  <span>ล้างข้อมูลภาคเรียน / จัดการพื้นที่ระบบ (Semester Cleanup & Storage Management)</span>
                </h3>

                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-slate-700 space-y-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-700">คำเตือนระบบความปลอดภัย</p>
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        การดำเนินการล้างข้อมูลนี้จะลบข้อมูลออกอย่างถาวรตามที่ระบุ เพื่อล้างสถิติสำหรับการเริ่มภาคเรียนใหม่ หรือช่วยเพิ่มพื้นที่จัดเก็บข้อมูลในแผนบริการฟรีของระบบคลาวด์ (โดยเฉพาะการประหยัดพื้นที่จากรายงาน AI)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cleanAttendance}
                        onChange={(e) => setCleanAttendance(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">ล้างเวลาเรียน</p>
                        <p className="text-[9px] text-slate-400">ลบประวัติการเช็คชื่อทั้งหมด</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cleanScores}
                        onChange={(e) => setCleanScores(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">ล้างคะแนนสะสม</p>
                        <p className="text-[9px] text-slate-400">ลบคะแนนชิ้นงาน/จิตพิสัยทั้งหมด</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cleanReports}
                        onChange={(e) => setCleanReports(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">ล้างรายงาน AI</p>
                        <p className="text-[9px] text-slate-400">ลบรายงานการวิเคราะห์สะสม</p>
                      </div>
                    </label>
                  </div>

                  {showCleanupConfirm ? (
                    <div className="p-4 rounded-xl bg-white border border-rose-200 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-rose-700">ยืนยันการล้างข้อมูลอย่างถาวร</p>
                        <p className="text-[10px] text-slate-500">
                          กรุณาพิมพ์ชื่อห้องเรียน <span className="font-bold text-slate-800">&quot;{currentClassroom.name}&quot;</span> ด้านล่าง เพื่อความปลอดภัยก่อนเริ่มดำเนินการ:
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="พิมพ์ชื่อห้องเรียนให้ตรง..."
                          value={cleanupConfirmText}
                          onChange={(e) => setCleanupConfirmText(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCleanupConfirm(false);
                            setCleanupConfirmText("");
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={handleExecuteCleanup}
                          disabled={isCleaning || cleanupConfirmText !== currentClassroom.name}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <span>{isCleaning ? "กำลังล้าง..." : "ยืนยันการลบ"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!cleanAttendance && !cleanScores && !cleanReports) {
                            setNotification({ type: "error", msg: "กรุณาเลือกข้อมูลอย่างน้อย 1 รายการเพื่อล้างข้อมูล" });
                            return;
                          }
                          setShowCleanupConfirm(true);
                          setCleanupConfirmText("");
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>เริ่มล้างข้อมูลที่เลือก</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "กำลังบันทึก..." : "บันทึกการปรับแต่งทั้งหมด"}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 border-slate-200 text-center flex flex-col items-center justify-center bg-white">
              <AlertCircle className="w-12 h-12 text-slate-400 mb-3" />
              <h4 className="text-base font-bold text-slate-600">ยังไม่ได้เลือกวิชา</h4>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">
                กรุณาคลิกเลือกห้องเรียนในรายการด้านซ้าย หรือคลิกปุ่ม &quot;สร้างห้องเรียน&quot; เพื่อเริ่มต้นกำหนดสัดส่วนคะแนนสะสมและวันเรียน
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
