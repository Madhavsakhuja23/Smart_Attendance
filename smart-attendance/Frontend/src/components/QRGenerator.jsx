import { useState } from "react";
import QRCode from "qrcode";

import {
    sendEmails,
    getEmailQueueStatus
} from "../services/api";


// =====================================================
// RUN ASYNC TASKS CONCURRENTLY
// =====================================================

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


// =====================================================
// QR GENERATOR COMPONENT
// =====================================================

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

    // idle
    // generating
    // sending
    const [phase, setPhase] = useState("idle");


    // =====================================================
    // GENERATE ALL QR CODES
    // =====================================================

    async function generateQRCodes() {

        const qrStudents =
            new Array(students.length);

        let done = 0;


        const tasks =
            students.map((student, index) => async () => {

                // -----------------------------------------
                // QR PAYLOAD
                // -----------------------------------------

                const payload =
                    JSON.stringify({
                        className,
                        rollNumber: student.roll,
                        date,
                        sessionId
                    });


                // -----------------------------------------
                // GENERATE QR
                // -----------------------------------------

                const qr =
                    await QRCode.toDataURL(
                        payload,
                        {
                            width: 500,
                            margin: 3,
                            errorCorrectionLevel: "H"
                        }
                    );


                // -----------------------------------------
                // STORE STUDENT + QR
                // -----------------------------------------

                qrStudents[index] = {
                    roll: student.roll,
                    name: student.name,
                    email: student.email,
                    qrBase64: qr
                };


                // -----------------------------------------
                // UPDATE GENERATION PROGRESS
                // -----------------------------------------

                done++;

                const generationProgress =
                    students.length > 0
                        ? Math.round(
                            (done / students.length) * 100
                        )
                        : 100;

                setProgress(
                    Math.min(
                        100,
                        generationProgress
                    )
                );

            });


        // Generate 5 QR codes concurrently
        await runConcurrent(
            tasks,
            5
        );


        return qrStudents.filter(Boolean);
    }


    // =====================================================
    // POLL EMAIL QUEUE STATUS
    // =====================================================

    async function monitorEmailQueue() {

        /*
         * IMPORTANT:
         *
         * We use the queue's total count when available.
         * This is safer than relying only on students.length.
         */

        let total =
            students.length;


        while (true) {

            try {

                const status =
                    await getEmailQueueStatus({
                        sessionId
                    });


                // -----------------------------------------
                // DEBUG LOG
                // -----------------------------------------

                console.log(
                    "EMAIL QUEUE STATUS:",
                    status
                );


                // -----------------------------------------
                // GET COUNTS
                // -----------------------------------------

                const queueTotal =
                    Number(status.total || 0);

                if (queueTotal > 0) {
                    total = queueTotal;
                }


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


                // -----------------------------------------
                // CALCULATE COMPLETED EMAILS
                // -----------------------------------------
                //
                // SENT + PERMANENTLY FAILED
                //
                // Example:
                //
                // 50 students
                // 30 sent
                // 2 failed
                //
                // completed = 32
                // progress = 64%
                //
                // -----------------------------------------

                const completedEmails =
                    sent + failed;


                const emailProgress =
                    total > 0
                        ? Math.min(
                            100,
                            Math.round(
                                (
                                    completedEmails /
                                    total
                                ) * 100
                            )
                        )
                        : 0;


                // -----------------------------------------
                // UPDATE PROGRESS BAR
                // -----------------------------------------

                setProgress(
                    emailProgress
                );


                // -----------------------------------------
                // DEBUG LOG
                // -----------------------------------------

                console.log(
                    `Email progress: ${completedEmails}/${total} = ${emailProgress}%`
                );


                console.log(
                    `Sent: ${sent}, Failed: ${failed}, Pending: ${pending}, Retry: ${retryPending}, Sending: ${sending}`
                );


                // -----------------------------------------
                // CHECK WHETHER QUEUE IS COMPLETE
                // -----------------------------------------

                const queueFinished =
                    status.complete === true ||
                    (
                        pending === 0 &&
                        retryPending === 0 &&
                        sending === 0
                    );


                if (queueFinished) {

                    setProgress(100);


                    return {
                        total,
                        sent,
                        failed
                    };
                }


                // -----------------------------------------
                // WAIT BEFORE NEXT CHECK
                // -----------------------------------------

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            2000
                        )
                );

            } catch (error) {

                /*
                 * IMPORTANT:
                 *
                 * Do NOT stop the email process just
                 * because one status request failed.
                 *
                 * The Apps Script worker continues
                 * working in the background.
                 */

                console.error(
                    "Email queue status error:",
                    error
                );


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

        // -----------------------------------------
        // BASIC VALIDATION
        // -----------------------------------------

        if (!students || students.length === 0) {

            setResult({
                error:
                    "No students available."
            });

            return;
        }


        if (!className) {

            setResult({
                error:
                    "Class name is missing."
            });

            return;
        }


        if (!sessionId) {

            setResult({
                error:
                    "Attendance session is missing."
            });

            return;
        }


        try {

            // -----------------------------------------
            // RESET UI
            // -----------------------------------------

            setSending(true);

            setResult(null);

            setProgress(0);

            setPhase("generating");


            // ============================================
            // STEP 1 — GENERATE QR CODES
            // ============================================

            console.log(
                "Starting QR generation..."
            );


            const qrStudents =
                await generateQRCodes();


            console.log(
                `Generated ${qrStudents.length} QR codes.`
            );


            if (!qrStudents.length) {

                throw new Error(
                    "No QR codes could be generated."
                );
            }


            // Make sure generation reaches 100%
            setProgress(100);


            // ============================================
            // STEP 2 — CREATE EMAIL QUEUE
            // ============================================

            setPhase("sending");

            // Email progress starts from 0%
            setProgress(0);


            console.log(
                "Creating email queue..."
            );


            const queueResponse =
                await sendEmails({
                    className,
                    date,
                    sessionId,
                    students: qrStudents
                });


            console.log(
                "Email queue response:",
                queueResponse
            );


            if (
                !queueResponse ||
                queueResponse.status !== "success"
            ) {

                throw new Error(
                    queueResponse?.message ||
                    "Unable to create email queue."
                );
            }


            // ============================================
            // STEP 3 — MONITOR BACKGROUND EMAIL WORKER
            // ============================================

            console.log(
                "Email queue created. Monitoring..."
            );


            const finalResult =
                await monitorEmailQueue();


            // ============================================
            // STEP 4 — SHOW FINAL RESULT
            // ============================================

            setProgress(100);


            setResult({

                sent:
                    finalResult.sent,

                failed:
                    finalResult.failed,

                total:
                    finalResult.total
            });


            // ============================================
            // CALLBACK
            // ============================================

            if (onComplete) {
                onComplete();
            }

        } catch (error) {

            console.error(
                "QR dispatch error:",
                error
            );


            setResult({
                error:
                    error.message ||
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

            {/* =========================================
                DISPATCH HEADER
            ========================================= */}

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


            {/* =========================================
                PROGRESS
            ========================================= */}

            {sending && (

                <div className="progress-container">

                    <div className="progress-text">

                        <span>

                            {phase === "generating"
                                ? "Generating QR codes..."
                                : "Sending QR emails..."}

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


            {/* =========================================
                FINAL RESULT
            ========================================= */}

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
                            {" "}
                            {result.total}
                        </strong>

                    </p>


                    <p>

                        Sent:

                        <strong>
                            {" "}
                            {result.sent}
                        </strong>

                    </p>


                    <p>

                        Failed:

                        <strong>
                            {" "}
                            {result.failed}
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


            {/* =========================================
                ERROR
            ========================================= */}

            {result?.error && (

                <div className="error-message">

                    ⚠ {result.error}

                </div>

            )}

        </div>
    );
}