"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/customer";

export interface CustomerLoginState {
  error?: string;
  success?: boolean;
}

export async function customerLoginAction(
  _prevState: CustomerLoginState | undefined,
  formData: FormData,
): Promise<CustomerLoginState> {
  try {
    // See staff/login/actions.ts for why this doesn't use a server-side
    // redirect at all.
    await signIn("credentials", {
      tenantId: formData.get("tenantId"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid phone number or password." };
    }
    throw error;
  }
  return { success: true };
}
