import { NextRequest, NextResponse } from "next/server";
import { lineService } from "@/utils/lineService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lineUserId, roomCode, studentCode, verifyName, displayName, pictureUrl } = body;

    if (!lineUserId || !roomCode || !studentCode || !verifyName) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบทุกช่อง (LINE User ID, รหัสห้อง, รหัสนักเรียน, และชื่อ/นามสกุล)" },
        { status: 400 }
      );
    }

    const result = await lineService.bindStudent(
      lineUserId,
      roomCode,
      studentCode,
      verifyName,
      { displayName, pictureUrl }
    );

    return NextResponse.json({
      success: true,
      message: `ผูกบัญชีกับวิชา "${result.classroom.name}" สำเร็จเรียบร้อย!`,
      student: result.student,
      classroom: result.classroom,
    });
  } catch (err: any) {
    console.error("Binding error:", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการผูกบัญชี กรุณาลองใหม่อีกครั้ง" },
      { status: 400 }
    );
  }
}
