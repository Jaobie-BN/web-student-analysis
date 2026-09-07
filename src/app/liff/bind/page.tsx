"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Sparkles, BookOpen, User, Hash, Lock } from "lucide-react";

declare global {
  interface Window {
    liff?: any;
  }
}

function BindContent() {
  const searchParams = useSearchParams();
  const prefilledRoom = searchParams.get("room") || "";

  const [liffInitialized, setLiffInitialized] = useState(false);
  const [lineProfile, setLineProfile] = useState<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null>(null);

  const [roomCode, setRoomCode] = useState(prefilledRoom);
  const [studentCode, setStudentCode] = useState("");
  const [verifyName, setVerifyName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    studentName: string;
    classroomName: string;
  } | null>(null);

  // Initialize LIFF
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

    const initLiff = async () => {
      if (typeof window !== "undefined" && window.liff && liffId) {
        try {
          await window.liff.init({ liffId });
          setLiffInitialized(true);

          if (window.liff.isLoggedIn()) {
            const profile = await window.liff.getProfile();
            setLineProfile({
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            });
          } else {
            // Not logged in or in external browser
            window.liff.login();
          }
        } catch (err) {
          console.warn("LIFF init error:", err);
          setLiffInitialized(true);
        }
      } else {
        // Fallback for local development or when LIFF ID is not set yet
        setLiffInitialized(true);
      }
    };

    // Small delay to ensure script has loaded
    const timer = setTimeout(initLiff, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const userId = lineProfile?.userId || searchParams.get("userId") || "dev-line-user-demo";

    if (!roomCode.trim() || !studentCode.trim() || !verifyName.trim()) {
      setErrorMsg("กรุณากรอกข้อมูลให้ครบถ้วนทุกช่องครับ");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/line/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: userId,
          roomCode: roomCode.trim().toUpperCase(),
          studentCode: studentCode.trim(),
          verifyName: verifyName.trim(),
          displayName: lineProfile?.displayName || "LINE Student",
          pictureUrl: lineProfile?.pictureUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการผูกบัญชี");
      }

      setSuccessData({
        studentName: `${data.student.prefix || ""}${data.student.first_name} ${data.student.last_name}`,
        classroomName: data.classroom.name,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "ไม่สามารถผูกบัญชีได้");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.liff && window.liff.isInClient()) {
      window.liff.closeWindow();
    } else {
      window.close();
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6">
      {/* Top Banner */}
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ผูกบัญชีนักเรียน</h1>
            <p className="text-xs text-slate-500">เชื่อมต่อ LINE ของคุณเข้ากับห้องเรียน</p>
          </div>
        </div>

        {/* User Profile Card if in LINE */}
        {lineProfile && (
          <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl mb-6">
            {lineProfile.pictureUrl ? (
              <img
                src={lineProfile.pictureUrl}
                alt={lineProfile.displayName}
                className="w-10 h-10 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400">เข้าสู่ระบบด้วย LINE</p>
              <p className="text-sm font-semibold text-slate-700 truncate">{lineProfile.displayName}</p>
            </div>
          </div>
        )}

        {/* Success View */}
        {successData ? (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">ผูกบัญชีสำเร็จ!</h2>
            <p className="text-sm text-slate-600 mb-2">
              ยินดีต้อนรับ <span className="font-semibold text-emerald-600">{successData.studentName}</span>
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 w-full mb-6">
              วิชา: <span className="font-bold text-slate-800">{successData.classroomName}</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              ตอนนี้คุณสามารถกดปุ่มเมนูใน LINE เพื่อเช็คคะแนนและงานค้างได้ทันทีครับ
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-md transition-all"
            >
              ปิดหน้าต่างนี้และกลับสู่ LINE
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Room Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>รหัสห้องเรียน (Room Code)</span>
              </label>
              <input
                type="text"
                placeholder="เช่น ABC123"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">ขอรหัสห้อง 6 หลักได้จากคุณครูผู้สอน</span>
            </div>

            {/* Student Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                <span>รหัสนักเรียน (Student ID)</span>
              </label>
              <input
                type="text"
                placeholder="เช่น 12345 หรือ 67001"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                required
              />
            </div>

            {/* Verify Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>ชื่อ หรือ นามสกุลภาษาไทย (เพื่อยืนยันตัวตน)</span>
              </label>
              <input
                type="text"
                placeholder="พิมพ์ชื่อจริง หรือ นามสกุล"
                value={verifyName}
                onChange={(e) => setVerifyName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">เพื่อความปลอดภัย ป้องกันผู้อื่นแอบส่องคะแนน</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-medium rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 mt-4 disabled:opacity-50"
            >
              {loading ? (
                <span>กำลังตรวจสอบข้อมูล...</span>
              ) : (
                <>
                  <span>ยืนยันและผูกบัญชี</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer Note */}
      <div className="text-center pt-6 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">
          ระบบความปลอดภัยและการรายงานผลการเรียน © Student Analytics
        </p>
      </div>
    </div>
  );
}

export default function LiffBindPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">กำลังโหลดหน้าต่างเชื่อมต่อ...</div>}>
      <BindContent />
    </Suspense>
  );
}
