import { useEffect, useId, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (text: string) => void;
  onError?: (error: string) => void;
}

/** Serialize scanner cleanup/start so React Strict Mode does not leave duplicate camera views. */
let cleanupChain: Promise<void> = Promise.resolve();

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const containerId = `qr-reader-${useId().replace(/:/g, '')}`;
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    let active = true;
    const scanner = new Html5Qrcode(containerId, { verbose: false });
    const scanConfig = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 };

    const onSuccess = (decodedText: string) => {
      if (active) onScanRef.current(decodedText);
    };
    const onFrameError = () => {
      // Ignore per-frame decode misses
    };

    void cleanupChain
      .then(async () => {
        if (!active) return;

        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';

        try {
          await scanner.start({ facingMode: 'environment' }, scanConfig, onSuccess, onFrameError);
        } catch {
          if (!active) return;
          await scanner.start({ facingMode: 'user' }, scanConfig, onSuccess, onFrameError);
        }
      })
      .catch((err: unknown) => {
        if (active && onErrorRef.current) {
          onErrorRef.current(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      active = false;
      cleanupChain = (async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch {
          // Scanner may not have started before unmount
        }
        try {
          scanner.clear();
        } catch {
          // ignore
        }
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
      })();
    };
  }, [containerId]);

  return <div id={containerId} className="qr-scanner-view min-h-[280px] w-full" />;
}
