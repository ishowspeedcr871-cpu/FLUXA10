import { NextRequest, NextResponse } from "next/server";
import { verifyOrganizationApiKey, updatePrintJobStatusFromConnector } from "@/services/connector/connector-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 401 });

    const organization = await verifyOrganizationApiKey(apiKey);
    if (!organization) return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });

    const body = await req.json();
    const { status, notes } = body;

    if (!["COMPLETED", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const job = await updatePrintJobStatusFromConnector(organization.id, jobId, status, notes);
    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("Job status update error:", error);
    return NextResponse.json({ error: error.message || "Status update failed" }, { status: 400 });
  }
}
