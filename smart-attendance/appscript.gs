/***************************************************************
 * SMART ATTENDANCE - GOOGLE SHEETS EDITOR ADD-ON
 *
 * This file replaces the old Apps Script Web App logic.
 *
 * OLD:
 * React → Backend → Apps Script Web App
 *
 * NEW:
 * React → Backend → Add-on command bridge
 *                         ↓
 *                    Google Sheet
 *
 * The actual spreadsheet operations are performed here.
 ***************************************************************/


/**
 * =========================================================
 * CONFIGURATION
 * =========================================================
 */

const CONFIG = {
  DATE_FORMAT: "dd/MM/yyyy",

  DETECTION_SCAN_ROWS: 20,

  SESSION_HOURS: 12
};


/**
 * =========================================================
 * EMAIL QUEUE CONFIGURATION
 * =========================================================
 */

const EMAIL_QUEUE = {
  SHEET_NAME: "_SMART_ATTENDANCE_EMAIL_QUEUE",

  BATCH_SIZE: 150,

  SAFE_RUNTIME_MS: 4 * 60 * 1000,

  MAX_RETRY_ATTEMPTS: 3,

  WORKER_INTERVAL_HOURS: 1,

  STALE_SENDING_MS: 10 * 60 * 1000
};


/**
 * =========================================================
 * ADD-ON MENU
 * =========================================================
 */

function onInstall(e) {
  onOpen(e);
}


function onOpen(e) {

  const ui =
    SpreadsheetApp.getUi();

  ui.createAddonMenu()

    .addItem(
      "Open Smart Attendance",
      "openSmartAttendance"
    )

    .addSeparator()
    .addItem(
  "Connect Smart Attendance",
  "pairWithSmartAttendance"
)
    .addItem(
      "Check Connection",
      "showConnectionStatus"
    )

    .addItem(
      "Sync Classes",
      "syncClasses"
    )

    .addSeparator()

    .addItem(
      "Test Get Classes",
      "testGetClasses"
    )

    .addItem(
      "Test Fetch Students",
      "testFetchStudents"
    )

    .addItem("Test Create Session", "testCreateSession")
.addItem("Test Verify and Mark Present", "testVerifyAndMarkPresent")
.addItem("Test Attendance Status", "testAttendanceStatus")
.addItem("Test Finalize Day", "testFinalizeDay")
.addItem(
  "Test Command Bridge",
  "testCommandBridge"
)

    .addSeparator()

    .addItem(
      "Disconnect Smart Attendance",
      "disconnectAddon"
    )

    .addItem(
      "About Smart Attendance",
      "showAbout"
    )

    .addToUi();
}


/**
 * =========================================================
 * OPEN ADD-ON
 * =========================================================
 */

function openSmartAttendance() {

  const html =
    HtmlService
      .createHtmlOutput(
        getSmartAttendanceSidebarHtml()
      )
      .setTitle(
        "Smart Attendance"
      );

  SpreadsheetApp
    .getUi()
    .showSidebar(html);
}


/**
 * =========================================================
 * SIMPLE SIDEBAR
 *
 * This is intentionally lightweight for now.
 * The React website remains the main teacher dashboard.
 * Later the sidebar can become the command executor.
 * =========================================================
 */

function getSmartAttendanceSidebarHtml() {

  const connection =
    getStoredConnection();

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const connected =
    !!connection.connectionToken;

  return `
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<style>

body {
  font-family: Arial, sans-serif;
  padding: 16px;
  color: #202124;
}

h2 {
  margin-top: 0;
}

.card {
  border: 1px solid #dadce0;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}

.label {
  font-size: 12px;
  color: #5f6368;
  margin-bottom: 4px;
}

.value {
  font-weight: 600;
  word-break: break-word;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 8px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-weight: 600;
}

.primary {
  background: #1a73e8;
  color: white;
}

.secondary {
  background: #f1f3f4;
  color: #202124;
}

.success {
  color: #188038;
}

.error {
  color: #d93025;
}

</style>

</head>

<body>

<h2>Smart Attendance</h2>

<div class="card">

<div class="label">
Google Account
</div>

<div class="value">
${escapeHtml(
  getGoogleEmail()
)}
</div>

</div>


<div class="card">

<div class="label">
Spreadsheet
</div>

<div class="value">
${escapeHtml(
  spreadsheet.getName()
)}
</div>

<div style="margin-top:6px;font-size:11px;color:#5f6368;">
${escapeHtml(
  spreadsheet.getId()
)}
</div>

</div>


<div class="card">

<div class="label">
Connection
</div>

<div class="value ${
  connected
    ? "success"
    : "error"
}">

${
  connected
    ? "Connected"
    : "Not Connected"
}

</div>

</div>


<button
  class="primary"
  onclick="google.script.run
    .withSuccessHandler(showResult)
    .withFailureHandler(showError)
    .showConnectionStatus()"
>
Check Connection
</button>


<button
  class="secondary"
  onclick="google.script.run
    .withSuccessHandler(showResult)
    .withFailureHandler(showError)
    .syncClasses()"
>
Sync Classes
</button>

<div
  class="card"
  style="margin-top:12px;"
>
  <div class="label">
    Command Listener
  </div>

  <div
    id="commandStatus"
    class="value"
  >
    Starting...
  </div>
</div>

<div
  id="result"
  style="margin-top:15px;font-size:13px;"
></div>


<script>

function showResult(result) {

  document.getElementById("result")
    .innerHTML =
      "<pre style='white-space:pre-wrap;'>" +
      escapeHtml(
        typeof result === "string"
          ? result
          : JSON.stringify(result, null, 2)
      ) +
      "</pre>";
}


function showError(error) {

  document.getElementById("result")
    .innerHTML =
      "<div class='error'>" +
      escapeHtml(
        error.message || String(error)
      ) +
      "</div>";
}


function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
let commandBusy = false;


/**
 * Ask Apps Script to check the backend
 * for a new attendance command.
 */
function pollCommandBridge() {

  if (commandBusy) {
    return;
  }

  commandBusy = true;

  document.getElementById(
    "commandStatus"
  ).innerText =
    "Checking for commands...";


  google.script.run

    .withSuccessHandler(
      function(response) {

        commandBusy = false;

        handleCommandResponse(
          response
        );
      }
    )

    .withFailureHandler(
      function(error) {

        commandBusy = false;

        document.getElementById(
          "commandStatus"
        ).innerText =
          "Listener error";

        showError(error);
      }
    )

    .pollAndExecuteCommand();
}


/**
 * Display command listener status.
 */
function handleCommandResponse(
  response
) {

  const status =
    document.getElementById(
      "commandStatus"
    );


  if (
    !response
  ) {

    status.innerText =
      "No response.";

    return;
  }


  if (
    response.status === "error"
  ) {

    status.innerText =
      response.message ||
      "Command bridge error.";

    return;
  }


  if (
    response.processed === false
  ) {

    status.innerText =
      "Connected • Waiting for commands";

    return;
  }


  if (
    response.processed === true
  ) {

    status.innerText =
      "Executed: " +
      (
        response.commandType ||
        "command"
      );


    if (
      response.result
    ) {

      showResult(
        response.result
      );
    }

    return;
  }


  status.innerText =
    "Connected";
}


/**
 * Start polling.
 *
 * 3 seconds is enough for the active
 * attendance sidebar.
 */
pollCommandBridge();

setInterval(
  pollCommandBridge,
  3000
);
</script>

</body>
</html>
`;
}


/**
 * =========================================================
 * GOOGLE ACCOUNT
 * =========================================================
 */

function getGoogleEmail() {

  const email =
    Session
      .getActiveUser()
      .getEmail();

  return email || "Unknown";
}


/**
 * =========================================================
 * CONNECTION STORAGE
 *
 * The connection token is stored locally in UserProperties.
 *
 * IMPORTANT:
 * Never store the teacher JWT here.
 * The Add-on uses its own connection token.
 * =========================================================
 */

function getStoredConnection() {

  const properties =
    PropertiesService
      .getUserProperties();

  return {
    connectionToken:
      properties.getProperty(
        "SMART_ATTENDANCE_CONNECTION_TOKEN"
      ) || "",

    teacherId:
      properties.getProperty(
        "SMART_ATTENDANCE_TEACHER_ID"
      ) || "",

    googleEmail:
      properties.getProperty(
        "SMART_ATTENDANCE_GOOGLE_EMAIL"
      ) || "",

    spreadsheetId:
      properties.getProperty(
        "SMART_ATTENDANCE_SPREADSHEET_ID"
      ) || "",

    spreadsheetName:
      properties.getProperty(
        "SMART_ATTENDANCE_SPREADSHEET_NAME"
      ) || ""
  };
}


/**
 * =========================================================
 * SAVE CONNECTION
 * =========================================================
 */

function saveConnection(connection) {

  const properties =
    PropertiesService
      .getUserProperties();

  properties.setProperties({

    SMART_ATTENDANCE_CONNECTION_TOKEN:
      String(
        connection.connectionToken || ""
      ),

    SMART_ATTENDANCE_TEACHER_ID:
      String(
        connection.teacherId || ""
      ),

    SMART_ATTENDANCE_GOOGLE_EMAIL:
      String(
        connection.googleEmail || ""
      ),

    SMART_ATTENDANCE_SPREADSHEET_ID:
      String(
        connection.spreadsheetId || ""
      ),

    SMART_ATTENDANCE_SPREADSHEET_NAME:
      String(
        connection.spreadsheetName || ""
      )
  });
}


/**
 * =========================================================
 * CLEAR CONNECTION
 * =========================================================
 */

function clearConnection() {

  PropertiesService
    .getUserProperties()
    .deleteAllProperties();
}


/**
 * =========================================================
 * DISCONNECT
 * =========================================================
 */

function disconnectAddon() {
  const ui = SpreadsheetApp.getUi();

  const result = ui.alert(
    "Disconnect Smart Attendance",
    "Are you sure you want to disconnect this spreadsheet from Smart Attendance?",
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) {
    return;
  }

  const connection = getStoredConnection();

  if (!connection || !connection.connectionToken) {
    clearConnection();

    ui.alert(
      "Smart Attendance",
      "This spreadsheet is already disconnected.",
      ui.ButtonSet.OK
    );

    return;
  }

  const response = backendRequest(
    BACKEND_CONFIG.DISCONNECT_ENDPOINT,
    "POST",
    {},
    true
  );

  if (!response || response.status !== "success") {
    const message =
      response && response.message
        ? response.message
        : "Failed to disconnect from the backend.";

    ui.alert(
      "Disconnect Failed",
      message,
      ui.ButtonSet.OK
    );

    return;
  }

  // Backend successfully disconnected.
  // Now clear the local Add-on connection.
  clearConnection();

  ui.alert(
    "Smart Attendance",
    "This spreadsheet has been disconnected successfully.",
    ui.ButtonSet.OK
  );
}


/**
 * =========================================================
 * CONNECTION STATUS
 * =========================================================
 */

function showConnectionStatus() {

  const connection =
    getStoredConnection();

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const email =
    getGoogleEmail();

  const message =
    connection.connectionToken

      ? "Connection verified successfully!\n\n" +
        "Teacher ID: " +
        connection.teacherId +
        "\n" +
        "Google Account: " +
        email +
        "\n" +
        "Spreadsheet Name: " +
        spreadsheet.getName() +
        "\n" +
        "Spreadsheet ID: " +
        spreadsheet.getId()

      : "This spreadsheet is not connected to Smart Attendance.";

  SpreadsheetApp
    .getUi()
    .alert(
      "Smart Attendance - Connection",
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  return message;
}


/**
 * =========================================================
 * PAIRING
 *
 * The website generates the pairing code.
 *
 * The teacher enters that code here.
 *
 * Backend endpoint:
 *
 * POST
 * /api/teacher/addon/pair
 *
 * Body:
 * {
 *   pairingCode,
 *   googleEmail,
 *   spreadsheetId,
 *   spreadsheetName
 * }
 *
 * =========================================================
 */

function pairWithSmartAttendance() {

  const ui =
    SpreadsheetApp.getUi();

  const response =
    ui.prompt(
      "Connect Smart Attendance",
      "Enter the pairing code shown on the Smart Attendance website.",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    response.getSelectedButton() !==
    ui.Button.OK
  ) {
    return;
  }

  const pairingCode =
    String(
      response.getResponseText() || ""
    ).trim();

  if (!pairingCode) {

    ui.alert(
      "Smart Attendance",
      "Pairing code is required.",
      ui.ButtonSet.OK
    );

    return;
  }

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const googleEmail =
    getGoogleEmail();

  const payload = {

    pairingCode:
      pairingCode,

    googleEmail:
      googleEmail,

    spreadsheetId:
      spreadsheet.getId(),

    spreadsheetName:
      spreadsheet.getName()
  };

  const result =
    backendRequest(
      "/api/teacher/addon/pair",
      "POST",
      payload,
      false
    );

  if (
    result.status !==
    "success"
  ) {

    ui.alert(
      "Smart Attendance",
      result.message ||
        "Unable to connect this spreadsheet.",
      ui.ButtonSet.OK
    );

    return result;
  }

  saveConnection({

    connectionToken:
      result.connectionToken,

    teacherId:
      result.teacher &&
      result.teacher.teacherId,

    googleEmail:
      googleEmail,

    spreadsheetId:
      spreadsheet.getId(),

    spreadsheetName:
      spreadsheet.getName()
  });

  ui.alert(
    "Smart Attendance",
    "Google Sheet connected successfully!\n\n" +
    "Teacher ID: " +
    (result.teacher &&
      result.teacher.teacherId) +
    "\n" +
    "Google Account: " +
    googleEmail +
    "\n" +
    "Spreadsheet: " +
    spreadsheet.getName(),
    ui.ButtonSet.OK
  );

  return result;
}


/**
 * =========================================================
 * SYNC CLASSES
 *
 * Reads the actual spreadsheet tabs and returns them.
 *
 * The backend will store these in MongoDB.
 * =========================================================
 */

function syncClasses() {
  const result = executeGetClasses();

  if (result.status !== "success") {
    return result;
  }

  const connection = getStoredConnection();

  if (!connection || !connection.connectionToken) {
    return {
      status: "error",
      message: "Add-on is not connected to the backend."
    };
  }

  const syncResponse = backendRequest(
    BACKEND_CONFIG.CLASSES_SYNC_ENDPOINT,
    "POST",
    {
      classes: result.classes
    },
    true
  );

  if (!syncResponse || syncResponse.status !== "success") {
    return {
      status: "error",
      message:
        syncResponse && syncResponse.message
          ? syncResponse.message
          : "Failed to synchronize classes with the backend."
    };
  }

  return {
    status: "success",
    classes: result.classes,
    message: "Classes synchronized successfully!"
  };
}

/**
 * =========================================================
 * BACKEND CONFIGURATION
 * =========================================================
 *
 * Change only if your backend URL changes.
 * =========================================================
 */

const BACKEND_CONFIG = {
  BASE_URL: "https://smart-attendance-ve2d.vercel.app",
  PAIR_ENDPOINT: "/api/teacher/addon/pair",
  STATUS_ENDPOINT: "/api/addon/status",
  CLASSES_SYNC_ENDPOINT: "/api/addon/classes/sync",
  DISCONNECT_ENDPOINT: "/api/addon/disconnect",
  NEXT_COMMAND_ENDPOINT: "/api/addon/commands/next",
  COMMAND_RESULT_ENDPOINT: "/api/addon/commands/result"
};


/**
 * =========================================================
 * GENERIC BACKEND REQUEST
 * =========================================================
 */

function backendRequest(
  endpoint,
  method,
  payload,
  requiresToken
) {

  const options = {

    method:
      method || "GET",

    muteHttpExceptions:
      true,

    contentType:
      "application/json",

    headers: {}
  };

  if (
    requiresToken
  ) {

    const connection =
      getStoredConnection();

    if (
      !connection.connectionToken
    ) {

      return {
        status: "error",
        code: "NOT_CONNECTED",
        message:
          "Smart Attendance connection token is missing."
      };
    }

    options.headers.Authorization =
      "Bearer " +
      connection.connectionToken;
  }

  if (
    payload !== undefined &&
    payload !== null
  ) {

    options.payload =
      JSON.stringify(payload);
  }

  try {

    const response =
      UrlFetchApp.fetch(
        BACKEND_CONFIG.BASE_URL +
        endpoint,
        options
      );

    const statusCode =
      response.getResponseCode();

    const text =
      response.getContentText();

    let result;

    try {

      result =
        JSON.parse(text);

    } catch (parseError) {

      return {
        status: "error",
        code: "INVALID_BACKEND_RESPONSE",
        message:
          "Backend returned an invalid response.",
        httpStatus:
          statusCode,
        raw:
          text
      };
    }

    result.httpStatus =
      statusCode;

    return result;

  } catch (error) {

    console.error(
      "Backend request failed:",
      error
    );

    return {
      status: "error",
      code: "BACKEND_REQUEST_FAILED",
      message:
        error.message ||
        String(error)
    };
  }
}


/**
 * =========================================================
 * ABOUT
 * =========================================================
 */

function showAbout() {

  SpreadsheetApp
    .getUi()
    .alert(
      "Smart Attendance",
      "Smart Attendance Google Sheets Add-on\n\n" +
      "This add-on connects your attendance spreadsheet " +
      "to the Smart Attendance system.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
}


/**
 * =========================================================
 * HEADER DETECTION
 * =========================================================
 */

function normalizeHeader(value) {

  return String(
    value == null
      ? ""
      : value
  )
    .toLowerCase()
    .trim()
    .replace(/[\u00ad]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}


function headerMatches(
  value,
  aliases
) {

  const h =
    normalizeHeader(value);

  if (!h) {
    return false;
  }

  return aliases.some(
    function(alias) {

      const a =
        normalizeHeader(alias);

      return h === a;
    }
  );
}


const HEADER_ALIASES = {

  roll: [

    "roll",
    "rollno",
    "rollnumber",
    "rollnum",

    "studentid",
    "studentno",
    "studentnumber",
    "studentnum",

    "admissionno",
    "admissionnumber",
    "admissionnum",

    "enrollmentno",
    "enrollmentnumber",
    "enrollmentnum",

    "enrolmentno",
    "enrolmentnumber",
    "enrolmentnum",

    "registrationno",
    "registrationnumber",
    "registrationnum",

    "regno",
    "regnumber",

    "id"
  ],

  name: [

    "name",
    "studentname",
    "fullname",
    "studentfullname",
    "fullstudentname"
  ],

  email: [

    "email",
    "emailid",
    "emailaddress",
    "emailaddr",
    "mail",
    "mailid"
  ]
};


/**
 * =========================================================
 * DATE DETECTION
 * =========================================================
 */

function looksLikeDate(value) {

  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return true;
  }

  const text =
    String(
      value == null
        ? ""
        : value
    ).trim();

  if (!text) {
    return false;
  }

  const normalized =
    normalizeDate(value);

  return /^\d{2}\/\d{2}\/\d{4}$/
    .test(normalized);
}


function isValidEmail(value) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      String(value || "").trim()
    );
}


function findHeaderColumn(
  rowValues,
  aliases
) {

  for (
    let c = 0;
    c < rowValues.length;
    c++
  ) {

    if (
      headerMatches(
        rowValues[c],
        aliases
      )
    ) {

      return c + 1;
    }
  }

  return -1;
}


function findDateHeaderRow(
  values,
  maxRows
) {

  let best = {
    row: -1,
    count: 0
  };

  const rowsToScan =
    Math.min(
      values.length,
      maxRows
    );

  for (
    let r = 0;
    r < rowsToScan;
    r++
  ) {

    let count = 0;

    for (
      let c = 0;
      c < values[r].length;
      c++
    ) {

      if (
        looksLikeDate(
          values[r][c]
        )
      ) {

        count++;
      }
    }

    if (
      count > best.count
    ) {

      best = {
        row: r + 1,
        count: count
      };
    }
  }

  return best.row;
}


/**
 * =========================================================
 * DYNAMIC SHEET SCHEMA DETECTION
 * =========================================================
 */

function detectSheetSchema(sheet) {

  const lastRow =
    sheet.getLastRow();

  const lastColumn =
    sheet.getLastColumn();

  if (
    lastRow < 1 ||
    lastColumn < 1
  ) {

    throw new Error(
      "Sheet '" +
      sheet.getName() +
      "' is empty."
    );
  }

  const scanRows =
    Math.min(
      lastRow,
      CONFIG.DETECTION_SCAN_ROWS
    );

  const values =
    sheet
      .getRange(
        1,
        1,
        scanRows,
        lastColumn
      )
      .getDisplayValues();

  const rawValues =
    sheet
      .getRange(
        1,
        1,
        scanRows,
        lastColumn
      )
      .getValues();


  let bestHeader = null;


  for (
    let r = 0;
    r < values.length;
    r++
  ) {

    const row =
      values[r];

    const rollCol =
      findHeaderColumn(
        row,
        HEADER_ALIASES.roll
      );

    const nameCol =
      findHeaderColumn(
        row,
        HEADER_ALIASES.name
      );

    const emailCol =
      findHeaderColumn(
        row,
        HEADER_ALIASES.email
      );


    let score = 0;

    if (
      rollCol !== -1
    ) {
      score += 3;
    }

    if (
      nameCol !== -1
    ) {
      score += 3;
    }

    if (
      emailCol !== -1
    ) {
      score += 2;
    }


    const identityColumnsAreDistinct =
      rollCol !== -1 &&
      nameCol !== -1 &&
      rollCol !== nameCol &&
      (
        emailCol === -1 ||
        (
          emailCol !== rollCol &&
          emailCol !== nameCol
        )
      );


    if (
      identityColumnsAreDistinct &&
      score > 0 &&
      (
        !bestHeader ||
        score > bestHeader.score
      )
    ) {

      bestHeader = {

        row:
          r + 1,

        rollColumn:
          rollCol,

        nameColumn:
          nameCol,

        emailColumn:
          emailCol,

        score:
          score
      };
    }
  }


  const dateHeaderRow =
    findDateHeaderRow(
      values,
      CONFIG.DETECTION_SCAN_ROWS
    );


  if (!bestHeader) {

    const maxDataScan =
      Math.min(
        lastRow,
        CONFIG.DETECTION_SCAN_ROWS + 10
      );

    const sample =
      sheet
        .getRange(
          1,
          1,
          maxDataScan,
          lastColumn
        )
        .getDisplayValues();


    let candidate = {
      score: -1
    };


    for (
      let c = 0;
      c < lastColumn;
      c++
    ) {

      let numeric = 0;
      let text = 0;
      let emails = 0;


      for (
        let r = 0;
        r < sample.length;
        r++
      ) {

        const v =
          String(
            sample[r][c] || ""
          ).trim();


        if (
          /^\d+$/.test(v)
        ) {
          numeric++;
        }


        if (
          v &&
          !/^\d+$/.test(v)
        ) {
          text++;
        }


        if (
          isValidEmail(v)
        ) {
          emails++;
        }
      }


      const score =
        numeric * 2 +
        text +
        emails * 2;


      if (
        score > candidate.score
      ) {

        candidate = {
          column:
            c + 1,

          score:
            score
        };
      }
    }


    if (!candidate.column) {

      throw new Error(
        "Could not detect student columns in sheet '" +
        sheet.getName() +
        "'. Please add clear headers such as Roll No, Name and Email."
      );
    }


    throw new Error(
      "Could not reliably detect Roll/Student ID, Name and Email headers in sheet '" +
      sheet.getName() +
      "'. Please use recognizable headers."
    );
  }


  if (
    bestHeader.rollColumn === -1 ||
    bestHeader.nameColumn === -1
  ) {

    throw new Error(
      "Could not detect both a Roll/Student ID column and a Name column in sheet '" +
      sheet.getName() +
      "'."
    );
  }


  if (
    bestHeader.rollColumn ===
    bestHeader.nameColumn
  ) {

    throw new Error(
      "The Roll/Student ID and Name columns were detected as the same column in sheet '" +
      sheet.getName() +
      "'. Please use clear headers such as Roll No, Student ID and Name."
    );
  }


  const dataStartRow =
    Math.max(
      bestHeader.row + 1,
      dateHeaderRow > 0
        ? dateHeaderRow + 1
        : bestHeader.row + 1
    );


  const dateColumns = [];


  if (
    dateHeaderRow > 0
  ) {

    const dateRow =
      values[
        dateHeaderRow - 1
      ];

    const rawDateRow =
      rawValues[
        dateHeaderRow - 1
      ];


    for (
      let c = 0;
      c < dateRow.length;
      c++
    ) {

      let normalized = "";


      if (
        rawDateRow &&
        rawDateRow[c] instanceof Date &&
        !isNaN(
          rawDateRow[c].getTime()
        )
      ) {

        normalized =
          Utilities.formatDate(
            rawDateRow[c],
            "Asia/Kolkata",
            "dd/MM/yyyy"
          );

      } else {

        normalized =
          normalizeDate(
            dateRow[c]
          );
      }


      if (
        /^\d{2}\/\d{2}\/\d{4}$/
          .test(normalized)
      ) {

        dateColumns.push({

          column:
            c + 1,

          date:
            normalized,

          rawText:
            String(
              dateRow[c] || ""
            ).trim()
        });
      }
    }
  }


  if (
    dateHeaderRow > 0 &&
    dateColumns.length === 0
  ) {

    const fullDateRow =
      sheet
        .getRange(
          dateHeaderRow,
          1,
          1,
          lastColumn
        )
        .getDisplayValues()[0];

    const fullRawDateRow =
      sheet
        .getRange(
          dateHeaderRow,
          1,
          1,
          lastColumn
        )
        .getValues()[0];


    for (
      let c = 0;
      c < fullDateRow.length;
      c++
    ) {

      let normalized = "";


      if (
        fullRawDateRow &&
        fullRawDateRow[c] instanceof Date &&
        !isNaN(
          fullRawDateRow[c].getTime()
        )
      ) {

        normalized =
          Utilities.formatDate(
            fullRawDateRow[c],
            "Asia/Kolkata",
            "dd/MM/yyyy"
          );

      } else {

        normalized =
          normalizeDate(
            fullDateRow[c]
          );
      }


      if (
        /^\d{2}\/\d{2}\/\d{4}$/
          .test(normalized)
      ) {

        dateColumns.push({

          column:
            c + 1,

          date:
            normalized,

          rawText:
            String(
              fullDateRow[c] || ""
            ).trim()
        });
      }
    }
  }


  const studentRows = [];


  if (
    lastRow >= dataStartRow
  ) {

    const data =
      sheet
        .getRange(
          dataStartRow,
          1,
          lastRow -
            dataStartRow +
            1,
          lastColumn
        )
        .getDisplayValues();


    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      const row =
        data[i];


      const id =
        String(
          row[
            bestHeader.rollColumn - 1
          ] || ""
        ).trim();


      const name =
        String(
          row[
            bestHeader.nameColumn - 1
          ] || ""
        ).trim();


      const email =
        bestHeader.emailColumn > 0
          ? String(
              row[
                bestHeader.emailColumn - 1
              ] || ""
            ).trim()
          : "";


      if (
        !id ||
        !name
      ) {
        continue;
      }


      if (
        headerMatches(
          id,
          HEADER_ALIASES.roll
        ) ||
        headerMatches(
          name,
          HEADER_ALIASES.name
        ) ||
        (
          bestHeader.emailColumn > 0 &&
          headerMatches(
            email,
            HEADER_ALIASES.email
          )
        )
      ) {
        continue;
      }


      if (
        bestHeader.emailColumn > 0 &&
        !isValidEmail(email)
      ) {
        continue;
      }


      if (
        !/[a-z0-9]/i.test(id)
      ) {
        continue;
      }


      studentRows.push(
        dataStartRow + i
      );
    }
  }


  if (
    studentRows.length === 0
  ) {

    throw new Error(
      "No student records could be detected in sheet '" +
      sheet.getName() +
      "'. Check the Roll/Student ID and Name columns."
    );
  }


  return {

    sheetName:
      sheet.getName(),

    headerRow:
      bestHeader.row,

    dateHeaderRow:
      dateHeaderRow,

    dataStartRow:
      dataStartRow,

    rollColumn:
      bestHeader.rollColumn,

    nameColumn:
      bestHeader.nameColumn,

    emailColumn:
      bestHeader.emailColumn,

    dateColumns:
      dateColumns,

    studentRows:
      studentRows
  };
}


/**
 * =========================================================
 * STUDENT HELPERS
 * =========================================================
 */

function getLastStudentRow(sheet) {

  const schema =
    detectSheetSchema(sheet);

  return schema.studentRows.length

    ? schema.studentRows[
        schema.studentRows.length - 1
      ]

    : schema.dataStartRow - 1;
}


function getStudentRecords(
  sheet,
  schema
) {

  const records = [];

  if (
    !schema.studentRows.length
  ) {
    return records;
  }


  const lastColumn =
    sheet.getLastColumn();

  const minRow =
    schema.studentRows[0];

  const maxRow =
    schema.studentRows[
      schema.studentRows.length - 1
    ];


  const values =
    sheet
      .getRange(
        minRow,
        1,
        maxRow - minRow + 1,
        lastColumn
      )
      .getDisplayValues();


  const rowSet = {};

  schema.studentRows.forEach(
    function(r) {

      rowSet[r] = true;
    }
  );


  for (
    let rowNumber = minRow;
    rowNumber <= maxRow;
    rowNumber++
  ) {

    if (
      !rowSet[rowNumber]
    ) {
      continue;
    }


    const row =
      values[
        rowNumber - minRow
      ];


    records.push({

      rowNumber:
        rowNumber,

      roll:
        String(
          row[
            schema.rollColumn - 1
          ] || ""
        ).trim(),

      name:
        String(
          row[
            schema.nameColumn - 1
          ] || ""
        ).trim(),

      email:
        schema.emailColumn > 0

          ? String(
              row[
                schema.emailColumn - 1
              ] || ""
            ).trim()

          : ""
    });
  }


  return records;
}


function getSchemaForSession(
  sheet,
  session
) {

  if (
    session &&
    session.schema
  ) {

    return session.schema;
  }

  return detectSheetSchema(
    sheet
  );
}


/**
 * =========================================================
 * GET CLASSES
 * =========================================================
 */

function executeSyncClasses(data) {

  const result =
    executeGetClasses();

  if (
    result.status !==
    "success"
  ) {
    return result;
  }

  const connection =
    getStoredConnection();

  if (
    !connection.connectionToken
  ) {
    return {
      status: "error",
      code: "NOT_CONNECTED",
      message:
        "Spreadsheet is not connected."
    };
  }

  const syncResponse =
    backendRequest(
      "/api/addon/classes/sync",
      "POST",
      {
        classes:
          result.classes
      },
      true
    );

  if (
    syncResponse.status !==
    "success"
  ) {
    return syncResponse;
  }

  return {
    status: "success",
    message:
      "Classes synchronized successfully.",
    classes:
      syncResponse.classes || result.classes
  };
}


function executeGetClasses() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const classes =
    ss.getSheets()

      .map(
        function(sheet) {

          return sheet
            .getName()
            .trim();
        }
      )

      .filter(
        function(name) {

          return (
            name !== "" &&
            name !==
              EMAIL_QUEUE.SHEET_NAME
          );
        }
      );


  return {

    status:
      "success",

    classes:
      classes
  };
}


/**
 * =========================================================
 * FETCH STUDENTS
 * =========================================================
 */

function executeFetchStudents(
  data
) {

  const className =
    sanitizeClassName(
      data.className
    );


  const sheet =
    getClassSheet(
      className
    );


  if (!sheet) {

    return {

      status:
        "error",

      message:
        "Sheet tab '" +
        className +
        "' not found."
    };
  }


  let schema;


  try {

    schema =
      detectSheetSchema(
        sheet
      );

  } catch (error) {

    return {

      status:
        "error",

      code:
        "STRUCTURE_NOT_DETECTED",

      message:
        error.message
    };
  }


  const records =
    getStudentRecords(
      sheet,
      schema
    );


  const students =
    records.map(
      function(student) {

        return {

          roll:
            student.roll,

          name:
            student.name,

          email:
            student.email,

          status:
            "PENDING"
        };
      }
    );


  return {

    status:
      "success",

    className:
      className,

    date:
      getTodayDate(),

    students:
      students,

    detectedStructure: {

      headerRow:
        schema.headerRow,

      dateHeaderRow:
        schema.dateHeaderRow,

      dataStartRow:
        schema.dataStartRow,

      rollColumn:
        schema.rollColumn,

      nameColumn:
        schema.nameColumn,

      emailColumn:
        schema.emailColumn,

      studentCount:
        students.length
    }
  };
}


/**
 * =========================================================
 * CREATE SESSION
 * =========================================================
 */

function executeCreateSession(
  data
) {

  const className =
    sanitizeClassName(
      data.className
    );


  const sheet =
    getClassSheet(
      className
    );


  if (!sheet) {

    return {

      status:
        "error",

      message:
        "Sheet tab '" +
        className +
        "' not found."
    };
  }


  let schema;


  try {

    schema =
      detectSheetSchema(
        sheet
      );

  } catch (error) {

    return {

      status:
        "error",

      code:
        "STRUCTURE_NOT_DETECTED",

      message:
        error.message
    };
  }


  const date =
    getTodayDate();


  const dateColumn =
    findDateColumn(
      sheet,
      date,
      schema
    );


  if (
    dateColumn === -1
  ) {

    return {

      status:
        "error",

      code:
        "DATE_NOT_FOUND",

      message:
        "Today's date " +
        date +
        " was not found in the existing attendance date row of " +
        className +
        ". Please add the date to the attendance sheet first."
    };
  }


  const studentRecords =
    getStudentRecords(
      sheet,
      schema
    );


  const studentIndex = {};


  studentRecords.forEach(
    function(student) {

      if (!student.roll) {
        return;
      }

      studentIndex[
        student.roll
      ] =
        student.rowNumber;
    }
  );


  if (
    Object.keys(
      studentIndex
    ).length === 0
  ) {

    return {

      status:
        "error",

      code:
        "NO_STUDENTS",

      message:
        "No student records found."
    };
  }


  const sessionId =
    Utilities.getUuid();


  const session = {

    sessionId:
      sessionId,

    className:
      className,

    date:
      date,

    dateColumn:
      dateColumn,

    studentIndex:
      studentIndex,

    schema:
      schema,

    createdAt:
      Date.now(),

    finalized:
      false
  };


  saveSession(
    session
  );


  return {

    status:
      "success",

    session:
      session
  };
}


/**
 * =========================================================
 * VERIFY QR + MARK PRESENT
 * =========================================================
 */

function executeVerifyAndMarkPresent(
  data
) {

  const className =
    sanitizeClassName(
      data.className
    );


  const rollNumber =
    String(
      data.rollNumber || ""
    ).trim();


  const qrDateRaw =
    String(
      data.date || ""
    ).trim();


  const sessionId =
    String(
      data.sessionId || ""
    ).trim();


  if (
    !className ||
    !rollNumber ||
    !qrDateRaw ||
    !sessionId
  ) {

    return {

      status:
        "error",

      code:
        "INVALID_REQUEST",

      message:
        "Missing QR/session information."
    };
  }


  const session =
    getSession(
      sessionId
    );


  if (!session) {

    return {

      status:
        "error",

      code:
        "INVALID_SESSION",

      message:
        "Attendance session is invalid or expired."
    };
  }


  if (
    session.finalized
  ) {

    return {

      status:
        "error",

      code:
        "SESSION_CLOSED",

      message:
        "Attendance session is already closed."
    };
  }


  if (
    session.className !==
    className
  ) {

    return {

      status:
        "error",

      code:
        "WRONG_CLASS",

      message:
        "QR code belongs to another class."
    };
  }


  const today =
    getTodayDate();


  const qrDate =
    normalizeIncomingAttendanceDate(
      qrDateRaw
    );


  if (
    qrDate !== today
  ) {

    return {

      status:
        "error",

      code:
        "EXPIRED_QR",

      message:
        "This QR code is not valid today."
    };
  }


  if (
    session.date !== today
  ) {

    return {

      status:
        "error",

      code:
        "SESSION_DATE_ERROR",

      message:
        "Attendance session date is invalid."
    };
  }


  const sheet =
    getClassSheet(
      className
    );


  if (!sheet) {

    return {

      status:
        "error",

      message:
        "Class sheet not found."
    };
  }


  const lock =
    LockService.getUserLock();


  try {

    lock.waitLock(
      10000
    );


    const studentRow =
      session.studentIndex &&
      session.studentIndex[
        rollNumber
      ];


    if (!studentRow) {

      return {

        status:
          "error",

        code:
          "STUDENT_NOT_FOUND",

        message:
          "Roll number " +
          rollNumber +
          " was not found."
      };
    }


    const attendanceCell =
      sheet.getRange(
        studentRow,
        session.dateColumn
      );


    const currentValue =
      String(
        attendanceCell
          .getDisplayValue()
      )
      .trim()
      .toUpperCase();


    if (
      currentValue === "P"
    ) {

      const studentName =
        sheet
          .getRange(
            studentRow,
            session.schema.nameColumn
          )
          .getDisplayValue();


      return {

        status:
          "error",

        code:
          "ALREADY_PRESENT",

        message:
          "Attendance already marked.",

        student: {

          roll:
            rollNumber,

          name:
            studentName
        }
      };
    }


    if (
      currentValue === "A"
    ) {

      return {

        status:
          "error",

        code:
          "ALREADY_FINALIZED",

        message:
          "This student has already been marked absent."
      };
    }


    attendanceCell
      .setValue("P");


    const studentName =
      sheet
        .getRange(
          studentRow,
          session.schema.nameColumn
        )
        .getDisplayValue();


    return {

      status:
        "success",

      code:
        "MARKED_PRESENT",

      message:
        "Attendance marked successfully.",

      student: {

        roll:
          rollNumber,

        name:
          studentName
      },

      statusValue:
        "P"
    };


  } finally {

    try {

      lock.releaseLock();

    } catch (ignore) {}
  }
}


/**
 * =========================================================
 * FINALIZE DAY
 * =========================================================
 */

function executeFinalizeDay(
  data
) {

  const className =
    sanitizeClassName(
      data.className
    );


  const sessionId =
    String(
      data.sessionId || ""
    ).trim();


  const session =
    getSession(
      sessionId
    );


  if (!session) {

    return {

      status:
        "error",

      code:
        "INVALID_SESSION",

      message:
        "Invalid attendance session."
    };
  }


  if (
    session.finalized
  ) {

    return {

      status:
        "error",

      code:
        "SESSION_CLOSED",

      message:
        "Attendance is already finalized."
    };
  }


  if (
    session.className !==
    className
  ) {

    return {

      status:
        "error",

      message:
        "Session/class mismatch."
    };
  }


  const sheet =
    getClassSheet(
      className
    );


  if (!sheet) {

    return {

      status:
        "error",

      message:
        "Class sheet not found."
    };
  }


  const lock =
    LockService.getUserLock();


  try {

    lock.waitLock(
      15000
    );


    const schema =
      getSchemaForSession(
        sheet,
        session
      );


    const studentRecords =
      getStudentRecords(
        sheet,
        schema
      );


    if (
      !studentRecords.length
    ) {

      return {

        status:
          "error",

        code:
          "NO_STUDENTS",

        message:
          "No student records found."
      };
    }


    const minRow =
      studentRecords[0]
        .rowNumber;


    const maxRow =
      studentRecords[
        studentRecords.length - 1
      ].rowNumber;


    const rowCount =
      maxRow - minRow + 1;


    const range =
      sheet.getRange(
        minRow,
        session.dateColumn,
        rowCount,
        1
      );


    const values =
      range.getValues();


    const rowMap = {};


    studentRecords.forEach(
      function(student) {

        rowMap[
          student.rowNumber
        ] =
          student;
      }
    );


    let presentCount = 0;
    let absentCount = 0;


    for (
      let i = 0;
      i < rowCount;
      i++
    ) {

      const rowNumber =
        minRow + i;


      const student =
        rowMap[
          rowNumber
        ];


      if (!student) {
        continue;
      }


      const value =
        String(
          values[i][0] || ""
        )
        .trim()
        .toUpperCase();


      if (
        value === "P"
      ) {

        presentCount++;

      } else {

        values[i][0] = "A";

        absentCount++;
      }
    }


    range.setValues(
      values
    );


    session.finalized =
      true;


    session.finalizedAt =
      Date.now();


    saveSession(
      session
    );


    return {

      status:
        "success",

      message:
        "Attendance finalized successfully.",

      present:
        presentCount,

      absent:
        absentCount,

      finalized:
        true
    };


  } finally {

    try {

      lock.releaseLock();

    } catch (ignore) {}
  }
}


/**
 * =========================================================
 * ATTENDANCE STATUS
 * =========================================================
 */

function executeGetAttendanceStatus(
  data
) {

  const className =
    sanitizeClassName(
      data.className
    );


  const sheet =
    getClassSheet(
      className
    );


  if (!sheet) {

    return {

      status:
        "error",

      message:
        "Class sheet not found."
    };
  }


  let schema;


  try {

    schema =
      detectSheetSchema(
        sheet
      );

  } catch (error) {

    return {

      status:
        "error",

      code:
        "STRUCTURE_NOT_DETECTED",

      message:
        error.message
    };
  }


  const date =
    getTodayDate();


  const dateColumn =
    findDateColumn(
      sheet,
      date,
      schema
    );


  const records =
    getStudentRecords(
      sheet,
      schema
    );


  if (
    !records.length
  ) {

    return {

      status:
        "error",

      code:
        "NO_STUDENTS",

      message:
        "No student records found."
    };
  }


  if (
    dateColumn === -1
  ) {

    return {

      status:
        "success",

      className:
        className,

      date:
        date,

      total:
        records.length,

      present:
        0,

      absent:
        0,

      pending:
        records.length,

      finalized:
        false,

      students:
        [],

      dateFound:
        false
    };
  }


  const minRow =
    records[0].rowNumber;


  const maxRow =
    records[
      records.length - 1
    ].rowNumber;


  const rowCount =
    maxRow - minRow + 1;


  const attendanceValues =
    sheet
      .getRange(
        minRow,
        dateColumn,
        rowCount,
        1
      )
      .getDisplayValues();


  const rowMap = {};


  records.forEach(
    function(student) {

      rowMap[
        student.rowNumber
      ] =
        student;
    }
  );


  const students = [];

  let present = 0;
  let absent = 0;
  let pending = 0;


  for (
    let i = 0;
    i < rowCount;
    i++
  ) {

    const student =
      rowMap[
        minRow + i
      ];


    if (!student) {
      continue;
    }


    const attendance =
      String(
        attendanceValues[i][0] ||
        ""
      )
      .trim()
      .toUpperCase();


    let status =
      "PENDING";


    if (
      attendance === "P"
    ) {

      status =
        "PRESENT";

      present++;

    } else if (
      attendance === "A"
    ) {

      status =
        "ABSENT";

      absent++;

    } else {

      pending++;
    }


    students.push({

      roll:
        student.roll,

      name:
        student.name,

      email:
        student.email,

      status:
        status
    });
  }


  return {

    status:
      "success",

    className:
      className,

    date:
      date,

    total:
      students.length,

    present:
      present,

    absent:
      absent,

    pending:
      pending,

    finalized:
      pending === 0,

    students:
      students,

    dateFound:
      true,

    detectedStructure: {

      headerRow:
        schema.headerRow,

      dateHeaderRow:
        schema.dateHeaderRow,

      dataStartRow:
        schema.dataStartRow,

      rollColumn:
        schema.rollColumn,

      nameColumn:
        schema.nameColumn,

      emailColumn:
        schema.emailColumn
    }
  };
}


/**
 * =========================================================
 * TEST FUNCTIONS
 *
 * These are temporary/manual test functions.
 * We will test them one by one.
 * =========================================================
 */

function testGetClasses() {

  const result =
    executeGetClasses();

  SpreadsheetApp
    .getUi()
    .alert(
      "Get Classes",
      JSON.stringify(
        result,
        null,
        2
      ),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return result;
}


function testFetchStudents() {

  const ui =
    SpreadsheetApp.getUi();


  const response =
    ui.prompt(
      "Fetch Students",
      "Enter class/sheet name:",
      ui.ButtonSet.OK_CANCEL
    );


  if (
    response.getSelectedButton() !==
    ui.Button.OK
  ) {
    return;
  }


  const className =
    response
      .getResponseText()
      .trim();


  const result =
    executeFetchStudents({

      className:
        className
    });


  ui.alert(
    "Fetch Students",
    JSON.stringify(
      result,
      null,
      2
    ),
    ui.ButtonSet.OK
  );


  return result;
}


function testCreateSession() {

  const ui =
    SpreadsheetApp.getUi();


  const response =
    ui.prompt(
      "Create Session",
      "Enter class/sheet name:",
      ui.ButtonSet.OK_CANCEL
    );


  if (
    response.getSelectedButton() !==
    ui.Button.OK
  ) {
    return;
  }


  const className =
    response
      .getResponseText()
      .trim();


  const result =
    executeCreateSession({

      className:
        className
    });


  ui.alert(
    "Create Session",
    JSON.stringify(
      result,
      null,
      2
    ),
    ui.ButtonSet.OK
  );


  return result;
}


function testAttendanceStatus() {

  const ui =
    SpreadsheetApp.getUi();


  const response =
    ui.prompt(
      "Attendance Status",
      "Enter class/sheet name:",
      ui.ButtonSet.OK_CANCEL
    );


  if (
    response.getSelectedButton() !==
    ui.Button.OK
  ) {
    return;
  }


  const className =
    response
      .getResponseText()
      .trim();


  const result =
    executeGetAttendanceStatus({

      className:
        className
    });


  ui.alert(
    "Attendance Status",
    JSON.stringify(
      result,
      null,
      2
    ),
    ui.ButtonSet.OK
  );


  return result;
}


/**
 * =========================================================
 * SESSION STORAGE
 * =========================================================
 *
 * IMPORTANT:
 *
 * Old Web App:
 * getScriptProperties()
 *
 * New Add-on:
 * getUserProperties()
 *
 * This keeps each teacher's attendance session isolated.
 * =========================================================
 */

function saveSession(
  session
) {

  PropertiesService
    .getUserProperties()
    .setProperty(

      "SESSION_" +
      session.sessionId,

      JSON.stringify(
        session
      )
    );
}


function getSession(
  sessionId
) {

  const properties =
    PropertiesService
      .getUserProperties();


  const raw =
    properties.getProperty(

      "SESSION_" +
      sessionId
    );


  if (!raw) {
    return null;
  }


  const session =
    JSON.parse(
      raw
    );


  const now =
    Date.now();


  const expiry =
    session.createdAt +
    CONFIG.SESSION_HOURS *
    60 *
    60 *
    1000;


  if (
    now > expiry
  ) {

    properties.deleteProperty(

      "SESSION_" +
      sessionId
    );

    return null;
  }


  return session;
}


/**
 * =========================================================
 * CLASS SHEET
 * =========================================================
 */

function getClassSheet(
  className
) {

  return SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(
      className
    );
}


/**
 * =========================================================
 * CLASS NAME SANITIZATION
 * =========================================================
 */

function sanitizeClassName(
  className
) {

  return String(
    className || ""
  )
    .trim()
    .toUpperCase();
}


/**
 * =========================================================
 * HTML ESCAPE
 * =========================================================
 */

function escapeHtml(
  value
) {

  return String(
    value
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/**
 * =========================================================
 * DATE FUNCTIONS
 * =========================================================
 */

function getTodayDate() {

  return Utilities
    .formatDate(
      new Date(),
      "Asia/Kolkata",
      "dd/MM/yyyy"
    );
}


function findDateColumn(
  sheet,
  date,
  schema
) {

  const detected =
    schema ||
    detectSheetSchema(
      sheet
    );


  for (
    let i = 0;
    i <
    detected.dateColumns.length;
    i++
  ) {

    if (
      detected
        .dateColumns[i]
        .date === date
    ) {

      return detected
        .dateColumns[i]
        .column;
    }
  }


  if (
    detected.dateHeaderRow > 0
  ) {

    const lastColumn =
      sheet.getLastColumn();


    const headers =
      sheet
        .getRange(
          detected.dateHeaderRow,
          1,
          1,
          lastColumn
        )
        .getDisplayValues()[0];


    for (
      let c = 0;
      c < headers.length;
      c++
    ) {

      if (
        normalizeDate(
          headers[c]
        ) === date
      ) {

        return c + 1;
      }
    }
  }


  return -1;
}


function normalizeDate(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";
  }


  if (
    value instanceof Date &&
    !isNaN(
      value.getTime()
    )
  ) {

    return Utilities
      .formatDate(
        value,
        "Asia/Kolkata",
        "dd/MM/yyyy"
      );
  }


  let text =
    String(value)
      .trim()
      .replace(
        /-/g,
        "/"
      )
      .replace(
        /\./g,
        "/"
      );


  text =
    text.replace(
      /\s+/g,
      ""
    );


  const parts =
    text.split("/");


  if (
    parts.length === 3
  ) {

    let day =
      parts[0];

    let month =
      parts[1];

    let year =
      parts[2];


    if (
      day.length === 1
    ) {

      day =
        "0" +
        day;
    }


    if (
      month.length === 1
    ) {

      month =
        "0" +
        month;
    }


    if (
      year.length === 4 &&
      parts[0].length === 4
    ) {

      return (

        parts[2]
          .padStart(2, "0") +

        "/" +

        parts[1]
          .padStart(2, "0") +

        "/" +

        parts[0]
      );
    }


    return (

      day.padStart(
        2,
        "0"
      ) +

      "/" +

      month.padStart(
        2,
        "0"
      ) +

      "/" +

      year
    );
  }


  return text;
}


/**
 * =========================================================
 * QR DATE NORMALIZATION
 * =========================================================
 */

function normalizeIncomingAttendanceDate(
  value
) {

  const text =
    String(
      value || ""
    ).trim();


  if (!text) {
    return "";
  }


  if (
    /^\d{2}\/\d{2}\/\d{4}$/
      .test(text)
  ) {

    return text;
  }


  const parsed =
    new Date(
      text
    );


  if (
    isNaN(
      parsed.getTime()
    )
  ) {

    return text;
  }


  return Utilities
    .formatDate(
      parsed,
      "Asia/Kolkata",
      "dd/MM/yyyy"
    );
}


/**
 * =========================================================
 * EMAIL DATE FORMAT
 * =========================================================
 */

function formatAttendanceDateForEmail(
  value
) {

  return String(
    value || ""
  ).trim();
}


/**
 * =========================================================
 * EMAIL QUEUE SHEET
 * =========================================================
 */

function getOrCreateEmailQueueSheet() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      EMAIL_QUEUE.SHEET_NAME
    );


  if (!sheet) {

    sheet =
      ss.insertSheet(
        EMAIL_QUEUE.SHEET_NAME
      );


    sheet
      .getRange(
        1,
        1,
        1,
        15
      )
      .setValues([[
        "queueId",
        "sessionId",
        "className",
        "date",
        "roll",
        "email",
        "studentName",
        "qrBase64",
        "queueType",
        "status",
        "attempts",
        "lastError",
        "sentAt",
        "createdAt",
        "startedAt"
      ]]);


    sheet
      .setFrozenRows(
        1
      );


    try {

      sheet.hideSheet();

    } catch (ignore) {}
  }


  return sheet;
}


/**
 * =========================================================
 * SEND EMAILS
 * =========================================================
 */

function executeSendEmails(
  data
) {

  const className =
    sanitizeClassName(
      data.className
    );


  const sessionId =
    String(
      data.sessionId || ""
    ).trim();


  const students =
    data.students;


  if (
    !className ||
    !sessionId ||
    !Array.isArray(
      students
    )
  ) {

    return {

      status:
        "error",

      message:
        "Invalid email dispatch request."
    };
  }


  const session =
    getSession(
      sessionId
    );


  if (!session) {

    return {

      status:
        "error",

      code:
        "INVALID_SESSION",

      message:
        "Attendance session is invalid or expired."
    };
  }


  if (
    session.className !==
    className
  ) {

    return {

      status:
        "error",

      code:
        "WRONG_CLASS",

      message:
        "Session does not belong to this class."
    };
  }


  const date =
    String(
      session.date || ""
    ).trim();


  if (
    !/^\d{2}\/\d{2}\/\d{4}$/
      .test(date)
  ) {

    return {

      status:
        "error",

      code:
        "INVALID_SESSION_DATE",

      message:
        "Attendance session contains an invalid date."
    };
  }


  if (
    session.finalized
  ) {

    return {

      status:
        "error",

      code:
        "SESSION_CLOSED",

      message:
        "Attendance session is already closed."
    };
  }


  const sheet =
    getClassSheet(
      className
    );


  if (!sheet) {

    return {

      status:
        "error",

      message:
        "Class sheet not found."
    };
  }


  let schema;


  try {

    schema =
      getSchemaForSession(
        sheet,
        session
      );

  } catch (error) {

    return {

      status:
        "error",

      code:
        "STRUCTURE_NOT_DETECTED",

      message:
        error.message
    };
  }


  const studentMap = {};


  getStudentRecords(
    sheet,
    schema
  )
    .forEach(
      function(student) {

        if (!student.roll) {
          return;
        }

        studentMap[
          student.roll
        ] =
          student;
      }
    );


  const queueLock =
    LockService.getUserLock();


  try {

    queueLock.waitLock(
      15000
    );


    const queueSheet =
      getOrCreateEmailQueueSheet();


    const existing =
      findEmailQueueJob(
        queueSheet,
        sessionId
      );


    if (existing) {

      ensureEmailWorkerTrigger();

      processQrEmailQueue();
      const counts =
        getEmailQueueCounts(
          queueSheet,
          sessionId
        );


      return {

        status:
          "success",

        message:
          "QR email queue already exists. Sending will continue in batches.",

        sessionId:
          sessionId,

        queueId:
          existing.queueId,

        queued:
          counts.total,

        sent:
          counts.sent,

        pending:
          counts.pending,

        retryPending:
          counts.retryPending,

        failed:
          counts.failed,

        sending:
          counts.sending,

        complete:
          counts.pending === 0 &&
          counts.retryPending === 0 &&
          counts.sending === 0
      };
    }


    const queueId =
      Utilities.getUuid();


    const rows = [];


    students.forEach(
      function(student) {

        const roll =
          String(
            student.roll || ""
          ).trim();


        if (!roll) {
          return;
        }


        const officialStudent =
          studentMap[
            roll
          ];


        if (!officialStudent) {

          rows.push([

            queueId,
            sessionId,
            className,
            date,
            roll,
            "",
            String(
              student.name || ""
            ).trim(),
            String(
              student.qrBase64 || ""
            ),
            "MAIN",
            "FAILED",
            0,
            "Student not found in class.",
            "",
            new Date(),
            ""
          ]);

          return;
        }


        const email =
          String(
            officialStudent.email ||
            ""
          ).trim();


        const qrBase64 =
          String(
            student.qrBase64 ||
            ""
          );


        if (!email) {

          rows.push([

            queueId,
            sessionId,
            className,
            date,
            roll,
            "",
            officialStudent.name,
            qrBase64,
            "MAIN",
            "FAILED",
            0,
            "Student does not have an email address.",
            "",
            new Date(),
            ""
          ]);

          return;
        }


        if (
          !isValidEmail(
            email
          )
        ) {

          rows.push([

            queueId,
            sessionId,
            className,
            date,
            roll,
            email,
            officialStudent.name,
            qrBase64,
            "MAIN",
            "FAILED",
            0,
            "Student email address is invalid.",
            "",
            new Date(),
            ""
          ]);

          return;
        }


        if (!qrBase64) {

          rows.push([

            queueId,
            sessionId,
            className,
            date,
            roll,
            email,
            officialStudent.name,
            "",
            "MAIN",
            "FAILED",
            0,
            "QR image was not supplied.",
            "",
            new Date(),
            ""
          ]);

          return;
        }


        rows.push([

          queueId,
          sessionId,
          className,
          date,
          roll,
          email,
          officialStudent.name,
          qrBase64,
          "MAIN",
          "PENDING",
          0,
          "",
          "",
          new Date(),
          ""
        ]);
      }
    );


    if (!rows.length) {

      return {

        status:
          "error",

        code:
          "NO_EMAIL_RECIPIENTS",

        message:
          "No students were supplied for QR email sending."
      };
    }


    queueSheet
      .getRange(
        queueSheet.getLastRow() + 1,
        1,
        rows.length,
        15
      )
      .setValues(
        rows
      );


    queueSheet.hideSheet();


    ensureEmailWorkerTrigger();

    processQrEmailQueue();
    const counts =
      getEmailQueueCounts(
        queueSheet,
        sessionId
      );


    return {

      status:
        "success",

      message:
        "QR email queue created. Emails will be sent automatically in batches.",

      sessionId:
        sessionId,

      queueId:
        queueId,

      queued:
        counts.total,

      sent:
        counts.sent,

      pending:
        counts.pending,

      retryPending:
        counts.retryPending,

      failed:
        counts.failed,

      batchSize:
        EMAIL_QUEUE.BATCH_SIZE,

      complete:
        false
    };


  } finally {

    try {

      queueLock.releaseLock();

    } catch (ignore) {}
  }
}


/**
 * =========================================================
 * FIND EMAIL QUEUE JOB
 * =========================================================
 */

function findEmailQueueJob(
  sheet,
  sessionId
) {

  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {
    return null;
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        10
      )
      .getDisplayValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      String(
        values[i][1]
      ).trim() ===
      sessionId
    ) {

      return {

        queueId:
          String(
            values[i][0]
          ).trim()
      };
    }
  }


  return null;
}


/**
 * =========================================================
 * EMAIL QUEUE STATUS
 * =========================================================
 */

function executeGetEmailQueueStatus(
  data
) {

  const sessionId =
    String(
      data.sessionId || ""
    ).trim();


  if (!sessionId) {

    return {

      status:
        "error",

      code:
        "INVALID_SESSION_ID",

      message:
        "Session ID is required."
    };
  }


  const sheet =
    getOrCreateEmailQueueSheet();


  const counts =
    getEmailQueueCounts(
      sheet,
      sessionId
    );


  const complete =
    counts.total > 0 &&
    counts.pending === 0 &&
    counts.retryPending === 0 &&
    counts.sending === 0;


  return {

    status:
      "success",

    sessionId:
      sessionId,

    total:
      counts.total,

    sent:
      counts.sent,

    failed:
      counts.failed,

    pending:
      counts.pending,

    retryPending:
      counts.retryPending,

    sending:
      counts.sending,

    complete:
      complete
  };
}


/**
 * =========================================================
 * EMAIL WORKER
 * =========================================================
 */

function processQrEmailQueue() {

  const startTime =
    Date.now();


  const lock =
    LockService.getUserLock();


  try {

    if (
      !lock.tryLock(
        1000
      )
    ) {

      return;
    }


    const sheet =
      getOrCreateEmailQueueSheet();


    recoverStaleSendingRows(
      sheet
    );


    let processed = 0;
    let sent = 0;
    let failed = 0;


    while (

      processed <
        EMAIL_QUEUE.BATCH_SIZE &&

      hasPendingMainRows(
        sheet
      ) &&

      !isEmailWorkerNearTimeLimit(
        startTime
      )

    ) {

      const rowNumber =
        getNextQueueRow(
          sheet,
          "MAIN"
        );


      if (
        rowNumber === -1
      ) {
        break;
      }


      const result =
        processEmailQueueRow(
          sheet,
          rowNumber,
          startTime
        );


      processed++;


      if (
        result === "SENT"
      ) {
        sent++;
      }


      if (
        result === "FAILED"
      ) {
        failed++;
      }
    }


    if (
      !hasPendingMainRows(
        sheet
      ) &&
      processed <
        EMAIL_QUEUE.BATCH_SIZE &&
      !isEmailWorkerNearTimeLimit(
        startTime
      )
    ) {

      while (

        processed <
          EMAIL_QUEUE.BATCH_SIZE &&

        hasPendingRetryRows(
          sheet
        ) &&

        !isEmailWorkerNearTimeLimit(
          startTime
        )

      ) {

        const rowNumber =
          getNextQueueRow(
            sheet,
            "RETRY"
          );


        if (
          rowNumber === -1
        ) {
          break;
        }


        const result =
          processEmailQueueRow(
            sheet,
            rowNumber,
            startTime
          );


        processed++;


        if (
          result === "SENT"
        ) {
          sent++;
        }


        if (
          result === "FAILED"
        ) {
          failed++;
        }
      }
    }


    const counts =
      getAllEmailQueueCounts(
        sheet
      );


    if (

      counts.pending === 0 &&
      counts.retryPending === 0 &&
      counts.sending === 0

    ) {

      deleteEmailWorkerTriggers();


      console.log(
        "QR email queue completed. Sent: " +
        counts.sent +
        ", Failed: " +
        counts.failed
      );

    } else {

      ensureEmailWorkerTrigger();


      console.log(
        "QR email worker batch complete. " +
        "Processed: " +
        processed +
        ", Sent: " +
        sent +
        ", Failed: " +
        failed +
        ", Main pending: " +
        counts.pending +
        ", Retry pending: " +
        counts.retryPending
      );
    }


  } catch (error) {

    console.error(
      "QR email worker error: " +
      error.message
    );

  } finally {

    try {

      lock.releaseLock();

    } catch (ignore) {}
  }
}


/**
 * =========================================================
 * PROCESS ONE EMAIL
 * =========================================================
 */

function processEmailQueueRow(
  sheet,
  rowNumber,
  workerStartTime
) {

  const row =
    sheet
      .getRange(
        rowNumber,
        1,
        1,
        15
      )
      .getValues()[0];


  const currentStatus =
    String(
      row[9] || ""
    ).trim();


  if (
    currentStatus === "SENT" ||
    currentStatus === "FAILED"
  ) {

    return currentStatus;
  }


  const email =
    String(
      row[5] || ""
    ).trim();


  const studentName =
    String(
      row[6] || ""
    ).trim();


  const qrBase64 =
    String(
      row[7] || ""
    );


  const className =
    String(
      row[2] || ""
    ).trim();


  const sessionId =
    String(
      row[1] || ""
    ).trim();


  const session =
    getSession(
      sessionId
    );


  if (!session) {

    throw new Error(
      "Attendance session is invalid or expired for this email queue item."
    );
  }


  const date =
    String(
      session.date || ""
    ).trim();


  if (
    !/^\d{2}\/\d{2}\/\d{4}$/
      .test(date)
  ) {

    throw new Error(
      "Attendance session contains an invalid date."
    );
  }


  const roll =
    String(
      row[4] || ""
    ).trim();


  let attempts =
    Number(
      row[10] || 0
    );


  attempts++;


  sheet
    .getRange(
      rowNumber,
      10,
      1,
      4
    )
    .setValues([[
      "SENDING",
      attempts,
      "",
      ""
    ]]);


  sheet
    .getRange(
      rowNumber,
      15
    )
    .setValue(
      new Date()
    );


  try {

    if (
      !isValidEmail(
        email
      )
    ) {

      throw new Error(
        "Invalid student email address."
      );
    }


    if (!qrBase64) {

      throw new Error(
        "QR image is missing."
      );
    }


    const base64Data =
      qrBase64.replace(
        /^data:image\/png;base64,/,
        ""
      );


    const qrBlob =
      Utilities.newBlob(

        Utilities.base64Decode(
          base64Data
        ),

        "image/png",

        "attendance-" +
        className +
        "-" +
        roll +
        ".png"
      );


    const cid =
      "attendanceQRCode";


    const emailBody =

      "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;'>" +

      "<h2>Smart Attendance System</h2>" +

      "<p>Hello <b>" +
      escapeHtml(
        studentName
      ) +
      "</b>,</p>" +

      "<p>Your attendance QR code has been generated.</p>" +

      "<div style='background:#f4f7fb;padding:20px;border-radius:12px;'>" +

      "<p><b>Class:</b> " +
      escapeHtml(
        className
      ) +
      "</p>" +

      "<p><b>Roll Number:</b> " +
      escapeHtml(
        roll
      ) +
      "</p>" +

      "<p><b>Date:</b> " +
      escapeHtml(
        formatAttendanceDateForEmail(
          date
        )
      ) +
      "</p>" +

      "</div>" +

      "<div style='text-align:center;margin:25px 0;'>" +

      "<img " +
      "src='cid:" +
      cid +
      "' " +
      "width='250' " +
      "alt='Attendance QR Code' " +
      "style='display:block;margin:auto;'/>" +

      "</div>" +

      "<p>Please open this email on your phone and show this QR code to your teacher during attendance.</p>" +

      "<p><b>Important:</b> This QR code is intended only for today's attendance session.</p>" +

      "<p>Regards,<br>Smart Attendance System</p>" +

      "</div>";


    MailApp.sendEmail({

      to:
        email,

      subject:
        "Attendance QR Code - " +
        className +
        " (" +
        date +
        ")",

      htmlBody:
        emailBody,

      inlineImages: {

        [cid]:
          qrBlob
      }
    });


    sheet
      .getRange(
        rowNumber,
        10,
        1,
        4
      )
      .setValues([[
        "SENT",
        attempts,
        "",
        new Date()
      ]]);


    sheet
      .getRange(
        rowNumber,
        15
      )
      .setValue("");


    return "SENT";


  } catch (error) {

    const message =
      String(
        error &&
        error.message
          ? error.message
          : error
      );


    if (
      attempts >=
      EMAIL_QUEUE.MAX_RETRY_ATTEMPTS
    ) {

      sheet
        .getRange(
          rowNumber,
          10,
          1,
          4
        )
        .setValues([[
          "FAILED",
          attempts,
          message,
          ""
        ]]);


      sheet
        .getRange(
          rowNumber,
          15
        )
        .setValue("");

    } else {

      sheet
        .getRange(
          rowNumber,
          9,
          1,
          4
        )
        .setValues([[
          "RETRY",
          "PENDING",
          attempts,
          message
        ]]);


      sheet
        .getRange(
          rowNumber,
          15
        )
        .setValue("");
    }


    console.error(
      "QR email failed for roll " +
      roll +
      ": " +
      message
    );


    return "FAILED";
  }
}


/**
 * =========================================================
 * QUEUE HELPERS
 * =========================================================
 */

function getNextQueueRow(
  sheet,
  queueType
) {

  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {
    return -1;
  }


  const values =
    sheet
      .getRange(
        2,
        9,
        lastRow - 1,
        2
      )
      .getDisplayValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const type =
      String(
        values[i][0] || ""
      ).trim();


    const status =
      String(
        values[i][1] || ""
      ).trim();


    if (
      type === queueType &&
      status === "PENDING"
    ) {

      return i + 2;
    }
  }


  return -1;
}


function hasPendingMainRows(
  sheet
) {

  return hasPendingQueueRows(
    sheet,
    "MAIN"
  );
}


function hasPendingRetryRows(
  sheet
) {

  return hasPendingQueueRows(
    sheet,
    "RETRY"
  );
}


function hasPendingQueueRows(
  sheet,
  queueType
) {

  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {
    return false;
  }


  const values =
    sheet
      .getRange(
        2,
        9,
        lastRow - 1,
        2
      )
      .getDisplayValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (

      String(
        values[i][0]
      ).trim() ===
        queueType &&

      String(
        values[i][1]
      ).trim() ===
        "PENDING"

    ) {

      return true;
    }
  }


  return false;
}


/**
 * =========================================================
 * STALE SENDING RECOVERY
 * =========================================================
 */

function recoverStaleSendingRows(
  sheet
) {

  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {
    return;
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        15
      )
      .getValues();


  const now =
    Date.now();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const status =
      String(
        values[i][9] || ""
      ).trim();


    if (
      status !== "SENDING"
    ) {
      continue;
    }


    const startedAt =
      values[i][14];


    const timestamp =
      startedAt instanceof Date

        ? startedAt.getTime()

        : new Date(
            startedAt
          ).getTime();


    if (

      !isNaN(timestamp) &&

      now - timestamp >=
        EMAIL_QUEUE.STALE_SENDING_MS

    ) {

      const attempts =
        Number(
          values[i][10] || 0
        );


      if (
        attempts >=
        EMAIL_QUEUE.MAX_RETRY_ATTEMPTS
      ) {

        sheet
          .getRange(
            i + 2,
            10,
            1,
            4
          )
          .setValues([[
            "FAILED",
            attempts,
            "Previous email worker execution stopped while sending.",
            ""
          ]]);


        sheet
          .getRange(
            i + 2,
            15
          )
          .setValue("");

      } else {

        sheet
          .getRange(
            i + 2,
            9,
            1,
            4
          )
          .setValues([[
            "RETRY",
            "PENDING",
            attempts,
            "Previous email worker execution stopped while sending."
          ]]);


        sheet
          .getRange(
            i + 2,
            15
          )
          .setValue("");
      }
    }
  }
}


/**
 * =========================================================
 * WORKER TIME LIMIT
 * =========================================================
 */

function isEmailWorkerNearTimeLimit(
  startTime
) {

  return (
    Date.now() -
    startTime >=
    EMAIL_QUEUE.SAFE_RUNTIME_MS
  );
}


/**
 * =========================================================
 * SESSION QUEUE COUNTS
 * =========================================================
 */

function getEmailQueueCounts(
  sheet,
  sessionId
) {

  const lastRow =
    sheet.getLastRow();


  const counts = {

    total:
      0,

    sent:
      0,

    pending:
      0,

    retryPending:
      0,

    failed:
      0,

    sending:
      0
  };


  if (
    lastRow < 2
  ) {
    return counts;
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        10
      )
      .getDisplayValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      String(
        values[i][1]
      ).trim() !==
      sessionId
    ) {
      continue;
    }


    const queueType =
      String(
        values[i][8]
      ).trim();


    const status =
      String(
        values[i][9]
      ).trim();


    counts.total++;


    if (
      status === "SENT"
    ) {
      counts.sent++;
    }


    if (
      queueType === "MAIN" &&
      status === "PENDING"
    ) {
      counts.pending++;
    }


    if (
      queueType === "RETRY" &&
      status === "PENDING"
    ) {
      counts.retryPending++;
    }


    if (
      status === "FAILED"
    ) {
      counts.failed++;
    }


    if (
      status === "SENDING"
    ) {
      counts.sending++;
    }
  }


  return counts;
}


/**
 * =========================================================
 * ALL QUEUE COUNTS
 * =========================================================
 */

function getAllEmailQueueCounts(
  sheet
) {

  const lastRow =
    sheet.getLastRow();


  const counts = {

    total:
      0,

    sent:
      0,

    pending:
      0,

    retryPending:
      0,

    failed:
      0,

    sending:
      0
  };


  if (
    lastRow < 2
  ) {
    return counts;
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        10
      )
      .getDisplayValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const queueType =
      String(
        values[i][8]
      ).trim();


    const status =
      String(
        values[i][9]
      ).trim();


    counts.total++;


    if (
      status === "SENT"
    ) {
      counts.sent++;
    }


    if (
      queueType === "MAIN" &&
      status === "PENDING"
    ) {
      counts.pending++;
    }


    if (
      queueType === "RETRY" &&
      status === "PENDING"
    ) {
      counts.retryPending++;
    }


    if (
      status === "FAILED"
    ) {
      counts.failed++;
    }


    if (
      status === "SENDING"
    ) {
      counts.sending++;
    }
  }


  return counts;
}


/**
 * =========================================================
 * EMAIL WORKER TRIGGER
 * =========================================================
 */

function ensureEmailWorkerTrigger() {

  const triggers =
    ScriptApp.getProjectTriggers();

  const existing =
    triggers.filter(function(trigger) {

      return (
        trigger.getHandlerFunction() ===
        "processQrEmailQueue"
      );

    });

  /*
   * Keep exactly one worker trigger.
   */
  if (existing.length > 0) {

    for (
      let i = 1;
      i < existing.length;
      i++
    ) {

      try {
        ScriptApp.deleteTrigger(
          existing[i]
        );
      } catch (ignore) {}

    }

    return;
  }

  /*
   * Editor Add-ons cannot use
   * time-driven triggers more frequently
   * than once per hour.
   */
  ScriptApp
    .newTrigger(
      "processQrEmailQueue"
    )
    .timeBased()
    .everyHours(
      EMAIL_QUEUE.WORKER_INTERVAL_HOURS
    )
    .create();
}


function deleteEmailWorkerTriggers() {

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(trigger) {

        if (
          trigger
            .getHandlerFunction() ===
          "processQrEmailQueue"
        ) {

          try {

            ScriptApp.deleteTrigger(
              trigger
            );

          } catch (ignore) {}
        }
      }
    );
}

function testVerifyAndMarkPresent() {
  const session = getLatestActiveSessionForTest();

  if (!session) {
    SpreadsheetApp.getUi().alert(
      "Verify & Mark Present",
      "No active session found. Run Test Create Session first.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const result = executeVerifyAndMarkPresent({
    className: session.className,
    rollNumber: "123",
    date: session.date,
    sessionId: session.sessionId
  });

  SpreadsheetApp.getUi().alert(
    "Verify & Mark Present",
    JSON.stringify(result, null, 2),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function testFinalizeDay() {
  const session = getLatestActiveSessionForTest();

  if (!session) {
    SpreadsheetApp.getUi().alert(
      "Finalize Day",
      "No active session found. Run Test Create Session first.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const result = executeFinalizeDay({
    className: session.className,
    sessionId: session.sessionId
  });

  SpreadsheetApp.getUi().alert(
    "Finalize Day",
    JSON.stringify(result, null, 2),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function getLatestActiveSessionForTest() {
  const properties = PropertiesService.getUserProperties();
  const allProperties = properties.getProperties();

  let latestSession = null;

  Object.keys(allProperties).forEach(function(key) {
    if (!key.startsWith("SESSION_")) {
      return;
    }

    try {
      const session = JSON.parse(allProperties[key]);

      if (!session || !session.sessionId) {
        return;
      }

      // Use getSession() so expiry is checked as well.
      const validSession = getSession(session.sessionId);

      if (!validSession) {
        return;
      }

      if (
        !latestSession ||
        validSession.createdAt > latestSession.createdAt
      ) {
        latestSession = validSession;
      }

    } catch (error) {
      console.warn(
        "Invalid stored session:",
        key,
        error
      );
    }
  });

  return latestSession;
}

/**
 * =========================================================
 * ADD-ON COMMAND BRIDGE
 * =========================================================
 *
 * The sidebar periodically asks the backend:
 *
 * "Is there any command for me?"
 *
 * If a command exists, this function executes the
 * corresponding spreadsheet operation and sends the
 * result back to the backend.
 * =========================================================
 */


/**
 * Check backend for the next pending command
 * and execute it.
 */
function pollAndExecuteCommand() {

  const connection =
    getStoredConnection();

  if (!connection.connectionToken) {

    return {
      status: "error",
      code: "NOT_CONNECTED",
      message:
        "Smart Attendance connection token is missing."
    };
  }


  const response =
    backendRequest(
      BACKEND_CONFIG.NEXT_COMMAND_ENDPOINT,
      "GET",
      null,
      true
    );


  if (
    response.status !== "success"
  ) {

    return response;
  }


  const command =
    response.command;


  // No command waiting.
  if (!command) {

    return {
      status: "success",
      processed: false
    };
  }


  let result;

  try {

    result =
      executeAddonCommand(
        command
      );

  } catch (error) {

    result = {
      status: "error",
      code: "ADDON_EXECUTION_ERROR",
      message:
        error.message ||
        String(error)
    };
  }


  const commandSucceeded =
    result &&
    result.status === "success";


  const resultPayload = {

    commandId:
      command.id,

    status:
      commandSucceeded
        ? "COMPLETED"
        : "FAILED",

    result:
      commandSucceeded
        ? result
        : null,

    errorMessage:
      commandSucceeded
        ? null
        : (
            result &&
            result.message
          ) ||
          "Add-on command failed."
  };


  const submitResponse =
    backendRequest(
      BACKEND_CONFIG.COMMAND_RESULT_ENDPOINT,
      "POST",
      resultPayload,
      true
    );


  return {

    status:
      submitResponse.status === "success"
        ? "success"
        : "error",

    processed:
      true,

    commandId:
      command.id,

    commandType:
      command.type,

    result:
      result,

    backend:
      submitResponse
  };
}


/**
 * =========================================================
 * COMMAND DISPATCHER
 * =========================================================
 *
 * Converts backend command types into the existing
 * spreadsheet functions.
 * =========================================================
 */

function executeAddonCommand(
  command
) {

  if (
    !command ||
    !command.type
  ) {

    return {
      status: "error",
      code: "INVALID_COMMAND",
      message:
        "Invalid Add-on command."
    };
  }


  const data =
    command.payload || {};


  switch (
    command.type
  ) {
case "SYNC_CLASSES":

    return executeSyncClasses(
        data
    );
    case "FETCH_STUDENTS":

      return executeFetchStudents(
        data
      );


    case "CREATE_SESSION":

      return executeCreateSession(
        data
      );


    case "MARK_PRESENT":

      return executeVerifyAndMarkPresent(
        data
      );


    case "FINALIZE_DAY":

      return executeFinalizeDay(
        data
      );


    case "GET_ATTENDANCE_STATUS":

      return executeGetAttendanceStatus(
        data
      );


    case "SEND_EMAILS":

      return executeSendEmails(
        data
      );


    case "GET_EMAIL_QUEUE_STATUS":

      return executeGetEmailQueueStatus(
        data
      );


    default:

      return {
        status: "error",
        code: "UNKNOWN_COMMAND",
        message:
          "Unknown Add-on command type: " +
          command.type
      };
  }
}


/**
 * =========================================================
 * MANUAL COMMAND TEST
 * =========================================================
 *
 * This is useful before connecting React.
 *
 * It checks whether the Add-on can successfully
 * communicate with the command API.
 * =========================================================
 */

function testCommandBridge() {

  const result =
    pollAndExecuteCommand();


  SpreadsheetApp
    .getUi()
    .alert(
      "Command Bridge",
      JSON.stringify(
        result,
        null,
        2
      ),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );


  return result;
}

