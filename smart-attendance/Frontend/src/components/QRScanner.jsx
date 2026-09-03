import { useEffect, useRef, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats
} from "html5-qrcode";

export default function QRScanner({ onScan }) {

  const scannerRef = useRef(null);

  const mountedRef = useRef(true);

  const startingRef = useRef(false);

  const scanningRef = useRef(false);

  const processingRef = useRef(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");


  useEffect(() => {

    mountedRef.current = true;

    const elementId =
      "attendance-qr-reader";


    async function startScanner() {

      if (startingRef.current) {
        return;
      }

      startingRef.current = true;


      try {

        const element =
          document.getElementById(elementId);


        if (!element) {

          throw new Error(
            "Scanner container was not found."
          );
        }


        element.innerHTML = "";


        const scanner =
          new Html5Qrcode(
            elementId,
            {
              formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE
              ],

              verbose: false
            }
          );


        scannerRef.current =
          scanner;


        if (!mountedRef.current) {
          return;
        }


        await scanner.start(

          {
            facingMode:
              "environment"
          },

          {
            fps: 10,

            qrbox: {
              width: 250,
              height: 250
            },

            aspectRatio: 1.0,

            disableFlip: false
          },


          async (decodedText) => {

            /*
             * Prevent the same QR from
             * being processed multiple times.
             */
            if (
              processingRef.current
            ) {
              return;
            }


            processingRef.current =
              true;


            try {

              console.log(
                "QR DETECTED:",
                decodedText
              );


              let qrData;


              try {

                qrData =
                  JSON.parse(
                    decodedText
                  );

              } catch {

                if (
                  mountedRef.current
                ) {

                  setError(
                    "❌ Invalid attendance QR code."
                  );

                  setSuccess("");
                }

                return;
              }


              /*
               * Validate QR data.
               */
              if (
                !qrData.className ||
                !qrData.rollNumber ||
                !qrData.date ||
                !qrData.sessionId
              ) {

                if (
                  mountedRef.current
                ) {

                  setError(
                    "❌ This is not a valid attendance QR code."
                  );

                  setSuccess("");
                }

                return;
              }


              if (
                mountedRef.current
              ) {

                setError("");

                setSuccess(
                  "⏳ Verifying attendance..."
                );
              }


              /*
               * Send QR data to App.jsx.
               *
               * IMPORTANT:
               * onScan must throw an error if
               * attendance was NOT marked.
               */
              await onScan(qrData);


              /*
               * If onScan completes successfully,
               * the backend has confirmed attendance.
               */
              if (
                mountedRef.current
              ) {

                setError("");

                setSuccess(
                  `✅ Attendance Marked Successfully — Roll No. ${qrData.rollNumber}`
                );
              }


              /*
               * Automatically remove the
               * success message after 4 seconds.
               */
              setTimeout(() => {

                if (
                  mountedRef.current
                ) {

                  setSuccess("");
                }

              }, 4000);


            } catch (err) {

              console.error(
                "QR processing error:",
                err
              );


              if (
                mountedRef.current
              ) {

                setSuccess("");

                setError(
                  err.message ||
                  "Unable to mark attendance."
                );
              }


            } finally {

              /*
               * Small cooldown.
               */
              setTimeout(() => {

                processingRef.current =
                  false;

              }, 1500);
            }

          },

          () => {
            /*
             * QR not detected.
             *
             * This is normal.
             */
          }

        );


        scanningRef.current =
          true;


        console.log(
          "QR scanner started successfully."
        );


      } catch (err) {

        console.error(
          "QR scanner startup error:",
          err
        );


        scanningRef.current =
          false;


        if (
          mountedRef.current
        ) {

          if (
            err.name ===
            "NotAllowedError"
          ) {

            setError(
              "❌ Camera permission denied. Please allow camera access."
            );

          } else {

            setError(
              err.message ||
              "Unable to start the camera."
            );
          }
        }


      } finally {

        startingRef.current =
          false;
      }
    }


    /*
     * Give the DOM time to render.
     */
    const timer =
      setTimeout(() => {

        if (
          mountedRef.current
        ) {

          startScanner();
        }

      }, 150);


    /*
     * Cleanup.
     */
    return () => {

      mountedRef.current =
        false;


      clearTimeout(timer);


      const scanner =
        scannerRef.current;


      scannerRef.current =
        null;


      if (
        scanner &&
        scanningRef.current
      ) {

        scanner
          .stop()
          .then(() => {

            try {

              scanner.clear();

            } catch (e) {

              console.warn(
                "Scanner clear warning:",
                e
              );
            }

          })
          .catch((err) => {

            console.warn(
              "Scanner stop warning:",
              err
            );

            try {

              scanner.clear();

            } catch (e) {
              // Ignore cleanup errors.
            }
          });


        scanningRef.current =
          false;
      }

    };

  }, [onScan]);


  return (

    <div className="scanner-wrapper">


      {/* =================================================
          SUCCESS MESSAGE
          ================================================= */}

      {success && (

        <div className="scanner-success">

          <div className="success-icon">
            ✓
          </div>

          <div className="success-content">

            <strong>
              {success}
            </strong>

            <span>
              The attendance has been
              recorded in the sheet.
            </span>

          </div>

        </div>
      )}


      {/* =================================================
          ERROR MESSAGE
          ================================================= */}

      {error && (

        <div className="scanner-error">

          {error}

        </div>
      )}


      {/* =================================================
          CAMERA
          ================================================= */}

      <div
        id="attendance-qr-reader"
        className="qr-reader"
      />


      {/* =================================================
          INSTRUCTIONS
          ================================================= */}

      <div className="scanner-instruction">

        <strong>
          Scan Student QR
        </strong>

        <span>
          Place the QR code inside
          the scanning box.
        </span>

      </div>

    </div>
  );
}