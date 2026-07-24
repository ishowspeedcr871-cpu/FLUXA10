import { NextRequest, NextResponse } from "next/server";
import { verifyOrganizationApiKey, getPendingJobsForOrganization } from "@/services/connector/connector-service";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 401 });

    const organization = await verifyOrganizationApiKey(apiKey);
    if (!organization) return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });

    const jobs = await getPendingJobsForOrganization(organization.id);
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error("Connector jobs fetch error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch jobs" }, { status: 400 });
  }
}
