// import { useCallback, useState } from "react";

// import {
//   fetchStudents,
//   createSession,
//   markPresent,
//   finalizeDay
// } from "./services/api";

// import QRGenerator from "./components/QRGenerator";
// import QRScanner from "./components/QRScanner";

// import "./App.css";


// const CLASS_OPTIONS = Array.from(
//   { length: 50 },
//   (_, index) => `G${index + 1}`
// );


// function App() {

//   const [className, setClassName] =
//     useState("");

//   const [students, setStudents] =
//     useState([]);

//   const [session, setSession] =
//     useState(null);

//   const [scannerOpen, setScannerOpen] =
//     useState(false);

//   const [qrVisible, setQrVisible] =
//     useState(false);

//   const [loading, setLoading] =
//     useState(false);

//   const [message, setMessage] =
//     useState("");

//   const [scanHistory, setScanHistory] =
//     useState([]);

//   const [finalized, setFinalized] =
//     useState(false);


//   const presentCount =
//     students.filter(
//       student => student.status === "PRESENT"
//     ).length;


//   const pendingCount =
//     students.filter(
//       student => !student.status ||
//       student.status === "PENDING"
//     ).length;


//   const absentCount =
//     students.filter(
//       student => student.status === "ABSENT"
//     ).length;

    

//   async function handleGetStudents() {

//     if (!className) {
//       setMessage("Please select a class.");
//       return;
//     }

//     try {

//       setLoading(true);
//       setMessage("");

//       const result =
//         await fetchStudents(className);

//       const formatted =
//         result.students.map(student => ({
//           ...student,
//           status: "PENDING"
//         }));

//       setStudents(formatted);

//       setSession(null);
//       setQrVisible(false);
//       setScannerOpen(false);
//       setScanHistory([]);
//       setFinalized(false);

//       setMessage(
//         `${formatted.length} students loaded.`
//       );

//     } catch (error) {

//       setMessage(
//         error.message
//       );

//     } finally {

//       setLoading(false);
//     }
//   }


//   async function handleDispatchQR() {

//   if (!students.length) {

//     setMessage(
//       "Load student details first."
//     );

//     return;
//   }


//   try {

//     setLoading(true);

//     setMessage("");


//     const result =
//       await createSession(
//         className
//       );


//     setSession(
//       result.session
//     );


//     setQrVisible(true);


//     setMessage(
//       "Attendance session created. You can now generate and dispatch QR codes."
//     );


//   } catch (error) {

//     setMessage(
//       error.message
//     );

//   } finally {

//     setLoading(false);
//   }
// }

//   const handleScan = useCallback(
//   async (qrData) => {

//     if (!session || finalized) {
//       throw new Error(
//         "Attendance session is not active."
//       );
//     }

//     try {

//       setMessage(
//         "Verifying attendance..."
//       );


//       const result =
//         await markPresent({

//           className,

//           rollNumber:
//             qrData.rollNumber,

//           date:
//             qrData.date,

//           sessionId:
//             qrData.sessionId
//         });


//       /*
//        * Update student status.
//        */
//       setStudents(previous =>
//         previous.map(student =>
//           String(student.roll) ===
//           String(result.student.roll)
//             ? {
//                 ...student,
//                 status: "PRESENT"
//               }
//             : student
//         )
//       );


//       /*
//        * Add scan history.
//        */
//       setScanHistory(previous => [

//         {
//           roll:
//             result.student.roll,

//           name:
//             result.student.name,

//           time:
//             new Date().toLocaleTimeString()
//         },

//         ...previous

//       ]);


//       setMessage(
//         `Attendance marked for Roll ${result.student.roll}`
//       );


//       /*
//        * VERY IMPORTANT:
//        *
//        * Don't catch and hide the error here.
//        *
//        * Returning successfully tells
//        * QRScanner that attendance was marked.
//        */
//       return result;


//     } catch (error) {

//       console.error(
//         "Attendance error:",
//         error
//       );


//       /*
//        * Show error in App if you want.
//        */
//       setMessage(
//         `❌ ${error.message}`
//       );


//       /*
//        * VERY IMPORTANT:
//        *
//        * Re-throw the error so QRScanner
//        * knows that attendance failed.
//        */
//       throw error;
//     }

//   },

//   [
//     className,
//     session,
//     finalized
//   ]
// );

//   async function handleFinalize() {

//     if (!session) {
//       setMessage(
//         "Create an attendance session first."
//       );
//       return;
//     }

//     const confirmed =
//       window.confirm(
//         `Finalize attendance?\n\nPresent: ${presentCount}\nPending: ${pendingCount}\n\nAll pending students will be marked absent.`
//       );

//     if (!confirmed) {
//       return;
//     }

//     try {

//       setLoading(true);

//       const result =
//         await finalizeDay({
//           className,
//           sessionId:
//             session.sessionId
//         });

//       setFinalized(true);
//       setScannerOpen(false);

//       setStudents(previous =>
//         previous.map(student => ({
//           ...student,
//           status:
//             student.status === "PRESENT"
//               ? "PRESENT"
//               : "ABSENT"
//         }))
//       );

//       setMessage(
//         `✅ Attendance finalized. Present: ${result.present}, Absent: ${result.absent}`
//       );

//     } catch (error) {

//       setMessage(
//         error.message
//       );

//     } finally {

//       setLoading(false);
//     }
//   }


//   return (

//     <div className="app">

//       <header className="header">

//         <div>
//           <h1>
//             Smart Attendance System
//           </h1>

//           <p>
//             QR-Based Attendance Management
//           </p>
//         </div>

//         <div className="date">
//           {new Date().toLocaleDateString(
//             "en-IN",
//             {
//               day: "2-digit",
//               month: "long",
//               year: "numeric"
//             }
//           )}
//         </div>

//       </header>


//       <main>

//         {/* CLASS SELECTION */}

//         <section className="card">

//           <h2>
//             1. Select Class
//           </h2>

//           <div className="class-controls">

//             <select
//               value={className}
//               onChange={e =>
//                 setClassName(e.target.value)
//               }
//               disabled={loading}
//             >

//               <option value="">
//                 Select Class Group
//               </option>

//               {CLASS_OPTIONS.map(group => (

//                 <option
//                   value={group}
//                   key={group}
//                 >
//                   {group}
//                 </option>

//               ))}

//             </select>


//             <button
//               onClick={
//                 handleGetStudents
//               }
//               disabled={loading}
//             >
//               {loading
//                 ? "Loading..."
//                 : "Get Student Details"}
//             </button>

//           </div>

//         </section>


//         {/* STATISTICS */}

//         {students.length > 0 && (

//           <section className="stats">

//             <div className="stat-card">
//               <span>Total</span>
//               <strong>
//                 {students.length}
//               </strong>
//             </div>

//             <div className="stat-card present">
//               <span>Present</span>
//               <strong>
//                 {presentCount}
//               </strong>
//             </div>

//             <div className="stat-card pending">
//               <span>Pending</span>
//               <strong>
//                 {pendingCount}
//               </strong>
//             </div>

//             <div className="stat-card absent">
//               <span>Absent</span>
//               <strong>
//                 {absentCount}
//               </strong>
//             </div>

//           </section>
//         )}


//         {/* ACTIONS */}

//         {students.length > 0 && (

//           <section className="card">

//             <h2>
//               2. Attendance Controls
//             </h2>

//             <div className="actions">

//               <button
//                 onClick={
//                   handleDispatchQR
//                 }
//                 disabled={
//                   loading ||
//                   finalized
//                 }
//               >
//                 Dispatch QR Codes
//               </button>


//               <button
//                 onClick={() =>
//                   setScannerOpen(true)
//                 }
//                 disabled={
//                   !session ||
//                   finalized
//                 }
//               >
//                 Open Live QR Scanner
//               </button>


//               <button
//                 className="danger"
//                 onClick={
//                   handleFinalize
//                 }
//                 disabled={
//                   !session ||
//                   finalized
//                 }
//               >
//                 Submit & Mark Absentees
//               </button>

//             </div>

//           </section>
//         )}


//         {/* MESSAGE */}

//         {message && (

//           <div className="message">
//             {message}
//           </div>

//         )}


//         {/* SCANNER */}

//         {scannerOpen && (

//           <section className="card scanner-card">

//             <div className="section-header">

//               <h2>
//                 Live Attendance Scanner
//               </h2>

//               <button
//                 onClick={() =>
//                   setScannerOpen(false)
//                 }
//               >
//                 Close
//               </button>

//             </div>

//             <QRScanner
//               onScan={handleScan}
//             />

//           </section>
//         )}


//         {/* QR CODES */}

//         {session && !finalized && (

//   <section className="card">

//     <QRGenerator

//       students={students}

//       className={className}

//       date={session.date}

//       sessionId={
//         session.sessionId
//       }

//       onComplete={() => {

//         setMessage(
//           "QR codes have been dispatched."
//         );

//       }}

//     />

//   </section>

// )}


//         {/* STUDENTS */}

//         {students.length > 0 && (

//           <section className="card">

//             <h2>
//               Student Attendance
//             </h2>

//             <div className="table-container">

//               <table>

//                 <thead>

//                   <tr>
//                     <th>Roll No</th>
//                     <th>Name</th>
//                     <th>Email</th>
//                     <th>Status</th>
//                   </tr>

//                 </thead>

//                 <tbody>

//                   {students.map(student => (

//                     <tr
//                       key={student.roll}
//                     >

//                       <td>
//                         {student.roll}
//                       </td>

//                       <td>
//                         {student.name}
//                       </td>

//                       <td>
//                         {student.email}
//                       </td>

//                       <td>

//                         <span
//                           className={
//                             `status ${(
//                               student.status ||
//                               "PENDING"
//                             ).toLowerCase()}`
//                           }
//                         >
//                           {student.status ||
//                             "PENDING"}
//                         </span>

//                       </td>

//                     </tr>

//                   ))}

//                 </tbody>

//               </table>

//             </div>

//           </section>
//         )}


//         {/* SCAN HISTORY */}

//         {scanHistory.length > 0 && (

//           <section className="card">

//             <h2>
//               Recent Attendance
//             </h2>

//             <div className="history">

//               {scanHistory.map(
//                 (scan, index) => (

//                   <div
//                     className="history-item"
//                     key={
//                       `${scan.roll}-${index}`
//                     }
//                   >

//                     <span>
//                       ✅
//                     </span>

//                     <div>
//                       <strong>
//                         {scan.roll} —{" "}
//                         {scan.name}
//                       </strong>

//                       <small>
//                         {scan.time}
//                       </small>
//                     </div>

//                   </div>

//                 )
//               )}

//             </div>

//           </section>
//         )}


//         {/* FINALIZED */}

//         {finalized && (

//           <div className="finalized">

//             🔒 Attendance Session Closed

//           </div>

//         )}

//       </main>

//     </div>
//   );
// }


// export default App;

import { useState } from "react";

import Login from "./components/Login";
import { getTeacherClasses } from "./api/backendApi";

function App() {

    const [teacher, setTeacher] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [classError, setClassError] = useState("");

    const handleLogin = async (teacherData) => {

        setTeacher(teacherData);

        const token = sessionStorage.getItem("token");

        try {
            setLoadingClasses(true);
            setClassError("");

            const result = await getTeacherClasses(token);

            setClasses(result.classes || []);

        } catch (error) {

            console.error("Class loading error:", error);

            setClassError(error.message);

        } finally {
            setLoadingClasses(false);
        }
    };

    const handleLogout = () => {

        sessionStorage.removeItem("token");

        setTeacher(null);
        setClasses([]);
    };

    // Show login page
    if (!teacher) {
        return <Login onLogin={handleLogin} />;
    }

    // Show teacher dashboard
    return (
        <div className="dashboard">

            <header className="dashboard-header">

                <div>
                    <h1>Smart Attendance</h1>

                    <p>
                        Welcome, {teacher.name} 👋
                    </p>
                </div>

                <button onClick={handleLogout}>
                    Logout
                </button>

            </header>

            <main>

                <section className="teacher-info">

                    <h2>Teacher Information</h2>

                    <p>
                        <strong>Name:</strong>{" "}
                        {teacher.name}
                    </p>

                    <p>
                        <strong>Teacher ID:</strong>{" "}
                        {teacher.teacherId}
                    </p>

                    <p>
                        <strong>Email:</strong>{" "}
                        {teacher.email}
                    </p>

                    <p>
                        <strong>Login Time:</strong>{" "}
                        {teacher.lastLoginAt
                            ? new Date(
                                teacher.lastLoginAt
                            ).toLocaleString()
                            : "Just now"}
                    </p>

                </section>

                <section className="class-section">

                    <h2>Select Class</h2>

                    {loadingClasses && (
                        <p>Loading classes...</p>
                    )}

                    {classError && (
                        <p className="login-error">
                            {classError}
                        </p>
                    )}

                    {!loadingClasses &&
                        !classError && (
                            <select defaultValue="">
                                <option value="" disabled>
                                    Select a class
                                </option>

                                {classes.map((className) => (
                                    <option
                                        key={className}
                                        value={className}
                                    >
                                        {className}
                                    </option>
                                ))}
                            </select>
                        )}

                </section>

            </main>

        </div>
    );
}

export default App;