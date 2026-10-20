# HabitDesk - Windows 95 style productivity app

A small Windows 95-inspired single-page website for tracking habits, wellness and expenses. The app is static and stores data in the browser's localStorage so it persists between visits.

## Features
- Habit tracker: add habits, mark as done, clear all
- Wellness logs: record mood and sleep hours by date
- Expenses: add expenses, filter by category, delete items and see the total
- To-Do list: add tasks, mark complete, edit and persist tasks between visits
- Schedule / Calendar: month view calendar with events, recurring birthdays, appointments and notes - add/edit/delete events

- Icons: draggable with snap-to-grid and touch support. Icon positions are saved in localStorage and restored on reload.
- Windows 95 style draggable windows, start menu, and taskbar

## Running locally (no server required)

This project is a static front-end app - it only uses HTML, CSS and JavaScript and does not require Python or any server-side code.

Quick ways to open it in your browser:

1. Open directly from your filesystem
	- Double-click `index.html` in the project folder or right-click → Open with → your browser. The app will run using the file:// URL and localStorage works normally.

2. Use the VS Code Live Server extension (recommended during development)
	- Install the Live Server extension in VS Code and click "Go Live" (no Python needed).

3. Optional: Node-based dev server (if you prefer a lightweight HTTP server)
	- If you have Node.js installed you can run a minimal server without Python, for example:

```powershell
npx http-server -p 8000
# then open http://localhost:8000
```

Use whichever option you prefer - the app stores data in localStorage so it persists between refreshes and page reloads.

## Notes & next steps
- Icons can be swapped inside `icons_32x32/`
- Consider optional export/import of data for cross-device use

Tip: use the Start menu to open apps quickly if the desktop icon gets moved.

Enjoy! ❤️
