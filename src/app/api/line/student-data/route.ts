import { NextRequest, NextResponse } from "next/server";
import { lineService } from "@/utils/lineService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get("lineUserId");
    let studentId = searchParams.get("studentId");
    let classroomId = searchParams.get("classroomId");

    // If lineUserId is provided, resolve studentId and classroomId
    if (lineUserId && (!studentId || !classroomId)) {
      const { active } = await lineService.getStudentBindings(lineUserId);
      if (!active) {
        return NextResponse.json({ error: "ยังไม่ได้ผูกบัญชีกับห้องเรียนใดๆ" }, { status: 404 });
      }
      studentId = active.student_id;
      classroomId = active.classroom_id;
    }

    if (!studentId || !classroomId) {
      return NextResponse.json({ error: "Missing studentId or classroomId" }, { status: 400 });
    }

    // Fetch score report, missing assignments, attendance, and AI report in parallel
    const [scoreReport, missingData, attendanceStats, aiReportData] = await Promise.all([
      lineService.getScoreReport(studentId, classroomId),
      lineService.getMissingAssignments(studentId, classroomId),
      lineService.getAttendanceStats(studentId, classroomId),
      lineService.getAIReport(studentId, classroomId),
    ]);

    return NextResponse.json({
      success: true,
      scoreReport,
      missingAssignments: missingData.missing,
      attendanceStats,
      aiReport: aiReportData.report,
    });
  } catch (err: any) {
    console.error("Error fetching student data:", err);
    return NextResponse.json({ error: err.message || "Failed to load student data" }, { status: 500 });
  }
}
