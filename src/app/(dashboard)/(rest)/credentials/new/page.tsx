import CredentialForm from "@/features/credentials/components/credentials-form";
import { requireAuth } from "@/lib/auth-utils";

const NewCredential = async () => {
  await requireAuth();

  return (
    <div className="p-4 md:px-10 md:py-6 h-svh">
      <div className="mx-auto max-w-screen-md w-full flex flex-col justify-center gap-y-8 h-full">
        <CredentialForm />
      </div>
    </div>
  );
};

export default NewCredential;
