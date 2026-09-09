import { useState } from "react";
import QRCode from "qrcode";
import { sendEmails } from "../services/api";

async function runConcurrent(tasks, limit) {
  const results = [];
  let i = 0;
  async function run() { while (i < tasks.length) { const idx = i++; results[idx] = await tasks[idx](); } }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => run()));
  return results;
}

export default function QRGenerator({ students, className, date, sessionId, onComplete }) {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  async function generateQRCodes() {
    const qrStudents = new Array(students.length);
    let done = 0;

    const tasks = students.map((s, i) => async () => {
      const payload = JSON.stringify({ className, rollNumber: s.roll, date, sessionId });
      const qr = await QRCode.toDataURL(payload, { width: 500, margin: 3, errorCorrectionLevel: "H" });
      qrStudents[i] = { roll: s.roll, name: s.name, email: s.email, qrBase64: qr };
      setProgress(Math.round((++done / students.length) * 50));
    });

    await runConcurrent(tasks, 5);
    return qrStudents.filter(Boolean);
  }

  async function handleDispatch() {
    try {
      setSending(true); setResult(null); setProgress(0);
      const qrStudents = await generateQRCodes();
      setProgress(55);

      const BATCH = 10;
      let sent = 0, failed = 0;
      const allResults = [];

      for (let i = 0; i < qrStudents.length; i += BATCH) {
        const batch = qrStudents.slice(i, i + BATCH);
        const res = await sendEmails({ className, date, sessionId, students: batch });
        sent += res.sentCount; failed += res.failedCount;
        allResults.push(...(res.results || []));
        setProgress(55 + Math.round((Math.min(i + batch.length, qrStudents.length) / qrStudents.length) * 45));
      }

      setResult({ sent, failed, results: allResults });
      if (onComplete) onComplete();
    } catch (e) { setResult({ error: e.message }); }
    finally { setSending(false); }
  }

  return (
    <div>
      <div className="dispatch-header">
        <div>
          <h3>Send QR Codes</h3>
          <p>{students.length} students will receive personalized QR codes</p>
        </div>
        <button onClick={handleDispatch} disabled={sending}>
          {sending ? "Sending..." : "Generate & Send"}
        </button>
      </div>

      {sending && (
        <div className="progress-container">
          <div className="progress-text"><span>Processing...</span><span>{progress}%</span></div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      {result && !result.error && (
        <div className="dispatch-result">
          <h3>✅ Done</h3>
          <p>Sent: <strong>{result.sent}</strong></p>
          <p>Failed: <strong>{result.failed}</strong></p>
          {result.failed > 0 && (
            <details>
              <summary>View failures</summary>
              {result.results.filter(r => !r.success).map(r => (
                <p key={r.roll}>Roll {r.roll}: {r.message}</p>
              ))}
            </details>
          )}
        </div>
      )}

      {result?.error && <div className="error-message">⚠ {result.error}</div>}
    </div>
  );
}