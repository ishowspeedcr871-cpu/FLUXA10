import { redirect } from "next/navigation";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { getCurrentSession } from "@/services/auth/session";
import { getUserRoleProfile } from "@/services/auth/rbac";

export async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = getUserRoleProfile(session.user);

  if (profile.primaryPortal === "/customer") redirect("/customer");
  if (profile.primaryPortal === "/employee") redirect("/employee");
  if (profile.primaryPortal === "/developer") redirect("/developer");

  return <DashboardLayout role="admin">{children}</DashboardLayout>;
}
