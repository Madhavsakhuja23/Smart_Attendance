const CONFIG = {
  // Attendance dates must already exist in the sheet.
  DATE_FORMAT: "dd/MM/yyyy",

  // Dynamic detector scans the first N rows for headers/date rows.
  DETECTION_SCAN_ROWS: 20,

  // Sessions remain valid for this many hours.
  SESSION_HOURS: 12
};

/**
 * =========================================================
 * PHASE 1B - QR EMAIL QUEUE CONFIGURATION
 * =========================================================
 *
 * QR emails are NOT sent to all students in one execution.
 * A persistent queue is stored in a hidden Google Sheet.
 *
 * MAIN queue:
 *   Every student starts here as PENDING.
 *
 * RETRY queue:
 *   A failed email is moved here after the MAIN queue is
 *   completely processed.
 *
 * Each worker execution sends at most 50 emails and also
 * stops early if the safety time limit is reached.
 */
const EMAIL_QUEUE = {
  SHEET_NAME: "_SMART_ATTENDANCE_EMAIL_QUEUE",
  BATCH_SIZE: 150,
  // Stay comfortably below the Apps Script execution limit.
  SAFE_RUNTIME_MS: 4 * 60 * 1000,
  MAX_RETRY_ATTEMPTS: 3,
  WORKER_INTERVAL_MINUTES: 1,
  STALE_SENDING_MS: 10 * 60 * 1000
};


/**
 * =========================================================
 * MAIN API
 * =========================================================
 */

function doPost(e) {

  try {

    if (!e || !e.postData || !e.postData.contents) {

      return jsonResponse({
        status: "error",
        message: "No request body received."
      });

    }

    const data = JSON.parse(e.postData.contents);

    const action =
      String(data.action || "").trim();

    switch (action) {

      case "fetchStudents":
        return fetchStudents(data);

      case "createSession":
        return createSession(data);

      case "sendEmails":
        return sendEmails(data);

      case "verifyAndMarkPresent":
        return verifyAndMarkPresent(data);

      case "finalizeDay":
        return finalizeDay(data);

      case "getEmailQueueStatus":
        return getEmailQueueStatus(data);
      case "getAttendanceStatus":
        return getAttendanceStatus(data);

      case "getClasses":
        return getClasses();

      // Manual/recovery entry point. The normal worker is run by a
      // time-driven Apps Script trigger, not by the frontend.
      case "processEmailQueue":
        return processQrEmailQueue();

      default:

        return jsonResponse({
          status: "error",
          message: "Invalid action: " + action
        });
    }

  } catch (error) {

    console.error(error);

    return jsonResponse({
      status: "error",
      message: error.message || String(error)
    });
  }
}

/**
 * =========================================================
 * DYNAMIC SHEET STRUCTURE DETECTION
 * =========================================================
 *
 * The old version assumed:
 *   B = Roll No.
 *   C = Name
 *   D = Email
 *   F onward = attendance dates
 *   Row 3 onward = students
 *
 * This version discovers those locations from the sheet itself.
 * The detector is intentionally conservative:
 *
 *   - Roll/Student ID and Name must be different columns.
 *   - "Student" alone is NOT a Name alias because it can incorrectly match
 *     "StudentID".
 *   - If Email is present as a detected column, a student row must contain
 *     a valid email address.
 *   - Random text/instruction rows below the student list are ignored.
 *
 * Attendance date columns are discovered from existing date values; this
 * script never creates a missing date column.
 */

function normalizeHeader(value) {
  return String(value == null ? "" : value)
    .toLowerCase()
    .trim()
    .replace(/[\u00ad]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function headerMatches(value, aliases) {
  const h = normalizeHeader(value);
  if (!h) return false;

  // IMPORTANT:
  // Do NOT use loose substring matching here. For example, the old
  // "student" alias matched "StudentID", causing StudentID to be detected
  // as BOTH Roll/ID and Name. Header detection must be semantic and strict.

  return aliases.some(function(alias) {
    const a = normalizeHeader(alias);
    return h === a;
  });
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

function looksLikeDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return true;
  const text = String(value == null ? "" : value).trim();
  if (!text) return false;
  const normalized = normalizeDate(value);
  return /^\d{2}\/\d{2}\/\d{4}$/.test(normalized);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function findHeaderColumn(rowValues, aliases) {
  for (let c = 0; c < rowValues.length; c++) {
    if (headerMatches(rowValues[c], aliases)) return c + 1;
  }
  return -1;
}

function findDateHeaderRow(values, maxRows) {
  let best = { row: -1, count: 0 };

  const rowsToScan = Math.min(values.length, maxRows);
  for (let r = 0; r < rowsToScan; r++) {
    let count = 0;
    for (let c = 0; c < values[r].length; c++) {
      if (looksLikeDate(values[r][c])) count++;
    }
    if (count > best.count) best = { row: r + 1, count: count };
  }

  return best.row;
}

function detectSheetSchema(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    throw new Error("Sheet '" + sheet.getName() + "' is empty.");
  }

  const scanRows = Math.min(lastRow, CONFIG.DETECTION_SCAN_ROWS);
  const values = sheet.getRange(1, 1, scanRows, lastColumn).getDisplayValues();
  const rawValues = sheet.getRange(1, 1, scanRows, lastColumn).getValues();

  // Score each early row as a possible student-header row.
  let bestHeader = null;
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    const rollCol = findHeaderColumn(row, HEADER_ALIASES.roll);
    const nameCol = findHeaderColumn(row, HEADER_ALIASES.name);
    const emailCol = findHeaderColumn(row, HEADER_ALIASES.email);

    let score = 0;
    if (rollCol !== -1) score += 3;
    if (nameCol !== -1) score += 3;
    if (emailCol !== -1) score += 2;

    // A valid identity schema must have Roll/Student ID and Name in
    // different columns. Prefer a row that also contains Email.
    const identityColumnsAreDistinct =
      rollCol !== -1 &&
      nameCol !== -1 &&
      rollCol !== nameCol &&
      (emailCol === -1 ||
        (emailCol !== rollCol && emailCol !== nameCol));

    if (
      identityColumnsAreDistinct &&
      score > 0 &&
      (!bestHeader || score > bestHeader.score)
    ) {
      bestHeader = {
        row: r + 1,
        rollColumn: rollCol,
        nameColumn: nameCol,
        emailColumn: emailCol,
        score: score
      };
    }
  }

  // Some attendance sheets put dates in row 1 and labels in the same row;
  // others have a separate student header row. If no identity headers exist,
  // retain a safe fallback based on the legacy structure only for detection,
  // not as a hardcoded runtime requirement.
  const dateHeaderRow = findDateHeaderRow(values, CONFIG.DETECTION_SCAN_ROWS);

  if (!bestHeader) {
    // Try to infer columns from the first few rows using data patterns.
    // This supports sheets where the column headings are missing.
    const maxDataScan = Math.min(lastRow, CONFIG.DETECTION_SCAN_ROWS + 10);
    const sample = sheet.getRange(1, 1, maxDataScan, lastColumn).getDisplayValues();

    let candidate = { score: -1 };
    for (let c = 0; c < lastColumn; c++) {
      let numeric = 0;
      let text = 0;
      let emails = 0;
      for (let r = 0; r < sample.length; r++) {
        const v = String(sample[r][c] || "").trim();
        if (/^\d+$/.test(v)) numeric++;
        if (v && !/^\d+$/.test(v)) text++;
        if (isValidEmail(v)) emails++;
      }
      const score = numeric * 2 + text + emails * 2;
      if (score > candidate.score) candidate = { column: c + 1, score: score };
    }

    // If headers are absent, we require at least a plausible ID column.
    if (!candidate.column) {
      throw new Error("Could not detect student columns in sheet '" + sheet.getName() + "'. Please add clear headers such as Roll No, Name and Email.");
    }

    throw new Error("Could not reliably detect Roll/Student ID, Name and Email headers in sheet '" + sheet.getName() + "'. Please use recognizable headers.");
  }

  // Require roll + name.
  if (bestHeader.rollColumn === -1 || bestHeader.nameColumn === -1) {
    throw new Error(
      "Could not detect both a Roll/Student ID column and a Name column in sheet '" +
      sheet.getName() +
      "'."
    );
  }

  // Never allow the same column to be used for both Roll/Student ID and Name.
  // This is a direct guard against false detection such as:
  // StudentID → Roll
  // StudentID → Name
  if (bestHeader.rollColumn === bestHeader.nameColumn) {
    throw new Error(
      "The Roll/Student ID and Name columns were detected as the same column in sheet '" +
      sheet.getName() +
      "'. Please use clear headers such as Roll No, Student ID and Name."
    );
  }

  const dataStartRow = Math.max(bestHeader.row + 1, dateHeaderRow > 0 ? dateHeaderRow + 1 : bestHeader.row + 1);

  // Discover every existing date column, regardless of where it starts.
  const dateColumns = [];
  if (dateHeaderRow > 0) {
    const dateRow = values[dateHeaderRow - 1];
    const rawDateRow = rawValues[dateHeaderRow - 1];
    for (let c = 0; c < dateRow.length; c++) {
      let normalized = "";
      if (rawDateRow && rawDateRow[c] instanceof Date && !isNaN(rawDateRow[c].getTime())) {
        normalized = Utilities.formatDate(rawDateRow[c], "Asia/Kolkata", "dd/MM/yyyy");
      } else {
        normalized = normalizeDate(dateRow[c]);
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
        dateColumns.push({ column: c + 1, date: normalized, rawText: String(dateRow[c] || "").trim() });
      }
    }
  }

  // If dates weren't found in the same top rows, scan all columns in the
  // detected date row directly (useful when the sheet is wider than the scan).
  if (dateHeaderRow > 0 && dateColumns.length === 0) {
    const fullDateRow = sheet.getRange(dateHeaderRow, 1, 1, lastColumn).getDisplayValues()[0];
    const fullRawDateRow = sheet.getRange(dateHeaderRow, 1, 1, lastColumn).getValues()[0];
    for (let c = 0; c < fullDateRow.length; c++) {
      let normalized = "";
      if (fullRawDateRow && fullRawDateRow[c] instanceof Date && !isNaN(fullRawDateRow[c].getTime())) {
        normalized = Utilities.formatDate(fullRawDateRow[c], "Asia/Kolkata", "dd/MM/yyyy");
      } else {
        normalized = normalizeDate(fullDateRow[c]);
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
        dateColumns.push({ column: c + 1, date: normalized, rawText: String(fullDateRow[c] || "").trim() });
      }
    }
  }

  if (dateHeaderRow <= 0) {
    // No date row means the sheet cannot currently be used for attendance.
    // We still return the schema so fetchStudents can work; create/status will
    // report DATE_NOT_FOUND.
  }

  // Find actual student rows.
  //
  // IMPORTANT:
  // We must NOT treat every non-empty row after the header as a student.
  // Sheets can contain legends, instructions, totals, notes, or random text
  // below the real student list.
  //
  // If an Email column is detected, a valid email is a strong student-row
  // signal. We therefore require ID + Name + valid Email.
  //
  // If the sheet genuinely has no Email column, we fall back to ID + Name,
  // but still reject obvious header rows.
  const studentRows = [];

  if (lastRow >= dataStartRow) {
    const data = sheet
      .getRange(
        dataStartRow,
        1,
        lastRow - dataStartRow + 1,
        lastColumn
      )
      .getDisplayValues();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      const id =
        String(row[bestHeader.rollColumn - 1] || "").trim();

      const name =
        String(row[bestHeader.nameColumn - 1] || "").trim();

      const email =
        bestHeader.emailColumn > 0
          ? String(row[bestHeader.emailColumn - 1] || "").trim()
          : "";

      if (!id || !name) continue;

      // Reject rows that themselves look like column headers.
      if (
        headerMatches(id, HEADER_ALIASES.roll) ||
        headerMatches(name, HEADER_ALIASES.name) ||
        (bestHeader.emailColumn > 0 &&
          headerMatches(email, HEADER_ALIASES.email))
      ) {
        continue;
      }

      // If an email column exists, require a real email address.
      // This prevents rows such as:
      //   efv | dbf | cbfdr
      // or other notes/legend rows from becoming students.
      if (bestHeader.emailColumn > 0 && !isValidEmail(email)) {
        continue;
      }

      // The ID must contain at least one meaningful identifier character.
      // Numeric IDs such as 123 are accepted, as are normal alphanumeric
      // IDs such as STU123 or A-101.
      if (!/[a-z0-9]/i.test(id)) continue;

      studentRows.push(dataStartRow + i);
    }
  }

  if (studentRows.length === 0) {
    throw new Error("No student records could be detected in sheet '" + sheet.getName() + "'. Check the Roll/Student ID and Name columns.");
  }

  return {
    sheetName: sheet.getName(),
    headerRow: bestHeader.row,
    dateHeaderRow: dateHeaderRow,
    dataStartRow: dataStartRow,
    rollColumn: bestHeader.rollColumn,
    nameColumn: bestHeader.nameColumn,
    emailColumn: bestHeader.emailColumn,
    dateColumns: dateColumns,
    studentRows: studentRows
  };
}

function getLastStudentRow(sheet) {
  const schema = detectSheetSchema(sheet);
  return schema.studentRows.length ? schema.studentRows[schema.studentRows.length - 1] : schema.dataStartRow - 1;
}

function getStudentRecords(sheet, schema) {
  const records = [];
  if (!schema.studentRows.length) return records;

  const lastColumn = sheet.getLastColumn();
  const minRow = schema.studentRows[0];
  const maxRow = schema.studentRows[schema.studentRows.length - 1];
  const values = sheet.getRange(minRow, 1, maxRow - minRow + 1, lastColumn).getDisplayValues();
  const rowSet = {};
  schema.studentRows.forEach(function(r) { rowSet[r] = true; });

  for (let rowNumber = minRow; rowNumber <= maxRow; rowNumber++) {
    if (!rowSet[rowNumber]) continue;
    const row = values[rowNumber - minRow];
    records.push({
      rowNumber: rowNumber,
      roll: String(row[schema.rollColumn - 1] || "").trim(),
      name: String(row[schema.nameColumn - 1] || "").trim(),
      email: schema.emailColumn > 0 ? String(row[schema.emailColumn - 1] || "").trim() : ""
    });
  }
  return records;
}

function getSchemaForSession(sheet, session) {
  if (session && session.schema) return session.schema;
  return detectSheetSchema(sheet);
}

/**
 * =========================================================
 * GET CLASSES
 * =========================================================
 */

function getClasses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const classes = ss.getSheets()
    .map(function(sheet) {
      return sheet.getName().trim();
    })
    .filter(function(name) {
      return (
        name !== "" &&
        name !== EMAIL_QUEUE.SHEET_NAME
      );
    });

  return jsonResponse({
    status: "success",
    classes: classes
  });
}


/**
 * =========================================================
 * 1. FETCH STUDENTS
 * =========================================================
 */

function fetchStudents(data) {
  const className = sanitizeClassName(data.className);
  const sheet = getClassSheet(className);

  if (!sheet) {
    return jsonResponse({
      status: "error",
      message: "Sheet tab '" + className + "' not found."
    });
  }

  let schema;
  try {
    schema = detectSheetSchema(sheet);
  } catch (error) {
    return jsonResponse({
      status: "error",
      code: "STRUCTURE_NOT_DETECTED",
      message: error.message
    });
  }

  const records = getStudentRecords(sheet, schema);
  const students = records.map(function(student) {
    return {
      roll: student.roll,
      name: student.name,
      email: student.email,
      status: "PENDING"
    };
  });

  return jsonResponse({
    status: "success",
    className: className,
    date: getTodayDate(),
    students: students,
    detectedStructure: {
      headerRow: schema.headerRow,
      dateHeaderRow: schema.dateHeaderRow,
      dataStartRow: schema.dataStartRow,
      rollColumn: schema.rollColumn,
      nameColumn: schema.nameColumn,
      emailColumn: schema.emailColumn,
      studentCount: students.length
    }
  });
}


/**
 * =========================================================
 * 2. CREATE SESSION
 * =========================================================
 */

/**
 * Build the student index once per attendance session.
 *
 * Example:

 *
 * 101 → 2
 * 102 → 3
 * 103 → 4
 *
 * This index is then used by every QR scan.
 * =========================================================
 */

function createSession(data) {
  const className = sanitizeClassName(data.className);
  const sheet = getClassSheet(className);

  if (!sheet) {
    return jsonResponse({
      status: "error",
      message: "Sheet tab '" + className + "' not found."
    });
  }

  let schema;
  try {
    schema = detectSheetSchema(sheet);
  } catch (error) {
    return jsonResponse({
      status: "error",
      code: "STRUCTURE_NOT_DETECTED",
      message: error.message
    });
  }

  const date = getTodayDate();
  const dateColumn = findDateColumn(sheet, date, schema);

  if (dateColumn === -1) {
    return jsonResponse({
      status: "error",
      code: "DATE_NOT_FOUND",
      message:
        "Today's date " + date +
        " was not found in the existing attendance date row of " + className +
        ". Please add the date to the attendance sheet first."
    });
  }

  const studentRecords = getStudentRecords(sheet, schema);
  const studentIndex = {};
  studentRecords.forEach(function(student) {
    if (!student.roll) return;
    studentIndex[student.roll] = student.rowNumber;
  });

  if (Object.keys(studentIndex).length === 0) {
    return jsonResponse({
      status: "error",
      code: "NO_STUDENTS",
      message: "No student records found."
    });
  }

  const sessionId = Utilities.getUuid();
  const session = {
    sessionId: sessionId,
    className: className,
    date: date,
    dateColumn: dateColumn,
    studentIndex: studentIndex,
    schema: schema,
    createdAt: new Date().getTime(),
    finalized: false
  };

  saveSession(session);

  return jsonResponse({
    status: "success",
    session: session
  });
}


/**
 * =========================================================
 * 3. SEND QR EMAILS (QUEUE + BATCH WORKER)
 * =========================================================
 */

function sendEmails(data) {

  const className =
    sanitizeClassName(data.className);

  // The attendance session is the authoritative source for the date.
  // Do not trust/parse the date sent by the frontend.
  // Any client-supplied date is intentionally ignored.
  // The session date below is authoritative.

  const sessionId =
    String(data.sessionId || "").trim();

  const students =
    data.students;

  if (
    !className ||
    !sessionId ||
    !Array.isArray(students)
  ) {
    return jsonResponse({
      status: "error",
      message: "Invalid email dispatch request."
    });
  }

  // ==========================================
  // VERIFY SESSION
  // ==========================================
  const session =
    getSession(sessionId);

  if (!session) {
    return jsonResponse({
      status: "error",
      code: "INVALID_SESSION",
      message: "Attendance session is invalid or expired."
    });
  }

  if (session.className !== className) {
    return jsonResponse({
      status: "error",
      code: "WRONG_CLASS",
      message: "Session does not belong to this class."
    });
  }

  // IMPORTANT:
  // Always use the date stored in the server-side session.
  // This prevents a browser/JavaScript Date conversion such as
  // 11/09/2026 -> Mon Nov 09 2026 from corrupting the email/queue date.
  const date = normalizeDate(session.date);

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return jsonResponse({
      status: "error",
      code: "INVALID_SESSION_DATE",
      message: "Attendance session contains an invalid date."
    });
  }

  if (session.finalized) {
    return jsonResponse({
      status: "error",
      code: "SESSION_CLOSED",
      message: "Attendance session is already closed."
    });
  }

  const sheet =
    getClassSheet(className);

  if (!sheet) {
    return jsonResponse({
      status: "error",
      message: "Class sheet not found."
    });
  }

  // ==========================================
  // BUILD OFFICIAL STUDENT MAP
  // ==========================================
  let schema;

  try {
    schema =
      getSchemaForSession(sheet, session);
  } catch (error) {
    return jsonResponse({
      status: "error",
      code: "STRUCTURE_NOT_DETECTED",
      message: error.message
    });
  }

  const studentMap = {};

  getStudentRecords(sheet, schema)
    .forEach(function(student) {

      if (!student.roll) return;

      studentMap[student.roll] =
        student;
    });

  // ==========================================
  // CREATE/RESET QUEUE
  // ==========================================
  const queueLock =
    LockService.getScriptLock();

  try {

    queueLock.waitLock(15000);

    const queueSheet =
      getOrCreateEmailQueueSheet();

    /*
     * If the same session already has a queue,
     * do not create duplicate emails.
     *
     * The frontend can safely call sendEmails
     * again without adding another copy of the
     * same student to the queue.
     */
    const existing =
      findEmailQueueJob(queueSheet, sessionId);

    if (existing) {

      ensureEmailWorkerTrigger();

      const counts =
        getEmailQueueCounts(
          queueSheet,
          sessionId
        );

      return jsonResponse({
        status: "success",
        message: "QR email queue already exists. Sending will continue in batches.",
        sessionId: sessionId,
        queueId: existing.queueId,
        queued: counts.total,
        sent: counts.sent,
        pending: counts.pending,
        retryPending: counts.retryPending,
        failed: counts.failed,
        sending: counts.sending,
        complete:
          counts.pending === 0 &&
          counts.retryPending === 0 &&
          counts.sending === 0
      });
    }

    const queueId =
      Utilities.getUuid();

    const rows = [];

    students.forEach(function(student) {

      const roll =
        String(student.roll || "").trim();

      if (!roll) return;

      const officialStudent =
        studentMap[roll];

      /*
       * The queue is based on the official spreadsheet
       * record, not on a name/email supplied by the client.
       */
      if (!officialStudent) {

        rows.push([
          queueId,
          sessionId,
          className,
          date,
          roll,
          "",
          String(student.name || "").trim(),
          String(student.qrBase64 || ""),
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
          officialStudent.email || ""
        ).trim();

      const qrBase64 =
        String(
          student.qrBase64 || ""
        );

      /*
       * We still put invalid records into the queue so
       * the result is visible and the valid students can
       * continue. Invalid records go directly to FAILED.
       */
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

      if (!isValidEmail(email)) {

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
        new Date()
      ]);
    });

    if (!rows.length) {

      return jsonResponse({
        status: "error",
        code: "NO_EMAIL_RECIPIENTS",
        message: "No students were supplied for QR email sending."
      });
    }

    /*
     * Queue columns:
     *
     * A  queueId
     * B  sessionId
     * C  className
     * D  date
     * E  roll
     * F  email
     * G  studentName
     * H  qrBase64
     * I  queueType (MAIN / RETRY)
     * J  status (PENDING / SENDING / SENT / FAILED)
     * K  attempts
     * L  lastError
     * M  sentAt
     * N  createdAt
 * O  startedAt
     */
    queueSheet
      .getRange(
        queueSheet.getLastRow() + 1,
        1,
        rows.length,
        rows[0].length
      )
      .setValues(rows);

    queueSheet.hideSheet();

    /*
     * Ensure background trigger is set in case multiple batches are needed.
     */
    ensureEmailWorkerTrigger();

    /*
     * Process the first batch immediately in-memory so 100+ emails
     * are sent right now without waiting 1-2 minutes for Google's trigger.
     */
    try {
      processQrEmailQueue();
    } catch (workerErr) {
      console.error("Immediate worker execution error:", workerErr);
    }

    const counts =
      getEmailQueueCounts(
        queueSheet,
        sessionId
      );

    const isComplete =
      counts.total > 0 &&
      counts.pending === 0 &&
      counts.retryPending === 0 &&
      counts.sending === 0;

    return jsonResponse({
      status: "success",
      message: isComplete
        ? "All QR emails sent successfully!"
        : "QR email sending started. Batches are processing rapidly.",
      sessionId: sessionId,
      queueId: queueId,
      queued: counts.total,
      sent: counts.sent,
      pending: counts.pending,
      retryPending: counts.retryPending,
      failed: counts.failed,
      batchSize: EMAIL_QUEUE.BATCH_SIZE,
      complete: isComplete
    });

  } finally {

    try {
      queueLock.releaseLock();
    } catch (ignore) {}
  }
}


/**
 * =========================================================
 * PHASE 1B - EMAIL QUEUE SHEET
 * =========================================================
 */

function getOrCreateEmailQueueSheet() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    ss.getSheetByName(
      EMAIL_QUEUE.SHEET_NAME
    );

  if (!sheet) {

    sheet =
      ss.insertSheet(
        EMAIL_QUEUE.SHEET_NAME
      );

    sheet.getRange(1, 1, 1, 15)
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

    sheet.setFrozenRows(1);

    try {
      sheet.hideSheet();
    } catch (ignore) {}
  }

  return sheet;
}


/**
 * Return the existing queue job for a session.
 * This prevents duplicate queue creation if the frontend
 * retries the send request.
 */
function findEmailQueueJob(
  sheet,
  sessionId
) {

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
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

  for (let i = 0; i < values.length; i++) {

    if (
      String(values[i][1]).trim() ===
      sessionId
    ) {

      return {
        queueId:
          String(values[i][0]).trim()
      };
    }
  }

  return null;
}


/**
 * =========================================================
 * PHASE 1B - EMAIL WORKER
 * =========================================================
 *
 * IMPORTANT:
 *
 * This function is called repeatedly by a time-driven
 * Apps Script trigger.
 *
 * One execution NEVER tries to process the entire queue.
 *
 * Primary queue is processed first.
 * Only after MAIN has no PENDING/SENDING records do we
 * process RETRY records.
 */
/**
 * =========================================================
 * GET EMAIL QUEUE STATUS
 * =========================================================
 *
 * Returns the current email sending progress for one
 * attendance session.
 *
 * Status meanings:
 *
 * SENT     = email successfully sent
 * FAILED   = permanently failed after retries
 * PENDING  = waiting to be processed
 * SENDING  = currently being processed
 */
function getEmailQueueStatus(data) {

  const sessionId =
    String(data.sessionId || "").trim();

  if (!sessionId) {
    return jsonResponse({
      status: "error",
      code: "INVALID_SESSION_ID",
      message: "Session ID is required."
    });
  }


  const sheet =
    getOrCreateEmailQueueSheet();


  const counts =
    getEmailQueueCounts(
      sheet,
      sessionId
    );


  /*
   * A queue is complete when nothing is:
   *
   * PENDING
   * RETRY/PENDING
   * SENDING
   *
   * FAILED is considered completed because
   * it has exhausted its retry attempts.
   */
  const complete =
    counts.total > 0 &&
    counts.pending === 0 &&
    counts.retryPending === 0 &&
    counts.sending === 0;


  return jsonResponse({

    status: "success",

    sessionId: sessionId,

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
  });
}

function processQrEmailQueue() {
  const startTime = new Date().getTime();
  const lock = LockService.getScriptLock();

  try {
    /*
     * If another worker is already running, do nothing.
     */
    if (!lock.tryLock(1000)) {
      return;
    }

    const sheet = getOrCreateEmailQueueSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      deleteEmailWorkerTriggers();
      return;
    }

    /*
     * High-speed optimization:
     * Read the ENTIRE queue table into memory once with a single sheet call.
     * All status changes and retry tracking are done in memory, avoiding
     * hundreds of slow SpreadsheetApp API roundtrips.
     */
    const range = sheet.getRange(2, 1, lastRow - 1, 15);
    const rows = range.getValues();

    // 1. Recover records that were left in SENDING
    const now = new Date().getTime();
    for (let i = 0; i < rows.length; i++) {
      const status = String(rows[i][9] || "").trim();
      if (status === "SENDING") {
        const startedAt = rows[i][14];
        const timestamp =
          startedAt instanceof Date
            ? startedAt.getTime()
            : new Date(startedAt).getTime();

        if (!isNaN(timestamp) && now - timestamp >= EMAIL_QUEUE.STALE_SENDING_MS) {
          const attempts = Number(rows[i][10] || 0);
          if (attempts >= EMAIL_QUEUE.MAX_RETRY_ATTEMPTS) {
            rows[i][9] = "FAILED";
            rows[i][11] = "Previous email worker execution stopped while sending.";
          } else {
            rows[i][8] = "RETRY";
            rows[i][9] = "PENDING";
            rows[i][11] = "Previous email worker execution stopped while sending.";
          }
          rows[i][14] = "";
        }
      }
    }

    let processed = 0;
    let sent = 0;
    let failed = 0;

    function processRowInMemory(i) {
      const className = String(rows[i][2] || "").trim();
      const roll = String(rows[i][4] || "").trim();
      const email = String(rows[i][5] || "").trim();
      const studentName = String(rows[i][6] || "").trim();
      const qrBase64 = String(rows[i][7] || "");
      let attempts = Number(rows[i][10] || 0) + 1;
      rows[i][10] = attempts;
      rows[i][14] = new Date();

      try {
        if (!isValidEmail(email)) {
          throw new Error("Invalid student email address.");
        }

        if (!qrBase64) {
          throw new Error("QR image is missing.");
        }

        const base64Data = qrBase64.replace(/^data:image\/png;base64,/, "");
        const qrBlob = Utilities.newBlob(
          Utilities.base64Decode(base64Data),
          "image/png",
          "attendance-" + className + "-" + roll + ".png"
        );

        const cid = "attendanceQRCode";
        const emailBody =
          "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;'>" +
          "<h2>Smart Attendance System</h2>" +
          "<p>Hello <b>" + escapeHtml(studentName) + "</b>,</p>" +
          "<p>Your attendance QR code has been generated.</p>" +
          "<div style='background:#f4f7fb;padding:20px;border-radius:12px;'>" +
          "<p><b>Class:</b> " + escapeHtml(className) + "</p>" +
          "<p><b>Roll Number:</b> " + escapeHtml(roll) + "</p>" +
          "</div>" +
          "<div style='text-align:center;margin:25px 0;'>" +
          "<img src='cid:" + cid + "' width='250' alt='Attendance QR Code' style='display:block;margin:auto;'/>" +
          "</div>" +
          "<p>Please open this email on your phone and show this QR code to your teacher during attendance.</p>" +
          "<p><b>Important:</b> This QR code is intended only for today's attendance session.</p>" +
          "<p>Regards,<br>Smart Attendance System</p>" +
          "</div>";

        MailApp.sendEmail({
          to: email,
          subject: "Attendance QR Code - " + className,
          htmlBody: emailBody,
          inlineImages: {
            [cid]: qrBlob
          }
        });

        rows[i][9] = "SENT";
        rows[i][11] = "";
        rows[i][12] = new Date();
        rows[i][14] = "";
        sent++;
      } catch (error) {
        const message = String(error && error.message ? error.message : error);
        if (attempts >= EMAIL_QUEUE.MAX_RETRY_ATTEMPTS) {
          rows[i][9] = "FAILED";
          rows[i][11] = message;
          rows[i][14] = "";
          failed++;
        } else {
          rows[i][8] = "RETRY";
          rows[i][9] = "PENDING";
          rows[i][11] = message;
          rows[i][14] = "";
        }
        console.error("QR email failed for roll " + roll + ": " + message);
      }
      processed++;
    }

    /*
     * STAGE 1: MAIN QUEUE
     */
    for (let i = 0; i < rows.length; i++) {
      if (processed >= EMAIL_QUEUE.BATCH_SIZE || isEmailWorkerNearTimeLimit(startTime)) {
        break;
      }
      const queueType = String(rows[i][8] || "").trim();
      const status = String(rows[i][9] || "").trim();

      if (queueType === "MAIN" && status === "PENDING") {
        processRowInMemory(i);
      }
    }

    /*
     * STAGE 2: RETRY QUEUE (only when MAIN has no remaining PENDING)
     */
    const hasMoreMain = rows.some(function(r) {
      return String(r[8]).trim() === "MAIN" && String(r[9]).trim() === "PENDING";
    });

    if (!hasMoreMain) {
      for (let i = 0; i < rows.length; i++) {
        if (processed >= EMAIL_QUEUE.BATCH_SIZE || isEmailWorkerNearTimeLimit(startTime)) {
          break;
        }
        const queueType = String(rows[i][8] || "").trim();
        const status = String(rows[i][9] || "").trim();

        if (queueType === "RETRY" && status === "PENDING") {
          processRowInMemory(i);
        }
      }
    }

    /*
     * Write back ALL updated rows in ONE single batch write.
     */
    range.setValues(rows);

    /*
     * Calculate summary in memory
     */
    let remainingPending = 0;
    let remainingRetry = 0;
    let remainingSending = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < rows.length; i++) {
      const qType = String(rows[i][8] || "").trim();
      const st = String(rows[i][9] || "").trim();
      if (st === "SENT") totalSent++;
      else if (st === "FAILED") totalFailed++;
      else if (st === "SENDING") remainingSending++;
      else if (st === "PENDING") {
        if (qType === "MAIN") remainingPending++;
        else if (qType === "RETRY") remainingRetry++;
      }
    }

    if (remainingPending === 0 && remainingRetry === 0 && remainingSending === 0) {
      deleteEmailWorkerTriggers();
      console.log("QR email queue completed. Sent: " + totalSent + ", Failed: " + totalFailed);
    } else {
      ensureEmailWorkerTrigger();
      console.log(
        "QR email worker batch complete. Processed: " + processed +
        ", Sent: " + sent + ", Failed: " + failed +
        ", Main pending: " + remainingPending +
        ", Retry pending: " + remainingRetry
      );
    }
  } catch (error) {
    console.error("QR email worker error: " + error.message);
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

function normalizeIncomingAttendanceDate(value) {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    return Utilities.formatDate(value, "Asia/Kolkata", "dd/MM/yyyy");
  }

  const text =
    String(value || "").trim();

  if (!text) return "";

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return text;
  }

  const parsed =
    new Date(text);

  if (isNaN(parsed.getTime())) {
    return normalizeDate(text);
  }

  return Utilities.formatDate(
    parsed,
    "Asia/Kolkata",
    "dd/MM/yyyy"
  );
}



/**
 * Return the next PENDING row for a queue type.
 */
function getNextQueueRow(
  sheet,
  queueType
) {

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
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

  for (let i = 0; i < values.length; i++) {

    const type =
      String(values[i][0] || "").trim();

    const status =
      String(values[i][1] || "").trim();

    if (
      type === queueType &&
      status === "PENDING"
    ) {
      return i + 2;
    }
  }

  return -1;
}


/**
 * MAIN is considered pending only when there is a
 * PENDING MAIN record. SENDING is left alone until it
 * becomes stale and is recovered.
 */
function hasPendingMainRows(sheet) {

  return hasPendingQueueRows(
    sheet,
    "MAIN"
  );
}


/**
 * RETRY is considered pending only when there is a
 * PENDING RETRY record.
 */
function hasPendingRetryRows(sheet) {

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

  if (lastRow < 2) {
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

  for (let i = 0; i < values.length; i++) {

    if (
      String(values[i][0]).trim() ===
      queueType &&
      String(values[i][1]).trim() ===
      "PENDING"
    ) {
      return true;
    }
  }

  return false;
}


/**
 * Recover a SENDING record if the previous execution
 * crashed or was terminated.
 *
 * IMPORTANT:
 * Apps Script cannot guarantee exactly-once email delivery.
 * If the script crashes after MailApp accepted an email but
 * before the SENT state was saved, that email can potentially
 * be sent again. This recovery favors reliability over silently
 * losing the email.
 */
function recoverStaleSendingRows(sheet) {

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
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
    new Date().getTime();

  for (let i = 0; i < values.length; i++) {

    const status =
      String(values[i][9] || "").trim();

    if (status !== "SENDING") {
      continue;
    }

    const startedAt =
      values[i][14];

    const timestamp =
      startedAt instanceof Date
        ? startedAt.getTime()
        : new Date(startedAt).getTime();

    if (
      !isNaN(timestamp) &&
      now - timestamp >=
      EMAIL_QUEUE.STALE_SENDING_MS
    ) {

      const attempts =
        Number(values[i][10] || 0);

      if (
        attempts >=
        EMAIL_QUEUE.MAX_RETRY_ATTEMPTS
      ) {

        sheet.getRange(i + 2, 10, 1, 4)
          .setValues([[
            "FAILED",
            attempts,
            "Previous email worker execution stopped while sending.",
            ""
          ]]);

        sheet.getRange(i + 2, 15)
          .setValue("");

      } else {

        sheet.getRange(i + 2, 9, 1, 4)
          .setValues([[
            "RETRY",
            "PENDING",
            attempts,
            "Previous email worker execution stopped while sending."
          ]]);

        sheet.getRange(i + 2, 15)
          .setValue("");
      }
    }
  }
}


/**
 * Stop processing before the safe runtime threshold.
 */
function isEmailWorkerNearTimeLimit(
  startTime
) {

  return (
    new Date().getTime() -
    startTime >=
    EMAIL_QUEUE.SAFE_RUNTIME_MS
  );
}


/**
 * Counts for one session.
 */
function getEmailQueueCounts(
  sheet,
  sessionId
) {

  const lastRow =
    sheet.getLastRow();

  const counts = {
    total: 0,
    sent: 0,
    pending: 0,
    retryPending: 0,
    failed: 0,
    sending: 0
  };

  if (lastRow < 2) {
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

  for (let i = 0; i < values.length; i++) {

    if (
      String(values[i][1]).trim() !==
      sessionId
    ) {
      continue;
    }

    const queueType =
      String(values[i][8]).trim();

    const status =
      String(values[i][9]).trim();

    counts.total++;

    if (status === "SENT") {
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

    if (status === "FAILED") {
      counts.failed++;
    }

    if (status === "SENDING") {
      counts.sending++;
    }
  }

  return counts;
}


/**
 * Counts for all queue jobs.
 */
function getAllEmailQueueCounts(sheet) {

  const lastRow =
    sheet.getLastRow();

  const counts = {
    total: 0,
    sent: 0,
    pending: 0,
    retryPending: 0,
    failed: 0,
    sending: 0
  };

  if (lastRow < 2) {
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

  for (let i = 0; i < values.length; i++) {

    const queueType =
      String(values[i][8]).trim();

    const status =
      String(values[i][9]).trim();

    counts.total++;

    if (status === "SENT") {
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

    if (status === "FAILED") {
      counts.failed++;
    }

    if (status === "SENDING") {
      counts.sending++;
    }
  }

  return counts;
}


/**
 * =========================================================
 * PHASE 1B - WORKER TRIGGER
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

  ScriptApp
    .newTrigger(
      "processQrEmailQueue"
    )
    .timeBased()
    .everyMinutes(
      EMAIL_QUEUE.WORKER_INTERVAL_MINUTES
    )
    .create();
}


function deleteEmailWorkerTriggers() {

  ScriptApp
    .getProjectTriggers()
    .forEach(function(trigger) {

      if (
        trigger.getHandlerFunction() ===
        "processQrEmailQueue"
      ) {

        try {
          ScriptApp.deleteTrigger(
            trigger
          );
        } catch (ignore) {}
      }
    });
}


/**
 * =========================================================
 * 4. VERIFY QR + MARK PRESENT
 *
 * STAGE 1 OPTIMIZATION:
 *
 * Instead of reading the entire Roll_No column and
 * searching through every student, use:
 *
 * session.studentIndex[rollNumber]
 *
 * to get the row immediately.
 * =========================================================
 */

function verifyAndMarkPresent(data) {

  const className =
    sanitizeClassName(data.className);

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

    return jsonResponse({

      status: "error",

      code: "INVALID_REQUEST",

      message:
        "Missing QR/session information."
    });
  }


  // ==========================================
  // GET SESSION
  // ==========================================

  const session =
    getSession(sessionId);


  if (!session) {

    return jsonResponse({

      status: "error",

      code: "INVALID_SESSION",

      message:
        "Attendance session is invalid or expired."
    });
  }


  if (session.finalized) {

    return jsonResponse({

      status: "error",

      code: "SESSION_CLOSED",

      message:
        "Attendance session is already closed."
    });
  }


  if (
    session.className !==
    className
  ) {

    return jsonResponse({

      status: "error",

      code: "WRONG_CLASS",

      message:
        "QR code belongs to another class."
    });
  }


  const today =
    getTodayDate();

  // QR codes generated by the current frontend contain dd/MM/yyyy.
  // This normalization also gives older QR codes containing a full
  // JavaScript Date string a chance to validate correctly when possible.
  const qrDate =
    normalizeIncomingAttendanceDate(qrDateRaw);

  if (qrDate !== today) {

    return jsonResponse({

      status: "error",

      code: "EXPIRED_QR",

      message:
        "This QR code is not valid today."
    });
  }


  if (session.date !== today) {

    return jsonResponse({

      status: "error",

      code: "SESSION_DATE_ERROR",

      message:
        "Attendance session date is invalid."
    });
  }


  const sheet =
    getClassSheet(className);


  if (!sheet) {

    return jsonResponse({

      status: "error",

      message:
        "Class sheet not found."
    });
  }


  // ==========================================
  // LOCK
  // ==========================================

  const lock =
    LockService.getScriptLock();


  try {

    lock.waitLock(10000);


    // ==========================================
    // STAGE 1:
    // DIRECT ROLL → ROW LOOKUP
    // ==========================================

    const studentRow =
      session.studentIndex &&
      session.studentIndex[rollNumber];


    if (!studentRow) {

      return jsonResponse({

        status: "error",

        code:
          "STUDENT_NOT_FOUND",

        message:
          "Roll number " +
          rollNumber +
          " was not found."
      });
    }


    // ==========================================
    // GET ATTENDANCE CELL
    // ==========================================

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


    // ==========================================
    // ALREADY PRESENT
    // ==========================================

    if (currentValue === "P") {

      const studentName =
        sheet
          .getRange(
            studentRow,
            session.schema.nameColumn
          )
          .getDisplayValue();


      return jsonResponse({

        status: "error",

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
      });
    }


    // ==========================================
    // ALREADY ABSENT
    // ==========================================

    if (currentValue === "A") {

      return jsonResponse({

        status: "error",

        code:
          "ALREADY_FINALIZED",

        message:
          "This student has already been marked absent."
      });
    }


    // ==========================================
    // MARK PRESENT
    // ==========================================

    attendanceCell.setValue("P");


    const studentName =
      sheet
        .getRange(
          studentRow,
          session.schema.nameColumn
        )
        .getDisplayValue();


    return jsonResponse({

      status: "success",

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
    });


  } finally {

    try {
      lock.releaseLock();
    } catch (ignore) {}

  }
}


/**
 * =========================================================
 * 5. FINALIZE DAY
 * =========================================================
 */

function finalizeDay(data) {
  const className = sanitizeClassName(data.className);
  const sessionId = String(data.sessionId || "").trim();
  const session = getSession(sessionId);

  if (!session) {
    return jsonResponse({
      status: "error",
      code: "INVALID_SESSION",
      message: "Invalid attendance session."
    });
  }

  if (session.finalized) {
    return jsonResponse({
      status: "error",
      code: "SESSION_CLOSED",
      message: "Attendance is already finalized."
    });
  }

  if (session.className !== className) {
    return jsonResponse({
      status: "error",
      message: "Session/class mismatch."
    });
  }

  const sheet = getClassSheet(className);
  if (!sheet) {
    return jsonResponse({
      status: "error",
      message: "Class sheet not found."
    });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const schema = getSchemaForSession(sheet, session);
    const studentRecords = getStudentRecords(sheet, schema);

    if (!studentRecords.length) {
      return jsonResponse({
        status: "error",
        code: "NO_STUDENTS",
        message: "No student records found."
      });
    }

    const presentStudents = [];
    const absentStudents = [];

    // One write per student is avoided: read all relevant attendance cells,
    // then write the final values in contiguous row blocks where possible.
    const minRow = studentRecords[0].rowNumber;
    const maxRow = studentRecords[studentRecords.length - 1].rowNumber;
    const rowCount = maxRow - minRow + 1;
    const range = sheet.getRange(minRow, session.dateColumn, rowCount, 1);
    const values = range.getValues();
    const rowMap = {};
    studentRecords.forEach(function(student) { rowMap[student.rowNumber] = student; });

    let presentCount = 0;
    let absentCount = 0;

    for (let i = 0; i < rowCount; i++) {
      const rowNumber = minRow + i;
      const student = rowMap[rowNumber];
      if (!student) continue;

      const value = String(values[i][0] || "").trim().toUpperCase();
      if (value === "P") {
        presentCount++;
        presentStudents.push(student);
      } else {
        values[i][0] = "A";
        absentCount++;
        absentStudents.push(student);
      }
    }

    range.setValues(values);

    session.finalized = true;
    session.finalizedAt = new Date().getTime();
    saveSession(session);

    return jsonResponse({
      status: "success",
      message: "Attendance finalized successfully.",
      present: presentCount,
      absent: absentCount,
      finalized: true
    });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}


/**
 * =========================================================
 * FINAL ATTENDANCE NOTIFICATION EMAILS
 * =========================================================
 *
 * Sends one email to every student after finalization:
 *   P -> Present notification
 *   A -> Absent notification
 */
/**
 * =========================================================
 * 6. ATTENDANCE STATUS
 * =========================================================
 */


function getAttendanceStatus(data) {
  const className = sanitizeClassName(data.className);
  const sheet = getClassSheet(className);

  if (!sheet) {
    return jsonResponse({
      status: "error",
      message: "Class sheet not found."
    });
  }

  let schema;
  try {
    schema = detectSheetSchema(sheet);
  } catch (error) {
    return jsonResponse({
      status: "error",
      code: "STRUCTURE_NOT_DETECTED",
      message: error.message
    });
  }

  const date = getTodayDate();
  const dateColumn = findDateColumn(sheet, date, schema);
  const records = getStudentRecords(sheet, schema);

  if (!records.length) {
    return jsonResponse({
      status: "error",
      code: "NO_STUDENTS",
      message: "No student records found."
    });
  }

  if (dateColumn === -1) {
    return jsonResponse({
      status: "success",
      className: className,
      date: date,
      total: records.length,
      present: 0,
      absent: 0,
      pending: records.length,
      finalized: false,
      students: [],
      dateFound: false
    });
  }

  const minRow = records[0].rowNumber;
  const maxRow = records[records.length - 1].rowNumber;
  const rowCount = maxRow - minRow + 1;
  const attendanceValues = sheet.getRange(minRow, dateColumn, rowCount, 1).getDisplayValues();
  const rowMap = {};
  records.forEach(function(student) { rowMap[student.rowNumber] = student; });

  const students = [];
  let present = 0;
  let absent = 0;
  let pending = 0;

  for (let i = 0; i < rowCount; i++) {
    const student = rowMap[minRow + i];
    if (!student) continue;

    const attendance = String(attendanceValues[i][0] || "").trim().toUpperCase();
    let status = "PENDING";

    if (attendance === "P") {
      status = "PRESENT";
      present++;
    } else if (attendance === "A") {
      status = "ABSENT";
      absent++;
    } else {
      pending++;
    }

    students.push({
      roll: student.roll,
      name: student.name,
      email: student.email,
      status: status
    });
  }

  return jsonResponse({
    status: "success",
    className: className,
    date: date,
    total: students.length,
    present: present,
    absent: absent,
    pending: pending,
    finalized: pending === 0,
    students: students,
    dateFound: true,
    detectedStructure: {
      headerRow: schema.headerRow,
      dateHeaderRow: schema.dateHeaderRow,
      dataStartRow: schema.dataStartRow,
      rollColumn: schema.rollColumn,
      nameColumn: schema.nameColumn,
      emailColumn: schema.emailColumn
    }
  });
}


/**
 * =========================================================
 * DATE FUNCTIONS
 * =========================================================
 */

function getTodayDate() {
    return Utilities.formatDate(
        new Date(),
        "Asia/Kolkata",
        "dd/MM/yyyy"
    );
}


function findDateColumn(sheet, date, schema) {
  const detected = schema || detectSheetSchema(sheet);
  const targetDate = normalizeDate(date);

  // Compute swapped mm/dd/yyyy version in case the sheet header was written in mm/dd/yyyy
  let altTargetDate = "";
  const parts = targetDate.split("/");
  if (parts.length === 3) {
    altTargetDate = parts[1] + "/" + parts[0] + "/" + parts[2];
  }

  for (let i = 0; i < detected.dateColumns.length; i++) {
    const colDate = detected.dateColumns[i].date;
    const rawText = detected.dateColumns[i].rawText || "";
    if (
      colDate === targetDate ||
      colDate === altTargetDate ||
      rawText === targetDate ||
      rawText === altTargetDate ||
      normalizeDate(rawText) === targetDate
    ) {
      return detected.dateColumns[i].column;
    }
  }

  // Fallback: read the detected date header row directly in case the schema
  // was created before a date was entered.
  if (detected.dateHeaderRow > 0) {
    const lastColumn = sheet.getLastColumn();
    const displayHeaders = sheet.getRange(detected.dateHeaderRow, 1, 1, lastColumn).getDisplayValues()[0];
    const rawHeaders = sheet.getRange(detected.dateHeaderRow, 1, 1, lastColumn).getValues()[0];

    for (let c = 0; c < displayHeaders.length; c++) {
      if (rawHeaders[c] instanceof Date && !isNaN(rawHeaders[c].getTime())) {
        const d = Utilities.formatDate(rawHeaders[c], "Asia/Kolkata", "dd/MM/yyyy");
        if (d === targetDate || d === altTargetDate) return c + 1;
      }
      const norm = normalizeDate(displayHeaders[c]);
      if (
        norm === targetDate ||
        norm === altTargetDate ||
        displayHeaders[c].trim() === targetDate ||
        displayHeaders[c].trim() === altTargetDate
      ) {
        return c + 1;
      }
    }
  }

  return -1;
}


function normalizeDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    return Utilities.formatDate(value, "Asia/Kolkata", "dd/MM/yyyy");
  }

  let text =
    String(value).trim();

  if (!text) return "";

  // If text contains day names/month names or ISO date string (e.g. "Mon Nov 09 2026..." or "2026-09-12T...")
  if (/[a-zA-Z]/.test(text)) {
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, "Asia/Kolkata", "dd/MM/yyyy");
    }
  }

  text =
    text.replace(/-/g, "/")
      .replace(/\./g, "/")
      .replace(/\s+/g, "");

  /*
   * Convert:
   * 3/9/2026, 03/9/2026, 3/09/2026, 2026/09/03
   * to:
   * 03/09/2026 (dd/MM/yyyy)
   */
  const parts =
    text.split("/");

  if (parts.length === 3) {
    // If yyyy/mm/dd (parts[0] is 4-digit year)
    if (
      parts[0].length === 4 &&
      parts[1].length <= 2 &&
      parts[2].length <= 2
    ) {
      return (
        parts[2].padStart(2, "0") +
        "/" +
        parts[1].padStart(2, "0") +
        "/" +
        parts[0]
      );
    }

    // If dd/mm/yyyy (parts[2] is 4-digit year)
    if (
      parts[2].length === 4 &&
      parts[0].length <= 2 &&
      parts[1].length <= 2
    ) {
      return (
        parts[0].padStart(2, "0") +
        "/" +
        parts[1].padStart(2, "0") +
        "/" +
        parts[2]
      );
    }
  }

  return text;
}


/**
 * =========================================================
 * SESSION STORAGE
 * =========================================================
 */

function saveSession(session) {

  PropertiesService
    .getScriptProperties()
    .setProperty(

      "SESSION_" +
      session.sessionId,

      JSON.stringify(session)
    );
}


function getSession(sessionId) {

  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        "SESSION_" +
        sessionId
      );


  if (!raw) {
    return null;
  }


  const session =
    JSON.parse(raw);


  const now =
    new Date().getTime();


  const expiry =
    session.createdAt +
    CONFIG.SESSION_HOURS *
    60 *
    60 *
    1000;


  if (now > expiry) {

    PropertiesService
      .getScriptProperties()
      .deleteProperty(
        "SESSION_" +
        sessionId
      );

    return null;
  }


  return session;
}


/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function getClassSheet(className) {

  return SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(
      className
    );
}


function sanitizeClassName(className) {

  return String(
    className || ""
  )
    .trim()
    .toUpperCase();
}


function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}

function checkMyQuota() {
  var remaining = MailApp.getRemainingDailyQuota();
  Logger.log("Remaining free emails for today: " + remaining);
}
