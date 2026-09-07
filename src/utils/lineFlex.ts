import { messagingApi } from "@line/bot-sdk";
type FlexMessage = messagingApi.FlexMessage;
type FlexBubble = messagingApi.FlexBubble;
type FlexCarousel = messagingApi.FlexCarousel;

export const lineFlex = {
  /**
   * Welcome message for follow / unlinked students
   */
  createWelcomeMessage(liffBindUrl: string): FlexMessage {
    const bubble: FlexBubble = {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#06C755",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "ยินดีต้อนรับสู่ระบบนักเรียน",
            weight: "bold",
            color: "#ffffff",
            size: "xl",
          },
          {
            type: "text",
            text: "Student Analytics & Assistant Bot",
            color: "#dcfce7",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "บอทนี้จะช่วยให้คุณเช็คผลการเรียน งานค้าง และเวลาเรียนได้ง่ายๆ ตลอด 24 ชม.",
            wrap: true,
            size: "sm",
            color: "#475569",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                spacing: "md",
                contents: [
                  { type: "text", text: "📊", size: "sm", flex: 0 },
                  { type: "text", text: "เช็คคะแนนเก็บและเกรดคาดการณ์", size: "sm", color: "#334155" },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "md",
                contents: [
                  { type: "text", text: "📝", size: "sm", flex: 0 },
                  { type: "text", text: "ตรวจเช็คงานค้างที่ยังไม่ส่ง", size: "sm", color: "#334155" },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "md",
                contents: [
                  { type: "text", text: "📅", size: "sm", flex: 0 },
                  { type: "text", text: "ดูสถิติเวลาเรียน ขาด/ลา/มาสาย", size: "sm", color: "#334155" },
                ],
              },
            ],
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "text",
            text: "กรุณากดปุ่มด้านล่างเพื่อผูกบัญชีกับห้องเรียนของคุณก่อนเริ่มใช้งาน",
            wrap: true,
            size: "xs",
            color: "#94a3b8",
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06C755",
            action: {
              type: "uri",
              label: "🔗 ผูกบัญชีนักเรียน (เข้าห้อง)",
              uri: liffBindUrl,
            },
          },
        ],
      },
    };

    return {
      type: "flex",
      altText: "ยินดีต้อนรับสู่ระบบเช็คคะแนนและงานค้าง",
      contents: bubble,
    };
  },

  /**
   * Score Report Card (Flex Message)
   */
  createScoreSummaryFlex(
    student: { student_code: string; prefix?: string; first_name: string; last_name: string },
    classroom: { name: string; room_code?: string },
    scoreData: {
      finalGrade: string;
      finalPercentage: number;
      components: {
        name: string;
        displayName?: string;
        score: number;
        maxScore?: number;
        weight?: number;
        earnedScore?: number;
      }[];
    },
    liffDashboardUrl?: string
  ): FlexMessage {
    const componentRows = scoreData.components.map((c) => {
      const weight = c.weight !== undefined ? c.weight : 100;
      const earned = c.earnedScore !== undefined ? c.earnedScore : (c.score / 100) * weight;
      const label = c.displayName || c.name;

      return {
        type: "box" as const,
        layout: "horizontal" as const,
        margin: "sm" as const,
        contents: [
          {
            type: "text" as const,
            text: `${label} (${weight}%)`,
            size: "xs" as const,
            color: "#64748b",
            flex: 5,
          },
          {
            type: "text" as const,
            text: `${earned.toFixed(1)} / ${weight}`,
            size: "xs" as const,
            color: "#0f172a",
            weight: "bold" as const,
            align: "end" as const,
            flex: 4,
          },
        ],
      };
    });

    const bubble: FlexBubble = {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1e293b",
        paddingAll: "20px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: classroom.name,
                weight: "bold",
                color: "#ffffff",
                size: "md",
                flex: 4,
                wrap: true,
              },
              ...(classroom.room_code
                ? [
                    {
                      type: "text" as const,
                      text: `#${classroom.room_code}`,
                      color: "#94a3b8",
                      size: "xxs" as const,
                      align: "end" as const,
                      flex: 2,
                    },
                  ]
                : []),
            ],
          },
          {
            type: "text",
            text: `${student.student_code} - ${student.prefix || ""}${student.first_name} ${student.last_name}`,
            color: "#cbd5e1",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        contents: [
          // Grade & Score Hero Box
          {
            type: "box",
            layout: "horizontal",
            backgroundColor: "#f8fafc",
            cornerRadius: "12px",
            paddingAll: "16px",
            contents: [
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "เกรดคาดการณ์",
                    size: "xxs",
                    color: "#64748b",
                  },
                  {
                    type: "text",
                    text: scoreData.finalGrade || "N/A",
                    size: "3xl",
                    weight: "bold",
                    color: "#0284c7",
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                alignItems: "flex-end",
                contents: [
                  {
                    type: "text",
                    text: "คะแนนสะสมรวม",
                    size: "xxs",
                    color: "#64748b",
                  },
                  {
                    type: "text",
                    text: `${scoreData.finalPercentage.toFixed(1)} / 100`,
                    size: "lg",
                    weight: "bold",
                    color: "#0f172a",
                    margin: "xs",
                  },
                ],
              },
            ],
          },
          // Component Breakdown Section
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            contents: [
              {
                type: "text",
                text: "สรุปคะแนนแต่ละหมวด",
                size: "xs",
                weight: "bold",
                color: "#334155",
                margin: "xs",
              },
              {
                type: "separator",
                margin: "sm",
              },
              ...componentRows,
            ],
          },
        ],
      },
      footer: liffDashboardUrl
        ? {
            type: "box",
            layout: "vertical",
            paddingAll: "16px",
            contents: [
              {
                type: "button",
                style: "secondary",
                color: "#f1f5f9",
                action: {
                  type: "uri",
                  label: "📊 ดูกราฟและคะแนนเต็ม",
                  uri: liffDashboardUrl,
                },
              },
            ],
          }
        : undefined,
    };

    return {
      type: "flex",
      altText: `รายงานคะแนนวิชา ${classroom.name} (${student.first_name})`,
      contents: bubble,
    };
  },

  /**
   * Missing Assignments Checklist Card
   */
  createMissingAssignmentsFlex(
    student: { first_name: string; student_code: string },
    classroom: { name: string },
    missingList: { name: string; grade_component: string; max_score: number }[]
  ): FlexMessage {
    const isCompleted = missingList.length === 0;

    const contentBoxes = isCompleted
      ? [
          {
            type: "box" as const,
            layout: "vertical" as const,
            alignItems: "center" as const,
            paddingAll: "20px" as const,
            contents: [
              { type: "text" as const, text: "🎉", size: "3xl" as const },
              {
                type: "text" as const,
                text: "ส่งงานครบทุกชิ้นแล้ว!",
                weight: "bold" as const,
                size: "md" as const,
                color: "#16a34a",
                margin: "md" as const,
              },
              {
                type: "text" as const,
                text: "ไม่พบงานค้างในระบบ ขอให้รักษามาตรฐานนี้ต่อไปครับ",
                size: "xs" as const,
                color: "#64748b",
                wrap: true as const,
                align: "center" as const,
                margin: "xs" as const,
              },
            ],
          },
        ]
      : missingList.slice(0, 10).map((m, idx) => ({
          type: "box" as const,
          layout: "horizontal" as const,
          margin: "md" as const,
          contents: [
            {
              type: "text" as const,
              text: `${idx + 1}.`,
              size: "xs" as const,
              color: "#ef4444",
              flex: 1,
            },
            {
              type: "box" as const,
              layout: "vertical" as const,
              flex: 8,
              contents: [
                {
                  type: "text" as const,
                  text: m.name,
                  size: "sm" as const,
                  weight: "bold" as const,
                  color: "#1e293b",
                  wrap: true as const,
                },
                {
                  type: "text" as const,
                  text: `หมวด: ${m.grade_component} (เต็ม ${m.max_score} คะแนน)`,
                  size: "xxs" as const,
                  color: "#64748b",
                },
              ],
            },
          ],
        }));

    const bubble: FlexBubble = {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: isCompleted ? "#15803d" : "#dc2626",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: isCompleted ? "✅ งานครบเรียบร้อย" : `⚠️ พบงานค้าง ${missingList.length} รายการ`,
            weight: "bold",
            color: "#ffffff",
            size: "md",
          },
          {
            type: "text",
            text: `${classroom.name} • ${student.student_code} ${student.first_name}`,
            color: "#fecaca",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          ...contentBoxes,
          ...(missingList.length > 10
            ? [
                {
                  type: "text" as const,
                  text: `และมีอีก ${missingList.length - 10} รายการ...`,
                  size: "xxs" as const,
                  color: "#94a3b8",
                  margin: "md" as const,
                  align: "center" as const,
                },
              ]
            : []),
        ],
      },
    };

    return {
      type: "flex",
      altText: isCompleted ? "ส่งงานครบทุกชิ้นแล้ว" : `แจ้งเตือนงานค้าง ${missingList.length} งาน`,
      contents: bubble,
    };
  },

  /**
   * Attendance Stats Card
   */
  createAttendanceFlex(
    student: { first_name: string; student_code: string },
    classroom: { name: string },
    stats: {
      present: number;
      late: number;
      sick: number;
      absent: number;
      percentage: number;
      totalSessions: number;
    }
  ): FlexMessage {
    const isSafe = stats.percentage >= 80;

    const bubble: FlexBubble = {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: isSafe ? "#0284c7" : "#ea580c",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "📅 สถิติเวลาเรียน",
            weight: "bold",
            color: "#ffffff",
            size: "md",
          },
          {
            type: "text",
            text: `${classroom.name} • ${student.student_code} ${student.first_name}`,
            color: "#e0f2fe",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            backgroundColor: "#f8fafc",
            cornerRadius: "12px",
            paddingAll: "16px",
            contents: [
              {
                type: "box",
                layout: "vertical",
                contents: [
                  { type: "text", text: "เวลาเรียนสะสม", size: "xxs", color: "#64748b" },
                  {
                    type: "text",
                    text: `${stats.percentage.toFixed(1)}%`,
                    size: "2xl",
                    weight: "bold",
                    color: isSafe ? "#16a34a" : "#dc2626",
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                alignItems: "flex-end",
                contents: [
                  { type: "text", text: "สถานะสิทธิ์สอบ", size: "xxs", color: "#64748b" },
                  {
                    type: "text",
                    text: isSafe ? "ปกติ (มีสิทธิ์สอบ)" : "⚠️ เสี่ยงหมดสิทธิ์สอบ",
                    size: "xs",
                    weight: "bold",
                    color: isSafe ? "#16a34a" : "#dc2626",
                    margin: "sm",
                  },
                ],
              },
            ],
          },
          // Breakdown counts
          {
            type: "box",
            layout: "horizontal",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                alignItems: "center",
                contents: [
                  { type: "text", text: "มาเรียน", size: "xxs", color: "#64748b" },
                  { type: "text", text: `${stats.present}`, size: "md", weight: "bold", color: "#16a34a" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                alignItems: "center",
                contents: [
                  { type: "text", text: "มาสาย", size: "xxs", color: "#64748b" },
                  { type: "text", text: `${stats.late}`, size: "md", weight: "bold", color: "#ca8a04" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                alignItems: "center",
                contents: [
                  { type: "text", text: "ลา", size: "xxs", color: "#64748b" },
                  { type: "text", text: `${stats.sick}`, size: "md", weight: "bold", color: "#0284c7" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                alignItems: "center",
                contents: [
                  { type: "text", text: "ขาด", size: "xxs", color: "#64748b" },
                  { type: "text", text: `${stats.absent}`, size: "md", weight: "bold", color: "#dc2626" },
                ],
              },
            ],
          },
        ],
      },
    };

    return {
      type: "flex",
      altText: `สถิติเวลาเรียน ${stats.percentage.toFixed(1)}%`,
      contents: bubble,
    };
  },

  /**
   * AI Diagnostics & Feedback Card
   */
  createAIReportFlex(
    student: { first_name: string; student_code: string },
    classroom: { name: string },
    report: { performance_summary: string; strengths: string; weaknesses: string; recommendations: string }
  ): FlexMessage {
    const bubble: FlexBubble = {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#6366f1",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "🤖 คำแนะนำพัฒนาการเรียน (AI)",
            weight: "bold",
            color: "#ffffff",
            size: "md",
          },
          {
            type: "text",
            text: `${classroom.name} • ${student.student_code} ${student.first_name}`,
            color: "#e0e7ff",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f8fafc",
            cornerRadius: "8px",
            paddingAll: "10px",
            contents: [
              { type: "text", text: "🌟 จุดเด่น", size: "xs", weight: "bold", color: "#16a34a" },
              { type: "text", text: report.strengths || "มีความตั้งใจในการเรียน", size: "xs", color: "#334155", wrap: true },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f8fafc",
            cornerRadius: "8px",
            paddingAll: "10px",
            contents: [
              { type: "text", text: "🎯 จุดที่ควรพัฒนา", size: "xs", weight: "bold", color: "#ea580c" },
              { type: "text", text: report.weaknesses || "ควรส่งงานให้ตรงเวลา", size: "xs", color: "#334155", wrap: true },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f8fafc",
            cornerRadius: "8px",
            paddingAll: "10px",
            contents: [
              { type: "text", text: "💡 แนวทางแนะนำ", size: "xs", weight: "bold", color: "#0284c7" },
              { type: "text", text: report.recommendations || "ทบทวนบทเรียนสม่ำเสมอ", size: "xs", color: "#334155", wrap: true },
            ],
          },
        ],
      },
    };

    return {
      type: "flex",
      altText: "คำแนะนำการเรียนจาก AI",
      contents: bubble,
    };
  },

  /**
   * Classroom Switcher Carousel
   */
  createClassroomSwitcher(
    classrooms: { id: string; name: string; room_code?: string; student_code: string }[],
    liffBindUrl: string
  ): FlexMessage {
    const bubbles: FlexBubble[] = classrooms.map((c) => ({
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: c.name,
            weight: "bold",
            size: "md",
            color: "#0f172a",
            wrap: true,
          },
          {
            type: "text",
            text: `รหัส นร.: ${c.student_code}`,
            size: "xs",
            color: "#64748b",
            margin: "sm",
          },
          ...(c.room_code
            ? [
                {
                  type: "text" as const,
                  text: `รหัสห้อง: #${c.room_code}`,
                  size: "xxs" as const,
                  color: "#94a3b8",
                },
              ]
            : []),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0284c7",
            height: "sm",
            action: {
              type: "postback",
              label: "เลือกดูวิชานี้",
              data: `action=switch_class&classroom_id=${c.id}`,
            },
          },
        ],
      },
    }));

    // Add a bubble to link another class
    bubbles.push({
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        alignItems: "center",
        justifyContent: "center",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "➕", size: "3xl" },
          {
            type: "text",
            text: "เพิ่มวิชาเรียน",
            weight: "bold",
            size: "sm",
            color: "#334155",
            margin: "md",
          },
          {
            type: "text",
            text: "หากมีวิชาอื่นที่ต้องการผูก",
            size: "xxs",
            color: "#94a3b8",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "uri",
              label: "ผูกวิชาใหม่",
              uri: liffBindUrl,
            },
          },
        ],
      },
    });

    return {
      type: "flex",
      altText: "เลือกห้องเรียนที่ต้องการตรวจสอบ",
      contents: {
        type: "carousel",
        contents: bubbles,
      },
    };
  },
};
