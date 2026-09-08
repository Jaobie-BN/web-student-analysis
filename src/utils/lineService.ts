import { supabaseAdmin } from "./supabaseAdmin";
import { calculateFinalGrade, AttendanceStatus, StudentAssignmentRecord } from "./mathUtils";

export const lineService = {
  /**
   * Find student bindings by LINE user ID
   */
  async getStudentBindings(lineUserId: string) {
    const { data, error } = await supabaseAdmin
      .from("student_line_accounts")
      .select(`
        id,
        line_user_id,
        student_id,
        classroom_id,
        is_active,
        students:student_id (
          id,
          student_code,
          prefix,
          first_name,
          last_name
        ),
        classrooms:classroom_id (
          id,
          name,
          room_code
        )
      `)
      .eq("line_user_id", lineUserId);

    if (error || !data || data.length === 0) {
      return { active: null, all: [] };
    }

    const all = data.map((d: any) => ({
      id: d.id,
      student_id: d.student_id,
      classroom_id: d.classroom_id,
      is_active: d.is_active,
      student: d.students,
      classroom: d.classrooms,
    }));

    // Find active or default to the first one
    const active = all.find((item) => item.is_active) || all[0];
    return { active, all };
  },

  /**
   * Switch active classroom for a student
   */
  async switchActiveBinding(lineUserId: string, classroomId: string) {
    // Reset all to is_active = false
    await supabaseAdmin
      .from("student_line_accounts")
      .update({ is_active: false })
      .eq("line_user_id", lineUserId);

    // Set target to is_active = true
    const { data, error } = await supabaseAdmin
      .from("student_line_accounts")
      .update({ is_active: true })
      .eq("line_user_id", lineUserId)
      .eq("classroom_id", classroomId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Calculate score and grade report for student
   */
  async getScoreReport(studentId: string, classroomId: string) {
    // 1. Fetch Classroom
    const { data: classroom, error: cErr } = await supabaseAdmin
      .from("classrooms")
      .select("*")
      .eq("id", classroomId)
      .single();
    if (cErr || !classroom) throw new Error("ไม่พบข้อมูลห้องเรียน");

    // 2. Fetch Student
    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();
    if (sErr || !student) throw new Error("ไม่พบข้อมูลนักเรียน");

    // 3. Fetch Assignments
    const { data: assignments, error: aErr } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("classroom_id", classroomId);
    if (aErr) throw aErr;

    // 4. Fetch Student Scores
    const assIds = (assignments || []).map((a) => a.id);
    let scores: any[] = [];
    if (assIds.length > 0) {
      const { data: scoreData, error: scErr } = await supabaseAdmin
        .from("student_scores")
        .select("*")
        .eq("student_id", studentId)
        .in("assignment_id", assIds);
      if (scErr) throw scErr;
      scores = scoreData || [];
    }

    // 5. Fetch Attendance
    const { data: attendanceData, error: attErr } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .eq("classroom_id", classroomId);
    if (attErr) throw attErr;

    // Map records for calculateFinalGrade
    const assignmentRecords: StudentAssignmentRecord[] = (assignments || []).map((ass) => {
      const foundScore = scores.find((s) => s.assignment_id === ass.id);
      return {
        assignmentId: ass.id,
        score: foundScore ? foundScore.score : null,
        maxScore: Number(ass.max_score) || 100,
        assignmentType: ass.assignment_type as "score" | "check",
        isLate: foundScore ? foundScore.is_late : false,
        gradeComponent: ass.grade_component,
        manualWeight: Number(ass.assignment_weight) || 100,
      };
    });

    const attendanceRecords = (attendanceData || []).map((att) => ({
      status: att.status as AttendanceStatus,
    }));

    const result = calculateFinalGrade(
      classroom.grade_weights || {},
      classroom.grade_weight_modes || {},
      assignmentRecords,
      attendanceRecords,
      classroom.grade_thresholds,
      {
        ...classroom.behavior_config,
        totalWeeks: classroom.total_weeks,
        weeklySchedule: classroom.weekly_schedule,
      }
    );

    // Helper to translate component names to friendly Thai labels
    const getThaiCompName = (name: string) => {
      const lower = name.toLowerCase().trim();
      if (
        lower === "attendance" ||
        lower === "จิตพิสัย" ||
        lower === "เวลาเรียน" ||
        lower === "การเข้าเรียน" ||
        lower === "เช็คชื่อ" ||
        lower === "จิตพิสัย/เข้าเรียน"
      ) {
        return "จิตพิสัย";
      }
      if (lower === "homework") return "ใบงาน/การบ้าน";
      if (lower === "midterm") return "ทดสอบกลางภาค";
      if (lower === "final") return "ทดสอบปลายภาค";
      return name;
    };

    // Format components breakdown with earned points based on category weight
    const components = Object.keys(classroom.grade_weights || {}).map((key) => {
      const weight = Number(classroom.grade_weights[key]) || 0;
      const score100 = result.componentScores[key] ?? 0;
      const rawEarned = (score100 / 100) * weight;
      return {
        name: key,
        displayName: getThaiCompName(key),
        score: score100, // percentage 0-100%
        earnedScore: parseFloat(rawEarned.toFixed(1)),
        weight: weight,
      };
    });

    // Find behavior category weight (e.g. 20%)
    const behaviorWeightKey = Object.keys(classroom.grade_weights || {}).find((k) => {
      const lower = k.toLowerCase().trim();
      return (
        lower === "attendance" ||
        lower === "จิตพิสัย" ||
        lower === "เวลาเรียน" ||
        lower === "การเข้าเรียน" ||
        lower === "จิตพิสัย/เข้าเรียน"
      );
    });
    const behaviorWeight = behaviorWeightKey ? Number(classroom.grade_weights[behaviorWeightKey]) || 20 : 20;
    const behaviorEarned = (result.behaviorScore / 100) * behaviorWeight;

    return {
      student,
      classroom,
      finalGrade: result.grade,
      finalPercentage: result.finalPercentage,
      risk: result.risk,
      behaviorScore: parseFloat(behaviorEarned.toFixed(1)),
      behaviorMaxScore: behaviorWeight,
      behaviorScore100: result.behaviorScore,
      attendanceRate: result.attendanceRate,
      components,
    };
  },

  /**
   * Get missing assignments for student
   */
  async getMissingAssignments(studentId: string, classroomId: string) {
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, student_code, first_name, last_name")
      .eq("id", studentId)
      .single();

    const { data: classroom } = await supabaseAdmin
      .from("classrooms")
      .select("id, name, behavior_config")
      .eq("id", classroomId)
      .single();

    const { data: assignments } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: true });

    if (!assignments || assignments.length === 0) {
      return { student, classroom, missing: [] };
    }

    const assIds = assignments.map((a) => a.id);
    const { data: scores } = await supabaseAdmin
      .from("student_scores")
      .select("*")
      .eq("student_id", studentId)
      .in("assignment_id", assIds);

    const scoreMap = new Map<string, any>();
    (scores || []).forEach((sc) => scoreMap.set(sc.assignment_id, sc));

    // Missing = no score record OR score is null
    const missing = assignments
      .filter((ass) => {
        const sc = scoreMap.get(ass.id);
        return !sc || sc.score === null;
      })
      .map((ass) => ({
        id: ass.id,
        name: ass.name,
        grade_component: ass.grade_component,
        max_score: ass.max_score,
      }));

    // Sort missing assignments:
    // 1. If teacher custom-ordered columns in Gradebook (assignment_order), use that order
    // 2. Otherwise sort naturally by number/name (e.g. ใบงานที่ 2, 5, 7, 8)
    const customOrder = (classroom?.behavior_config as any)?.assignment_order || [];
    missing.sort((a, b) => {
      if (customOrder.length > 0) {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }
      return a.name.localeCompare(b.name, "th", { numeric: true });
    });

    return { student, classroom, missing };
  },

  /**
   * Get attendance breakdown
   */
  async getAttendanceStats(studentId: string, classroomId: string) {
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, student_code, prefix, first_name, last_name")
      .eq("id", studentId)
      .single();

    const { data: classroom } = await supabaseAdmin
      .from("classrooms")
      .select("*")
      .eq("id", classroomId)
      .single();

    const { data: records } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .eq("classroom_id", classroomId);

    const attList = records || [];
    let present = 0;
    let late = 0;
    let sick = 0;
    let absent = 0;

    attList.forEach((r) => {
      if (r.status === "present") present++;
      else if (r.status === "late") late++;
      else if (r.status === "sick") sick++;
      else if (r.status === "absent") absent++;
    });

    const lpa = classroom?.behavior_config?.latesPerAbsence ?? 3;
    const totalWeeks = classroom?.total_weeks ?? 18;
    const lostPoints = absent + Math.floor(late / lpa) + (late % lpa) * 0.5;
    const earnedPoints = Math.max(0, totalWeeks - lostPoints);
    const percentage = totalWeeks > 0 ? (earnedPoints / totalWeeks) * 100 : 100;

    return {
      student,
      classroom,
      present,
      late,
      sick,
      absent,
      percentage: Math.min(100, Math.max(0, percentage)),
      totalSessions: attList.length,
    };
  },

  /**
   * Get AI summary report
   */
  async getAIReport(studentId: string, classroomId: string) {
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, student_code, first_name, last_name")
      .eq("id", studentId)
      .single();

    const { data: classroom } = await supabaseAdmin
      .from("classrooms")
      .select("id, name")
      .eq("id", classroomId)
      .single();

    const { data: report } = await supabaseAdmin
      .from("ai_reports")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    return {
      student,
      classroom,
      report: report || {
        performance_summary: "ยังไม่มีรายงานสรุปจากระบบ",
        strengths: "มีความตั้งใจในการเรียน",
        weaknesses: "หมั่นทบทวนบทเรียนและตรวจเช็คงานค้างอย่างสม่ำเสมอ",
        recommendations: "ปรึกษาครูผู้สอนหากมีข้อสงสัยในเนื้อหาการเรียน",
      },
    };
  },

  /**
   * Bind student LINE account
   */
  async bindStudent(
    lineUserId: string,
    roomCode: string,
    studentCode: string,
    verifyName: string,
    profile?: { displayName?: string; pictureUrl?: string }
  ) {
    const cleanRoomCode = roomCode.trim().toUpperCase();
    const cleanStudentCode = studentCode.trim();
    const cleanVerifyName = verifyName.trim().toLowerCase();

    // 1. Find classroom (supports room_code or id prefix)
    let { data: classroom, error: cErr } = await supabaseAdmin
      .from("classrooms")
      .select("id, name, room_code")
      .ilike("room_code", cleanRoomCode)
      .maybeSingle();

    // Fallback if room_code is prefix of classroom uuid id
    if (!classroom && cleanRoomCode.length >= 4) {
      const { data: fallbackClass } = await supabaseAdmin
        .from("classrooms")
        .select("id, name, room_code")
        .ilike("id", `${cleanRoomCode.toLowerCase()}%`)
        .maybeSingle();
      if (fallbackClass) {
        classroom = fallbackClass;
        cErr = null;
      }
    }

    if (cErr || !classroom) {
      console.error("bindStudent classroom lookup error:", cErr, "roomCode searched:", cleanRoomCode);
      throw new Error(`ไม่พบรหัสห้องเรียน "${cleanRoomCode}" กรุณาตรวจสอบรหัสห้องอีกครั้ง`);
    }

    // 2. Find student in classroom and check existing binding in one query
    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .select(`
        id,
        student_code,
        prefix,
        first_name,
        last_name,
        classroom_id,
        student_line_accounts (
          id,
          line_user_id
        )
      `)
      .eq("classroom_id", classroom.id)
      .eq("student_code", cleanStudentCode)
      .maybeSingle();

    if (sErr || !student) {
      console.error("bindStudent student lookup error:", sErr, "studentCode:", cleanStudentCode);
      throw new Error(`ไม่พบรหัสนักเรียน "${cleanStudentCode}" ในห้องเรียนนี้`);
    }

    // 3. Verify name (Check if first_name or last_name matches)
    const dbFirstName = student.first_name.trim().toLowerCase();
    const dbLastName = student.last_name.trim().toLowerCase();

    const matchesName =
      dbFirstName.includes(cleanVerifyName) ||
      cleanVerifyName.includes(dbFirstName) ||
      dbLastName.includes(cleanVerifyName) ||
      cleanVerifyName.includes(dbLastName);

    if (!matchesName) {
      throw new Error("ชื่อหรือนามสกุลไม่ตรงกับข้อมูลในระบบ กรุณาตรวจสอบและลองใหม่อีกครั้ง");
    }

    // 4. Check if student is already linked to another LINE user
    const existingBinding = (student as any).student_line_accounts?.[0];
    if (existingBinding && existingBinding.line_user_id !== lineUserId) {
      throw new Error("รหัสนักเรียนนี้ถูกผูกกับบัญชี LINE อื่นแล้ว กรุณาติดต่อคุณครูผู้สอน");
    }

    // 5. Check if THIS LINE user is already bound to a different student in this classroom
    const { data: userExistingBinding } = await supabaseAdmin
      .from("student_line_accounts")
      .select("id, student_id")
      .eq("line_user_id", lineUserId)
      .eq("classroom_id", classroom.id)
      .maybeSingle();

    if (userExistingBinding && userExistingBinding.student_id !== student.id) {
      throw new Error("บัญชี LINE นี้ได้ผูกกับนักเรียนในห้องเรียนนี้แล้ว หากต้องการเปลี่ยนข้อมูล กรุณาติดต่อคุณครูผู้สอนครับ");
    }

    // 6. Set other bindings for this LINE user to inactive so new classroom is active
    await supabaseAdmin
      .from("student_line_accounts")
      .update({ is_active: false })
      .eq("line_user_id", lineUserId);

    // 7. Upsert binding
    const { data: savedBinding, error: bErr } = await supabaseAdmin
      .from("student_line_accounts")
      .upsert(
        {
          line_user_id: lineUserId,
          student_id: student.id,
          classroom_id: classroom.id,
          display_name: profile?.displayName || null,
          picture_url: profile?.pictureUrl || null,
          is_active: true,
          linked_at: new Date().toISOString(),
        },
        { onConflict: "classroom_id,student_id" }
      )
      .select("id")
      .maybeSingle();

    if (bErr) throw bErr;

    return {
      binding: savedBinding,
      student,
      classroom,
    };
  },
};
