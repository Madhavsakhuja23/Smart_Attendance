import { useState } from "react";
import QRCode from "qrcode";
import { sendEmails } from "../services/api";


export default function QRGenerator({

  students,

  className,

  date,

  sessionId,

  onComplete

}) {

  const [sending, setSending] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [generated, setGenerated] =
    useState([]);

  const [result, setResult] =
    useState(null);


  /**
   * Generate all QR codes.
   */
  async function generateQRCodes() {

    const qrStudents = [];


    for (
      let i = 0;
      i < students.length;
      i++
    ) {

      const student =
        students[i];


      const payload =
        JSON.stringify({

          className:
            className,

          rollNumber:
            student.roll,

          date:
            date,

          sessionId:
            sessionId
        });


      const qrDataUrl =
        await QRCode.toDataURL(

          payload,

          {
            width: 500,

            margin: 3,

            errorCorrectionLevel:
              "H"
          }
        );


      qrStudents.push({

        roll:
          student.roll,

        name:
          student.name,

        email:
          student.email,

        qrBase64:
          qrDataUrl
      });


      setProgress(
        Math.round(
          ((i + 1) /
            students.length) *
          50
        )
      );
    }


    setGenerated(qrStudents);

    return qrStudents;
  }


  /**
   * Generate QR codes and
   * send them to Apps Script.
   */
  async function handleDispatch() {

    try {

      setSending(true);

      setResult(null);

      setProgress(0);


      const qrStudents =
        await generateQRCodes();


      setProgress(55);


      /**
       * Apps Script has a request-size
       * limitation, so send students
       * in batches.
       */
      const BATCH_SIZE = 10;

      let totalSent = 0;
      let totalFailed = 0;

      const allResults = [];


      for (
        let i = 0;
        i < qrStudents.length;
        i += BATCH_SIZE
      ) {

        const batch =
          qrStudents.slice(
            i,
            i + BATCH_SIZE
          );


        const response =
          await sendEmails({

            className,

            date,

            sessionId,

            students:
              batch
          });


        totalSent +=
          response.sentCount;

        totalFailed +=
          response.failedCount;


        allResults.push(
          ...(response.results || [])
        );


        const completed =
          Math.min(
            i +
              batch.length,
            qrStudents.length
          );


        setProgress(
          55 +
          Math.round(
            (completed /
              qrStudents.length) *
            45
          )
        );
      }


      setResult({

        sent:
          totalSent,

        failed:
          totalFailed,

        results:
          allResults
      });


      if (onComplete) {
        onComplete();
      }


    } catch (error) {

      setResult({

        error:
          error.message
      });

    } finally {

      setSending(false);
    }
  }


  return (

    <div>

      <div className="dispatch-header">

        <div>

          <h3>
            QR Code Distribution
          </h3>

          <p>
            {students.length} students
            will receive personalized
            QR codes.
          </p>

        </div>


        <button
          onClick={
            handleDispatch
          }
          disabled={sending}
        >

          {sending
            ? "Dispatching..."
            : "Generate & Dispatch QR Codes"}

        </button>

      </div>


      {sending && (

        <div className="progress-container">

          <div className="progress-text">

            <span>
              Processing QR codes...
            </span>

            <span>
              {progress}%
            </span>

          </div>


          <div className="progress-bar">

            <div
              className="progress-fill"
              style={{
                width:
                  `${progress}%`
              }}
            />

          </div>

        </div>
      )}


      {result && !result.error && (

        <div className="dispatch-result">

          <h3>
            ✅ Dispatch Complete
          </h3>

          <p>
            Successfully sent:{" "}
            <strong>
              {result.sent}
            </strong>
          </p>

          <p>
            Failed:{" "}
            <strong>
              {result.failed}
            </strong>
          </p>


          {result.failed > 0 && (

            <details>

              <summary>
                View failed students
              </summary>

              {result.results
                .filter(
                  item =>
                    !item.success
                )
                .map(item => (

                  <p
                    key={item.roll}
                  >
                    Roll {item.roll}:{" "}
                    {item.message}
                  </p>

                ))}

            </details>

          )}

        </div>
      )}


      {result?.error && (

        <div className="error-message">

          ❌ {result.error}

        </div>

      )}

    </div>
  );
}