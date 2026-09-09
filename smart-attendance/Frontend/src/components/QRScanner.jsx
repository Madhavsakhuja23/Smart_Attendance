import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export default function QRScanner({ onScan }) {
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const scanningRef = useRef(false);
  const processingRef = useRef(false);
  const scannedRollsRef = useRef(new Set());

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    const elementId = "attendance-qr-reader";

    async function startScanner() {
      if (startingRef.current) return;
      startingRef.current = true;

      try {
        const el = document.getElementById(elementId);
        if (!el) throw new Error("Scanner container not found.");
        el.innerHTML = "";

        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        if (!mountedRef.current) return;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false },

          async (decodedText) => {
            if (processingRef.current) return;
            processingRef.current = true;

            try {
              let qrData;
              try {
                qrData = JSON.parse(decodedText);
              } catch {
                if (mountedRef.current) { setError("Invalid QR code format."); setSuccess(""); }
                return;
              }

              if (!qrData.className || !qrData.rollNumber || !qrData.date || !qrData.sessionId) {
                if (mountedRef.current) { setError("Not a valid attendance QR."); setSuccess(""); }
                return;
              }

              const rollKey = String(qrData.rollNumber).trim();
              if (scannedRollsRef.current.has(rollKey)) {
                if (mountedRef.current) {
                  setError("");
                  setSuccess(`Roll ${qrData.rollNumber} — Already marked ✓`);
                }
                setTimeout(() => { processingRef.current = false; }, 500);
                return;
              }

              if (mountedRef.current) { setError(""); setSuccess("Verifying..."); }

              await onScan(qrData);
              scannedRollsRef.current.add(rollKey);

              if (mountedRef.current) {
                setError("");
                setSuccess(`Roll ${qrData.rollNumber} — Marked Present ✓`);
              }

              setTimeout(() => { if (mountedRef.current) setSuccess(""); }, 4000);
            } catch (err) {
              if (mountedRef.current) { setSuccess(""); setError(err.message || "Scan failed."); }
            } finally {
              setTimeout(() => { processingRef.current = false; }, 800);
            }
          },
          () => {}
        );

        scanningRef.current = true;
      } catch (err) {
        scanningRef.current = false;
        if (mountedRef.current) {
          setError(
            err.name === "NotAllowedError"
              ? "Camera permission denied. Please allow access."
              : err.message || "Unable to start camera."
          );
        }
      } finally {
        startingRef.current = false;
      }
    }

    const timer = setTimeout(() => { if (mountedRef.current) startScanner(); }, 150);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner && scanningRef.current) {
        scanner.stop()
          .then(() => { try { scanner.clear(); } catch {} })
          .catch(() => { try { scanner.clear(); } catch {} });
        scanningRef.current = false;
      }
    };
  }, [onScan]);

  return (
    <div className="scanner-wrapper">

      {success && (
        <div className="scanner-success">
          <div className="success-icon">✓</div>
          <div className="success-content">
            <strong>{success}</strong>
            <span>Recorded in the attendance sheet</span>
          </div>
        </div>
      )}

      {error && <div className="scanner-error">⚠ {error}</div>}

      <div style={{ position: "relative" }}>
        <div id="attendance-qr-reader" className="qr-reader" />

        {/* Scan overlay with animated line + corner markers */}
        <div className="scanner-overlay">
          <div className="scan-frame">
            <div className="scan-corner-bl" />
            <div className="scan-corner-br" />
            <div className="scan-line" />
          </div>
        </div>
      </div>

      <div className="scanner-instruction">
        <strong>Point at student's QR code</strong>
        <span>Hold steady — it scans automatically</span>
      </div>
    </div>
  );
}