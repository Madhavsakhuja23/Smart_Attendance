# Smart Attendance System

An enterprise-grade, full-stack automated attendance solution that bridges a modern **React + Vite** web application with **Google Sheets** via an official **Google Sheets Editor Add-on** and secure real-time **Command Bridge architecture**.

---

## 🏗️ System Architecture

```
┌─────────────────┐       HTTPS       ┌────────────────────────┐       Mongoose       ┌─────────────────┐
│                 │  ──────────────>  │                        │  ─────────────────>  │                 │
│ React Frontend  │                   │ Express.js API Backend │                      │  MongoDB Atlas  │
│  (Vercel SPA)   │  <──────────────  │   (Vercel Node.js)     │  <─────────────────  │   Database      │
│                 │       JWT Auth    │                        │      MongoDB URI     │                 │
└─────────────────┘                   └────────────────────────┘                      └─────────────────┘
         │                                         ▲
         │                                         │
         │                        Command Bridge   │ Add-on Token Auth
         │                        Polling Loop     │ SHA-256 Token Hash
         │                                         ▼
         │                            ┌────────────────────────┐
         └──────────────────────────> │ Google Sheets Add-on   │
                Pairing Code          │  (Google Apps Script)  │
                                      └────────────────────────┘
```

---

## ✨ Features & Highlights

### 🛡️ Security Foundations
- **Security Headers:** Enforced via `helmet` middleware across all REST endpoints.
- **Strict Rate Limiting:** 
  - Login: 10 attempts / 15 minutes / IP
  - Registration: 5 attempts / hour / IP
  - Add-on Pairing: 10 attempts / 15 minutes / IP
  - General API: 100 requests / 15 minutes / IP
- **Cryptographic Token Pairing:** Spreadsheet pairing tokens are hashed with SHA-256 before storage in MongoDB.
- **DNS MX Email Domain Validation:** Registration verifies email format and checks for active mail exchanger (MX) DNS records.
- **Strict CORS Control:** Explicit whitelist of authorized frontend origins.

### 📊 Google Sheets Editor Add-on Integration
- **Zero Heavy Apps Script Web App Deployment:** Pure Google Sheets Editor Add-on sidebar interface.
- **6-Digit Pairing Flow:** Fast 5-minute expiring pairing code generated from web portal and validated by the backend.
- **Class Synchronization:** Auto-discovers class tabs from active Google Spreadsheet and syncs roster columns (`Roll No`, `Name`, `Email`).

### 📱 Live Attendance & QR Workflow
- **Multi-Class Management:** Select any synchronized class and fetch live rosters with current attendance status.
- **QR Code Generation & Email Dispatch:** Concurrent QR code creation with real-time status monitoring (`Sent` / `Failed` / `Pending` / `Retrying`). Accurate progress calculated strictly on successfully delivered emails (`sent / total * 100`).
- **Real-Time Camera QR Scanner:** In-browser camera scanning powered by `html5-qrcode` to verify student badges instantly.
- **Attendance Finalization:** Single-click day finalization that updates master sheet records and marks unverified students as absent.

### 👤 Account Settings & Public Pages
- **Account Settings (`/settings`):** Change password with strength verification, view Google Sheets connection state, and disconnect spreadsheet.
- **Client-Side Routing (`react-router-dom`):** Direct navigation between Dashboard, Settings, Login, and Register.
- **Full Legal & Public Documentation Pages:**
  - `/privacy` — Privacy Policy
  - `/terms` — Terms of Service
  - `/cookies` — Cookie Policy
  - `/security` — Security Overview
  - `/support` — Support & Contact Information
  - `/faq` — Frequently Asked Questions
  - `/about` — About Smart Attendance
  - `/google-sheets` — Add-on Setup & User Guide

---

## 📁 Repository Structure

```
Attendance_System/
├── smart-attendance/
│   ├── Backend/
│   │   ├── config/             # DB connection logic
│   │   ├── controllers/        # Auth, Admin, Teacher, and Add-on Controllers
│   │   ├── middleware/         # Auth, Rate Limiter middleware
│   │   ├── models/             # Teacher and AttendanceCommand Mongoose Models
│   │   ├── routes/             # Auth, Admin, Teacher, Add-on Express Routes
│   │   ├── server.js           # Main Express application entry point
│   │   └── package.json
│   │
│   ├── Frontend/
│   │   ├── src/
│   │   │   ├── api/            # Backend API service wrappers
│   │   │   ├── components/     # Login, Register, SetupPage, Settings, Footer, QRGenerator, QRScanner
│   │   │   ├── pages/          # Privacy, Terms, Cookies, Security, Support, FAQ, About, GoogleSheets
│   │   │   ├── services/       # Command bridge helper functions
│   │   │   ├── App.jsx         # App router and layout shell
│   │   │   ├── App.css         # Complete system styling
│   │   │   └── main.jsx        # React root with BrowserRouter
│   │   └── package.json
│   │
│   ├── appscript.gs            # Google Sheets Editor Add-on Script
│   └── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v18.x or higher
- **MongoDB Atlas Account** or local MongoDB instance

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables (`.env`):
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/smart_attendance
   JWT_SECRET=your_strong_jwt_secret_key_here
   FRONTEND_URL=http://localhost:5173
   ```

4. Start development server:
   ```bash
   npm run dev
   # or
   node server.js
   ```

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables (`.env`):
   ```env
   VITE_BACKEND_URL=http://localhost:5000
   ```

4. Start Vite development server:
   ```bash
   npm run dev
   ```

---

## 🛠️ Build Verification

To test and build the production bundle for the frontend:
```bash
cd Frontend
npm run build
```

---

## 📄 License
This project is proprietary and built for educational institutional use. All rights reserved.
