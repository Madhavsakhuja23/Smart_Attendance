export default function Cookies() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Cookie Policy</h1>
                <p className="last-updated">Last Updated: September 15, 2026</p>

                <section>
                    <h2>1. What Are Cookies & Local Storage</h2>
                    <p>
                        Cookies and browser web storage (such as <code>sessionStorage</code> and <code>localStorage</code>) are standard browser features used to store temporary state on your device while navigating web applications.
                    </p>
                </section>

                <section>
                    <h2>2. How We Use Browser Storage</h2>
                    <p>Smart Attendance System uses browser storage strictly for essential operational purposes:</p>
                    <ul>
                        <li><strong>Authentication Token (sessionStorage):</strong> Holds your active JWT session token to keep you logged in safely while browsing the platform.</li>
                        <li><strong>User Profile Cache:</strong> Temporarily caches basic teacher session status to prevent unnecessary network roundtrips.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. Third-Party Tracking & Advertising</h2>
                    <p>
                        We do <strong>NOT</strong> use third-party tracking cookies, Google Analytics, advertising network cookies, or cross-site behavioral tracking scripts. Our public pages (including Privacy Policy and Terms of Service) load freely without cookie consent banners or tracking scripts blocking page access.
                    </p>
                </section>

                <p style={{ marginTop: "30px", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    Smart Attendance System is an independent software application designed for integration with Google Sheets™.
                </p>
            </div>
        </div>
    );
}
