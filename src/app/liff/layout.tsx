import Script from "next/script";
import { ReactNode } from "react";

export const metadata = {
  title: "ระบบบริการนักเรียนผ่าน LINE | Student Portal",
  description: "ผูกบัญชีและตรวจสอบผลการเรียน งานค้าง และสถิติเวลาเรียน",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function LiffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white font-sans">
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="beforeInteractive"
      />
      <main className="max-w-md mx-auto min-h-screen flex flex-col shadow-xl bg-white border-x border-slate-100">
        {children}
      </main>
    </div>
  );
}
