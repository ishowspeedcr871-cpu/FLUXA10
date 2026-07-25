interface EmployeeLayoutContext {
  user?: { email?: string | null; name?: string | null } | null;
  organization?: { name?: string | null } | null;
}

export function getEmployeeLayoutProps(context: EmployeeLayoutContext) {
  return {
    userEmail: context.user?.email ?? null,
    userName: context.user?.name ?? null,
    organizationName: context.organization?.name ?? null,
  };
}
