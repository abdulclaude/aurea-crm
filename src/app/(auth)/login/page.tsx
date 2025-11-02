import LoginForm from "@/features/auth/components/login-form";
import { requireUnauth } from "@/lib/auth-utils";

const Login = async () => {
  await requireUnauth();

  return (
    <div className="min-h-screen flex items-center justify-center max-w-2xl mx-auto">
      <LoginForm />
    </div>
  );
};

export default Login;
