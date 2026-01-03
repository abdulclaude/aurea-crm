import { Suspense } from "react";
import UnsubscribeForm from "./unsubscribe-form";

export const metadata = {
  title: "Unsubscribe",
  description: "Manage your email preferences",
};

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        }
      >
        <UnsubscribeForm />
      </Suspense>
    </div>
  );
}
