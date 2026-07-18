"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";

type MemberCheckInPassProps = {
  token: string | null;
};

export function MemberCheckInPass({ token }: MemberCheckInPassProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setImageUrl(null);
    if (!token) return () => undefined;

    void QRCode.toDataURL(token, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#111827", light: "#ffffff" },
    }).then((url) => {
      if (active) setImageUrl(url);
    });

    return () => {
      active = false;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
        <QrCode className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Member pass unavailable</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Ask the studio to refresh this portal after check-in passes are
          configured.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-5 text-center">
      <div className="flex size-72 items-center justify-center border bg-white p-3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Member check-in pass"
            width={288}
            height={288}
            unoptimized
            className="size-full"
          />
        ) : (
          <div className="size-6 animate-spin rounded-full border-2 border-black/20 border-t-black" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium">Your member pass</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Present this code at the front desk. It refreshes automatically.
        </p>
      </div>
    </div>
  );
}
