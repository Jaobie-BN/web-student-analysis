"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClassroom } from "@/context/ClassroomContext";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Award,
  TrendingUp,
  Download,
  Settings,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { currentClassroom, user, logout } = useClassroom();
  const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    {
      name: "แผงสถิติเชิงลึก (Dashboard)",
      path: "/dashboard",
      icon: LayoutDashboard,
      requiresClass: false,
    },
    {
      name: "จัดการห้องเรียน (Classrooms)",
      path: "/classes",
      icon: Settings,
      requiresClass: false,
    },
    {
      name: "รายชื่อนักเรียน (Roster)",
      path: "/students",
      icon: Users,
      requiresClass: true,
    },
    {
      name: "เช็คชื่อเข้าเรียน (Attendance)",
      path: "/attendance",
      icon: CalendarCheck,
      requiresClass: true,
    },
    {
      name: "บันทึกคะแนน (Grade Book)",
      path: "/gradebook",
      icon: Award,
      requiresClass: true,
    },
    {
      name: "วิเคราะห์รายบุคคล (Analytics)",
      path: "/ai-insights",
      icon: TrendingUp,
      requiresClass: true,
    },
    {
      name: "ออกรายงาน (Export / PDF)",
      path: "/reports",
      icon: Download,
      requiresClass: true,
    },
  ];

  // During SSR we assume expanded, on client mount we read state
  const currentCollapsed = mounted ? isCollapsed : false;

  return (
    <div className="relative w-full lg:w-20 shrink-0 lg:h-full no-print z-[35]">
      <aside
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        className={`sidebar-transition w-full lg:absolute lg:left-0 lg:top-0 lg:h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1222] p-4 flex flex-col justify-between no-print shadow-sm z-[35] transition-colors duration-200 ${
          currentCollapsed ? "lg:w-20" : "lg:w-72 lg:shadow-xl"
        }`}
      >
        <div className="space-y-6">
          <ul className="space-y-1.5 w-full min-w-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const disabled = item.requiresClass && !currentClassroom;
              const active = pathname === item.path;

              if (disabled) {
                return (
                  <li key={item.path} className="w-full min-w-0">
                    <div
                      className={`flex items-center px-4 py-3 rounded-xl text-outline/45 dark:text-slate-600 cursor-not-allowed text-sm font-medium min-w-0 ${
                        currentCollapsed ? "lg:justify-center lg:px-2 lg:gap-0" : "gap-3"
                      }`}
                      title={`กรุณาเลือกห้องเรียนก่อนเข้าสู่เมนู ${item.name}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className={`transition-all duration-300 whitespace-nowrap text-xs md:text-sm ${currentCollapsed ? "lg:w-0 lg:opacity-0 lg:pointer-events-none" : "lg:w-auto lg:opacity-100"}`}>
                        {item.name}
                      </span>
                    </div>
                  </li>
                );
              }

              return (
                <li key={item.path} className="w-full min-w-0">
                  <Link
                    href={item.path}
                    title={item.name}
                    className={`relative flex items-center px-4 py-3 rounded-xl text-sm transition-all active:scale-[0.98] min-w-0 ${
                      currentCollapsed ? "lg:justify-center lg:px-2 lg:gap-0" : "gap-3"
                    } ${
                      active
                        ? "text-primary dark:text-sky-400 font-bold bg-primary/10 dark:bg-sky-400/10 shadow-sm"
                        : "text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary dark:bg-sky-400 rounded-r-md" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap text-xs md:text-sm ${currentCollapsed ? "lg:w-0 lg:opacity-0 lg:pointer-events-none" : "lg:w-auto lg:opacity-100"}`}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer Profile & Logout Button */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          {/* Profile Card at bottom (Stitch layout style) */}
          <div className={`flex items-center rounded-xl transition-colors ${currentCollapsed ? "justify-center p-0 lg:gap-0" : "px-2 py-1.5 gap-3"}`}>
            <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-sky-400/10 text-primary dark:text-sky-400 flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20 dark:border-sky-400/20">
              {user?.email ? user.email.charAt(0).toUpperCase() : "T"}
            </div>
            <div className={`flex flex-col min-w-0 transition-all duration-300 ${currentCollapsed ? "lg:w-0 lg:opacity-0 lg:pointer-events-none" : "lg:w-auto lg:opacity-100"}`}>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                ครู {user?.email ? user.email.split('@')[0] : "ผู้สอน"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentClassroom ? `วิชา ${currentClassroom.name}` : "ครูประจำการ"}
              </span>
            </div>
          </div>

          {/* Dedicated Logout Button */}
          <button
            onClick={logout}
            className={`hidden lg:flex items-center justify-center w-full py-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all active:scale-[0.98] cursor-pointer text-sm font-semibold ${
              currentCollapsed ? "lg:px-2 lg:gap-0 lg:justify-center" : "gap-2"
            }`}
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 text-xs md:text-sm ${currentCollapsed ? "lg:w-0 lg:opacity-0 lg:pointer-events-none" : "lg:w-auto lg:opacity-100"}`}>ออกจากระบบ</span>
          </button>

        <div className={`text-[10px] text-slate-400 dark:text-slate-500 text-center transition-all ${currentCollapsed ? "lg:hidden" : "block"}`}>
          Student Analytics Platform v1.2
        </div>
      </div>
    </aside>
  </div>
  );
}
