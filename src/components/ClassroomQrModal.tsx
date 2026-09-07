"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { X, Copy, Check, QrCode as QrIcon, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Classroom } from "@/utils/db";

interface ClassroomQrModalProps {
  classroom: Classroom;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClassroomQrModal({
  classroom,
  isOpen,
  onClose,
}: ClassroomQrModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const roomCode = classroom.room_code || classroom.id.substring(0, 6).toUpperCase();
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  // URL that students will open
  const joinUrl = typeof window !== "undefined"
    ? liffId
      ? `https://liff.line.me/${liffId}/bind?room=${roomCode}`
      : `${window.location.origin}/liff/bind?room=${roomCode}`
    : `/liff/bind?room=${roomCode}`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(joinUrl, {
        width: 380,
        margin: 2,
        color: {
          dark: "#064e3b",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code generate error:", err));
    }
  }, [isOpen, joinUrl]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl transition-all duration-300 flex flex-col ${
          isFullScreen
            ? "fixed inset-4 max-w-none max-h-none justify-between p-8"
            : "max-w-md w-full p-6"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                LINE Bot สำหรับนักเรียน
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                วิชา: {classroom.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isFullScreen ? "ย่อหน้าจอ" : "ขยายเต็มจอ (สำหรับฉายโปรเจกเตอร์)"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-4">
          {/* Room Code Callout */}
          <div className="space-y-1">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
              รหัสห้องเรียน (Classroom Code)
            </p>
            <div className="flex items-center justify-center space-x-2">
              <span
                className={`font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-widest ${
                  isFullScreen ? "text-5xl" : "text-3xl"
                }`}
              >
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="คัดลอกรหัส"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* QR Code image */}
          <div className="p-3 bg-white border-2 border-emerald-500/30 rounded-2xl shadow-md inline-block">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="LINE Join QR Code"
                className={`rounded-xl object-contain ${
                  isFullScreen ? "w-72 h-72 md:w-96 md:h-96" : "w-56 h-56"
                }`}
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400 animate-pulse">
                กำลังสร้าง QR Code...
              </div>
            )}
          </div>

          {/* Step-by-step student instructions */}
          <div className="max-w-sm text-left bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-200">วิธีให้นักเรียนเข้าใช้งาน:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>เปิดแอป LINE แล้วสแกน QR Code นี้</li>
              <li>กรอกรหัสนักเรียน และชื่อ-นามสกุลเพื่อยืนยันตัวตน</li>
              <li>กดปุ่มเมนูใน LINE เพื่อเช็คคะแนนและงานค้างได้ทันที</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
          >
            <span>เปิดลิงก์ทดสอบ</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
