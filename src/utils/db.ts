import { supabase, isDemoMode } from "./supabaseClient";
export { isDemoMode };

export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  weekly_schedule: string;
  semester_start_date: string;
  total_weeks: number;
  grade_weights: {
    [key: string]: number;
  };
  grade_weight_modes: {
    [key: string]: string;
  };
  grade_thresholds: {
    g4: number;
    g35: number;
    g3: number;
    g25: number;
    g2: number;
    g15: number;
    g1: number;
  };
  behavior_config: {
    deductAbsent: number;
    deductLate: number;
    deductMissing: number;
    deductLateSubmission: number;
    gradingMode?: string;
    maxAbsencesAllowed?: number;
    latesPerAbsence?: number;
    scoreCalculationMethod?: 'active_rescaling' | 'deductive';
  };
  created_at?: string;
}

export interface Student {
  id: string;
  classroom_id: string;
  student_code: string;
  prefix: string;
  first_name: string;
  last_name: string;
  notes?: string;
}

export interface Attendance {
  id: string;
  classroom_id: string;
  student_id: string;
  session_date: string;
  status: "present" | "late" | "sick" | "absent";
}

export interface Assignment {
  id: string;
  classroom_id: string;
  name: string;
  grade_component: "attendance" | "homework" | "midterm" | "final" | string;
  max_score: number;
  assignment_type: "score" | "check";
  assignment_weight: number; // For manual weight
}

export interface StudentScore {
  id: string;
  student_id: string;
  assignment_id: string;
  score: number | null;
  is_late: boolean;
}

export interface AIReport {
  id: string;
  student_id: string;
  performance_summary: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  created_at?: string;
}

// ----------------------------------------------------
// LOCAL STORAGE SEED & ENGINE FOR DEMO MODE
// ----------------------------------------------------
const LOCAL_STORAGE_KEYS = {
  classrooms: "sa_classrooms",
  students: "sa_students",
  attendance: "sa_attendance",
  assignments: "sa_assignments",
  scores: "sa_scores",
  reports: "sa_reports",
  user: "sa_auth_user",
};

const SEED_DATA = {
  classrooms: [] as Classroom[],
  students: [] as Student[],
  assignments: [] as Assignment[],
  scores: [] as StudentScore[],
  attendance: [] as Attendance[],
  reports: [] as AIReport[],
};

// Initialize localStorage with seed data if empty
export function initDemoDatabase() {
  if (typeof window === "undefined") return;
  
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.classrooms)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.classrooms, JSON.stringify(SEED_DATA.classrooms));
    localStorage.setItem(LOCAL_STORAGE_KEYS.students, JSON.stringify(SEED_DATA.students));
    localStorage.setItem(LOCAL_STORAGE_KEYS.assignments, JSON.stringify(SEED_DATA.assignments));
    localStorage.setItem(LOCAL_STORAGE_KEYS.scores, JSON.stringify(SEED_DATA.scores));
    localStorage.setItem(LOCAL_STORAGE_KEYS.attendance, JSON.stringify(SEED_DATA.attendance));
    localStorage.setItem(LOCAL_STORAGE_KEYS.reports, JSON.stringify(SEED_DATA.reports));
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.user,
      JSON.stringify({ id: "demo-teacher", email: "teacher@demo.com", isDemo: true })
    );
  }
}

// Read helper
function getLocalItem<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  initDemoDatabase();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

// Write helper
function setLocalItem<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ----------------------------------------------------
// DATABASE API INTERFACE
// ----------------------------------------------------

export const db = {
  // --- AUTH ---
  async getCurrentUser() {
    if (isDemoMode) {
      if (typeof window === "undefined") return null;
      initDemoDatabase();
      const user = localStorage.getItem(LOCAL_STORAGE_KEYS.user);
      return user ? JSON.parse(user) : null;
    }
    const { data: { user } } = await supabase!.auth.getUser();
    return user;
  },

  async signOut() {
    if (isDemoMode) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.user);
      return;
    }
    await supabase!.auth.signOut();
  },

  // --- CLASSROOMS ---
  async getClassrooms(): Promise<Classroom[]> {
    if (isDemoMode) {
      const user = await this.getCurrentUser();
      if (!user) return [];
      return getLocalItem<Classroom>(LOCAL_STORAGE_KEYS.classrooms).filter(
        (c) => c.teacher_id === user.id
      );
    }
    const { data, error } = await supabase!
      .from("classrooms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByIdClassroom(id: string): Promise<Classroom | null> {
    if (isDemoMode) {
      const list = await this.getClassrooms();
      return list.find((c) => c.id === id) || null;
    }
    const { data, error } = await supabase!
      .from("classrooms")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  },

  async createClassroom(classroom: Omit<Classroom, "id" | "teacher_id">): Promise<Classroom> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    if (isDemoMode) {
      const newClass: Classroom = {
        ...classroom,
        id: "class-" + Date.now(),
        teacher_id: user.id,
        created_at: new Date().toISOString(),
      };
      const list = getLocalItem<Classroom>(LOCAL_STORAGE_KEYS.classrooms);
      list.push(newClass);
      setLocalItem(LOCAL_STORAGE_KEYS.classrooms, list);
      return newClass;
    }

    const { data, error } = await supabase!
      .from("classrooms")
      .insert({ ...classroom, teacher_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateClassroom(id: string, updates: Partial<Omit<Classroom, "id" | "teacher_id">>): Promise<Classroom> {
    if (isDemoMode) {
      const list = getLocalItem<Classroom>(LOCAL_STORAGE_KEYS.classrooms);
      const idx = list.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Classroom not found");
      list[idx] = { ...list[idx], ...updates };
      setLocalItem(LOCAL_STORAGE_KEYS.classrooms, list);
      return list[idx];
    }
    const { data, error } = await supabase!
      .from("classrooms")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteClassroom(id: string): Promise<void> {
    if (isDemoMode) {
      const classes = getLocalItem<Classroom>(LOCAL_STORAGE_KEYS.classrooms).filter((c) => c.id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.classrooms, classes);

      // Cascade deletes
      const students = getLocalItem<Student>(LOCAL_STORAGE_KEYS.students).filter((s) => s.classroom_id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.students, students);

      const attendance = getLocalItem<Attendance>(LOCAL_STORAGE_KEYS.attendance).filter((a) => a.classroom_id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.attendance, attendance);

      const assignments = getLocalItem<Assignment>(LOCAL_STORAGE_KEYS.assignments).filter((a) => a.classroom_id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.assignments, assignments);
      return;
    }
    const { error } = await supabase!.from("classrooms").delete().eq("id", id);
    if (error) throw error;
  },

  // --- STUDENTS ---
  async getStudents(classroomId: string): Promise<Student[]> {
    if (isDemoMode) {
      return getLocalItem<Student>(LOCAL_STORAGE_KEYS.students).filter(
        (s) => s.classroom_id === classroomId
      );
    }
    const { data, error } = await supabase!
      .from("students")
      .select("*")
      .eq("classroom_id", classroomId)
      .order("student_code", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createStudent(student: Omit<Student, "id">): Promise<Student> {
    if (isDemoMode) {
      const newStd: Student = {
        ...student,
        id: "std-" + Date.now() + Math.random().toString(36).substr(2, 4),
      };
      const list = getLocalItem<Student>(LOCAL_STORAGE_KEYS.students);
      // Check unique code
      if (list.some((s) => s.classroom_id === student.classroom_id && s.student_code === student.student_code)) {
        throw new Error(`รหัสนักเรียน ${student.student_code} มีอยู่ในห้องเรียนนี้แล้ว`);
      }
      list.push(newStd);
      setLocalItem(LOCAL_STORAGE_KEYS.students, list);
      return newStd;
    }
    const { data, error } = await supabase!
      .from("students")
      .insert(student)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkInsertStudents(students: Omit<Student, "id">[]): Promise<Student[]> {
    if (students.length === 0) return [];
    if (isDemoMode) {
      const list = getLocalItem<Student>(LOCAL_STORAGE_KEYS.students);
      const inserted: Student[] = [];
      for (const s of students) {
        // Skip duplicate codes
        if (list.some((existing) => existing.classroom_id === s.classroom_id && existing.student_code === s.student_code)) {
          continue;
        }
        const newStd = {
          ...s,
          id: "std-" + Date.now() + Math.random().toString(36).substr(2, 4),
        };
        list.push(newStd);
        inserted.push(newStd);
      }
      setLocalItem(LOCAL_STORAGE_KEYS.students, list);
      return inserted;
    }
    const { data, error } = await supabase!
      .from("students")
      .insert(students)
      .select();
    if (error) throw error;
    return data || [];
  },

  async updateStudent(id: string, updates: Partial<Omit<Student, "id" | "classroom_id">>): Promise<Student> {
    if (isDemoMode) {
      const list = getLocalItem<Student>(LOCAL_STORAGE_KEYS.students);
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error("Student not found");
      list[idx] = { ...list[idx], ...updates };
      setLocalItem(LOCAL_STORAGE_KEYS.students, list);
      return list[idx];
    }
    const { data, error } = await supabase!
      .from("students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStudent(id: string): Promise<void> {
    if (isDemoMode) {
      const list = getLocalItem<Student>(LOCAL_STORAGE_KEYS.students).filter((s) => s.id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.students, list);

      // Delete attendance & scores
      const attendance = getLocalItem<Attendance>(LOCAL_STORAGE_KEYS.attendance).filter((a) => a.student_id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.attendance, attendance);

      const scores = getLocalItem<StudentScore>(LOCAL_STORAGE_KEYS.scores).filter((s) => s.student_id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.scores, scores);
      return;
    }
    const { error } = await supabase!.from("students").delete().eq("id", id);
    if (error) throw error;
  },

  // --- ATTENDANCE ---
  async getAttendance(classroomId: string): Promise<Attendance[]> {
    if (isDemoMode) {
      return getLocalItem<Attendance>(LOCAL_STORAGE_KEYS.attendance).filter(
        (a) => a.classroom_id === classroomId
      );
    }
    const { data, error } = await supabase!
      .from("attendance")
      .select("*")
      .eq("classroom_id", classroomId);
    if (error) throw error;
    return data || [];
  },

  async saveAttendance(records: Omit<Attendance, "id">[]): Promise<void> {
    if (records.length === 0) return;
    if (isDemoMode) {
      const list = getLocalItem<Attendance>(LOCAL_STORAGE_KEYS.attendance);
      for (const rec of records) {
        const existingIdx = list.findIndex(
          (a) => a.student_id === rec.student_id && a.session_date === rec.session_date
        );
        if (existingIdx !== -1) {
          list[existingIdx].status = rec.status;
        } else {
          list.push({
            ...rec,
            id: "att-" + Date.now() + Math.random().toString(36).substr(2, 4),
          });
        }
      }
      setLocalItem(LOCAL_STORAGE_KEYS.attendance, list);
      return;
    }
    
    // In Supabase, upsert based on matching constraints
    const { error } = await supabase!
      .from("attendance")
      .upsert(
        records.map((r) => ({
          classroom_id: r.classroom_id,
          student_id: r.student_id,
          session_date: r.session_date,
          status: r.status,
        })),
        { onConflict: "student_id,session_date" }
      );
    if (error) throw error;
  },

  // --- ASSIGNMENTS ---
  async getAssignments(classroomId: string): Promise<Assignment[]> {
    if (isDemoMode) {
      return getLocalItem<Assignment>(LOCAL_STORAGE_KEYS.assignments).filter(
        (a) => a.classroom_id === classroomId
      );
    }
    const { data, error } = await supabase!
      .from("assignments")
      .select("*")
      .eq("classroom_id", classroomId);
    if (error) throw error;
    return data || [];
  },

  async createAssignment(assignment: Omit<Assignment, "id">): Promise<Assignment> {
    if (isDemoMode) {
      const newAss: Assignment = {
        ...assignment,
        id: "ass-" + Date.now(),
      };
      const list = getLocalItem<Assignment>(LOCAL_STORAGE_KEYS.assignments);
      list.push(newAss);
      setLocalItem(LOCAL_STORAGE_KEYS.assignments, list);
      return newAss;
    }
    const { data, error } = await supabase!
      .from("assignments")
      .insert(assignment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAssignment(id: string, updates: Partial<Omit<Assignment, "id" | "classroom_id">>): Promise<Assignment> {
    if (isDemoMode) {
      const list = getLocalItem<Assignment>(LOCAL_STORAGE_KEYS.assignments);
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error("Assignment not found");
      list[idx] = { ...list[idx], ...updates };
      setLocalItem(LOCAL_STORAGE_KEYS.assignments, list);
      return list[idx];
    }
    const { data, error } = await supabase!
      .from("assignments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAssignment(id: string): Promise<void> {
    if (isDemoMode) {
      const list = getLocalItem<Assignment>(LOCAL_STORAGE_KEYS.assignments).filter((a) => a.id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.assignments, list);

      // Cascade delete student scores
      const scores = getLocalItem<StudentScore>(LOCAL_STORAGE_KEYS.scores).filter((s) => s.assignment_id !== id);
      setLocalItem(LOCAL_STORAGE_KEYS.scores, scores);
      return;
    }
    const { error } = await supabase!.from("assignments").delete().eq("id", id);
    if (error) throw error;
  },

  // --- SCORES ---
  async getScores(classroomId: string): Promise<StudentScore[]> {
    if (isDemoMode) {
      const students = getLocalItem<Student>(LOCAL_STORAGE_KEYS.students)
        .filter((s) => s.classroom_id === classroomId)
        .map((s) => s.id);
      return getLocalItem<StudentScore>(LOCAL_STORAGE_KEYS.scores).filter((sc) =>
        students.includes(sc.student_id)
      );
    }
    // Fetch scores for assignments belonging to the classroom
    const { data: assignments } = await supabase!
      .from("assignments")
      .select("id")
      .eq("classroom_id", classroomId);
    
    if (!assignments || assignments.length === 0) return [];
    
    const assIds = assignments.map((a) => a.id);
    const { data, error } = await supabase!
      .from("student_scores")
      .select("*")
      .in("assignment_id", assIds);
    if (error) throw error;
    return data || [];
  },

  async saveScores(scores: Omit<StudentScore, "id">[]): Promise<void> {
    if (scores.length === 0) return;
    if (isDemoMode) {
      let list = getLocalItem<StudentScore>(LOCAL_STORAGE_KEYS.scores);
      for (const sc of scores) {
        if (sc.score === null) {
          list = list.filter(
            (s) => !(s.student_id === sc.student_id && s.assignment_id === sc.assignment_id)
          );
        } else {
          const existingIdx = list.findIndex(
            (s) => s.student_id === sc.student_id && s.assignment_id === sc.assignment_id
          );
          if (existingIdx !== -1) {
            list[existingIdx].score = sc.score;
            list[existingIdx].is_late = sc.is_late;
          } else {
            list.push({
              ...sc,
              id: "sc-" + Date.now() + Math.random().toString(36).substr(2, 4),
            });
          }
        }
      }
      setLocalItem(LOCAL_STORAGE_KEYS.scores, list);
      return;
    }

    const toUpsert = scores.filter((s) => s.score !== null);
    const toDelete = scores.filter((s) => s.score === null);

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase!
        .from("student_scores")
        .upsert(
          toUpsert.map((s) => ({
            student_id: s.student_id,
            assignment_id: s.assignment_id,
            score: s.score,
            is_late: s.is_late,
          })),
          { onConflict: "student_id,assignment_id" }
        );
      if (upsertError) throw upsertError;
    }

    if (toDelete.length > 0) {
      const assIds = Array.from(new Set(toDelete.map((d) => d.assignment_id)));
      const studIds = Array.from(new Set(toDelete.map((d) => d.student_id)));

      const { data: existing } = await supabase!
        .from("student_scores")
        .select("student_id, assignment_id")
        .in("assignment_id", assIds)
        .in("student_id", studIds);

      if (existing && existing.length > 0) {
        const actualDeletes = toDelete.filter((d) =>
          existing.some(
            (ex) => ex.student_id === d.student_id && ex.assignment_id === d.assignment_id
          )
        );

        if (actualDeletes.length > 0) {
          const deletePromises = actualDeletes.map((s) =>
            supabase!
              .from("student_scores")
              .delete()
              .eq("student_id", s.student_id)
              .eq("assignment_id", s.assignment_id)
          );
          const deleteResults = await Promise.all(deletePromises);
          for (const res of deleteResults) {
            if (res.error) throw res.error;
          }
        }
      }
    }
  },

  // --- AI REPORTS ---
  async getAIReports(classroomId: string): Promise<AIReport[]> {
    let studentIds: string[] = [];

    if (isDemoMode) {
      studentIds = getLocalItem<Student>(LOCAL_STORAGE_KEYS.students)
        .filter((s) => s.classroom_id === classroomId)
        .map((s) => s.id);
    } else {
      const { data: students } = await supabase!
        .from("students")
        .select("id")
        .eq("classroom_id", classroomId);
      
      if (students) {
        studentIds = students.map((s) => s.id);
      }
    }

    if (studentIds.length === 0) return [];

    // Load AI reports from Local Storage
    const allReports = getLocalItem<AIReport>(LOCAL_STORAGE_KEYS.reports);
    return allReports.filter((r) => studentIds.includes(r.student_id));
  },

  async saveAIReport(report: Omit<AIReport, "id">): Promise<AIReport> {
    const list = getLocalItem<AIReport>(LOCAL_STORAGE_KEYS.reports);
    const existingIdx = list.findIndex((r) => r.student_id === report.student_id);
    const savedReport: AIReport = {
      ...report,
      id: existingIdx !== -1 ? list[existingIdx].id : "rep-" + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      list[existingIdx] = savedReport;
    } else {
      list.push(savedReport);
    }
    
    setLocalItem(LOCAL_STORAGE_KEYS.reports, list);

    if (!isDemoMode) {
      // Silently try to delete from Supabase if an old report exists to free up space
      try {
        await supabase!.from("ai_reports").delete().eq("student_id", report.student_id);
      } catch (e) {
        console.warn("Failed to delete legacy AI report from Supabase:", e);
      }
    }

    return savedReport;
  },

  // --- SYSTEM CLEANUP ---
  async cleanupClassroomData(
    classroomId: string,
    options: { attendance: boolean; scores: boolean; reports: boolean }
  ): Promise<void> {
    if (isDemoMode) {
      if (options.attendance) {
        const attendanceList = getLocalItem<Attendance>(LOCAL_STORAGE_KEYS.attendance)
          .filter((a) => a.classroom_id !== classroomId);
        setLocalItem(LOCAL_STORAGE_KEYS.attendance, attendanceList);
      }

      if (options.scores) {
        const assignments = getLocalItem<Assignment>(LOCAL_STORAGE_KEYS.assignments)
          .filter((a) => a.classroom_id === classroomId)
          .map((a) => a.id);
        
        if (assignments.length > 0) {
          const scoresList = getLocalItem<StudentScore>(LOCAL_STORAGE_KEYS.scores)
            .filter((s) => !assignments.includes(s.assignment_id));
          setLocalItem(LOCAL_STORAGE_KEYS.scores, scoresList);
        }
      }

      if (options.reports) {
        const students = getLocalItem<Student>(LOCAL_STORAGE_KEYS.students)
          .filter((s) => s.classroom_id === classroomId)
          .map((s) => s.id);
        
        if (students.length > 0) {
          const reportsList = getLocalItem<AIReport>(LOCAL_STORAGE_KEYS.reports)
            .filter((r) => !students.includes(r.student_id));
          setLocalItem(LOCAL_STORAGE_KEYS.reports, reportsList);
        }
      }
      return;
    }

    // Production (Supabase) Cleanup
    if (options.attendance) {
      const { error } = await supabase!
        .from("attendance")
        .delete()
        .eq("classroom_id", classroomId);
      if (error) throw error;
    }

    if (options.scores) {
      const { data: assignments } = await supabase!
        .from("assignments")
        .select("id")
        .eq("classroom_id", classroomId);
      
      if (assignments && assignments.length > 0) {
        const assIds = assignments.map((a) => a.id);
        const { error } = await supabase!
          .from("student_scores")
          .delete()
          .in("assignment_id", assIds);
        if (error) throw error;
      }
    }

    if (options.reports) {
      const { data: students } = await supabase!
        .from("students")
        .select("id")
        .eq("classroom_id", classroomId);
      
      if (students && students.length > 0) {
        const studentIds = students.map((s) => s.id);

        // Delete from local storage
        const reportsList = getLocalItem<AIReport>(LOCAL_STORAGE_KEYS.reports)
          .filter((r) => !studentIds.includes(r.student_id));
        setLocalItem(LOCAL_STORAGE_KEYS.reports, reportsList);

        // Also delete from Supabase database to clean up legacy data
        const { error } = await supabase!
          .from("ai_reports")
          .delete()
          .in("student_id", studentIds);
        if (error) throw error;
      }
    }
  },
};
