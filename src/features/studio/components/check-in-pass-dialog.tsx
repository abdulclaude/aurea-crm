"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, QrCode, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BarcodeDetectorConstructor = new (input?: {
  formats?: string[];
}) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
};

type CheckInPassDialogProps = {
  disabled: boolean;
  isPending: boolean;
  onSubmit: (token: string) => void;
};

export function CheckInPassDialog({
  disabled,
  isPending,
  onSubmit,
}: CheckInPassDialogProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  function stopCamera() {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  useEffect(() => stopCamera, []);

  async function startCamera() {
    setCameraError(null);
    const Detector = (
      window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;
    if (!Detector) {
      setCameraError(
        "Camera scanning is not supported in this browser. Paste the pass code instead.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
      scanningRef.current = true;

      const detector = new Detector({ formats: ["qr_code"] });
      while (scanningRef.current) {
        const matches = await detector.detect(video);
        const value = matches[0]?.rawValue?.trim();
        if (value) {
          setToken(value);
          stopCamera();
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } catch {
      stopCamera();
      setCameraError(
        "Camera access was unavailable. Check browser permissions or paste the pass code.",
      );
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) stopCamera();
  }

  function handleSubmit() {
    const value = token.trim();
    if (!value) return;
    onSubmit(value);
    setToken("");
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <ScanLine className="size-3.5" />
          Scan pass
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan member pass</DialogTitle>
          <DialogDescription>
            Scan the member&apos;s portal pass or paste its code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden border bg-black" hidden={!cameraActive}>
            <video
              ref={videoRef}
              className="aspect-video w-full object-cover"
              muted
              playsInline
              aria-label="QR code camera preview"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={cameraActive ? stopCamera : () => void startCamera()}
          >
            {cameraActive ? (
              <QrCode className="size-4" />
            ) : (
              <Camera className="size-4" />
            )}
            {cameraActive ? "Stop camera" : "Use camera"}
          </Button>

          {cameraError ? (
            <p className="text-xs text-destructive" role="alert">
              {cameraError}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="member-pass-code">Member pass code</Label>
            <Input
              id="member-pass-code"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="off"
              placeholder="Paste pass code"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!token.trim() || isPending}
          >
            Check in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
