export const dynamic = "force-dynamic";
import { EmployeePortalLayout } from "@/layouts/employee-portal-layout";
import { getEmployeeLayoutProps } from "@/services/employee/layout-props";
import { listPrintQueue } from "@/services/print-queue/queue-service";
import { EmployeeDashboardClient } from "@/components/employee/employee-dashboard-client";
import { AlertCircle } from "lucide-react";

import { serializeData } from "@/lib/serialization";
import { prisma } from "@/database/client";
import { requireQueueAccess } from "@/services/employee/employee-service";
import { measureAsync } from "@/lib/performance";

export default async function EmployeeDashboardPage() {
  try {
    const context = await measureAsync("employee.dashboard.rbac", requireQueueAccess);
    const { organization } = context;

    // Fetch independent queue and printer data concurrently; auth session is request-cached.
    const [data, printers] = await Promise.all([
      listPrintQueue({
        page: 1,
        pageSize: 20,
        status: "all",
        priority: "all",
        assigned: "all",
        sort: "createdAt",
        direction: "desc",
      }, context),
      measureAsync("employee.dashboard.printers.prisma", () =>
        prisma.printer.findMany({
          where: { organizationId: organization.id, deletedAt: null },
          orderBy: { name: "asc" },
        }),
      ),
    ]);

    const serializedJobs = serializeData(data.jobs);
    const serializedPrinters = serializeData(printers);

    return (
      <EmployeePortalLayout {...getEmployeeLayoutProps(context)}>
        <EmployeeDashboardClient
          initialJobs={serializedJobs}
          initialPrinters={serializedPrinters}
        />
      </EmployeePortalLayout>
    );
  } catch (error: any) {
    console.error("Employee dashboard error:", error);

    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    return (
      <EmployeePortalLayout>
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="size-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold">Failed to load queue</h2>
          <p className="text-sm text-muted-foreground">
            An error occurred while connecting to the queue service.
          </p>
        </div>
      </EmployeePortalLayout>
    );
  }
}
