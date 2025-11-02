import RegisterForm from "@/features/auth/components/register-form";
import { requireUnauth } from "@/lib/auth-utils";

const Register = async () => {
  await requireUnauth();

  return (
    <div className="min-h-screen flex items-center justify-center max-w-2xl mx-auto">
      <RegisterForm />
    </div>
  );
};

export default Register;
