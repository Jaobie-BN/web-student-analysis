"use client";

import { useState, useRef } from "react";
import { useClassroom } from "@/context/ClassroomContext";
import { useToast } from "@/context/ToastContext";
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
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  Check
} from "lucide-react";
import * as XLSX from "xlsx";

export interface PreviewStudentItem {
  student_code: string;
  prefix: string;
  first_name: string;
  last_name: string;
  notes: string;
  status: "valid" | "duplicate_code" | "missing_data";
  reason?: string;
}

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
  const { success: toastSuccess, error: toastError } = useToast();

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
  const [loading, setLoading] = useState(false);

  // Live Import Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewList, setPreviewList] = useState<PreviewStudentItem[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!code.trim() || !firstName.trim() || !lastName.trim()) {
      toastError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
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
        toastSuccess(`แก้ไขข้อมูลของ ${firstName} สำเร็จ!`);
        setEditingStudent(null);
      } else {
        // Create student
        await createStudent(code, prefix, firstName, lastName, notes);
        toastSuccess(`เพิ่มนักเรียน ${firstName} เข้าสู่ระบบสำเร็จ!`);
      }

      // Reset Form
      setCode("");
      setPrefix("นาย");
      setFirstName("");
      setLastName("");
      setNotes("");
    } catch (err: any) {
      toastError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
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
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setCode("");
    setPrefix("นาย");
    setFirstName("");
    setLastName("");
    setNotes("");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบข้อมูลของ ${name} หรือไม่? คะแนนสะสมและเช็คชื่อทั้งหมดจะถูกลบถาวร!`)) return;
    
    try {
      await deleteStudent(id);
      toastSuccess(`ลบข้อมูลนักเรียนเรียบร้อยแล้ว`);
    } catch (err: any) {
      toastError(err.message || "เกิดข้อผิดพลาดในการลบนักเรียน");
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
    ws["!cols"] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อตัวอย่าง");
    
    // Download
    const className = currentClassroom?.name || "classroom";
    XLSX.writeFile(wb, `student_roster_template_${className}.xlsx`);
  };

  // Export students roster to Excel (.xlsx)
  const exportStudents = () => {
    if (students.length === 0) {
      toastError("ไม่มีรายชื่อนักเรียนในห้องเรียนนี้ให้ส่งออก");
      return;
    }

    // Sort students by student_code
    const sortedStudents = [...students].sort((a, b) =>
      a.student_code.localeCompare(b.student_code, undefined, { numeric: true })
    );

    // Sheet 1: Formatted Thai Sheet
    const thaiHeaders = [
      ["ลำดับ", "รหัสนักเรียน", "คำนำหน้า", "ชื่อ", "นามสกุล", "ชื่อ - นามสกุล", "หมายเหตุ"]
    ];
    const thaiRows = sortedStudents.map((s, idx) => [
      idx + 1,
      s.student_code,
      s.prefix || "",
      s.first_name,
      s.last_name,
      `${s.prefix || ""}${s.first_name} ${s.last_name}`,
      s.notes || ""
    ]);
    const wsThai = XLSX.utils.aoa_to_sheet([...thaiHeaders, ...thaiRows]);
    wsThai["!cols"] = [
      { wch: 8 },  // ลำดับ
      { wch: 15 }, // รหัสนักเรียน
      { wch: 12 }, // คำนำหน้า
      { wch: 20 }, // ชื่อ
      { wch: 20 }, // นามสกุล
      { wch: 30 }, // ชื่อ - นามสกุล
      { wch: 25 }, // หมายเหตุ
    ];

    // Sheet 2: Import-ready Sheet
    const importHeaders = [["student_code", "prefix", "first_name", "last_name", "notes"]];
    const importRows = sortedStudents.map((s) => [
      s.student_code,
      s.prefix || "",
      s.first_name,
      s.last_name,
      s.notes || ""
    ]);
    const wsImport = XLSX.utils.aoa_to_sheet([...importHeaders, ...importRows]);
    wsImport["!cols"] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsThai, "รายชื่อนักเรียน");
    XLSX.utils.book_append_sheet(wb, wsImport, "สำหรับนำเข้า_Import");

    const rawName = currentClassroom?.name || "classroom";
    const safeClassName = rawName.replace(/[/\\?%*:|"<>]/g, "_");
    const fileName = `รายชื่อนักเรียน_${safeClassName}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toastSuccess(`ส่งออกรายชื่อนักเรียนจำนวน ${students.length} คน เรียบร้อยแล้ว`);
  };

  // Handle excel upload parsing and open Preview Modal
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
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
        
        if (rawJson.length === 0) {
          throw new Error("ไฟล์ Excel ว่างเปล่า ไม่พบข้อมูลแถวในตาราง");
        }

        const existingCodes = new Set(students.map((s) => s.student_code.trim()));
        const seenInFileCodes = new Set<string>();

        const parsedItems: PreviewStudentItem[] = rawJson.map((row) => {
          const sc = (row.student_code ?? row["รหัสนักเรียน"] ?? row["รหัสประจำตัว"] ?? row["รหัส"])?.toString().trim() || "";
          const pf = (row.prefix ?? row["คำนำหน้า"] ?? row["คำนำหน้าชื่อ"])?.toString().trim() || "";
          let fn = (row.first_name ?? row["ชื่อ"] ?? row["ชื่อจริง"])?.toString().trim() || "";
          let ln = (row.last_name ?? row["นามสกุล"])?.toString().trim() || "";
          const nt = (row.notes ?? row["หมายเหตุ"] ?? row["คำอธิบาย"])?.toString().trim() || "";

          // Handle combined full name if first_name was not provided separately
          if (!fn && (row["ชื่อ - นามสกุล"] || row["ชื่อ-นามสกุล"] || row["ชื่อสกุล"])) {
            const fullName = (row["ชื่อ - นามสกุล"] || row["ชื่อ-นามสกุล"] || row["ชื่อสกุล"]).toString().trim();
            const parts = fullName.split(/\s+/);
            if (parts.length >= 2) {
              fn = parts[0];
              ln = parts.slice(1).join(" ");
            }
          }

          // Validation
          if (!sc || !fn || !ln) {
            return {
              student_code: sc || "-",
              prefix: pf,
              first_name: fn || "-",
              last_name: ln || "-",
              notes: nt,
              status: "missing_data",
              reason: "ข้อมูลไม่ครบถ้วน (ต้องระบุรหัส ชื่อ และนามสกุล)",
            };
          }

          if (existingCodes.has(sc)) {
            return {
              student_code: sc,
              prefix: pf,
              first_name: fn,
              last_name: ln,
              notes: nt,
              status: "duplicate_code",
              reason: "รหัสนักเรียนนี้มีอยู่ในระบบแล้ว",
            };
          }

          if (seenInFileCodes.has(sc)) {
            return {
              student_code: sc,
              prefix: pf,
              first_name: fn,
              last_name: ln,
              notes: nt,
              status: "duplicate_code",
              reason: "รหัสซ้ำกันในไฟล์เดียวกัน",
            };
          }

          seenInFileCodes.add(sc);

          return {
            student_code: sc,
            prefix: pf,
            first_name: fn,
            last_name: ln,
            notes: nt,
            status: "valid",
          };
        });

        setPreviewList(parsedItems);
        setShowPreviewModal(true);
      } catch (err: any) {
        toastError(err.message || "ล้มเหลวในการอ่านไฟล์ Excel");
      } finally {
        setBulkLoading(false);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  // Confirm import of valid rows
  const handleConfirmImport = async () => {
    const validRows = previewList
      .filter((s) => s.status === "valid")
      .map((s) => ({
        student_code: s.student_code,
        prefix: s.prefix || "",
        first_name: s.first_name,
        last_name: s.last_name,
        notes: s.notes || "",
      }));

    if (validRows.length === 0) {
      toastError("ไม่มีรายการที่พร้อมนำเข้า (กรุณาแก้ไขข้อมูลหรือตรวจสอบรหัสซ้ำ)");
      return;
    }

    setBulkLoading(true);
    try {
      await importStudents(validRows);
      toastSuccess(`นำเข้ารายชื่อใหม่จำนวน ${validRows.length} คน เรียบร้อยแล้ว!`);
      setShowPreviewModal(false);
      setPreviewList([]);
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toastError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูลนักเรียน");
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      s.student_code.toLowerCase().includes(query) ||
      `${s.prefix || ""}${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
      (s.notes && s.notes.toLowerCase().includes(query))
    );
  });

  if (classroomLoading) {
    return (
      <div className="space-y-6 animate-pulse text-slate-800 dark:text-slate-200">
        <div>
          <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-xl mb-2"></div>
          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 lg:col-span-1 space-y-6">
            <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="h-28 w-full bg-slate-200/50 dark:bg-slate-800/30 rounded-2xl"></div>
            </div>
            <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="h-48 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentClassroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Users className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">กรุณาเลือกหรือสร้างห้องเรียนก่อน</h2>
        <p className="text-slate-500 text-xs mt-2">คุณจำเป็นต้องเลือกห้องเรียนก่อนการจัดการรายชื่อนักเรียน</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 dark:bg-sky-400/10 text-primary dark:text-sky-400">
            <Users className="w-7 h-7" />
          </div>
          <span>รายชื่อนักเรียนในชั้นเรียน (Roster)</span>
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
          จัดการรายชื่อ ค้นหานักเรียน นำเข้าข้อมูลด้วยไฟล์เทมเพลต Excel (.xlsx) อย่างสะดวกรวดเร็ว
        </p>
      </div>

      {/* Grid workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Forms (Manual Addition / Edit) */}
        <div className="rounded-2xl p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 lg:col-span-1 space-y-5 shadow-sm">
          <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary dark:text-sky-400" />
            <span>{editingStudent ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียนรายคน"}</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                รหัสนักเรียน (Student Code) *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น 1001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 outline-none text-xs md:text-sm font-mono glow-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                คำนำหน้าชื่อ (Prefix)
              </label>
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-700 dark:text-slate-200 outline-none text-xs md:text-sm glow-input cursor-pointer"
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
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  ชื่อจริง *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมศักดิ์"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 outline-none text-xs md:text-sm glow-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น แก้วมณี"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 outline-none text-xs md:text-sm glow-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                หมายเหตุ (Notes)
              </label>
              <textarea
                placeholder="เช่น หัวหน้าห้อง, โควตากีฬา"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary text-slate-800 dark:text-slate-100 outline-none text-xs md:text-sm resize-none glow-input"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {editingStudent && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs md:text-sm font-semibold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <span>{editingStudent ? "บันทึกแก้ไข" : "เพิ่มเข้าชั้นเรียน"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Roster Table & Excel Import */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Excel Import Panel */}
          <div className="rounded-2xl p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">นำเข้าด้วยไฟล์ Excel (.xlsx)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ดาวน์โหลดรูปแบบเทมเพลต กรอกข้อมูล และนำเข้าเพื่อสร้างรายชื่อนักเรียนยกห้องเรียน
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-primary dark:text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>โหลดเทมเพลต</span>
                </button>
                <button
                  type="button"
                  onClick={exportStudents}
                  disabled={students.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="ส่งออกรายชื่อนักเรียนทั้งหมดในห้องเรียนนี้เป็นไฟล์ Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>ส่งออก Excel</span>
                </button>
              </div>
            </div>

            <div className="mt-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-sky-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer group">
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
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-xs text-primary dark:text-sky-400 font-semibold">กำลังอ่านไฟล์ Excel...</span>
                </div>
              ) : bulkFile ? (
                <div className="flex items-center gap-2 text-primary dark:text-sky-400 font-bold text-xs">
                  <FileText className="w-5 h-5" />
                  <span>{bulkFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary dark:group-hover:text-sky-400 transition-colors mb-2" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-sky-400 transition-colors font-semibold">
                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่ออัปโหลดไฟล์ Excel (.xlsx)
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    รองรับ student_code, prefix, first_name, last_name, notes หรือ รหัสนักเรียน, คำนำหน้า, ชื่อ, นามสกุล, หมายเหตุ
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Student List View */}
          <div className="rounded-2xl p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
                รายชื่อนักเรียน ({students.length} คน)
              </h3>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:border-primary outline-none glow-input"
                  />
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">รหัสนักเรียน</th>
                      <th className="px-4 py-3">ชื่อ - นามสกุล</th>
                      <th className="px-4 py-3">หมายเหตุ</th>
                      <th className="px-4 py-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredStudents.map((std) => (
                      <tr key={std.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-primary dark:text-sky-400">{std.student_code}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {`${std.prefix || ""}${std.first_name} ${std.last_name}`}
                        </td>
                        <td className="px-4 py-3 text-slate-400 italic max-w-[180px] truncate">
                          {std.notes || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => startEdit(std)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-sky-400 transition-colors"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(std.id, `${std.first_name} ${std.last_name}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
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
              <div className="text-center py-12 text-slate-400 font-medium">
                ไม่พบรายชื่อนักเรียนตามคำค้นหาในวิชานี้
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LIVE IMPORT PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
          <div className="glass-panel w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  <span>ตรวจสอบข้อมูลก่อนนำเข้า (Import Preview)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ระบบได้ตรวจสอบความสมบูรณ์และรหัสซ้ำของไฟล์ Excel เรียบร้อยแล้ว
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewList([]);
                  setBulkFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badges Summary */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">
                ทั้งหมดในไฟล์: <strong className="text-slate-800 dark:text-slate-200">{previewList.length}</strong> คน
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                พร้อมนำเข้า: {previewList.filter((s) => s.status === "valid").length} คน
              </span>
              {previewList.filter((s) => s.status === "duplicate_code").length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  รหัสซ้ำ: {previewList.filter((s) => s.status === "duplicate_code").length} คน
                </span>
              )}
              {previewList.filter((s) => s.status === "missing_data").length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  ข้อมูลไม่ครบ: {previewList.filter((s) => s.status === "missing_data").length} คน
                </span>
              )}
            </div>

            {/* Scrollable Preview Table */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-3 py-2 text-center w-12">#</th>
                      <th className="px-3 py-2">รหัส</th>
                      <th className="px-3 py-2">คำนำหน้า</th>
                      <th className="px-3 py-2">ชื่อ - นามสกุล</th>
                      <th className="px-3 py-2">หมายเหตุ</th>
                      <th className="px-3 py-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {previewList.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          item.status === "valid"
                            ? "hover:bg-emerald-500/5"
                            : item.status === "duplicate_code"
                            ? "bg-amber-500/5 hover:bg-amber-500/10"
                            : "bg-rose-500/5 hover:bg-rose-500/10"
                        }`}
                      >
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-200">{item.student_code}</td>
                        <td className="px-3 py-2 text-slate-500">{item.prefix || "-"}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">
                          {item.first_name} {item.last_name}
                        </td>
                        <td className="px-3 py-2 text-slate-400 italic max-w-[150px] truncate">{item.notes || "-"}</td>
                        <td className="px-3 py-2 text-center">
                          {item.status === "valid" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              พร้อมนำเข้า
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-help ${
                                item.status === "duplicate_code"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                              title={item.reason}
                            >
                              {item.status === "duplicate_code" ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              {item.reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50 dark:bg-slate-800/30">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                * ระบบจะนำเข้าเฉพาะแถวที่มีสถานะ <strong>"พร้อมนำเข้า"</strong> เท่านั้น แถวที่มีรหัสซ้ำหรือข้อมูลไม่ครบจะถูกข้ามโดยอัตโนมัติ
              </p>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewList([]);
                    setBulkFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex-grow sm:flex-none px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs md:text-sm font-semibold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={bulkLoading || previewList.filter((s) => s.status === "valid").length === 0}
                  className="flex-grow sm:flex-none px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {bulkLoading
                      ? "กำลังนำเข้า..."
                      : `ยืนยันนำเข้า (${previewList.filter((s) => s.status === "valid").length} คน)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
