import { NextRequest, NextResponse } from "next/server";
import { createCustomerPrintJob } from "@/services/print-jobs/print-job-service";
import { createPrintJobSchema } from "@/features/print-jobs/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = createPrintJobSchema.parse({
      title: body.title || "Print Job",
      description: body.description || "",
      copies: body.copies || 1,
      color: Boolean(body.color),
      duplex: body.duplex !== false,
      paperSize: body.paperSize || "A4",
      orientation: body.orientation || "portrait",
      pageRange: body.pageRange || "",
      paperQuality: body.paperQuality || "standard",
      specialInstructions: body.specialInstructions || "",
      pageCount:
        body.pageCount ||
        (Array.isArray(body.files)
          ? body.files.reduce((a: number, f: any) => a + (Number(f.pageCount || f.pages) || 1), 0)
          : 1),
      estimatedCost: body.estimatedCost || 0,
      fileHistory: body.fileHistory || "",
      files: Array.isArray(body.files)
        ? body.files.map((f: any) => ({
            fileName: f.fileName || f.name || "document.pdf",
            fileSize: Number(f.fileSize || f.size || 0),
            mimeType: f.mimeType || f.type || "application/pdf",
            pageCount: Number(f.pageCount || f.pages || 1),
            previewUrl: null,
            storageKey: typeof f.storageKey === "string" ? f.storageKey : null,
          }))
        : undefined,
    });

    // Keep the HTTP request path metadata-only; binary uploads/previews must use storage keys.
    const job = await createCustomerPrintJob(parsed);

    const otpCode = job.otpCode;

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
        shopName: body.organizationName || null,
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
