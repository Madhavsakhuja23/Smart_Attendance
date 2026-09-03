const API_URL =
  "https://script.google.com/macros/s/AKfycbxq2iS1R7Xz0wMOmuydgDVPGrUK3lfTNWU-P4SyLR4-ivmpCo2N4LioMPFsKbdjCedv/exec";


async function request(
  action,
  data = {}
) {

  const response =
    await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({
          action,
          ...data
        })
      }
    );


  if (!response.ok) {

    throw new Error(
      `Server error: ${response.status}`
    );
  }


  const result =
    await response.json();


  if (
    result.status ===
    "error"
  ) {

    const error =
      new Error(
        result.message ||
        "Request failed."
      );

    error.code =
      result.code;

    throw error;
  }


  return result;
}


export function fetchStudents(
  className
) {

  return request(
    "fetchStudents",
    {
      className
    }
  );
}


export function createSession(
  className
) {

  return request(
    "createSession",
    {
      className
    }
  );
}


export function sendEmails({
  className,
  date,
  sessionId,
  students
}) {

  return request(
    "sendEmails",
    {
      className,
      date,
      sessionId,
      students
    }
  );
}


export function markPresent({
  className,
  rollNumber,
  date,
  sessionId
}) {

  return request(
    "verifyAndMarkPresent",
    {
      className,
      rollNumber,
      date,
      sessionId
    }
  );
}


export function finalizeDay({
  className,
  sessionId
}) {

  return request(
    "finalizeDay",
    {
      className,
      sessionId
    }
  );
}


export function getAttendanceStatus(
  className
) {

  return request(
    "getAttendanceStatus",
    {
      className
    }
  );
}