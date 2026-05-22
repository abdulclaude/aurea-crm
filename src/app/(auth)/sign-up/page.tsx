import type { Metadata } from "next";
import RegisterForm from "@/features/auth/components/register-form";
import { requireUnauth } from "@/lib/auth-utils";

export const metadata: Metadata = { title: "Sign up today" };

const Register = async () => {
  await requireUnauth();

  return <RegisterForm />;
};

export default Register;
