export default function FAQ() {
    const faqs = [
        {
            q: "How does Smart Attendance System work with Google Sheets™?",
            a: "Smart Attendance System uses a Google Sheets™ Editor Add-on that links your spreadsheet to our web platform. When you trigger attendance or fetch rosters from the web app, commands are passed to the Add-on running inside your Sheet."
        },
        {
            q: "Do I need to host a separate Google Apps Script Web App?",
            a: "No. The system uses our integrated Command Bridge architecture. You only install the Editor Add-on once and pair it using a 6-digit code."
        },
        {
            q: "How do students scan QR codes?",
            a: "Teachers can generate and email personalized QR codes to students directly from the portal. Students present their QR code to the teacher's device, which scans the QR code and instantly marks attendance."
        },
        {
            q: "What happens if an email fails during dispatch?",
            a: "The system automatically retries failed email dispatches up to 3 times. The progress bar displays real-time progress showing sent, failed, and pending emails."
        },
        {
            q: "Can I disconnect a Google Sheet from my account?",
            a: "Yes. Go to Account Settings in the web portal or use the Disconnect menu item in the Google Sheets™ Add-on."
        }
    ];

    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Frequently Asked Questions</h1>
                <p className="subtitle">Find quick answers to common questions about Smart Attendance System.</p>

                <div className="faq-list" style={{ marginTop: "25px" }}>
                    {faqs.map((faq, index) => (
                        <div key={index} className="faq-item" style={{ marginBottom: "20px", padding: "18px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <h3 style={{ marginBottom: "8px", fontSize: "1.1rem" }}>{faq.q}</h3>
                            <p style={{ color: "var(--text-secondary)", margin: 0 }}>{faq.a}</p>
                        </div>
                    ))}
                </div>

                <p style={{ marginTop: "30px", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    Google Sheets™ is a trademark of Google LLC. Smart Attendance System is an independent application.
                </p>
            </div>
        </div>
    );
}
