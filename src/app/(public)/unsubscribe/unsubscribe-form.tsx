"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type UnsubscribeState = "loading" | "valid" | "invalid" | "success" | "error";

interface TokenInfo {
  email: string;
  contactName: string;
}

export default function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<UnsubscribeState>("loading");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    // Validate token
    async function validateToken() {
      try {
        const response = await fetch(`/api/unsubscribe/validate?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setTokenInfo(data);
          setState("valid");
        } else {
          setState("invalid");
          setError(data.error || "Invalid or expired unsubscribe link");
        }
      } catch {
        setState("invalid");
        setError("Failed to validate unsubscribe link");
      }
    }

    validateToken();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;

    setState("loading");

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setState("success");
      } else {
        setState("error");
        setError(data.error || "Failed to unsubscribe");
      }
    } catch {
      setState("error");
      setError("An unexpected error occurred");
    }
  };

  if (state === "loading") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Processing...</p>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Link</h1>
        <p className="text-gray-600">
          {error || "This unsubscribe link is invalid or has expired."}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          If you believe this is an error, please contact support.
        </p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Successfully Unsubscribed
        </h1>
        <p className="text-gray-600">
          You have been unsubscribed from our mailing list. You will no longer
          receive marketing emails from us.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          If you change your mind, you can always re-subscribe through our website.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Something Went Wrong
        </h1>
        <p className="text-gray-600">{error || "Failed to process your request."}</p>
        <button
          onClick={() => setState("valid")}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // state === "valid"
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-gray-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Unsubscribe from Emails
        </h1>
        <p className="text-gray-600 mb-6">
          Are you sure you want to unsubscribe{" "}
          <span className="font-medium">{tokenInfo?.email}</span> from our mailing
          list?
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleUnsubscribe}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
        >
          Yes, Unsubscribe Me
        </button>
        <a
          href="/"
          className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium text-center"
        >
          No, Keep Me Subscribed
        </a>
      </div>

      <p className="text-xs text-gray-500 text-center mt-6">
        You received this email because you subscribed to our mailing list. If you
        didn&apos;t request this, you can safely ignore this page.
      </p>
    </div>
  );
}
