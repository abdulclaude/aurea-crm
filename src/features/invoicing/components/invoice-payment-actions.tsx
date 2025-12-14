"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";
import { Loader2, Copy, Check } from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";

interface InvoicePaymentActionsProps {
  invoiceId: string;
  invoiceNumber: string;
  amountDue: string;
  currency: string;
  isPaid: boolean;
}

export function InvoicePaymentActions({
  invoiceId,
  invoiceNumber,
  amountDue,
  currency,
  isPaid,
}: InvoicePaymentActionsProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for success/canceled payment status
  const paymentSuccess = searchParams.get("success") === "true";
  const paymentCanceled = searchParams.get("canceled") === "true";

  // Generate Stripe payment link mutation
  const { mutate: generateStripeLink, isPending: isGeneratingLink } =
    useMutation(
      trpc.invoices.generatePaymentLink.mutationOptions({
        onSuccess: (data) => {
          if (data.paymentLink) {
            // Redirect to Stripe Checkout
            window.location.href = data.paymentLink;
          }
        },
        onError: (error) => {
          toast.error(error.message || "Failed to initialize payment");
          setIsProcessing(false);
        },
      })
    );

  const handleStripePayment = () => {
    setIsProcessing(true);
    generateStripeLink({
      invoiceId,
      provider: "STRIPE",
    });
  };

  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch bank transfer details
  const { data: bankTransferDetails, isLoading: isLoadingBankDetails } =
    useQuery({
      ...trpc.invoices.getBankTransferDetails.queryOptions({ invoiceId }),
    });

  const handleBankTransfer = () => {
    if (bankTransferDetails) {
      setShowBankDetails(true);
    } else {
      toast.info(
        "For bank transfer, please contact the merchant directly. Payment instructions may have been included in your invoice email.",
        { duration: 5000 }
      );
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatReference = (format: string | null | undefined) => {
    if (!format) return invoiceNumber;
    return format.replace("{invoiceNumber}", invoiceNumber);
  };

  if (isPaid || parseFloat(amountDue) <= 0) {
    return (
      <div className="bg-emerald-50 dark:bg-green-900/20  p-8 text-center">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-2">
          <svg
            className="size-6 text-emerald-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-emerald-500 mb-1">
          Invoice paid
        </h3>
        <p className="text-xs text-emerald-500">
          This invoice has been paid in full. <br /> Thank you for your payment!
        </p>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <>
        <Separator />
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 text-center">
          <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-2">
            <svg
              className="w-8 h-8 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-500 mb-1">
            Payment Successful!
          </h3>
          <p className="text-xs text-emerald-500">
            Your payment has been processed successfully. A receipt has been
            sent to your email.
          </p>
          <Button onClick={() => router.refresh()} variant="outline">
            Refresh invoice details
          </Button>
        </div>
      </>
    );
  }

  if (paymentCanceled) {
    toast.error("Payment was canceled", { id: "payment-canceled" });
  }

  return (
    <>
      <div className="bg-sky-50 dark:bg-sky-900/20 p-8 text-center">
        <h3 className="text-lg font-semibold text-sky-500">Ready to pay?</h3>
        <p className="text-xs text-sky-500 mb-4">
          Click below to pay this invoice securely
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleBankTransfer}
            disabled={isProcessing || isLoadingBankDetails}
          >
            Pay with Bank Transfer
          </Button>

          <Button
            size="sm"
            className="w-max"
            onClick={handleStripePayment}
            disabled={isProcessing || isGeneratingLink}
            variant="gradient"
          >
            {isProcessing || isGeneratingLink ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Pay with Stripe"
            )}
          </Button>
        </div>
        <p className="text-xs text-primary mt-4">
          Secure payment processing • All major cards accepted
        </p>
      </div>

      {/* Bank Transfer Details Modal/Section */}
      {showBankDetails && bankTransferDetails && (
        <>
          <Separator />
          <div className="bg-white dark:bg-gray-900 p-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  Bank Transfer Details
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBankDetails(false)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4 text-sm">
                {bankTransferDetails.bankName && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">Bank Name:</span>
                    <span className="font-medium text-primary">
                      {bankTransferDetails.bankName}
                    </span>
                  </div>
                )}

                {bankTransferDetails.accountName && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">Account Name:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">
                        {bankTransferDetails.accountName}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            bankTransferDetails.accountName!,
                            "Account Name"
                          )
                        }
                      >
                        {copiedField === "Account Name" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {bankTransferDetails.sortCode && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">Sort Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary font-mono">
                        {bankTransferDetails.sortCode}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            bankTransferDetails.sortCode!,
                            "Sort Code"
                          )
                        }
                      >
                        {copiedField === "Sort Code" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {bankTransferDetails.accountNumber && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">
                      Account Number:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary font-mono">
                        {bankTransferDetails.accountNumber}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            bankTransferDetails.accountNumber!,
                            "Account Number"
                          )
                        }
                      >
                        {copiedField === "Account Number" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {bankTransferDetails.routingNumber && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">
                      Routing Number:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary font-mono">
                        {bankTransferDetails.routingNumber}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            bankTransferDetails.routingNumber!,
                            "Routing Number"
                          )
                        }
                      >
                        {copiedField === "Routing Number" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {bankTransferDetails.iban && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">IBAN:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary font-mono">
                        {bankTransferDetails.iban}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(bankTransferDetails.iban!, "IBAN")
                        }
                      >
                        {copiedField === "IBAN" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {bankTransferDetails.swiftBic && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">SWIFT/BIC:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary font-mono">
                        {bankTransferDetails.swiftBic}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            bankTransferDetails.swiftBic!,
                            "SWIFT/BIC"
                          )
                        }
                      >
                        {copiedField === "SWIFT/BIC" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">
                    Payment Reference
                  </h4>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mb-2">
                    Please include this reference in your transfer:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded font-mono text-sm">
                      {formatReference(bankTransferDetails.referenceFormat)}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          formatReference(bankTransferDetails.referenceFormat),
                          "Reference"
                        )
                      }
                    >
                      {copiedField === "Reference" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {bankTransferDetails.instructions && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-primary mb-2">
                        Additional Instructions
                      </h4>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {bankTransferDetails.instructions}
                      </p>
                    </div>
                  </>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    <strong>Note:</strong> Bank transfers may take 1-3 business
                    days to process. Once you've made the transfer, you can
                    upload proof of payment below to expedite verification.
                  </p>
                </div>

                {/* TODO: Add upload proof of payment button here */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    toast.info("Upload functionality coming soon");
                  }}
                >
                  Upload Proof of Payment
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
