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
    const [queueStats, setQueueStats] = useState({ sent: 0, failed: 0, pending: 0, retrying: 0, total: 0 });
    const [result, setResult] = useState(null);

    // idle | generating | sending
    const [phase, setPhase] = useState("idle");


    // =====================================================
    // GENERATE ALL QR CODES
    // =====================================================

    async function generateQRCodes() {
        const qrStudents = new Array(students.length);
        let done = 0;

        const tasks = students.map((student, index) => async () => {
            const payload = JSON.stringify({
                className,
                rollNumber: student.roll,
                date,
                sessionId
            });

            const qr = await QRCode.toDataURL(payload, {
                width: 300,
                margin: 2,
                errorCorrectionLevel: "M"
            });

            qrStudents[index] = {
                roll: student.roll,
                name: student.name,
                email: student.email,
                qrBase64: qr
            };

            done++;
            const generationProgress = students.length > 0
                ? Math.round((done / students.length) * 100)
                : 100;

            setProgress(Math.min(100, generationProgress));
        });

        await runConcurrent(tasks, 5);
        return qrStudents.filter(Boolean);
    }


    // =====================================================
    // POLL EMAIL QUEUE STATUS
    // =====================================================

    async function monitorEmailQueue() {
        let total = students.length;

        while (true) {
            try {
                const status = await getEmailQueueStatus({ sessionId });

                const queueTotal = Number(status.total || 0);
                if (queueTotal > 0) {
                    total = queueTotal;
                }

                const sent = Number(status.sent || 0);
                const failed = Number(status.failed || 0);
                const pending = Number(status.pending || 0);
                const retryPending = Number(status.retryPending || 0);

                // Progress calculated strictly by successful emails sent
                const emailProgress = total > 0
                    ? Math.min(100, Math.round((sent / total) * 100))
                    : 0;

                setProgress(emailProgress);
                setQueueStats({ sent, failed, pending, retrying: retryPending, total });

                const queueFinished = status.complete === true ||
                    (pending === 0 && retryPending === 0 && Number(status.sending || 0) === 0);

                if (queueFinished) {
                    const finalProgress = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 100;
                    setProgress(finalProgress);

                    return {
                        total,
                        sent,
                        failed
                    };
                }

                await new Promise(resolve => setTimeout(resolve, 4000));

            } catch (error) {
                // Network glitch during status poll — try again in 5s
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }


    // =====================================================
    // MAIN DISPATCH
    // =====================================================

    async function handleDispatch() {
        if (!students || students.length === 0) {
            setResult({ error: "No students available." });
            return;
        }

        if (!className) {
            setResult({ error: "Class name is missing." });
            return;
        }

        if (!sessionId) {
            setResult({ error: "Attendance session is missing." });
            return;
        }

        try {
            setSending(true);
            setResult(null);
            setProgress(0);
            setPhase("generating");

            const qrStudents = await generateQRCodes();

            if (!qrStudents.length) {
                throw new Error("No QR codes could be generated.");
            }

            setProgress(100);

            // Create email queue
            setPhase("sending");
            setProgress(0);

            const queueResponse = await sendEmails({
                className,
                date,
                sessionId,
                students: qrStudents
            });

            if (!queueResponse || queueResponse.status !== "success") {
                throw new Error(queueResponse?.message || "Unable to create email queue.");
            }

            // Monitor worker
            const finalResult = await monitorEmailQueue();

            setResult({
                sent: finalResult.sent,
                failed: finalResult.failed,
                total: finalResult.total
            });

            if (onComplete) {
                onComplete();
            }

        } catch (error) {
            setResult({
                error: error.message || "Something went wrong."
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
            {/* Header */}
            <div className="dispatch-header">
                <div>
                    <h3>Send QR Codes</h3>
                    <p>
                        {students.length} students will receive personalized QR codes.
                    </p>
                </div>

                <button
                    onClick={handleDispatch}
                    disabled={sending}
                >
                    {sending ? "Sending..." : "Generate & Send"}
                </button>
            </div>

            {/* Progress */}
            {sending && (
                <div className="progress-container">
                    <div className="progress-text">
                        <span>
                            {phase === "generating"
                                ? "Generating QR codes..."
                                : "Sending QR emails via Google Add-on..."}
                        </span>
                        <span>{progress}%</span>
                    </div>

                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {phase === "sending" && (
                        <div className="queue-breakdown">
                            <span>Sent: <strong>{queueStats.sent}</strong> / {queueStats.total}</span>
                            <span>Failed: <strong>{queueStats.failed}</strong></span>
                            <span>Pending: <strong>{queueStats.pending}</strong></span>
                            {queueStats.retrying > 0 && <span>Retrying: <strong>{queueStats.retrying}</strong></span>}
                        </div>
                    )}
                </div>
            )}

            {/* Final Result */}
            {result && !result.error && (
                <div className="dispatch-result">
                    <h3>
                        {result.failed === 0
                            ? "✅ All QR emails sent successfully"
                            : "⚠ QR email sending completed with warnings"}
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "12px 0", fontSize: "0.88rem" }}>
                        <div>Total: <strong>{result.total}</strong></div>
                        <div style={{ color: "var(--green-text)" }}>Sent: <strong>{result.sent}</strong></div>
                        <div style={{ color: result.failed > 0 ? "var(--rose-text)" : "var(--text-muted)" }}>Failed: <strong>{result.failed}</strong></div>
                    </div>

                    {result.failed > 0 && (
                        <p style={{ fontSize: "0.84rem", color: "var(--rose-text)", marginTop: "6px" }}>
                            Some emails could not be delivered after automatic retry attempts.
                        </p>
                    )}
                </div>
            )}

            {/* Error */}
            {result?.error && (
                <div className="error-message">
                    ⚠ {result.error}
                </div>
            )}
        </div>
    );
}