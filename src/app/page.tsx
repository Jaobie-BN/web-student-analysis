"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/context/ClassroomContext";
import { db } from "@/utils/db";
import { supabase } from "@/utils/supabaseClient";
import { LogIn, UserPlus, BookOpen } from "lucide-react";

export default function AuthPage() {
  const { user, refreshClassrooms } = useClassroom();
  const router = useRouter();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase!.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg("สมัครสมาชิกสำเร็จ! โปรดตรวจสอบอีเมลของคุณเพื่อยืนยันตน หรือเข้าสู่ระบบได้ทันทีหากระบบข้ามขั้นตอนการยืนยัน");
      } else {
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-hidden px-4 transition-colors duration-200">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-200/30 dark:bg-primary-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-200/20 dark:bg-sky-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* App Title Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 dark:bg-sky-400/10 border border-primary/20 dark:border-sky-400/20 text-primary dark:text-sky-400 mb-4 animate-bounce">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Student Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Classroom Management & AI-Powered Grading Suite
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          <h2 className="text-xl font-bold text-center mb-6 text-slate-800 dark:text-slate-100">
            {isSignUp ? "สร้างบัญชีผู้ใช้ใหม่ (สำหรับครู)" : "เข้าสู่ระบบ (Teacher Portal)"}
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                อีเมล (Email)
              </label>
              <input
                type="email"
                required
                placeholder="teacher@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-800 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 text-sm glow-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-800 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 text-sm glow-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>สมัครใช้งาน</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle login/signup */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {isSignUp ? (
              <p>
                มีบัญชีอยู่แล้ว?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                >
                  เข้าสู่ระบบที่นี่
                </button>
              </p>
            ) : (
              <p>
                ยังไม่มีบัญชีครู?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                >
                  สมัครสมาชิกใหม่
                </button>
              </p>
            )}
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} Student Analytics System. พัฒนาขึ้นสำหรับคุณครู
        </p>
      </div>
    </div>
  );
}
