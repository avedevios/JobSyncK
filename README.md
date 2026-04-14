# JobSyncK

A Safari extension + local backend for tracking LinkedIn job applications.

## What it does

- Parses job data from LinkedIn (role, company, location, description, apply URL, posted date)
- Saves jobs to a local SQLite database via a Node.js backend
- Shows a ✓ badge on the extension icon if the job is already saved
- Dashboard at `localhost:3333` for managing all saved jobs

## Structure

```
backend/          Node.js + Express API, SQLite database, dashboard
safari-extension/ Safari Web Extension (manifest v3)
```

## Setup

**Backend**
```bash
cd backend
npm install
node server.js
```
Dashboard opens at [http://localhost:3333](http://localhost:3333)

**Safari Extension**

Open `safari-extension/LinkedInJobSaver.xcodeproj` in Xcode, build and run.  
Then enable the extension in Safari → Settings → Extensions.

## Dashboard features

- Filter by status, location, search by role/company
- Click any row to edit
- Quick-action buttons: Apply 📨, Screening 📞, Archive 🗂️
- Status flow: `saved` → `applied` → `screening` → `interviewing` → `offer` / `rejected`
- Remote jobs highlighted in red
- Full job description viewer with copy button
