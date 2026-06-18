"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { db, Classroom, Student, Attendance, Assignment, StudentScore, AIReport } from "@/utils/db";
import { useRouter, usePathname } from "next/navigation";

interface ClassroomContextType {
  user: any;
  loading: boolean;
  classrooms: Classroom[];
  currentClassroom: Classroom | null;
  setCurrentClassroom: (classroom: Classroom | null) => void;
  students: Student[];
  assignments: Assignment[];
  attendance: Attendance[];
  scores: StudentScore[];
  reports: AIReport[];
  refreshClassrooms: () => Promise<void>;
  refreshCurrentClassroomData: () => Promise<void>;
  
  // Actions
  createClassroom: (name: string, schedule: string, startDate: string, totalWeeks: number) => Promise<Classroom>;
  updateClassroom: (updates: Partial<Omit<Classroom, "id" | "teacher_id">>) => Promise<Classroom>;
  deleteClassroom: (id: string) => Promise<void>;
  
  createStudent: (code: string, prefix: string, firstName: string, lastName: string, notes?: string) => Promise<Student>;
  importStudents: (students: Omit<Student, "id" | "classroom_id">[]) => Promise<void>;
  updateStudent: (id: string, updates: Partial<Omit<Student, "id" | "classroom_id">>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
  
  saveAttendance: (records: { studentId: string; date: string; status: "present" | "late" | "sick" | "absent" }[]) => Promise<void>;
  
  createAssignment: (name: string, component: string, maxScore: number, type: "score" | "check", weight?: number) => Promise<Assignment>;
  updateAssignment: (id: string, updates: Partial<Omit<Assignment, "id" | "classroom_id">>) => Promise<Assignment>;
  deleteAssignment: (id: string) => Promise<void>;
  
  saveScores: (scoresList: { studentId: string; assignmentId: string; score: number | null; isLate: boolean }[]) => Promise<void>;
  saveAIReport: (studentId: string, summary: string, strengths: string, weaknesses: string, recommendations: string) => Promise<AIReport>;
  cleanupClassroomData: (options: { attendance: boolean; scores: boolean; reports: boolean }) => Promise<void>;
  
  logout: () => Promise<void>;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

export function ClassroomProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [currentClassroom, setCurrentClassroomState] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);
  
  const router = useRouter();
  const pathname = usePathname();



  const refreshClassroomsRef = useRef<(() => Promise<void>) | null>(null);
  const isRefreshingClassroomsRef = useRef(false);
  const routerRef = useRef(router);
  routerRef.current = router;

  // Selected classroom state syncs to sessionStorage
  const setCurrentClassroom = useCallback((classroom: Classroom | null) => {
    setCurrentClassroomState(classroom);
    if (classroom) {
      sessionStorage.setItem("sa_selected_classroom_id", classroom.id);
    } else {
      sessionStorage.removeItem("sa_selected_classroom_id");
    }
  }, []);

  // Fetch Classrooms List (fetch only — selection handled separately)
  const refreshClassrooms = useCallback(async () => {
    if (isRefreshingClassroomsRef.current) {

      return;
    }

    isRefreshingClassroomsRef.current = true;

    try {
      const list = await db.getClassrooms();
      setClassrooms((prev) => {
        if (
          prev.length === list.length &&
          prev.every((c, i) => c.id === list[i]?.id)
        ) {
          return prev;
        }
        return list;
      });
    } catch (err) {
      console.error("Error fetching classrooms:", err);
    } finally {
      isRefreshingClassroomsRef.current = false;
    }
  }, []);

  refreshClassroomsRef.current = refreshClassrooms;

  // Sync selected classroom when classrooms list changes
  useEffect(() => {
    if (classrooms.length === 0) {
      setCurrentClassroomState((prev) => (prev === null ? prev : null));
      return;
    }

    const storedId = sessionStorage.getItem("sa_selected_classroom_id");
    if (storedId) {
      const found = classrooms.find((c) => c.id === storedId);
      if (found) {
        setCurrentClassroomState((prev) => {
          const skipped = prev?.id === found.id;

          return skipped ? prev : found;
        });
        return;
      }
    }

    setCurrentClassroomState((prev) => {
      if (prev && classrooms.some((c) => c.id === prev.id)) return prev;

      return classrooms[0];
    });
  }, [classrooms]);

  // Fetch all child data for currently selected classroom
  const refreshCurrentClassroomData = useCallback(async () => {
    if (!currentClassroom) {
      setStudents([]);
      setAssignments([]);
      setAttendance([]);
      setScores([]);
      setReports([]);
      return;
    }
    
    try {
      const [stds, ass, atts, scs, reps] = await Promise.all([
        db.getStudents(currentClassroom.id),
        db.getAssignments(currentClassroom.id),
        db.getAttendance(currentClassroom.id),
        db.getScores(currentClassroom.id),
        db.getAIReports(currentClassroom.id),
      ]);
      setStudents(stds);
      setAssignments(ass);
      setAttendance(atts);
      setScores(scs);
      setReports(reps);
    } catch (err) {
      console.error("Error loading classroom sub-data:", err);
    }
  }, [currentClassroom]);

  // Auth init — run once on mount only
  useEffect(() => {
    let cancelled = false;



    async function initAuth() {
      try {
        const currentUser = await db.getCurrentUser();
        if (cancelled) return;



        setUser((prev: any) => {
          const prevId = prev?.id ?? null;
          const nextId = currentUser?.id ?? null;
          return prevId === nextId ? prev : currentUser;
        });

        if (currentUser) {
          await refreshClassroomsRef.current?.();
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {


    if (!loading && !user && pathname !== "/" && pathname !== "/login") {
      routerRef.current.push("/");
    }
  }, [loading, user, pathname]);

  // Load classroom sub-data when current classroom changes
  useEffect(() => {

    if (user && currentClassroom) {
      refreshCurrentClassroomData();
    }
  }, [currentClassroom, user, refreshCurrentClassroomData]);

  // Log Out
  const logout = async () => {
    setLoading(true);
    await db.signOut();
    setUser(null);
    setClassrooms([]);
    setCurrentClassroomState(null);
    setStudents([]);
    setAssignments([]);
    setAttendance([]);
    setScores([]);
    setReports([]);
    sessionStorage.removeItem("sa_selected_classroom_id");
    router.push("/");
    setLoading(false);
  };

  // --- ACTIONS ---

  const createClassroom = async (
    name: string,
    schedule: string,
    startDate: string,
    totalWeeks: number
  ) => {
    const newClass = await db.createClassroom({
      name,
      weekly_schedule: schedule,
      semester_start_date: startDate,
      total_weeks: totalWeeks,
      grade_weights: { "จิตพิสัย": 10, homework: 30, midterm: 30, final: 30 },
      grade_weight_modes: { "จิตพิสัย": "proportional", homework: "proportional", midterm: "proportional", final: "proportional" },
      grade_thresholds: { g4: 80, g35: 75, g3: 70, g25: 65, g2: 60, g15: 55, g1: 50 },
      behavior_config: { deductAbsent: 0, deductLate: 0, deductMissing: 0, deductLateSubmission: 0 },
    });
    await refreshClassrooms();
    setCurrentClassroom(newClass);
    return newClass;
  };

  const updateClassroom = async (updates: Partial<Omit<Classroom, "id" | "teacher_id">>) => {
    if (!currentClassroom) throw new Error("No active classroom selected");
    const updated = await db.updateClassroom(currentClassroom.id, updates);
    
    // Update local lists
    setClassrooms(classrooms.map((c) => (c.id === updated.id ? updated : c)));
    setCurrentClassroomState(updated);
    return updated;
  };

  const deleteClassroom = async (id: string) => {
    await db.deleteClassroom(id);
    const remaining = classrooms.filter((c) => c.id !== id);
    setClassrooms(remaining);
    if (currentClassroom?.id === id) {
      setCurrentClassroom(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const createStudent = async (
    code: string,
    prefix: string,
    firstName: string,
    lastName: string,
    notes?: string
  ) => {
    if (!currentClassroom) throw new Error("No active classroom selected");
    const newStd = await db.createStudent({
      classroom_id: currentClassroom.id,
      student_code: code,
      prefix,
      first_name: firstName,
      last_name: lastName,
      notes,
    });
    setStudents([...students, newStd].sort((a, b) => a.student_code.localeCompare(b.student_code)));
    return newStd;
  };

  const importStudents = async (studentList: Omit<Student, "id" | "classroom_id">[]) => {
    if (!currentClassroom) throw new Error("No active classroom selected");
    const studentsWithClass = studentList.map((s) => ({
      ...s,
      classroom_id: currentClassroom.id,
    }));
    const inserted = await db.bulkInsertStudents(studentsWithClass);
    
    // Reload full list
    const updatedStds = await db.getStudents(currentClassroom.id);
    setStudents(updatedStds);
  };

  const updateStudent = async (id: string, updates: Partial<Omit<Student, "id" | "classroom_id">>) => {
    const updated = await db.updateStudent(id, updates);
    setStudents(students.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const deleteStudent = async (id: string) => {
    await db.deleteStudent(id);
    setStudents(students.filter((s) => s.id !== id));
    setAttendance(attendance.filter((a) => a.student_id !== id));
    setScores(scores.filter((sc) => sc.student_id !== id));
  };

  const saveAttendance = async (records: { studentId: string; date: string; status: "present" | "late" | "sick" | "absent" }[]) => {
    if (!currentClassroom) throw new Error("No active classroom selected");
    const formatted = records.map((r) => ({
      classroom_id: currentClassroom.id,
      student_id: r.studentId,
      session_date: r.date,
      status: r.status,
    }));
    await db.saveAttendance(formatted);
    
    // Fetch fresh attendance logs
    const freshAtt = await db.getAttendance(currentClassroom.id);
    setAttendance(freshAtt);
  };

  const createAssignment = async (
    name: string,
    component: string,
    maxScore: number,
    type: "score" | "check",
    weight: number = 100
  ) => {
    if (!currentClassroom) throw new Error("No active classroom selected");
    const newAss = await db.createAssignment({
      classroom_id: currentClassroom.id,
      name,
      grade_component: component,
      max_score: maxScore,
      assignment_type: type,
      assignment_weight: weight,
    });
    setAssignments([...assignments, newAss]);
    return newAss;
  };

  const updateAssignment = async (
    id: string,
    updates: Partial<Omit<Assignment, "id" | "classroom_id">>
  ) => {
    const updated = await db.updateAssignment(id, updates);
    setAssignments(assignments.map((a) => (a.id === id ? updated : a)));
    return updated;
  };

  const deleteAssignment = async (id: string) => {
    await db.deleteAssignment(id);
    setAssignments(assignments.filter((a) => a.id !== id));
    setScores(scores.filter((sc) => sc.assignment_id !== id));
  };

  const saveScores = async (scoresList: { studentId: string; assignmentId: string; score: number | null; isLate: boolean }[]) => {
    if (!currentClassroom) throw new Error("No active classroom selected");
    const formatted = scoresList.map((s) => ({
      student_id: s.studentId,
      assignment_id: s.assignmentId,
      score: s.score,
      is_late: s.isLate,
    }));
    await db.saveScores(formatted);
    
    // Fetch fresh scores
    const freshScores = await db.getScores(currentClassroom.id);
    setScores(freshScores);
  };

  const saveAIReport = async (
    studentId: string,
    summary: string,
    strengths: string,
    weaknesses: string,
    recommendations: string
  ) => {
    const report = await db.saveAIReport({
      student_id: studentId,
      performance_summary: summary,
      strengths,
      weaknesses,
      recommendations,
    });
    
    // Update state
    setReports((prev) => {
      const idx = prev.findIndex((r) => r.student_id === studentId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = report;
        return copy;
      } else {
        return [...prev, report];
      }
    });
    return report;
  };

  const cleanupClassroomData = async (options: { attendance: boolean; scores: boolean; reports: boolean }) => {
    if (!currentClassroom) throw new Error("No active classroom selected");
    await db.cleanupClassroomData(currentClassroom.id, options);
    await refreshCurrentClassroomData();
  };

  return (
    <ClassroomContext.Provider
      value={{
        user,
        loading,
        classrooms,
        currentClassroom,
        setCurrentClassroom,
        students,
        assignments,
        attendance,
        scores,
        reports,
        refreshClassrooms,
        refreshCurrentClassroomData,
        createClassroom,
        updateClassroom,
        deleteClassroom,
        createStudent,
        importStudents,
        updateStudent,
        deleteStudent,
        saveAttendance,
        createAssignment,
        updateAssignment,
        deleteAssignment,
        saveScores,
        saveAIReport,
        cleanupClassroomData,
        logout,
      }}
    >
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const context = useContext(ClassroomContext);
  if (context === undefined) {
    throw new Error("useClassroom must be used within a ClassroomProvider");
  }
  return context;
}
