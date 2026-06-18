"use client";

import { useState } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { LogOut, Plus, ChevronDown, Check, LayoutGrid, BookOpen, AlertCircle } from "lucide-react";

export default function Navbar() {
  const {
    user,
    classrooms,
    currentClassroom,
    setCurrentClassroom,
    createClassroom,
    logout
  } = useClassroom();

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
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการสร้างห้องเรียน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="bg-surface/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-200 shadow-sm h-16 px-6 flex items-center justify-between no-print">
        {/* Left Side: Brand and Classroom Switcher */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary font-bold tracking-wide">
            <BookOpen className="w-5 h-5" />
            <span className="hidden md:inline text-slate-900 text-label-md font-label-md font-bold uppercase tracking-wider">STUDENT ANALYTICS</span>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 hidden md:block" />

          {/* Classroom Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-slate-200 hover:border-primary/30 text-sm font-semibold text-slate-900 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="text-body-sm font-body-sm font-medium">{currentClassroom ? currentClassroom.name : "กรุณาเลือกห้องเรียน/วิชา"}</span>
              <ChevronDown className="w-4 h-4 text-outline" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-surface border border-slate-200 rounded-lg shadow-level-2 py-2 z-50">
                <div className="px-3 py-1.5 text-outline text-xs font-bold uppercase tracking-wider">
                  ห้องเรียนของคุณ
                </div>
                
                {classrooms.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCurrentClassroom(c);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-primary/5 hover:text-primary transition-colors ${
                      currentClassroom?.id === c.id ? "text-primary bg-primary/5 font-bold" : "text-on-surface-variant"
                    }`}
                  >
                    <span className="truncate text-body-sm font-body-sm">{c.name}</span>
                    {currentClassroom?.id === c.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}

                <div className="h-[1px] bg-slate-100 my-2" />

                <button
                  onClick={() => {
                    setModalOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-primary/5 flex items-center gap-2 transition-colors font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-label-sm font-label-sm">สร้างห้องเรียนใหม่</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Demo Mode */}
        <div className="flex items-center gap-4">
        </div>
      </nav>

      {/* Create Classroom Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="w-full max-w-md glass-panel bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl glow-input">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary-600" />
              <span>สร้างห้องเรียน/วิชาใหม่</span>
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  ชื่อวิชา / ห้องเรียน *
                </label>
                <input
                  type="text"
                  placeholder="เช่น ม.6/1 (วิทยาการคำนวณ)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-800 outline-none text-sm glow-input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  ตารางเรียนรายสัปดาห์
                </label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-700 outline-none text-sm glow-input"
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    วันที่เริ่มต้นภาคเรียน
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-700 outline-none text-sm glow-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    จำนวนสัปดาห์ทั้งหมด
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={totalWeeks}
                    onChange={(e) => setTotalWeeks(parseInt(e.target.value) || 18)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-slate-700 outline-none text-sm glow-input"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-800 text-sm font-semibold transition-all cursor-pointer glow-input"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-all cursor-pointer"
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
