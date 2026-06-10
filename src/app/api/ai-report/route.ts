import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentCode,
      studentName,
      attendanceRate,
      behaviorScore,
      finalPercentage,
      grade,
      risk,
      componentScores,
      notes,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // --- FALLBACK MOCK LOGIC (IF API KEY IS MISSING OR INVALID) ---
    if (!apiKey || apiKey === "" || apiKey.includes("your-gemini-key")) {
      console.log("Gemini API Key missing. Returning high-fidelity mock analysis.");
      
      let summary = "";
      let strengths = "";
      let weaknesses = "";
      let recommendations = "";

      if (risk === "red") {
        summary = `นักเรียนรหัส ${studentCode} (${studentName}) มีผลการเรียนและพฤติกรรมอยู่ในกลุ่มวิกฤต (ความเสี่ยงสูง) เนื่องจากคะแนนสอบเฉลี่ยอยู่ในระดับวิกฤต (${finalPercentage}%) และอัตราการเข้าเรียนอยู่ในเกณฑ์ต่ำ (${attendanceRate}%) มีผลให้เกรดเฉลี่ยปัจจุบันสะท้อนออกมาเป็นเกรด ${grade}`;
        strengths = notes ? `นักเรียนมีความสนใจเฉพาะด้านคือ "${notes}" แต่พฤติกรรมเรียนยังไม่ได้รับการกระตุ้นอย่างมีประสิทธิภาพ` : "ยังมีพฤติกรรมความตั้งใจเรียนจำกัด มีศักยภาพที่ซ่อนอยู่แต่ต้องอาศัยการช่วยเหลือประคับประคองอย่างใกล้ชิด";
        weaknesses = `อัตราการเข้าชั้นเรียนต่ำกว่าเกณฑ์ความปลอดภัยอย่างมาก (${attendanceRate}%) และคะแนนเก็บเฉลี่ยสะสมต่ำกว่าเกณฑ์ขั้นต่ำ รวมถึงมีพฤติกรรมการส่งงานช้าสะสมทำให้โดนหักคะแนนจิตพิสัย (${behaviorScore}/100)`;
        recommendations = "1. ขอความร่วมมือจากผู้ปกครองเพื่อเข้าพบครูประจำชั้นเป็นกรณีพิเศษ\n2. กำหนดแผนดูแลกำชับการเข้าห้องเรียนของนักเรียนในทุกคาบสอน\n3. จัดระบบเพื่อนช่วยเพื่อนในการเก็บรวบรวมชิ้นงานย้อนหลัง และให้โอกาสทำข้อสอบซ่อมเสริมเพื่อดึงคะแนนขึ้นพ้นเกณฑ์วิกฤต";
      } else if (risk === "yellow") {
        summary = `นักเรียนรหัส ${studentCode} (${studentName}) อยู่ในระดับเฝ้าระวัง มีพฤติกรรมการเข้าชั้นเรียนอยู่ในระดับปานกลาง (${attendanceRate}%) คะแนนสะสมอยู่ที่ ${finalPercentage}% โดยปัจจุบันคาดการณ์เกรดผลสัมฤทธิ์ที่ ${grade}`;
        strengths = "สามารถทำคะแนนสอบหรืองานส่งรายชิ้นได้ดีในระดับหนึ่ง เมื่อมีความตั้งใจในห้องเรียนสามารถจดจำเนื้อหาบทเรียนหลักได้ทันท่วงที";
        weaknesses = `มีแนวโน้มการเข้าเรียนที่ไม่สม่ำเสมอ หรือมักส่งงานช้ากว่าเวลาที่กำหนดในบางครั้ง คะแนนจิตพิสัยจึงลดลงมาอยู่ที่ ${behaviorScore}/100`;
        recommendations = "1. แนะนำให้คุณครูคอยกำชับการส่งงานที่ตรงเวลาก่อนคาบถัดไป\n2. ส่งเสริมให้นักเรียนเข้าร่วมกิจกรรมกลุ่มบ่อยขึ้นเพื่อกระตุ้นความรับผิดชอบ\n3. ทบทวนบทเรียนเพิ่มเติมในหมวดที่นักเรียนได้คะแนนน้อยเพื่อเลื่อนระดับผลสัมฤทธิ์สู่ระดับดีขึ้น";
      } else {
        // Green
        summary = `นักเรียนรหัส ${studentCode} (${studentName}) ผลสัมฤทธิ์ทางการเรียนอยู่ในเกณฑ์ปกติและดีเยี่ยมเป็นแบบอย่างที่ดี อัตราเข้าชั้นเรียนอยู่ในระดับดีเยี่ยม (${attendanceRate}%) คะแนนจิตพิสัยพฤติกรรมดีมาก (${behaviorScore}/100) ผลคะแนนสอบเฉลี่ยสูงถึง ${finalPercentage}% ผลการเรียนคาดการณ์ที่เกรด ${grade}`;
        strengths = `มีความรับผิดชอบสูงมากในการเข้าเรียนและการส่งงาน ${notes ? `มีความโดดเด่นในด้าน "${notes}"` : "ผลงานสะสมมีความสะอาดและถูกต้องตามเกณฑ์ชิ้นงานหลัก"}`;
        weaknesses = "ไม่พบจุดบกพร่องที่ส่งผลต่อการเรียนอย่างชัดเจน มีพฤติกรรมสม่ำเสมอ";
        recommendations = "1. สนับสนุนโจทย์ปัญหาขั้นสูงหรือโครงงานทดลองสร้างสรรค์เพื่อเพิ่มศักยภาพการเรียนรู้นอกกรอบ\n2. ส่งเสริมให้เป็นผู้ช่วยคุณครูในการแนะนำเพื่อนร่วมชั้นเรียน (Peer Tutor) เพื่อทักษะการเป็นผู้นำ\n3. รักษามาตรฐานการเรียนและการเข้าเรียนเพื่อผลสัมฤทธิ์ระดับเกียรติคุณในอนาคต";
      }

      return NextResponse.json({
        summary,
        strengths,
        weaknesses,
        recommendations,
        isMock: true,
      });
    }

    // --- LIVE GEMINI 2.5 FLASH CALL ---
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
      You are an expert school counselor and educational analyst in Thailand.
      Analyze the following student data and generate a detailed report in THAI language.
      
      Student Profile:
      - Name: ${studentName} (Code: ${studentCode})
      - Attendance Rate: ${attendanceRate}%
      - Behavioral Score: ${behaviorScore}/100
      - Overall Score Weighted Percentage: ${finalPercentage}%
      - Projected Grade: ${grade}
      - Risk Level: ${risk} (green = normal, yellow = warning, red = critical risk)
      - Teacher Notes: ${notes || "None"}
      - Detailed component scores (out of 100% per component): ${JSON.stringify(componentScores)}

      Generate a JSON response with exactly four keys:
      {
        "summary": "detailed thai paragraph summarizing student overall behavior, attendance and academic status",
        "strengths": "thai bullet points explaining strengths and good behaviors",
        "weaknesses": "thai bullet points explaining weaknesses and areas for improvement",
        "recommendations": "thai numbered list explaining suggestions for teacher and parents to support the student"
      }
      
      Return ONLY the raw JSON string matching this schema. No markdown wrapping.
    `;

    // --- LIVE GEMINI 2.5 FLASH CALL WITH RETRY ---
    let result;
    const maxRetries = 3;
    let delay = 1000; // 1 second starting delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        break; // Success, break out of loop
      } catch (err: any) {
        console.warn(`Gemini API attempt ${attempt} failed: ${err.message || err}`);
        if (attempt === maxRetries) {
          throw err; // Re-throw if all attempts fail
        }
        // Wait before retrying
        console.log(`Waiting ${delay}ms before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for next attempt
      }
    }

    if (!result) {
      throw new Error("Failed to get response from Gemini API");
    }

    const responseText = result.response.text();
    const jsonResult = JSON.parse(responseText);

    return NextResponse.json(jsonResult);
  } catch (err: any) {
    console.error("AI Report generation failed:", err);
    return NextResponse.json(
      { error: "ล้มเหลวในการเชื่อมต่อปัญญาประดิษฐ์ AI: " + (err.message || "") },
      { status: 500 }
    );
  }
}
