"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/platform-admin";

export interface PlatformAdminLoginState {
  error?: string;
  success?: boolean;
}

export async function platformAdminLoginAction(
  _prevState: PlatformAdminLoginState | undefined,
  formData: FormData,
): Promise<PlatformAdminLoginState> {
  try {
    // See staff/login/actions.ts for why this doesn't use a server-side
    // redirect at all.
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
  return { success: true };
}
