"use client";

import { useState, useEffect } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { calculateFinalGrade } from "@/utils/mathUtils";
import {
  Award,
  Plus,
  Trash2,
  Edit3,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  CheckSquare,
  Clock,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ListOrdered
} from "lucide-react";
import * as XLSX from "xlsx";

const isLockedCategory = (name: string, gradingMode?: string) => {
  if (gradingMode === "manual") return false;
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

const componentColors: { [key: string]: { bg: string, text: string } } = {
  attendance: { bg: "bg-primary/10", text: "text-primary" },
  homework: { bg: "bg-secondary-container/20", text: "text-secondary" },
  midterm: { bg: "bg-warning-amber/10", text: "text-warning-amber" },
  final: { bg: "bg-success-emerald/10", text: "text-success-emerald" },
};

const customPalettes = [
  { bg: "bg-sky-500/10", text: "text-sky-600" },
  { bg: "bg-indigo-500/10", text: "text-indigo-600" },
  { bg: "bg-purple-500/10", text: "text-purple-600" },
  { bg: "bg-pink-500/10", text: "text-pink-600" },
  { bg: "bg-teal-500/10", text: "text-teal-600" },
  { bg: "bg-orange-500/10", text: "text-orange-600" },
];

const getComponentStyle = (compKey: string, index: number, gradingMode?: string) => {
  if (isLockedCategory(compKey, gradingMode)) {
    return componentColors.attendance;
  }
  if (componentColors[compKey]) {
    return componentColors[compKey];
  }
  return customPalettes[index % customPalettes.length];
};

export default function GradebookPage() {
  const {
    currentClassroom,
    students,
    assignments,
    attendance,
    scores,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    saveScores,
    updateClassroom
  } = useClassroom();

  // Modal State for creating assignment
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Assignment Form State
  const [name, setName] = useState("");
  const [component, setComponent] = useState("homework");
  const [maxScore, setMaxScore] = useState(10);
  const [type, setType] = useState<"score" | "check">("score");
  const [manualWeight, setManualWeight] = useState(100);

  // Modal State for editing assignment
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  
  // Edit Assignment Form State
  const [editName, setEditName] = useState("");
  const [editComponent, setEditComponent] = useState("homework");
  const [editMaxScore, setEditMaxScore] = useState(10);
  const [editType, setEditType] = useState<"score" | "check">("score");
  const [editManualWeight, setEditManualWeight] = useState(100);

  // Filter component state (all, attendance, homework, midterm, final)
  const [filterComponent, setFilterComponent] = useState("all");

  // Modal State for rearranging assignments
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [tempOrder, setTempOrder] = useState<any[]>([]);

  // Sync default component when currentClassroom weights change
  useEffect(() => {
    if (currentClassroom?.grade_weights) {
      const activeNonLocked = Object.keys(currentClassroom.grade_weights).filter(
        (key) => !isLockedCategory(key, currentClassroom.behavior_config?.gradingMode)
      );
      if (activeNonLocked.length > 0) {
        setComponent(activeNonLocked[0]);
      }
    }
  }, [currentClassroom]);

  // Sort assignments using classroom configuration
  const getSortedAssignments = (list: typeof assignments) => {
    const order = currentClassroom?.behavior_config?.assignment_order || [];
    return [...list].sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  };

  const sortedAssignments = getSortedAssignments(assignments);

  // Score spreadsheet matrix state
  // key: studentId -> assignmentId -> score record
  const [localScores, setLocalScores] = useState<{
    [studentId: string]: {
      [assignmentId: string]: { score: number | null; isLate: boolean };
    };
  }>({});
  
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Initialize scores grid when classroom data changes
  useEffect(() => {
    if (students.length > 0 && assignments.length > 0) {
      const initialScores: typeof localScores = {};
      
      students.forEach((s) => {
        initialScores[s.id] = {};
        assignments.forEach((a) => {
          const record = scores.find((sc) => sc.student_id === s.id && sc.assignment_id === a.id);
          initialScores[s.id][a.id] = {
            score: record ? record.score : null,
            isLate: record ? record.is_late : false,
          };
        });
      });
      
      setLocalScores(initialScores);
      setNotification(null);
    }
  }, [students, assignments, scores]);

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Award className="w-16 h-16 text-slate-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-700">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-500 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนเข้าสู่เมนูบันทึกคะแนน</p>
      </div>
    );
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!name.trim()) return;

    try {
      await createAssignment(name, component, maxScore, type, manualWeight);
      setName("");
      setShowCreateModal(false);
      setNotification({ type: "success", msg: `สร้างชิ้นงาน "${name}" สำเร็จ!` });
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "ล้มเหลวในการสร้างชิ้นงาน" });
    }
  };

  const handleOpenEditModal = (ass: any) => {
    setEditingAssignment(ass);
    setEditName(ass.name);
    setEditComponent(ass.grade_component);
    setEditMaxScore(ass.max_score);
    setEditType(ass.assignment_type as "score" | "check");
    setEditManualWeight(ass.assignment_weight);
    setShowEditModal(true);
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !editName.trim()) return;
    setNotification(null);

    try {
      await updateAssignment(editingAssignment.id, {
        name: editName,
        grade_component: editComponent,
        max_score: editMaxScore,
        assignment_type: editType,
        assignment_weight: editManualWeight,
      });
      setShowEditModal(false);
      setEditingAssignment(null);
      setNotification({ type: "success", msg: `แก้ไขชิ้นงาน "${editName}" สำเร็จ!` });
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "ล้มเหลวในการแก้ไขชิ้นงาน" });
    }
  };

  const handleDeleteAssignment = async (id: string, name: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบชิ้นงาน "${name}"? คะแนนที่กรอกไว้ของนักเรียนทุกคนจะถูกลบถาวร!`)) return;

    try {
      await deleteAssignment(id);
      setNotification({ type: "success", msg: "ลบชิ้นงานเรียบร้อยแล้ว" });
    } catch (err: any) {
      setNotification({ type: "error", msg: "ล้มเหลวในการลบชิ้นงาน" });
    }
  };

  const handleMoveAssignment = async (assignmentId: string, direction: "left" | "right") => {
    const currentOrder = currentClassroom.behavior_config?.assignment_order || assignments.map(a => a.id);
    const fullOrder = [...currentOrder];
    assignments.forEach(a => {
      if (!fullOrder.includes(a.id)) {
        fullOrder.push(a.id);
      }
    });
    const activeOrder = fullOrder.filter(id => assignments.some(a => a.id === id));

    const filteredList = filteredAssignments;
    const filteredIndex = filteredList.findIndex(a => a.id === assignmentId);
    if (filteredIndex === -1) return;

    const siblingIndex = direction === "left" ? filteredIndex - 1 : filteredIndex + 1;
    if (siblingIndex < 0 || siblingIndex >= filteredList.length) return;

    const siblingId = filteredList[siblingIndex].id;

    const idxA = activeOrder.indexOf(assignmentId);
    const idxB = activeOrder.indexOf(siblingId);
    if (idxA !== -1 && idxB !== -1) {
      const temp = activeOrder[idxA];
      activeOrder[idxA] = activeOrder[idxB];
      activeOrder[idxB] = temp;
    }

    try {
      await updateClassroom({
        behavior_config: {
          ...currentClassroom.behavior_config,
          assignment_order: activeOrder,
        }
      });
    } catch (err: any) {
      setNotification({ type: "error", msg: "ล้มเหลวในการจัดลำดับงาน" });
    }
  };

  // Sync temp order when modal opens
  useEffect(() => {
    if (showOrderModal) {
      const sorted = getSortedAssignments(assignments);
      setTempOrder(sorted);
    }
  }, [showOrderModal, assignments]);

  const handleSaveOrder = async () => {
    try {
      await updateClassroom({
        behavior_config: {
          ...currentClassroom.behavior_config,
          assignment_order: tempOrder.map(a => a.id),
        }
      });
      setShowOrderModal(false);
      setNotification({ type: "success", msg: "บันทึกการจัดเรียงลำดับงานสำเร็จ!" });
    } catch (err: any) {
      setNotification({ type: "error", msg: "ล้มเหลวในการบันทึกการจัดเรียงลำดับงาน" });
    }
  };

  const handleScoreChange = (studentId: string, assignmentId: string, value: string) => {
    const targetAss = assignments.find((a) => a.id === assignmentId);
    if (!targetAss) return;

    const numeric = value === "" ? null : parseFloat(value);
    
    // Validate bounds
    if (numeric !== null) {
      if (numeric < 0 || numeric > targetAss.max_score) {
        return; // ignore out of bounds
      }
    }

    setLocalScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [assignmentId]: {
          ...prev[studentId]?.[assignmentId],
          score: numeric,
        },
      },
    }));
    setNotification(null);
  };

  const handleLateToggle = (studentId: string, assignmentId: string) => {
    setLocalScores((prev) => {
      const cell = prev[studentId]?.[assignmentId] || { score: null, isLate: false };
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [assignmentId]: {
            ...cell,
            isLate: !cell.isLate,
          },
        },
      };
    });
    setNotification(null);
  };

  const handleCheckChange = (studentId: string, assignmentId: string, checked: boolean) => {
    const targetAss = assignments.find((a) => a.id === assignmentId);
    if (!targetAss) return;

    setLocalScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [assignmentId]: {
          ...prev[studentId]?.[assignmentId],
          score: checked ? targetAss.max_score : 0,
        },
      },
    }));
    setNotification(null);
  };

  const handleSaveScores = async () => {
    setSaving(true);
    setNotification(null);

    const scoresPayload: { studentId: string; assignmentId: string; score: number | null; isLate: boolean }[] = [];

    Object.keys(localScores).forEach((studentId) => {
      Object.keys(localScores[studentId]).forEach((assignmentId) => {
        scoresPayload.push({
          studentId,
          assignmentId,
          score: localScores[studentId][assignmentId].score,
          isLate: localScores[studentId][assignmentId].isLate,
        });
      });
    });

    try {
      await saveScores(scoresPayload);
      setNotification({ type: "success", msg: "บันทึกผลคะแนนและสถิติส่งงานทั้งหมดสำเร็จ!" });
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการบันทึกคะแนน" });
    } finally {
      setSaving(false);
    }
  };

  // Export spreadsheet matrix to Excel
  const handleExportGrid = () => {
    const headers = ["รหัสประจำตัว", "ชื่อ-นามสกุล", "คะแนนสะสม (%)"];
    const filteredAsss = sortedAssignments.filter((a) => {
      if (filterComponent === "all") return true;
      return a.grade_component === filterComponent;
    });

    filteredAsss.forEach((a) => {
      headers.push(`${a.name} (เต็ม ${a.max_score})`);
    });

    const rows = students.map((s) => {
      const studentAssignments = sortedAssignments.map((a) => {
        const cell = localScores[s.id]?.[a.id] || { score: null, isLate: false };
        return {
          assignmentId: a.id,
          score: cell.score,
          maxScore: a.max_score,
          assignmentType: a.assignment_type as "score" | "check",
          isLate: cell.isLate,
          gradeComponent: a.grade_component,
          manualWeight: a.assignment_weight,
        };
      });
      
      const stdAttendance = attendance.filter((att) => att.student_id === s.id);
      
      const gradeResult = calculateFinalGrade(
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

      const rowData = [
        s.student_code,
        `${s.prefix || ""}${s.first_name} ${s.last_name}`,
        `${gradeResult.finalPercentage}%`,
      ];

      filteredAsss.forEach((a) => {
        const cell = localScores[s.id]?.[a.id];
        if (cell) {
          if (cell.score === null) {
            rowData.push("-");
          } else {
            rowData.push(`${cell.score}${cell.isLate ? " (L)" : ""}`);
          }
        } else {
          rowData.push("-");
        }
      });

      return rowData;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ตารางคะแนน");
    XLSX.writeFile(wb, `ตารางคะแนน_${currentClassroom.name}.xlsx`);
  };

  const getComponentThaiName = (comp: string) => {
    switch (comp) {
      case "attendance":
        return "จิตพิสัย/เข้าเรียน";
      case "homework":
        return "การบ้าน/คะแนนเก็บ";
      case "midterm":
        return "สอบกลางภาค";
      case "final":
        return "สอบปลายภาค";
      default:
        return comp;
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    assignmentIndex: number
  ) => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const nextInput = document.querySelector<HTMLInputElement>(
        `.score-input-${rowIndex + 1}-${assignmentIndex}`
      );
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.querySelector<HTMLInputElement>(
        `.score-input-${rowIndex - 1}-${assignmentIndex}`
      );
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    } else if (e.key === "ArrowRight") {
      const nextColInput = document.querySelector<HTMLInputElement>(
        `.score-input-${rowIndex}-${assignmentIndex + 1}`
      );
      if (nextColInput) {
        nextColInput.focus();
        nextColInput.select();
      }
    } else if (e.key === "ArrowLeft") {
      const prevColInput = document.querySelector<HTMLInputElement>(
        `.score-input-${rowIndex}-${assignmentIndex - 1}`
      );
      if (prevColInput) {
        prevColInput.focus();
        prevColInput.select();
      }
    } else if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  // Filter assignments based on dropdown selector
  const filteredAssignments = sortedAssignments.filter((a) => {
    if (filterComponent === "all") return true;
    return a.grade_component === filterComponent;
  });

  // Calculate stats for bento grid cards
  const weights = currentClassroom.grade_weights || {};
  const attWeight = weights.attendance || weights["จิตพิสัย"] || weights["จิตพิสัย/เข้าเรียน"] || weights["การเข้าเรียน"] || weights["เวลาเรียน"] || 0;
  const hwWeight = weights.homework || weights["การบ้าน"] || weights["การบ้าน/คะแนนเก็บ"] || weights["งานเก็บ/การบ้าน"] || 0;
  const midtermWeight = weights.midterm || weights["สอบกลางภาค"] || 0;
  const finalWeight = weights.final || weights["สอบปลายภาค"] || 0;

  // AI Insight Logic
  const getAIInsightMessage = () => {
    if (students.length === 0) return "ยังไม่มีนักเรียนในระบบ";
    
    let redCount = 0;
    students.forEach((s) => {
      const studentAssignments = sortedAssignments.map((a) => {
        const cell = localScores[s.id]?.[a.id] || { score: null, isLate: false };
        return {
          assignmentId: a.id,
          score: cell.score,
          maxScore: a.max_score,
          assignmentType: a.assignment_type as "score" | "check",
          isLate: cell.isLate,
          gradeComponent: a.grade_component,
          manualWeight: a.assignment_weight,
        };
      });
      const stdAttendance = attendance.filter((att) => att.student_id === s.id);
      const gradeResult = calculateFinalGrade(
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
      if (gradeResult.risk === "red") redCount++;
    });

    if (redCount > 0) {
      return `ตรวจพบนักเรียนที่มีผลการเรียนหรือสถิติเข้าเรียนอยู่ในระดับวิกฤต ${redCount} คน ขอแนะนำให้เข้าไปตรวจสอบแนวโน้มความก้าวหน้าในหน้า AI Insights`;
    }
    return "สถิติผลการเรียนและพฤติกรรมการส่งงานของห้องเรียนอยู่ในเกณฑ์ปกติ มีความคืบหน้าการทำงานส่งตามเวลา 92%";
  };

  // Calculate Assignment Class Averages
  const getAssignmentAverage = (assignmentId: string) => {
    let sum = 0;
    let count = 0;
    students.forEach((s) => {
      const val = localScores[s.id]?.[assignmentId]?.score;
      if (val !== null && val !== undefined) {
        sum += val;
        count++;
      }
    });
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
  };

  // Calculate Submission Stats for an Assignment
  const getSubmissionStats = (assignmentId: string) => {
    let submittedOnTime = 0;
    let submittedLate = 0;
    let missing = 0;
    const total = students.length;

    students.forEach((s) => {
      const cell = localScores[s.id]?.[assignmentId];
      if (cell && cell.score !== null) {
        if (cell.isLate) {
          submittedLate++;
        } else {
          submittedOnTime++;
        }
      } else {
        missing++;
      }
    });

    const submittedTotal = submittedOnTime + submittedLate;
    const percentage = total > 0 ? (submittedTotal / total) * 100 : 0;

    return {
      submittedOnTime,
      submittedLate,
      missing,
      total,
      submittedTotal,
      percentage,
    };
  };

  // Calculate Class Average percentage overall
  const getClassFinalAverage = () => {
    if (students.length === 0) return 0;
    let sum = 0;
    let count = 0;
    students.forEach((s) => {
      const studentAssignments = sortedAssignments.map((a) => {
        const cell = localScores[s.id]?.[a.id] || { score: null, isLate: false };
        return {
          assignmentId: a.id,
          score: cell.score,
          maxScore: a.max_score,
          assignmentType: a.assignment_type as "score" | "check",
          isLate: cell.isLate,
          gradeComponent: a.grade_component,
          manualWeight: a.assignment_weight,
        };
      });
      const stdAttendance = attendance.filter((att) => att.student_id === s.id);
      const result = calculateFinalGrade(
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
      sum += result.finalPercentage;
      count++;
    });
    return count > 0 ? Math.round(sum / count) : 0;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface flex items-center gap-3">
            <Award className="w-8 h-8 text-primary" />
            <span>สมุดบันทึกคะแนนและการบ้าน (Classroom Gradebook)</span>
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1.5">
            วิชา{currentClassroom.name} • บันทึกคะแนนสะสม โครงสร้างสัดส่วนคะแนน ปพ.5
          </p>
        </div>
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
              className="appearance-none bg-surface-container-lowest border border-slate-200 rounded-lg py-2 pl-4 pr-10 text-label-md font-label-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              <option value="all">ดูงานทั้งหมด (All)</option>
              {Object.keys(currentClassroom.grade_weights || {})
                .filter((key) => !isLockedCategory(key, currentClassroom.behavior_config?.gradingMode))
                .map((key) => (
                  <option key={key} value={key}>
                    เฉพาะ{getComponentThaiName(key)}
                  </option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
              <span className="block w-4 h-4 border-r-2 border-b-2 border-slate-400 rotate-45 -translate-y-1" />
            </div>
          </div>
          
          <button
            onClick={handleExportGrid}
            disabled={students.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest border border-slate-200 text-label-md font-label-md text-slate-900 hover:bg-surface-container-low shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowOrderModal(true)}
            disabled={assignments.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest border border-slate-200 text-label-md font-label-md text-slate-900 hover:bg-surface-container-low shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <ListOrdered className="w-4 h-4 text-slate-500" />
            <span>จัดลำดับงาน</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary shadow-level-1 hover:shadow-level-2 transition-all font-label-md text-label-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างงานใหม่</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-success-emerald" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-critical-rose" />
          )}
          <span className="text-sm font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* Summary Banner (Bento Grid Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Grading Policy Card */}
        <div className="col-span-1 lg:col-span-2 bg-surface-container-lowest rounded-xl p-card-padding shadow-level-1 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="text-headline-sm font-headline-sm text-on-surface">สัดส่วนคะแนน (Grading Policy)</h3>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">รวม 100%</span>
          </div>
          
          <div className="flex gap-1 h-8 w-full rounded-full overflow-hidden border border-slate-200 mt-2 text-[10px] font-bold text-center">
            {Object.keys(currentClassroom.grade_weights || {}).map((key, index) => {
              const weight = currentClassroom.grade_weights[key];
              if (weight <= 0) return null;
              const style = getComponentStyle(key, index, currentClassroom.behavior_config?.gradingMode);
              return (
                <div
                  key={key}
                  className={`${style.bg} ${style.text} flex items-center justify-center truncate px-1`}
                  style={{ width: `${weight}%` }}
                >
                  {getComponentThaiName(key)} ({weight}%)
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Quick Insight Card */}
        <div className="col-span-1 bg-surface-container-lowest rounded-xl p-card-padding shadow-level-1 border border-slate-200 border-l-4 border-l-primary flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-label-md font-label-md text-on-surface font-bold">AI Insight</h3>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant flex-1 leading-relaxed">
            {getAIInsightMessage()}
          </p>
        </div>
      </div>

      {/* Main Matrix Table Card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-level-1 border border-slate-200 flex flex-col h-[520px] overflow-hidden">
        {/* Table Controls / Header Area */}
        <div className="px-card-padding py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-label-md font-label-md text-on-surface font-bold">ตารางบันทึกคะแนนสะสมรายวิชา</span>
            <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
              <span className="w-3 h-3 rounded bg-critical-rose/10 border border-critical-rose/30 inline-block"></span>
              <span>= ขาดส่ง (Missing)</span>
              <span className="w-3 h-3 rounded bg-amber-500 inline-block ml-3"></span>
              <span>= ส่งช้า (Late)</span>
            </div>
          </div>
          
          <button
            onClick={handleSaveScores}
            disabled={saving || students.length === 0}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "กำลังบันทึก..." : "บันทึกคะแนนสะสมทั้งหมด"}</span>
          </button>
        </div>

        {/* Matrix Container */}
        {students.length > 0 ? (
          <div className="flex-1 overflow-auto matrix-scroll relative">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="sticky top-0 z-20 bg-surface-container-lowest shadow-sm">
                <tr className="border-b border-slate-200">
                  {/* Sticky columns */}
                  <th className="sticky left-0 z-30 bg-surface-container-lowest border-r border-b border-slate-200 px-4 py-3 text-label-sm font-label-sm text-outline font-semibold w-24">
                    รหัสนักเรียน
                  </th>
                  <th className="sticky left-[96px] z-30 bg-surface-container-lowest border-r border-b border-slate-200 px-4 py-3 text-label-sm font-label-sm text-outline font-semibold w-48">
                    ชื่อ-นามสกุล
                  </th>
                  <th className="sticky left-[288px] z-30 bg-slate-50 border-r border-b border-slate-200 px-4 py-3 text-label-sm font-label-sm text-outline font-semibold w-28 text-center">
                    คะแนนรวม (%)
                  </th>
                  
                  {/* Assignment Columns */}
                  {filteredAssignments.map((ass, aIdx) => {
                    const stats = getSubmissionStats(ass.id);
                    return (
                      <th key={ass.id} className="border-b border-slate-200 px-4 py-2 min-w-[140px] align-bottom hover:bg-slate-50 cursor-pointer group relative">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-primary uppercase tracking-wider font-bold">
                              {getComponentThaiName(ass.grade_component)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                disabled={aIdx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveAssignment(ass.id, "left");
                                }}
                                className="text-slate-300 hover:text-primary p-0.5 rounded transition-all disabled:opacity-20 disabled:hover:text-slate-300 cursor-pointer disabled:cursor-not-allowed"
                                title="เลื่อนซ้าย"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={aIdx === filteredAssignments.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveAssignment(ass.id, "right");
                                }}
                                className="text-slate-300 hover:text-primary p-0.5 rounded transition-all disabled:opacity-20 disabled:hover:text-slate-300 cursor-pointer disabled:cursor-not-allowed"
                                title="เลื่อนขวา"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(ass);
                                }}
                                className="text-slate-300 hover:text-primary p-0.5 rounded transition-all"
                                title="แก้ไขงานนี้"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAssignment(ass.id, ass.name);
                                }}
                                className="text-slate-300 hover:text-critical-rose p-0.5 rounded transition-all"
                                title="ลบงานนี้"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <span className="text-label-sm font-label-sm text-on-surface truncate block" title={ass.name}>
                            {ass.name}
                          </span>
                          <span className="text-[10px] text-outline font-normal">
                            เต็ม {ass.max_score}
                            {currentClassroom?.grade_weight_modes?.[ass.grade_component] === "manual" && ` (น้ำหนัก ${ass.assignment_weight}%)`}
                          </span>

                          {/* Submission statistics bar & badge */}
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 relative group/stats select-none">
                            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
                              <span>ส่งแล้ว {stats.submittedTotal}/{stats.total} คน</span>
                              <span className="text-primary font-bold">{Math.round(stats.percentage)}%</span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${stats.percentage}%` }}
                              />
                            </div>
                            {/* Detailed Hover Tooltip */}
                            <div className="absolute top-full left-0 mt-2 hidden group-hover/stats:block z-50 w-48 p-3 rounded-xl bg-slate-900/95 backdrop-blur-sm border border-slate-800 text-white shadow-xl text-left pointer-events-none transition-all duration-200 font-sans">
                              <div className="text-[11px] font-bold border-b border-slate-800 pb-1.5 mb-1.5 text-slate-300">
                                รายละเอียดการส่งงาน
                              </div>
                              <div className="space-y-1.5 text-[10px] font-normal">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-success-emerald" />
                                    ส่งตรงเวลา (On-time):
                                  </span>
                                  <span className="font-bold text-success-emerald">{stats.submittedOnTime} คน</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    ส่งช้า (Late):
                                  </span>
                                  <span className="font-bold text-amber-500">{stats.submittedLate} คน</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-critical-rose" />
                                    ค้างส่ง (Missing):
                                  </span>
                                  <span className="font-bold text-critical-rose">{stats.missing} คน</span>
                                </div>
                                <div className="border-t border-slate-800 pt-1.5 mt-1.5 flex items-center justify-between text-slate-300 font-semibold">
                                  <span>รวมทั้งหมด:</span>
                                  <span>{stats.total} คน</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              
              <tbody className="text-body-sm font-body-sm bg-surface-container-lowest divide-y divide-slate-200">
                {students.map((student, rowIndex) => {
                  const studentAssignments = sortedAssignments.map((a) => {
                    const cell = localScores[student.id]?.[a.id] || { score: null, isLate: false };
                    return {
                      assignmentId: a.id,
                      score: cell.score,
                      maxScore: a.max_score,
                      assignmentType: a.assignment_type as "score" | "check",
                      isLate: cell.isLate,
                      gradeComponent: a.grade_component,
                      manualWeight: a.assignment_weight,
                    };
                  });
                  
                  const stdAttendance = attendance.filter((att) => att.student_id === student.id);
                  const gradeResult = calculateFinalGrade(
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

                  return (
                    <tr key={student.id} className="hover:bg-sky-blue/5 transition-colors group">
                      {/* Sticky student cells */}
                      <td className="sticky left-0 z-10 bg-surface-container-lowest group-hover:bg-[#f0f7ff] border-r border-slate-200 px-4 py-2 font-mono font-bold text-primary">
                        {student.student_code}
                      </td>
                      <td className="sticky left-[96px] z-10 bg-surface-container-lowest group-hover:bg-[#f0f7ff] border-r border-slate-200 px-4 py-2 font-semibold text-slate-800">
                        {`${student.prefix || ""}${student.first_name} ${student.last_name}`}
                      </td>
                      <td className={`sticky left-[288px] z-10 bg-slate-50 group-hover:bg-[#e6f0fa] border-r border-slate-200 px-4 py-2 text-center font-bold ${
                        gradeResult.risk === "red" ? "text-critical-rose" : gradeResult.risk === "yellow" ? "text-warning-amber" : "text-success-emerald"
                      }`}>
                        <span>{gradeResult.finalPercentage}%</span>
                        <span className="text-[9px] text-outline font-normal block mt-0.5">
                          (ขาด {gradeResult.totalAbsences} รอบ)
                        </span>
                      </td>
                      
                      {/* Interactive assignment score cells */}
                      {filteredAssignments.map((assignment, aIdx) => {
                        const cell = localScores[student.id]?.[assignment.id] || { score: null, isLate: false };
                        return (
                          <td key={assignment.id} className="px-4 py-2 border-r border-slate-200/50">
                            <div className="relative flex items-center justify-center gap-1.5">
                              {assignment.assignment_type === "check" ? (
                                <input
                                  type="checkbox"
                                  checked={cell.score !== null && cell.score > 0}
                                  onChange={(e) => handleCheckChange(student.id, assignment.id, e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-350 accent-primary bg-white cursor-pointer"
                                />
                              ) : (
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  max={assignment.max_score}
                                  value={cell.score === null ? "" : cell.score}
                                  placeholder="-"
                                  onChange={(e) => handleScoreChange(student.id, assignment.id, e.target.value)}
                                  className={`w-16 px-1.5 py-1 rounded border text-center text-xs font-bold outline-none transition-all score-input score-input-${rowIndex}-${aIdx} ${
                                    cell.score === null
                                      ? "bg-critical-rose/10 border-critical-rose/30 text-critical-rose placeholder-critical-rose/50"
                                      : "bg-transparent border-transparent hover:border-slate-300 focus:border-primary focus:bg-white text-slate-800"
                                  }`}
                                  onKeyDown={(e) => handleKeyDown(e, rowIndex, aIdx)}
                                  onFocus={(e) => e.currentTarget.select()}
                                />
                              )}
                              
                              <button
                                type="button"
                                onClick={() => handleLateToggle(student.id, assignment.id)}
                                className={`p-0.5 rounded transition-all cursor-pointer ${
                                  cell.isLate ? "text-amber-500 scale-110" : "text-slate-300 hover:text-slate-450 opacity-20 group-hover:opacity-100"
                                }`}
                                title="ส่งช้า (Late)"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Footer Class Averages */}
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 border-t border-slate-300 font-bold text-on-surface">
                <tr>
                  <td className="sticky left-0 z-30 bg-slate-100 border-r px-4 py-3 text-right" colSpan={2}>
                    Class Average
                  </td>
                  <td className="sticky left-[288px] z-30 bg-slate-100 border-r px-4 py-3 text-center text-primary">
                    {getClassFinalAverage()}%
                  </td>
                  
                  {filteredAssignments.map((ass) => (
                    <td key={ass.id} className="px-4 py-3 text-center border-r border-slate-200">
                      {getAssignmentAverage(ass.id)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 font-medium">
            ยังไม่มีงานและข้อมูลนักเรียนเพื่อกรอกคะแนน
          </div>
        )}
      </div>

      {/* CREATE ASSIGNMENT GLASS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl bg-white space-y-6 mx-4 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Plus className="w-5 h-5 text-primary" />
              <span>สร้างชิ้นงาน / หัวข้อสอบใหม่</span>
            </h3>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  ชื่อชิ้นงาน / หัวข้อสอบ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การบ้านบทที่ 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-800 glow-input outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                    หมวดหมู่คะแนน
                  </label>
                  <select
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-700 glow-input outline-none text-sm cursor-pointer"
                  >
                    {Object.keys(currentClassroom.grade_weights || {})
                      .filter((key) => !isLockedCategory(key, currentClassroom.behavior_config?.gradingMode))
                      .map((key) => (
                        <option key={key} value={key}>
                          {getComponentThaiName(key)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                    ประเภทการวัดผล
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value as "score" | "check";
                      setType(newType);
                      if (newType === "check" && maxScore === 10) {
                        setMaxScore(1);
                      } else if (newType === "score" && maxScore === 1) {
                        setMaxScore(10);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-700 glow-input outline-none text-sm cursor-pointer"
                  >
                    <option value="score">คะแนนเต็มตัวเลข</option>
                    <option value="check">ผ่าน/ไม่ผ่าน (Checklist)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={currentClassroom?.grade_weight_modes?.[component] === "manual" ? "col-span-1" : "col-span-2"}>
                  <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                    คะแนนเต็ม (Max Score)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={maxScore}
                    onChange={(e) => setMaxScore(parseInt(e.target.value) || 10)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-800 glow-input outline-none text-sm font-semibold text-center"
                  />
                </div>

                {currentClassroom?.grade_weight_modes?.[component] === "manual" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                      น้ำหนักชิ้นงาน (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualWeight}
                      onChange={(e) => setManualWeight(parseInt(e.target.value) || 100)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-800 glow-input outline-none text-sm font-semibold text-center"
                      title="ใช้สำหรับการคำนวณแบบกำหนดน้ำหนักเองรายชิ้น (Manual Weight Mode)"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างชิ้นงาน</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ASSIGNMENT GLASS MODAL */}
      {showEditModal && editingAssignment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl bg-white space-y-6 mx-4 relative">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingAssignment(null);
              }}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Plus className="w-5 h-5 text-primary" />
              <span>แก้ไขชิ้นงาน / หัวข้อสอบ</span>
            </h3>

            <form onSubmit={handleUpdateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                  ชื่อชิ้นงาน / หัวข้อสอบ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การบ้านบทที่ 1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-800 glow-input outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                    หมวดหมู่คะแนน
                  </label>
                  <select
                    value={editComponent}
                    onChange={(e) => setEditComponent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-700 glow-input outline-none text-sm cursor-pointer"
                  >
                    {Object.keys(currentClassroom.grade_weights || {})
                      .filter((key) => !isLockedCategory(key, currentClassroom.behavior_config?.gradingMode))
                      .map((key) => (
                        <option key={key} value={key}>
                          {getComponentThaiName(key)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                    ประเภทการวัดผล
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => {
                      const newType = e.target.value as "score" | "check";
                      setEditType(newType);
                      if (newType === "check" && editMaxScore === 10) {
                        setEditMaxScore(1);
                      } else if (newType === "score" && editMaxScore === 1) {
                        setEditMaxScore(10);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-700 glow-input outline-none text-sm cursor-pointer"
                  >
                    <option value="score">คะแนนเต็มตัวเลข</option>
                    <option value="check">ผ่าน/ไม่ผ่าน (Checklist)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={currentClassroom?.grade_weight_modes?.[editComponent] === "manual" ? "col-span-1" : "col-span-2"}>
                  <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                    คะแนนเต็ม (Max Score)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={editMaxScore}
                    onChange={(e) => setEditMaxScore(parseInt(e.target.value) || 10)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-800 glow-input outline-none text-sm font-semibold text-center"
                  />
                </div>

                {currentClassroom?.grade_weight_modes?.[editComponent] === "manual" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                      น้ำหนักชิ้นงาน (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editManualWeight}
                      onChange={(e) => setEditManualWeight(parseInt(e.target.value) || 100)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-250 focus:border-primary text-slate-800 glow-input outline-none text-sm font-semibold text-center"
                      title="ใช้สำหรับการคำนวณแบบกำหนดน้ำหนักเองรายชิ้น (Manual Weight Mode)"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REARRANGE ASSIGNMENTS GLASS MODAL */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl bg-white space-y-6 mx-4 relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowOrderModal(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100 shrink-0">
              <ListOrdered className="w-5 h-5 text-primary" />
              <span>จัดเรียงลำดับชิ้นงาน / หัวข้อสอบ</span>
            </h3>

            <p className="text-xs text-slate-500 shrink-0 leading-relaxed">
              คุณสามารถเปลี่ยนลำดับการแสดงผลคอลัมน์ของแต่ละชิ้นงานได้โดยการใช้ปุ่มเลื่อนขึ้นหรือลง งานด้านบนจะแสดงในคอลัมน์ซ้ายสุดในตารางคะแนน
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {tempOrder.map((ass, index) => (
                <div
                  key={ass.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-150 hover:bg-slate-50 bg-white transition-all gap-3"
                >
                  <div className="flex flex-col gap-0.5 truncate">
                    <span className="text-[9px] font-bold text-primary uppercase">
                      {getComponentThaiName(ass.grade_component)}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate" title={ass.name}>
                      {ass.name}
                    </span>
                    <span className="text-[10px] text-slate-450">
                      คะแนนเต็ม: {ass.max_score}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        const nextOrder = [...tempOrder];
                        const temp = nextOrder[index];
                        nextOrder[index] = nextOrder[index - 1];
                        nextOrder[index - 1] = temp;
                        setTempOrder(nextOrder);
                      }}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-650 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="เลื่อนขึ้น"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === tempOrder.length - 1}
                      onClick={() => {
                        const nextOrder = [...tempOrder];
                        const temp = nextOrder[index];
                        nextOrder[index] = nextOrder[index + 1];
                        nextOrder[index + 1] = temp;
                        setTempOrder(nextOrder);
                      }}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-650 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="เลื่อนลง"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {tempOrder.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  ยังไม่มีชิ้นงานในห้องเรียนนี้
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all font-semibold text-sm cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white transition-all font-semibold text-sm cursor-pointer shadow-md"
              >
                บันทึกการจัดเรียง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
