import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClassroomProvider } from "@/context/ClassroomContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student Analytics & Classroom Management System",
  description: "A premium classroom dashboard and analytic suite for teachers",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider>
          <ToastProvider>
            <ClassroomProvider>
              {children}
              <Analytics />
              <SpeedInsights />
            </ClassroomProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
