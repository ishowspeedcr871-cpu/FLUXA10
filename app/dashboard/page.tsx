export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/services/auth/session";
import { getUserRoleProfile } from "@/services/auth/rbac";
import { AccessDeniedPage } from "@/components/ui/access-denied";

export default async function DashboardPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  if (searchParams.error === "forbidden") {
    return (
      <AccessDeniedPage
        title="403 Access Denied"
        message="You do not have permission to access the requested portal."
      />
    );
  }

  const sessionData = await getCurrentSession();
  if (!sessionData || !sessionData.user) {
    redirect("/login");
  }

  const profile = getUserRoleProfile(sessionData.user);
  redirect(profile.primaryPortal);
}
