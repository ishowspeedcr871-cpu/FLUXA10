"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/database/client";
import { createAuditLog } from "@/services/audit/log";
import { hashPassword, verifyPassword } from "@/services/auth/password";
import { createUserSession, signOutCurrentSession } from "@/services/auth/session";
import { getUserRoleProfile, canUserAccessPortal } from "@/services/auth/rbac";

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z
    .string()
    .email()
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1),
  organizationId: z.string().optional(),
});

async function authenticate(formData: FormData, redirectTo: string, errorPath: string) {
  const portalParam = (formData.get("portal") as string | null) || "customer";
  const portalErrorPath = `${errorPath}?portal=${portalParam}`;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) redirect(`${portalErrorPath}&error=invalid_input`);

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: {
        memberships: {
          include: {
            role: true,
            organization: true,
          },
        },
      },
    });

    if (!user) {
      // Return invalid credentials if user does not exist
      redirect(`${portalErrorPath}&error=invalid_credentials`);
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Authentication lookup failed", error);
    redirect(`${portalErrorPath}&error=service_unavailable`);
  }

  // Verify password strictly against stored hash
  if (!user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    await createAuditLog({
      actorUserId: user.id,
      action: "auth.login_failed",
      metadata: { reason: "invalid_password" },
    });
    redirect(`${portalErrorPath}&error=invalid_credentials`);
  }

  // Check if user is suspended or soft-deleted
  if (user.status === "SUSPENDED" || user.deletedAt !== null) {
    redirect(`${portalErrorPath}&error=user_suspended`);
  }

  // Check if user's organization(s) are suspended or soft-deleted
  if (user.memberships && user.memberships.length > 0) {
    const activeMemberships = user.memberships.filter((m: any) => {
      return (
        m.organization && m.organization.status === "ACTIVE" && m.organization.deletedAt === null
      );
    });

    if (activeMemberships.length === 0) {
      redirect(`${portalErrorPath}&error=org_suspended`);
    }
  }

  // Determine appropriate portal using RBAC role profile
  const roleProfile = getUserRoleProfile(user);

  let targetRedirect = redirectTo;

  // If specific portal requested (e.g. employee portal login form), verify permission or fallback to primary
  if (portalParam === "employee" && canUserAccessPortal(user, "/employee")) {
    targetRedirect = "/employee";
  } else if (portalParam === "organization" && canUserAccessPortal(user, "/organization")) {
    targetRedirect = "/organization";
  } else if (redirectTo === "/dashboard" || redirectTo === "/" || !canUserAccessPortal(user, redirectTo)) {
    targetRedirect = roleProfile.primaryPortal;
  }

  const portalRole = (roleProfile.isEmployee || roleProfile.isOrgAdmin) ? "ORGANIZATION" : "CUSTOMER";

  await createUserSession(user.id, portalRole);
  await createAuditLog({ actorUserId: user.id, action: "auth.login_succeeded" });
  redirect(targetRedirect);
}

export async function loginAction(next: string, formData: FormData) {
  const safeNext = next?.startsWith("/") ? next : "/dashboard";
  return authenticate(formData, safeNext, "/login");
}

export async function logoutAction() {
  await signOutCurrentSession();
  redirect("/login?portal=customer");
}

export async function developerLogoutAction() {
  await signOutCurrentSession();
  redirect("/login");
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    organizationId: formData.get("organizationId"),
  });

  if (!parsed.success) {
    console.error("Signup validation failed", parsed.error);
    redirect("/login?error=invalid_signup_input&mode=signup");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    redirect("/login?error=user_exists&mode=signup");
  }

  // Create the user
  const passwordHash = hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  // Get or create customer role
  const customerRole = await prisma.role.upsert({
    where: { key: "customer" },
    update: {},
    create: {
      key: "customer",
      name: "Customer",
      scope: "CUSTOMER",
      isSystem: true,
    },
  });

  // Create membership for the selected organization
  await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: parsed.data.organizationId,
      roleId: customerRole.id,
      status: "ACTIVE",
    },
  });

  await createAuditLog({ actorUserId: user.id, action: "auth.signup_succeeded" });
  await createUserSession(user.id, "CUSTOMER");
  redirect("/customer");
}

