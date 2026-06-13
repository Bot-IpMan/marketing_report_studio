# UX implementation checklist

## Completed

- [x] Separate storage, access, and presentation status in the header.
- [x] Replace the CSV-only primary action with a unified Add data flow.
- [x] Add empty-project onboarding.
- [x] Add actionable analytics empty states.
- [x] Rename View to Workspace and clarify its purpose.
- [x] Split Materials into datasets, charts, and files/folders.
- [x] Add dataset import time, CSV export, and deletion actions.
- [x] Hide file upload controls in viewer/client mode.
- [x] Add CSV validation, preview, and row/column summary.
- [x] Add a persistent post-import success state and next actions.
- [x] Show dataset preview limits.
- [x] Improve empty and unsupported file-preview states.
- [x] Add dialog Escape handling, focus trapping, and focus restoration.
- [x] Add source context to chart and summary-table builders.
- [x] Add a UI syntax and marker smoke test.

## Manual QA required

- [ ] Desktop layout at 1440x900 and 1920x1080.
- [ ] Mobile layout below 920 px.
- [ ] CSV validation with comma, semicolon, tab, quotes, and malformed rows.
- [ ] XLSX, JSON, Markdown, DOCX, PDF, and image imports.
- [ ] Local-folder permissions and reconnect behavior.
- [ ] Local editor to client-preview round trip.
- [ ] Exported locked client HTML/ZIP.
- [ ] Cloud owner, editor, and viewer roles.
- [ ] Cloud save, error, retry, and version-conflict states.

