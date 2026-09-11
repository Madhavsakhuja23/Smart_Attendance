import { useState } from "react";
import QRCode from "qrcode";
import {
    sendEmails,
    getEmailQueueStatus
} from "../services/api";


async function runConcurrent(tasks, limit) {
    const results = [];
    let i = 0;

    async function run() {
        while (i < tasks.length) {
            const idx = i++;
            results[idx] = await tasks[idx]();
        }
    }

    await Promise.all(
        Array.from(
            {
                length: Math.min(limit, tasks.length)
            },
            () => run()
        )
    );

    return results;
}


export default function QRGenerator({
    students,
    className,
    date,
    sessionId,
    onComplete
}) {

    const [sending, setSending] = useState(false);
const [progress, setProgress] = useState(0);
const [result, setResult] = useState(null);
const [phase, setPhase] = useState("idle");


    // =====================================================
    // GENERATE ALL QR CODES
    // =====================================================

    async function generateQRCodes() {

        const qrStudents =
            new Array(students.length);

        let done = 0;

        const tasks =
            students.map((s, i) => async () => {

                const payload =
                    JSON.stringify({
                        className,
                        rollNumber: s.roll,
                        date,
                        sessionId
                    });

                const qr =
                    await QRCode.toDataURL(
                        payload,
                        {
                            width: 500,
                            margin: 3,
                            errorCorrectionLevel: "H"
                        }
                    );

                qrStudents[i] = {
                    roll: s.roll,
                    name: s.name,
                    email: s.email,
                    qrBase64: qr
                };

                done++;

                setProgress(
                    Math.round(
                        (done / students.length) * 100
                    )
                );
            });


        // Generate 5 QR codes concurrently
        await runConcurrent(tasks, 5);

        return qrStudents.filter(Boolean);
    }


    // =====================================================
    // POLL EMAIL QUEUE STATUS
    // =====================================================

    async function monitorEmailQueue() {

        const total =
            students.length;

        while (true) {

            try {

                const status =
                    await getEmailQueueStatus({
                        sessionId
                    });


                const sent =
                    Number(status.sent || 0);

                const failed =
                    Number(status.failed || 0);

                const pending =
                    Number(status.pending || 0);

                const retryPending =
                    Number(
                        status.retryPending || 0
                    );

                const sending =
                    Number(status.sending || 0);


                /*
                 * Email progress occupies the second
                 * half of our progress bar.
                 *
                 * 50% was QR generation.
                 * Remaining 50% is email sending.
                 */

                const completedEmails =
                    sent + failed;

                const emailProgress =
                    total > 0
                        ? Math.min(
                            (completedEmails / total) * 100
                        )
                        : 0;


                setProgress(
                  emailProgress
                );


                /*
                 * Queue completely finished.
                 */

                if (
                    status.complete ||
                    (
                        pending === 0 &&
                        retryPending === 0 &&
                        sending === 0
                    )
                ) {

                    setProgress(100);

                    return {
                        total,
                        sent,
                        failed
                    };
                }


                /*
                 * Wait 2 seconds before checking again.
                 */

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            2000
                        )
                );

            } catch (error) {

                /*
                 * Don't immediately destroy the UI
                 * because one status request failed.
                 *
                 * Wait and try again.
                 */

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            3000
                        )
                );
            }
        }
    }


    // =====================================================
    // MAIN DISPATCH
    // =====================================================

    async function handleDispatch() {

        try {

            setSending(true);
            setResult(null);
            setProgress(0);
            setPhase("generating");


            // ============================================
            // STEP 1 — Generate QR codes
            // ============================================

            const qrStudents =
                await generateQRCodes();


            if (!qrStudents.length) {

                throw new Error(
                    "No QR codes could be generated."
                );
            }


            setProgress(50);


            // ============================================
            // STEP 2 — CREATE EMAIL QUEUE
            // ============================================

            const queueResponse =
                await sendEmails({
                    className,
                    date,
                    sessionId,
                    students: qrStudents
                });


            if (
                !queueResponse ||
                queueResponse.status !== "success"
            ) {

                throw new Error(
                    queueResponse?.message ||
                    "Unable to create email queue."
                );
            }


            /*
             * Queue created.
             *
             * IMPORTANT:
             * We DO NOT send emails here.
             *
             * Apps Script worker will send them
             * automatically in batches of 50.
             */

            setPhase("sending");
            setProgress(0);


            // ============================================
            // STEP 3 — MONITOR BACKGROUND EMAIL WORKER
            // ============================================

            const finalResult =
                await monitorEmailQueue();


            // ============================================
            // STEP 4 — SHOW FINAL RESULT
            // ============================================

            setResult({
                sent:
                    finalResult.sent,

                failed:
                    finalResult.failed,

                total:
                    finalResult.total
            });


            if (onComplete) {
                onComplete();
            }

        } catch (e) {

            setResult({
                error:
                    e.message ||
                    "Something went wrong."
            });

        } finally {

            setSending(false);
            setPhase("idle");
        }
    }


    // =====================================================
    // UI
    // =====================================================

    return (

        <div>

            <div className="dispatch-header">

                <div>

                    <h3>
                        Send QR Codes
                    </h3>

                    <p>
                        {students.length} students
                        will receive personalized
                        QR codes.
                    </p>

                </div>


                <button
                    onClick={handleDispatch}
                    disabled={sending}
                >

                    {sending
                        ? "Sending..."
                        : "Generate & Send"}

                </button>

            </div>


            {sending && (

                <div className="progress-container">

                    <div className="progress-text">

                        <span>
                           {
                            phase==="generating"?"Generating QR Codes ..":"Sending QR emails ..."
                           }
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


            {result &&
                !result.error && (

                <div className="dispatch-result">

                    <h3>
                        {result.failed === 0
                            ? "✅ All QR emails sent"
                            : "⚠ QR email sending completed"}
                    </h3>


                    <p>
                        Total:
                        <strong>
                            {" "}{result.total}
                        </strong>
                    </p>


                    <p>
                        Sent:
                        <strong>
                            {" "}{result.sent}
                        </strong>
                    </p>


                    <p>
                        Failed:
                        <strong>
                            {" "}{result.failed}
                        </strong>
                    </p>


                    {result.failed > 0 && (

                        <p>
                            Some emails could not
                            be delivered after the
                            automatic retry attempts.
                        </p>

                    )}

                </div>

            )}


            {result?.error && (

                <div className="error-message">

                    ⚠ {result.error}

                </div>

            )}

        </div>
    );
}