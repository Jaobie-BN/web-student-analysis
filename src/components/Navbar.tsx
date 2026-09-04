"use client";

import { useState } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { Plus, ChevronDown, Check, BookOpen, Sun, Moon } from "lucide-react";

export default function Navbar() {
  const {
    classrooms,
    currentClassroom,
    setCurrentClassroom,
    createClassroom,
  } = useClassroom();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { success, error: toastError } = useToast();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // New classroom form state
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("ทุกวันจันทร์");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    
    if (!name.trim()) {
      setErrorMsg("กรุณากรอกชื่อวิชา/ห้องเรียน");
      setLoading(false);
      return;
    }

    try {
      await createClassroom(name, schedule, startDate, totalWeeks);
      setModalOpen(false);
      setName("");
      setSchedule("ทุกวันจันทร์");
      setStartDate(new Date().toISOString().split("T")[0]);
      setTotalWeeks(18);
      success(`สร้างห้องเรียน "${name}" สำเร็จเรียบร้อย!`);
    } catch (err: any) {
      const msg = err.message || "เกิดข้อผิดพลาดในการสร้างห้องเรียน";
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 shadow-sm h-16 px-4 md:px-6 flex items-center justify-between no-print transition-colors duration-200">
        {/* Left Side: Brand and Classroom Switcher */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2.5 text-primary dark:text-sky-400 font-bold tracking-wide">
            <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-sky-400/15 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary dark:text-sky-400" />
            </div>
            <span className="hidden sm:inline text-slate-900 dark:text-slate-100 text-xs font-bold uppercase tracking-wider">STUDENT ANALYTICS</span>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block" />

          {/* Classroom Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/40 dark:hover:border-sky-400/40 text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="text-xs md:text-sm font-medium truncate max-w-[160px] md:max-w-[240px]">
                {currentClassroom ? currentClassroom.name : "กรุณาเลือกห้องเรียน/วิชา"}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  ห้องเรียนของคุณ
                </div>
                
                <div className="max-h-60 overflow-y-auto">
                  {classrooms.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCurrentClassroom(c);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs md:text-sm flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        currentClassroom?.id === c.id ? "text-primary dark:text-sky-400 bg-primary/10 dark:bg-sky-400/10 font-bold" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {currentClassroom?.id === c.id && <Check className="w-4 h-4 text-primary dark:text-sky-400 shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1.5" />

                <button
                  onClick={() => {
                    setModalOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs md:text-sm text-primary dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างห้องเรียนใหม่</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Theme Switcher & Actions */}
        <div className="flex items-center gap-3">
          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-primary/40 dark:hover:border-sky-400/40 transition-all active:scale-95 cursor-pointer shadow-sm text-xs font-semibold"
            title={resolvedTheme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)" : "เปลี่ยนเป็นโหมดมืด (Dark Mode)"}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300 shrink-0" />
                <span className="hidden sm:inline">โหมดมืด</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-300 shrink-0" />
                <span className="hidden sm:inline">โหมดสว่าง</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Create Classroom Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="w-full max-w-md glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl glow-input">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary dark:text-sky-400" />
              <span>สร้างห้องเรียน/วิชาใหม่</span>
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  ชื่อวิชา / ห้องเรียน *
                </label>
                <input
                  type="text"
                  placeholder="เช่น ม.6/1 (วิทยาการคำนวณ)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-800 dark:text-slate-100 outline-none text-sm glow-input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  ตารางเรียนรายสัปดาห์
                </label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-700 dark:text-slate-200 outline-none text-sm glow-input"
                >
                  <option value="ทุกวันจันทร์">ทุกวันจันทร์</option>
                  <option value="ทุกวันอังคาร">ทุกวันอังคาร</option>
                  <option value="ทุกวันพุธ">ทุกวันพุธ</option>
                  <option value="ทุกวันพฤหัสบดี">ทุกวันพฤหัสบดี</option>
                  <option value="ทุกวันศุกร์">ทุกวันศุกร์</option>
                  <option value="ทุกวันเสาร์">ทุกวันเสาร์</option>
                  <option value="ทุกวันอาทิตย์">ทุกวันอาทิตย์</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    วันที่เริ่มต้นภาคเรียน
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-700 dark:text-slate-200 outline-none text-sm glow-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    จำนวนสัปดาห์ทั้งหมด
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={totalWeeks}
                    onChange={(e) => setTotalWeeks(parseInt(e.target.value) || 18)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-700 dark:text-slate-200 outline-none text-sm glow-input"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 text-sm font-semibold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
