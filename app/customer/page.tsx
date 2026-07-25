export const dynamic = "force-dynamic";
import { CustomerPortalLayout } from "@/layouts/customer-portal-layout";
import { getCustomerDashboard } from "@/services/print-jobs/print-job-service";
import { requireCustomerContext } from "@/services/customer/customer-service";
import { CustomerDashboardClient } from "@/components/customer/customer-dashboard-client";
import { prisma } from "@/database/client";

export default async function CustomerDashboardPage() {
  // Enforce customer login and retrieve active user session
  const customerContext = await requireCustomerContext();
  const { user, organization } = customerContext;
  const userEmail = user?.email || null;

  // Retrieve independent page data concurrently; getCurrentSession is request-cached.
  let dashboardData;
  let orgSettings;
  try {
    [dashboardData, orgSettings] = await Promise.all([
      getCustomerDashboard(customerContext),
      prisma.organizationSettings.findUnique({ where: { organizationId: organization.id } }),
    ]);
  } catch (error: any) {
    // If the error is a Next.js redirect thrown by authentication guards, let it bubble up
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      throw error;
    }

    // Graceful fallback for demo or first onboarding
    dashboardData = {
      recentJobs: [],
      activeJobs: 0,
      completedJobs: 0,
      unreadNotifications: 0,
    };
    orgSettings = null;
  }

  const whatsappNumber = orgSettings?.supportPhone || null;

  // Pre-process real database entries for the high-fidelity UI
  const processedJobs = dashboardData.recentJobs.map((job) => ({
    id: job.id,
    title: job.title,
    status: job.status.replaceAll("_", " "),
    copies: job.copies,
    color: job.color,
    estimatedCost: Number(job.estimatedCost || 0),
    createdAt: job.createdAt.toISOString(),
    otpCode: job.otpCode || undefined,
    shopName: organization.name,
  }));

  return (
    <CustomerPortalLayout userEmail={userEmail || undefined}>
      <div className="animate-fade-in">
        <CustomerDashboardClient
          initialJobs={processedJobs}
          userEmail={userEmail}
          activeCount={dashboardData.activeJobs}
          completedCount={dashboardData.completedJobs}
          historyCount={0}
          whatsappNumber={whatsappNumber}
          orgSettings={orgSettings}
          organizationName={organization.name}
        />
      </div>
    </CustomerPortalLayout>
  );
}
