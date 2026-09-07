import { NextRequest, NextResponse } from "next/server";
import { messagingApi, webhook, validateSignature } from "@line/bot-sdk";
import { lineService } from "@/utils/lineService";
import { lineFlex } from "@/utils/lineFlex";

export async function POST(req: NextRequest) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";

  // If LINE credentials are not configured yet, return 200 to acknowledge LINE verification test
  if (!channelAccessToken || !channelSecret) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET is not configured in .env.local");
    return NextResponse.json(
      { message: "LINE credentials not configured. Please set them in .env.local" },
      { status: 200 }
    );
  }

  const client = new messagingApi.MessagingApiClient({
    channelAccessToken,
  });

  const reply = async (replyToken: string, messages: any | any[]) => {
    const msgs = Array.isArray(messages) ? messages : [messages];
    return client.replyMessage({
      replyToken,
      messages: msgs,
    });
  };

  const body = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  // Validate LINE signature
  if (!validateSignature(body, channelSecret, signature)) {
    console.error("Invalid LINE signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: { events: webhook.Event[] };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Construct default LIFF URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get("x-forwarded-host") ? `https://${req.headers.get("x-forwarded-host")}` : "");
  const liffBindUrl = liffId ? `https://liff.line.me/${liffId}/bind` : `${baseUrl}/liff/bind`;
  const liffDashboardUrl = liffId ? `https://liff.line.me/${liffId}/dashboard` : `${baseUrl}/liff/dashboard`;

  for (const event of parsed.events) {
    try {
      const replyToken = (event as any).replyToken;
      const lineUserId = event.source?.userId;

      if (!replyToken || !lineUserId) continue;

      // --- EVENT: FOLLOW (เพิ่มเพื่อน) ---
      if (event.type === "follow") {
        const welcomeMsg = lineFlex.createWelcomeMessage(liffBindUrl);
        await reply(replyToken, welcomeMsg);
        continue;
      }

      // --- EVENT: POSTBACK (กดปุ่มสลับห้อง ฯลฯ) ---
      if (event.type === "postback") {
        const data = new URLSearchParams((event as any).postback?.data || "");
        const action = data.get("action");

        if (action === "switch_class") {
          const classroomId = data.get("classroom_id");
          if (classroomId) {
            await lineService.switchActiveBinding(lineUserId, classroomId);
            const { active } = await lineService.getStudentBindings(lineUserId);

            await reply(replyToken, {
              type: "text",
              text: `✅ สลับไปดูวิชา "${active?.classroom?.name || "ที่เลือก"}" เรียบร้อยแล้วครับ! สามารถกดปุ่มเมนูด้านล่างเพื่อเช็คคะแนนได้เลย`,
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: { type: "message", label: "📊 ดูคะแนน", text: "เช็คคะแนน" },
                  },
                  {
                    type: "action",
                    action: { type: "message", label: "📝 เช็คงานค้าง", text: "เช็คงานค้าง" },
                  },
                  {
                    type: "action",
                    action: { type: "message", label: "📅 เวลาเรียน", text: "เวลาเรียน" },
                  },
                ],
              },
            });
          }
        }
        continue;
      }

      // --- EVENT: MESSAGE ---
      if (event.type === "message" && (event as any).message?.type === "text") {
        const text = ((event as any).message?.text || "").trim().toLowerCase();

        // 1. Check if user has active classroom binding
        const { active, all } = await lineService.getStudentBindings(lineUserId);

        // If not registered yet or asks to bind
        if (text.includes("ผูกบัญชี") || text.includes("ลงทะเบียน") || text.includes("เข้าห้อง") || text.includes("register") || text.includes("bind")) {
          await reply(replyToken, lineFlex.createWelcomeMessage(liffBindUrl));
          continue;
        }

        // If no binding exists, prompt to bind
        if (!active) {
          await reply(replyToken, [
            {
              type: "text",
              text: "⚠️ คุณยังไม่ได้ผูกบัญชีกับห้องเรียนใดๆ ในระบบครับ กรุณากดปุ่มด้านล่างเพื่อเริ่มผูกบัญชี",
            },
            lineFlex.createWelcomeMessage(liffBindUrl),
          ]);
          continue;
        }

        // 2. Score & Grades
        if (text.includes("คะแนน") || text.includes("เกรด") || text.includes("score") || text.includes("grade")) {
          const report = await lineService.getScoreReport(active.student_id, active.classroom_id);
          const flexMsg = lineFlex.createScoreSummaryFlex(
            report.student,
            report.classroom,
            {
              finalGrade: report.finalGrade,
              finalPercentage: report.finalPercentage,
              components: report.components,
            },
            `${liffDashboardUrl}?classroomId=${active.classroom_id}&studentId=${active.student_id}`
          );
          await reply(replyToken, flexMsg);
          continue;
        }

        // 3. Missing Assignments
        if (text.includes("งานค้าง") || text.includes("การบ้าน") || text.includes("ส่งงาน") || text.includes("งาน") || text.includes("assignment")) {
          const { student, classroom, missing } = await lineService.getMissingAssignments(active.student_id, active.classroom_id);
          const flexMsg = lineFlex.createMissingAssignmentsFlex(student || active.student, classroom || active.classroom, missing);
          await reply(replyToken, flexMsg);
          continue;
        }

        // 4. Attendance
        if (text.includes("เวลาเรียน") || text.includes("เช็คชื่อ") || text.includes("ขาดเรียน") || text.includes("มาสาย") || text.includes("เข้าเรียน") || text.includes("attendance")) {
          const stats = await lineService.getAttendanceStats(active.student_id, active.classroom_id);
          const flexMsg = lineFlex.createAttendanceFlex(stats.student || active.student, stats.classroom || active.classroom, stats);
          await reply(replyToken, flexMsg);
          continue;
        }

        // 5. AI Diagnostic Report
        if (text.includes("ai") || text.includes("คำแนะนำ") || text.includes("วิเคราะห์") || text.includes("จุดเด่น") || text.includes("ปรับปรุง")) {
          const { student, classroom, report } = await lineService.getAIReport(active.student_id, active.classroom_id);
          const flexMsg = lineFlex.createAIReportFlex(student || active.student, classroom || active.classroom, report);
          await reply(replyToken, flexMsg);
          continue;
        }

        // 6. Classroom Switcher
        if (text.includes("สลับวิชา") || text.includes("เลือกวิชา") || text.includes("เปลี่ยนวิชา") || text.includes("ห้องเรียน") || text.includes("switch")) {
          const classes = all.map((item) => ({
            id: item.classroom_id,
            name: item.classroom?.name || "ห้องเรียน",
            room_code: item.classroom?.room_code,
            student_code: item.student?.student_code || "",
          }));
          const switcherMsg = lineFlex.createClassroomSwitcher(classes, liffBindUrl);
          await reply(replyToken, switcherMsg);
          continue;
        }

        // 7. Default Quick Reply
        await reply(replyToken, {
          type: "text",
          text: `สวัสดีครับ ${active.student?.prefix || ""}${active.student?.first_name} (วิชา ${active.classroom?.name})\nเลือกเมนูที่คุณต้องการตรวจสอบได้เลยครับ:`,
          quickReply: {
            items: [
              {
                type: "action",
                action: { type: "message", label: "📊 คะแนนของฉัน", text: "เช็คคะแนน" },
              },
              {
                type: "action",
                action: { type: "message", label: "📝 เช็คงานค้าง", text: "เช็คงานค้าง" },
              },
              {
                type: "action",
                action: { type: "message", label: "📅 เวลาเรียน", text: "เวลาเรียน" },
              },
              {
                type: "action",
                action: { type: "message", label: "🤖 คำแนะนำ AI", text: "คำแนะนำ AI" },
              },
              {
                type: "action",
                action: { type: "message", label: "🔄 สลับวิชา", text: "สลับวิชา" },
              },
            ],
          },
        });
      }
    } catch (eventErr: any) {
      console.error("Error processing LINE event:", eventErr);
    }
  }

  return NextResponse.json({ status: "success" }, { status: 200 });
}
