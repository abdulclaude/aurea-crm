"use client";

import { Toaster } from "sonner";

import { TRPCReactProvider } from "@/trpc/client";
import { SpotBookingViewer } from "@/features/spot-booking/components/spot-booking-viewer";

export function SpotBookingTest({ roomId }: { roomId: string }) {
  return (
    <TRPCReactProvider>
      <div className="flex h-screen flex-col bg-black">
        <div className="border-b border-white/10 bg-[#111] px-6 py-3">
          <h1 className="text-lg font-semibold text-white">
            Spot booking test
          </h1>
          <p className="text-sm text-white/50">
            Open this page in multiple tabs to test real-time spot booking.
            Click a green spot to select, enter your name, and reserve.
          </p>
        </div>
        <SpotBookingViewer roomId={roomId} className="flex-1" />
      </div>
      <Toaster position="top-center" theme="dark" />
    </TRPCReactProvider>
  );
}
