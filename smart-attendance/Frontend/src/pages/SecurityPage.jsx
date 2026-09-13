export default function SecurityPage() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Security Overview</h1>
                <p className="last-updated">Last Updated: September 13, 2026</p>

                <section>
                    <h2>1. End-to-End Encryption</h2>
                    <p>
                        All communication between your browser, the backend server, and the Google Sheets Editor Add-on is encrypted using industry-standard TLS 1.3 (HTTPS).
                    </p>
                </section>

                <section>
                    <h2>2. Authentication & Rate Limiting</h2>
                    <ul>
                        <li><strong>JWT Auth:</strong> Web portal endpoints use JSON Web Tokens with strict signature verification.</li>
                        <li><strong>Cryptographic Pairing:</strong> Add-on pairing uses SHA-256 token hashing so plaintext connection keys are never saved in the database.</li>
                        <li><strong>Rate Limit Protection:</strong> Automated protection against brute-force login, registration, and pairing attempts using IP-based request throttlers.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. Data Minimization</h2>
                    <p>
                        Attendance records remain inside your institutional Google Spreadsheet. The backend processes transient attendance commands without retaining master spreadsheet copies.
                    </p>
                </section>
            </div>
        </div>
    );
}
