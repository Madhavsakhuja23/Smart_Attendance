import { Link } from "react-router-dom";

export default function Support() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Support & Contact</h1>
                <p className="subtitle">We're here to help you get the most out of Smart Attendance System.</p>

                <section style={{ marginTop: "20px" }}>
                    <h2>Getting Assistance</h2>
                    <p>
                        If you encounter technical issues with class synchronization, Add-on pairing, or QR code dispatch, please check our <Link to="/faq">FAQ section</Link> first.
                    </p>
                </section>

                <section>
                    <h2>Contact Information</h2>
                    <div className="support-card" style={{ padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", marginTop: "15px" }}>
                        <p style={{ marginBottom: "8px" }}><strong>Developer Support Email:</strong> msakhuja22@gmail.com</p>
                        <p style={{ marginBottom: "8px" }}><strong>Operating Hours:</strong> Monday – Friday, 9:00 AM – 6:00 PM (IST)</p>
                        <p style={{ margin: 0 }}><strong>Response Time:</strong> Within 24 business hours</p>
                    </div>
                </section>

                <section>
                    <h2>Common Troubleshooting Steps</h2>
                    <ul style={{ lineHeight: "1.8" }}>
                        <li><strong>Add-on status says "Not Connected":</strong> Open your Google Sheet → Extensions → Smart Attendance → Connect Smart Attendance, and generate a new 6-digit code on the website.</li>
                        <li><strong>Command Bridge Timeout:</strong> Make sure the Smart Attendance System Add-on sidebar is open in your Google Sheet while scanning or dispatching emails.</li>
                    </ul>
                </section>

                <p style={{ marginTop: "30px", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    Google Sheets™ is a trademark of Google LLC. Smart Attendance System is an independent application.
                </p>
            </div>
        </div>
    );
}
