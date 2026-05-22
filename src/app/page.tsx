import { buttonVariants } from "@/components/ui/button";
import { requireUnauth } from "@/lib/auth-utils";
import Link from "next/link";

const Home = async () => {
  await requireUnauth();

  return (
    <div className="flex items-center justify-center h-screen gap-2">
      <Link className={buttonVariants({ variant: "outline" })} href="/sign-up">
        Sign up
      </Link>

      <Link className={buttonVariants({ variant: "outline" })} href="/login">
        Log in
      </Link>
    </div>
  );
};

export default Home;
