import { redirect } from "next/navigation";
import { getCurrentSession } from "@/services/auth/session";
import { getActiveOrganizationMembership } from "@/services/organizations/organization-service";

export async function requireCustomerContext() {
  const session = await getCurrentSession();
  if (!session || !session.user) {
    redirect("/login?portal=customer&next=/customer");
  }

  // Verify the user actually has an active customer membership
  const customerMembership = session.user.memberships.find(
    (m) =>
      m.status === "ACTIVE" &&
      (m.role?.scope === "CUSTOMER" || m.role?.key === "customer" || m.role?.key === "customer-user" || m.role?.scope === "PLATFORM")
  );

  if (!customerMembership) {
    redirect("/dashboard?error=forbidden");
  }

  if (customerMembership.organization?.status === "SUSPENDED" || customerMembership.organization?.deletedAt !== null) {
    redirect("/login?portal=customer&error=org_suspended");
  }

  return { 
    session, 
    user: session.user,
    membership: customerMembership, 
    organization: customerMembership.organization 
  };
}

export async function getCustomerProfile() {
  const { user, membership, organization } = await requireCustomerContext();
  return { user, membership, organization };
}
