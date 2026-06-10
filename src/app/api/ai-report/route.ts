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
      คุณคือผู้เชี่ยวชาญด้านจิตวิทยาการศึกษาและที่ปรึกษาแนะแนวในโรงเรียนไทย
      วิเคราะห์ข้อมูลของนักเรียนและตอบกลับเป็นภาษาไทยที่สุภาพ เป็นทางการ และสร้างสรรค์ (จิตวิทยาเชิงบวก)
      
      ข้อมูลนักเรียน:
      - ชื่อ: ${studentName} (รหัส: ${studentCode})
      - อัตราเข้าเรียน: ${attendanceRate}%
      - คะแนนจิตพิสัย: ${behaviorScore}/100
      - คะแนนรวมสะสมคิดเป็นเปอร์เซ็นต์: ${finalPercentage}%
      - เกรดคาดการณ์: ${grade}
      - ระดับความเสี่ยง: ${risk} (green = ปกติ, yellow = เฝ้าระวัง, red = เสี่ยงสูง)
      - บันทึกเพิ่มเติมจากครู: ${notes || "ไม่มี"}
      - รายละเอียดคะแนนแต่ละส่วน: ${JSON.stringify(componentScores)}

      ข้อกำหนดในการวิเคราะห์:
      1. ในช่อง "summary": สรุปภาพรวมพฤติกรรมและการเรียนในเชิงสร้างสรรค์
      2. ในช่อง "strengths": ชี้จุดเด่นของนักเรียนทั้งในด้านการเรียนและพฤติกรรม
      3. ในช่อง "weaknesses": หลีกเลี่ยงคำเชิงลบ ให้ใช้หัวข้อเกี่ยวกับ "ประเด็นที่ต้องสนับสนุนหรือพัฒนาเพิ่มเติม"
      4. ในช่อง "recommendations": ให้ข้อเสนอแนะ 3 ด้านแยกกันชัดเจน (คำแนะนำสำหรับครูในชั้นเรียน, คำแนะนำสำหรับผู้ปกครองเพื่อดูแลที่บ้าน, และแนวทางดูแลหรือสอนเสริมพิเศษ)
      
      ตอบกลับในรูปแบบ JSON เปล่าๆ เท่านั้นตามโครงสร้างนี้:
      {
        "summary": "สรุปภาพรวมในรูปแบบย่อหน้าภาษาไทย",
        "strengths": "จุดเด่นในรูปแบบลิสต์ภาษาไทย",
        "weaknesses": "ประเด็นที่ต้องสนับสนุนเพิ่มเติมในรูปแบบลิสต์ภาษาไทย",
        "recommendations": "คำแนะนำการส่งเสริมในรูปแบบลิสต์รายการ"
      }
      
      ส่งคืนเฉพาะข้อความ JSON ดิบที่ตรงตามโครงสร้างนี้เท่านั้น ห้ามใส่เครื่องหมายคำพูด Markdown (เช่น \`\`\`json) ครอบ
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
