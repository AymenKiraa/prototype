"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/customer";

export async function customerLoginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      tenantId: formData.get("tenantId"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid phone number or password.";
    }
    throw error;
  }
}
