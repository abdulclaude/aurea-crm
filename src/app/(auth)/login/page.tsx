import LoginForm from "@/features/auth/components/login-form";
import { requireUnauth } from "@/lib/auth-utils";
import Link from "next/link";

import Image from "next/image";

const Login = async () => {
  await requireUnauth();

  return <LoginForm />;
};

export default Login;
