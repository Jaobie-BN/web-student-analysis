"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useClassroom } from "@/context/ClassroomContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useClassroom();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-slate-600">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide animate-pulse text-slate-500">กำลังโหลดข้อมูลระบบ...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-background flex flex-col">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Body */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 lg:overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Content Workspace */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
