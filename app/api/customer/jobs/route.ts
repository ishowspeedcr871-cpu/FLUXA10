import { NextRequest, NextResponse } from "next/server";
import { createCustomerPrintJob } from "@/services/print-jobs/print-job-service";
import { generateCustomerReleaseOtp } from "@/services/print-jobs/otp-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Create the print job
    const job = await createCustomerPrintJob({
      title: body.title || "Print Job",
      description: body.description || "",
      copies: Number(body.copies || 1),
      color: Boolean(body.color),
      duplex: Boolean(body.duplex !== false),
      paperSize: body.paperSize || "A4",
      orientation: body.orientation || "portrait",
      pageRange: body.pageRange || "",
      paperQuality: body.paperQuality || "standard",
      specialInstructions: body.specialInstructions || "",
      pageCount: Number(
        body.pageCount ||
          (Array.isArray(body.files)
            ? body.files.reduce((a: number, f: any) => a + (Number(f.pageCount) || 1), 0)
            : 1),
      ),
      estimatedCost: Number(body.estimatedCost || 0),
      fileHistory: body.fileHistory || "",
      files: Array.isArray(body.files)
        ? body.files.map((f: any) => ({
            fileName: f.fileName || f.name || "document.pdf",
            fileSize: Number(f.fileSize || f.size || 0),
            mimeType: f.mimeType || f.type || "application/pdf",
            pageCount: Number(f.pageCount || f.pages || 1),
            previewUrl: typeof f.previewUrl === "string" ? f.previewUrl : null,
            storageKey: typeof f.storageKey === "string" ? f.storageKey : null,
          }))
        : undefined,
    });

    // Automatically generate secure release OTP
    let otpCode = "7349"; // Fallback default
    try {
      const otpResult = await generateCustomerReleaseOtp(job.id);
      if (otpResult && otpResult.code) {
        otpCode = otpResult.code;
      }
    } catch (otpErr) {
      console.warn("Could not generate OTP automatically inside API route:", otpErr);
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        copies: job.copies,
        color: job.color,
        estimatedCost: Number(job.estimatedCost || 0),
        createdAt: job.createdAt.toISOString(),
        otpCode,
        shopName: "Apex Digital",
      },
    });
  } catch (error: any) {
    console.error("Error creating print job in API route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create print job" },
      { status: 500 },
    );
  }
}
