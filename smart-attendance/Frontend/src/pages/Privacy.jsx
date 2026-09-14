import { Link } from "react-router-dom";

export default function Privacy() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Privacy Policy</h1>
                <p className="last-updated">Last Updated: September 15, 2026</p>

                <section>
                    <h2>1. Overview & Service Scope</h2>
                    <p>
                        Smart Attendance System ("we", "our", or "us") provides an integrated web platform 
                        (accessible at <strong>https://www.smartattendancesystem.in/</strong>) and a Google Sheets™ Editor 
                        Add-on designed to assist teachers, educators, and educational institutions with real-time class 
                        attendance tracking, QR code verification, student email notifications, and automated roster synchronization.
                    </p>
                    <p>
                        This Privacy Policy applies to all services offered by Smart Attendance System, including our web portal 
                        and our Google Sheets™ Add-on. By creating an account or using our Add-on, you agree to the collection 
                        and use of information in accordance with this policy.
                    </p>
                </section>

                <section>
                    <h2>2. Information We Collect</h2>
                    <p>We collect and process only the information strictly necessary to operate our attendance management system:</p>
                    <ul>
                        <li>
                            <strong>Teacher Account Information:</strong> Name, educational work email address, teacher ID, and securely 
                            hashed passwords (hashed using bcrypt) provided when you register an account on our web application.
                        </li>
                        <li>
                            <strong>Google Account Connection Data:</strong> When you pair your Google Sheet using our Google Sheets™ Add-on, 
                            we store metadata required to maintain the pairing connection, including your connected Google account email 
                            (<code>googleEmail</code>), spreadsheet ID (<code>connectedSpreadsheetId</code>), spreadsheet title 
                            (<code>connectedSpreadsheetName</code>), paired class names (<code>connectedClasses</code>), and salted SHA-256 pairing token hashes.
                        </li>
                        <li>
                            <strong>Google Sheets Content (Class Rosters & Attendance Logs):</strong> Student roster details (student name, roll number, 
                            and student email address) and attendance session records contained within your authorized Google Sheet tabs are accessed 
                            transiently to generate QR codes, display active class rosters in your session dashboard, and record present/absent statuses.
                        </li>
                        <li>
                            <strong>Technical & Security Data:</strong> IP addresses, browser user-agent strings, request timestamps, and system logs 
                            collected strictly for security monitoring, rate limiting, and server operational debugging.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>3. Google User Data Access & Usage</h2>
                    <p>
                        Smart Attendance System requests user authorization to access Google Spreadsheets connected via our Google Sheets™ Add-on. 
                        Our application accesses Google user data strictly to fulfill attendance management features requested by the teacher:
                    </p>
                    <ul>
                        <li>
                            <strong>Data Accessed:</strong> Authorized Google Spreadsheet IDs, sheet tab names (representing classes), student roster rows 
                            (roll numbers, names, emails), and attendance columns.
                        </li>
                        <li>
                            <strong>Why & How It Is Used:</strong> Roster data is read to display class lists during active sessions and to generate personalized 
                            student QR codes. Attendance marks (Present / Absent / Pending) are written directly into your spreadsheet tabs when roll call is taken or finalized.
                        </li>
                        <li>
                            <strong>Storage & Processing:</strong> Master student rosters and historical attendance logs reside permanently inside your own Google Spreadsheet 
                            under your Google Account control. Transient command payloads (such as fetching student lists or recording present status) are transmitted over encrypted TLS/HTTPS 
                            and queued in our backend database using temporary command objects. These transient commands automatically self-delete after 24 hours via database TTL (Time-To-Live) indexes.
                        </li>
                        <li>
                            <strong>No Third-Party Transfer or Advertising:</strong> Google user data accessed by Smart Attendance System is <strong>NEVER sold, rented, leased, 
                            transferred to third parties, or used for commercial advertising or marketing profiling</strong> under any circumstances.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>4. Google API Services User Data Policy Compliance (Limited Use)</h2>
                    <p style={{ background: "rgba(13, 148, 136, 0.1)", borderLeft: "4px solid var(--primary)", padding: "14px 18px", borderRadius: "6px" }}>
                        Smart Attendance System's use and transfer of information received from Google APIs to any other app will adhere to the{" "}
                        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "var(--primary-hover)" }}>
                            Google API Services User Data Policy
                        </a>, including the Limited Use requirements.
                    </p>
                </section>

                <section>
                    <h2>5. Data Storage, Retention & Deletion</h2>
                    <ul>
                        <li>
                            <strong>Master Data Residency:</strong> Your student attendance records and class rosters reside inside your own Google Spreadsheet. 
                            Smart Attendance System does NOT store permanent copies of your student rosters or attendance logs on our web servers.
                        </li>
                        <li>
                            <strong>Account Metadata Retention:</strong> Teacher account details and connected spreadsheet metadata are retained in our secure server database 
                            only while your account remains active.
                        </li>
                        <li>
                            <strong>Disconnecting Google Sheets:</strong> You can disconnect your Google Sheet at any time via your <Link to="/settings">Account Settings</Link> page 
                            or through the Google Sheets™ Add-on sidebar menu. Disconnecting immediately invalidates connection tokens and clears spreadsheet pairing metadata from active server records.
                        </li>
                        <li>
                            <strong>Account Deletion Requests:</strong> You may request full deletion of your teacher account and all associated server metadata by contacting our 
                            developer support team at <strong>msakhuja22@gmail.com</strong>. Account deletion requests are processed within 30 days.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>6. Data Sharing & Third-Party Services</h2>
                    <p>
                        We do not sell, rent, trade, or share personal data or Google user data with any third-party advertisers, data brokers, or marketing partners. 
                        Data is processed solely to operate the Smart Attendance System features. Encrypted web traffic is hosted on secure cloud infrastructure providers 
                        strictly to serve backend APIs and web assets.
                    </p>
                </section>

                <section>
                    <h2>7. Security Practices</h2>
                    <p>
                        We employ administrative, technical, and physical safeguards to protect user data:
                    </p>
                    <ul>
                        <li><strong>TLS 1.3 / HTTPS Encryption:</strong> All data in transit between your browser, backend servers, and the Google Sheets™ Add-on is encrypted.</li>
                        <li><strong>Bcrypt & SHA-256 Hashing:</strong> User passwords are hashed with bcrypt. Connection keys and pairing tokens are hashed using salted SHA-256.</li>
                        <li><strong>JWT Authentication:</strong> API access is secured via state-of-the-art JSON Web Tokens (JWT) validated on every request.</li>
                    </ul>
                </section>

                <section>
                    <h2>8. User Rights</h2>
                    <p>
                        You have the right to inspect your stored teacher profile information, update account details, disconnect Google Sheets authorization, or request permanent 
                        deletion of your account. For assistance, contact <strong>msakhuja22@gmail.com</strong> or visit our <Link to="/support">Support Page</Link>.
                    </p>
                </section>

                <section>
                    <h2>9. Contact Us</h2>
                    <p>
                        If you have any privacy questions, feedback, or data requests concerning this Privacy Policy, please contact our developer support team:
                    </p>
                    <p>
                        <strong>Email:</strong> msakhuja22@gmail.com<br />
                        <strong>Support Portal:</strong> <Link to="/support">https://www.smartattendancesystem.in/support</Link>
                    </p>
                </section>

                <p style={{ marginTop: "30px", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    Google Sheets™ and Google Workspace™ are trademarks of Google LLC. Smart Attendance System is an independent software application designed for use with Google Sheets™.
                </p>
            </div>
        </div>
    );
}
