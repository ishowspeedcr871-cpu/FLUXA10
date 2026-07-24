export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";
import { loginAction, signUpAction } from "@/services/auth/actions";
import { getCurrentSession } from "@/services/auth/session";
import { getUserRoleProfile, canUserAccessPortal } from "@/services/auth/rbac";
import { AuthLayout } from "@/layouts/auth-layout";
import { LoginForm } from "./login-form";
import { listOrganizations } from "@/services/organizations/organization-service";

const errorMessages: Record<string, string> = {
  invalid_input: "Enter a valid email and password.",
  invalid_credentials: "Invalid credentials.",
  service_unavailable: "Authentication is temporarily unavailable.",
  user_suspended: "This account has been suspended.",
  org_suspended: "Your organization has been suspended.",
  invalid_signup_input: "Please fill all fields correctly.",
  user_exists: "An account with this email already exists.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; portal?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : undefined;
  const next = params.next || "/dashboard";
  const portal = params.portal || "customer";
  const isSignup = params.mode === "signup" && portal === "customer";

  // Check if session is already active; if so, skip login page
  const currentSession = await getCurrentSession();
  if (currentSession && currentSession.user) {
    const profile = getUserRoleProfile(currentSession.user);
    if (portal && canUserAccessPortal(currentSession.user, `/${portal}`)) {
      redirect(`/${portal}`);
    }
    redirect(profile.primaryPortal);
  }

  const boundLoginAction = loginAction.bind(null, next);
  const organizations = portal === "customer" ? await listOrganizations() : [];

  return (
    <AuthLayout>
      <LoginForm 
        boundLoginAction={boundLoginAction} 
        boundSignUpAction={signUpAction}
        error={error} 
        portal={portal}
        isSignupInitial={isSignup}
        organizations={organizations}
      />
    </AuthLayout>
  );
}
