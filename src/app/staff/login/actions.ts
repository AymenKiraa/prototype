"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/staff";

export interface StaffLoginState {
  error?: string;
  success?: boolean;
}

export async function staffLoginAction(
  _prevState: StaffLoginState | undefined,
  formData: FormData,
): Promise<StaffLoginState> {
  try {
    // redirect: false — no server-side/framework redirect at all. On this
    // multi-subdomain setup, both NextAuth's own redirectTo (absolute-URL
    // base detection) and next/navigation's redirect() (which still
    // triggers the framework's automatic post-action RSC refetch) ended up
    // targeting the wrong host. The client component does a real browser
    // navigation instead, which is unambiguously relative to the current
    // tab regardless of any of that.
    await signIn("credentials", {
      tenantId: formData.get("tenantId"),
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
