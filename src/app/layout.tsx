import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClassroomProvider } from "@/context/ClassroomContext";
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
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ClassroomProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </ClassroomProvider>
      </body>
    </html>
  );
}
