export default function SecurityPage() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Security Overview</h1>
                <p className="last-updated">Last Updated: September 15, 2026</p>

                <section>
                    <h2>1. Transport Encryption (TLS 1.3)</h2>
                    <p>
                        All communication between your browser, our backend API server, and the Smart Attendance System Google Sheets™ Add-on is encrypted using industry-standard TLS 1.3 / HTTPS.
                    </p>
                </section>

                <section>
                    <h2>2. Authentication & Rate Limiting</h2>
                    <ul>
                        <li><strong>JWT Auth:</strong> Web portal endpoints use JSON Web Tokens (JWT) with strict signature verification.</li>
                        <li><strong>Cryptographic Pairing:</strong> Add-on pairing uses salted SHA-256 token hashing so plaintext connection keys are never stored in the database.</li>
                        <li><strong>Rate Limit Protection:</strong> Automated protection against brute-force login, registration, and pairing attempts using IP-based request throttlers.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. Data Minimization & Transient Storage</h2>
                    <p>
                        Master attendance records remain inside your institutional Google Spreadsheet. Our backend processes transient command payloads (such as student roster queries and attendance status marks) without retaining permanent spreadsheet copies. Transient command records automatically self-delete after 24 hours.
                    </p>
                </section>

                <p style={{ marginTop: "30px", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    Google Sheets™ is a trademark of Google LLC. Smart Attendance System is an independent software application.
                </p>
            </div>
        </div>
    );
}
