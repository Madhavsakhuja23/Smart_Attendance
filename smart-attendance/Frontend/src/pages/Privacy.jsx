export default function Privacy() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Privacy Policy</h1>
                <p className="last-updated">Last Updated: September 13, 2026</p>

                <section>
                    <h2>1. Overview</h2>
                    <p>
                        Smart Attendance ("we", "our", or "us") respects your privacy and is committed to protecting the personal data of educators and students using our platform. This Privacy Policy explains how we collect, use, and safeguard information when you access our web application and Google Sheets Editor Add-on.
                    </p>
                </section>

                <section>
                    <h2>2. Information We Collect</h2>
                    <ul>
                        <li><strong>Account Information:</strong> Name, work email address, and teacher ID provided during registration.</li>
                        <li><strong>Class & Attendance Data:</strong> Class names, student rosters (name, roll number, student email), and attendance records stored within your connected Google Sheets.</li>
                        <li><strong>Technical Data:</strong> IP addresses, browser types, and access timestamps strictly for system security, rate limiting, and debugging.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. How We Use Information</h2>
                    <p>We use the collected information exclusively to:</p>
                    <ul>
                        <li>Synchronize class rosters and attendance data between your Google Sheet and web portal.</li>
                        <li>Dispatch personalized attendance QR codes to student email addresses upon teacher request.</li>
                        <li>Maintain system security, enforce rate limits, and prevent unauthorized access.</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Data Storage & Google Workspace Integration</h2>
                    <p>
                        Smart Attendance does NOT store student attendance histories permanently on our web servers. Attendance master records reside securely inside your own Google Spreadsheet. Our backend acts as a real-time secure command bridge to read and update your spreadsheet strictly when authorized.
                    </p>
                </section>

                <section>
                    <h2>5. Data Protection & Sharing</h2>
                    <p>
                        We do NOT sell, rent, or trade personal data to third parties. Data is transmitted securely over TLS/HTTPS encryption at all times.
                    </p>
                </section>

                <section>
                    <h2>6. Contact Us</h2>
                    <p>
                        If you have questions regarding this Privacy Policy, please contact us via our <a href="/support">Support Page</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
