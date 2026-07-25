export const dynamic = 'force-dynamic';
import { EmployeePortalLayout } from "@/layouts/employee-portal-layout";
import { prisma } from "@/database/client";
import type { Prisma } from "@prisma/client";
import { requireEmployeeContext } from "@/services/employee/employee-service";
import { EmployeeAnalyticsClient } from "@/components/employee/employee-analytics-client";
import { serializeData } from "@/lib/serialization";
import { AlertCircle } from "lucide-react";

export default async function AnalyticsPage() {
  try {
    const { user, membership, organization } = await requireEmployeeContext();

    const activeJobWhere: Prisma.PrintJobWhereInput = {
      organizationId: organization.id,
      status: { notIn: ["COMPLETED", "CANCELLED", "FAILED", "COLLECTED"] },
    };

    // Fetch independent analytics data concurrently to keep route transitions snappy.
    const [liveActiveJobsCount, queueValueSum, printers, awaitingJobs] = await Promise.all([
      prisma.printJob.count({ where: activeJobWhere }),
      prisma.printJob.aggregate({
        where: activeJobWhere,
        _sum: { estimatedCost: true },
      }),
      prisma.printer.findMany({
        where: { organizationId: organization.id, deletedAt: null },
      }),
      prisma.printJob.findMany({
        where: {
          organizationId: organization.id,
          status: { in: ["READY", "PRINTING", "QUEUED", "ASSIGNED"] },
        },
        include: { customerUser: true, files: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    const liveQueueValue = queueValueSum._sum?.estimatedCost
      ? Number(queueValueSum._sum?.estimatedCost)
      : 0;

    // 5. Serialize data to safely bridge the RSC/Client Component boundary
    const serializedPrinters = serializeData(printers);
    const serializedJobs = serializeData(awaitingJobs);

    return (
      <EmployeePortalLayout profile={{ user: { name: user.name, email: user.email }, organization: { name: organization.name }, role: { name: membership.role.name } }}>
        <EmployeeAnalyticsClient
          initialJobs={serializedJobs}
          initialPrinters={serializedPrinters}
          liveQueueValue={liveQueueValue}
          liveActiveJobsCount={liveActiveJobsCount}
        />
      </EmployeePortalLayout>
    );
  } catch (error: any) {
    console.error("Error loading print analytics:", error);
    return (
      <EmployeePortalLayout>
        <div className="rounded-[24px] border border-danger/35 bg-danger/10 p-6 flex gap-4 text-danger">
          <AlertCircle className="size-6 shrink-0" />
          <div>
            <h3 className="font-black text-white uppercase tracking-wider text-sm mb-1">
              Analytics Restricted
            </h3>
            <p className="text-xs">
              {error.message || "Unable to aggregate real-time workspace statistics."}
            </p>
          </div>
        </div>
      </EmployeePortalLayout>
    );
  }
}
