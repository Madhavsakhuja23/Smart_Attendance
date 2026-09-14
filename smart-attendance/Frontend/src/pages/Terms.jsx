import { Link } from "react-router-dom";

export default function Terms() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Terms of Service</h1>
                <p className="last-updated">Last Updated: September 15, 2026</p>

                <section>
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing, registering for, or using the Smart Attendance System web platform 
                        (located at <strong>https://www.smartattendancesystem.in/</strong>) or our Google Sheets™ Editor Add-on, 
                        you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not access or use our services.
                    </p>
                </section>

                <section>
                    <h2>2. Description of Service</h2>
                    <p>
                        Smart Attendance System provides educators, teachers, and educational institutions with digital class attendance 
                        management tools, including QR code attendance verification, automated student email notifications, and real-time 
                        synchronization with Google Sheets™.
                    </p>
                </section>

                <section>
                    <h2>3. Permitted Use & User Responsibilities</h2>
                    <ul>
                        <li><strong>Authorized Use:</strong> The service is provided strictly for educational attendance management, classroom roll calls, and institutional roster handling.</li>
                        <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials, password, and pairing tokens.</li>
                        <li><strong>Data Accuracy & Compliance:</strong> You are responsible for ensuring that student roster data entered into your connected Google Spreadsheet complies with your institution's student privacy and data protection policies.</li>
                        <li><strong>Prohibited Conduct:</strong> You may not attempt to reverse engineer, probe, scan, bypass security measures, exploit rate limits, or perform unauthorized data scraping against our web platform or API endpoints.</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Google Sheets™ & Google Workspace™ Integration</h2>
                    <p>
                        Smart Attendance System is an independent software application designed to integrate with Google Sheets™. 
                        When you connect your Google Sheet using our Google Sheets™ Add-on, you operate under Google Workspace terms of service. 
                        You are responsible for maintaining valid authorizations for the Google Spreadsheets linked to your account.
                    </p>
                </section>

                <section>
                    <h2>5. Intellectual Property Rights</h2>
                    <p>
                        All software, web interface designs, graphic assets, trademarks, branding, and documentation associated with 
                        Smart Attendance System are the property of the application developer. 
                    </p>
                    <p>
                        Google Sheets™ and Google Workspace™ are trademarks of Google LLC. Use of these trademark terms indicates compatibility 
                        and does not imply endorsement, sponsorship, or certification by Google LLC.
                    </p>
                </section>

                <section>
                    <h2>6. Disclaimers & Limitation of Liability</h2>
                    <p>
                        Smart Attendance System is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express 
                        or implied. Master attendance records reside inside your own Google Spreadsheet. We are not liable for loss of spreadsheet 
                        data resulting from manual modifications, spreadsheet deletions, or external edits performed outside of our official software interface.
                    </p>
                </section>

                <section>
                    <h2>7. Disconnection & Account Termination</h2>
                    <p>
                        You may stop using Smart Attendance System or disconnect your Google Sheet at any time via your <Link to="/settings">Account Settings</Link> page. 
                        We reserve the right to suspend or terminate accounts that violate these Terms of Service or engage in abusive or harmful activity against our infrastructure.
                    </p>
                </section>

                <section>
                    <h2>8. Contact Information</h2>
                    <p>
                        For inquiries or notices regarding these Terms of Service, please contact our developer support team:
                    </p>
                    <p>
                        <strong>Email:</strong> msakhuja22@gmail.com<br />
                        <strong>Support Portal:</strong> <Link to="/support">https://www.smartattendancesystem.in/support</Link>
                    </p>
                </section>

                <p style={{ marginTop: "30px", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    Google Sheets™ and Google Workspace™ are trademarks of Google LLC. Smart Attendance System is an independent application.
                </p>
            </div>
        </div>
    );
}
