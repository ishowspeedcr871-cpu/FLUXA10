import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/database/client";
import { measureAsync } from "@/lib/performance";
import { SESSION_COOKIE_NAME } from "@/services/auth/constants";

const SESSION_TTL_DAYS = 30;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET environment variable is required in production");
  }
  return secret ?? "development-auth-secret";
}

function hashToken(token: string) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createUserSession(userId: string, portalRole?: "CUSTOMER" | "ORGANIZATION") {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const requestHeaders = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  // We only store the hash. The cookie contains the raw token.
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: requestHeaders.get("user-agent"),
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
    },
  });

  const cookieStore = await cookies();
  // Cookie format: sessionId.rawToken
  cookieStore.set(SESSION_COOKIE_NAME, `${session.id}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  if (portalRole) {
    cookieStore.set("fluxa_portal_role", portalRole, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });
  }

  // Also create a refresh token for compatibility if needed, though session is the primary driver
  try {
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });
  } catch (err) {
    console.warn("Prisma error during refresh token creation.", err);
  }

  return session;
}

async function resolveCurrentSession() {
  try {
    const cookieStore = await cookies();
    const rawSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const portalRoleCookie = cookieStore.get("fluxa_portal_role")?.value as
      "CUSTOMER" | "ORGANIZATION" | undefined;

    if (rawSession) {
      const [sessionId, token] = rawSession.split(".");
      if (sessionId && token) {
        const tokenHash = hashToken(token);
        const session = await measureAsync("auth.resolveCurrentSession.prisma", () =>
          prisma.session.findUnique({
            where: { id: sessionId },
            select: {
              id: true,
              userId: true,
              status: true,
              tokenHash: true,
              expiresAt: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  imageUrl: true,
                  emailVerifiedAt: true,
                  status: true,
                  createdAt: true,
                  updatedAt: true,
                  deletedAt: true,
                  memberships: {
                    where: { status: "ACTIVE", deletedAt: null },
                    select: {
                      id: true,
                      organizationId: true,
                      userId: true,
                      roleId: true,
                      status: true,
                      createdAt: true,
                      updatedAt: true,
                      deletedAt: true,
                      organization: {
                        select: {
                          id: true,
                          name: true,
                          slug: true,
                          status: true,
                          timezone: true,
                          currency: true,
                          createdAt: true,
                          updatedAt: true,
                          deletedAt: true,
                        },
                      },
                      role: {
                        select: {
                          id: true,
                          key: true,
                          name: true,
                          description: true,
                          scope: true,
                          isSystem: true,
                          createdAt: true,
                          updatedAt: true,
                          permissions: {
                            select: {
                              roleId: true,
                              permissionId: true,
                              createdAt: true,
                              permission: {
                                select: {
                                  id: true,
                                  key: true,
                                  name: true,
                                  description: true,
                                  scope: true,
                                  createdAt: true,
                                  updatedAt: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
        );

        if (
          session &&
          session.status === "ACTIVE" &&
          session.expiresAt > new Date() &&
          session.tokenHash === tokenHash &&
          session.user
        ) {
          return {
            session: {
              id: session.id,
              userId: session.userId,
              portalRole: portalRoleCookie || "CUSTOMER",
            },
            user: session.user,
            id: session.id,
            userId: session.userId,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error in getCurrentSession:", error);
    return null;
  }
}

export const getCurrentSession = cache(resolveCurrentSession);

export async function signOutCurrentSession() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const [sessionId, token] = rawSession?.split(".") ?? [];

  if (sessionId) {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
    } catch (err) {
      console.warn("Prisma error revoking session", err);
    }
  }

  if (token) {
    try {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      console.warn("Prisma error revoking refresh token", err);
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("fluxa_portal_role");
}
