export default function GoogleSheets() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Google Sheets Editor Add-on</h1>
                <p className="subtitle">Learn how Smart Attendance pairs with your Google Spreadsheets.</p>

                <section style={{ marginTop: "25px" }}>
                    <h2>How the Add-on Works</h2>
                    <p>
                        The Smart Attendance Google Sheets Add-on acts as a background command listener. Once paired with your account, it polls pending commands (such as fetching student lists or recording present students) and executes them directly inside your Google Sheet.
                    </p>
                </section>

                <section>
                    <h2>Setup Instructions</h2>
                    <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                        <li>Open your Google Spreadsheet containing class rosters (each tab named after a class).</li>
                        <li>Go to <strong>Extensions → Smart Attendance → Connect Smart Attendance</strong>.</li>
                        <li>Log into your account on the Smart Attendance Web App and navigate to Setup.</li>
                        <li>Click <strong>Generate Pairing Code</strong> and enter the 6-digit code inside the Google Sheets Add-on sidebar.</li>
                        <li>Click <strong>Pair Add-on</strong>. Your spreadsheet is now linked!</li>
                    </ol>
                </section>

                <section>
                    <h2>Spreadsheet Structure</h2>
                    <p>Each sheet tab should represent a class with column headers: <strong>Roll No</strong>, <strong>Name</strong>, <strong>Email</strong>.</p>
                </section>
            </div>
        </div>
    );
}
