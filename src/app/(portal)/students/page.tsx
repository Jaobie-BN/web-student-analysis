"use client";

import { useState, useRef } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { Student } from "@/utils/db";
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";

export default function StudentsPage() {
  const {
    currentClassroom,
    students,
    createStudent,
    importStudents,
    deleteStudent,
    updateStudent,
    loading: classroomLoading
  } = useClassroom();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [code, setCode] = useState("");
  const [prefix, setPrefix] = useState("นาย");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notes, setNotes] = useState("");

  // Search & Bulk upload state
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (classroomLoading) {
    return (
      <div className="space-y-8 animate-pulse text-slate-800">
        {/* Title skeleton */}
        <div>
          <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800/60 rounded mb-2"></div>
          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
        </div>

        {/* Grid workspace skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side Form skeleton */}
          <div className="glass-panel rounded-3xl p-6 bg-white lg:col-span-1 space-y-6">
            <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800/60 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-800/60 rounded-xl"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Excel Import Panel skeleton */}
            <div className="glass-panel rounded-3xl p-6 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800/60 shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
                    <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
                  </div>
                </div>
                <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800/60 rounded-lg shrink-0"></div>
              </div>
              <div className="h-28 w-full bg-slate-200/50 dark:bg-slate-800/30 rounded-2xl"></div>
            </div>

            {/* Student List View skeleton */}
            <div className="glass-panel rounded-3xl p-6 bg-white space-y-4">
              <div className="flex justify-between items-center mb-6">
                <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
                <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800/60 rounded-xl"></div>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200"></div>
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
                      <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
                      <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Users className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-505 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนการจัดการรายชื่อนักเรียน</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    setLoading(true);

    if (!code.trim() || !firstName.trim() || !lastName.trim()) {
      setNotification({ type: "error", msg: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" });
      setLoading(false);
      return;
    }

    try {
      if (editingStudent) {
        // Edit student
        await updateStudent(editingStudent.id, {
          student_code: code,
          prefix,
          first_name: firstName,
          last_name: lastName,
          notes,
        });
        setNotification({ type: "success", msg: `แก้ไขข้อมูลของ ${firstName} สำเร็จ!` });
        setEditingStudent(null);
      } else {
        // Create student
        await createStudent(code, prefix, firstName, lastName, notes);
        setNotification({ type: "success", msg: `เพิ่มนักเรียน ${firstName} เข้าสู่ระบบสำเร็จ!` });
      }

      // Reset Form
      setCode("");
      setPrefix("นาย");
      setFirstName("");
      setLastName("");
      setNotes("");
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (std: Student) => {
    setEditingStudent(std);
    setCode(std.student_code);
    setPrefix(std.prefix || "นาย");
    setFirstName(std.first_name);
    setLastName(std.last_name);
    setNotes(std.notes || "");
    setNotification(null);
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setCode("");
    setPrefix("นาย");
    setFirstName("");
    setLastName("");
    setNotes("");
    setNotification(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบข้อมูลของ ${name} หรือไม่? คะแนนสะสมและเช็คชื่อทั้งหมดจะถูกลบถาวร!`)) return;
    
    try {
      await deleteStudent(id);
      setNotification({ type: "success", msg: `ลบข้อมูลนักเรียนเรียบร้อยแล้ว` });
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการลบนักเรียน" });
    }
  };

  // Excel template downloader
  const downloadTemplate = () => {
    const headers = [["student_code", "prefix", "first_name", "last_name", "notes"]];
    const sampleData = [
      ["1001", "นาย", "สมศักดิ์", "แก้วมณี", "หัวหน้าห้อง"],
      ["1002", "นางสาว", "วิมล", "ใจซื่อ", ""],
      ["1003", "เด็กหญิง", "ชลลดา", "ทรายแก้ว", ""],
      ["1004", "เด็กชาย", "ปกรณ์", "ทองอินทร์", "ช่วยเหลืองานครูบ่อย"]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อตัวอย่าง");
    
    // Download
    XLSX.writeFile(wb, `student_roster_template_${currentClassroom.name}.xlsx`);
  };

  // Handle excel upload parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setNotification(null);
    setBulkLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Parse rows as JSON objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);
        
        // Map and validate columns
        const studentImports = rawJson
          .map((row) => {
            const sc = row.student_code?.toString().trim();
            const pf = row.prefix?.toString().trim();
            const fn = row.first_name?.toString().trim();
            const ln = row.last_name?.toString().trim();
            const nt = row.notes?.toString().trim() || "";

            if (!sc || !fn || !ln) {
              return null; // Invalid row
            }

            return {
              student_code: sc,
              prefix: pf || "",
              first_name: fn,
              last_name: ln,
              notes: nt,
            };
          })
          .filter(Boolean) as Omit<Student, "id" | "classroom_id">[];

        if (studentImports.length === 0) {
          throw new Error("ไม่พบข้อมูลนักเรียนที่ถูกต้องตามคอลัมน์ที่กำหนด (student_code, prefix, first_name, last_name)");
        }

        await importStudents(studentImports);
        setNotification({
          type: "success",
          msg: `อัปโหลดรายชื่อนักเรียนสำเร็จ! นำเข้ารายชื่อใหม่จำนวน ${studentImports.length} คน เรียบร้อยแล้ว`,
        });
        
        // Clear file input
        setBulkFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) {
        setNotification({ type: "error", msg: err.message || "ล้มเหลวในการอ่านหรือนำเข้าไฟล์ Excel" });
      } finally {
        setBulkLoading(false);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      s.student_code.toLowerCase().includes(query) ||
      `${s.prefix || ""}${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
      (s.notes && s.notes.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
          <Users className="w-8 h-8 text-primary-600" />
          <span>รายชื่อนักเรียนในชั้นเรียน</span>
        </h2>
        <p className="text-slate-600 text-sm mt-1.5">
          จัดการรายชื่อ ค้นหานักเรียน นำเข้าข้อมูลด้วยไฟล์เทมเพลต Excel (.xlsx) อย่างสะดวกรวดเร็ว
        </p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-250 text-emerald-700"
              : "bg-rose-50 border-rose-250 text-rose-700"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* Grid workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Forms (Manual Addition / Edit) */}
        <div className="glass-panel rounded-3xl p-6 bg-white lg:col-span-1 space-y-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-600" />
            <span>{editingStudent ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียนรายคน"}</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                รหัสนักเรียน (Student Code) *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น 1001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-800 outline-none text-sm font-mono glow-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                คำนำหน้าชื่อ (Prefix)
              </label>
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-700 outline-none text-sm glow-input"
              >
                <option value="นาย">นาย</option>
                <option value="นางสาว">นางสาว</option>
                <option value="เด็กชาย">เด็กชาย</option>
                <option value="เด็กหญิง">เด็กหญิง</option>
                <option value="ด.ช.">ด.ช.</option>
                <option value="ด.ญ.">ด.ญ.</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider mb-2">
                  ชื่อจริง *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมศักดิ์"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-800 outline-none text-sm glow-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider mb-2">
                  นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น แก้วมณี"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-800 outline-none text-sm glow-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-2">
                หมายเหตุ / คำอธิบายย่อ (Notes)
              </label>
              <textarea
                placeholder="เช่น หัวหน้าห้อง, โควตากีฬา"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-800 outline-none text-sm resize-none glow-input"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {editingStudent && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 text-sm font-semibold transition-all cursor-pointer glow-input"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-750 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>{editingStudent ? "บันทึกแก้ไข" : "เพิ่มเข้าชั้นเรียน"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Roster Table & Excel Import */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Excel Import Panel */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">นำเข้าด้วยไฟล์ Excel (.xlsx)</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    ดาวน์โหลดรูปแบบเทมเพลต กรอกข้อมูล และนำเข้าเพื่อสร้างรายชื่อนักเรียนยกห้องเรียน
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-primary-600 hover:text-primary-750 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>โหลดเทมเพลต Excel</span>
              </button>
            </div>

            <div className="mt-4 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer group">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={bulkLoading}
              />
              {bulkLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
                  <span className="text-xs text-primary-655 font-semibold">กำลังอ่านไฟล์ Excel...</span>
                </div>
              ) : bulkFile ? (
                <div className="flex items-center gap-2 text-primary-655 font-bold text-xs">
                  <FileText className="w-5 h-5" />
                  <span>{bulkFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary-600 transition-colors mb-2" />
                  <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors font-semibold">
                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่ออัปโหลดไฟล์ Excel (.xlsx)
                  </span>
                  <span className="text-[9px] text-slate-400 mt-1">
                    รองรับเฉพาะคอลัมน์ student_code, prefix, first_name, last_name, notes
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Student List View */}
          <div className="glass-panel rounded-3xl p-6 bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-base font-bold text-slate-800">
                รายชื่อนักเรียน ({students.length} คน)
              </h3>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-805 text-xs focus:border-primary-500 outline-none glow-input"
                />
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">รหัสนักเรียน</th>
                      <th className="px-5 py-3">ชื่อ - นามสกุล</th>
                      <th className="px-5 py-3">หมายเหตุ / คำอธิบาย</th>
                      <th className="px-5 py-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-655">
                    {filteredStudents.map((std) => (
                      <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-primary-700">{std.student_code}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {`${std.prefix || ""}${std.first_name} ${std.last_name}`}
                        </td>
                        <td className="px-5 py-3 text-slate-400 italic max-w-[180px] truncate">
                          {std.notes || "-"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => startEdit(std)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-700 transition-colors"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(std.id, `${std.first_name} ${std.last_name}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="ลบนักเรียน"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-medium">
                ไม่พบรายชื่อนักเรียนตามคำค้นหาในวิชานี้
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
