# UX QA report

Date: 2026-06-13

## Automated checks

- `npm.cmd run build`: passed.
- API smoke test: passed.
- Worker route smoke test: passed.
- UI inline-script syntax test: passed.
- Required UX markers and viewer-only upload protection: passed.
- `git diff --check`: passed.

## Scenarios covered by code review

- Empty local editor project shows onboarding and Add data actions.
- Empty viewer/client project explains that content is not published yet.
- Add data offers paste, upload, and local-folder paths.
- Pasted CSV validates headers, quotes, duplicates, and row width.
- Imported datasets show row/column counts, import time, and next actions.
- Dataset preview states the 250-row display limit.
- Viewer/client modes hide upload and destructive controls.
- Dialogs support Escape, focus trapping, and focus restoration.
- Cloud fallback explains that data stays in the current browser.

## Manual checks still required

Headless Chrome and Edge did not create a screenshot in the current Windows
session, so visual layout approval remains manual. Verify:

- desktop and mobile header wrapping;
- empty-state spacing;
- long dataset and file names;
- light and dark themes;
- Ukrainian and English modes;
- keyboard navigation;
- exported client HTML/ZIP;
- Cloud roles after D1, R2, and Access are configured.

