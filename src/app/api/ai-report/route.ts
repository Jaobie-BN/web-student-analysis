import { NextRequest, NextResponse } from "next/server";
import { generateSmartStudentReport } from "@/utils/mathUtils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentCode,
      studentName,
      attendanceRate,
      finalPercentage,
      grade,
      risk,
      componentScores,
      notes,
    } = body;

    const report = generateSmartStudentReport({
      studentCode: studentCode || "",
      studentName: studentName || "",
      attendanceRate: attendanceRate || 100,
      totalAbsences: 0,
      finalPercentage: finalPercentage || 0,
      grade: grade || "0",
      risk: risk || "green",
      componentScores: componentScores || {},
      lateCount: 0,
      missingCount: 0,
      notes: notes || "",
    });

    return NextResponse.json({
      summary: report.summary,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      recommendations: report.recommendations,
      isMock: true,
    });
  } catch (err: any) {
    console.error("Report generation failed:", err);
    return NextResponse.json(
      { error: "ล้มเหลวในการประมวลผลบทวิเคราะห์: " + (err.message || "") },
      { status: 500 }
    );
  }
}
