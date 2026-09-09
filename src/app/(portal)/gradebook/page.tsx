"use client";

import { useState, useEffect } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { useToast } from "@/context/ToastContext";
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
  ListOrdered,
  GripVertical,
  Zap,
  RotateCcw,
  Search,
  Printer,
} from "lucide-react";
import * as XLSX from "xlsx";
import { exportSubmissionStatusExcel } from "@/utils/submissionExport";

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
  attendance: { bg: "bg-primary/10", text: "text-primary dark:text-sky-400" },
  homework: { bg: "bg-secondary-container/20", text: "text-secondary" },
  midterm: { bg: "bg-warning-amber/10", text: "text-amber-600 dark:text-amber-400" },
  final: { bg: "bg-success-emerald/10", text: "text-emerald-600 dark:text-emerald-400" },
};

const customPalettes = [
  { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400" },
  { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" },
  { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400" },
  { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" },
  { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
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
    updateClassroom,
    loading
  } = useClassroom();
  const { success: toastSuccess, error: toastError } = useToast();

  // Column dragging states
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);

  // Modal dragging states
  const [modalDraggedIndex, setModalDraggedIndex] = useState<number | null>(null);
  const [modalDragOverIndex, setModalDragOverIndex] = useState<number | null>(null);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [exportSubmissionsLoading, setExportSubmissionsLoading] = useState(false);

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
      [assignmentId: string]: {
        score: number | null;
        isLate: boolean;
        revisionStatus?: "revision" | "retest" | null;
      };
    };
  }>({});
  
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Initialize scores grid when classroom data changes
  useEffect(() => {
    if (students.length > 0 && assignments.length > 0) {
      const initialScores: typeof localScores = {};
      const pendingRevs = currentClassroom?.behavior_config?.pending_revisions || {};
      
      students.forEach((s) => {
        initialScores[s.id] = {};
        assignments.forEach((a) => {
          const record = scores.find((sc) => sc.student_id === s.id && sc.assignment_id === a.id);
          const revStatus =
            record?.revision_status ||
            pendingRevs[`${s.id}_${a.id}`] ||
            null;

          initialScores[s.id][a.id] = {
            score: record ? record.score : null,
            isLate: record ? record.is_late : false,
            revisionStatus: revStatus,
          };
        });
      });
      
      setLocalScores(initialScores);
      setNotification(null);
    }
  }, [students, assignments, scores, currentClassroom]);

  // Sync temp order when modal opens
  useEffect(() => {
    if (showOrderModal) {
      const sorted = getSortedAssignments(assignments);
      setTempOrder(sorted);
    }
  }, [showOrderModal, assignments]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse text-slate-900 dark:text-slate-100 font-body-md">
        {/* Page Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
        </div>

        {/* Summary Banner skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 glass-panel rounded-2xl p-6 bg-white dark:bg-slate-900 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          </div>
          <div className="col-span-1 glass-panel rounded-2xl p-6 bg-white dark:bg-slate-900 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[520px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-between">
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-8 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
          <div className="flex-1 p-4 space-y-4">
            <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Award className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-500 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนเข้าสู่เมนูบันทึกคะแนน</p>
      </div>
    );
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createAssignment(name, component, maxScore, type, manualWeight);
      const createdName = name;
      setName("");
      setShowCreateModal(false);
      toastSuccess(`สร้างชิ้นงาน "${createdName}" สำเร็จ!`);
    } catch (err: any) {
      toastError(err.message || "ล้มเหลวในการสร้างชิ้นงาน");
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

    try {
      await updateAssignment(editingAssignment.id, {
        name: editName,
        grade_component: editComponent,
        max_score: editMaxScore,
        assignment_type: editType,
        assignment_weight: editManualWeight,
      });
      const updatedName = editName;
      setShowEditModal(false);
      setEditingAssignment(null);
      toastSuccess(`แก้ไขชิ้นงาน "${updatedName}" สำเร็จ!`);
    } catch (err: any) {
      toastError(err.message || "ล้มเหลวในการแก้ไขชิ้นงาน");
    }
  };

  const handleDeleteAssignment = async (id: string, name: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบชิ้นงาน "${name}"? คะแนนที่กรอกไว้ของนักเรียนทุกคนจะถูกลบถาวร!`)) return;

    try {
      await deleteAssignment(id);
      toastSuccess("ลบชิ้นงานเรียบร้อยแล้ว");
    } catch (err: any) {
      toastError("ล้มเหลวในการลบชิ้นงาน");
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
      toastSuccess("จัดเรียงคอลัมน์สำเร็จ!");
    } catch (err: any) {
      toastError("ล้มเหลวในการจัดลำดับงาน");
    } finally {
      setDraggedColumnIndex(null);
      setDragOverColumnIndex(null);
    }
  };

  // Column Drag and Drop Handlers
  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumnIndex === null || draggedColumnIndex === index) return;
    setDragOverColumnIndex(index);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumnIndex(null);
  };

  const handleColumnDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColumnIndex === null || draggedColumnIndex === targetIndex) {
      setDraggedColumnIndex(null);
      setDragOverColumnIndex(null);
      return;
    }

    const currentOrder = currentClassroom.behavior_config?.assignment_order || assignments.map(a => a.id);
    const fullOrder = [...currentOrder];
    assignments.forEach(a => {
      if (!fullOrder.includes(a.id)) {
        fullOrder.push(a.id);
      }
    });
    const activeOrder = fullOrder.filter(id => assignments.some(a => a.id === id));

    const sourceId = filteredAssignments[draggedColumnIndex].id;
    const targetId = filteredAssignments[targetIndex].id;

    const idxSource = activeOrder.indexOf(sourceId);
    const idxTarget = activeOrder.indexOf(targetId);

    if (idxSource !== -1 && idxTarget !== -1) {
      const [removed] = activeOrder.splice(idxSource, 1);
      activeOrder.splice(idxTarget, 0, removed);
    }

    try {
      await updateClassroom({
        behavior_config: {
          ...currentClassroom.behavior_config,
          assignment_order: activeOrder,
        }
      });
      toastSuccess("จัดเรียงคอลัมน์สำเร็จ!");
    } catch (err: any) {
      toastError("ล้มเหลวในการจัดลำดับงาน");
    } finally {
      setDraggedColumnIndex(null);
      setDragOverColumnIndex(null);
    }
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  // Modal Drag and Drop Handlers
  const handleModalDragStart = (e: React.DragEvent, index: number) => {
    setModalDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleModalDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (modalDraggedIndex === null || modalDraggedIndex === index) return;
    setModalDragOverIndex(index);
  };

  const handleModalDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (modalDraggedIndex === null || modalDraggedIndex === targetIndex) {
      setModalDraggedIndex(null);
      setModalDragOverIndex(null);
      return;
    }

    const updated = [...tempOrder];
    const [removed] = updated.splice(modalDraggedIndex, 1);
    updated.splice(targetIndex, 0, removed);
    setTempOrder(updated);

    setModalDraggedIndex(null);
    setModalDragOverIndex(null);
  };

  const handleModalDragEnd = () => {
    setModalDraggedIndex(null);
    setModalDragOverIndex(null);
  };

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

  const handleRevisionToggle = (studentId: string, assignmentId: string) => {
    setLocalScores((prev) => {
      const cell = prev[studentId]?.[assignmentId] || {
        score: null,
        isLate: false,
        revisionStatus: null,
      };

      // Cycle: null -> "revision" (รอแก้งาน) -> "retest" (รอสอบแก้) -> null (ปกติ)
      let nextStatus: "revision" | "retest" | null = null;
      if (!cell.revisionStatus) {
        nextStatus = "revision";
      } else if (cell.revisionStatus === "revision") {
        nextStatus = "retest";
      } else {
        nextStatus = null;
      }

      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [assignmentId]: {
            ...cell,
            revisionStatus: nextStatus,
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

    const scoresPayload: { studentId: string; assignmentId: string; score: number | null; isLate: boolean }[] = [];
    const pendingRevisions: Record<string, "revision" | "retest"> = {};

    Object.keys(localScores).forEach((studentId) => {
      Object.keys(localScores[studentId]).forEach((assignmentId) => {
        const cell = localScores[studentId][assignmentId];
        scoresPayload.push({
          studentId,
          assignmentId,
          score: cell.score,
          isLate: cell.isLate,
        });
        if (cell.revisionStatus) {
          pendingRevisions[`${studentId}_${assignmentId}`] = cell.revisionStatus;
        }
      });
    });

    try {
      await saveScores(scoresPayload);
      if (currentClassroom) {
        await updateClassroom({
          behavior_config: {
            ...currentClassroom.behavior_config,
            pending_revisions: pendingRevisions,
          },
        });
      }
      toastSuccess("บันทึกผลคะแนนและสถานะส่งงานทั้งหมดสำเร็จ!");
    } catch (err: any) {
      toastError(err.message || "เกิดข้อผิดพลาดในการบันทึกคะแนน");
    } finally {
      setSaving(false);
    }
  };

  // Bulk fill max score for a specific column/assignment
  const handleFillMaxScore = (assignmentId: string) => {
    const targetAss = assignments.find((a) => a.id === assignmentId);
    if (!targetAss) return;

    if (!confirm(`คุณต้องการกรอกคะแนนเต็ม (${targetAss.max_score} คะแนน) ให้นักเรียนทุกคนในชิ้นงาน "${targetAss.name}" หรือไม่?`)) return;

    setLocalScores((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = {
          ...updated[s.id],
          [assignmentId]: {
            ...updated[s.id]?.[assignmentId],
            score: targetAss.max_score,
          },
        };
      });
      return updated;
    });

    toastSuccess(`กรอกคะแนนเต็ม (${targetAss.max_score}) ให้ทุกคนในชิ้นงาน "${targetAss.name}" เรียบร้อย!`);
    setNotification(null);
  };

  // Bulk clear score for a specific column/assignment
  const handleClearColumnScores = (assignmentId: string) => {
    const targetAss = assignments.find((a) => a.id === assignmentId);
    if (!targetAss) return;

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการล้างคะแนนทั้งหมดในชิ้นงาน "${targetAss.name}"?`)) return;

    setLocalScores((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = {
          ...updated[s.id],
          [assignmentId]: {
            ...updated[s.id]?.[assignmentId],
            score: null,
            isLate: false,
          },
        };
      });
      return updated;
    });

    toastSuccess(`ล้างคะแนนในชิ้นงาน "${targetAss.name}" เรียบร้อย!`);
    setNotification(null);
  };

  // Export spreadsheet matrix to Excel
  const handleExportGrid = () => {
    const headers = ["ลำดับ", "รหัสประจำตัว", "ชื่อ-นามสกุล", "คะแนนสะสม (%)", "เกรดคาดการณ์", "ขาดเรียน (ครั้ง)"];
    const filteredAsss = sortedAssignments.filter((a) => {
      if (filterComponent === "all") return true;
      return a.grade_component === filterComponent;
    });

    filteredAsss.forEach((a) => {
      headers.push(`${a.name} (เต็ม ${a.max_score})`);
    });

    const rows = students.map((s, idx) => {
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
        idx + 1,
        s.student_code,
        `${s.prefix || ""}${s.first_name} ${s.last_name}`,
        gradeResult.finalPercentage,
        gradeResult.grade,
        gradeResult.totalAbsences,
      ];

      filteredAsss.forEach((a) => {
        const cell = localScores[s.id]?.[a.id];
        if (cell) {
          if (cell.score === null) {
            rowData.push("-");
          } else {
            rowData.push(`${cell.score}${cell.isLate ? " (ส่งช้า)" : ""}`);
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
    XLSX.writeFile(wb, `ตารางคะแนน_${currentClassroom.name}_${new Date().toISOString().split("T")[0]}.xlsx`);
    toastSuccess("ส่งออกไฟล์ Excel ตารางคะแนนสำเร็จ!");
  };

  // Export submission status report with green/red/amber/purple cells
  const handleExportSubmissionsExcel = async () => {
    if (!currentClassroom) return;
    setExportSubmissionsLoading(true);
    try {
      // Build latest scores and pending revisions from localScores to reflect live screen state
      const effectiveScores: any[] = [];
      const pendingRevisions: Record<string, "revision" | "retest"> = {};

      students.forEach((s) => {
        assignments.forEach((a) => {
          const cell = localScores[s.id]?.[a.id];
          if (cell && cell.score !== null) {
            effectiveScores.push({
              student_id: s.id,
              assignment_id: a.id,
              score: cell.score,
              is_late: cell.isLate,
              revision_status: cell.revisionStatus,
            });
          }
          if (cell?.revisionStatus) {
            pendingRevisions[`${s.id}_${a.id}`] = cell.revisionStatus;
          }
        });
      });

      await exportSubmissionStatusExcel({
        classroomName: currentClassroom.name,
        subjectCode: currentClassroom.room_code,
        students,
        assignments,
        scores: effectiveScores.length > 0 ? effectiveScores : scores,
        assignmentOrder: currentClassroom.behavior_config?.assignment_order,
        pendingRevisions:
          Object.keys(pendingRevisions).length > 0
            ? pendingRevisions
            : currentClassroom.behavior_config?.pending_revisions,
      });
      toastSuccess("ส่งออกรายงานสถานะการส่งงาน (Excel สี) สำเร็จแล้ว!");
    } catch (err: any) {
      console.error(err);
      toastError(err?.message || "เกิดข้อผิดพลาดในการส่งออก Excel");
    } finally {
      setExportSubmissionsLoading(false);
    }
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
    let targetInput: HTMLInputElement | null = null;

    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const nextRow = Math.min(rowIndex + 1, filteredStudents.length - 1);
      targetInput = document.querySelector<HTMLInputElement>(
        `.score-input-${nextRow}-${assignmentIndex}`
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRow = Math.max(rowIndex - 1, 0);
      targetInput = document.querySelector<HTMLInputElement>(
        `.score-input-${prevRow}-${assignmentIndex}`
      );
    } else if (e.key === "ArrowRight") {
      const nextCol = Math.min(assignmentIndex + 1, filteredAssignments.length - 1);
      if (nextCol !== assignmentIndex) {
        e.preventDefault();
        targetInput = document.querySelector<HTMLInputElement>(
          `.score-input-${rowIndex}-${nextCol}`
        );
      }
    } else if (e.key === "ArrowLeft") {
      const prevCol = Math.max(assignmentIndex - 1, 0);
      if (prevCol !== assignmentIndex) {
        e.preventDefault();
        targetInput = document.querySelector<HTMLInputElement>(
          `.score-input-${rowIndex}-${prevCol}`
        );
      }
    } else if (e.key === "Escape") {
      e.currentTarget.blur();
    }

    if (targetInput) {
      targetInput.focus();
      targetInput.select();

      // Smart sticky-aware scrolling inside matrix container
      const matrixContainer = targetInput.closest(".matrix-scroll") as HTMLElement;
      if (matrixContainer) {
        const inputRect = targetInput.getBoundingClientRect();
        const containerRect = matrixContainer.getBoundingClientRect();
        
        // Sticky left boundary is 480px (120px + 240px + 120px)
        const stickyLeftThreshold = containerRect.left + 480;
        
        if (inputRect.left < stickyLeftThreshold) {
          const shiftNeeded = stickyLeftThreshold - inputRect.left + 30;
          matrixContainer.scrollLeft = Math.max(0, matrixContainer.scrollLeft - shiftNeeded);
        } else if (inputRect.right > containerRect.right - 20) {
          const shiftNeeded = inputRect.right - containerRect.right + 40;
          matrixContainer.scrollLeft += shiftNeeded;
        }

        // Sticky vertical boundaries
        const stickyTopThreshold = containerRect.top + 60;
        const stickyBottomThreshold = containerRect.bottom - 60;

        if (inputRect.top < stickyTopThreshold) {
          const shiftNeeded = stickyTopThreshold - inputRect.top + 15;
          matrixContainer.scrollTop = Math.max(0, matrixContainer.scrollTop - shiftNeeded);
        } else if (inputRect.bottom > stickyBottomThreshold) {
          const shiftNeeded = inputRect.bottom - stickyBottomThreshold + 15;
          matrixContainer.scrollTop += shiftNeeded;
        }
      }
    }
  };

  // Filter assignments based on dropdown selector
  const filteredAssignments = sortedAssignments.filter((a) => {
    if (filterComponent === "all") return true;
    return a.grade_component === filterComponent;
  });

  // Filter students based on search input
  const filteredStudents = students.filter((s) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const fullName = `${s.prefix || ""}${s.first_name} ${s.last_name}`.toLowerCase();
    return s.student_code.toLowerCase().includes(query) || fullName.includes(query);
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
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 dark:bg-sky-400/10 text-primary dark:text-sky-400">
              <Award className="w-7 h-7" />
            </div>
            <span>สมุดบันทึกคะแนนและการบ้าน (Gradebook)</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            วิชา {currentClassroom.name} • บันทึกคะแนนสะสม โครงสร้างสัดส่วนคะแนน ปพ.5
          </p>
        </div>
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Student Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหารหัสหรือชื่อ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-8 text-xs md:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder-slate-400 w-44 sm:w-56 transition-all shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-4 pr-10 text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          
          <button
            onClick={handleExportGrid}
            disabled={students.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="ส่งออกตารางคะแนนสะสมและเกรดคาดการณ์ (Excel)"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export ตารางคะแนน</span>
          </button>

          <button
            onClick={handleExportSubmissionsExcel}
            disabled={students.length === 0 || exportSubmissionsLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs md:text-sm font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="ส่งออกรายงานสถานะการส่งงานของนักเรียน (เซลล์สีเขียว = ส่งแล้ว, สีแดง = ยังไม่ส่ง)"
          >
            <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{exportSubmissionsLoading ? "กำลังส่งออก..." : "ส่งออกสถานะการส่งงาน (Excel สี)"}</span>
          </button>

          <a
            href="/reports?print=submissions"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all cursor-pointer"
            title="พิมพ์หรือบันทึกรายงานสถานะการส่งงานเป็นเอกสาร PDF (แนวนอน)"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>พิมพ์รายงาน PDF</span>
          </a>

          <button
            onClick={() => setShowOrderModal(true)}
            disabled={assignments.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <ListOrdered className="w-4 h-4 text-slate-400" />
            <span>จัดลำดับงาน</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all text-xs md:text-sm font-bold cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างงานใหม่</span>
          </button>
        </div>
      </div>

      {/* Summary Banner (Bento Grid Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Grading Policy Card */}
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary dark:bg-sky-400" />
              <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">สัดส่วนคะแนน (Grading Policy)</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">รวม 100%</span>
          </div>
          
          <div className="flex gap-1 h-8 w-full rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 mt-2 text-[10px] font-bold text-center">
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
        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800 border-l-4 border-l-primary dark:border-l-sky-400 flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-primary dark:text-sky-400" />
            <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">AI Insight</h3>
          </div>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 flex-1 leading-relaxed">
            {getAIInsightMessage()}
          </p>
        </div>
      </div>

      {/* Main Matrix Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[560px] overflow-hidden">
        {/* Table Controls / Header Area */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">ตารางบันทึกคะแนนสะสมรายวิชา</span>
              {searchQuery && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-sky-400">
                  พบ {filteredStudents.length}/{students.length} คน
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="w-3 h-3 rounded bg-rose-500/15 border border-rose-500/40 inline-block"></span>
              <span>= ขาดส่ง (Missing)</span>
              <span className="w-3 h-3 rounded bg-amber-500 inline-block ml-3"></span>
              <span>= ส่งช้า (Late)</span>
            </div>
          </div>
          
          <button
            onClick={handleSaveScores}
            disabled={saving || students.length === 0}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "กำลังบันทึก..." : "บันทึกคะแนนทั้งหมด"}</span>
          </button>
        </div>

        {/* Matrix Container */}
        {students.length > 0 ? (
          <div className="flex-1 overflow-auto matrix-scroll relative">
            <table className="w-max min-w-full text-left border-separate border-spacing-0 table-fixed text-xs md:text-sm">
              <colgroup>
                <col style={{ width: "120px", minWidth: "120px" }} />
                <col style={{ width: "240px", minWidth: "240px" }} />
                <col style={{ width: "120px", minWidth: "120px" }} />
                {filteredAssignments.map((ass) => (
                  <col key={ass.id} style={{ width: "140px", minWidth: "140px" }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 shadow-sm">
                <tr>
                  {/* Sticky columns with exact pixel coordinates & solid backgrounds */}
                  <th
                    style={{ left: 0, width: "120px", minWidth: "120px", maxWidth: "120px" }}
                    className="sticky z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-3 py-3 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold text-center box-border"
                  >
                    รหัสนักเรียน
                  </th>
                  <th
                    style={{ left: "120px", width: "240px", minWidth: "240px", maxWidth: "240px" }}
                    className="sticky z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold box-border"
                  >
                    ชื่อ-นามสกุล
                  </th>
                  <th
                    style={{ left: "360px", width: "120px", minWidth: "120px", maxWidth: "120px" }}
                    className="sticky z-40 bg-slate-100 dark:bg-slate-800 border-r-2 border-b border-slate-300 dark:border-slate-700 px-3 py-3 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold text-center sticky-col-shadow-right box-border"
                  >
                    คะแนนรวม (%)
                  </th>
                  
                  {/* Assignment Columns */}
                  {filteredAssignments.map((ass, aIdx) => {
                    const stats = getSubmissionStats(ass.id);
                    return (
                      <th
                        key={ass.id}
                        draggable
                        onDragStart={(e) => handleColumnDragStart(e, aIdx)}
                        onDragOver={(e) => handleColumnDragOver(e, aIdx)}
                        onDragLeave={handleColumnDragLeave}
                        onDrop={(e) => handleColumnDrop(e, aIdx)}
                        onDragEnd={handleColumnDragEnd}
                        style={{ width: "140px", minWidth: "140px" }}
                        className={`border-b border-r border-slate-200 dark:border-slate-700 px-4 py-2 align-bottom hover:bg-slate-100/50 dark:hover:bg-slate-700/50 cursor-grab active:cursor-grabbing group relative select-none transition-all box-border ${
                          draggedColumnIndex === aIdx ? "opacity-35 bg-slate-100/50 dark:bg-slate-800/50" : ""
                        } ${
                          dragOverColumnIndex === aIdx && draggedColumnIndex !== null && draggedColumnIndex !== aIdx
                            ? aIdx < draggedColumnIndex
                              ? "border-l-4 border-l-primary bg-primary/5"
                              : "border-r-4 border-r-primary bg-primary/5"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-primary dark:text-sky-400 uppercase tracking-wider font-bold">
                              {getComponentThaiName(ass.grade_component)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFillMaxScore(ass.id);
                                }}
                                className="text-slate-400 hover:text-amber-500 p-0.5 rounded transition-all cursor-pointer"
                                title="กรอกคะแนนเต็มทุกคน (Fill Max)"
                              >
                                <Zap className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearColumnScores(ass.id);
                                }}
                                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-all cursor-pointer"
                                title="ล้างคะแนนในชิ้นงานนี้ (Clear)"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={aIdx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveAssignment(ass.id, "left");
                                }}
                                className="text-slate-400 hover:text-primary dark:hover:text-sky-400 p-0.5 rounded transition-all disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
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
                                className="text-slate-400 hover:text-primary dark:hover:text-sky-400 p-0.5 rounded transition-all disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
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
                                className="text-slate-400 hover:text-primary dark:hover:text-sky-400 p-0.5 rounded transition-all"
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
                                className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-all"
                                title="ลบงานนี้"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block" title={ass.name}>
                            {ass.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            เต็ม {ass.max_score}
                            {currentClassroom?.grade_weight_modes?.[ass.grade_component] === "manual" && ` (น้ำหนัก ${ass.assignment_weight}%)`}
                          </span>

                          {/* Submission statistics bar & badge */}
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700 relative group/stats select-none">
                            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              <span>ส่งแล้ว {stats.submittedTotal}/{stats.total} คน</span>
                              <span className="text-primary dark:text-sky-400 font-bold">{Math.round(stats.percentage)}%</span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-primary dark:bg-sky-400 h-full rounded-full transition-all duration-300"
                                style={{ width: `${stats.percentage}%` }}
                              />
                            </div>
                            {/* Detailed Hover Tooltip */}
                            <div className="absolute top-full left-0 mt-2 hidden group-hover/stats:block z-50 w-48 p-3 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm border border-slate-800 text-white shadow-xl text-left pointer-events-none transition-all duration-200 font-sans">
                              <div className="text-[11px] font-bold border-b border-slate-800 pb-1.5 mb-1.5 text-slate-300">
                                รายละเอียดการส่งงาน
                              </div>
                              <div className="space-y-1.5 text-[10px] font-normal">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    ส่งตรงเวลา (On-time):
                                  </span>
                                  <span className="font-bold text-emerald-400">{stats.submittedOnTime} คน</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    ส่งช้า (Late):
                                  </span>
                                  <span className="font-bold text-amber-400">{stats.submittedLate} คน</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    ค้างส่ง (Missing):
                                  </span>
                                  <span className="font-bold text-rose-400">{stats.missing} คน</span>
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
              
              <tbody className="bg-white dark:bg-slate-900">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, rowIndex) => {
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
                      <tr key={student.id} className="hover:bg-primary/5 dark:hover:bg-slate-800/50 transition-colors group">
                        {/* Sticky student cells with exact pixel coordinates & solid backgrounds */}
                        <td
                          style={{ left: 0, width: "120px", minWidth: "120px", maxWidth: "120px" }}
                          className="sticky z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 font-mono font-bold text-primary dark:text-sky-400 text-center truncate box-border"
                        >
                          {student.student_code}
                        </td>
                        <td
                          style={{ left: "120px", width: "240px", minWidth: "240px", maxWidth: "240px" }}
                          className="sticky z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200 box-border"
                        >
                          <span className="truncate block" title={`${student.prefix || ""}${student.first_name} ${student.last_name}`}>
                            {`${student.prefix || ""}${student.first_name} ${student.last_name}`}
                          </span>
                        </td>
                        <td
                          style={{ left: "360px", width: "120px", minWidth: "120px", maxWidth: "120px" }}
                          className={`sticky z-20 bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r-2 border-b border-slate-300 dark:border-slate-700 px-3 py-2.5 text-center font-bold sticky-col-shadow-right box-border ${
                            gradeResult.risk === "red" ? "text-rose-600 dark:text-rose-400" : gradeResult.risk === "yellow" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <span>{gradeResult.finalPercentage}%</span>
                          <span className="text-[9px] text-slate-400 font-normal block mt-0.5">
                            (ขาด {gradeResult.totalAbsences} รอบ)
                          </span>
                        </td>
                        
                        {/* Interactive assignment score cells */}
                        {filteredAssignments.map((assignment, aIdx) => {
                          const cell = localScores[student.id]?.[assignment.id] || {
                            score: null,
                            isLate: false,
                            revisionStatus: null,
                          };
                          return (
                            <td key={assignment.id} className="px-3 py-2 border-r border-b border-slate-100 dark:border-slate-800 box-border">
                              <div className="relative flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center justify-center gap-1">
                                  {assignment.assignment_type === "check" ? (
                                    <input
                                      type="checkbox"
                                      checked={cell.score !== null && cell.score > 0}
                                      onChange={(e) => handleCheckChange(student.id, assignment.id, e.target.checked)}
                                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-primary dark:accent-sky-400 bg-white dark:bg-slate-800 cursor-pointer"
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
                                      className={`w-16 px-1.5 py-1 rounded-lg border text-center text-xs font-bold outline-none transition-all score-input score-input-${rowIndex}-${aIdx} ${
                                        cell.revisionStatus === "revision"
                                          ? "bg-amber-500/10 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300"
                                          : cell.revisionStatus === "retest"
                                          ? "bg-purple-500/10 border-purple-400 dark:border-purple-500 text-purple-700 dark:text-purple-300"
                                          : cell.score === null
                                          ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 placeholder-rose-400/50"
                                          : "bg-transparent border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-primary dark:focus:border-sky-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100"
                                      }`}
                                      onKeyDown={(e) => handleKeyDown(e, rowIndex, aIdx)}
                                      onFocus={(e) => e.currentTarget.select()}
                                    />
                                  )}
                                  
                                  <div className="flex flex-col gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleLateToggle(student.id, assignment.id)}
                                      className={`p-0.5 rounded transition-all cursor-pointer ${
                                        cell.isLate ? "text-amber-500 scale-110" : "text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 opacity-20 group-hover:opacity-100"
                                      }`}
                                      title="ส่งช้า (Late)"
                                    >
                                      <Clock className="w-3 h-3" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRevisionToggle(student.id, assignment.id)}
                                      className={`p-0.5 rounded transition-all cursor-pointer ${
                                        cell.revisionStatus === "revision"
                                          ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 scale-110"
                                          : cell.revisionStatus === "retest"
                                          ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 scale-110"
                                          : "text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 opacity-20 group-hover:opacity-100"
                                      }`}
                                      title={`สถานะงาน: ${
                                        cell.revisionStatus === "revision"
                                          ? "รอแก้งาน (คลิกเพื่อเปลี่ยนเป็น 'รอสอบแก้')"
                                          : cell.revisionStatus === "retest"
                                          ? "รอสอบแก้ (คลิกเพื่อยกเลิก)"
                                          : "ปกติ (คลิกเพื่อระบุ 'รอแก้งาน')"
                                      }`}
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {cell.revisionStatus === "revision" && (
                                  <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/90 px-1 py-0.5 rounded leading-none border border-amber-300/40">
                                    รอแก้งาน
                                  </span>
                                )}
                                {cell.revisionStatus === "retest" && (
                                  <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-950/90 px-1 py-0.5 rounded leading-none border border-purple-300/40">
                                    รอสอบแก้
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={3 + filteredAssignments.length}
                      className="text-center py-12 text-slate-400 font-medium"
                    >
                      ไม่พบรายชื่อนักเรียนตามคำค้นหา &ldquo;{searchQuery}&rdquo;{" "}
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-primary dark:text-sky-400 font-bold underline ml-1 cursor-pointer hover:opacity-80"
                      >
                        ล้างคำค้นหา
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
              
              {/* Footer Class Averages with matching sticky column coordinates */}
              <tfoot className="sticky bottom-0 z-30 bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                <tr>
                  <td
                    style={{ left: 0, width: "120px", minWidth: "120px", maxWidth: "120px" }}
                    className="sticky z-40 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 box-border"
                  ></td>
                  <td
                    style={{ left: "120px", width: "240px", minWidth: "240px", maxWidth: "240px" }}
                    className="sticky z-40 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 px-4 py-3 text-right font-bold box-border"
                  >
                    Class Average
                  </td>
                  <td
                    style={{ left: "360px", width: "120px", minWidth: "120px", maxWidth: "120px" }}
                    className="sticky z-40 bg-slate-100 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 px-3 py-3 text-center text-primary dark:text-sky-400 font-bold sticky-col-shadow-right box-border"
                  >
                    {getClassFinalAverage()}%
                  </td>
                  
                  {filteredAssignments.map((ass) => (
                    <td key={ass.id} className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700 text-xs font-bold box-border">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 mx-4 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
              <Plus className="w-5 h-5 text-primary dark:text-sky-400" />
              <span>สร้างชิ้นงาน / หัวข้อสอบใหม่</span>
            </h3>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  ชื่อชิ้นงาน / หัวข้อสอบ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การบ้านบทที่ 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 glow-input outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    หมวดหมู่คะแนน
                  </label>
                  <select
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-700 dark:text-slate-200 glow-input outline-none text-sm cursor-pointer"
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
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-700 dark:text-slate-200 glow-input outline-none text-sm cursor-pointer"
                  >
                    <option value="score">คะแนนเต็มตัวเลข</option>
                    <option value="check">ผ่าน/ไม่ผ่าน (Checklist)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={currentClassroom?.grade_weight_modes?.[component] === "manual" ? "col-span-1" : "col-span-2"}>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    คะแนนเต็ม (Max Score)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={maxScore}
                    onChange={(e) => setMaxScore(parseInt(e.target.value) || 10)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 glow-input outline-none text-sm font-semibold text-center"
                  />
                </div>

                {currentClassroom?.grade_weight_modes?.[component] === "manual" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      น้ำหนักชิ้นงาน (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualWeight}
                      onChange={(e) => setManualWeight(parseInt(e.target.value) || 100)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 glow-input outline-none text-sm font-semibold text-center"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 mx-4 relative">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingAssignment(null);
              }}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
              <Edit3 className="w-5 h-5 text-primary dark:text-sky-400" />
              <span>แก้ไขชิ้นงาน / หัวข้อสอบ</span>
            </h3>

            <form onSubmit={handleUpdateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  ชื่อชิ้นงาน / หัวข้อสอบ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การบ้านบทที่ 1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 glow-input outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    หมวดหมู่คะแนน
                  </label>
                  <select
                    value={editComponent}
                    onChange={(e) => setEditComponent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-700 dark:text-slate-200 glow-input outline-none text-sm cursor-pointer"
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
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-700 dark:text-slate-200 glow-input outline-none text-sm cursor-pointer"
                  >
                    <option value="score">คะแนนเต็มตัวเลข</option>
                    <option value="check">ผ่าน/ไม่ผ่าน (Checklist)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={currentClassroom?.grade_weight_modes?.[editComponent] === "manual" ? "col-span-1" : "col-span-2"}>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    คะแนนเต็ม (Max Score)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={editMaxScore}
                    onChange={(e) => setEditMaxScore(parseInt(e.target.value) || 10)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 glow-input outline-none text-sm font-semibold text-center"
                  />
                </div>

                {currentClassroom?.grade_weight_modes?.[editComponent] === "manual" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      น้ำหนักชิ้นงาน (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editManualWeight}
                      onChange={(e) => setEditManualWeight(parseInt(e.target.value) || 100)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 glow-input outline-none text-sm font-semibold text-center"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 mx-4 relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowOrderModal(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800 shrink-0">
              <ListOrdered className="w-5 h-5 text-primary dark:text-sky-400" />
              <span>จัดเรียงลำดับชิ้นงาน / หัวข้อสอบ</span>
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 shrink-0 leading-relaxed">
              คุณสามารถเปลี่ยนลำดับการแสดงผลคอลัมน์ของแต่ละชิ้นงานได้โดยการใช้ปุ่มเลื่อนขึ้นหรือลง งานด้านบนจะแสดงในคอลัมน์ซ้ายสุดในตารางคะแนน
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {tempOrder.map((ass, index) => (
                <div
                  key={ass.id}
                  draggable
                  onDragStart={(e) => handleModalDragStart(e, index)}
                  onDragOver={(e) => handleModalDragOver(e, index)}
                  onDrop={(e) => handleModalDrop(e, index)}
                  onDragEnd={handleModalDragEnd}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all gap-3 cursor-grab active:cursor-grabbing ${
                    modalDraggedIndex === index ? "opacity-35 bg-slate-100 dark:bg-slate-800" : "bg-white dark:bg-slate-850"
                  } ${
                    modalDragOverIndex === index && modalDraggedIndex !== null && modalDraggedIndex !== index
                      ? "border-dashed border-primary bg-primary/5"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <GripVertical className="w-4 h-4 text-slate-400 shrink-0 cursor-grab" />
                    <div className="flex flex-col gap-0.5 truncate">
                      <span className="text-[9px] font-bold text-primary dark:text-sky-400 uppercase">
                        {getComponentThaiName(ass.grade_component)}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={ass.name}>
                        {ass.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        คะแนนเต็ม: {ass.max_score}
                      </span>
                    </div>
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
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
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

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold text-sm cursor-pointer"
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
