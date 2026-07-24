export interface UserRoleProfile {
  isPlatformAdmin: boolean;
  isDeveloper: boolean;
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
  isEmployee: boolean;
  isCustomer: boolean;
  primaryPortal: "/developer" | "/organization" | "/employee" | "/customer";
  allowedPortals: Set<string>;
}

export function getUserRoleProfile(user: any): UserRoleProfile {
  const memberships = user?.memberships || [];

  const activeMemberships = memberships.filter((m: any) =>
    m.status === "ACTIVE" &&
    (!m.organization || (m.organization.status === "ACTIVE" && m.organization.deletedAt === null))
  );

  const isPlatformAdmin = activeMemberships.some((m: any) =>
    m.role?.scope === "PLATFORM" ||
    m.role?.key === "platform-admin" ||
    m.role?.key === "admin" ||
    m.role?.key === "developer"
  );

  const isOrgOwner = activeMemberships.some((m: any) =>
    m.role?.key === "organization-owner" || m.role?.key === "owner"
  );

  const isOrgAdmin = activeMemberships.some((m: any) =>
    m.role?.key === "organization-admin" || m.role?.key === "admin"
  ) || isOrgOwner;

  const isEmployee = activeMemberships.some((m: any) =>
    m.role?.key === "organization-employee" ||
    m.role?.key === "employee" ||
    (m.role?.scope === "ORGANIZATION" && !isOrgAdmin)
  );

  const isCustomer = activeMemberships.some((m: any) =>
    m.role?.scope === "CUSTOMER" ||
    m.role?.key === "customer" ||
    m.role?.key === "customer-user"
  );

  const allowedPortals = new Set<string>();

  if (isPlatformAdmin) {
    allowedPortals.add("/developer");
    allowedPortals.add("/organization");
    allowedPortals.add("/employee");
    allowedPortals.add("/customer");
  } else {
    if (isOrgAdmin) {
      allowedPortals.add("/organization");
      allowedPortals.add("/employee");
    }
    if (isEmployee) {
      allowedPortals.add("/employee");
    }
    if (isCustomer) {
      allowedPortals.add("/customer");
    }
  }

  // Determine canonical primary portal
  let primaryPortal: "/developer" | "/organization" | "/employee" | "/customer" = "/customer";

  if (isPlatformAdmin) {
    primaryPortal = "/developer";
  } else if (isOrgAdmin) {
    primaryPortal = "/organization";
  } else if (isEmployee) {
    primaryPortal = "/employee";
  } else if (isCustomer) {
    primaryPortal = "/customer";
  }

  return {
    isPlatformAdmin,
    isDeveloper: isPlatformAdmin,
    isOrgOwner,
    isOrgAdmin,
    isEmployee,
    isCustomer,
    primaryPortal,
    allowedPortals,
  };
}

export function canUserAccessPortal(user: any, portalPath: string): boolean {
  const profile = getUserRoleProfile(user);
  if (portalPath.startsWith("/developer")) return profile.isPlatformAdmin;
  if (portalPath.startsWith("/organization")) return profile.isOrgAdmin || profile.isPlatformAdmin;
  if (portalPath.startsWith("/employee")) return profile.isEmployee || profile.isOrgAdmin || profile.isPlatformAdmin;
  if (portalPath.startsWith("/customer")) return profile.isCustomer || profile.isPlatformAdmin;
  return true;
}
