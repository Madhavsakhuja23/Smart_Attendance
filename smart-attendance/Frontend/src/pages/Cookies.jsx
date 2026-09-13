export default function Cookies() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Cookie Policy</h1>
                <p className="last-updated">Last Updated: September 13, 2026</p>

                <section>
                    <h2>1. What Are Cookies</h2>
                    <p>
                        Cookies and local browser storage (sessionStorage / localStorage) are small data units stored on your device when you visit web applications.
                    </p>
                </section>

                <section>
                    <h2>2. How We Use Cookies & Local Storage</h2>
                    <p>Smart Attendance uses local storage strictly for essential operational purposes:</p>
                    <ul>
                        <li><strong>Authentication Token (sessionStorage):</strong> Holds your active JWT session token to keep you logged in safely while browsing the platform.</li>
                        <li><strong>User Profile Cache:</strong> Temporarily remembers basic user information to avoid unnecessary network roundtrips.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. Third-Party Tracking</h2>
                    <p>
                        We do NOT use third-party tracking cookies, advertising cookies, or cross-site tracking technologies.
                    </p>
                </section>
            </div>
        </div>
    );
}
