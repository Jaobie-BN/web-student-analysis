import { supabase } from "./supabaseClient";
export const isDemoMode = false;

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
    assignment_order?: string[];
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
// DATABASE API INTERFACE
// ----------------------------------------------------

export const db = {
  // --- AUTH ---
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  // --- CLASSROOMS ---
  async getClassrooms(): Promise<Classroom[]> {
    const { data, error } = await supabase
      .from("classrooms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByIdClassroom(id: string): Promise<Classroom | null> {
    const { data, error } = await supabase
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

    const { data, error } = await supabase
      .from("classrooms")
      .insert({ ...classroom, teacher_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateClassroom(id: string, updates: Partial<Omit<Classroom, "id" | "teacher_id">>): Promise<Classroom> {
    const { data, error } = await supabase
      .from("classrooms")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteClassroom(id: string): Promise<void> {
    const { error } = await supabase.from("classrooms").delete().eq("id", id);
    if (error) throw error;
  },

  // --- STUDENTS ---
  async getStudents(classroomId: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("classroom_id", classroomId)
      .order("student_code", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createStudent(student: Omit<Student, "id">): Promise<Student> {
    const { data, error } = await supabase
      .from("students")
      .insert(student)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkInsertStudents(students: Omit<Student, "id">[]): Promise<Student[]> {
    if (students.length === 0) return [];
    const { data, error } = await supabase
      .from("students")
      .insert(students)
      .select();
    if (error) throw error;
    return data || [];
  },

  async updateStudent(id: string, updates: Partial<Omit<Student, "id" | "classroom_id">>): Promise<Student> {
    const { data, error } = await supabase
      .from("students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStudent(id: string): Promise<void> {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
  },

  // --- ATTENDANCE ---
  async getAttendance(classroomId: string): Promise<Attendance[]> {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("classroom_id", classroomId);
    if (error) throw error;
    return data || [];
  },

  async saveAttendance(records: Omit<Attendance, "id">[]): Promise<void> {
    if (records.length === 0) return;
    const { error } = await supabase
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
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("classroom_id", classroomId);
    if (error) throw error;
    return data || [];
  },

  async createAssignment(assignment: Omit<Assignment, "id">): Promise<Assignment> {
    const { data, error } = await supabase
      .from("assignments")
      .insert(assignment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAssignment(id: string, updates: Partial<Omit<Assignment, "id" | "classroom_id">>): Promise<Assignment> {
    const { data, error } = await supabase
      .from("assignments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAssignment(id: string): Promise<void> {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) throw error;
  },

  // --- SCORES ---
  async getScores(classroomId: string): Promise<StudentScore[]> {
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id")
      .eq("classroom_id", classroomId);
    
    if (!assignments || assignments.length === 0) return [];
    
    const assIds = assignments.map((a) => a.id);
    const { data, error } = await supabase
      .from("student_scores")
      .select("*")
      .in("assignment_id", assIds);
    if (error) throw error;
    return data || [];
  },

  async saveScores(scores: Omit<StudentScore, "id">[]): Promise<void> {
    if (scores.length === 0) return;

    const toUpsert = scores.filter((s) => s.score !== null);
    const toDelete = scores.filter((s) => s.score === null);

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
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

      const { data: existing } = await supabase
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
            supabase
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
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("classroom_id", classroomId);
    
    if (!students || students.length === 0) return [];
    
    const studentIds = students.map((s) => s.id);
    const { data, error } = await supabase
      .from("ai_reports")
      .select("*")
      .in("student_id", studentIds);
    if (error) throw error;
    return data || [];
  },

  async saveAIReport(report: Omit<AIReport, "id">): Promise<AIReport> {
    const { data, error } = await supabase
      .from("ai_reports")
      .upsert({
        student_id: report.student_id,
        performance_summary: report.performance_summary,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        recommendations: report.recommendations,
      }, { onConflict: "student_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- SYSTEM CLEANUP ---
  async cleanupClassroomData(
    classroomId: string,
    options: { attendance: boolean; scores: boolean; reports: boolean }
  ): Promise<void> {
    if (options.attendance) {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("classroom_id", classroomId);
      if (error) throw error;
    }

    if (options.scores) {
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("classroom_id", classroomId);
      
      if (assignments && assignments.length > 0) {
        const assIds = assignments.map((a) => a.id);
        const { error } = await supabase
          .from("student_scores")
          .delete()
          .in("assignment_id", assIds);
        if (error) throw error;
      }
    }

    if (options.reports) {
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("classroom_id", classroomId);
      
      if (students && students.length > 0) {
        const studentIds = students.map((s) => s.id);
        const { error } = await supabase
          .from("ai_reports")
          .delete()
          .in("student_id", studentIds);
        if (error) throw error;
      }
    }
  },
};
