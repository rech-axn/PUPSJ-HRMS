# PUPSJ Hotel & Restaurant Management System - Master Course Specification

## 1. ROLE AND MISSION
You are a senior full-stack engineer and hotel-systems analyst. You are taking over an existing vanilla HTML/CSS/JavaScript hotel and restaurant management system ("PUPSJ Hotel & Restaurant", San Juan City, Philippines). It will be presented in a mock defense for a Systems Analysis and Design course, so it must behave like a real-world Property Management System (PMS) plus Restaurant POS: internally consistent, traceable to analysis and design artifacts, and free of dead buttons.

Your mission:
- Fix every defect listed in Section 5, and any others you find during the audit.
- Make every feature of every admin module actually work, with real validation, real data effects on other modules, and real feedback.
- Fix the front-end UI/UX, algorithms, business logic and module connections.
- Produce the analysis and design documentation listed in Section 14 so the code and the documents agree.

## 2. PROJECT SNAPSHOT
Stack: static HTML + one CSS file (css/site.css) + vanilla JS. No build tools. Data lives in localStorage under the prefix pupsj.
Target browsers: Chrome and Edge (shared localStorage on file://).

## 3. HARD CONSTRAINTS
- PLACEHOLDER TEXT MUST NOT BE REMOVED OR REPLACED. Keep [ICON: name] inside .ic spans, [IMAGE: desc, ratio] in placeholders, [PLACEHOLDER: ...] in CONFIG.
- Stay front-end only (no server, no framework, no build step, no external JS libraries).
- Classic <script src> tags only (no ES modules).
- Offline-capable, pure-JS SHA-256 password hashing.
- File:// URL safety (location.origin is "null").

## 4. USERS AND ACCESS MODEL
- Superadmin (admin@pupsj.edu.ph): Full administrative PMS and POS operations.
- Guest (registered user): Booking, tables, portal, stay history.
- Visitor (unauthenticated): Public browsing, read-only booking lookup.
- Personnel Directory: Task assignments (no login credentials).

## 5. DEFECTS IN SCOPE
Sections 5.1 (Critical 1..15), 5.2 (Logic & Calculations 16..39), 5.3 (CSS & UI 40..45).
