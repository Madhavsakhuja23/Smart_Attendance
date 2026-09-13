export default function Support() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Support & Contact</h1>
                <p className="subtitle">We're here to help you get the most out of Smart Attendance.</p>

                <section style={{ marginTop: "20px" }}>
                    <h2>Getting Assistance</h2>
                    <p>
                        If you encounter technical issues with class synchronization, Add-on pairing, or QR code dispatch, please check our <a href="/faq">FAQ section</a> first.
                    </p>
                </section>

                <section>
                    <h2>Contact Information</h2>
                    <div className="support-card" style={{ padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", marginTop: "15px" }}>
                        <p><strong>Support Email:</strong> msakhuja22@gmail.com </p>
                        <p><strong>Operating Hours:</strong> Monday – Friday, 9:00 AM – 6:00 PM (IST)</p>
                        <p><strong>Response Time:</strong> Within 24 business hours</p>
                    </div>
                </section>

                <section>
                    <h2>Common Troubleshooting Steps</h2>
                    <ul>
                        <li><strong>Add-on status says "Not Connected":</strong> Open your Google Sheet → Extension → Smart Attendance → Connect Smart Attendance, and generate a new 6-digit code on the website.</li>
                        <li><strong>Command Bridge Timeout:</strong> Make sure the Smart Attendance Add-on sidebar is open in your Google Sheet while scanning or dispatching emails.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
