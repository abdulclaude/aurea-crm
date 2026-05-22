import type { Metadata } from "next";
import LoginForm from "@/features/auth/components/login-form";
import { requireUnauth } from "@/lib/auth-utils";

export const metadata: Metadata = { title: "Login" };

const Login = async () => {
  await requireUnauth();

  return <LoginForm />;
};

export default Login;
