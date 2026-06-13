# UX map: Marketing Report Studio

## Purpose

This document describes the real user experience of Marketing Report Studio and
keeps storage, permissions, editing state, and synchronization state separate.

## Product modes

The interface has four independent dimensions:

| Dimension | Values | Meaning |
| --- | --- | --- |
| Storage | Local browser / Cloud | Where the working report is stored |
| Permission | Owner / Editor / Viewer | What the authenticated user may do |
| Presentation | Editing / Client preview | Whether editing controls are visible |
| Sync | Saved / Saving / Error / Conflict | Current persistence state |

A Cloud viewer is not the same as an exported client copy. A client copy is a
standalone HTML file with `clientLocked=true`; a Cloud viewer is an authenticated
workspace member whose permission is checked by the API.

## Main screen

### Header

The header contains:

- report and company name;
- one primary action: **Add data**;
- export and save actions;
- a storage status chip;
- a permission or presentation-mode chip;
- **Client preview / Back to editing**;
- theme and language controls.

Important warnings and import results are displayed in a persistent notice below
the header instead of disappearing immediately.

### Analytics

The analytics panel shows charts and summary tables. When the project is empty,
it becomes the onboarding entry point. When data exists but visualizations do
not, it explains how to open a dataset or create an automatic report.

### Workspace

The former "View" panel is a contextual workspace. It displays the selected:

- dataset;
- chart and source rows;
- company folder;
- uploaded or connected file;
- generated analytical view.

It is not a client preview. Client preview is controlled separately in the
header.

### Materials

The sidebar is divided into:

- data tables;
- charts;
- files and folders.

Search covers these sections. Dataset entries include row count and import time,
and provide CSV export and deletion actions for editors.

## Add-data flow

The **Add data** dialog offers three paths:

1. Paste a CSV/TSV table.
2. Upload files.
3. Connect a local folder.

The pasted-table flow validates headers, quoting, duplicate columns, row width,
and minimum content before import. It shows a preview, row count, and column
count. A successful import produces a persistent success state with actions to
open the dataset or create an automatic report.

## Builders and viewers

- Chart builder configures a chart; chart viewer opens in the workspace.
- Summary-table builder configures a table; dataset viewing happens in the workspace.
- Competitor dialog adds a competitor and its folder using a selected dataset.
- Members dialog manages Cloud workspace access and is unrelated to CSV entities.

## Viewer and client behavior

Viewer and client modes hide all editing actions, including drag-and-drop upload.
Empty states explain that content has not yet been published. A locked client
copy cannot be switched back to editing from the application interface.

## Accessibility baseline

- Dialogs have an accessible title and close button.
- `Escape` closes a dialog.
- Keyboard focus stays inside an open dialog and returns to its trigger.
- Important notices use live regions.
- Dataset previews explicitly state when only the first 250 rows are shown.

## Remaining UX checks

- Manually inspect desktop and mobile layouts in a browser.
- Test long report titles and narrow screens.
- Test keyboard navigation in every dialog.
- Test Cloud owner, editor, and viewer accounts after D1, R2, and Access are configured.
- Test a generated locked client bundle independently from the editor file.

