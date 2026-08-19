"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/staff";

export async function staffLoginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      tenantId: formData.get("tenantId"),
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/staff",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error;
  }
}
