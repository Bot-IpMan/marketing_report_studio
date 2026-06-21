(function(){
'use strict';
const DEFAULT = {
  meta:{title:'Ринкова конкурентна розвідка', companyName:'', updatedAt:new Date().toISOString(), lang:'uk'},
  datasets:[],
  companies:[],
  files:[],
  charts:[],
  tables:[],
  ci:null
};
const CI_SCHEMA_VERSION = 'ci_os_unified_v1';
const CI_LINEAGE_RULE = 'Recommendation -> Insight -> Fact -> Source';
const REPORT_STORAGE_KEY = `marketing_report_studio_v8:${location.pathname}:report`;
const LANG_STORAGE_KEY = `marketing_report_studio_v8:${location.pathname}:lang`;
const LOCALSTORAGE_MAX_BYTES = 4 * 1024 * 1024;
const MAX_IMPORT_FILES = 100;
const MAX_IMPORT_FILE_BYTES = 40 * 1024 * 1024;
const MAX_TEXT_IMPORT_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 2000;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 96 * 1024 * 1024;
const MAX_ARCHIVE_TEXT_BYTES = 32 * 1024 * 1024;
const MAX_SHEET_ROWS = 100000;
const MAX_SHEET_COLUMNS = 10000;
const MAX_SHEET_CELLS = 1000000;
const PERSIST_DEBOUNCE_MS = 500;
const CLOUD_PERSIST_DEBOUNCE_MS = 1400;
const CLOUD_RETRY_DELAYS_MS = [3000, 10000, 30000, 60000];
const BROWSER_ONLY_MODE = true;
const HOSTED_MODE = location.protocol==='https:' || location.protocol==='http:';
let persistTimer = null;
let localStorageDisabledBySize = false;
let REPORT = normalizeReport(loadReport() || DEFAULT);
const state = {activeDataset: REPORT.datasets[0]?.id || null, activeFile:null, openTabs:[], theme:'dark', access:((HOSTED_MODE&&!BROWSER_ONLY_MODE)||REPORT.meta?.clientLocked)?'viewer':(REPORT.meta?.accessMode || 'admin'), activeCompany:null, compareA:null, compareB:null, compareOnly:false, openFolders:{}, showCompare:false, fsOpen:{}, fsRoots:[], fsPollTimer:null, analyticsSite:'all', analyticsResearch:'all', lastVizFsSync:0, widgetSnapshots:{}, lang:(REPORT.meta?.lang || getSavedLang() || 'uk')};
const cloudSync = {enabled:HOSTED_MODE&&!BROWSER_ONLY_MODE, ready:false, localFallback:BROWSER_ONLY_MODE, saving:false, dirty:false, conflict:false, suppress:false, saveTimer:null, retryCount:0, reportId:null, version:null, role:null, user:null, workspace:null};
const $ = id => document.getElementById(id);
const app = $('app'), analytics = $('analyticsContent'), reader = $('readerContent'), readerTabs = $('readerTabs'), sideList = $('sideList'), search = $('search');
const UI_TEXT = {
  uk: {
    appTitle: 'Ринкова конкурентна розвідка',
    reportTitlePrefix: 'Ринкова конкурентна розвідка для: {company}',
    reportTitleDefaultCompany: 'ваша компанія',
    reportSubtitle: 'адмін редагує · клієнт переглядає',
    companyName: 'Назва компанії',
    pasteCsv: 'Додати дані',
    exportCiJson: 'CI JSON',
    exportCiJsonTitle: 'Експорт у єдиній CI OS структурі',
    saveDisk: 'Зберегти на диск',
    saveAdmin: 'Зберегти адмін',
    saveClient: 'Для клієнта',
    admin: 'Адмін',
    viewer: 'Перегляд',
    unlockAdmin: 'Увімкнути режим адміністратора',
    theme: 'Тема',
    analytics: 'Графіки',
    analyticsHint: 'клік по графіку відкриває таблицю-джерело',
    reader: 'Робоча область',
    clear: 'Очистити',
    dataFiles: 'Матеріали',
    connectFolder: 'Підключити папку',
    uploadFiles: 'Завантажити файли',
    searchPlaceholder: 'Пошук таблиць, файлів, графіків',
    dropZone: 'Перетягни сюди Excel/CSV/JSON або файли',
    dropZoneSmall: '.xlsx, .csv, .json, .md, .pdf, зображення...',
    newChart: 'Новий графік',
    newTable: 'Нова табличка',
    pastedData: 'Вставлені дані',
    tableWord: 'Табличка',
    chartWord: 'Графік',
    textPlaceholder: 'текст',
    numberPlaceholder: 'число',
    storageStat: '{datasets} табл. · {files} файлів · {folders} папок',
    langCode: 'EN',
    switchLanguage: 'English',
    emptyReader: 'Клікни на таблицю, графік або файл справа.',
    viewOnly: 'Цей звіт відкрито для перегляду. Редагування вимкнено.',
    savingHtml: 'Зберігаю HTML-файл на диск...'
  },
  en: {
    appTitle: 'Market competitive intelligence',
    reportTitlePrefix: 'Market competitive intelligence for: {company}',
    reportTitleDefaultCompany: 'your company',
    reportSubtitle: 'admin edits · client views',
    companyName: 'Company name',
    pasteCsv: 'Add data',
    exportCiJson: 'CI JSON',
    exportCiJsonTitle: 'Export to unified CI OS structure',
    saveDisk: 'Save to disk',
    saveAdmin: 'Save admin',
    saveClient: 'For client',
    admin: 'Admin',
    viewer: 'View',
    unlockAdmin: 'Enable admin mode',
    theme: 'Theme',
    analytics: 'Charts',
    analyticsHint: 'click a chart to open its source table',
    reader: 'Workspace',
    clear: 'Clear',
    dataFiles: 'Materials',
    connectFolder: 'Connect folder',
    uploadFiles: 'Upload files',
    searchPlaceholder: 'Search tables, files, charts',
    dropZone: 'Drag Excel/CSV/JSON or files here',
    dropZoneSmall: '.xlsx, .csv, .json, .md, .pdf, images...',
    newChart: 'New chart',
    newTable: 'New table',
    pastedData: 'Pasted data',
    tableWord: 'Table',
    chartWord: 'Chart',
    textPlaceholder: 'text',
    numberPlaceholder: 'number',
    storageStat: '{datasets} tables · {files} files · {folders} folders',
    langCode: 'UA',
    switchLanguage: 'Українська',
    emptyReader: 'Click a table, chart, or file on the right.',
    viewOnly: 'This report is open in view-only mode. Editing is disabled.',
    savingHtml: 'Saving HTML file to disk...'
  }
};
const TEXT_REPLACEMENTS = [
  ['Ринкова конкурентна розвідка для: ', 'Market competitive intelligence for: '],
  ['Ринкова конкурентна розвідка', 'Market competitive intelligence'],
  ['адмін редагує · клієнт переглядає', 'admin edits · client views'],
  ['клік по графіку відкриває таблицю-джерело', 'click a chart to open its source table'],
  ['Перетягни сюди Excel/CSV/JSON або файли', 'Drag Excel/CSV/JSON or files here'],
  ['Пошук таблиць, файлів, графіків', 'Search tables, files, charts'],
  ['Підключити папку', 'Connect folder'],
  ['Структура папки', 'Folder structure'],
  ['Папки не підключені. Натисни "Підключити папку".', 'No folders connected. Click "Connect folder".'],
  ['Графіки', 'Charts'],
  ['Таблиці', 'Tables'],
  ['Аналітика', 'Analytics'],
  ['Перегляд', 'View'],
  ['Дані й файли', 'Data & files'],
  ['Назва компанії', 'Company name'],
  ['Вставити CSV', 'Paste CSV'],
  ['Експорт у єдиній CI OS структурі', 'Export to unified CI OS structure'],
  ['Зберегти на диск', 'Save to disk'],
  ['Зберегти адмін', 'Save admin'],
  ['Для клієнта', 'For client'],
  ['Адмін', 'Admin'],
  ['Увімкнути режим адміністратора', 'Enable admin mode'],
  ['Тема', 'Theme'],
  ['Очистити', 'Clear'],
  ['Натисни "Підключити папку".', 'Click "Connect folder".'],
  ['Дані компанії', 'Company data'],
  ['Файли папки', 'Folder files'],
  ['Даних поки немає', 'No data yet'],
  ['Файлів ще немає. В адмін-режимі вибери цю папку і натисни + Дані / перетягни файли.', 'No files yet. In admin mode, select this folder and click + Data / drag files here.'],
  ['+ файл у папку', '+ file to folder'],
  ['Видалити файл', 'Delete file'],
  ['Видалити папку', 'Delete folder'],
  ['Відключити папку', 'Disconnect folder'],
  ['Клікни на таблицю, графік або файл справа.', 'Click a table, chart, or file on the right.'],
  ['є пропуски', 'has missing values'],
  ['дані ок', 'data ok'],
  ['Редагувати рядки', 'Edit rows'],
  ['Зберегти зміни', 'Save changes'],
  ['Таблицю не знайдено', 'Table not found'],
  ['Немає даних для графіка', 'No data for the chart'],
  ['Немає даних', 'No data'],
  ['Порівняння', 'Comparison'],
  ['Порівняти', 'Compare'],
  ['Різниця', 'Difference'],
  ['Метрика', 'Metric'],
  ['тільки ці на графіках', 'only these on charts'],
  ['Немає числових колонок', 'No numeric columns'],
  ['Готую архів для адміна...', 'Preparing admin archive...'],
  ['JSZip недоступний: збережено лише HTML', 'JSZip unavailable: saved HTML only'],
  ['Не вдалося зібрати адмінський архів', 'Could not build admin archive'],
  ['Готую архів для клієнта...', 'Preparing client archive...'],
  ['Не вдалося зібрати клієнтський архів', 'Could not build client archive'],
  ['Збережено HTML-файл проєкту', 'Saved HTML project file'],
  ['Не вдалося зберегти HTML-файл', 'Could not save HTML file'],
  ['Зберігаю HTML-файл на диск...', 'Saving HTML file to disk...'],
  ['Редагувати графік', 'Edit chart'],
  ['Майстер графіка', 'Chart wizard'],
  ['Майстер графіка:', 'Chart wizard:'],
  ['Авто-вибір', 'Auto-pick'],
  ['Вибери X і Y', 'Choose X and Y'],
  ['Назва', 'Name'],
  ['Таблиця-джерело', 'Source table'],
  ['Підпис / X', 'Label / X'],
  ['Число / Y', 'Number / Y'],
  ['Тип', 'Type'],
  ['Показати Top N', 'Show top N'],
  ['Агрегація', 'Aggregation'],
  ['Сортування', 'Sort'],
  ['Горизонтальні стовпчики', 'Horizontal bars'],
  ['Вертикальні стовпчики', 'Vertical bars'],
  ['Лінія', 'Line'],
  ['Коло', 'Pie'],
  ['Попередній перегляд', 'Preview'],
  ['Авто-звіт', 'Auto report'],
  ['Порівняння сайтів (сума по дослідженнях)', 'Site comparison (sum across studies)'],
  ['Порівняння сайтів', 'Site comparison'],
  ['порівняння сайтів', 'site comparison'],
  ['Порівняння автора', 'Author comparison'],
  ['порівняння автора', 'author comparison'],
  ['Порівняльна таблиця автора', 'Author comparison table'],
  ['порівняльна таблиця автора', 'author comparison table'],
  ['агрегована таблиця авторів', 'aggregated author table'],
  ['Внутрішні метрики дослідження', 'Internal research metrics'],
  ['Внутрішні метрики', 'Internal metrics'],
  ['внутрішні метрики', 'internal metrics'],
  ['внутрішні', 'internal'],
  ['графіків', 'charts'],
  ['графіки', 'charts'],
  ['графік(и)', 'chart(s)'],
  ['дослідження', 'studies'],
  ['авторів', 'authors'],
  ['таблиць', 'tables'],
  ['рядків', 'rows'],
  ['колонок', 'columns'],
  ['точок', 'points'],
  ['файлів', 'files'],
  ['аркуш(ів)', 'sheet(s)'],
  ['папок', 'folders'],
  ['Ще немає графіків. ', 'No charts yet. '],
  ['Додай їх через кнопки у верхній панелі або в блоці "Перегляд".', 'Add them via the top-bar buttons or in the "View" section.'],
  ['Адміністратор ще не додав графіки.', 'The administrator has not added charts yet.'],
  ['Таблиці ще не додані.', 'Tables have not been added yet.'],
  ['Для цього дослідження немає KPI-таблиці (views/likes/comments), доступні лише retention-дані.', 'For this study, there is no KPI table (views/likes/comments); only retention data is available.'],
  ['немає KPI', 'no KPI'],
  ['Дослідження не знайдено для внутрішніх графіків.', 'No study found for internal charts.'],
  ['Немає даних.', 'No data.'],
  ['retention-only', 'retention-only'],
  ['Для цього дослідження ще немає retention-даних (tempo/retention).', 'No retention data yet for this study (tempo/retention).'],
  ['Показано збережений текст.', 'Saved text is shown.'],
  ['Щоб відкрити оригінальний .docx, натисни кнопку нижче.', 'To open the original .docx, click the button below.'],
  ['Не вдалося прочитати вміст .docx.', 'Could not read the .docx contents.'],
  ['Помилка читання .docx.', 'Error reading .docx.'],
  ['Можна відкрити оригінальний файл вручну.', 'You can open the original file manually.'],
  ['Файл збережено всередині звіту.', 'The file is stored inside the report.'],
  ['Завантажити файл', 'Download file'],
  ['Відкрити локальний .docx', 'Open local .docx'],
  ['Відкрити таблиці', 'Open tables'],
  ['Файлів ще немає', 'No files yet'],
  ['JSON-файл порожній.', 'JSON file is empty.'],
  ['JSON не прочитався.', 'JSON could not be read.'],
  ['Технічна структура', 'Technical structure'],
  ['Сирий JSON', 'Raw JSON'],
  ['структуру скорочено', 'structure truncated'],
  ['об\'єктів', 'objects'],
  ['масивів', 'arrays'],
  ['Розгорнути в область 2', 'Expand to area 2'],
  ['Відкрити великий графік', 'Open large chart'],
  ['Створити графік з цієї таблички', 'Create chart from this table'],
  ['Також створити графік з цієї таблички', 'Also create a chart from this table'],
  ['Табличка ≠ графік.', 'A table is not a chart.'],
  ['Табличка показує рядки. Щоб поруч зʼявився графік, залиш галочку "Також створити графік" або натисни 📊 на готовій табличці.', 'A table shows rows. To create a chart next to it, keep "Also create a chart" checked or click 📊 on an existing table.'],
  ['Всі', 'All'],
  ['Перші 6', 'First 6'],
  ['JSON уже розпізнано як дані', 'JSON is already recognized as data'],
  ['Немає коротких текстових або числових полів.', 'No short text or numeric fields.'],
  ['Відкрити як таблицю', 'Open as table'],
  ['JSZip недоступний для читання .docx', 'JSZip is unavailable for reading .docx'],
  ['Показано збережений текст.', 'Saved text is shown.'],
  ['Щоб відкрити оригінальний .docx, натисни кнопку нижче.', 'To open the original .docx, click the button below.'],
  ['Не вдалося прочитати вміст .docx.', 'Could not read the .docx contents.'],
  ['Помилка читання .docx.', 'Error reading .docx.'],
  ['Опис', 'Description'],
  ['Немає опису', 'No description'],
  ['KPI не знайдено', 'No KPI found'],
  ['Графік KPI', 'KPI chart'],
  ['Поля не знайдено', 'No fields found'],
  ['Структура', 'Structure'],
  ['Підсумкова таблиця KPI', 'KPI summary table'],
  ['Таблиця розкладу оцінок', 'Score breakdown table'],
  ['Базове охоплення', 'Raw reach'],
  ['Швидкість та ефективність', 'Velocity & efficiency'],
  ['Рівні залучення (%)', 'Engagement rates (%)'],
  ['Структура rate-метрик', 'Rate mix'],
  ['Розклад оцінок (1-5)', 'Score breakdown (1-5)'],
  ['Відставання до максимуму (5)', 'Gap to max (5)'],
  ['Стабільність оцінок', 'Score consistency'],
  ['Глибина взаємодії', 'Interaction depth'],
  ['Профіль дослідження (зріз)', 'Study profile (snapshot)'],
  ['Перегляди по дослідження', 'Views by study'],
  ['Перегляди за день по дослідження', 'Views/day by study'],
  ['ER Public (%) по дослідження', 'ER Public (%) by study'],
  ['Рівень лайків (%) по дослідження', 'Like rate (%) by study'],
  ['Рівень коментарів (%) по дослідження', 'Comment rate (%) by study'],
  ['Лайки по дослідження', 'Likes by study'],
  ['Коментарі по дослідження', 'Comments by study'],
  ['Коментарі на 1k переглядів', 'Comments per 1k views'],
  ['Перегляди на 1k підписників', 'Views per 1k subscribers'],
  ['Оцінка хука по дослідження', 'Hook score by study'],
  ['Оцінка CTA по дослідження', 'CTA score by study'],
  ['Оцінка аудіо по дослідження', 'Audio score by study'],
  ['Резонанс коментарів по дослідження', 'Comment resonance by study'],
  ['Загальна оцінка по дослідження', 'Overall score by study'],
  ['Емоційний темп (індекс) по дослідження', 'Emotional tempo (index) by study'],
  ['Утримання аудиторії (proxy, %) по дослідження', 'Audience retention (proxy, %) by study'],
  ['Пояснення метрики цього графіка.', 'Chart metric explanation.'],
  ['Сумарні перегляди по сайтах', 'Total views by site'],
  ['Сумарні перегляди/день по сайтах', 'Total views/day by site'],
  ['Сумарні лайки по сайтах', 'Total likes by site'],
  ['Сумарні коментарі по сайтах', 'Total comments by site'],
  ['Таблиця для ', 'Table for '],
  ['Авто-таблиця', 'Auto table'],
  ['Графік + табличка', 'Chart + table'],
  ['Вибери хоча б одну колонку', 'Choose at least one column'],
  ['Редагувати табличку', 'Edit table'],
  ['Створити табличку', 'Create table'],
  ['Створити графік', 'Create chart'],
  ['Додати папку', 'Add folder'],
  ['Додати конкурента і папку', 'Add competitor and folder'],
  ['Вставити CSV / TSV', 'Paste CSV / TSV'],
  ['Назва таблиці', 'Table name'],
  ['Дані з Excel або Google Sheets', 'Data from Excel or Google Sheets'],
  ['Назва компанії / папки', 'Company / folder name'],
  ['+ графік', '+ chart'],
  ['+ табличка', '+ table'],
  ['Скасувати', 'Cancel'],
  ['Зберегти', 'Save'],
  ['Новий графік', 'New chart'],
  ['Нова табличка', 'New table'],
  ['Вставлені дані', 'Pasted data'],
  ['Новий конкурент', 'New competitor'],
  ['Таблиця', 'Table'],
  ['Графік', 'Chart'],
  ['Табличка', 'Table']
];
const MESSAGE_REPLACEMENTS = [
  [/^Видалити файл "(.+)" з проєкту\?$/u, 'Delete file "$1" from the project?'],
  [/^Видалити папку "(.+)" і всі файли з проєкту\?$/u, 'Delete folder "$1" and all files from the project?'],
  [/^Видалити файл "(.+)" з диска\?$/u, 'Delete file "$1" from disk?'],
  [/^Видалити папку "(.+)" і весь її вміст з диска\?$/u, 'Delete folder "$1" and all of its contents from disk?'],
  [/^Відключити папку "(.+)"\?$/u, 'Disconnect folder "$1"?'],
  [/^Додано таблицю: (.+)$/u, 'Added table: $1'],
  [/^Додано JSON-таблицю: (.+)$/u, 'Added JSON table: $1'],
  [/^Excel прочитано: (\d+) лист\(ів\)$/u, 'Excel read: $1 sheet(s)'],
  [/^Markdown: (\d+) таблиць, (\d+) рядків$/u, 'Markdown: $1 tables, $2 rows'],
  [/^Файл додано: (.+)$/u, 'File added: $1'],
  [/^Visualization додано: (.+)$/u, 'Visualization added: $1'],
  [/^Знайдено метрики: (\d+) файлів visualization$/u, 'Found metrics: $1 visualization files'],
  [/^Табличні файли з папок: (\d+) таблиць з (\d+) файлів$/u, 'Table files from folders: $1 tables from $2 files'],
  [/^Готово: архів адміна створено \((\d+) файлів\)$/u, 'Done: admin archive created ($1 files)'],
  [/^Готово: архів створено \((\d+) файлів\)$/u, 'Done: archive created ($1 files)'],
  [/^Авто-звіт створено: (\d+) графік\(и\)$/u, 'Auto report created: $1 chart(s)'],
  [/^Ринкова конкурентна розвідка для: (.+)$/u, 'Market competitive intelligence for: $1'],
  [/^Ринкова конкурентна розвідка$/u, 'Market competitive intelligence'],
  [/^Цей звіт відкрито для перегляду\. Редагування вимкнено\.$/u, 'This report is open in view-only mode. Editing is disabled.'],
  [/^Дані великі: autosave у localStorage вимкнено$/u, 'Data is large: autosave in localStorage is disabled'],
  [/^Адмін-код \(демо\):$/u, 'Admin code (demo):'],
  [/^Неправильний код$/u, 'Wrong code'],
  [/^Адмін-режим увімкнено$/u, 'Admin mode enabled'],
  [/^Режим перегляду$/u, 'View mode'],
  [/^Редагування вимкнено$/u, 'Editing disabled'],
  [/^Немає доступу на запис до папки$/u, 'No write access to the folder'],
  [/^Цей браузер не підтримує доступ до папок$/u, 'This browser does not support folder access'],
  [/^Ця папка вже підключена$/u, 'This folder is already connected'],
  [/^Папку підключено$/u, 'Folder connected'],
  [/^Папку відключено$/u, 'Folder disconnected'],
  [/^Папку видалено з проєкту$/u, 'Folder deleted from the project'],
  [/^Файл видалено$/u, 'File deleted'],
  [/^Файл видалено з папки$/u, 'File deleted from folder'],
  [/^Папку видалено з диска$/u, 'Folder deleted from disk'],
  [/^Файл видалено з диска$/u, 'File deleted from disk'],
  [/^Не вдалося видалити файл$/u, 'Could not delete file'],
  [/^Не вдалося видалити папку$/u, 'Could not delete folder'],
  [/^Спочатку додай таблицю$/u, 'First add a table'],
  [/^Потрібна хоча б 1 текстова і 1 числова колонка$/u, 'Need at least one text and one number column'],
  [/^Потрібна текстова і числова колонка$/u, 'Need a text and a number column'],
  [/^Потрібна 1 текстова і 1 числова колонка$/u, 'Need 1 text and 1 number column'],
  [/^Таблицю-джерело не знайдено$/u, 'Source table not found'],
  [/^Графік створено з таблички$/u, 'Chart created from the table'],
  [/^Швидкий графік створено$/u, 'Quick chart created'],
  [/^Таблицю створено$/u, 'Table created'],
  [/^Табличку оновлено$/u, 'Table updated'],
  [/^Табличку створено$/u, 'Table created'],
  [/^Графік створено$/u, 'Chart created'],
  [/^Графік і табличку створено$/u, 'Chart and table created'],
  [/^Авто-звіт уже є$/u, 'Auto report already exists'],
  [/^Дані збережено, графіки оновлено$/u, 'Data saved, charts updated'],
  [/^Конкурента і папку додано$/u, 'Competitor and folder added'],
  [/^Не бачу рядків$/u, 'No rows found'],
  [/^Проєкт JSON завантажено$/u, 'Project JSON loaded'],
  [/^JSON не прочитався$/u, 'Could not read JSON'],
  [/^Excel відкрито, але таблиць не знайдено$/u, 'Excel opened, but no tables were found'],
  [/^Не вдалося прочитати \.xlsx$/u, 'Could not read .xlsx'],
  [/^Не вдалося відкрити файл$/u, 'Could not open file'],
  [/^Не вдалося витягнути текст з \.docx$/u, 'Could not extract text from .docx'],
  [/^Не вдалося відкрити локальний \.docx$/u, 'Could not open the local .docx'],
  [/Показано перші (\d+) рядків із (\d+)\./u, 'Showing first $1 rows out of $2.'],
  [/Ще (\d+) табличних блоків у технічній структурі\./u, 'There are $1 more table blocks in the technical structure.'],
  [/^Попередній перегляд для цього типу не підтримується\.$/u, 'Preview for this type is not supported.'],
  [/^Excel-файл розібрано на таблиці\. Обери потрібний аркуш нижче\.$/u, 'The Excel file has been split into tables. Choose the required sheet below.'],
  [/^Excel-файл не вдалося розібрати\.$/u, 'Could not parse the Excel file.'],
  [/^У цьому markdown не знайдено таблиць з даними$/u, 'No data tables were found in this Markdown'],
  [/^JSZip недоступний для читання \.docx$/u, 'JSZip is unavailable for reading .docx'],
  [/^Показано збережений текст\.$/u, 'Saved text is shown.'],
  [/^Щоб відкрити оригінальний \.docx, натисни кнопку нижче\.$/u, 'To open the original .docx, click the button below.'],
  [/^Не вдалося прочитати вміст \.docx\.$/u, 'Could not read the .docx contents.'],
  [/^Помилка читання \.docx\.$/u, 'Error reading .docx.'],
  [/^Опис$/u, 'Description'],
  [/^Немає опису$/u, 'No description'],
  [/^KPI не знайдено$/u, 'No KPI found'],
  [/^Графік KPI$/u, 'KPI chart'],
  [/^Поля не знайдено$/u, 'No fields found'],
  [/^Структура$/u, 'Structure'],
  [/^Для цього дослідження немає KPI-таблиці \(views\/likes\/comments\), доступні лише retention-дані\.$/u, 'No KPI table (views/likes/comments) for this research, only retention data is available.'],
  [/^Дослідження не знайдено для внутрішніх графіків\.$/u, 'No research found for internal charts.'],
  [/^Немає даних\.$/u, 'No data.'],
  [/^Вибери X і Y$/u, 'Choose X and Y'],
  [/^Вибери хоча б одну колонку$/u, 'Choose at least one column'],
  [/^Потрібна таблиця-джерело$/u, 'Source table is required'],
  [/^Попередній перегляд$/u, 'Preview'],
  [/^Майстер графіка$/u, 'Chart wizard'],
  [/^Редагувати графік$/u, 'Edit chart'],
  [/^Створити графік$/u, 'Create chart'],
  [/^Скасувати$/u, 'Cancel'],
  [/^Зберегти$/u, 'Save'],
  [/^Створити таблицю$/u, 'Create table'],
  [/^Додати конкурента і папку$/u, 'Add competitor and folder'],
  [/^Вставити CSV \/ TSV$/u, 'Paste CSV / TSV'],
  [/^Сортування$/u, 'Sort'],
  [/^Агрегація$/u, 'Aggregation'],
  [/^Сума$/u, 'Sum'],
  [/^Середнє$/u, 'Average'],
  [/^Кількість$/u, 'Count'],
  [/^Від більшого$/u, 'Descending'],
  [/^Від меншого$/u, 'Ascending'],
  [/^Як у таблиці$/u, 'As in table'],
  [/^Горизонтальні стовпчики$/u, 'Horizontal bars'],
  [/^Вертикальні стовпчики$/u, 'Vertical bars'],
  [/^Лінія$/u, 'Line'],
  [/^Коло$/u, 'Pie'],
  [/^Показати Top N$/u, 'Show top N'],
  [/^Майстер графіка:$/u, 'Chart wizard:'],
  [/^вибери таблицю, підпис \(X\) і число \(Y\)\. Якщо не знаєш що вибрати — натисни /u, 'choose the table, label (X) and number (Y). If you are not sure what to choose, press '],
  [/^Новий конкурент = нова папка\.$/u, 'New competitor = new folder.'],
  [/^Після додавання справа зʼявиться папка конкурента, а всі вибрані файли можна додавати саме в неї\.$/u, 'After adding, a competitor folder will appear on the right, and all selected files can be added there.'],
  [/^Потрібна текстова і числова колонка$/u, 'Need a text and a numeric column'],
  [/^Огляд$/u, 'Overview'],
  [/^Ключові значення$/u, 'Key values'],
  [/^Списки та посилання$/u, 'Lists and links'],
  [/^Розмір$/u, 'Size'],
  [/^Верхні елементи$/u, 'Top items'],
  [/^Поля$/u, 'Fields'],
  [/^Табличні блоки$/u, 'Table blocks'],
  [/^Тип$/u, 'Type'],
  [/^Режим$/u, 'Mode'],
  [/^Створено$/u, 'Created'],
  [/^Домени \/ URL$/u, 'Domains / URL'],
  [/^Масив$/u, 'Array'],
  [/^Об'єкт$/u, 'Object'],
  [/^Рядок$/u, 'String'],
  [/^Число$/u, 'Number'],
  [/^Так\/ні$/u, 'Yes/No'],
  [/^порожньо$/u, 'empty'],
  [/^елементів$/u, 'items'],
  [/^полів$/u, 'fields'],
  [/^Створено UTC$/u, 'Created UTC'],
  [/^Оновлено$/u, 'Updated'],
  [/^Живі URL$/u, 'Live URLs'],
  [/^Інвентар URL$/u, 'URL inventory'],
  [/^Знайдені піддомени$/u, 'Resolved subdomains'],
  [/^Усі піддомени$/u, 'All subdomains'],
  [/^Технології$/u, 'Technologies'],
  [/^Безпека$/u, 'Security'],
  [/^Карта контенту$/u, 'Content map'],
  [/^Кластери$/u, 'Clusters'],
  [/^Домени$/u, 'Domains'],
  [/^Таблиця$/u, 'Table'],
  [/^назва компанії \/ папки$/iu, 'company / folder name'],
  [/^Новий конкурент$/u, 'New competitor']
];
function uiLocale(){return state.lang==='en'?'en-US':'uk-UA';}
function formatText(template, values={}){
  return String(template||'').replace(/\{(\w+)\}/g, (_, key)=>String(values[key] ?? ''));
}
function getSavedLang(){
  try{
    const v=localStorage.getItem(LANG_STORAGE_KEY);
    return v==='en' || v==='uk' ? v : null;
  }catch(e){
    return null;
  }
}
function translateText(value){
  let text=String(value ?? '');
  if(state.lang!=='en') return text;
  for(const [from,to] of TEXT_REPLACEMENTS){
    text=text.split(from).join(to);
  }
  for(const [pattern, replacement] of MESSAGE_REPLACEMENTS){
    text=text.replace(pattern, replacement);
  }
  return text;
}
function t(key, values={}){
  const lang=state.lang==='en'?'en':'uk';
  const template=UI_TEXT[lang]?.[key] ?? UI_TEXT.uk?.[key] ?? key;
  return translateText(formatText(template, values));
}
function setLanguage(nextLang, opts={}){
  const lang=nextLang==='en'?'en':'uk';
  state.lang=lang;
  REPORT.meta=REPORT.meta||{};
  REPORT.meta.lang=lang;
  try{ localStorage.setItem(LANG_STORAGE_KEY, lang); }catch(e){}
  applyLanguage();
  if(opts.persist!==false) schedulePersist();
  if(opts.refresh!==false) refresh();
  if(opts.rerenderReader!==false) rerenderActiveReader();
}
function applyLanguage(){
  document.documentElement.lang=state.lang;
  if(app) app.dataset.lang=state.lang;
  $('reportSubtitle') && ($('reportSubtitle').textContent=t('reportSubtitle'));
  $('companyNameInput') && ($('companyNameInput').placeholder=t('companyName'));
  $('pasteBtn') && ($('pasteBtn').innerHTML=`<span class="hideMob">${state.lang==='en'?'Add data':'Додати дані'}</span>`);
  $('exportJsonBtn') && ($('exportJsonBtn').innerHTML=`<span class="hideMob">${t('exportCiJson')}</span>`);
  $('exportJsonBtn') && ($('exportJsonBtn').title=t('exportCiJsonTitle'));
  $('saveDiskBtn') && ($('saveDiskBtn').textContent=t('saveDisk'));
  $('saveHtmlBtn') && ($('saveHtmlBtn').textContent=t('saveAdmin'));
  $('saveClientHtmlBtn') && ($('saveClientHtmlBtn').textContent=t('saveClient'));
  $('unlockAdminBtn') && ($('unlockAdminBtn').title=t('unlockAdmin'));
  $('themeBtn') && ($('themeBtn').title=t('theme'));
  $('langBtn') && ($('langBtn').textContent=t('langCode'));
  $('langBtn') && ($('langBtn').title=t('switchLanguage'));
  $('analyticsPanelTitle') && ($('analyticsPanelTitle').textContent=t('analytics'));
  $('analyticsHint') && ($('analyticsHint').textContent=t('analyticsHint'));
  $('readerPanelTitle') && ($('readerPanelTitle').textContent=t('reader'));
  $('filesPanelTitle') && ($('filesPanelTitle').textContent=t('dataFiles'));
  $('clearReaderBtn') && ($('clearReaderBtn').textContent=t('clear'));
  $('connectFolderBtn') && ($('connectFolderBtn').textContent=t('connectFolder'));
  $('uploadFilesBtn') && ($('uploadFilesBtn').textContent=t('uploadFiles'));
  $('search').placeholder=t('searchPlaceholder');
  const drop=$('dropZone');
  if(drop) drop.innerHTML = `${t('dropZone')}<br><small>${t('dropZoneSmall')}</small>`;
  const headTitle=$('reportTitle');
  if(headTitle) headTitle.textContent = t('reportTitlePrefix', {company:String(REPORT.meta?.companyName||'').trim() || t('reportTitleDefaultCompany')});
  document.title=t('reportTitlePrefix', {company:String(REPORT.meta?.companyName||'').trim() || t('reportTitleDefaultCompany')});
  const rp=$('rolePill');
  if(rp) rp.textContent=isAdmin()?t('admin'):t('viewer');
  const stat=$('storageStat');
  if(stat) stat.textContent=t('storageStat', {datasets:REPORT.datasets.length, files:REPORT.files.length, folders:(REPORT.companies||[]).length});
}
function rerenderActiveReader(){
  const tab=state.openTabs?.[0];
  if(!tab){
    reader.innerHTML=`<div class="empty">${t('emptyReader')}</div>`;
    return;
  }
  if(tab.kind==='dataset') openDataset(tab.ref);
  else if(tab.kind==='company') openCompany(tab.ref);
  else if(tab.kind==='file') openFile(tab.ref);
  else if(tab.kind==='chart') openChartView(tab.ref);
  else if(tab.kind==='simple') openSimpleWidgetView(tab.ref);
}
initState();
function clone(x){return JSON.parse(JSON.stringify(x));}
function uid(prefix){return prefix + '-' + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4)}
function hashString(s){let h=2166136261; s=String(s||''); for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0).toString(36);}
function stableId(prefix,...parts){return `${prefix}-${hashString(parts.join('|'))}`;}
function esc(s){return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function normText(s){return String(s||'').toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi,'').trim();}
function normalizeNumberString(v){
  let s=String(v??'').trim().replace(/\s/g,'');
  if(!s) return '';
  const hasDot=s.includes('.');
  const commaCount=(s.match(/,/g)||[]).length;
  if(hasDot && commaCount>0){
    // 4,271,994.12 -> 4271994.12
    s=s.replace(/,/g,'');
  }else if(!hasDot && commaCount>1){
    // 4,271,994 -> 4271994
    s=s.replace(/,/g,'');
  }else if(!hasDot && commaCount===1){
    const [a,b]=s.split(',');
    // 101,342 -> 101342 (thousands), 2,86 -> 2.86 (decimal comma)
    if(/^\d{3}$/.test(b||'')) s=a+b;
    else s=a+'.'+(b||'');
  }
  return s;
}
function num(v){if(typeof v==='number') return Number.isFinite(v)?v:0; const n=Number(normalizeNumberString(v)); return Number.isFinite(n)?n:0;}
function isNum(v){if(v===null||v===undefined||v==='') return false; return Number.isFinite(Number(normalizeNumberString(v)));}
function parseTimeToSeconds(v){const s=String(v||'').trim(); const m=s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/); if(!m) return 0; return m[3]!==undefined ? Number(m[1])*3600+Number(m[2])*60+Number(m[3]) : Number(m[1])*60+Number(m[2]);}
function enrichVideoMetricsRow(r){
  if(!r||typeof r!=='object') return r;
  const hook=num(r.hook_score), cta=num(r.cta_score), audio=num(r.audio_score), res=num(r.comment_resonance_score), overall=num(r.overall_video_score);
  const parts=[hook,cta,audio,res,overall].filter(v=>v>0);
  if(!isNum(r.emotional_tempo_index) || num(r.emotional_tempo_index)<=0) r.emotional_tempo_index=parts.length?(parts.reduce((a,b)=>a+b,0)/parts.length)*20:0;
  const avdSec=isNum(r.avg_view_duration_sec)?num(r.avg_view_duration_sec):parseTimeToSeconds(r.avg_view_duration);
  const durMin=num(r.duration_min||r.duration);
  let ret=0;
  if(avdSec>0 && durMin>0) ret=(avdSec/(durMin*60))*100; else if(overall>0) ret=overall*20;
  r.avg_view_duration_sec=avdSec||0;
  if(!isNum(r.retention_proxy_percent) || num(r.retention_proxy_percent)<=0) r.retention_proxy_percent=Math.max(0,Math.min(100,ret));
  return r;
}
function fmt(n){n=num(n); return Math.abs(n)>=1000 ? Math.round(n).toLocaleString(uiLocale()) : n.toLocaleString(uiLocale(),{maximumFractionDigits:2});}
function bytes(n){n=num(n); if(n>1024*1024) return (n/1024/1024).toFixed(1)+' MB'; if(n>1024) return (n/1024).toFixed(1)+' KB'; return Math.round(n)+' B';}
function assertSafeImportFile(file){
  if(!file) throw new Error('Файл не вибрано.');
  const size=Number(file.size||0);
  const ext=extFromName(file.name||'');
  if(size>MAX_IMPORT_FILE_BYTES) throw new Error(`Файл ${file.name} завеликий. Максимум ${bytes(MAX_IMPORT_FILE_BYTES)}.`);
  if(['csv','tsv','json','md','txt','html','xml','js','css'].includes(ext) && size>MAX_TEXT_IMPORT_BYTES){
    throw new Error(`Текстовий файл ${file.name} завеликий. Максимум ${bytes(MAX_TEXT_IMPORT_BYTES)}.`);
  }
}
function assertSafeArchive(zip,label='Архів'){
  const entries=Object.values(zip?.files||{});
  if(entries.length>MAX_ARCHIVE_ENTRIES) throw new Error(`${label} містить забагато файлів.`);
  let total=0;
  for(const entry of entries){
    const size=Number(entry?._data?.uncompressedSize||0);
    if(Number.isFinite(size) && size>0) total+=size;
    if(total>MAX_ARCHIVE_UNCOMPRESSED_BYTES) throw new Error(`${label} завеликий після розпакування.`);
  }
}
async function safeZipText(zip,path){
  const entry=zip.file(path);
  if(!entry) return '';
  const declared=Number(entry?._data?.uncompressedSize||0);
  if(declared>MAX_ARCHIVE_TEXT_BYTES) throw new Error(`Файл ${path} завеликий після розпакування.`);
  const text=await entry.async('text');
  if(estimateUtf8Bytes(text)>MAX_ARCHIVE_TEXT_BYTES) throw new Error(`Файл ${path} завеликий після розпакування.`);
  return text;
}
function toast(msg){const t=$('toast'); t.textContent=translateText(msg); t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),1900);}
function showNotice(msg,kind='info'){const notice=$('appNotice'); if(!notice) return; $('appNoticeText').textContent=translateText(msg); notice.dataset.kind=kind; notice.classList.add('show');}
function hideNotice(){$('appNotice')?.classList.remove('show');}
function confirmI18n(msg){return confirm(translateText(msg));}
function promptI18n(msg, value=''){return prompt(translateText(msg), value);}
function reportContentScore(report){
  if(!report || typeof report!=='object') return 0;
  return ['datasets','files','charts','tables','companies'].reduce((total,key)=>total+(Array.isArray(report[key])?report[key].length:0),0);
}
function reportUpdatedAt(report){
  const time=Date.parse(String(report?.meta?.savedAt||report?.meta?.updatedAt||''));
  return Number.isFinite(time)?time:0;
}
function serializeReportData(report){
  return JSON.stringify(report,null,2)
    .replace(/</g,'\\u003c')
    .replace(/>/g,'\\u003e')
    .replace(/&/g,'\\u0026')
    .replace(/\u2028/g,'\\u2028')
    .replace(/\u2029/g,'\\u2029');
}
function loadReport(){
  let embedded=null;
  try{
    const el=document.getElementById('reportData');
    const txt=(el?.textContent||'').trim();
    embedded=txt?JSON.parse(txt):null;
  }catch(e){
    embedded=null;
  }
  if(embedded?.meta?.clientLocked || HOSTED_MODE) return embedded;
  try{
    const ls=localStorage.getItem(REPORT_STORAGE_KEY);
    if(ls){
      const parsed=JSON.parse(ls);
      if(parsed && typeof parsed==='object'){
        const lsScore=reportContentScore(parsed);
        const embeddedScore=reportContentScore(embedded);
        if(embedded?.meta?.savedAt && reportUpdatedAt(embedded)>reportUpdatedAt(parsed)) return embedded;
        if(embedded && embeddedScore>0 && lsScore===0) return embedded;
        if(embedded && embeddedScore>0 && reportUpdatedAt(embedded)>reportUpdatedAt(parsed)) return embedded;
        return parsed;
      }
    }
  }catch(e){
    console.warn('[storage] loadReport localStorage failed:', e?.message||e);
  }
  return embedded;
}
function estimateUtf8Bytes(s){
  try{return new Blob([String(s||'')]).size;}catch(e){return String(s||'').length*2;}
}
function saveReportToLocal(){
  if((HOSTED_MODE&&cloudSync.enabled) || REPORT.meta?.clientLocked) return;
  try{
    const raw=JSON.stringify(persistedReportSnapshot());
    const bytes=estimateUtf8Bytes(raw);
    if(bytes>LOCALSTORAGE_MAX_BYTES){
      if(!localStorageDisabledBySize){
        localStorageDisabledBySize=true;
        console.warn(`[storage] localStorage autosave skipped: ${bytes} bytes > ${LOCALSTORAGE_MAX_BYTES}`);
        toast('Дані великі: autosave у localStorage вимкнено');
      }
      return;
    }
    localStorageDisabledBySize=false;
    localStorage.setItem(REPORT_STORAGE_KEY, raw);
  }catch(e){
    console.warn('[storage] saveReportToLocal failed:', e?.message||e);
  }
}
function saveReportIntoHtml(){
  REPORT.meta=REPORT.meta||{};
  REPORT.meta.accessMode=REPORT.meta.clientLocked?'viewer':(state?.access||REPORT.meta.accessMode||'admin');
  REPORT.meta.activeDataset=state?.activeDataset||REPORT.meta.activeDataset||null;
  const snapshot=persistedReportSnapshot();
  snapshot.meta=snapshot.meta||{};
  snapshot.meta.accessMode=REPORT.meta.accessMode;
  snapshot.meta.activeDataset=(snapshot.datasets||[]).some(d=>d.id===REPORT.meta.activeDataset)
    ? REPORT.meta.activeDataset
    : (snapshot.datasets||[])[0]?.id||null;
  $('reportData').textContent = serializeReportData(snapshot);
}
function persistNow(){
  if(persistTimer){clearTimeout(persistTimer); persistTimer=null;}
  saveReportIntoHtml();
  saveReportToLocal();
  scheduleCloudPersist(0);
}
function schedulePersist(){
  if(persistTimer) clearTimeout(persistTimer);
  persistTimer=setTimeout(()=>{persistTimer=null; saveReportIntoHtml(); saveReportToLocal(); scheduleCloudPersist();}, PERSIST_DEBOUNCE_MS);
}
function setCloudStatus(status,label,title=''){
  const el=$('cloudStatus');
  if(!el) return;
  el.dataset.state=status;
  el.textContent=label;
  el.title=title||label;
}
function cloudSnapshot(){
  const snapshot=persistedReportSnapshot();
  snapshot.meta=snapshot.meta||{};
  snapshot.meta.accessMode='admin';
  delete snapshot.meta.clientLocked;
  return snapshot;
}
async function cloudApi(){
  const err=new Error('Мережевий API вимкнено: дані залишаються лише у браузері.');
  err.code='API_DISABLED';
  throw err;
}
function scheduleCloudPersist(delay=CLOUD_PERSIST_DEBOUNCE_MS){
  if(!cloudSync.enabled||!cloudSync.ready||cloudSync.suppress||cloudSync.conflict||!cloudCanWrite()||isClientLocked()) return;
  cloudSync.dirty=true;
  cloudSync.changeSeq=(cloudSync.changeSeq||0)+1;
  queueCloudSave(delay);
}
function queueCloudSave(delay=CLOUD_PERSIST_DEBOUNCE_MS){
  if(!cloudSync.enabled||!cloudSync.ready||cloudSync.suppress||cloudSync.conflict||!cloudCanWrite()||isClientLocked()) return;
  if(cloudSync.saveTimer) clearTimeout(cloudSync.saveTimer);
  cloudSync.saveTimer=setTimeout(()=>{cloudSync.saveTimer=null; saveReportToCloud();},Math.max(0,delay));
}
async function saveReportToCloud(){
  if(!cloudSync.ready||cloudSync.saving||cloudSync.conflict||!cloudCanWrite()||!cloudSync.reportId||!cloudSync.dirty) return;
  if(cloudSync.saveTimer){clearTimeout(cloudSync.saveTimer);cloudSync.saveTimer=null;}
  cloudSync.saving=true;
  const saveSeq=cloudSync.changeSeq||0;
  let retryDelay=null;
  setCloudStatus('saving','Хмара…','Збереження спільного звіту');
  try{
    const snapshot=cloudSnapshot();
    const result=await cloudApi(`/api/reports/${encodeURIComponent(cloudSync.reportId)}`,{
      method:'PUT',
      body:JSON.stringify({expectedVersion:cloudSync.version,title:snapshot.meta?.title||'Shared report',report:snapshot})
    });
    cloudSync.version=result.version;
    cloudSync.retryCount=0;
    if((cloudSync.changeSeq||0)===saveSeq) cloudSync.dirty=false;
    setCloudStatus('saved',`Хмара · v${cloudSync.version}`,`Збережено. ${cloudSync.user?.email||''}`);
  }catch(e){
    console.error('[cloud] save failed:',e);
    if(e.status===409||e.code==='VERSION_CONFLICT'){
      cloudSync.conflict=true;
      setCloudStatus('conflict','Конфлікт','Інший користувач уже змінив цей звіт');
      toast('Конфлікт версій: інший користувач уже зберіг зміни. Експортуйте свою копію та перезавантажте звіт.');
    }else{
      const retryIndex=Math.min(cloudSync.retryCount,CLOUD_RETRY_DELAYS_MS.length-1);
      retryDelay=CLOUD_RETRY_DELAYS_MS[retryIndex];
      cloudSync.retryCount+=1;
      const retrySeconds=Math.ceil(retryDelay/1000);
      setCloudStatus('error','Хмара: повтор',`${e.message||'Помилка збереження'}. Повтор через ${retrySeconds} с.`);
      if(cloudSync.retryCount===1) toast('Не вдалося зберегти звіт у хмарі. Повторю автоматично.');
    }
  }finally{
    cloudSync.saving=false;
    if(cloudSync.dirty&&!cloudSync.conflict){
      if(retryDelay!==null) queueCloudSave(retryDelay);
      else if((cloudSync.changeSeq||0)!==saveSeq) queueCloudSave();
    }
  }
}
function applyCloudReport(payload){
  cloudSync.suppress=true;
  cloudSync.ready=false;
  REPORT=normalizeReport(payload.report||DEFAULT);
  REPORT.meta=REPORT.meta||{};
  REPORT.meta.accessMode=cloudCanWrite()?'admin':'viewer';
  delete REPORT.meta.clientLocked;
  cloudSync.reportId=payload.id;
  cloudSync.version=Number(payload.version)||1;
  cloudSync.conflict=false;
  cloudSync.dirty=false;
  cloudSync.changeSeq=0;
  cloudSync.retryCount=0;
  state.activeDataset=null;
  state.activeCompany=null;
  state.compareA=null;
  state.compareB=null;
  state.activeFile=null;
  state.openTabs=[];
  initState();
  refresh();
  if(persistTimer){clearTimeout(persistTimer);persistTimer=null;}
  if(cloudSync.saveTimer){clearTimeout(cloudSync.saveTimer);cloudSync.saveTimer=null;}
  saveReportIntoHtml();
  cloudSync.ready=true;
  cloudSync.suppress=false;
  setCloudStatus('saved',`Хмара · v${cloudSync.version}`,`Спільний звіт. ${cloudSync.user?.email||''}`);
}
async function reloadCloudReport(){
  if(!cloudSync.ready||!cloudSync.reportId) return;
  if(cloudSync.dirty||cloudSync.saving){toast('Спочатку дочекайтеся збереження локальних змін');return;}
  setCloudStatus('loading','Оновлення…');
  try{
    const payload=await cloudApi(`/api/reports/${encodeURIComponent(cloudSync.reportId)}`);
    applyCloudReport(payload);
    toast('Завантажено актуальну версію звіту');
  }catch(e){
    console.error('[cloud] reload failed:',e);
    setCloudStatus('error','Хмара: помилка',e.message||'Помилка завантаження');
  }
}
async function initCloudSync(){
  if(BROWSER_ONLY_MODE){
    cloudSync.enabled=false;
    cloudSync.ready=false;
    cloudSync.localFallback=true;
    cloudSync.role=null;
    state.access=isClientLocked()?'viewer':(REPORT.meta?.accessMode||'admin');
    app.dataset.access=state.access;
    setCloudStatus('local','Лише браузер','Файли й дані не відправляються на сервер');
    return;
  }
  if(!HOSTED_MODE||isClientLocked()){
    setCloudStatus('local',isClientLocked()?'Клієнтська копія':'Локально');
    return;
  }
  cloudSync.enabled=true;
  cloudSync.localFallback=false;
  setCloudStatus('loading','Підключення…','Підключення до спільного сховища');
  state.access='viewer';
  app.dataset.access='viewer';
  try{
    const health=await cloudApi('/api/health');
    if(health?.configured===false){
      const err=new Error('Cloud storage is not configured.');
      err.code='CLOUD_NOT_CONFIGURED';
      throw err;
    }
    const session=await cloudApi('/api/session');
    cloudSync.user=session.user;
    cloudSync.workspace=session.workspace;
    cloudSync.role=session.role;
    const list=await cloudApi('/api/reports');
    let payload;
    if(!list.reports?.length){
      if(!cloudCanWrite()) throw new Error('У робочому просторі ще немає звітів, а ваша роль лише для перегляду.');
      const snapshot=cloudSnapshot();
      payload=await cloudApi('/api/reports',{
        method:'POST',
        body:JSON.stringify({title:snapshot.meta?.title||'Marketing Report Studio',report:snapshot})
      });
    }else{
      payload=await cloudApi(`/api/reports/${encodeURIComponent(list.reports[0].id)}`);
    }
    applyCloudReport(payload);
  }catch(e){
    if(['API_UNAVAILABLE','NOT_FOUND','MISSING_DB','MISSING_R2','ACCESS_NOT_CONFIGURED','CLOUD_NOT_CONFIGURED'].includes(e.code)){
      console.warn('[cloud] disabled, using local fallback:', e.code);
      cloudSync.enabled=false;
      cloudSync.ready=false;
      cloudSync.localFallback=true;
      cloudSync.role=null;
      try{
        const cached=localStorage.getItem(REPORT_STORAGE_KEY);
        if(cached) REPORT=normalizeReport(JSON.parse(cached));
      }catch(cacheError){console.warn('[storage] fallback cache load failed:',cacheError);}
      REPORT.meta=REPORT.meta||{};
      REPORT.meta.accessMode='admin';
      state.access='admin';
      app.dataset.access='admin';
      initState();
      setCloudStatus('local','Локально','Хмарне сховище ще не налаштоване');
      refresh();
      toast('Хмарне сховище ще не налаштоване. Дані зберігаються лише в цьому браузері.');
      return;
    }
    console.error('[cloud] initialization failed:',e);
    cloudSync.ready=false;
    state.access='viewer';
    app.dataset.access='viewer';
    const label=e.code==='NOT_PROVISIONED'?'Немає доступу':'Хмара: помилка';
    setCloudStatus('error',label,e.message||'Помилка підключення');
    toast(e.code==='NOT_PROVISIONED'?'Ваш email ще не додано до робочого простору':'Спільне сховище недоступне. Редагування заблоковано.');
    refresh();
  }
}
function dataset(id){
  if(id===undefined || id===null || id==='') return REPORT.datasets[0] || null;
  return REPORT.datasets.find(d=>d.id===id) || null;
}
function fileRec(id){return REPORT.files.find(f=>f.id===id) || null}
function columns(ds){return (ds?.columns || inferColumns(ds?.rows || [])).map(c=>typeof c==='string'?{name:c,type:'text'}:c).filter(c=>!String(c.name).startsWith('_'))}
function textCols(ds){return columns(ds).filter(c=>c.type!=='number').map(c=>c.name).concat(columns(ds).filter(c=>c.type==='number').map(c=>c.name))}
function numberCols(ds){return columns(ds).filter(c=>c.type==='number').map(c=>c.name)}
function isClientLocked(){return REPORT.meta?.clientLocked===true}
function cloudCanWrite(){return cloudSync.role==='owner'||cloudSync.role==='editor'}
function isAdmin(){return !isClientLocked() && state.access!=='viewer' && (!HOSTED_MODE || !cloudSync.ready || cloudCanWrite())}
function guardAdmin(){if(!isAdmin()){toast(isClientLocked()?'Це зафіксована клієнтська версія. Редагування вимкнено.':'Цей звіт відкрито лише для перегляду.'); return false;} return true;}
function slugify(s){return String(s||'company').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,60)||'company'}
function guessNameCol(ds){const cols=columns(ds).map(c=>c.name); return cols.find(c=>/^(brand|company|competitor|name|назва|компанія|бренд)$/i.test(c)) || cols.find(c=>/(brand|company|competitor|name|назва|компанія|бренд)/i.test(c)) || cols[0];}
function strongCompanyNameCol(ds){const cols=columns(ds).map(c=>c.name); const exactName=cols.find(c=>/^(name|назва)$/i.test(c)); const context=String(ds?.name||''); if(exactName&&/(competitor|company|brand|client|конкурент|компан|бренд|клієнт)/i.test(context)) return exactName; return cols.find(c=>/^(brand|company|competitor|client|company_name|competitor_name|назва компанії|компанія|бренд|конкурент|клієнт)$/i.test(c)) || cols.find(c=>/(company|competitor|brand|компан|бренд|конкурент|клієнт)/i.test(c)) || null;}
function ciEmptyModel(generatedAt=null){
  return {
    schema_version:CI_SCHEMA_VERSION,
    generated_at:generatedAt,
    lineage_rule:CI_LINEAGE_RULE,
    clients:[],
    projects:[],
    market_contexts:[],
    project_competitors:[],
    competitors:[],
    sources:[],
    source_snapshots:[],
    observations:[],
    facts:[],
    insights:[],
    recommendations:[],
    client_decisions:[],
    quality:{},
    metadata:{generator:'marketing_report_studio_v8', mode:'derived_from_report'}
  };
}
function normalizeCiModel(ci){
  const out=ciEmptyModel(ci?.generated_at||null);
  if(ci&&typeof ci==='object') Object.assign(out,ci);
  ['clients','projects','market_contexts','project_competitors','competitors','sources','source_snapshots','observations','facts','insights','recommendations','client_decisions'].forEach(k=>{out[k]=Array.isArray(out[k])?out[k]:[];});
  out.schema_version=out.schema_version||CI_SCHEMA_VERSION;
  out.lineage_rule=out.lineage_rule||CI_LINEAGE_RULE;
  out.quality=out.quality&&typeof out.quality==='object'?out.quality:{};
  out.metadata=out.metadata&&typeof out.metadata==='object'?out.metadata:{};
  return out;
}
function ciId(prefix,...parts){return `${prefix}_${hashString(parts.map(p=>typeof p==='string'?p:JSON.stringify(p??'')).join('|'))}`;}
function ciClamp(n,min,max){n=num(n); return Math.max(min,Math.min(max,n));}
function ciTrim(s,max=500){s=String(s??'').replace(/\s+/g,' ').trim(); return s.length>max?s.slice(0,max-1).trim()+'…':s;}
function ciScalar(v){return v===null || ['string','number','boolean'].includes(typeof v);}
function ciNonEmpty(v){return v!==null && v!==undefined && String(v).trim()!=='';}
function ciValueOr(value,fallback){return ciNonEmpty(value)?value:fallback;}
function ciDate(v,fallback=null){const d=new Date(String(v||'')); return Number.isFinite(d.getTime())?d.toISOString():fallback;}
function ciDateOnly(v){const d=new Date(String(v||'')); return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):null;}
function ciFirst(row,patterns){
  if(!row||typeof row!=='object') return '';
  const entries=Object.entries(row);
  for(const re of patterns){
    const found=entries.find(([k,v])=>re.test(String(k))&&ciNonEmpty(v));
    if(found) return found[1];
  }
  return '';
}
function ciEnum(value,allowed,fallback){value=String(value||'').trim().toLowerCase(); return allowed.includes(value)?value:fallback;}
function ciSourceLocator(file,ds){
  const raw=file?.url||file?.path||ds?.sourcePath||file?.name||ds?.name||'local-source';
  const s=String(raw||'local-source').trim();
  if(/^https?:\/\//i.test(s)) return s;
  return `local://${s.replace(/^\/+/,'')}`;
}
function ciCanonicalUrl(value){
  const raw=String(value||'').trim();
  if(!raw) return 'local://source';
  try{
    const u=new URL(raw);
    [...u.searchParams.keys()].forEach(k=>{if(/^utm_|^(fbclid|gclid|yclid|mc_cid|mc_eid)$/i.test(k)) u.searchParams.delete(k);});
    u.hash='';
    u.hostname=u.hostname.toLowerCase();
    if(u.pathname.length>1) u.pathname=u.pathname.replace(/\/+$/,'');
    return u.toString();
  }catch(e){
    return raw.replace(/[?#].*$/,'').replace(/\/+$/,'');
  }
}
function ciDomain(value){
  const raw=String(value||'').trim();
  try{
    const u=new URL(raw);
    if(u.protocol==='local:') return 'local-file';
    const host=u.hostname.replace(/^www\./i,'').toLowerCase();
    return host&&host.includes('.')?host:'local-file';
  }catch(e){}
  const m=raw.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i);
  return m?m[1].toLowerCase():'local-file';
}
function ciInferSourceType(file,ds){
  const text=`${file?.name||''} ${file?.path||''} ${ds?.name||''} ${ds?.sourceKind||''}`.toLowerCase();
  if(/pricing|price|тариф|ціна/.test(text)) return 'pricing';
  if(/home|homepage|головн/.test(text)) return 'homepage';
  if(/product|feature|docs|docx|pdf|documentation|фіч|продукт/.test(text)) return 'product_page';
  if(/compare|comparison|порівн/.test(text)) return 'comparison_page';
  if(/case|customer|testimonial|кейс|відгук клієнт/.test(text)) return 'case_study';
  if(/blog|article|content|seo/.test(text)) return 'blog';
  if(/changelog|release|оновлен/.test(text)) return 'changelog';
  if(/job|career|hiring|ваканс/.test(text)) return 'jobs';
  if(/linkedin/.test(text)) return 'social_linkedin';
  if(/review|g2|capterra|trustpilot|відгук/.test(text)) return 'reviews';
  if(/newsletter|email|лист/.test(text)) return 'newsletter';
  if(/ad|ads|landing|campaign|кампан/.test(text)) return 'ads_landing';
  return ds?'market_serp':'docs';
}
function ciInferCollectionMethod(file,ds){
  const locator=ciSourceLocator(file,ds);
  if(/^https?:\/\//i.test(locator)) return 'http';
  if(/rss/i.test(String(file?.type||file?.name||''))) return 'rss';
  if(/json/i.test(String(file?.ext||''))) return 'api';
  return 'manual';
}
function ciInferFactCategory(ds,row){
  const text=`${ds?.name||''} ${Object.keys(row||{}).join(' ')}`.toLowerCase();
  if(/price|pricing|cost|cpc|cpa|тариф|ціна|варт/.test(text)) return 'pricing_packaging';
  if(/feature|integration|product|docs|фіч|інтеграц|продукт/.test(text)) return 'product_feature';
  if(/case|testimonial|logo|customer|кейс|клієнт/.test(text)) return 'social_proof';
  if(/blog|seo|keyword|traffic|content|контент|ключ/.test(text)) return 'content_strategy';
  if(/ad|ads|campaign|landing|paid|реклам|кампан/.test(text)) return 'paid_marketing';
  if(/email|newsletter|sequence|лист/.test(text)) return 'email_marketing';
  if(/review|sentiment|support|complaint|відгук|скарг/.test(text)) return 'reputation';
  if(/job|hiring|career|ваканс|найм/.test(text)) return 'hiring_signal';
  if(/partner|partnership|партнер/.test(text)) return 'partnership';
  if(/market|trend|views|likes|comments|engagement|попит|ринок/.test(text)) return 'market_signal';
  return 'positioning';
}
function ciInferObservationType(ds,row){
  const cat=ciInferFactCategory(ds,row);
  const map={pricing_packaging:'pricing_added',product_feature:'feature_added',social_proof:'case_added',content_strategy:'campaign_detected',paid_marketing:'campaign_detected',email_marketing:'newsletter_offer',reputation:'review_spike',hiring_signal:'job_added',partnership:'claim_change',market_signal:'claim_change',positioning:'claim_change'};
  return map[cat]||'claim_change';
}
function ciInferInsightType(text){
  text=String(text||'').toLowerCase();
  if(/price|pricing|cpc|cost|тариф|ціна/.test(text)) return 'pricing_pressure';
  if(/feature|product|integration|фіч|продукт/.test(text)) return 'product_gap';
  if(/seo|traffic|views|channel|контент|канал/.test(text)) return 'channel_strength';
  if(/message|headline|cta|position|позиціон|меседж/.test(text)) return 'messaging_pattern';
  if(/risk|threat|загроз|ризик/.test(text)) return 'risk_signal';
  if(/opportun|gap|можлив/.test(text)) return 'opportunity_gap';
  if(/review|support|sentiment|відгук/.test(text)) return 'reputation_weakness';
  return 'market_trend';
}
function ciStrategicArea(text){
  text=String(text||'').toLowerCase();
  if(/price|pricing|cost|тариф|ціна/.test(text)) return 'pricing';
  if(/product|feature|integration|фіч|продукт/.test(text)) return 'product';
  if(/seo|content|keyword|traffic|контент/.test(text)) return 'seo';
  if(/sales|demo|enterprise|продаж/.test(text)) return 'sales';
  if(/ad|ads|campaign|paid|реклам/.test(text)) return 'ads';
  return 'positioning';
}
function ciRecommendationType(text){
  text=String(text||'').toLowerCase();
  if(/price|pricing|trial|тариф|ціна/.test(text)) return 'pricing';
  if(/product|feature|onboarding|фіч|продукт/.test(text)) return 'product';
  if(/seo|content|keyword|comparison|контент/.test(text)) return 'seo';
  if(/sales|battlecard|objection|demo|продаж/.test(text)) return 'sales_enablement';
  if(/ad|ads|landing|campaign|реклам/.test(text)) return 'ads';
  if(/email|newsletter|sequence|лист/.test(text)) return 'email';
  if(/trust|case|testimonial|security|довір|кейс/.test(text)) return 'brand_trust';
  return 'messaging';
}
function ciRowLabel(row,ds,idx=0){
  const candidates=[guessNameCol(ds),'video_label','full_title','title','name','brand','company','competitor','url','domain'];
  for(const c of candidates){
    if(c && ciNonEmpty(row?.[c])) return ciTrim(row[c],160);
  }
  return `row ${idx+1}`;
}
function ciScalarEntries(row,limit=10){
  return Object.entries(row||{})
    .filter(([k,v])=>!String(k).startsWith('_')&&ciScalar(v)&&ciNonEmpty(v))
    .slice(0,limit);
}
function ciEvidenceSnippet(row,ds,idx=0){
  const label=ciRowLabel(row,ds,idx);
  const entries=ciScalarEntries(row,12).map(([k,v])=>`${k}: ${jsonScalarText(v)}`);
  let text=`${ds?.name||'Dataset'} / ${label}`;
  if(entries.length) text+=` - ${entries.join('; ')}`;
  if(text.length<24) text=`${text}; source row ${idx+1}`;
  return ciTrim(text,1000);
}
function ciFactText(row,ds,idx=0){
  const label=ciRowLabel(row,ds,idx);
  const entries=ciScalarEntries(row,7).map(([k,v])=>`${k}=${jsonScalarText(v)}`);
  return ciTrim(`${label} у наборі "${ds?.name||'Dataset'}" має зафіксовані значення: ${entries.join('; ')||'рядок даних з джерела'}.`,700);
}
function ciRowMateriality(row,ds){
  const direct=ciFirst(row,[/materiality/i,/impact/i,/priority/i,/score/i,/threat/i,/overall/i,/оцін|пріоритет|вплив/i]);
  if(isNum(direct)) return ciClamp(num(direct)>1?num(direct):num(direct)*100,0,100);
  const nums=ciScalarEntries(row,20).map(([,v])=>isNum(v)?num(v):null).filter(v=>v!==null);
  const max=nums.length?Math.max(...nums.map(v=>Math.abs(v))):0;
  return ciClamp(max>100?70:max>10?60:max>0?50:40,0,100);
}
function ciConfidence(row,ds,hasSource=true){
  const filled=ciScalarEntries(row,30).length;
  const evidence=ciEvidenceSnippet(row,ds).length>20?0.15:0;
  return ciClamp(0.48 + Math.min(filled,10)*0.035 + evidence + (hasSource?0.12:0),0.35,0.95);
}
function ciCompanyIdForRow(row,companyByName,ds){
  const nameCol=strongCompanyNameCol(ds);
  if(!nameCol) return null;
  if(row?._companyId) return String(row._companyId);
  const nm=String(row?.[nameCol]||row?.company||row?.brand||row?.competitor||row?.name||'').trim().toLowerCase();
  return nm?companyByName.get(nm)||null:null;
}
function ciBuildQuality(ci){
  const facts=ci.facts||[], insights=ci.insights||[], recommendations=ci.recommendations||[];
  const factsWithEvidence=facts.filter(f=>f.source_id&&f.snapshot_id&&ciNonEmpty(f.evidence_snippet)).length;
  const insightsWithFacts=insights.filter(i=>Array.isArray(i.supporting_fact_ids)&&i.supporting_fact_ids.length).length;
  const recsWithInsight=recommendations.filter(r=>ciNonEmpty(r.insight_id)).length;
  return {
    counts:{
      clients:ci.clients.length,
      projects:ci.projects.length,
      competitors:ci.competitors.length,
      sources:ci.sources.length,
      source_snapshots:ci.source_snapshots.length,
      observations:ci.observations.length,
      facts:facts.length,
      insights:insights.length,
      recommendations:recommendations.length
    },
    gates:{
      facts_with_evidence:facts.length?factsWithEvidence/facts.length:1,
      insights_with_facts:insights.length?insightsWithFacts/insights.length:1,
      recommendations_with_insight:recommendations.length?recsWithInsight/recommendations.length:1,
      unsupported_insights:insights.length-insightsWithFacts,
      recommendations_without_insight:recommendations.length-recsWithInsight
    },
    qa_rules:[
      {id:'QA-001',rule:'Fact must have source_id and snapshot_id',status:facts.every(f=>f.source_id&&f.snapshot_id)?'pass':'fail'},
      {id:'QA-002',rule:'Fact must have evidence_snippet > 20 chars',status:facts.every(f=>String(f.evidence_snippet||'').length>20)?'pass':'fail'},
      {id:'QA-003',rule:'Insight must reference at least one Fact',status:insights.every(i=>Array.isArray(i.supporting_fact_ids)&&i.supporting_fact_ids.length)?'pass':'fail'},
      {id:'QA-004',rule:'Recommendation must reference Insight',status:recommendations.every(r=>r.insight_id)?'pass':'fail'}
    ]
  };
}
function buildUnifiedCiModel(report){
  const r=report||{};
  const now=new Date().toISOString();
  const ci=ciEmptyModel(now);
  const meta=r.meta||{};
  const title=String(meta.title||'Ринкова конкурентна розвідка').trim();
  const companies=Array.isArray(r.companies)?r.companies:[];
  const files=Array.isArray(r.files)?r.files:[];
  const datasets=Array.isArray(r.datasets)?r.datasets:[];
  const charts=Array.isArray(r.charts)?r.charts:[];
  const tables=Array.isArray(r.tables)?r.tables:[];
  const companyByName=new Map(companies.map(c=>[String(c.name||'').trim().toLowerCase(),String(c.id||'')]));
  const clientCompany=companies.find(c=>String(c.type||'').toLowerCase()==='client')||null;
  const clientId=ciId('clt',clientCompany?.id||clientCompany?.name||meta.companyName||title||'client');
  ci.clients.push({
    client_id:clientId,
    name:String(clientCompany?.name||meta.companyName||'Client').trim()||'Client',
    website_url:String(clientCompany?.website_url||clientCompany?.websiteUrl||''),
    industry:String(clientCompany?.industry||''),
    created_at:ciDate(clientCompany?.createdAt,now)
  });
  const projectId=ciId('prj',meta.project_id||meta.companyName||title||'default');
  ci.projects.push({
    project_id:projectId,
    client_id:clientId,
    project_type:ciEnum(meta.projectType,['selected_competitors','product_review','market_map','deep_dive','monthly_radar'],'market_map'),
    title,
    scope:{dataset_ids:datasets.map(d=>d.id).filter(Boolean),file_ids:files.map(f=>f.id).filter(Boolean)},
    target_market:String(meta.targetMarket||meta.companyName||''),
    status:ciEnum(meta.status,['intake','collecting','parsing','analyzing','qa','approved','delivered','monitoring','archived'],meta.accessMode==='viewer'?'delivered':'analyzing'),
    deadline:ciDate(meta.deadline,null),
    created_at:ciDate(meta.createdAt,now),
    updated_at:now
  });
  const marketContextId=ciId('mkt',meta.targetMarket||meta.companyName||title||'market');
  ci.market_contexts.push({
    market_context_id:marketContextId,
    name:String(meta.targetMarket||meta.companyName||title||'Market Context'),
    geo_scope:String(meta.geoScope||''),
    buyer_segments:[],
    keywords:[],
    category_terms:[],
    market_signals:{},
    created_at:now
  });
  const competitorByCompanyId=new Map();
  const sourceByKey=new Map();
  const sourceByFileId=new Map();
  const sourceByDatasetId=new Map();
  const fileById=new Map(files.map(f=>[String(f.id||''),f]));
  const filesByCompany=new Map();
  for(const f of files){
    if(!f?.companyId) continue;
    const key=String(f.companyId);
    if(!filesByCompany.has(key)) filesByCompany.set(key,[]);
    filesByCompany.get(key).push(f);
  }
  const rowSamplesByCompany=new Map();
  for(const ds of datasets){
    for(const row of ds.rows||[]){
      const cid=row?._companyId;
      if(cid&&!rowSamplesByCompany.has(String(cid))){
        rowSamplesByCompany.set(String(cid),{row,ds,strong:!!strongCompanyNameCol(ds)});
      }
    }
  }
  for(const c of companies){
    if(String(c.type||'').toLowerCase()==='client') continue;
    const rowInfo=rowSamplesByCompany.get(String(c.id||''))||null;
    const row=rowInfo?.row||{};
    const companyFiles=filesByCompany.get(String(c.id||''))||[];
    const hasExplicitCompetitorData=companyFiles.length||ciNonEmpty(c.website_url)||ciNonEmpty(c.websiteUrl)||ciNonEmpty(c.competitor_type)||ciNonEmpty(c.market_segment)||ciNonEmpty(c.threat_score)||ciNonEmpty(c.confidence_score);
    if(rowInfo && !rowInfo.strong && !hasExplicitCompetitorData) continue;
    const website=String(c.website_url||c.websiteUrl||ciFirst(row,[/^website/i,/url/i,/domain/i,/site/i,/сайт/i])||'');
    const competitorId=ciId('cmp',c.id||c.name);
    competitorByCompanyId.set(String(c.id||''),competitorId);
    ci.competitors.push({
      competitor_id:competitorId,
      canonical_name:String(c.name||'Competitor').trim(),
      display_name:String(c.display_name||c.name||'Competitor').trim(),
      aliases:Array.isArray(c.aliases)?c.aliases:[],
      website_url:website,
      root_domain:website?ciDomain(website):slugify(c.name||'competitor'),
      country:String(c.country||row.country||''),
      regions:Array.isArray(c.regions)?c.regions:[],
      market_segment:String(c.market_segment||row.market_segment||'unknown'),
      competitor_type:ciEnum(c.competitor_type||row.competitor_type||c.type,['direct','indirect','substitute','content','ads','marketplace','agency','diy','unknown'],'unknown'),
      icp_summary:String(c.icp_summary||row.icp_summary||''),
      products:Array.isArray(c.products)?c.products:[],
      pricing_summary:String(c.pricing_summary||row.pricing_summary||''),
      channels:c.channels&&typeof c.channels==='object'?c.channels:{},
      positioning_summary:String(c.positioning_summary||row.positioning_summary||''),
      key_pages:Array.isArray(c.key_pages)?c.key_pages:[],
      social_profiles:Array.isArray(c.social_profiles)?c.social_profiles:[],
      status:ciEnum(c.status,['candidate','validated','active','low_activity','archived','rejected'],'active'),
      threat_level:ciEnum(c.threat_level,['low','medium','high','critical'],'medium'),
      threat_score:ciClamp(ciValueOr(c.threat_score,ciValueOr(row.threat_score,50)),0,100),
      confidence_score:ciClamp(ciValueOr(c.confidence_score,0.65),0,1),
      last_updated_at:now,
      created_at:ciDate(c.createdAt,now),
      created_by:String(c.created_by||'marketing_report_studio'),
      metadata:{legacy_company_id:c.id||'',folder:c.folder||''}
    });
    ci.project_competitors.push({project_id:projectId,competitor_id:competitorId,role:'monitored',priority:3});
  }
  function ensureSource(file=null,ds=null){
    const key=file?.id?`file:${file.id}`:`dataset:${ds?.id||ciId('ds-source',ds?.name||'dataset')}`;
    if(sourceByKey.has(key)){
      const ref=sourceByKey.get(key);
      if(file?.id) sourceByFileId.set(String(file.id),ref);
      if(ds?.id) sourceByDatasetId.set(String(ds.id),ref);
      return ref;
    }
    const sourceId=ciId('src',key,file?.path,file?.name,ds?.name);
    const locator=ciSourceLocator(file,ds);
    const canonical=ciCanonicalUrl(locator);
    const competitorId=file?.companyId?competitorByCompanyId.get(String(file.companyId))||null:null;
    const created=ciDate(file?.createdAt||ds?.createdAt||meta.updatedAt,now);
    const source={
      source_id:sourceId,
      competitor_id:competitorId,
      market_context_id:competitorId?null:marketContextId,
      url:locator,
      canonical_url:canonical,
      domain:ciDomain(canonical),
      source_type:ciInferSourceType(file,ds),
      collection_method:ciInferCollectionMethod(file,ds),
      allowed_collection:true,
      robots_policy:{allowed:true,mode:'manual_or_imported'},
      check_frequency:'manual',
      priority:3,
      last_crawled_at:created,
      last_success_at:created,
      last_error_at:null,
      last_error_code:null,
      last_content_hash:null,
      last_change_summary:'',
      access_status:'ok',
      is_active:true,
      metadata:{legacy_file_id:file?.id||'',legacy_dataset_id:ds?.id||'',source_kind:ds?.sourceKind||file?.ext||'manual'},
      created_at:created,
      updated_at:now
    };
    const content=file?.contentText||file?.contentBase64||JSON.stringify({file:file?.name||'',dataset:ds?.name||'',rows:ds?.rows?.length||0});
    const contentHash='fnv1a_'+hashString(content);
    source.last_content_hash=contentHash;
    ci.sources.push(source);
    const snapshotId=ciId('snap',sourceId,contentHash);
    const snapshot={
      snapshot_id:snapshotId,
      source_id:sourceId,
      fetched_at:created,
      http_status:null,
      content_hash:contentHash,
      raw_html_path:String(file?.ext||'').toLowerCase()==='html'?String(file?.path||file?.name||''):null,
      clean_text_path:file?.contentText?String(file?.path||file?.name||''):null,
      screenshot_path:null,
      pdf_path:String(file?.ext||'').toLowerCase()==='pdf'?String(file?.path||file?.name||''):null,
      extracted_text:file?.contentText?ciTrim(file.contentText,4000):'',
      metadata:{file_name:file?.name||'',file_size:file?.size||0,dataset_name:ds?.name||'',rows:ds?.rows?.length||0},
      collection_agent:'marketing_report_studio',
      processing_status:'parsed'
    };
    ci.source_snapshots.push(snapshot);
    const ref={source_id:sourceId,snapshot_id:snapshotId,source,snapshot};
    sourceByKey.set(key,ref);
    if(file?.id) sourceByFileId.set(String(file.id),ref);
    if(ds?.id) sourceByDatasetId.set(String(ds.id),ref);
    return ref;
  }
  files.forEach(f=>ensureSource(f,null));
  datasets.forEach(ds=>ensureSource(fileById.get(String(ds.sourceFileId||''))||null,ds));
  const factsByDataset=new Map();
  const observationsByDataset=new Map();
  const factByDatasetRow=new Map();
  for(const ds of datasets){
    const ref=sourceByDatasetId.get(String(ds.id))||ensureSource(null,ds);
    const factsForDs=[], obsForDs=[];
    (ds.rows||[]).forEach((row,idx)=>{
      if(!row||typeof row!=='object') return;
      const rowHash=hashString(JSON.stringify(row));
      const companyId=ciCompanyIdForRow(row,companyByName,ds);
      const competitorId=companyId?competitorByCompanyId.get(companyId)||null:null;
      const observedAt=ciDate(ds.createdAt||meta.updatedAt,now);
      const materiality=ciRowMateriality(row,ds);
      const confidence=ciConfidence(row,ds,true);
      const observationId=ciId('obs',ds.id,idx,rowHash);
      const factId=ciId('fact',ds.id,idx,rowHash);
      ci.observations.push({
        observation_id:observationId,
        source_id:ref.source_id,
        snapshot_id:ref.snapshot_id,
        competitor_id:competitorId,
        observation_type:ciInferObservationType(ds,row),
        raw_description:ciEvidenceSnippet(row,ds,idx),
        before_value:null,
        after_value:row,
        diff_payload:{source:'dataset_row',dataset_id:ds.id,row_index:idx},
        detected_at:observedAt,
        detected_by:'marketing_report_studio',
        materiality_score:materiality,
        noise_score:ciClamp(100-materiality,0,100),
        status:'promoted_to_fact',
        dismiss_reason:null
      });
      ci.facts.push({
        fact_id:factId,
        competitor_id:competitorId,
        source_id:ref.source_id,
        snapshot_id:ref.snapshot_id,
        observation_id:observationId,
        fact_text:ciFactText(row,ds,idx),
        fact_category:ciInferFactCategory(ds,row),
        claim_strength:'observed',
        evidence_snippet:ciEvidenceSnippet(row,ds,idx),
        evidence_url:ref.source.url,
        evidence_location:{dataset_id:ds.id,row_index:idx+1},
        date_observed:observedAt,
        valid_from:ciDateOnly(observedAt),
        valid_to:null,
        confidence_score:confidence,
        verification_status:confidence>=0.65?'auto_verified':'unverified',
        verified_by:confidence>=0.65?'system:auto_evidence_gate':null,
        verified_at:confidence>=0.65?observedAt:null,
        metadata:{dataset_id:ds.id,dataset_name:ds.name,row_index:idx+1}
      });
      factsForDs.push(factId);
      obsForDs.push(observationId);
      factByDatasetRow.set(`${ds.id}:${idx}`,{fact_id:factId,observation_id:observationId,confidence,materiality,competitor_id:competitorId});
    });
    if(factsForDs.length) factsByDataset.set(String(ds.id),factsForDs);
    if(obsForDs.length) observationsByDataset.set(String(ds.id),obsForDs);
  }
  const insightIds=new Set();
  const addInsight=(insight)=>{
    if(!insight||insightIds.has(insight.insight_id)) return;
    if(!Array.isArray(insight.supporting_fact_ids)||!insight.supporting_fact_ids.length) return;
    ci.insights.push(insight);
    insightIds.add(insight.insight_id);
  };
  const widgets=[
    ...charts.map(x=>({kind:'chart',item:x,title:x.title,datasetId:x.datasetId})),
    ...tables.map(x=>({kind:'table',item:x,title:x.title,datasetId:x.datasetId}))
  ];
  for(const w of widgets){
    const support=(factsByDataset.get(String(w.datasetId))||[]).slice(0,20);
    if(!support.length) continue;
    const titleText=String(w.title||w.kind);
    const ds=datasets.find(d=>d.id===w.datasetId);
    const confidence=ciClamp(0.6+Math.min(support.length,10)*0.025,0,0.9);
    addInsight({
      insight_id:ciId('ins',w.kind,w.item.id||titleText,w.datasetId),
      competitor_id:null,
      project_id:projectId,
      insight_text:ciTrim(`${w.kind==='chart'?'Графік':'Таблиця'} "${titleText}" узагальнює факти з набору "${ds?.name||w.datasetId}" і готовий до QA як аналітичний висновок.`,700),
      insight_type:ciInferInsightType(`${titleText} ${ds?.name||''}`),
      supporting_fact_ids:support,
      supporting_observation_ids:(observationsByDataset.get(String(w.datasetId))||[]).slice(0,20),
      confidence_score:confidence,
      impact_score:60,
      urgency_score:50,
      strategic_area:ciStrategicArea(`${titleText} ${ds?.name||''}`),
      claim_strength:'derived',
      counter_evidence:[],
      created_by:'marketing_report_studio',
      review_status:'draft',
      approved_by:null,
      created_at:now,
      updated_at:now,
      metadata:{legacy_widget_id:w.item.id||'',widget_kind:w.kind,dataset_id:w.datasetId}
    });
  }
  for(const ds of datasets){
    const cols=columns(ds).map(c=>c.name);
    const actionCols=cols.filter(c=>/recommend|рекоменд|action|дія|next[_\s-]?step|first[_\s-]?step/i.test(c));
    if(!actionCols.length) continue;
    (ds.rows||[]).forEach((row,idx)=>{
      const actionCol=actionCols.find(c=>ciNonEmpty(row?.[c]));
      if(!actionCol) return;
      const action=String(row[actionCol]||'').trim();
      const rowRef=factByDatasetRow.get(`${ds.id}:${idx}`);
      if(!rowRef) return;
      const factIds=[rowRef.fact_id];
      const insightId=ciId('ins','row-recommendation',ds.id,idx,rowRef.fact_id);
      addInsight({
        insight_id:insightId,
        competitor_id:rowRef.competitor_id,
        project_id:projectId,
        insight_text:ciTrim(String(ciFirst(row,[/insight|виснов/i])||`Рядок "${ciRowLabel(row,ds,idx)}" містить actionable signal, який потребує рішення клієнта.`),700),
        insight_type:ciInferInsightType(`${ds.name} ${action}`),
        supporting_fact_ids:factIds,
        supporting_observation_ids:[rowRef.observation_id],
        confidence_score:rowRef.confidence,
        impact_score:rowRef.materiality,
        urgency_score:ciClamp(ciValueOr(ciFirst(row,[/urgency|термін|urgent/i]),50),0,100),
        strategic_area:ciStrategicArea(action),
        claim_strength:'derived',
        counter_evidence:[],
        created_by:'marketing_report_studio',
        review_status:'draft',
        approved_by:null,
        created_at:now,
        updated_at:now,
        metadata:{dataset_id:ds.id,row_index:idx+1}
      });
      const effort=ciClamp(ciValueOr(ciFirst(row,[/effort|складн|зусилл/i]),50),0,100);
      const impact=ciClamp(ciValueOr(ciFirst(row,[/impact|вплив/i]),rowRef.materiality),0,100);
      const confidence=rowRef.confidence;
      const urgency=ciClamp(ciValueOr(ciFirst(row,[/urgency|термін|urgent/i]),50),0,100);
      const priority=ciClamp(impact*0.35+confidence*100*0.25+urgency*0.15+(100-effort)*0.15+60*0.10,0,100);
      ci.recommendations.push({
        recommendation_id:ciId('rec',ds.id,idx,action),
        project_id:projectId,
        competitor_id:rowRef.competitor_id,
        insight_id:insightId,
        recommendation_text:ciTrim(action,900),
        recommendation_type:ciRecommendationType(action),
        business_objective:String(ciFirst(row,[/objective|ціль|goal/i])||'conversion'),
        expected_impact:String(ciValueOr(ciFirst(row,[/expected|очікув|effect/i]),'Покращення метрики, заданої у success_metric.')),
        impact_score:impact,
        effort_score:effort,
        confidence_score:confidence,
        priority_score:priority,
        time_horizon:ciEnum(ciFirst(row,[/horizon|time|термін/i]),['7d','30d','90d','180d','later'],'30d'),
        owner_role:String(ciFirst(row,[/owner|role|власник/i])||'Marketing'),
        first_step:String(ciFirst(row,[/first[_\s-]?step|перш/i])||action),
        success_metric:String(ciFirst(row,[/metric|kpi|метрик/i])||'Target KPI delta'),
        risks:[],
        dependencies:[],
        status:ciEnum(ciFirst(row,[/status|статус/i]),['proposed','accepted','rejected','deferred','in_progress','done','measured','archived'],'proposed'),
        client_feedback:'',
        outcome_score:null,
        created_at:now,
        updated_at:now,
        metadata:{dataset_id:ds.id,row_index:idx+1,source_column:actionCol}
      });
    });
  }
  ci.quality=ciBuildQuality(ci);
  return ci;
}
function company(id, report=REPORT){return (report.companies||[]).find(c=>c.id===id) || null}
function companyFiles(id){return (REPORT.files||[]).filter(f=>f.companyId===id)}
function companyRows(id, dsId){const ds=dataset(dsId||state.activeDataset); const c=company(id); if(!ds||!c) return []; const nameCol=guessNameCol(ds); return (ds.rows||[]).filter(r=>r._companyId===id || String(r[nameCol]||'').trim()===c.name);}
function companyRow(id, dsId){return companyRows(id,dsId)[0] || null}
function ensureCompany(name,type, report=REPORT){name=String(name||'').trim(); if(!name) return null; report.companies=Array.isArray(report.companies)?report.companies:[]; let c=report.companies.find(x=>String(x.name||'').toLowerCase()===name.toLowerCase()); if(!c){c={id:uid('co'),name,type:type||'competitor',folder:slugify(name),createdAt:new Date().toISOString()}; report.companies.push(c);} else if(type==='client'){c.type='client'} return c;}
function syncCompaniesFromRows(r){r.companies=Array.isArray(r.companies)?r.companies:[]; for(const ds of r.datasets||[]){const nameCol=strongCompanyNameCol(ds); if(!nameCol) continue; for(const row of ds.rows||[]){const nm=String(row[nameCol]||'').trim(); if(!nm) continue; const type=String(row.type||row.role||'').toLowerCase()==='client'?'client':'competitor'; const c=ensureCompany(nm,type,r); row._companyId=c.id;}}}
function normalizeReport(r){r=clone(r); r.meta=r.meta||{}; r.datasets=Array.isArray(r.datasets)?r.datasets:[]; r.files=Array.isArray(r.files)?r.files:[]; r.charts=Array.isArray(r.charts)?r.charts:[]; r.tables=Array.isArray(r.tables)?r.tables:[]; r.companies=Array.isArray(r.companies)?r.companies:[]; r.ci=normalizeCiModel(r.ci); stripLiveMarkdownDerived(r); for(const ds of r.datasets){ds.id=ds.id||uid('ds'); ds.name=ds.name||'Таблиця'; ds.rows=Array.isArray(ds.rows)?ds.rows:[]; ds.columns=inferColumns(ds.rows);} syncCompaniesFromRows(r); for(const f of r.files){f.id=f.id||uid('file'); f.folder=f.folder||'Загальні'; f.path=f.path||((f.companyId?((company(f.companyId,r)?.folder||'company')+'/'):'')+f.name);} return r;}
function isGenericLiveMarkdownArtifact(x){return String(x?.sourceKind||'')==='markdown-live';}
function isLiveMarkdownArtifact(x){return ['markdown-live','markdown-fs-video'].includes(String(x?.sourceKind||''));}
function stripLiveMarkdownDerived(r){
  if(!r) return r;
  const liveDatasetIds=new Set((r.datasets||[]).filter(isLiveMarkdownArtifact).map(d=>d.id));
  r.datasets=(r.datasets||[]).filter(d=>!isLiveMarkdownArtifact(d));
  r.charts=(r.charts||[]).filter(ch=>!isLiveMarkdownArtifact(ch) && !liveDatasetIds.has(ch.datasetId));
  r.tables=(r.tables||[]).filter(tb=>!isLiveMarkdownArtifact(tb) && !liveDatasetIds.has(tb.datasetId));
  if(r.meta?.activeDataset && !(r.datasets||[]).some(d=>d.id===r.meta.activeDataset)){
    r.meta.activeDataset=(r.datasets||[])[0]?.id||null;
  }
  return r;
}
function persistedReportSnapshot(){
  const r=clone(REPORT);
  stripLiveMarkdownDerived(r);
  r.meta=r.meta||{};
  r.meta.savedAt=r.meta.updatedAt=new Date().toISOString();
  r.meta.lang=state.lang||r.meta.lang||'uk';
  let active=r.meta.activeDataset||null;
  try{active=state?.activeDataset||active;}catch(e){}
  r.meta.activeDataset=active && (r.datasets||[]).some(d=>d.id===active) ? active : (r.datasets||[])[0]?.id||null;
  r.ci=buildUnifiedCiModel(r);
  return r;
}
function portableSourceKind(kind){
  const map={
    'markdown-live':'markdown-bundled',
    'markdown-fs-video':'markdown-bundled-video',
    'structured-fs-data':'structured-bundled-data'
  };
  return map[String(kind||'')]||String(kind||'');
}
function makeFsDerivedPortable(report){
  for(const collection of ['datasets','charts','tables']){
    for(const item of (report?.[collection]||[])){
      const current=String(item.sourceKind||'');
      const portable=portableSourceKind(current);
      if(portable!==current) item.sourceKind=portable;
    }
  }
  return report;
}
function exportReportSnapshot(){
  const r=makeFsDerivedPortable(clone(REPORT));
  r.meta=r.meta||{};
  r.meta.savedAt=r.meta.updatedAt=new Date().toISOString();
  r.meta.lang=state.lang||r.meta.lang||'uk';
  const active=state?.activeDataset||r.meta.activeDataset||null;
  r.meta.activeDataset=active && (r.datasets||[]).some(d=>d.id===active) ? active : (r.datasets||[])[0]?.id||null;
  r.ci=buildUnifiedCiModel(r);
  return r;
}
function stripLegacyCaspianPack(r){
  if(!r) return r;
  const caspianFileIds=new Set(
    (r.files||[])
      .filter(f=>/^file-caspian/i.test(String(f.id||'')) || /caspianreport-5-youtube-reports\.csv/i.test(String(f.name||'')))
      .map(f=>f.id)
  );
  const caspianDatasetIds=new Set(
    (r.datasets||[])
      .filter(d=>
        /^ds-caspian/i.test(String(d.id||'')) ||
        /CaspianReport\s*·\s*5 YouTube звітів/i.test(String(d.name||'')) ||
        caspianFileIds.has(d.sourceFileId)
      )
      .map(d=>d.id)
  );

  if(!caspianFileIds.size && !caspianDatasetIds.size) return r;

  r.datasets=(r.datasets||[]).filter(d=>!caspianDatasetIds.has(d.id));
  r.files=(r.files||[]).filter(f=>!caspianFileIds.has(f.id));
  r.charts=(r.charts||[]).filter(ch=>!caspianDatasetIds.has(ch.datasetId) && !caspianFileIds.has(ch.sourceFileId));
  r.tables=(r.tables||[]).filter(tb=>!caspianDatasetIds.has(tb.datasetId) && !caspianFileIds.has(tb.sourceFileId));
  r.companies=(r.companies||[]).filter(c=>!/^\s*CaspianReport\s*$/i.test(String(c.name||'')));
  return r;
}
REPORT=stripLegacyCaspianPack(REPORT);
function stripLegacyTrueSavageDemoPack(r){
  if(!r) return r;
  const demoFileIds=new Set(
    (r.files||[])
      .filter(f=>
        /YT_VIDEO_VISUALIZATION_V1_@trueSavageSage\.md/i.test(String(f.name||'')) ||
        /trueSavageSage\/YT_VIDEO_VISUALIZATION_V1_@trueSavageSage\.md/i.test(String(f.path||''))
      )
      .map(f=>f.id)
  );
  const demoDatasetIds=new Set(
    (r.datasets||[])
      .filter(d=>
        /trueSavageSage\s*·\s*Video Metrics/i.test(String(d.name||'')) ||
        demoFileIds.has(d.sourceFileId)
      )
      .map(d=>d.id)
  );
  if(!demoFileIds.size && !demoDatasetIds.size) return r;
  r.datasets=(r.datasets||[]).filter(d=>!demoDatasetIds.has(d.id));
  r.files=(r.files||[]).filter(f=>!demoFileIds.has(f.id));
  r.charts=(r.charts||[]).filter(ch=>!demoDatasetIds.has(ch.datasetId) && !demoFileIds.has(ch.sourceFileId));
  r.tables=(r.tables||[]).filter(tb=>!demoDatasetIds.has(tb.datasetId) && !demoFileIds.has(tb.sourceFileId));
  return r;
}
REPORT=stripLegacyTrueSavageDemoPack(REPORT);
function inferColumns(rows){const names=[]; for(const row of rows.slice(0,100)){Object.keys(row||{}).forEach(k=>{if(!String(k).startsWith('_')&&!names.includes(k)) names.push(k)})} return names.map(name=>{let seen=0, numeric=0; for(const r of rows.slice(0,80)){const v=r?.[name]; if(v!==''&&v!==null&&v!==undefined){seen++; if(isNum(v)) numeric++;}} return {name, type: seen && numeric/seen>=0.75 ? 'number':'text'};});}
function initState(){REPORT.meta=REPORT.meta||{}; REPORT.meta.title=REPORT.meta.title||'Ринкова конкурентна розвідка'; REPORT.meta.companyName=String(REPORT.meta.companyName||'').trim(); state.lang=REPORT.meta.lang || getSavedLang() || state.lang || 'uk'; REPORT.meta.lang=state.lang; const useCloudAccess=HOSTED_MODE&&!BROWSER_ONLY_MODE&&!cloudSync.localFallback; state.access=REPORT.meta.clientLocked?'viewer':(useCloudAccess?(cloudCanWrite()?'admin':'viewer'):(REPORT.meta.accessMode||state.access||'admin')); REPORT.meta.accessMode=state.access; app.dataset.access=state.access; const firstClient=(REPORT.companies||[]).find(c=>c.type==='client') || (REPORT.companies||[])[0]; state.activeCompany=REPORT.meta.activeCompany || firstClient?.id || null; state.compareA=REPORT.meta.compareA || firstClient?.id || (REPORT.companies||[])[0]?.id || null; state.compareB=REPORT.meta.compareB || (REPORT.companies||[]).find(c=>c.id!==state.compareA)?.id || null; state.openFolders=REPORT.meta.openFolders||{}; state.showCompare=!!REPORT.meta.showCompare; state.analyticsSite=REPORT.meta.analyticsSite||'all'; state.analyticsResearch=REPORT.meta.analyticsResearch||'all'; state.activeDataset=REPORT.meta.activeDataset || state.activeDataset || REPORT.datasets[0]?.id || null; applyLanguage();}
function renderReportTitle(){
  const name=String(REPORT.meta?.companyName||'').trim() || t('reportTitleDefaultCompany');
  const titleEl=$('reportTitle');
  if(titleEl) titleEl.textContent=t('reportTitlePrefix', {company:name});
  const input=$('companyNameInput');
  if(input && input.value!==String(REPORT.meta?.companyName||'')) input.value=String(REPORT.meta?.companyName||'');
  document.title=t('reportTitlePrefix', {company:name});
}
function localizedChartTitle(title){
  const t=String(title||'').trim().toLowerCase();
  let result=String(title||'');
  if(/views by video/.test(t)) result='Перегляди по дослідження';
  else if(/views\/day by video/.test(t)) result='Перегляди за день по дослідження';
  else if(/er public.*by video|er public/.test(t)) result='ER Public (%) по дослідження';
  else if(/like rate.*by video|like rate/.test(t)) result='Рівень лайків (%) по дослідження';
  else if(/comment rate.*by video|comment rate/.test(t)) result='Рівень коментарів (%) по дослідження';
  else if(/likes by video/.test(t)) result='Лайки по дослідження';
  else if(/comments by video/.test(t)) result='Коментарі по дослідження';
  else if(/comments per 1k views/.test(t)) result='Коментарі на 1k переглядів';
  else if(/views per 1k subs/.test(t)) result='Перегляди на 1k підписників';
  else if(/hook score.*by video|hook score/.test(t)) result='Оцінка хука по дослідження';
  else if(/cta score.*by video|cta score/.test(t)) result='Оцінка CTA по дослідження';
  else if(/audio score.*by video|audio score/.test(t)) result='Оцінка аудіо по дослідження';
  else if(/comment resonance.*by video|comment resonance/.test(t)) result='Резонанс коментарів по дослідження';
  else if(/overall score.*by video|overall score/.test(t)) result='Загальна оцінка по дослідження';
  else if(/емоційний темп.*by video/.test(t)) result='Емоційний темп (індекс) по дослідження';
  else if(/утримання аудиторії.*by video/.test(t)) result='Утримання аудиторії (proxy, %) по дослідження';
  else if(/executive summary table/.test(t)) result='Підсумкова таблиця KPI';
  else if(/score breakdown table/.test(t)) result='Таблиця розкладу оцінок';
  else if(/raw reach/.test(t)) result='Базове охоплення';
  else if(/velocity.*efficiency/.test(t)) result='Швидкість та ефективність';
  else if(/engagement rates/.test(t)) result='Рівні залучення (%)';
  else if(/rate mix/.test(t)) result='Структура rate-метрик';
  else if(/score breakdown/.test(t)) result='Розклад оцінок (1-5)';
  else if(/score gap/.test(t)) result='Відставання до максимуму (5)';
  else if(/score consistency/.test(t)) result='Стабільність оцінок';
  else if(/interaction depth/.test(t)) result='Глибина взаємодії';
  else if(/video profile snapshot/.test(t)) result='Профіль дослідження (зріз)';
  return translateText(result);
}
function refresh(){
  syncCompaniesFromRows(REPORT);
  for(const ch of (REPORT.charts||[])){
    ch._baseTitle=ch._baseTitle||ch.title;
    ch.title=localizedChartTitle(ch._baseTitle);
  }
  for(const tb of (REPORT.tables||[])){
    tb._baseTitle=tb._baseTitle||tb.title;
    tb.title=localizedChartTitle(tb._baseTitle);
  }
  for(const ds of (REPORT.datasets||[])){
    const kind=String(ds.sourceKind||'');
    if(kind.startsWith('markdown-') || kind==='structured-fs-data') continue;
    const cols=(ds.columns||[]).map(c=>String((c&&c.name)||c||''));
    if(cols.includes('video_label') && cols.includes('views')){
      ensureVideoMetricsWidgets(ds, ds.sourceFileId||'');
    }
  }
  REPORT.meta.activeCompany=state.activeCompany; REPORT.meta.compareA=state.compareA; REPORT.meta.compareB=state.compareB; REPORT.meta.openFolders=state.openFolders; REPORT.meta.showCompare=state.showCompare; REPORT.meta.analyticsSite=state.analyticsSite; REPORT.meta.analyticsResearch=state.analyticsResearch; REPORT.meta.activeDataset=state.activeDataset; REPORT.meta.lang=state.lang; app.dataset.access=state.access; schedulePersist(); renderAnalytics(); renderSide(); renderReaderTabs(); const co=(REPORT.companies||[]).length; $('storageStat').textContent = t('storageStat', {datasets:REPORT.datasets.length, files:REPORT.files.length, folders:co}); const rp=$('rolePill'); if(rp) rp.textContent=isAdmin()?t('admin'):t('viewer'); const unlock=$('unlockAdminBtn'); if(unlock) unlock.classList.toggle('hidden',isClientLocked()); const members=$('membersBtn'); if(members) members.classList.toggle('hidden',cloudSync.role!=='owner');
}

function renderAnalytics(){
  state.widgetSnapshots={};
  if(!(REPORT.datasets||[]).length && !(REPORT.charts||[]).length && !(REPORT.tables||[]).length){
    analytics.innerHTML=translateText(`<div class="empty"><b>Почніть із даних</b><br><br>${isAdmin()?'Додайте таблицю, файли або локальну папку, щоб створити аналітику.':'У цьому звіті ще немає опублікованої аналітики.'}<br><br>${isAdmin()?'<button class="btn primary adminOnly" data-open-add>Додати дані</button>':''}</div>`);
    return;
  }
  analytics.innerHTML = translateText(`
    <div class="zoneBoard">
      <section class="zoneSection">
        <div class="zoneHead"><b>Графіки</b><span class="tiny" id="zoneChartsStat"></span></div>
        <div class="grid zoneCharts" id="widgetGridCharts"></div>
      </section>
      <section class="zoneSection">
        <div class="zoneHead"><b>Таблиці</b><span class="tiny" id="zoneTablesStat"></span></div>
        <div class="grid zoneTables" id="widgetGridTables"></div>
      </section>
    </div>`);
  const allCharts = REPORT.charts || [];
  const allTables = REPORT.tables || [];
  const charts = allCharts;
  const tables = allTables;
  const chartsGrid = $('widgetGridCharts');
  const tablesGrid = $('widgetGridTables');
  const videoCatalog=[];
  const rootNameById=new Map((state.fsRoots||[]).map(r=>[String(r.id||''), String(r.name||'')]));
  const vizDatasets=(REPORT.datasets||[]).filter(d=>{
    const cols=(d.columns||[]).map(c=>String(c.name||''));
    const hasCore=cols.includes('video_label') && cols.includes('views');
    if(!hasCore) return false;
    const kind=String(d?.sourceKind||'');
    if(kind==='markdown-fs-video' || /·\s*Video Metrics$/i.test(String(d?.name||''))) return true;
    const rows=d?.rows||[];
    return rows.some(r=>
      ('overall_video_score' in (r||{})) ||
      ('views_per_day' in (r||{})) ||
      ('like_rate_percent' in (r||{})) ||
      ('comment_rate_percent' in (r||{}))
    );
  });
  const vizDs=vizDatasets[0] || null;
  const retentionDs=(REPORT.datasets||[]).find(d=>{
    const cols=(d.columns||[]).map(c=>String(c.name||''));
    return cols.includes('metric') && cols.includes('t_sec') && cols.includes('value') && cols.includes('video_label');
  }) || null;
  const vizRowsEnriched=[];
  for(const ds of vizDatasets){
    const rootId=String(ds.sourceRootId||'');
    const rootName=rootNameById.get(rootId)||'';
    for(const r of (ds.rows||[])){
      const enriched={...r,_sourceRootId:rootId,_sourceRootName:rootName};
      vizRowsEnriched.push(enriched);
      const key=String(r.video_label||'').trim();
      if(!key) continue;
      const rowAuthor=String(r.author||'').trim();
      const author=rowAuthor||String(rootName||'').trim()||'Невідомий сайт';
      videoCatalog.push({
        key,
        title:String(r.full_title||r.video_label||key).trim(),
        author:canonicalSiteName(author),
        row:enriched
      });
      const folderKey=String(r._sourceFolderName||pathName(pathDir(String(r._sourceRelPath||'')))||'').trim();
      if(folderKey){
        videoCatalog.push({
          key:folderKey,
          title:String(r.full_title||r.video_label||folderKey).trim(),
          author:canonicalSiteName(author),
          row:enriched
        });
      }
    }
  }
  const dedup=new Map();
  const rowQuality=(r)=>{
    const x=r||{};
    const hasLikes=num(x.likes)>0?1:0;
    const hasComments=num(x.comments_count)>0?1:0;
    const hasViews=num(x.views)>0?1:0;
    const hasRates=(num(x.like_rate_percent)>0||num(x.comment_rate_percent)>0||num(x.er_public_percent)>0)?1:0;
    return hasLikes*1000 + hasComments*100 + hasViews*10 + hasRates;
  };
  for(const v of videoCatalog){
    const id=`${v.author}::${normText(v.title||v.key)}`;
    const prev=dedup.get(id);
    if(!prev){ dedup.set(id,v); continue; }
    if(rowQuality(v.row) >= rowQuality(prev.row)) dedup.set(id,v);
  }
  const allVideoItems=[...dedup.values()].map(v=>({key:v.title||v.key,title:v.title,author:v.author}));
  const fsAuthors=(state.fsRoots||[])
    .filter(r=>{
      if(!r?.index || !(r.index instanceof Map)) return false;
      for(const relPath of r.index.keys()){
        if(/\.md$/i.test(String(relPath||''))) return true;
      }
      return false;
    })
    .map(r=>String(r.name||'').trim())
    .filter(Boolean);
  const titleNorms=new Set(allVideoItems.map(v=>normText(v.title||v.key)).filter(Boolean));
  const authors=[...new Set([
    ...allVideoItems.map(v=>String(v.author||'').trim()),
    ...fsAuthors
  ]
      .filter(Boolean)
      .filter(a=>!titleNorms.has(normText(a)))
  )].sort((a,b)=>a.localeCompare(b,'uk'));
  const normSite=s=>normSiteKey(s);
  const validAuthors=new Set(['all',...authors]);
  if(!validAuthors.has(state.analyticsSite)) state.analyticsSite='all';
  const selectedSiteNorm=normSite(state.analyticsSite);
  let researchItems=state.analyticsSite==='all'
    ? []
    : allVideoItems.filter(v=>normSite(v.author)===selectedSiteNorm);
  if(state.analyticsSite!=='all' && researchItems.length===0){
    const byFiles=new Map();
    for(const f of (REPORT.files||[])){
      const p=String(f.path||'').replace(/\\/g,'/');
      const parts=p.split('/').filter(Boolean);
      const top=(parts[0]&&parts[0].toLowerCase()==='companies'&&parts[1])?parts[1]:(parts[0]||'');
      if(normSite(top)!==selectedSiteNorm && normSite(f.folder)!==selectedSiteNorm) continue;
      const title=((parts[0]&&parts[0].toLowerCase()==='companies')?parts[2]:parts[1])||String(f.name||'').replace(/\.[^.]+$/,'');
      const key=String(title||'').trim();
      if(!key) continue;
      const id=normText(key);
      if(!byFiles.has(id)) byFiles.set(id,{key,title:key,author:state.analyticsSite});
    }
    researchItems=[...byFiles.values()];
  }
  if(state.analyticsSite!=='all' && researchItems.length===0){
    researchItems=listSiteResearchFoldersFromFs(state.analyticsSite);
  }
  const validKeys=new Set(['all',...researchItems.map(v=>v.key)]);
  if(!validKeys.has(state.analyticsResearch)) state.analyticsResearch='all';
  const bySite=new Map();
  for(const it of allVideoItems){
    const a=String(it.author||'Невідомий сайт').trim()||'Невідомий сайт';
    if(!bySite.has(a)) bySite.set(a,[]);
    bySite.get(a).push(it);
  }
  const authorHtml=[
    `<button class="btn small ${state.analyticsSite==='all'?'primary':''}" data-site="all">Всі сайти</button>`,
    ...authors.map(a=>`<button class="btn small ${state.analyticsSite===a?'primary':''}" data-site="${esc(a)}">${esc(short(a,28))}</button>`)
  ].join('');
  const modeButtons=[
    `<button class="btn small ${state.analyticsResearch==='all'?'primary':''}" data-mode="all">Порівняння</button>`
  ];
  const showResearchButtons = state.analyticsSite!=='all';
  if(showResearchButtons){
    modeButtons.push(...researchItems.map(v=>`<button class="btn small ${state.analyticsResearch===v.key?'primary':''}" data-mode="${esc(v.key)}" title="${esc(v.title)}">${esc(short(v.title,36))}</button>`));
  }
  const modeHtml=modeButtons.join('');
  chartsGrid.insertAdjacentHTML('beforebegin',`<div class="toolbar" id="analyticsSiteBar">${authorHtml}</div><div class="toolbar" id="analyticsResearchBar">${modeHtml}</div>`);
  $('analyticsSiteBar')?.querySelectorAll('[data-site]').forEach(b=>b.addEventListener('click',()=>{state.analyticsSite=b.dataset.site||'all'; state.analyticsResearch='all'; renderAnalytics();}));
  $('analyticsResearchBar')?.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.analyticsResearch=b.dataset.mode||'all'; renderAnalytics();}));
  if(state.analyticsResearch==='all'){
    if(state.analyticsSite==='all' && vizDatasets.length){
      const allVizRows=vizRowsEnriched;
      const bySiteVideo=new Map();
      for(const r of allVizRows){
        const author=canonicalSiteName(String(r.author||r._sourceRootName||'').trim());
        const title=String(r.full_title||r.video_label||'').trim();
        if(!title) continue;
        const authorKey=author || 'Невідомий сайт';
        const k=`${normSite(authorKey)}::${normText(title)}`;
        if(!k) continue;
        const prev=bySiteVideo.get(k);
        if(!prev){
          bySiteVideo.set(k,{...r, author:authorKey});
          continue;
        }
        const prevQ=rowQuality(prev);
        const curQ=rowQuality(r);
        if(curQ>prevQ){
          bySiteVideo.set(k,{...r, author:authorKey});
          continue;
        }
        if(curQ===prevQ && num(r?.views)>num(prev?.views)) bySiteVideo.set(k,{...r, author:authorKey});
      }
      const rows=[...bySiteVideo.values()];
      const bySite=new Map();
      for(const r of rows){
        const author=String(r.author||'').trim();
        if(!author) continue;
        const cur=bySite.get(author)||{author, videos:0, views:0, views_per_day:0, likes:0, comments:0};
        cur.videos += 1;
        cur.views += num(r.views);
        cur.views_per_day += num(r.views_per_day);
        cur.likes += num(r.likes);
        cur.comments += num(r.comments_count);
        bySite.set(author,cur);
      }
      const siteRows=[...bySite.values()].sort((a,b)=>b.views-a.views);
      if(siteRows.length){
        const barViews=siteRows.map(x=>[x.author, x.views]);
        const barVpd=siteRows.map(x=>[x.author, x.views_per_day]);
        const barLikes=siteRows.map(x=>[x.author, x.likes]);
        const barComments=siteRows.map(x=>[x.author, x.comments]);
        chartsGrid.appendChild(simpleWidget('Сумарні перегляди по сайтах','author-compare',renderSimpleBarChart(barViews,Math.max(1,...barViews.map(x=>num(x[1]))))));
        chartsGrid.appendChild(simpleWidget('Сумарні перегляди/день по сайтах','author-compare',renderSimpleBarChart(barVpd,Math.max(1,...barVpd.map(x=>num(x[1]))))));
        chartsGrid.appendChild(simpleWidget('Сумарні лайки по сайтах','author-compare',renderSimpleBarChart(barLikes,Math.max(1,...barLikes.map(x=>num(x[1]))))));
        chartsGrid.appendChild(simpleWidget('Сумарні коментарі по сайтах','author-compare',renderSimpleBarChart(barComments,Math.max(1,...barComments.map(x=>num(x[1]))))));
        $('zoneChartsStat').textContent = translateText(`порівняння сайтів · ${siteRows.length} авторів · 4 графіки`);
        tablesGrid.innerHTML=translateText(`<div class="widget tableWidget"><div class="widgetHead"><b>Порівняння сайтів (сума по дослідженнях)</b><span class="badge">table</span></div><div class="widgetBody"><table class="miniTable"><thead><tr><th>Сайт</th><th>Дослідження</th><th>Views Σ</th><th>Views/day Σ</th><th>Likes Σ</th><th>Comments Σ</th></tr></thead><tbody>${siteRows.map(r=>`<tr><th>${esc(r.author)}</th><td class="num">${esc(fmt(r.videos))}</td><td class="num">${esc(fmt(r.views))}</td><td class="num">${esc(fmt(r.views_per_day))}</td><td class="num">${esc(fmt(r.likes))}</td><td class="num">${esc(fmt(r.comments))}</td></tr>`).join('')}</tbody></table></div></div>`);
        $('zoneTablesStat').textContent = translateText(`агрегована таблиця авторів`);
        return;
      }
    }
    if(state.analyticsSite!=='all' && vizDatasets.length){
      const allVizRows=vizRowsEnriched;
      const siteRows=allVizRows.filter(r=>normSite(String(r.author||r._sourceRootName||''))===selectedSiteNorm);
      const byTitle=new Map();
      for(const r of siteRows){
        const rawTitle=String(r.full_title||r.video_label||'').trim();
        if(!rawTitle) continue;
        const k=normText(rawTitle);
        if(!k) continue;
        const prev=byTitle.get(k);
        if(!prev){
          byTitle.set(k,r);
          continue;
        }
        const prevQ=rowQuality(prev);
        const curQ=rowQuality(r);
        if(curQ>prevQ){
          byTitle.set(k,r);
          continue;
        }
        if(curQ===prevQ){
          const prevViews=num(prev?.views);
          const curViews=num(r?.views);
          if(curViews>prevViews) byTitle.set(k,r);
        }
      }
      const rows=[...byTitle.values()];
      if(rows.length){
        const cmpDefs=[
          ['Перегляди (5 дослідження автора)','views'],
          ['Перегляди/день (5 дослідження автора)','views_per_day'],
          ['ER Public % (5 дослідження автора)','er_public_percent'],
          ['Лайки (5 дослідження автора)','likes'],
          ['Коментарі (5 дослідження автора)','comments_count'],
          ['Like Rate % (5 дослідження автора)','like_rate_percent'],
          ['Comment Rate % (5 дослідження автора)','comment_rate_percent'],
          ['Overall Score (5 дослідження автора)','overall_video_score']
        ];
        let rendered=0;
        for(const [title,key] of cmpDefs){
          const items=rows.map(r=>[String(r.full_title||r.video_label||'—'), num(r[key])]);
          const max=Math.max(1,...items.map(x=>num(x[1])));
          chartsGrid.appendChild(simpleWidget(title,'author-compare',renderSimpleBarChart(items,max)));
          rendered++;
        }
        $('zoneChartsStat').textContent = translateText(`порівняння автора · ${rows.length} дослідження · ${rendered} графіків`);
        const tRows=rows.map(r=>[
          r.full_title||r.video_label||'',
          fmt(r.views),
          fmt(r.views_per_day),
          fmt(r.er_public_percent),
          fmt(r.likes),
          fmt(r.comments_count),
          fmt(r.overall_video_score)
        ]);
        tablesGrid.innerHTML=translateText(`<div class="widget tableWidget"><div class="widgetHead"><b>Порівняння 5 дослідження автора</b><span class="badge">table</span></div><div class="widgetBody"><table class="miniTable"><thead><tr><th>Дослідження</th><th>Views</th><th>Views/day</th><th>ER %</th><th>Likes</th><th>Comments</th><th>Overall</th></tr></thead><tbody>${tRows.map(r=>`<tr><th>${esc(short(r[0],56))}</th><td class="num">${esc(r[1])}</td><td class="num">${esc(r[2])}</td><td class="num">${esc(r[3])}</td><td class="num">${esc(r[4])}</td><td class="num">${esc(r[5])}</td><td class="num">${esc(r[6])}</td></tr>`).join('')}</tbody></table></div></div>`);
        $('zoneTablesStat').textContent = translateText(`порівняльна таблиця автора`);
        return;
      }
    }
    if(retentionDs){
      const tempoWidget=buildRetentionWidget(retentionDs,'tempo');
      const retWidget=buildRetentionWidget(retentionDs,'retention');
      if(tempoWidget || retWidget){
        const row=document.createElement('div');
        row.className='retentionRow';
        if(tempoWidget) row.appendChild(simpleWidget('3. Емоційний темп — порівняння всіх дослідження','youtube_video_retention',tempoWidget,'retention-all-tempo'));
        if(retWidget) row.appendChild(simpleWidget('4. Утримання аудиторії — порівняння всіх дослідження','youtube_video_retention',retWidget,'retention-all-main'));
        chartsGrid.appendChild(row);
      }
    }
    const sourceAuthorNorm=(obj, ds)=>{
      const rootId=String(obj?.sourceRootId||ds?.sourceRootId||'');
      if(rootId && rootNameById.has(rootId)) return normSite(rootNameById.get(rootId));
      const rowAuthor=String(ds?.rows?.[0]?.author||'').trim();
      return rowAuthor?normSite(rowAuthor):'';
    };
    const chartsVisible=state.analyticsSite==='all'
      ? charts
      : charts.filter(ch=>{
          const ds=dataset(ch.datasetId);
          return sourceAuthorNorm(ch,ds)===selectedSiteNorm;
        });
    const tablesVisible=state.analyticsSite==='all'
      ? tables
      : tables.filter(tb=>{
          const ds=dataset(tb.datasetId);
          return sourceAuthorNorm(tb,ds)===selectedSiteNorm;
        });
    $('zoneChartsStat').textContent = translateText(`${chartsVisible.length}`);
    $('zoneTablesStat').textContent = translateText(`${tablesVisible.length}`);
    if(!chartsVisible.length){chartsGrid.innerHTML=translateText('<div class="empty">Ще немає графіків. '+(isAdmin()?'Додай їх через кнопки у верхній панелі або в блоці "Перегляд".':'Адміністратор ще не додав графіки.')+'</div>');}
    for(const ch of chartsVisible){chartsGrid.appendChild(chartWidget(ch));}
    if(!tablesVisible.length){tablesGrid.innerHTML=translateText('<div class="empty">Таблиці ще не додані.</div>');}
    for(const tb of tablesVisible){tablesGrid.appendChild(tableWidget(tb));}
    return;
  }
  const modeNorm=normText(state.analyticsResearch);
  const scoreVideoMatch=(mode, row)=>{
    const m=String(mode||'');
    const nk=normText(String(row?.video_label||''));
    const nt=normText(String(row?.full_title||''));
    const nf=normText(String(row?._sourceFolderName||pathName(pathDir(String(row?._sourceRelPath||'')))||''));
    if(!m) return 0;
    if(m===nk || m===nt || m===nf) return 1000;
    let s=0;
    if(nk && (nk.includes(m) || m.includes(nk))) s=Math.max(s,700);
    if(nt && (nt.includes(m) || m.includes(nt))) s=Math.max(s,680);
    if(nf && (nf.includes(m) || m.includes(nf))) s=Math.max(s,720);
    const words=(v)=>String(v||'').toLowerCase().split(/[^a-z0-9а-яіїєґ]+/gi).filter(Boolean);
    const mw=words(state.analyticsResearch);
    if(mw.length){
      const set=new Set([...words(row?.video_label), ...words(row?.full_title), ...words(row?._sourceFolderName)]);
      let hit=0;
      for(const w of mw){ if(set.has(w)) hit++; }
      if(hit>0) s=Math.max(s, 300 + hit*40);
    }
    return s;
  };
  const directRows=vizRowsEnriched.filter(r=>{
    const a=normSite(String(r.author||r._sourceRootName||''));
    if(state.analyticsSite!=='all' && a!==selectedSiteNorm) return false;
    const nk=normText(String(r.video_label||''));
    const nt=normText(String(r.full_title||''));
    const nf=normText(String(r._sourceFolderName||''));
    return nk===modeNorm || nt===modeNorm || nf===modeNorm
      || nk.includes(modeNorm) || modeNorm.includes(nk)
      || nt.includes(modeNorm) || modeNorm.includes(nt)
      || nf.includes(modeNorm) || modeNorm.includes(nf);
  });
  let videoRow=(directRows.sort((a,b)=>rowQuality(b)-rowQuality(a))[0]||null);
  if(!videoRow){
    const authorScoped=vizRowsEnriched.filter(r=>state.analyticsSite==='all' || normSite(String(r.author||r._sourceRootName||''))===selectedSiteNorm);
    const ranked=authorScoped
      .map(r=>({r,score:scoreVideoMatch(modeNorm,r),q:rowQuality(r)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score || b.q-a.q);
    videoRow=ranked[0]?.r||null;
  }
  const videoCandidates=videoCatalog.filter(v=>{
    const sameAuthor = state.analyticsSite==='all' || normSite(v.author)===selectedSiteNorm;
    const sameVideo = normText(v.key)===modeNorm || normText(v.title)===modeNorm || normText(v.key).includes(modeNorm) || modeNorm.includes(normText(v.key));
    return sameAuthor && sameVideo;
  });
  const fallbackCandidates=videoCandidates.length?videoCandidates:videoCatalog.filter(v=>{
    const sameVideo = normText(v.key)===modeNorm || normText(v.title)===modeNorm || normText(v.key).includes(modeNorm) || modeNorm.includes(normText(v.key));
    return sameVideo;
  });
  if(!videoRow){
    videoRow=(fallbackCandidates.sort((a,b)=>rowQuality(b?.row)-rowQuality(a?.row))[0]||{}).row||null;
  }
  const fileRow=resolveVideoRowFromFiles(state.analyticsResearch, state.analyticsSite);
  if(fileRow && (!videoRow || rowQuality(fileRow)>rowQuality(videoRow))){
    videoRow=fileRow;
  }
  if(!videoRow){
    const tempoOne=retentionDs?buildRetentionWidget(retentionDs,'tempo',state.analyticsResearch):null;
    const retOne=retentionDs?buildRetentionWidget(retentionDs,'retention',state.analyticsResearch):null;
    if(tempoOne || retOne){
      if(tempoOne) chartsGrid.appendChild(simpleWidget('3. Емоційний темп','youtube_video_retention',tempoOne,`retention-${state.analyticsResearch}-tempo`));
      if(retOne) chartsGrid.appendChild(simpleWidget('4. Утримання аудиторії','youtube_video_retention',retOne,`retention-${state.analyticsResearch}-main`));
      $('zoneChartsStat').textContent = translateText(`retention-only · ${tempoOne&&retOne?2:1} графік(и) · ${state.analyticsResearch}`);
      tablesGrid.innerHTML=translateText('<div class="empty">Для цього дослідження немає KPI-таблиці (views/likes/comments), доступні лише retention-дані.</div>');
      $('zoneTablesStat').textContent = translateText('немає KPI');
      return;
    }
    console.warn('[analytics] no videoRow and no retention fallback', {
      author: state.analyticsSite,
      videoMode: state.analyticsResearch,
      vizDatasets: vizDatasets.length,
      vizRows: vizRowsEnriched.length,
      retentionDataset: Boolean(retentionDs),
      retentionRows: retentionDs?.rows?.length||0
    });
    chartsGrid.innerHTML=translateText('<div class="empty">Дослідження не знайдено для внутрішніх графіків.</div>');
    tablesGrid.innerHTML=translateText('<div class="empty">Немає даних.</div>');
    return;
  }
  const internalCharts = buildInternalChartsForVideo(videoRow);
  $('zoneChartsStat').textContent = translateText(`внутрішні · ${internalCharts.length} графіків · ${videoRow.full_title||videoRow.video_label||''}`);
  $('zoneTablesStat').textContent = translateText(`внутрішні метрики`);
  for(const ch of internalCharts){chartsGrid.appendChild(simpleWidget(ch.title, ch.badge||'internal', renderSimpleBarChart(ch.items,ch.max))); }
  if(retentionDs){
    const tempoOne=buildRetentionWidget(retentionDs,'tempo',state.analyticsResearch);
    const retOne=buildRetentionWidget(retentionDs,'retention',state.analyticsResearch);
    if(tempoOne) chartsGrid.appendChild(simpleWidget('3. Емоційний темп','youtube_video_retention',tempoOne,`retention-${state.analyticsResearch}-tempo`));
    if(retOne) chartsGrid.appendChild(simpleWidget('4. Утримання аудиторії','youtube_video_retention',retOne,`retention-${state.analyticsResearch}-main`));
    if(!tempoOne && !retOne){
      chartsGrid.appendChild(simpleWidget('3-4. Retention дані','youtube_video_retention','<div class="empty">Для цього дослідження ще немає retention-даних (tempo/retention).</div>'));
    }
  }
  const metricsRows=[
    ['Title',videoRow.full_title||videoRow.video_label||''],
    ['Format',videoRow.format_group||'—'],
    ['Views',fmt(videoRow.views)],
    ['Views/day',fmt(videoRow.views_per_day)],
    ['ER Public %',fmt(videoRow.er_public_percent)],
    ['Like Rate %',fmt(videoRow.like_rate_percent)],
    ['Comment Rate %',fmt(videoRow.comment_rate_percent)],
    ['Overall Score',fmt(videoRow.overall_video_score)]
  ];
  tablesGrid.innerHTML=translateText(`<div class="widget tableWidget"><div class="widgetHead"><b>Внутрішні метрики дослідження</b><span class="badge">table</span></div><div class="widgetBody"><table class="miniTable"><tbody>${metricsRows.map(r=>`<tr><th>${esc(r[0])}</th><td class="num">${esc(r[1])}</td></tr>`).join('')}</tbody></table></div></div>`);
}
function simpleWidget(title,badge,bodyHtml,openKey){
  const el=document.createElement('div'); el.className='widget compactWidget';
  if(openKey) state.widgetSnapshots[openKey]={title,badge,bodyHtml};
  const hint=chartTitleHint(title);
  el.innerHTML=translateText(`<div class="widgetHead"><b title="${esc(hint)}">${esc(title)}</b><span class="badge">${esc(badge)}</span>${openKey?`<button class="btn small ghost" data-open-widget="${esc(openKey)}" title="Розгорнути в область 2">⤢</button>`:''}</div><div class="widgetBody">${bodyHtml}</div>`);
  return el;
}
function openSimpleWidgetView(key){
  const snap=state.widgetSnapshots?.[key];
  if(!snap) return;
  addTab('simple:'+key, snap.title, 'chart', key);
  state.activeFile='simple:'+key;
  reader.innerHTML=translateText(`<div class="previewToolbar"><b>📈 ${esc(snap.title)}</b><span class="pill">${esc(snap.badge||'chart')}</span></div><div class="widget" style="min-height:420px"><div class="widgetBody">${snap.bodyHtml}</div></div>`);
  renderReaderTabs();
  renderSide();
}
function buildRetentionWidget(ds, metric, onlyVideoLabel){
  const rows=(ds?.rows||[]).filter(r=>String(r.metric||'')===metric && isNum(r.value) && isNum(r.t_sec));
  if(!rows.length) return '';
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi,'');
  const targetNorm=norm(onlyVideoLabel||'');
  const grouped=new Map();
  for(const r of rows){
    const key=String(r.video_label||'Video').trim()||'Video';
    if(onlyVideoLabel){
      const keyNorm=norm(key);
      if(!(key===String(onlyVideoLabel) || keyNorm===targetNorm || keyNorm.includes(targetNorm) || targetNorm.includes(keyNorm))) continue;
    }
    if(!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key).push({x:num(r.t_sec), y:num(r.value), l:String(r.t_label||'')});
  }
  if(onlyVideoLabel && grouped.size===0){
    const candidate=[...new Set(rows.map(r=>String(r.video_label||'').trim()).filter(Boolean))][0];
    if(candidate){
      for(const r of rows){
        const key=String(r.video_label||'Video').trim()||'Video';
        if(key!==candidate) continue;
        if(!grouped.has(key)) grouped.set(key,[]);
        grouped.get(key).push({x:num(r.t_sec), y:num(r.value), l:String(r.t_label||'')});
      }
    }
  }
  const series=[...grouped.entries()].map(([name,pts])=>({name,points:pts.sort((a,b)=>a.x-b.x)})).filter(s=>s.points.length>=2);
  if(!series.length) return '';
  return multiLineSvg(series, metric==='retention'?'Retention %':'Інтенсивність');
}
function multiLineSvg(series,yLabel){
  const w=860,h=240,padL=56,padR=14,padT=24,padB=30;
  const allPts=series.flatMap(s=>s.points);
  const maxX=Math.max(...allPts.map(p=>p.x),1);
  const minY=0;
  const maxY=Math.max(...allPts.map(p=>p.y),100);
  const spanY=Math.max(1,maxY-minY);
  const sx=x=>padL+(x/maxX)*(w-padL-padR);
  const sy=y=>h-padB-((y-minY)/spanY)*(h-padT-padB);
  const colors=['#2563eb','#dc2626','#16a34a','#d97706','#7c3aed','#0891b2','#be123c','#4f46e5'];
  const grid=[0,25,50,75,100].map(v=>`<line x1="${padL}" y1="${sy(v)}" x2="${w-padR}" y2="${sy(v)}" stroke="var(--line)"/><text x="${padL-7}" y="${sy(v)+3}" font-size="9" text-anchor="end" fill="var(--muted)">${v}</text>`).join('');
  const paths=series.map((s,i)=>{
    const c=colors[i%colors.length];
    const d=s.points.map((p,j)=>`${j?'L':'M'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
    const dots=s.points.map((p,pi)=>{
      const x=sx(p.x), y=sy(p.y);
      return `<circle cx="${x}" cy="${y}" r="2.6" fill="${c}" stroke="#fff" stroke-width="1"/>`;
    }).join('');
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.1"/>${dots}`;
  }).join('');
  const allTicks=[...new Set(allPts.map(p=>p.x))].sort((a,b)=>a-b);
  const maxTickLabels=8;
  const step=Math.max(1,Math.ceil(allTicks.length/maxTickLabels));
  const ticks=allTicks.filter((_,i)=>i%step===0 || i===allTicks.length-1);
  const xLabels=ticks.map(t=>`<text x="${sx(t)}" y="${h-9}" font-size="9" text-anchor="middle" fill="var(--muted)">${secToLabel(t)}</text>`).join('');
  const legend=series.map((s,i)=>`<span style="display:inline-flex;align-items:center;gap:5px;margin-right:8px"><i style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${colors[i%colors.length]}"></i>${esc(short(s.name,28))}</span>`).join('');
  const title=(/retention/i.test(String(yLabel))?'Retention-крива':'Емоційна інтенсивність');
  return `<div style="overflow:auto"><svg class="svgChart" viewBox="0 0 ${w} ${h}" role="img">${grid}<line x1="${padL}" y1="${h-padB}" x2="${w-padR}" y2="${h-padB}" stroke="var(--line)"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h-padB}" stroke="var(--line)"/><text x="${padL}" y="${padT-7}" font-size="12" fill="var(--text)" font-weight="800">${esc(title)}</text><text x="14" y="${(padT+h-padB)/2}" font-size="10" fill="var(--muted)" transform="rotate(-90 14 ${(padT+h-padB)/2})">${esc(yLabel)}</text>${paths}${xLabels}</svg></div><div class="tiny" style="margin-top:4px;font-size:11px;line-height:1.25">${legend}</div>`;
}
function secToLabel(sec){
  const s=Math.max(0,Math.round(num(sec)));
  const m=Math.floor(s/60);
  const r=s%60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}
function buildInternalChartsForVideo(r){
  enrichVideoMetricsRow(r);
  const views=num(r.views), likes=num(r.likes), comments=num(r.comments_count);
  const er=num(r.er_public_percent), lr=num(r.like_rate_percent), cr=num(r.comment_rate_percent);
  const hook=num(r.hook_score), cta=num(r.cta_score), audio=num(r.audio_score), resonance=num(r.comment_resonance_score), overall=num(r.overall_video_score);
  const tempo=num(r.emotional_tempo_index), retention=num(r.retention_proxy_percent);
  const scoreAvg=(hook+cta+audio+resonance+overall)/5;
  const scoreMin=Math.min(hook,cta,audio,resonance,overall);
  const scoreMax=Math.max(hook,cta,audio,resonance,overall);
  const scoreSpread=scoreMax-scoreMin;
  const toFive=v=>Math.max(0,5-num(v));
  return [
    {title:'Базове охоплення',badge:'volume',max:null,items:[['Перегляди',views],['Лайки',likes],['Коментарі',comments]]},
    {title:'Швидкість та ефективність',badge:'efficiency',max:null,items:[['Перегляди/день',num(r.views_per_day)],['Перегляди на 1k підписників',num(r.views_per_1k_subs)],['Коментарі на 1k переглядів',num(r.comments_per_1k_views)]]},
    {title:'Рівні залучення (%)',badge:'percent',max:null,items:[['Рівень лайків %',lr],['Рівень коментарів %',cr],['ER Public %',er]]},
    {title:'Структура rate-метрик',badge:'mix',max:Math.max(er,1),items:[['ER Public %',er],['Рівень лайків %',lr],['Рівень коментарів %',cr]]},
    {title:'Розклад оцінок (1-5)',badge:'score',max:5,items:[['Хук',hook],['CTA',cta],['Аудіо',audio],['Резонанс коментарів',resonance],['Загальна',overall]]},
    {title:'Відставання до максимуму (5)',badge:'gap',max:5,items:[['Хук gap',toFive(hook)],['CTA gap',toFive(cta)],['Аудіо gap',toFive(audio)],['Резонанс gap',toFive(resonance)],['Загальна gap',toFive(overall)]]},
    {title:'Стабільність оцінок',badge:'consistency',max:5,items:[['Середня оцінка',scoreAvg],['Мінімум',scoreMin],['Максимум',scoreMax],['Розкид',scoreSpread]]},
    {title:'Глибина взаємодії',badge:'depth',max:null,items:[['Коментарі',comments],['Лайки',likes],['Коментарі на 1k переглядів',num(r.comments_per_1k_views)]]},
    {title:'Профіль дослідження (зріз)',badge:'profile',max:null,items:[['Загальна оцінка',overall],['Перегляди/день',num(r.views_per_day)],['ER Public %',er],['Перегляди на 1k підписників',num(r.views_per_1k_subs)]]}
  ];
}
function renderSimpleBarChart(items,fixedMax){
  const clean=items.filter(x=>isNum(x[1]));
  if(!clean.length) return '<div class="empty">Немає даних</div>';
  const max=fixedMax||Math.max(...clean.map(x=>num(x[1])),1);
  const rows=clean.map(([label,val])=>{const n=num(val); const w=Math.max(4,Math.round((n/max)*100)); return `<div style="display:grid;grid-template-columns:160px 1fr auto;gap:8px;align-items:center;margin:6px 0"><div class="tiny">${esc(label)}</div><div style="height:12px;border-radius:999px;background:var(--soft);overflow:hidden"><div style="height:100%;width:${w}%;background:linear-gradient(90deg,var(--brand),var(--brand2))"></div></div><div class="tiny">${esc(fmt(n))}</div></div>`;}).join('');
  return `<div>${rows}</div>`;
}
function renderComparePanel(ds, compOpts){
  const companies=REPORT.companies||[]; if(companies.length<2 || !ds) return '<div class="compareBox"><b>Порівняння</b><div class="lockedHint">Додай хоча б дві компанії, щоб порівнювати.</div></div>';
  if(!state.compareA) state.compareA=companies[0].id; if(!state.compareB) state.compareB=(companies.find(c=>c.id!==state.compareA)||companies[0]).id;
  const a=company(state.compareA), b=company(state.compareB); const ra=companyRow(state.compareA,ds.id)||{}, rb=companyRow(state.compareB,ds.id)||{};
  const nums=numberCols(ds).slice(0,6);
  const rows=nums.map(n=>{const av=num(ra[n]), bv=num(rb[n]), diff=av-bv; const sign=diff>0?'+':''; return `<tr><td>${esc(n)}</td><td>${fmt(av)}</td><td>${fmt(bv)}</td><td>${sign}${fmt(diff)}</td></tr>`}).join('');
  return `<div class="compareBox"><div class="compareHead"><b>Порівняти</b><select id="compareA" class="select">${companies.map(c=>`<option value="${esc(c.id)}" ${c.id===state.compareA?'selected':''}>${esc(c.name)}</option>`).join('')}</select><span>з</span><select id="compareB" class="select">${companies.map(c=>`<option value="${esc(c.id)}" ${c.id===state.compareB?'selected':''}>${esc(c.name)}</option>`).join('')}</select><label class="pill"><input id="compareOnly" type="checkbox" ${state.compareOnly?'checked':''}> тільки ці на графіках</label></div><table class="compareMini"><thead><tr><th>Метрика</th><th>${esc(a?.name||'A')}</th><th>${esc(b?.name||'B')}</th><th>Різниця</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Немає числових колонок</td></tr>'}</tbody></table></div>`;
}
function chartTitleHint(title){
  const t=localizedChartTitle(title).toLowerCase();
  if(/перегляди по дослідження/.test(t)) return 'Сумарна кількість переглядів для кожного дослідження.';
  if(/перегляди за день/.test(t)) return 'Середня швидкість набору переглядів за день.';
  if(/er public/.test(t)) return 'Публічний рівень залучення: частка реакцій відносно переглядів.';
  if(/рівень лайків/.test(t)) return 'Відсоток переглядів, що завершилися лайком.';
  if(/рівень коментарів/.test(t)) return 'Відсоток переглядів, що завершилися коментарем.';
  if(/лайки по дослідження/.test(t)) return 'Загальна кількість лайків для кожного дослідження.';
  if(/коментарі по дослідження/.test(t)) return 'Загальна кількість коментарів для кожного дослідження.';
  if(/коментарі на 1k/.test(t)) return 'Скільки коментарів припадає на 1000 переглядів.';
  if(/перегляди на 1k підписників/.test(t)) return 'Інтенсивність переглядів відносно розміру аудиторії каналу.';
  if(/оцінка хука/.test(t)) return 'Оцінка сили старту дослідження (перші секунди), шкала 1-5.';
  if(/оцінка cta/.test(t)) return 'Оцінка якості закликів до дії, шкала 1-5.';
  if(/оцінка аудіо/.test(t)) return 'Оцінка якості звуку та озвучки, шкала 1-5.';
  if(/резонанс коментарів/.test(t)) return 'Наскільки дослідження провокує змістовну дискусію в коментарях, шкала 1-5.';
  if(/загальна оцінка/.test(t)) return 'Інтегральна оцінка дослідження за ключовими параметрами, шкала 1-5.';
  if(/емоційний темп|емоційна інтенсивність/.test(t)) return 'Динаміка емоційної інтенсивності протягом дослідження.';
  if(/утримання аудиторії|retention/.test(t)) return 'Крива утримання: який відсоток аудиторії лишається з часом.';
  if(/розклад оцінок/.test(t)) return 'Порівняння складових оцінки дослідження за ключовими критеріями.';
  if(/підсумкова таблиця kpi/.test(t)) return 'Коротка зведена таблиця ключових KPI по дослідження.';
  if(/базове охоплення/.test(t)) return 'Базові обʼємні метрики: перегляди, лайки, коментарі.';
  if(/швидкість та ефективність/.test(t)) return 'Метрики швидкості росту і ефективності залучення.';
  if(/рівні залучення/.test(t)) return 'Порівняння ключових engagement-rate метрик у відсотках.';
  if(/структура rate-метрик/.test(t)) return 'Співвідношення ключових rate-метрик відносно ER.';
  if(/відставання до максимуму/.test(t)) return 'На скільки кожен score відстає від максимального значення 5.';
  if(/стабільність оцінок/.test(t)) return 'Середнє, мінімум, максимум та розкид score-оцінок.';
  if(/глибина взаємодії/.test(t)) return 'Глибина взаємодії аудиторії з контентом через реакції та дискусію.';
  if(/профіль дослідження/.test(t)) return 'Короткий зріз дослідження за ключовими метриками ефективності.';
  return 'Пояснення метрики цього графіка.';
}
function chartWidget(ch){
  const el=document.createElement('div'); el.className='widget chartAuto'; el.dataset.id=ch.id;
  const hint=chartTitleHint(ch.title);
  el.innerHTML=translateText(`<div class="widgetHead"><b title="${esc(hint)}">${esc(ch.title)}</b><span class="badge">${esc(ch.type)}</span><button class="btn small ghost" data-act="open" title="Відкрити великий графік">⤢</button><button class="btn small ghost adminOnly" data-act="edit">✎</button><button class="btn small ghost adminOnly" data-act="del">×</button></div><div class="widgetBody"></div>`);
  el.querySelector('.widgetBody').innerHTML = renderChart(ch);
  el.addEventListener('click',e=>{const act=e.target.closest('button')?.dataset.act; if(act==='del'){if(!guardAdmin()) return; REPORT.charts=REPORT.charts.filter(x=>x.id!==ch.id); refresh(); e.stopPropagation(); return;} if(act==='edit'){if(!guardAdmin()) return; openChartModal(ch); e.stopPropagation(); return;} if(act==='open'){openChartView(ch.id); e.stopPropagation(); return;} openChartView(ch.id);});
  return el;
}
function tableWidget(tb){
  const el=document.createElement('div'); el.className='widget tableWidget';
  el.innerHTML=translateText(`<div class="widgetHead"><b>${esc(tb.title)}</b><span class="badge">table</span><button class="btn small ghost adminOnly" data-act="chart" title="Створити графік з цієї таблички">📊</button><button class="btn small ghost adminOnly" data-act="edit">✎</button><button class="btn small ghost adminOnly" data-act="del">×</button></div><div class="widgetBody">${renderSmallTable(tb)}</div>`);
  el.addEventListener('click',e=>{const act=e.target.closest('button')?.dataset.act; if(act==='del'){if(!guardAdmin()) return; REPORT.tables=REPORT.tables.filter(x=>x.id!==tb.id); refresh(); e.stopPropagation(); return;} if(act==='edit'){if(!guardAdmin()) return; openTableModal(tb); e.stopPropagation(); return;} if(act==='chart'){if(!guardAdmin()) return; quickChartFromTable(tb); e.stopPropagation(); return;} openDataset(tb.datasetId, tb.sourceFileId);});
  return el;
}
function prepSeries(ch){
  const ds=dataset(ch.datasetId); if(!ds) return [];
  const groups=new Map(); const counts=new Map();
  for(const r of ds.rows){if(state.compareOnly){const cid=r._companyId; if(cid!==state.compareA && cid!==state.compareB) continue;} let label=String(r[ch.x]??'').trim() || '—'; if(ch.x==='video_label' && r.full_title) label=String(r.full_title); const y = ch.agg==='count' ? 1 : num(r[ch.y]); groups.set(label,(groups.get(label)||0)+y); counts.set(label,(counts.get(label)||0)+1);}
  let arr=[...groups].map(([label,value])=>({label,value: ch.agg==='avg' ? value/(counts.get(label)||1) : value}));
  if(ch.sort==='desc') arr.sort((a,b)=>b.value-a.value); if(ch.sort==='asc') arr.sort((a,b)=>a.value-b.value);
  const top=num(ch.top)||12; return arr.slice(0,top);
}
function renderChart(ch){
  const arr=prepSeries(ch); if(!arr.length) return '<div class="empty">Немає даних для графіка</div>';
  if(ch.type==='line') return lineSvg(arr);
  if(ch.type==='pie') return pieSvg(arr);
  if(ch.type==='column') return columnSvg(arr);
  return barSvg(arr);
}
function openChartView(chartId){
  const ch=(REPORT.charts||[]).find(x=>x.id===chartId); if(!ch) return;
  const ds=dataset(ch.datasetId); if(!ds) return;
  addTab('chart:'+ch.id,ch.title,'chart',ch.id);
  state.activeFile='chart:'+ch.id;
  const rows=prepSeries(ch).map(x=>({k:x.label,v:x.value}));
  const cols=[ch.x,ch.y].filter(Boolean);
  reader.innerHTML=translateText(`<div class="previewToolbar"><b>📈 ${esc(ch.title)}</b><span class="pill">${esc(ch.type)}</span><span class="pill">${rows.length} точок</span><button class="btn small" id="chartOpenSource">Джерело</button></div><div class="widget" style="min-height:420px"><div class="widgetBody">${renderChart(ch)}</div></div><div style="margin-top:10px;overflow:auto"><table class="previewTable"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,50).map(r=>`<tr>${cols.map(c=>`<td class="${c===ch.y?'num':''}">${esc(c===ch.y?fmt(r.v):r.k)}</td>`).join('')}</tr>`).join('')||'<tr><td>Немає даних</td><td></td></tr>'}</tbody></table></div>`);
  $('chartOpenSource')?.addEventListener('click',()=>openDataset(ch.datasetId,ch.sourceFileId));
  renderReaderTabs(); renderSide();
}
function barSvg(arr){
  const w=520,left=118,right=48,rowH=24,chartH=Math.max(86,arr.length*rowH+12); const max=Math.max(...arr.map(d=>Math.abs(d.value)),1); let parts=[];
  arr.forEach((d,i)=>{const y=8+i*rowH; const bw=(w-left-right)*(Math.abs(d.value)/max); const isClient=/client|клієнт|наш/i.test(d.label); parts.push(`<text x="4" y="${y+12}" font-size="11" fill="${isClient?'var(--brand)':'var(--muted)'}" font-weight="${isClient?'900':'700'}">${esc(short(d.label,18))}</text><rect x="${left}" y="${y+3}" width="${w-left-right}" height="10" rx="5" fill="var(--soft)"/><rect x="${left}" y="${y+3}" width="${bw}" height="10" rx="5" fill="${isClient?'var(--brand)':'var(--brand2)'}"/><text x="${w-4}" y="${y+12}" font-size="11" fill="var(--text)" text-anchor="end" font-weight="800">${fmt(d.value)}</text>`)});
  return `<svg class="svgChart" viewBox="0 0 ${w} ${chartH}" role="img">${parts.join('')}</svg>`;
}
function columnSvg(arr){
  const w=520,h=Math.max(130,Math.min(260,105+arr.length*16)),pad=24,max=Math.max(...arr.map(d=>Math.abs(d.value)),1); const gap=6; const bw=(w-pad*2-gap*(arr.length-1))/arr.length; let parts=[];
  arr.forEach((d,i)=>{const x=pad+i*(bw+gap); const bh=(h-42)*(Math.abs(d.value)/max); const y=h-26-bh; const isClient=/client|клієнт|наш/i.test(d.label); parts.push(`<rect x="${x}" y="${y}" width="${Math.max(2,bw)}" height="${bh}" rx="5" fill="${isClient?'var(--brand)':'var(--brand2)'}"/><text x="${x+bw/2}" y="${Math.max(10,y-4)}" font-size="10" fill="var(--text)" text-anchor="middle" font-weight="800">${esc(fmt(d.value))}</text><text x="${x+bw/2}" y="${h-10}" font-size="9" fill="var(--muted)" text-anchor="middle">${esc(short(d.label,8))}</text>`)});
  return `<svg class="svgChart" viewBox="0 0 ${w} ${h}" role="img"><line x1="${pad}" x2="${w-pad}" y1="${h-26}" y2="${h-26}" stroke="var(--line)"/>${parts.join('')}</svg>`;
}
function lineSvg(arr){
  const w=520,h=Math.max(140,Math.min(260,110+arr.length*14)),pad=28; const max=Math.max(...arr.map(d=>d.value),1), min=Math.min(...arr.map(d=>d.value),0); const span=max-min||1;
  const pts=arr.map((d,i)=>{const x=pad+i*((w-pad*2)/Math.max(1,arr.length-1)); const y=h-pad-((d.value-min)/span)*(h-pad*2); return [x,y,d];});
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const dots=pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--brand)"/><text x="${p[0]}" y="${Math.max(10,p[1]-6)}" font-size="10" fill="var(--text)" text-anchor="middle" font-weight="800">${esc(fmt(p[2].value))}</text><text x="${p[0]}" y="${h-8}" font-size="9" fill="var(--muted)" text-anchor="middle">${esc(short(p[2].label,8))}</text>`).join('');
  return `<svg class="svgChart" viewBox="0 0 ${w} ${h}" role="img"><line x1="${pad}" x2="${w-pad}" y1="${h-pad}" y2="${h-pad}" stroke="var(--line)"/><path d="${path}" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}
function pieSvg(arr){
  const w=520,h=Math.max(150,Math.min(280,40+arr.length*18)),cx=75,cy=Math.max(75,h/2),r=52; const total=arr.reduce((s,d)=>s+Math.abs(d.value),0)||1; let a=-Math.PI/2; const colors=['var(--brand)','#7d9aff','#9bd4ff','#a9e7ca','#ffd59c','#ff9fac','#c7b8ff','#8fd5e8']; let parts=[]; let legend=[];
  arr.forEach((d,i)=>{const v=Math.abs(d.value)/total; const a2=a+v*Math.PI*2; const large=(a2-a)>Math.PI?1:0; const x1=cx+r*Math.cos(a), y1=cy+r*Math.sin(a), x2=cx+r*Math.cos(a2), y2=cy+r*Math.sin(a2); const color=colors[i%colors.length]; parts.push(`<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${color}"/>`); legend.push(`<text x="150" y="${25+i*16}" font-size="11" fill="var(--muted)">●</text><text x="165" y="${25+i*16}" font-size="11" fill="var(--text)">${esc(short(d.label,22))}: ${Math.round(v*100)}%</text>`); a=a2;});
  return `<svg class="svgChart" viewBox="0 0 ${w} ${h}" role="img">${parts.join('')}<circle cx="${cx}" cy="${cy}" r="26" fill="var(--panel2)"/>${legend.join('')}</svg>`;
}
function short(s,n){s=String(s??''); return s.length>n?s.slice(0,n-1)+'…':s;}
function normSiteKey(s){return String(s||'').toLowerCase().replace(/[_\s-]+/g,'').trim();}
function canonicalSiteName(s){
  return String(s||'').trim();
}
function listSiteResearchFoldersFromFs(author){
  const out=new Map();
  const aNorm=normSiteKey(author);
  for(const root of (state.fsRoots||[])){
    if(!root?.index || !(root.index instanceof Map)) continue;
    for(const relPath of root.index.keys()){
      const p=String(relPath||'').replace(/\\/g,'/').replace(/^\/+/,'');
      const parts=p.split('/').filter(Boolean);
      if(parts.length<2) continue;
      if(normSiteKey(root.name)===aNorm){
        const videoFolder=String(parts[0]||'').trim();
        const id=normText(videoFolder);
        if(videoFolder && !out.has(id)) out.set(id,{key:videoFolder,title:videoFolder,author});
        continue;
      }
      let authorIdx=-1;
      for(let i=0;i<parts.length;i++){
        if(normSiteKey(parts[i])===aNorm){ authorIdx=i; break; }
      }
      if(authorIdx<0 || !parts[authorIdx+1]) continue;
      const videoFolder=String(parts[authorIdx+1]||'').trim();
      if(!videoFolder) continue;
      const id=normText(videoFolder);
      if(!out.has(id)) out.set(id,{key:videoFolder,title:videoFolder,author});
    }
  }
  return [...out.values()];
}
function renderSmallTable(tb){const ds=dataset(tb.datasetId); if(!ds) return translateText('<div class="empty">Таблицю не знайдено</div>'); const cols=(tb.columns&&tb.columns.length?tb.columns:columns(ds).slice(0,5).map(c=>c.name)); const rows=ds.rows.slice(0,num(tb.top)||20); return translateText(`<table class="miniTable"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${/client|клієнт|наш/i.test(String(r.type||r.brand||''))?'clientRow':''}">${cols.map(c=>`<td class="${isNum(r[c])?'num':''}">${esc(isNum(r[c])?fmt(r[c]):r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`);}
function renderSide(){
  const q=search.value.trim().toLowerCase();
  const match=s=>!q || String(s||'').toLowerCase().includes(q);
  const datasetItems=(REPORT.datasets||[]).filter(d=>match(d.name)).map(d=>{
    const imported=d.createdAt?new Date(d.createdAt).toLocaleDateString(uiLocale()):'';
    return `<div class="item ${state.activeDataset===d.id?'active':''}" data-type="dataset" data-id="${esc(d.id)}"><div class="icon">▦</div><div class="itemName">${esc(d.name)}<div class="itemMeta">${d.rows?.length||0} рядків${imported?' · '+esc(imported):''}</div></div><button class="btn small ghost adminOnly" data-act="export-dataset" data-id="${esc(d.id)}" title="Експорт CSV">⇩</button><button class="btn small ghost danger adminOnly" data-act="delete-dataset" data-id="${esc(d.id)}" title="Видалити таблицю">×</button></div>`;
  }).join('');
  const chartItems=(REPORT.charts||[]).filter(ch=>match(ch.title)).map(ch=>`<div class="item" data-type="chart" data-id="${esc(ch.id)}"><div class="icon">▥</div><div class="itemName">${esc(ch.title)}</div></div>`).join('');
  let html=`<div class="sectionTitle">Таблиці даних</div>${datasetItems||'<div class="empty">Таблиць ще немає.</div>'}<div class="sectionTitle">Графіки</div>${chartItems||'<div class="empty">Графіків ще немає.</div>'}<div class="sectionTitle">Файли й папки</div>`;
  if(state.fsRoots.length){
    for(const root of state.fsRoots){
      const rk='root:'+root.id;
      const open=state.fsOpen[rk]===true;
      const rootTitle=canonicalSiteName(root.name||'') || root.name || 'folder';
      html += `<div class="item" data-type="fs-root" data-id="${esc(root.id)}"><div class="icon">${open?'▾':'▸'}</div><div class="itemName">📂 ${esc(rootTitle)}</div><button class="btn small ghost adminOnly" data-act="delete" data-target="fs-root" data-id="${esc(root.id)}" title="Відключити папку">×</button></div>`;
      if(open && root.tree) html += renderFsTreeNode(root.tree, '', match, 0, root.id);
    }
  }else{
    const embTree=buildEmbeddedTree(REPORT.files||[]);
    const embHtml=renderEmbeddedTreeNode(embTree,'',match,0);
    html += embHtml || '<div class="empty">Папки не підключені. Натисни "Підключити папку".</div>';
  }
  sideList.innerHTML=translateText(html);
}
function onSideListClick(e){
  const exportBtn=e.target.closest('[data-act="export-dataset"]');
  if(exportBtn && sideList.contains(exportBtn)){exportDatasetCsv(exportBtn.dataset.id); e.stopPropagation(); return;}
  const deleteDatasetBtn=e.target.closest('[data-act="delete-dataset"]');
  if(deleteDatasetBtn && sideList.contains(deleteDatasetBtn)){deleteDatasetById(deleteDatasetBtn.dataset.id); e.stopPropagation(); return;}
  const del=e.target.closest('[data-act="delete"]');
  if(del && sideList.contains(del)){
    if(!guardAdmin()) return;
    const target=String(del.dataset.target||'');
    const id=String(del.dataset.id||'');
    if(target==='fs-file') deleteFsFileByKey(id);
    else if(target==='fs-folder') deleteFsFolderByKey(id);
    else if(target==='fs-root') disconnectFsRoot(id);
    else if(target==='emb-file') deleteEmbeddedFileById(id);
    else if(target==='emb-folder') deleteEmbeddedFolderByKey(id);
    e.stopPropagation();
    return;
  }
  const it=e.target.closest('.item');
  if(!it || !sideList.contains(it)) return;
  const type=it.dataset.type,id=it.dataset.id;
  if(type==='dataset'){openDataset(id); return;}
  if(type==='chart'){openChartView(id); return;}
  if(type==='fs-root'){const k='root:'+id; state.fsOpen[k]=!Boolean(state.fsOpen[k]); renderSide(); return;}
  if(type==='fs-folder'){state.fsOpen[id]=!Boolean(state.fsOpen[id]); renderSide(); return;}
  if(type==='fs-file'){openFsFile(id); return;}
  if(type==='emb-folder'){state.fsOpen[id]=!Boolean(state.fsOpen[id]); renderSide(); return;}
  if(type==='emb-file'){openFile(id); return;}
}
function csvCell(value){const text=String(value??''); return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
function exportDatasetCsv(id){const ds=dataset(id); if(!ds) return; const cols=columns(ds).map(c=>c.name); const csv=[cols.map(csvCell).join(','),...(ds.rows||[]).map(row=>cols.map(c=>csvCell(row[c])).join(','))].join('\r\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})); a.download=(ds.name||'dataset').replace(/[\\/:*?"<>|]+/g,'_')+'.csv'; a.click(); URL.revokeObjectURL(a.href);}
function deleteDatasetById(id){if(!guardAdmin()) return; const ds=dataset(id); if(!ds||!confirmI18n(`Видалити таблицю "${ds.name}" та пов'язані графіки?`)) return; removeDatasetsByIds([id]); refresh(); showNotice(`Таблицю "${ds.name}" видалено.`,'success');}
function removeDatasetsByIds(datasetIds){
  const dsSet=new Set(datasetIds||[]);
  if(!dsSet.size) return;
  REPORT.datasets=(REPORT.datasets||[]).filter(d=>!dsSet.has(d.id));
  REPORT.charts=(REPORT.charts||[]).filter(ch=>!dsSet.has(ch.datasetId) && !dsSet.has(ch.sourceDatasetId));
  REPORT.tables=(REPORT.tables||[]).filter(tb=>!dsSet.has(tb.datasetId) && !dsSet.has(tb.sourceDatasetId));
  if(dsSet.has(state.activeDataset)) state.activeDataset=REPORT.datasets[0]?.id||null;
}
function deleteEmbeddedFileById(fileId){
  const id=String(fileId||'');
  const file=(REPORT.files||[]).find(f=>f.id===id);
  if(!file) return;
  if(!confirmI18n(`Видалити файл "${file.name}" з проєкту?`)) return;
  const dsIds=(REPORT.datasets||[]).filter(d=>String(d.sourceFileId||'')===id).map(d=>d.id);
  removeDatasetsByIds(dsIds);
  REPORT.files=(REPORT.files||[]).filter(f=>f.id!==id);
  REPORT.charts=(REPORT.charts||[]).filter(ch=>String(ch.sourceFileId||'')!==id);
  REPORT.tables=(REPORT.tables||[]).filter(tb=>String(tb.sourceFileId||'')!==id);
  if(state.activeFile===`file:${id}`) state.activeFile=null;
  refresh();
  toast('Файл видалено');
}
function deleteEmbeddedFolderByKey(folderKey){
  const key=String(folderKey||'').replace(/^emb::/,'').replace(/^\/+/,'').trim();
  if(!key) return;
  if(!confirmI18n(`Видалити папку "${key}" і всі файли з проєкту?`)) return;
  const prefix=key.toLowerCase()+'/';
  const fileIds=(REPORT.files||[])
    .filter(f=>{
      const p=String(f.path||f.name||'').replace(/^\/+/,'').toLowerCase();
      return p===key.toLowerCase() || p.startsWith(prefix);
    })
    .map(f=>f.id);
  const fileSet=new Set(fileIds);
  const dsIds=(REPORT.datasets||[]).filter(d=>fileSet.has(String(d.sourceFileId||''))).map(d=>d.id);
  removeDatasetsByIds(dsIds);
  REPORT.files=(REPORT.files||[]).filter(f=>!fileSet.has(f.id));
  REPORT.charts=(REPORT.charts||[]).filter(ch=>!fileSet.has(String(ch.sourceFileId||'')));
  REPORT.tables=(REPORT.tables||[]).filter(tb=>!fileSet.has(String(tb.sourceFileId||'')));
  refresh();
  toast('Папку видалено з проєкту');
}
async function ensureReadWritePermission(handle){
  if(!handle) return false;
  try{
    let p=await handle.queryPermission({mode:'readwrite'});
    if(p!=='granted') p=await handle.requestPermission({mode:'readwrite'});
    return p==='granted';
  }catch(e){
    return false;
  }
}
async function getDirectoryHandleAt(rootHandle, dirPath){
  let cur=rootHandle;
  for(const seg of String(dirPath||'').split('/').filter(Boolean)){
    cur=await cur.getDirectoryHandle(seg);
  }
  return cur;
}
async function deleteFsFileByKey(fileKey){
  const [rootId, ...rest]=String(fileKey||'').split('::');
  const relPath=rest.join('::').replace(/\\/g,'/').replace(/^\/+/,'');
  const root=(state.fsRoots||[]).find(r=>r.id===rootId);
  if(!root || !relPath) return;
  const name=pathName(relPath);
  if(!confirmI18n(`Видалити файл "${name}" з диска?`)) return;
  if(!await ensureReadWritePermission(root.handle)){toast('Немає доступу на запис до папки'); return;}
  try{
    const parentPath=pathDir(relPath);
    const dir=await getDirectoryHandleAt(root.handle, parentPath);
    await dir.removeEntry(name);
    await refreshFsRoot(root);
    await syncFsDerivedData(true,{silent:true});
    if(state.activeFile===`fs:${fileKey}`) state.activeFile=null;
    refresh();
    toast('Файл видалено з папки');
  }catch(e){
    console.warn('[fs] delete file failed:', e?.message||e);
    toast('Не вдалося видалити файл');
  }
}
async function deleteFsFolderByKey(folderKey){
  const [rootId, ...rest]=String(folderKey||'').split('::');
  const relPath=rest.join('::').replace(/\\/g,'/').replace(/^\/+/,'');
  const root=(state.fsRoots||[]).find(r=>r.id===rootId);
  if(!root || !relPath) return;
  const name=pathName(relPath);
  if(!confirmI18n(`Видалити папку "${name}" і весь її вміст з диска?`)) return;
  if(!await ensureReadWritePermission(root.handle)){toast('Немає доступу на запис до папки'); return;}
  try{
    const parentPath=pathDir(relPath);
    const dir=await getDirectoryHandleAt(root.handle, parentPath);
    await dir.removeEntry(name,{recursive:true});
    await refreshFsRoot(root);
    await syncFsDerivedData(true,{silent:true});
    refresh();
    toast('Папку видалено з диска');
  }catch(e){
    console.warn('[fs] delete folder failed:', e?.message||e);
    toast('Не вдалося видалити папку');
  }
}
function disconnectFsRoot(rootId){
  const root=(state.fsRoots||[]).find(r=>r.id===rootId);
  if(!root) return;
  if(!confirmI18n(`Відключити папку "${root.name}"?`)) return;
  state.fsRoots=(state.fsRoots||[]).filter(r=>r.id!==rootId);
  const liveDsIds=(REPORT.datasets||[])
    .filter(d=>String(d.sourceRootId||'')===String(rootId))
    .map(d=>d.id);
  liveDsIds.forEach(id=>removeDatasetAndWidgets(id));
  REPORT.charts=(REPORT.charts||[]).filter(ch=>String(ch.sourceRootId||'')!==String(rootId));
  REPORT.tables=(REPORT.tables||[]).filter(tb=>String(tb.sourceRootId||'')!==String(rootId));
  saveFsRoots().catch(()=>{});
  refresh();
  toast('Папку відключено');
}
function renderFsTreeNode(node, path, match, depth, rootId){
  let dirs=[...node.dirs.keys()].sort((a,b)=>a.localeCompare(b,'uk'));
  if(depth===0 && dirs.length){
    const byNorm=new Set(dirs.map(d=>normSiteKey(d)));
    dirs=dirs.filter(d=>{
      const canonical=canonicalSiteName(d);
      const selfNorm=normSiteKey(d);
      const canonNorm=normSiteKey(canonical);
      if(selfNorm===canonNorm) return true;
      return !byNorm.has(canonNorm);
    });
  }
  const files=[...node.files].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'uk'));
  let html='';
  for(const d of dirs){
    const p=path?`${path}/${d}`:d;
    const folderKey=`${rootId}::${p}`;
    const open = state.fsOpen[folderKey]===true;
    const child = renderFsTreeNode(node.dirs.get(d), p, match, depth+1, rootId);
    if(!match(d) && !child.trim()) continue;
    const pad=18 + depth*16;
    html += `<div class="item" data-type="fs-folder" data-id="${esc(folderKey)}" style="padding-left:${pad}px"><div class="icon">${open?'▾':'▸'}</div><div class="itemName">📁 ${esc(d)}</div><button class="btn small ghost adminOnly" data-act="delete" data-target="fs-folder" data-id="${esc(folderKey)}" title="Видалити папку">×</button></div>`;
    if(open) html += child;
  }
  for(const f of files){
    if(!match(f.name) && !match(f.path)) continue;
    const pad=18 + depth*16;
    const fileKey=`${rootId}::${f.path}`;
    html += `<div class="item ${('fs:'+fileKey)===state.activeFile?'active':''}" data-type="fs-file" data-id="${esc(fileKey)}" style="padding-left:${pad}px"><div class="icon">${fileIcon(f)}</div><div class="itemName">${esc(f.name)}<div class="itemMeta">${esc(f.ext||'file')} · ${bytes(f.size||0)}</div></div><button class="btn small ghost adminOnly" data-act="delete" data-target="fs-file" data-id="${esc(fileKey)}" title="Видалити файл">×</button></div>`;
  }
  return html || (depth===0?'<div class="empty">Файлів ще немає</div>':'');
}
function buildEmbeddedTree(files){
  const root={dirs:new Map(), files:[]};
  for(const f of (files||[])){
    if(!f || (!f.name && !f.path)) continue;
    const raw=String(f.path||f.name||'').replace(/^\/+/,'');
    if(!raw) continue;
    const parts=raw.split('/').filter(Boolean);
    if(!parts.length) continue;
    let node=root;
    while(parts.length>1){
      const d=parts.shift();
      if(!node.dirs.has(d)) node.dirs.set(d,{dirs:new Map(),files:[]});
      node=node.dirs.get(d);
    }
    const name=parts[0]||f.name||'file';
    if(!name || name==='undefined') continue;
    node.files.push({...f,name});
  }
  return root;
}
function renderEmbeddedTreeNode(node, path, match, depth){
  let dirs=[...node.dirs.keys()].sort((a,b)=>a.localeCompare(b,'uk'));
  if(depth===0 && dirs.length){
    const byNorm=new Set(dirs.map(d=>normSiteKey(d)));
    dirs=dirs.filter(d=>{
      const canonical=canonicalSiteName(d);
      const selfNorm=normSiteKey(d);
      const canonNorm=normSiteKey(canonical);
      if(selfNorm===canonNorm) return true;
      return !byNorm.has(canonNorm);
    });
  }
  const files=[...node.files].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'uk'));
  let html='';
  for(const d of dirs){
    const p=path?`${path}/${d}`:d;
    const open = state.fsOpen[`emb::${p}`]===true;
    const child = renderEmbeddedTreeNode(node.dirs.get(d), p, match, depth+1);
    if(!match(d) && !child.trim()) continue;
    const pad=18 + depth*16;
    html += `<div class="item" data-type="emb-folder" data-id="${esc(`emb::${p}`)}" style="padding-left:${pad}px"><div class="icon">${open?'▾':'▸'}</div><div class="itemName">📁 ${esc(d)}</div><button class="btn small ghost adminOnly" data-act="delete" data-target="emb-folder" data-id="${esc(`emb::${p}`)}" title="Видалити папку">×</button></div>`;
    if(open) html += child;
  }
  for(const f of files){
    if(!f || !f.id || !f.name || f.name==='undefined') continue;
    const full=(path?`${path}/`:'')+String(f.name||'');
    if(!match(f.name) && !match(full)) continue;
    const pad=18 + depth*16;
    html += `<div class="item ${('file:'+f.id)===state.activeFile?'active':''}" data-type="emb-file" data-id="${esc(f.id)}" style="padding-left:${pad}px"><div class="icon">${fileIcon(f)}</div><div class="itemName">${esc(f.name)}<div class="itemMeta">${esc(f.ext||'file')} · ${bytes(f.size||0)}</div></div><button class="btn small ghost adminOnly" data-act="delete" data-target="emb-file" data-id="${esc(f.id)}" title="Видалити файл">×</button></div>`;
  }
  return html;
}
async function pickAndConnectFolder(){
  if(!guardAdmin()) return;
  if(!window.showDirectoryPicker){toast('Цей браузер не підтримує доступ до папок'); return;}
  const existsRootByHandle=async h=>{
    for(const root of state.fsRoots){
      if(root.handle===h) return true;
      try{
        if(typeof root.handle?.isSameEntry==='function' && await root.handle.isSameEntry(h)) return true;
      }catch(e){
        console.warn('[fs] failed to compare directory handles:', e?.message||e);
      }
    }
    return false;
  };
  const addRoot=async (h, displayName)=>{
    if(!h || await existsRootByHandle(h)) return null;
    const root={id:uid('fsr'),name:displayName||h.name||'folder',handle:h,tree:null,index:new Map()};
    state.fsRoots.push(root);
    state.fsOpen['root:'+root.id]=false;
    await refreshFsRoot(root);
    return root;
  };
  try{
    const handle=await window.showDirectoryPicker({mode:'read'});
    const addedRoot=await addRoot(handle, handle.name||'folder');
    if(addedRoot){
      await saveFsRoots();
      await syncFsDerivedData(true, {silent:false});
      state.analyticsSite=canonicalSiteName(addedRoot.name||'')||state.analyticsSite||'all';
      state.analyticsResearch='all';
      startFsWatcher();
      refresh();
      toast('Папку підключено');
    }else{
      toast('Ця папка вже підключена');
    }
  }catch(e){
    console.warn('[fs] pickAndConnectFolder cancelled/failed:', e?.message||e);
  }
}
async function refreshFsRoot(root){
  if(!root?.handle) return;
  const before=root.signature||'';
  const index=new Map();
  root.tree=await scanDirectory(root.handle,'',index);
  root.index=index;
  root.signature=treeSignature(root.tree);
  renderSide();
  return root.signature!==before;
}
async function refreshAllFsTrees(){
  let changed=false;
  for(const root of state.fsRoots){
    const oneChanged=await refreshFsRoot(root);
    changed=Boolean(oneChanged)||changed;
  }
  return changed;
}
async function scanDirectory(handle, prefix, index){
  const node={dirs:new Map(), files:[]};
  for await (const [name, child] of handle.entries()){
    const path=prefix?`${prefix}/${name}`:name;
    if(child.kind==='directory'){
      node.dirs.set(name, await scanDirectory(child,path,index));
    }else{
      let fileObj=null;
      try{
        const file=await child.getFile();
        const ext=(file.name.split('.').pop()||'').toLowerCase();
        fileObj={name:file.name,path,size:file.size,ext,type:file.type||'',lastModified:file.lastModified||0};
      }catch(e){
        fileObj={name,path,size:0,ext:(name.split('.').pop()||'').toLowerCase(),type:'',lastModified:0};
      }
      node.files.push(fileObj);
      index.set(path, child);
    }
  }
  return node;
}
function treeSignature(node){
  const parts=[];
  const walk=(n)=>{
    for(const f of (n?.files||[])) parts.push(`${f.path}|${f.size||0}|${f.lastModified||0}`);
    for(const child of (n?.dirs||new Map()).values()) walk(child);
  };
  walk(node);
  return parts.sort().join('\n');
}
function startFsWatcher(){
  if(state.fsPollTimer) clearInterval(state.fsPollTimer);
  state.fsPollTimer=setInterval(async()=>{
    try{
      const changed=await refreshAllFsTrees();
      if(changed){
        await syncFsDerivedData(true, {silent:true});
        refresh();
      }
    }catch(e){
      console.warn('[fs] watcher failed:', e?.message||e);
    }
  }, 2000);
}
async function openFsFile(fileKey){
  const [rootId, ...rest]=String(fileKey).split('::');
  const relPath=rest.join('::');
  const root=state.fsRoots.find(r=>r.id===rootId);
  const h=root?.index?.get(relPath);
  if(!h) return;
  try{
    const f=await h.getFile();
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    const structuredDs=structuredFsDatasetsForFile(rootId, relPath);
    const structuredButtons=structuredDs.length
      ? structuredDs.map(ds=>`<button class="btn small" data-open-structured="${esc(ds.id)}">${esc(short(ds.name,28))}</button>`).join('')
      : '';
    if(['txt','md','html','json','csv','tsv','js','css','xml'].includes(ext)){
      const txt=await f.text();
      if(ext==='md'){
        const tables=parseMarkdownTable(txt);
        const firstLive=REPORT.datasets.find(d=>d.sourceKind==='markdown-live' && d.sourceRootId===rootId && d.sourcePath===relPath);
        reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${bytes(f.size)}</span><span class="pill">${esc(f.type||ext||'file')}</span><span class="pill">${tables.length} таблиць</span>${tables.length?'<button class="btn small" id="openMdTablesBtn">Відкрити таблиці</button>':''}</div>${markdownLite(txt)}`);
        $('openMdTablesBtn')?.addEventListener('click',async()=>{
          let ds=REPORT.datasets.find(d=>d.sourceKind==='markdown-live' && d.sourceRootId===rootId && d.sourcePath===relPath) || firstLive;
          if(!ds){
            await syncMarkdownTablesFromFsRoots(true, {silent:true});
            refresh();
            ds=REPORT.datasets.find(d=>d.sourceKind==='markdown-live' && d.sourceRootId===rootId && d.sourcePath===relPath);
          }
          if(ds) openDataset(ds.id);
          else toast('У цьому markdown не знайдено таблиць з даними');
        });
      }
      else if(ext==='json'){
        reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${bytes(f.size)}</span><span class="pill">${esc(f.type||ext||'file')}</span>${structuredDs.length?`<span class="pill">${structuredDs.length} таблиць</span>`:''}${structuredButtons?`<div class="toolbar">${structuredButtons}</div>`:''}</div>${renderJsonPreview(txt)}`);
        if(structuredDs.length){
          reader.querySelectorAll('[data-open-structured]').forEach(btn=>btn.addEventListener('click',()=>openDataset(btn.dataset.openStructured)));
        }
      }
      else if(ext==='csv' || ext==='tsv'){
        reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${bytes(f.size)}</span><span class="pill">${esc(f.type||ext||'file')}</span>${structuredDs.length?`<span class="pill">${structuredDs.length} таблиць</span>`:''}${structuredButtons?`<div class="toolbar">${structuredButtons}</div>`:''}</div>${renderTextFile({contentText:txt, ext}, structuredDs[0]||null)}`);
        if(structuredDs.length){
          reader.querySelectorAll('[data-open-structured]').forEach(btn=>btn.addEventListener('click',()=>openDataset(btn.dataset.openStructured)));
        }
      }
      else reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${bytes(f.size)}</span><span class="pill">${esc(f.type||ext||'file')}</span></div><pre>${esc(txt.slice(0,500000))}</pre>`);
    }else if(ext==='xlsx'){
      if(structuredDs.length){
        reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${bytes(f.size)}</span><span class="pill">${esc(f.type||ext||'file')}</span><span class="pill">${structuredDs.length} аркуш(ів)</span></div><div class="empty">Excel-файл розібрано на таблиці. Обери потрібний аркуш нижче.</div><div class="toolbar">${structuredDs.map(ds=>`<button class="btn small" data-open-structured="${esc(ds.id)}">${esc(short(ds.name,28))}</button>`).join('')}</div>`);
        reader.querySelectorAll('[data-open-structured]').forEach(btn=>btn.addEventListener('click',()=>openDataset(btn.dataset.openStructured)));
      }else{
        reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${bytes(f.size)}</span><span class="pill">${esc(f.type||ext||'file')}</span></div><div class="empty">Excel-файл не вдалося розібрати.</div>`);
      }
    }else if(['png','jpg','jpeg','webp','gif','bmp'].includes(ext)){
      const url=URL.createObjectURL(f);
      reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${bytes(f.size)}</span></div><img alt="${esc(f.name)}" src="${url}" style="max-width:100%;height:auto;border-radius:12px;border:1px solid var(--line)">`);
    }else{
      reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${bytes(f.size)}</span><span class="pill">${esc(f.type||'binary')}</span></div><div class="empty">Попередній перегляд для цього типу не підтримується.</div>`);
    }
    addTab('fs:'+fileKey, f.name, 'fs', fileKey);
    state.activeFile='fs:'+fileKey;
    renderReaderTabs();
    renderSide();
  }catch(e){toast('Не вдалося відкрити файл');}
}
function openFsDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('mrs-fs-db',1);
    req.onupgradeneeded=()=>{req.result.createObjectStore('kv');};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function saveFsRoots(){
  const db=await openFsDb();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('kv','readwrite');
    const ids=state.fsRoots.map(r=>r.id);
    tx.objectStore('kv').put(ids,'rootIds');
    for(const r of state.fsRoots){
      tx.objectStore('kv').put({id:r.id,name:r.name},`rootMeta:${r.id}`);
      tx.objectStore('kv').put(r.handle,`rootHandle:${r.id}`);
    }
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function loadFsRoots(){
  const db=await openFsDb();
  return await new Promise((resolve,reject)=>{
    const tx=db.transaction('kv','readonly');
    const store=tx.objectStore('kv');
    const req=store.get('rootIds');
    req.onsuccess=async ()=>{
      try{
        const ids=Array.isArray(req.result)?req.result:[];
        const roots=[];
        for(const id of ids){
          const meta=await new Promise((res,rej)=>{const r=store.get(`rootMeta:${id}`); r.onsuccess=()=>res(r.result||null); r.onerror=()=>rej(r.error);});
          const handle=await new Promise((res,rej)=>{const r=store.get(`rootHandle:${id}`); r.onsuccess=()=>res(r.result||null); r.onerror=()=>rej(r.error);});
          if(meta&&handle) roots.push({id:meta.id,name:handle.name||meta.name||'folder',handle,tree:null,index:new Map()});
        }
        resolve(roots);
      }catch(e){resolve([]);}
    };
    req.onerror=()=>reject(req.error);
  });
}
async function tryAutoReconnectFs(){
  try{
    const roots=await loadFsRoots();
    if(!roots.length) return;
    const ok=[];
    for(const r of roots){
      const p=await r.handle.queryPermission({mode:'read'});
      if(p==='granted') ok.push(r);
    }
    if(!ok.length) return;
    state.fsRoots=ok;
    await refreshAllFsTrees();
    await syncFsDerivedData(true, {silent:true});
    startFsWatcher();
    refresh();
  }catch(e){
    console.warn('[fs] tryAutoReconnectFs failed:', e?.message||e);
  }
}
function openCompany(id){const c=company(id); if(!c) return; state.activeCompany=id; addTab('company:'+id,c.name,'company',id); state.activeFile='company:'+id; const ds=dataset(state.activeDataset); const rows=companyRows(id, ds?.id); const cols=columns(ds).map(x=>x.name); const files=companyFiles(id); const previewRows=rows.slice(0,20); reader.innerHTML=translateText(`<div class="previewToolbar"><b>📁 ${esc(c.name)}</b><span class="pill">${esc(c.type||'competitor')}</span><span class="pill">${rows.length} рядків</span><span class="pill">${files.length} файлів</span><button class="btn small adminOnly" id="folderAddFile">+ файл у папку</button></div><div class="grid"><div class="widget"><div class="widgetHead"><b>Дані компанії</b></div><div class="widgetBody"><div style="overflow:auto"><table class="dataTable"><thead><tr>${cols.slice(0,8).map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${previewRows.map(r=>`<tr>${cols.slice(0,8).map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')||'<tr><td>Даних поки немає</td></tr>'}</tbody></table></div></div></div><div class="widget"><div class="widgetHead"><b>Файли папки</b></div><div class="widgetBody">${files.map(f=>`<div class="item" data-file="${esc(f.id)}"><div class="icon">${fileIcon(f)}</div><div class="itemName">${esc(f.name)}<div class="itemMeta">${esc(f.ext||'file')} · ${bytes(f.size||0)}</div></div></div>`).join('')||'<div class="empty">Файлів ще немає. В адмін-режимі вибери цю папку і натисни + Дані / перетягни файли.</div>'}</div></div></div>`); $('folderAddFile')?.addEventListener('click',()=>{if(guardAdmin()) $('fileInput').click();}); reader.querySelectorAll('[data-file]').forEach(x=>x.addEventListener('click',()=>openFile(x.dataset.file))); renderReaderTabs(); renderSide();}
function fileIcon(f){const e=(f.ext||'').toLowerCase(); if(e==='json') return '{}'; if(e==='csv') return 'CSV'; if(e==='tsv') return 'TSV'; if(e==='xlsx') return 'XLSX'; if(f.isData) return '▦'; if(['png','jpg','jpeg','webp','gif'].includes(e)) return '🖼'; if(e==='pdf') return 'PDF'; if(['md','txt'].includes(e)) return 'TXT'; if(e==='html') return 'HTML'; if(e==='docx') return 'DOC'; return '📎';}
function renderReaderTabs(){
  readerTabs.innerHTML = state.openTabs.map(t=>`<button class="readerTab ${t.id===state.activeFile?'active':''}" data-id="${esc(t.id)}">${esc(short(translateText(t.title),20))}</button>`).join('');
  readerTabs.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    const t=state.openTabs.find(x=>x.id===b.dataset.id);
    if(t?.kind==='dataset') openDataset(t.ref);
    else if(t?.kind==='chart') openChartView(t.ref);
    else if(t?.kind==='fs') openFsFile(t.ref);
    else if(t?.kind==='company') openCompany(t.ref);
    else if(t?.kind==='file') openFile(t.ref);
  }));
}
function addTab(id,title,kind,ref){state.openTabs=[{id,title,kind,ref}]; state.activeFile=id; renderReaderTabs();}
function openDataset(id, sourceFileId, editMode=false){if(editMode&&!isAdmin()) editMode=false; const ds=dataset(id); if(!ds) return; state.activeDataset=id; addTab('ds:'+id,ds.name,'dataset',id); state.activeFile='ds:'+id; const cols=columns(ds).map(c=>c.name); const rowLimit=250; const rows=ds.rows.slice(0,rowLimit); const quality=dataQuality(ds); const limitText=ds.rows.length>rowLimit?`Показано перші ${rowLimit} із ${ds.rows.length} рядків.`:`Показано всі ${ds.rows.length} рядків.`;
  reader.innerHTML=translateText(`<div class="previewToolbar"><b>${esc(ds.name)}</b><span class="pill">${ds.rows.length} рядків</span><span class="pill">${cols.length} колонок</span><span class="pill ${quality.missing?'warn':'good'}">${quality.missing?'є пропуски':'дані ок'}</span><span class="hint">${limitText}</span><button class="btn small primary adminOnly" id="readerAutoBtn">✨ Авто-звіт</button><button class="btn small adminOnly" id="readerChartBtn">+ графік</button><button class="btn small adminOnly" id="readerTableBtn">+ табличка</button><button class="btn small adminOnly" id="readerEditBtn">${editMode?'Перегляд':'Редагувати рядки'}</button>${editMode&&isAdmin()?'<button class="btn small primary adminOnly" id="saveRowsBtn">Зберегти зміни</button>':''}</div><div style="overflow:auto;max-height:100%"><table class="previewTable" id="readerDataTable"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,ri)=>`<tr data-row="${ri}">${cols.map(c=>`<td data-col="${esc(c)}" class="${isNum(r[c])?'num':''} ${editMode?'editCell':''}" ${editMode?'contenteditable="true"':''}>${esc(editMode?(r[c]??''):(isNum(r[c])?fmt(r[c]):r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
  $('readerAutoBtn')?.addEventListener('click',()=>autoReport(id)); $('readerChartBtn')?.addEventListener('click',()=>openChartModal(null,id)); $('readerTableBtn')?.addEventListener('click',()=>openTableModal(null,id)); $('readerEditBtn')?.addEventListener('click',()=>openDataset(id,sourceFileId,!editMode)); $('saveRowsBtn')?.addEventListener('click',()=>saveDatasetEdits(id));
  state.activeFile= sourceFileId || 'ds:'+id; refreshSideOnly(); renderReaderTabs();
}
function refreshSideOnly(){renderSide();}
async function openFile(id){const f=fileRec(id); if(!f) return; addTab('file:'+id,f.name,'file',id); state.activeFile='file:'+id; const ext=(f.ext||'').toLowerCase(); const jsonDataset=ext==='json'?REPORT.datasets.find(d=>d.sourceFileId===f.id):null; let html='';
  if(f.isData && !(ext==='json' && f.contentText)){const ds=REPORT.datasets.find(d=>d.sourceFileId===f.id); if(ds){openDataset(ds.id,f.id); return;}}
  if(['md','txt','csv','tsv','json'].includes(ext) || (f.contentText && !['docx','html'].includes(ext))){html=renderTextFile(f,jsonDataset);}
  else if(ext==='docx'){html=await renderDocxFile(f);}
  else if(['png','jpg','jpeg','webp','gif'].includes(ext) && f.contentBase64){html=`<img alt="${esc(f.name)}" src="data:${esc(f.type)};base64,${f.contentBase64}" style="max-width:100%;border-radius:12px;border:1px solid var(--line)">`;}
  else if(ext==='pdf' && f.contentBase64){const url=blobUrl(f); html=`<iframe class="iframePreview" sandbox="" referrerpolicy="no-referrer" src="${url}"></iframe>`;}
  else if(ext==='html' && f.contentText){
    if(location.protocol==='file:'){
      html=`<pre class="mono">${esc(f.contentText)}</pre>`;
    } else {
      html=`<iframe class="iframePreview" sandbox="" referrerpolicy="no-referrer" srcdoc="${esc(sanitizeHtml(f.contentText))}"></iframe>`;
    }
  }
  else {html=`<div class="empty"><b>${esc(f.name)}</b><br>Файл збережено всередині звіту.<br><br><button class="btn" id="downloadFileBtn">Завантажити файл</button></div>`;}
  reader.innerHTML = translateText(`<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">${esc(ext||'file')}</span><span class="pill">${bytes(f.size||0)}</span></div>${html}`);
  $('downloadFileBtn')?.addEventListener('click',()=>downloadStoredFile(f)); $('openJsonDatasetBtn')?.addEventListener('click',()=>{if(jsonDataset) openDataset(jsonDataset.id,f.id);}); refreshSideOnly(); renderReaderTabs();
  $('pickDocxBtn')?.addEventListener('click',()=>pickAndRenderDocx(f));
}
function renderTextFile(f, relatedDataset=null){let text=f.contentText||''; const ext=(f.ext||'').toLowerCase(); if(ext==='json') return renderJsonPreview(text,{dataset:relatedDataset}); if(ext==='csv' || ext==='tsv'){const rows=parseCsv(text, ext==='tsv' ? '\t' : undefined).slice(0,80); if(rows.length){const head=rows[0]; return `<table class="previewTable"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${head.map((_,i)=>`<td>${esc(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}} if(ext==='md') return markdownLite(text); return `<pre class="mono">${esc(text)}</pre>`;}
function renderJsonPreview(raw, opts={}){
  const text=String(raw||'').replace(/^\ufeff/,'');
  if(!text.trim()) return '<div class="empty">JSON-файл порожній.</div>';
  let obj=null;
  try{
    obj=JSON.parse(text);
  }catch(e){
    return `<div class="hintBox" style="margin-bottom:8px"><b>JSON не прочитався.</b> ${esc(e?.message||'Перевір синтаксис файлу.')}</div><pre class="mono">${esc(text.slice(0,500000))}</pre>`;
  }
  const stats=jsonStats(obj);
  const tables=jsonTableCandidates(obj);
  const pretty=JSON.stringify(obj,null,2);
  const prettyLimit=500000;
  const prettyShown=pretty.length>prettyLimit?pretty.slice(0,prettyLimit)+'\n... JSON обрізано для швидкого перегляду':pretty;
  const tableHtml=renderJsonDataSections(tables, opts);
  const note=stats.truncated?'<span class="pill">структуру скорочено</span>':'';
  return `<div class="jsonView">
    ${renderJsonOverview(obj,stats,text,tables)}
    ${tableHtml}
    <details class="jsonCollapsed">
      <summary class="jsonBlockHead"><span>Технічна структура</span><span class="tiny">${stats.objects} об'єктів · ${stats.arrays} масивів</span>${note}</summary>
      <div class="jsonBlockBody">${renderJsonTree(obj)}</div>
    </details>
    <details class="jsonCollapsed">
      <summary class="jsonBlockHead"><span>Сирий JSON</span><span class="tiny">${bytes(estimateUtf8Bytes(text))}</span></summary>
      <div class="jsonBlockBody"><pre class="jsonCode mono">${jsonHighlightedCode(prettyShown)}</pre></div>
    </details>
  </div>`;
}
function jsonKindLabel(v){if(Array.isArray(v)) return 'Масив'; if(v===null) return 'null'; if(typeof v==='object') return "Об'єкт"; if(typeof v==='string') return 'Рядок'; if(typeof v==='number') return 'Число'; if(typeof v==='boolean') return 'Так/ні'; return typeof v;}
function jsonStats(value){
  const out={objects:0,arrays:0,scalars:0,keys:0,maxDepth:0,visited:0,truncated:false};
  const walk=(v,depth)=>{
    if(out.visited>=6000){out.truncated=true; return;}
    out.visited++; out.maxDepth=Math.max(out.maxDepth,depth);
    if(Array.isArray(v)){
      out.arrays++;
      const lim=Math.min(v.length,1000);
      for(let i=0;i<lim;i++) walk(v[i],depth+1);
      if(v.length>lim) out.truncated=true;
    }else if(v&&typeof v==='object'){
      out.objects++;
      const keys=Object.keys(v);
      out.keys+=keys.length;
      const lim=Math.min(keys.length,1000);
      for(let i=0;i<lim;i++) walk(v[keys[i]],depth+1);
      if(keys.length>lim) out.truncated=true;
    }else{
      out.scalars++;
    }
  };
  walk(value,0);
  return out;
}
function renderJsonOverview(obj,stats,text,tables){
  const rootItems=Array.isArray(obj)?obj.length:(obj&&typeof obj==='object'?Object.keys(obj).length:1);
  const generated=jsonFindFirstScalar(obj,['generated_at_utc','generated_at','created_at','updated_at']);
  const mode=jsonFindFirstScalar(obj,['mode','status','type']);
  const domains=jsonFindFirstArray(obj,['domains','domain','subdomains_resolved','live_urls']);
  const facts=[
    ['Тип',jsonKindLabel(obj)],
    ['Розмір',bytes(estimateUtf8Bytes(text))],
    ['Верхні елементи',fmt(rootItems)],
    ['Поля',fmt(stats.keys)],
    ['Табличні блоки',fmt(tables.length)]
  ];
  if(mode!==undefined) facts.push(['Режим',jsonScalarText(mode)]);
  if(generated!==undefined) facts.push(['Створено',jsonDateText(generated)]);
  if(domains?.length) facts.push(['Домени / URL',fmt(domains.length)]);
  const counts=jsonFindObjectByKey(obj,'counts',3);
  const lists=jsonImportantLists(obj).slice(0,4);
  const scalarFacts=jsonTopFacts(obj).slice(0,10);
  return `<div class="jsonLead">
    <div class="jsonPanel">
      <h3>Огляд</h3>
      <div class="jsonSummary">${facts.map(([k,v])=>`<div class="jsonMetric"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      ${counts?`<div style="margin-top:8px">${renderJsonCountCards(counts)}</div>`:''}
    </div>
    <div class="jsonPanel">
      <h3>Ключові значення</h3>
      ${scalarFacts.length?`<div class="jsonFacts">${scalarFacts.map(x=>`<div class="jsonFact"><span>${esc(jsonHumanLabel(x.path))}</span><b>${jsonInlineValueHtml(x.value)}</b></div>`).join('')}</div>`:'<div class="empty">Немає коротких текстових або числових полів.</div>'}
    </div>
    ${lists.length?`<div class="jsonPanel" style="grid-column:1/-1"><h3>Списки та посилання</h3>${lists.map(l=>`<div style="margin-top:8px"><div class="tiny" style="margin-bottom:5px">${esc(jsonHumanLabel(l.path))} · ${l.values.length}</div><div class="jsonList">${l.values.slice(0,12).map(v=>jsonChipHtml(v)).join('')}${l.values.length>12?`<span class="jsonChip">+${l.values.length-12}</span>`:''}</div></div>`).join('')}</div>`:''}
  </div>`;
}
function renderJsonCountCards(counts){
  const entries=Object.entries(counts||{}).filter(([,v])=>v===null || ['string','number','boolean'].includes(typeof v)).slice(0,10);
  if(!entries.length) return '';
  return `<div class="jsonSummary">${entries.map(([k,v])=>`<div class="jsonMetric"><span>${esc(jsonHumanLabel(k))}</span><b>${esc(jsonScalarText(v))}</b></div>`).join('')}</div>`;
}
function renderJsonDataSections(tables, opts={}){
  const datasetBtn=opts.dataset?'<button class="btn small" id="openJsonDatasetBtn">Відкрити як таблицю</button>':'';
  if(!tables.length) return datasetBtn?`<div class="jsonBlock"><div class="jsonBlockHead"><span>JSON уже розпізнано як дані</span>${datasetBtn}</div></div>`:'';
  const shown=tables.slice(0,4);
  return shown.map((t,i)=>`
    <div class="jsonBlock">
      <div class="jsonBlockHead"><span>${esc(jsonHumanLabel(t.path))}</span><span class="tiny">${t.rows.length} рядків · ${t.cols.length} колонок</span>${i===0?datasetBtn:''}</div>
      <div class="jsonBlockBody">${renderJsonTablePreview(t.rows,t.cols)}</div>
    </div>`).join('') + (tables.length>shown.length?`<div class="tiny">Ще ${tables.length-shown.length} табличних блоків у технічній структурі.</div>`:'');
}
function jsonTableCandidates(obj){
  const out=[];
  const seen=new Set();
  const add=(path,arr,depth)=>{
    const rows=(arr||[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x));
    if(!rows.length) return;
    const key=path+'|'+rows.length+'|'+Object.keys(rows[0]||{}).join(',');
    if(seen.has(key)) return;
    seen.add(key);
    const cols=jsonTableColumns(rows);
    if(!cols.length) return;
    const top=path.split('.').length===1?140:0;
    const preferred=/^(rows|data|items|results|records|clusters)$/i.test(path.split('.').pop()||'')?80:0;
    const urlish=/url|domain|link|inventory|sitemap/i.test(path)?60:0;
    out.push({path,rows,cols,score:top+preferred+urlish+Math.min(rows.length,300)+cols.length*5-depth*8});
  };
  const visit=(v,path,depth)=>{
    if(depth>5 || out.length>28) return;
    if(Array.isArray(v)){
      add(path||'root',v,depth);
      v.slice(0,8).forEach((item,i)=>visit(item,`${path||'root'}[${i}]`,depth+1));
      return;
    }
    if(v&&typeof v==='object'){
      for(const [k,val] of Object.entries(v)){
        const p=path?`${path}.${k}`:k;
        if(Array.isArray(val)) add(p,val,depth+1);
        if(val&&typeof val==='object') visit(val,p,depth+1);
      }
    }
  };
  visit(obj,'',0);
  const direct=jsonRows(obj);
  if(Array.isArray(direct)&&direct.length) add(Array.isArray(obj)?'root':'data',direct,0);
  return out.sort((a,b)=>b.score-a.score).slice(0,8);
}
function jsonTableColumns(rows){
  const names=[];
  for(const row of rows.slice(0,100)){
    Object.keys(row||{}).forEach(k=>{if(!String(k).startsWith('_')&&!names.includes(k)) names.push(k);});
  }
  const preferred=['name','title','label','cluster','keyword','query','url','link','domain','path','status','type','count','score','value'];
  const scored=names.map(name=>{
    let filled=0,scalar=0,linkish=0,arrayScalar=0;
    for(const r of rows.slice(0,80)){
      const v=r?.[name];
      if(v===undefined||v===null||v==='') continue;
      filled++;
      if(['string','number','boolean'].includes(typeof v)) scalar++;
      if(typeof v==='string' && isUrlString(v)) linkish++;
      if(Array.isArray(v) && v.some(x=>['string','number','boolean'].includes(typeof x))) arrayScalar++;
    }
    const pref=preferred.findIndex(p=>String(name).toLowerCase()===p || String(name).toLowerCase().includes(p));
    return {name,score:filled*3+scalar*8+arrayScalar*7+linkish*10+(pref>=0?80-pref*3:0)};
  });
  return scored.sort((a,b)=>b.score-a.score).slice(0,12).map(x=>x.name);
}
function renderJsonTablePreview(rows,cols){
  const visible=rows.slice(0,80);
  return `<div class="jsonTableWrap"><table class="previewTable jsonDataTable"><thead><tr>${cols.map(c=>`<th>${esc(jsonHumanLabel(c))}</th>`).join('')}</tr></thead><tbody>${visible.map(r=>`<tr>${cols.map(c=>{const v=r[c]; return `<td class="${isNum(v)?'num':''}">${jsonCellHtml(v)}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>${rows.length>visible.length?`<div class="tiny" style="margin-top:8px">Показано перші ${visible.length} рядків із ${rows.length}.</div>`:''}`;
}
function jsonCellHtml(v){
  if(v===undefined || v==='') return '<span class="jsonMeta">—</span>';
  if(v===null) return '<span class="jsonNull">null</span>';
  if(typeof v==='number') return esc(fmt(v));
  if(typeof v==='boolean') return `<span class="jsonBool">${v?'true':'false'}</span>`;
  if(typeof v==='string') return jsonInlineValueHtml(v);
  if(Array.isArray(v)){
    if(!v.length) return '<span class="jsonMeta">порожньо</span>';
    if(v.every(x=>x===null || ['string','number','boolean'].includes(typeof x))){
      return `<div class="jsonValueList">${v.slice(0,5).map(x=>jsonChipHtml(x)).join('')}${v.length>5?`<span class="jsonChip">+${v.length-5}</span>`:''}</div>`;
    }
    return `<span class="pill">${v.length} елементів</span>`;
  }
  if(typeof v==='object'){
    const entries=Object.entries(v).filter(([,x])=>x===null || ['string','number','boolean'].includes(typeof x)).slice(0,4);
    return entries.length?`<div class="jsonMiniObject">${entries.map(([k,x])=>`<div><span>${esc(jsonHumanLabel(k))}:</span><b>${jsonInlineValueHtml(x)}</b></div>`).join('')}</div>`:`<span class="pill">${Object.keys(v).length} полів</span>`;
  }
  return esc(String(v));
}
function jsonInlineValueHtml(v){
  if(v===null) return '<span class="jsonNull">null</span>';
  if(typeof v==='number') return esc(fmt(v));
  if(typeof v==='boolean') return `<span class="jsonBool">${v?'true':'false'}</span>`;
  const s=String(v??'');
  if(isUrlString(s)) return `<a class="jsonLink" href="${esc(s)}" target="_blank" rel="noopener noreferrer">${esc(short(s,120))}</a>`;
  return esc(short(s,180));
}
function jsonChipHtml(v){
  const s=jsonScalarText(v);
  if(isUrlString(s)) return `<a class="jsonLink" href="${esc(s)}" target="_blank" rel="noopener noreferrer">${esc(short(s,110))}</a>`;
  return `<span class="jsonChip">${esc(short(s,110))}</span>`;
}
function jsonScalarText(v){if(v===null) return 'null'; if(typeof v==='number') return fmt(v); if(typeof v==='boolean') return v?'true':'false'; return String(v??'');}
function isUrlString(s){return /^https?:\/\/[^\s"'<>]+$/i.test(String(s||'').trim());}
function jsonDateText(v){const d=new Date(String(v||'')); return Number.isFinite(d.getTime())?d.toLocaleString(uiLocale()):jsonScalarText(v);}
function jsonHumanLabel(path){
  const raw=String(path||'').replace(/\[\d+\]/g,'').split('.').filter(Boolean).pop()||String(path||'');
  const key=raw.toLowerCase();
  const map={generated_at_utc:'Створено UTC',generated_at:'Створено',updated_at:'Оновлено',created_at:'Створено',live_urls:'Живі URL',urls_inventory:'Інвентар URL',subdomains_resolved:'Знайдені піддомени',subdomains_all:'Усі піддомени',tech_stack:'Технології',security_posture:'Безпека',content_map:'Карта контенту',clusters:'Кластери',domains:'Домени',httpx_fingerprints:'HTTP fingerprints',whatever_raw_ndjson_path:'Raw NDJSON path'};
  return map[key] || raw.replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
}
function jsonFindFirstScalar(obj,keys){
  const wanted=new Set(keys.map(k=>String(k).toLowerCase()));
  let found;
  const walk=(v,depth)=>{
    if(found!==undefined || depth>4 || !v || typeof v!=='object') return;
    for(const [k,val] of Object.entries(v)){
      if(wanted.has(String(k).toLowerCase()) && (val===null || ['string','number','boolean'].includes(typeof val))){found=val; return;}
      if(val&&typeof val==='object') walk(val,depth+1);
      if(found!==undefined) return;
    }
  };
  walk(obj,0);
  return found;
}
function jsonFindObjectByKey(obj,key,maxDepth=3){
  const target=String(key).toLowerCase();
  let found=null;
  const walk=(v,depth)=>{
    if(found || depth>maxDepth || !v || typeof v!=='object') return;
    for(const [k,val] of Object.entries(v)){
      if(String(k).toLowerCase()===target && val && typeof val==='object' && !Array.isArray(val)){found=val; return;}
      if(val&&typeof val==='object') walk(val,depth+1);
    }
  };
  walk(obj,0);
  return found;
}
function jsonFindFirstArray(obj,keys){
  const wanted=new Set(keys.map(k=>String(k).toLowerCase()));
  let found=null;
  const walk=(v,depth)=>{
    if(found || depth>4 || !v || typeof v!=='object') return;
    for(const [k,val] of Object.entries(v)){
      if(wanted.has(String(k).toLowerCase()) && Array.isArray(val)){found=val; return;}
      if(val&&typeof val==='object') walk(val,depth+1);
    }
  };
  walk(obj,0);
  return found;
}
function jsonTopFacts(obj){
  const out=[];
  const add=(path,val)=>{if(val===null || ['string','number','boolean'].includes(typeof val)) out.push({path,value:val});};
  if(obj&&typeof obj==='object'&&!Array.isArray(obj)){
    for(const [k,v] of Object.entries(obj)){
      if(k==='counts') continue;
      if(v&&typeof v==='object'&&!Array.isArray(v)){
        for(const [kk,vv] of Object.entries(v)){
          if(kk==='counts') continue;
          add(`${k}.${kk}`,vv);
        }
      }else add(k,v);
    }
  }else add('value',obj);
  return out;
}
function jsonImportantLists(obj){
  const out=[];
  const walk=(v,path,depth)=>{
    if(depth>4 || !v || typeof v!=='object') return;
    for(const [k,val] of Object.entries(v)){
      const p=path?`${path}.${k}`:k;
      if(Array.isArray(val) && val.length && val.every(x=>x===null || ['string','number','boolean'].includes(typeof x))){
        const priority=/url|domain|link|subdomain|fingerprint|asset|sitemap/i.test(p)?1:0;
        out.push({path:p,values:val,priority});
      }else if(val&&typeof val==='object') walk(val,p,depth+1);
    }
  };
  walk(obj,'',0);
  return out.sort((a,b)=>b.priority-a.priority || b.values.length-a.values.length);
}
function renderJsonTree(obj){const ctx={count:0,max:500,stopped:false}; return `<div class="jsonTree">${jsonTreeNode(obj,'root',0,ctx)}</div>`;}
function jsonTreeNode(value,label,depth,ctx){
  if(ctx.count>=ctx.max){if(!ctx.stopped){ctx.stopped=true; return '<div class="jsonMeta">... дерево скорочено для швидкого перегляду</div>';} return '';}
  ctx.count++;
  const labelCls=String(label||'').startsWith('[')?'jsonMeta':'jsonKey';
  const labelHtml=label!==undefined?`<span class="${labelCls}">${esc(label)}</span>: `:'';
  if(Array.isArray(value)){
    const open=depth===0?' open':'';
    const limit=depth===0?20:8;
    const shown=value.slice(0,limit).map((v,i)=>jsonTreeNode(v,`[${i}]`,depth+1,ctx)).join('');
    const more=value.length>limit?`<div class="jsonMeta">... ще ${value.length-limit} елементів</div>`:'';
    return `<details${open}><summary>${labelHtml}<span class="jsonMeta">Array(${value.length})</span></summary>${shown}${more}</details>`;
  }
  if(value&&typeof value==='object'){
    const keys=Object.keys(value);
    if(!keys.length) return `<div>${labelHtml}<span class="jsonMeta">{}</span></div>`;
    const open=depth===0?' open':'';
    const limit=depth===0?80:14;
    const shown=keys.slice(0,limit).map(k=>jsonTreeNode(value[k],k,depth+1,ctx)).join('');
    const more=keys.length>limit?`<div class="jsonMeta">... ще ${keys.length-limit} полів</div>`:'';
    return `<details${open}><summary>${labelHtml}<span class="jsonMeta">Object(${keys.length})</span></summary>${shown}${more}</details>`;
  }
  return `<div>${labelHtml}${jsonPrimitiveHtml(value)}</div>`;
}
function jsonPrimitiveHtml(v){if(v===null) return '<span class="jsonNull">null</span>'; if(typeof v==='string') return `<span class="jsonString">"${esc(short(v.replace(/\s+/g,' ').trim(),180))}"</span>`; if(typeof v==='number') return `<span class="jsonNumber">${esc(String(v))}</span>`; if(typeof v==='boolean') return `<span class="jsonBool">${String(v)}</span>`; return `<span class="jsonMeta">${esc(String(v))}</span>`;}
function jsonHighlightedCode(json){
  return String(json).replace(/("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?/g,(m,key,str,bool)=>{
    const cls=key?'jsonKey':str?'jsonString':bool?'jsonBool':m==='null'?'jsonNull':'jsonNumber';
    return `<span class="${cls}">${esc(m)}</span>`;
  });
}
async function renderDocxFile(f){
  try{
    if(typeof JSZip==='undefined') return f.contentText?`<pre class="mono">${esc(f.contentText)}</pre>`:`<div class="empty"><b>${esc(f.name)}</b><br>JSZip недоступний для читання .docx</div>`;
    let text='';
    if(f.contentBase64){
      text=await docxTextFromBase64(f.contentBase64);
    }
    if(text){
      return renderDocxStructured(text,f.name);
    }
    if(f.contentText){
      return `<div class="hintBox" style="margin-bottom:8px"><b>Показано збережений текст.</b> Щоб відкрити оригінальний .docx, натисни кнопку нижче.</div>${renderDocxStructured(f.contentText,f.name)}<div style="margin-top:10px"><button class="btn" id="pickDocxBtn">Відкрити локальний .docx</button> <button class="btn" id="downloadFileBtn">Завантажити файл</button></div>`;
    }
    return `<div class="empty"><b>${esc(f.name)}</b><br>Не вдалося прочитати вміст .docx.<br><br><button class="btn" id="pickDocxBtn">Відкрити локальний .docx</button> <button class="btn" id="downloadFileBtn">Завантажити файл</button></div>`;
  }catch(e){
    if(f.contentText) return `<div class="hintBox" style="margin-bottom:8px"><b>Помилка читання .docx.</b> Показано збережений текст. Можна відкрити оригінальний файл вручну.</div><pre class="mono">${esc(f.contentText)}</pre><div style="margin-top:10px"><button class="btn" id="pickDocxBtn">Відкрити локальний .docx</button> <button class="btn" id="downloadFileBtn">Завантажити файл</button></div>`;
    return `<div class="empty"><b>${esc(f.name)}</b><br>Помилка читання .docx.<br><br><button class="btn" id="pickDocxBtn">Відкрити локальний .docx</button> <button class="btn" id="downloadFileBtn">Завантажити файл</button></div>`;
  }
}
function renderDocxStructured(text,title){
  const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const pick=(rx)=>{const l=lines.find(x=>rx.test(x)); return l?l.replace(rx,'').trim():'';};
  const toNum=(s)=>{const m=String(s||'').replace(/\s+/g,'').replace(/,/g,'.').match(/-?\d+(\.\d+)?/); return m?Number(m[0]):null;};
  const views=toNum(pick(/^.*views?\s*[:\-]\s*/i) || pick(/^.*перегляд.*[:\-]\s*/i));
  const likes=toNum(pick(/^.*likes?\s*[:\-]\s*/i));
  const comments=toNum(pick(/^.*comments?\s*[:\-]\s*/i));
  const followers=toNum(pick(/^.*followers?\s*[:\-]\s*/i));
  const kpis=[['Views',views],['Likes',likes],['Comments',comments],['Followers',followers]].filter(x=>x[1]!==null);
  const max=Math.max(...kpis.map(x=>x[1]),1);
  const head = lines.slice(0,10).filter(x=>!/:/.test(x)).slice(0,3);
  const kv = lines.filter(x=>/:/.test(x)).slice(0,24).map(x=>{const i=x.indexOf(':');return [x.slice(0,i).trim(),x.slice(i+1).trim()]});
  const outline = lines.filter(x=>/^(Executive summary|Метадані|Аналіз|SEO|Виснов|Ризик|Рекомендац)/i.test(x)).slice(0,12);
  return `
  <div class="grid" style="grid-template-columns:1fr 1fr">
    <div class="widget"><div class="widgetHead"><b>Опис</b></div><div class="widgetBody">${head.map(x=>`<div>${esc(x)}</div>`).join('')||'<div class="empty">Немає опису</div>'}</div></div>
    <div class="widget"><div class="widgetHead"><b>KPI</b></div><div class="widgetBody">${kpis.length?`<table class="previewTable"><thead><tr><th>Metric</th><th class="num">Value</th></tr></thead><tbody>${kpis.map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${fmt(v)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">KPI не знайдено</div>'}</div></div>
  </div>
  ${kpis.length?`<div class="widget" style="margin-top:8px"><div class="widgetHead"><b>Графік KPI</b></div><div class="widgetBody"><svg class="svgChart" viewBox="0 0 760 220">${kpis.map(([k,v],i)=>{const y=20+i*45;const w=Math.max(6,Math.round((v/max)*620));return `<text x="8" y="${y+18}" font-size="12">${esc(k)}</text><rect x="110" y="${y}" width="${w}" height="24" rx="6" fill="rgba(49,92,246,.75)"></rect><text x="${118+w}" y="${y+17}" font-size="12">${esc(fmt(v))}</text>`}).join('')}</svg></div></div>`:''}
  <div class="grid" style="grid-template-columns:1fr 1fr; margin-top:8px">
    <div class="widget"><div class="widgetHead"><b>Поля</b></div><div class="widgetBody">${kv.length?`<table class="previewTable"><thead><tr><th>Поле</th><th>Значення</th></tr></thead><tbody>${kv.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Поля не знайдено</div>'}</div></div>
    <div class="widget"><div class="widgetHead"><b>Структура</b></div><div class="widgetBody">${outline.length?outline.map(x=>`<div>• ${esc(x)}</div>`).join(''):`<pre class="mono">${esc(lines.join('\n'))}</pre>`}</div></div>
  </div>`;
}
async function docxTextFromBase64(b64){
  const bin=atob(b64); const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return docxTextFromArrayBuffer(bytes.buffer);
}
async function docxTextFromArrayBuffer(ab){
  const zip=await JSZip.loadAsync(ab);
  assertSafeArchive(zip,'DOCX');
  const xml=await safeZipText(zip,'word/document.xml');
  if(!xml) return '';
  return xml.replace(/<w:p[^>]*>/g,'\n').replace(/<w:tab[^>]*\/>/g,'\t').replace(/<w:br[^>]*\/>/g,'\n').replace(/<[^>]+>/g,' ').replace(/\s+\n/g,'\n').replace(/\n\s+/g,'\n').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
async function pickAndRenderDocx(f){
  try{
    const inp=document.createElement('input');
    inp.type='file';
    inp.accept='.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    inp.onchange=async ()=>{
      try{
        const file=inp.files?.[0];
        if(!file) return;
        assertSafeImportFile(file);
        const text=await docxTextFromArrayBuffer(await file.arrayBuffer());
        if(text){
          f.contentText=text;
          reader.innerHTML = `<div class="previewToolbar"><b>${esc(f.name)}</b><span class="pill">docx</span><span class="pill">${bytes(file.size||f.size||0)}</span></div>${renderDocxStructured(text,f.name)}`;
        } else {
          toast('Не вдалося витягнути текст з .docx');
        }
      }catch(e){
        console.warn('[docx] local open failed:',e?.message||e);
        showNotice(e?.message||'Не вдалося відкрити локальний .docx','error');
      }
    };
    inp.click();
  }catch(e){
    toast('Не вдалося відкрити локальний .docx');
  }
}
function parseMermaidArray(raw){
  const m=String(raw||'').match(/\[([\s\S]*?)\]/);
  if(!m) return [];
  return m[1].split(',').map(s=>s.trim()).filter(Boolean).map(v=>{
    const q=v.match(/^["'](.*)["']$/);
    return q ? q[1] : v;
  });
}
function normalizeMermaidSource(src){
  return String(src||'')
    .replace(/\r\n/g,'\n')
    .replace(/^\s*%%\{[\s\S]*?\}%%\s*/,'')
    .split('\n')
    .filter(line=>!(/^\s*%%/.test(line)))
    .join('\n')
    .trim();
}
function renderMermaidXyChart(src){
  const norm=normalizeMermaidSource(src);
  const lines=norm.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!lines.length || !/^xychart-beta\b/i.test(lines[0])) return '';
  let title=state.lang==='en'?'Chart':'Графік', yLabel=state.lang==='en'?'Value':'Значення', yMin=0, yMax=0, xLabels=[], bars=[], lineSeries=[];
  for(const l of lines){
    let m=l.match(/^title\s+"([^"]+)"/i); if(m){title=m[1]; continue;}
    m=l.match(/^x-axis\s+(\[.*\])$/i); if(m){xLabels=parseMermaidArray(m[1]); continue;}
    m=l.match(/^y-axis\s+"([^"]+)"\s+(-?\d+(?:\.\d+)?)\s*-->\s*(-?\d+(?:\.\d+)?)/i); if(m){yLabel=m[1]; yMin=Number(m[2]); yMax=Number(m[3]); continue;}
    m=l.match(/^bar\s+(\[.*\])$/i); if(m){bars=parseMermaidArray(m[1]).map(Number).filter(v=>Number.isFinite(v)); continue;}
    m=l.match(/^line\s+(\[.*\])$/i); if(m){lineSeries=parseMermaidArray(m[1]).map(Number).filter(v=>Number.isFinite(v)); continue;}
  }
  const vals=bars.length?bars:lineSeries;
  if(!vals.length) return '';
  if(!xLabels.length) xLabels=vals.map((_,i)=>state.lang==='en'?`Item ${i+1}`:`Елемент ${i+1}`);
  if(!(yMax>yMin)) yMax=Math.max(...vals,1);
  const W=920,H=320,left=70,right=20,top=32,bottom=58;
  const cw=W-left-right, ch=H-top-bottom;
  const step=cw/Math.max(vals.length,1), bw=Math.max(16,Math.min(72,step*0.56));
  const y=(v)=>top+ch-((v-yMin)/(yMax-yMin))*ch;
  const grid=[0,.25,.5,.75,1].map(t=>{const yy=top+ch*(1-t), val=yMin+(yMax-yMin)*t; return `<line x1="${left}" y1="${yy}" x2="${W-right}" y2="${yy}" stroke="rgba(120,140,180,.25)" /><text x="${left-10}" y="${yy+4}" text-anchor="end" fill="var(--muted)" font-size="11">${Math.round(val).toLocaleString(uiLocale())}</text>`;}).join('');
  const barSvg=bars.map((v,i)=>{const cx=left+step*(i+.5), yy=y(v), h=Math.max(0,top+ch-yy), x=cx-bw/2; return `<rect x="${x}" y="${yy}" width="${bw}" height="${h}" rx="6" fill="var(--brand)"/><text x="${cx}" y="${yy-6}" text-anchor="middle" fill="var(--text)" font-size="11">${Math.round(v).toLocaleString(uiLocale())}</text>`;}).join('');
  const linePts=lineSeries.map((v,i)=>{const cx=left+step*(i+.5), yy=y(v); return `${cx},${yy}`;}).join(' ');
  const lineSvg=!lineSeries.length?'':`<polyline points="${linePts}" fill="none" stroke="var(--brand)" stroke-width="3"/>${lineSeries.map((v,i)=>{const cx=left+step*(i+.5), yy=y(v); return `<circle cx="${cx}" cy="${yy}" r="4" fill="var(--brand)"/><text x="${cx}" y="${yy-8}" text-anchor="middle" fill="var(--text)" font-size="11">${Math.round(v).toLocaleString(uiLocale())}</text>`;}).join('')}`;
  const xTicks=xLabels.map((lbl,i)=>{const cx=left+step*(i+.5), label=esc(String(lbl||`Item ${i+1}`)); return `<text x="${cx}" y="${H-24}" text-anchor="middle" fill="var(--muted)" font-size="11">${label}</text>`;}).join('');
  return `<div class="mdMermaid"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><text x="${left}" y="20" fill="var(--text)" font-size="14" font-weight="700">${esc(title)}</text>${grid}<line x1="${left}" y1="${top+ch}" x2="${W-right}" y2="${top+ch}" stroke="var(--line)"/><line x1="${left}" y1="${top}" x2="${left}" y2="${top+ch}" stroke="var(--line)"/>${barSvg}${lineSvg}${xTicks}<text x="20" y="${top+ch/2}" transform="rotate(-90 20 ${top+ch/2})" text-anchor="middle" fill="var(--muted)" font-size="11">${esc(yLabel)}</text></svg></div>`;
}
function parseMermaidFlowNode(line){
  const m=String(line||'').match(/^\s*([A-Za-z0-9_]+)\s*\[\s*"([^"]+)"\s*\]\s*$/);
  if(!m) return null;
  return {id:m[1], label:m[2]};
}
function renderMermaidFlowchart(src){
  const raw=normalizeMermaidSource(src);
  if(!/^\s*flowchart\s+(LR|TD|TB)\b/i.test(raw)) return '';
  const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean);
  const edgeRows=[];
  const nodeOnlyOrder=[];
  for(const line of lines){
    if(/^flowchart\b/i.test(line)) continue;
    const singleNode=parseMermaidFlowNode(line.replace(/\s*-->\s*$/,''));
    if(singleNode){
      nodeOnlyOrder.push(singleNode);
    }
    const parts=line.split(/\s*-->\s*/);
    if(parts.length<2) continue;
    const nodes=parts.map(parseMermaidFlowNode).filter(Boolean);
    if(nodes.length>=2) edgeRows.push(nodes);
  }
  const idToLabel=new Map();
  const order=[];
  if(edgeRows.length){
    for(const row of edgeRows){
      for(const n of row){
        if(!idToLabel.has(n.id)) order.push(n.id);
        idToLabel.set(n.id,n.label);
      }
    }
  }else{
    for(const n of nodeOnlyOrder){
      if(!idToLabel.has(n.id)) order.push(n.id);
      idToLabel.set(n.id,n.label);
    }
  }
  if(!order.length) return '';
  const isLR=/^\s*flowchart\s+LR\b/i.test(raw);
  const boxW=isLR?220:300, boxH=96, gap=22, pad=20;
  const count=order.length;
  const W=isLR?pad*2+count*boxW+(count-1)*gap:pad*2+boxW;
  const H=isLR?pad*2+boxH:pad*2+count*boxH+(count-1)*gap;
  const wrapNodeText=(s,maxChars)=>{
    const words=String(s||'').split(/\s+/).filter(Boolean);
    const lines=[]; let cur='';
    for(const w of words){
      const test=cur?`${cur} ${w}`:w;
      if(test.length<=maxChars){cur=test; continue;}
      if(cur) lines.push(cur);
      cur=w;
    }
    if(cur) lines.push(cur);
    return lines;
  };
  const boxes=order.map((id,i)=>{
    const x=isLR?pad+i*(boxW+gap):pad;
    const y=isLR?pad:pad+i*(boxH+gap);
    const labelRaw=String(idToLabel.get(id)||id);
    const chunks=labelRaw.split(/<br\s*\/?>/i).map(s=>s.trim()).filter(Boolean);
    const wrapped=chunks.flatMap(c=>wrapNodeText(c,20)).slice(0,6);
    const text=wrapped.map((p,idx)=>`<tspan x="${x+12}" y="${y+20+idx*14}">${esc(p)}</tspan>`).join('');
    return `<g><rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="12" fill="var(--panel)" stroke="var(--brand)" stroke-width="2"/><text fill="var(--text)" font-size="13" font-weight="700">${text}</text></g>`;
  }).join('');
  const arrows=(count<=1)?'':order.slice(0,-1).map((_,i)=>{
    if(isLR){
      const x1=pad+i*(boxW+gap)+boxW, y1=pad+boxH/2;
      const x2=pad+(i+1)*(boxW+gap), y2=y1;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--muted)" stroke-width="2.4" marker-end="url(#arr)"/>`;
    }
    const x1=pad+boxW/2, y1=pad+i*(boxH+gap)+boxH;
    const x2=x1, y2=pad+(i+1)*(boxH+gap);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--muted)" stroke-width="2.4" marker-end="url(#arr)"/>`;
  }).join('');
  return `<div class="mdMermaidWrap"><button class="mdMermaidShift" type="button" title="Прокрутити вправо">Вправо ▶</button><div class="mdMermaid"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mermaid flowchart"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)"/></marker></defs>${arrows}${boxes}</svg></div></div>`;
}
function renderMermaidMindmap(src){
  const raw=normalizeMermaidSource(src);
  if(!/^\s*mindmap\b/i.test(raw)) return '';
  const lines=raw.split('\n').filter(Boolean);
  const items=[];
  for(const ln of lines){
    if(/^\s*mindmap\b/i.test(ln)) continue;
    const m=ln.match(/^(\s*)(.+?)\s*$/);
    if(!m) continue;
    const depth=Math.floor((m[1]||'').replace(/\t/g,'  ').length/2);
    let text=(m[2]||'').trim();
    text=text.replace(/^root\(\(/i,'').replace(/\)\)\s*$/,'').trim();
    if(!text) continue;
    items.push({depth,text});
  }
  if(!items.length) return '';
  const root=items[0].text;
  const leaves=items.slice(1).filter(x=>x.depth<=2);
  const W=980,H=Math.max(280,120+leaves.length*36), cx=230, cy=H/2;
  const rootNode=`<g><ellipse cx="${cx}" cy="${cy}" rx="110" ry="42" fill="var(--panel)" stroke="var(--brand)" stroke-width="2"/><text x="${cx}" y="${cy+5}" text-anchor="middle" fill="var(--text)" font-size="16" font-weight="700">${esc(root)}</text></g>`;
  const nodes=leaves.map((it,i)=>{
    const y=70+i*36;
    const x=570 + (it.depth===2?90:0);
    const rx=it.depth===2?90:110;
    const line=`<line x1="${cx+110}" y1="${cy}" x2="${x-rx}" y2="${y}" stroke="var(--muted)" stroke-width="1.8"/>`;
    const box=`<rect x="${x-rx}" y="${y-16}" width="${rx*2}" height="32" rx="10" fill="var(--panel)" stroke="var(--line)"/>`;
    const txt=`<text x="${x}" y="${y+4}" text-anchor="middle" fill="var(--text)" font-size="12">${esc(it.text)}</text>`;
    return `${line}${box}${txt}`;
  }).join('');
  return `<div class="mdMermaid"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mermaid mindmap">${rootNode}${nodes}</svg></div>`;
}
function renderMermaidPie(src){
  const raw=normalizeMermaidSource(src);
  const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!lines.length || !/^pie\b/i.test(lines[0])) return '';
  let title='Pie chart';
  const items=[];
  for(let i=1;i<lines.length;i++){
    const ln=lines[i];
    let m=ln.match(/^title\s+(.+)$/i);
    if(m){ title=m[1].replace(/^["']|["']$/g,'').trim(); continue; }
    m=ln.match(/^"([^"]+)"\s*:\s*(-?\d+(?:\.\d+)?)$/);
    if(m){ items.push({label:m[1],value:Number(m[2])}); continue; }
    m=ln.match(/^([^:"]+)\s*:\s*(-?\d+(?:\.\d+)?)$/);
    if(m){ items.push({label:m[1].trim(),value:Number(m[2])}); continue; }
  }
  const data=items.filter(x=>Number.isFinite(x.value) && x.value>0);
  if(!data.length) return '';
  const total=data.reduce((s,x)=>s+x.value,0);
  const W=860,H=360,cx=170,cy=180,r=112;
  const colors=['#2563eb','#60a5fa','#14a06f','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#84cc16','#f97316','#ec4899'];
  let start=-Math.PI/2;
  const arcs=data.map((d,idx)=>{
    const frac=d.value/total;
    const ang=frac*Math.PI*2;
    const end=start+ang;
    const x1=cx+r*Math.cos(start), y1=cy+r*Math.sin(start);
    const x2=cx+r*Math.cos(end), y2=cy+r*Math.sin(end);
    const large=ang>Math.PI?1:0;
    const path=`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const color=colors[idx%colors.length];
    start=end;
    return `<path d="${path}" fill="${color}" stroke="var(--panel)" stroke-width="1"/>`;
  }).join('');
  const legend=data.map((d,idx)=>{
    const y=78+idx*24;
    const pct=((d.value/total)*100).toFixed(1);
    const color=colors[idx%colors.length];
    return `<rect x="350" y="${y-11}" width="12" height="12" rx="2" fill="${color}"/><text x="370" y="${y}" fill="var(--text)" font-size="13">${esc(d.label)}: ${esc(String(d.value))} (${pct}%)</text>`;
  }).join('');
  return `<div class="mdMermaid"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><text x="20" y="28" fill="var(--text)" font-size="18" font-weight="700">${esc(title)}</text>${arcs}<circle cx="${cx}" cy="${cy}" r="${r*0.45}" fill="var(--panel2)"/><text x="${cx}" y="${cy+4}" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="700">Total ${esc(String(total))}</text>${legend}</svg></div>`;
}
function renderMermaidLite(src){
  const xy=renderMermaidXyChart(src);
  if(xy) return xy;
  const flow=renderMermaidFlowchart(src);
  if(flow) return flow;
  const mind=renderMermaidMindmap(src);
  if(mind) return mind;
  const pie=renderMermaidPie(src);
  if(pie) return pie;
  return `<pre><code>${esc(src)}</code></pre>`;
}
function markdownLite(text){
  const lines=String(text||'').replace(/\r\n/g,'\n').split('\n');
  const out=[]; let i=0; let inCode=false; let code=[]; let codeLang='';
  const isTableLine = (s) => /^\s*\|.*\|\s*$/.test(s||'');
  const isTableSep = (s) => /^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(s||'');
  const splitTableCells = (s) => String(s||'').trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
  const safeMarkdownHref=(href)=>{
    const raw=String(href||'').trim();
    const check=raw.replace(/&amp;/gi,'&').replace(/&#0*58;/gi,':').replace(/\s+/g,'');
    const hasScheme=/^[a-z][a-z0-9+.-]*:/i.test(check);
    if(/^(?:https?:|mailto:|tel:)/i.test(check) || /^(?:#|\/(?!\/)|\.\.?\/)/.test(check)) return raw;
    if(!hasScheme && !check.startsWith('//')) return raw;
    return '#';
  };
  const inline=(s)=>esc(s)
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,href)=>`<a href="${safeMarkdownHref(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  while(i<lines.length){
    const line=lines[i];
    if(line.trim().startsWith('```')){
      if(inCode){
        const src=code.join('\n');
        out.push(codeLang==='mermaid' ? renderMermaidLite(src) : `<pre><code>${esc(src)}</code></pre>`);
        code=[]; inCode=false; codeLang='';
      } else {
        inCode=true;
        codeLang=(line.trim().slice(3).trim()||'').toLowerCase();
      }
      i++; continue;
    }
    if(inCode){code.push(line); i++; continue;}
    if(/^#{1,3}\s+/.test(line)){const lvl=Math.min(3,(line.match(/^#+/)[0]||'#').length); out.push(`<h${lvl}>${inline(line.replace(/^#{1,3}\s+/,''))}</h${lvl}>`); i++; continue;}
    if(/^\s*>\s+/.test(line)){out.push(`<blockquote>${inline(line.replace(/^\s*>\s+/,''))}</blockquote>`); i++; continue;}
    if(/^\s*[-*]\s+/.test(line)){const items=[]; while(i<lines.length && /^\s*[-*]\s+/.test(lines[i])){items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/,''))}</li>`); i++;} out.push(`<ul>${items.join('')}</ul>`); continue;}
    if(/^\s*\d+\.\s+/.test(line)){const items=[]; while(i<lines.length && /^\s*\d+\.\s+/.test(lines[i])){items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/,''))}</li>`); i++;} out.push(`<ol>${items.join('')}</ol>`); continue;}
    if(isTableLine(line)){
      let j=i+1;
      while(j<lines.length && !lines[j].trim()) j++;
      if(j<lines.length && isTableSep(lines[j])){
        const headCells=splitTableCells(line);
        const head=headCells.map(c=>`<th>${inline(c)}</th>`).join('');
        i=j+1;
        const rows=[];
        while(i<lines.length){
          if(!lines[i].trim()){ i++; continue; }
          if(!isTableLine(lines[i])) break;
          const cells=splitTableCells(lines[i]);
          rows.push('<tr>'+cells.map(c=>`<td>${inline(c)}</td>`).join('')+'</tr>');
          i++;
        }
        out.push(`<table><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
        continue;
      }
    }
    if(!line.trim()){out.push(''); i++; continue;}
    out.push(`<p>${inline(line)}</p>`); i++;
  }
  if(code.length){
    const src=code.join('\n');
    out.push(codeLang==='mermaid' ? renderMermaidLite(src) : `<pre><code>${esc(src)}</code></pre>`);
  }
  return `<div class="mdView">${out.join('\n')}</div>`;
}
function sanitizeHtml(s){
  return String(s||'')
    .replace(/<script\b[\s\S]*?<\/script>/gi,'')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi,'')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'')
    .replace(/\s(?:href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi,'')
    .replace(/javascript:/gi,'');
}
function blobUrl(f){const bin=atob(f.contentBase64||''); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return URL.createObjectURL(new Blob([arr],{type:f.type||'application/octet-stream'}));}
function downloadStoredFile(f){const a=document.createElement('a'); const url=f.contentBase64?blobUrl(f):URL.createObjectURL(new Blob([f.contentText||''],{type:f.type||'text/plain'})); a.href=url; a.download=f.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);}
let modalReturnFocus=null;
function openModal(title, body, foot){modalReturnFocus=document.activeElement; $('modalTitle').textContent=translateText(title); $('modalBody').innerHTML=translateText(body); $('modalFoot').innerHTML=translateText(foot); $('modalBackdrop').classList.add('open'); requestAnimationFrame(()=>$('modalBody').querySelector('input,textarea,select,button')?.focus());}
function closeModal(){const wasOpen=$('modalBackdrop').classList.contains('open'); $('modalBackdrop').classList.remove('open'); if(wasOpen&&modalReturnFocus?.focus) modalReturnFocus.focus(); modalReturnFocus=null;}
function handleModalKeydown(e){if(!$('modalBackdrop').classList.contains('open')) return; if(e.key==='Escape'){e.preventDefault(); closeModal(); return;} if(e.key!=='Tab') return; const focusable=[...$('modalBackdrop').querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null); if(!focusable.length){e.preventDefault(); return;} const first=focusable[0],last=focusable[focusable.length-1]; if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
function openChartModal(existing, preDs){if(!guardAdmin()) return; const base=existing || autoChartConfig(preDs||state.activeDataset); const ch=base; const body=chartFormHtml(ch); openModal(existing?'Редагувати графік':'Майстер графіка',body,`<button class="btn" id="cancelModal">Скасувати</button><button class="btn" id="autoPickBtn">Авто-вибір</button><button class="btn" id="saveChartTable">Графік + табличка</button><button class="btn primary" id="saveChart">Створити графік</button>`); bindChartForm(ch); updateChartPreview(); $('cancelModal').onclick=closeModal; $('autoPickBtn').onclick=()=>{const cfg=autoChartConfig($('chDs').value); $('chX').value=cfg.x; $('chY').value=cfg.y; $('chType').value=cfg.type; $('chTitle').value=cfg.title; updateChartPreview();}; $('saveChart').onclick=()=>saveChartFromModal(existing,false); $('saveChartTable').onclick=()=>saveChartFromModal(existing,true);}
function saveChartFromModal(existing,alsoTable){
  const val=readChartForm(existing?.id);
  if(!val) return;
  const ds=dataset(val.datasetId);
  inheritSourceMeta(val, ds);
  val._baseTitle=val.title;
  if(existing){Object.assign(existing,val); existing._baseTitle=val._baseTitle} else REPORT.charts.push(val);
  if(alsoTable){
    const cols=[val.x,val.y].filter(Boolean);
    const extra=columns(ds).map(c=>c.name).filter(c=>!cols.includes(c)).slice(0,4);
    const tb={id:uid('tb'),title:'Таблиця для '+val.title,datasetId:val.datasetId,columns:[...cols,...extra],top:20,sourceFileId:val.sourceFileId};
    inheritSourceMeta(tb, ds);
    tb._baseTitle=tb.title;
    REPORT.tables.push(tb);
  }
  closeModal(); refresh(); openDataset(val.datasetId,val.sourceFileId); toast(alsoTable?'Графік і табличку створено':'Графік створено');
}
function chartFormHtml(ch){const ds=dataset(ch.datasetId); const nums=numberCols(ds), texts=textCols(ds); return translateText(`<div class="hintBox"><b>Майстер графіка:</b> вибери таблицю, підпис (X) і число (Y). Якщо не знаєш що вибрати — натисни <b>Авто-вибір</b>.</div><div class="formGrid" style="margin-top:10px"><div class="field full"><label>Назва</label><input id="chTitle" value="${esc(ch.title)}"></div><div class="field full"><label>Таблиця-джерело</label><select id="chDs">${REPORT.datasets.map(d=>`<option value="${esc(d.id)}" ${d.id===ch.datasetId?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div><div class="field"><label>Підпис / X</label><select id="chX">${texts.map(c=>`<option value="${esc(c)}" ${c===ch.x?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="field"><label>Число / Y</label><select id="chY">${nums.map(c=>`<option value="${esc(c)}" ${c===ch.y?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="field"><label>Тип</label><select id="chType"><option value="bar" ${ch.type==='bar'?'selected':''}>Горизонтальні стовпчики</option><option value="column" ${ch.type==='column'?'selected':''}>Вертикальні стовпчики</option><option value="line" ${ch.type==='line'?'selected':''}>Лінія</option><option value="pie" ${ch.type==='pie'?'selected':''}>Коло</option></select></div><div class="field"><label>Показати Top N</label><input id="chTop" type="number" min="1" max="50" value="${esc(ch.top||10)}"></div><div class="field"><label>Агрегація</label><select id="chAgg"><option value="sum" ${ch.agg==='sum'?'selected':''}>Сума</option><option value="avg" ${ch.agg==='avg'?'selected':''}>Середнє</option><option value="count" ${ch.agg==='count'?'selected':''}>Кількість</option></select></div><div class="field"><label>Сортування</label><select id="chSort"><option value="desc" ${ch.sort==='desc'?'selected':''}>Від більшого</option><option value="asc" ${ch.sort==='asc'?'selected':''}>Від меншого</option><option value="none" ${ch.sort==='none'?'selected':''}>Як у таблиці</option></select></div><div class="field full"><label>Попередній перегляд</label><div class="wizardPreview" id="chartPreview"></div></div></div>`);}
function bindChartForm(ch){['chTitle','chX','chY','chType','chTop','chAgg','chSort'].forEach(id=>$(id)?.addEventListener('input',updateChartPreview)); $('chDs').addEventListener('change',()=>{const cfg=autoChartConfig($('chDs').value); $('modalBody').innerHTML=chartFormHtml({...cfg,id:ch.id}); bindChartForm(cfg); updateChartPreview();});}
function updateChartPreview(){const box=$('chartPreview'); if(!box) return; const val=readChartForm('preview',true); if(!val){box.innerHTML=translateText('<div class="empty">Вибери X і Y</div>'); return;} box.innerHTML=renderChart(val);}
function readChartForm(id,soft){const ds=dataset($('chDs').value); const y=$('chY')?.value; if(!soft && !y){toast('У таблиці немає числової колонки'); return null;} return {id:id||uid('ch'), title:$('chTitle').value.trim()||t('newChart'), type:$('chType').value, datasetId:$('chDs').value, x:$('chX').value, y:y, agg:$('chAgg').value, top:num($('chTop').value)||10, sort:$('chSort').value, sourceFileId:$('chFile')?.value || ds?.sourceFileId || ''};}
function openTableModal(existing, preDs){if(!guardAdmin()) return; const tb=existing || {id:uid('tb'), title:t('newTable'), datasetId:preDs||state.activeDataset, columns:[], top:20}; openModal(existing?'Редагувати табличку':'Створити табличку',tableFormHtml(tb, !existing),`<button class="btn" id="cancelModal">Скасувати</button><button class="btn primary" id="saveTable">Зберегти</button>`); bindTableForm(tb); $('cancelModal').onclick=closeModal; $('saveTable').onclick=()=>{const val=readTableForm(tb.id); if(!val.columns.length){toast('Вибери хоча б одну колонку');return;} const ds=dataset(val.datasetId); inheritSourceMeta(val, ds); val._baseTitle=val.title; if(existing){Object.assign(existing,val); existing._baseTitle=val._baseTitle;} else REPORT.tables.push(val); const makeChart=$('tbMakeChart')?.checked; closeModal(); refresh(); if(makeChart) quickChartFromTable(val); else toast(existing?'Табличку оновлено':'Табличку створено');};}
function tableFormHtml(tb, isNew){const ds=dataset(tb.datasetId); const cols=columns(ds).map(c=>c.name); const picked=tb.columns?.length?tb.columns:cols.slice(0,6); return translateText(`<div class="formGrid"><div class="field full"><div class="hintBox"><b>Табличка ≠ графік.</b> Табличка показує рядки. Щоб поруч зʼявився графік, залиш галочку "Також створити графік" або натисни 📊 на готовій табличці.</div></div><div class="field full"><label>Назва</label><input id="tbTitle" value="${esc(tb.title)}"></div><div class="field"><label>Таблиця-джерело</label><select id="tbDs">${REPORT.datasets.map(d=>`<option value="${esc(d.id)}" ${d.id===tb.datasetId?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div><div class="field"><label>Рядків показати</label><input id="tbTop" type="number" min="1" max="500" value="${esc(tb.top||20)}"></div><div class="field full"><label>Колонки</label><div class="columnTools"><button type="button" class="btn small" id="selectAllCols">Всі</button><button type="button" class="btn small" id="selectMainCols">Перші 6</button><button type="button" class="btn small" id="clearCols">Очистити</button><span class="pill">${cols.length} колонок</span></div><div class="checks">${cols.map(c=>`<label class="check"><input type="checkbox" value="${esc(c)}" ${picked.includes(c)?'checked':''}><span>${esc(c)}</span></label>`).join('')}</div></div><div class="field full"><label class="check" style="display:${isNew?'flex':'none'}"><input id="tbMakeChart" type="checkbox" checked><span>Також створити графік з цієї таблички</span></label></div></div>`);}
function bindTableForm(tb){$('tbDs').addEventListener('change',()=>{const tmp=readTableForm(tb.id,true); $('modalBody').innerHTML=tableFormHtml(tmp, !$('tbMakeChart') || $('tbMakeChart')?.checked); bindTableForm(tmp);}); $('selectAllCols')?.addEventListener('click',()=>document.querySelectorAll('.checks input').forEach(x=>x.checked=true)); $('selectMainCols')?.addEventListener('click',()=>document.querySelectorAll('.checks input').forEach((x,i)=>x.checked=i<6)); $('clearCols')?.addEventListener('click',()=>document.querySelectorAll('.checks input').forEach(x=>x.checked=false));}
function readTableForm(id,soft){return {id:id||uid('tb'), title:$('tbTitle').value.trim()||t('newTable'), datasetId:$('tbDs').value, columns:[...document.querySelectorAll('.checks input:checked')].map(x=>x.value), top:num($('tbTop').value)||20, sourceFileId:dataset($('tbDs').value)?.sourceFileId||''};}
function openCompetitorModal(){if(!guardAdmin()) return; const ds=dataset(state.activeDataset); if(!ds){toast('Спочатку додай таблицю');return;} const cols=columns(ds).map(c=>c.name); let body=`<div class="formGrid"><div class="field full"><div class="hintBox"><b>Новий конкурент = нова папка.</b> Після додавання справа зʼявиться папка конкурента, а всі вибрані файли можна додавати саме в неї.</div></div><div class="field"><label>Таблиця</label><select id="compDs">${REPORT.datasets.map(d=>`<option value="${esc(d.id)}" ${d.id===ds.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div><div class="field"><label>Назва компанії / папки</label><input id="compName" value="${esc(t('newCompetitor'))}"></div><div id="compFields" class="formGrid full"></div></div>`; openModal('Додати конкурента і папку',body,`<button class="btn" id="cancelModal">Скасувати</button><button class="btn primary" id="saveComp">Додати папку</button>`); function renderFields(){const d=dataset($('compDs').value); const skip=new Set([guessNameCol(d),'type']); $('compFields').innerHTML=columns(d).filter(c=>!skip.has(c.name)).slice(0,8).map(c=>`<div class="field"><label>${esc(c.name)}</label><input data-col="${esc(c.name)}" placeholder="${esc(t(c.type==='number'?'numberPlaceholder':'textPlaceholder'))}"></div>`).join('');}
  $('compDs').onchange=renderFields; renderFields(); $('cancelModal').onclick=closeModal; $('saveComp').onclick=()=>{const d=dataset($('compDs').value); const name=($('compName').value||t('newCompetitor')).trim(); const c=ensureCompany(name,'competitor'); const row={}; const nameCol=guessNameCol(d)||'brand'; row[nameCol]=name; row.type='competitor'; row._companyId=c.id; document.querySelectorAll('#compFields input').forEach(inp=>{const col=inp.dataset.col; const meta=columns(d).find(c=>c.name===col); row[col]=meta?.type==='number'?num(inp.value):inp.value;}); d.rows.push(row); d.columns=inferColumns(d.rows); state.activeCompany=c.id; state.compareB=c.id; closeModal(); state.activeDataset=d.id; refresh(); openCompany(c.id); toast('Конкурента і папку додано');};}
function openDataModal(){if(!guardAdmin()) return; openModal('Додати дані',`<div class="dataChoices"><button class="btn dataChoice" id="dataPasteChoice"><b>Вставити таблицю</b><span>CSV або TSV з Excel чи Google Sheets</span></button><button class="btn dataChoice" id="dataUploadChoice"><b>Завантажити файли</b><span>Excel, CSV, JSON, документи та зображення</span></button><button class="btn dataChoice" id="dataFolderChoice"><b>Підключити папку</b><span>Працювати з локальною структурою файлів</span></button></div>`,`<button class="btn" id="cancelModal">Скасувати</button>`); $('cancelModal').onclick=closeModal; $('dataPasteChoice').onclick=openPasteModal; $('dataUploadChoice').onclick=()=>{closeModal();$('fileInput').click();}; $('dataFolderChoice').onclick=()=>{closeModal();pickAndConnectFolder();};}
function inspectCsvInput(text){
  const clean=String(text||'').replace(/^\ufeff/,'').trim();
  if(!clean) return {ok:false,errors:['Вставте дані для імпорту.'],matrix:[],rows:[],columns:[]};
  let quoted=false;
  for(let i=0;i<clean.length;i++){if(clean[i]==='"'){if(quoted&&clean[i+1]==='"'){i++;continue;} quoted=!quoted;}}
  if(quoted) return {ok:false,errors:['Не закрито подвійні лапки в одному з рядків.'],matrix:[],rows:[],columns:[]};
  const first=clean.split(/\r?\n/,1)[0];
  const counts=[',',';','\t'].map(delimiter=>({delimiter,count:(first.split(delimiter).length-1)})).sort((a,b)=>b.count-a.count);
  const delimiter=counts[0].count?counts[0].delimiter:',';
  const matrix=parseCsv(clean,delimiter);
  const columns=(matrix[0]||[]).map(v=>String(v||'').trim());
  const errors=[];
  if(columns.length<2) errors.push('Потрібно щонайменше дві колонки.');
  if(columns.some(v=>!v)) errors.push('Усі колонки повинні мати назви.');
  const normalized=columns.map(v=>v.toLocaleLowerCase());
  if(new Set(normalized).size!==normalized.length) errors.push('Назви колонок не повинні повторюватися.');
  const badRows=matrix.slice(1).map((row,index)=>({row,index:index+2})).filter(x=>x.row.length!==columns.length);
  if(badRows.length) errors.push(`Рядки з іншою кількістю колонок: ${badRows.slice(0,5).map(x=>x.index).join(', ')}.`);
  const rows=errors.length?[]:rowsFromMatrix(matrix);
  if(!rows.length&&!errors.length) errors.push('Потрібен хоча б один рядок даних.');
  return {ok:errors.length===0,errors,matrix,rows,columns,delimiter};
}
function csvPreviewHtml(result){if(!result.matrix.length) return ''; const shown=result.matrix.slice(0,6); return `<div class="hintBox ${result.ok?'':'error'}">${result.ok?`${result.rows.length} рядків · ${result.columns.length} колонок`:`${result.errors.map(esc).join('<br>')}`}</div><div class="csvPreview"><table class="previewTable"><thead><tr>${shown[0].map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${shown.slice(1).map(row=>`<tr>${result.columns.map((_,i)=>`<td>${esc(row[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function openPasteModal(){if(!guardAdmin()) return; openModal('Вставити CSV / TSV',`<div class="formGrid"><div class="field full"><label>Назва таблиці</label><input id="pasteName" value="${esc(t('pastedData'))}"></div><div class="field full"><label>Дані з Excel або Google Sheets</label><textarea id="pasteText" placeholder="brand,traffic,ctr\nClient,1000,3.2\nCompetitor,2000,4.1"></textarea></div><div class="field full" id="pastePreview"><div class="hintBox">Вставте таблицю, щоб перевірити її перед імпортом.</div></div></div>`,`<button class="btn" id="cancelModal">Скасувати</button><button class="btn primary" id="savePaste" disabled>Створити таблицю</button>`); const update=()=>{const result=inspectCsvInput($('pasteText').value); $('pastePreview').innerHTML=csvPreviewHtml(result)||'<div class="hintBox">Вставте таблицю, щоб перевірити її перед імпортом.</div>'; $('savePaste').disabled=!result.ok; return result;}; $('pasteText').addEventListener('input',update); $('cancelModal').onclick=closeModal; $('savePaste').onclick=()=>{const result=update(); if(!result.ok) return; const text=$('pasteText').value; const name=($('pasteName').value||t('pastedData')).trim(); const fileId=uid('file'); REPORT.files.push({id:fileId,name:name+'.csv',path:'data/'+name+'.csv',folder:'Дані',ext:'csv',type:'text/csv',size:text.length,isData:true,contentText:text,createdAt:new Date().toISOString()}); const ds={id:uid('ds'),name,sourceFileId:fileId,createdAt:new Date().toISOString(),rows:result.rows,columns:inferColumns(result.rows)}; REPORT.datasets.push(ds); state.activeDataset=ds.id; closeModal(); refresh(); showImportSuccess(ds);};}
function showImportSuccess(ds){showNotice(`Таблицю "${ds.name}" імпортовано: ${ds.rows.length} рядків, ${columns(ds).length} колонок.`,'success'); openModal('Дані додано',`<div class="hintBox"><b>${esc(ds.name)}</b><br>${ds.rows.length} рядків · ${columns(ds).length} колонок</div>`,`<button class="btn" id="importDone">Готово</button><button class="btn" id="importOpen">Відкрити таблицю</button><button class="btn primary adminOnly" id="importReport">Створити авто-звіт</button>`); $('importDone').onclick=closeModal; $('importOpen').onclick=()=>{closeModal();openDataset(ds.id);}; $('importReport').onclick=()=>{closeModal();autoReport(ds.id);};}

function dataQuality(ds){const cols=columns(ds).map(c=>c.name); let missing=0; for(const r of (ds?.rows||[]).slice(0,500)){for(const c of cols){const v=r[c]; if(v===null||v===undefined||String(v).trim()==='') missing++;}} return {missing};}
function autoChartConfig(dsId){const ds=dataset(dsId); const x=guessX(ds); const y=guessY(ds); const type=(x&&/date|дата|month|місяць|time/i.test(x))?'line':'bar'; return {id:uid('ch'),title:y&&x?`${y} по ${x}`:t('newChart'),type,datasetId:ds?.id||state.activeDataset,x:x||'',y:y||'',agg:'sum',sort:type==='line'?'none':'desc',top:10,sourceFileId:ds?.sourceFileId||''};}
function guessX(ds){const cols=columns(ds); const names=cols.map(c=>c.name); return names.find(n=>/brand|name|competitor|компан|бренд|назва|client|клієнт/i.test(n)) || cols.find(c=>c.type!=='number')?.name || names[0] || '';}
function guessY(ds){const nums=numberCols(ds); const preferred=['roi','roas','ctr','traffic','conversions','seo','cpc']; return preferred.map(p=>nums.find(n=>n.toLowerCase()===p || n.toLowerCase().includes(p))).find(Boolean) || nums[0] || '';}
function autoReport(dsId){const ds=dataset(dsId); if(!ds){toast('Спочатку додай таблицю');return;} state.activeDataset=ds.id; const x=guessX(ds); const nums=numberCols(ds); if(!x||!nums.length){toast('Потрібна хоча б 1 текстова і 1 числова колонка');return;} const preferred=['roi','ctr','traffic','conversions','cpc','seo']; const picked=[]; for(const p of preferred){const n=nums.find(c=>c.toLowerCase()===p || c.toLowerCase().includes(p)); if(n&&!picked.includes(n)) picked.push(n);} nums.forEach(n=>{if(picked.length<4&&!picked.includes(n)) picked.push(n)}); let made=0; for(const y of picked.slice(0,4)){if(!REPORT.charts.some(c=>c.datasetId===ds.id&&c.x===x&&c.y===y)){const ch={id:uid('ch'),title:`${y} по ${x}`,type:/date|дата|month|місяць|time/i.test(x)?'line':'bar',datasetId:ds.id,x,y,agg:'sum',sort:'desc',top:10,sourceFileId:ds.sourceFileId||''}; inheritSourceMeta(ch, ds); ch._baseTitle=ch.title; REPORT.charts.push(ch); made++;}}
  const cols=[x,...picked.slice(0,5)].filter(Boolean); if(!REPORT.tables.some(t=>t.datasetId===ds.id&&((t._baseTitle||t.title)==='Авто-таблиця'))){const tb={id:uid('tb'),title:'Авто-таблиця',datasetId:ds.id,columns:cols,top:20,sourceFileId:ds.sourceFileId||''}; inheritSourceMeta(tb, ds); tb._baseTitle=tb.title; REPORT.tables.push(tb);}
  refresh(); openDataset(ds.id,ds.sourceFileId); toast(made?`Авто-звіт створено: ${made} графік(и)`:'Авто-звіт уже є');}
function saveDatasetEdits(dsId){const ds=dataset(dsId); const table=$('readerDataTable'); if(!ds||!table) return; const cols=[...table.querySelectorAll('thead th')].map(th=>th.textContent); table.querySelectorAll('tbody tr').forEach(tr=>{const idx=Number(tr.dataset.row); if(!ds.rows[idx]) return; tr.querySelectorAll('td').forEach((td,i)=>{const c=cols[i]; const raw=td.textContent.trim(); ds.rows[idx][c]=isNum(raw)?num(raw):raw;});}); ds.columns=inferColumns(ds.rows); refresh(); openDataset(ds.id,ds.sourceFileId,false); toast('Дані збережено, графіки оновлено');}

function quickChart(dsId){const ds=dataset(dsId); const ch=autoChartConfig(dsId); if(!ch.x||!ch.y){toast('Потрібна текстова і числова колонка'); return;} inheritSourceMeta(ch, ds); ch._baseTitle=ch.title; REPORT.charts.push(ch); refresh(); openDataset(ch.datasetId,ch.sourceFileId); toast('Швидкий графік створено');}
function quickChartFromTable(tb){const ds=dataset(tb.datasetId); if(!ds){toast('Таблицю-джерело не знайдено'); return;} const selected=(tb.columns&&tb.columns.length?tb.columns:columns(ds).map(c=>c.name)); const metas=columns(ds); const isNumber=c=>metas.find(m=>m.name===c)?.type==='number'; const y=selected.find(isNumber) || numberCols(ds)[0]; const x=selected.find(c=>!isNumber(c)) || textCols(ds)[0]; if(!x||!y){toast('Для графіка потрібна 1 текстова і 1 числова колонка'); return;} const ch={id:uid('ch'),title:`${y} по ${x}`,type:'bar',datasetId:ds.id,x,y,agg:'sum',top:10,sort:'desc',sourceFileId:tb.sourceFileId||ds.sourceFileId||''}; inheritSourceMeta(ch, ds); ch._baseTitle=ch.title; REPORT.charts.push(ch); refresh(); openDataset(ds.id,ch.sourceFileId); toast('Графік створено з таблички');}
async function handleFiles(fileList){if(!guardAdmin()) {toast('Редагування вимкнено'); return;} const files=[...fileList]; if(files.length>MAX_IMPORT_FILES){showNotice(`За один раз можна додати не більше ${MAX_IMPORT_FILES} файлів.`,'error');return;} const before=new Set((REPORT.datasets||[]).map(d=>d.id)); let count=0; for(const file of files){try{await addFile(file); count++;}catch(e){console.warn('[import] skipped:',file?.name,e?.message||e);showNotice(e?.message||`Не вдалося додати ${file?.name||'файл'}.`,'error');}} refresh(); const added=(REPORT.datasets||[]).filter(d=>!before.has(d.id)); if(added.length===1) showImportSuccess(added[0]); else if(added.length>1) showNotice(`Додано ${added.length} таблиць із ${count} файлів.`,'success'); else if(count) showNotice(`Додано файлів: ${count}.`,'success');}
async function addFile(file){assertSafeImportFile(file); const ext=(file.name.split('.').pop()||'').toLowerCase(); const id=uid('file'); const co=company(state.activeCompany); const companyId=co?.id||''; const companyPath=co?('companies/'+co.folder+'/'):'data/'; if(['csv','tsv'].includes(ext)){const text=await file.text(); const matrix=parseCsv(text, ext==='tsv'?'\t':undefined); const rows=rowsFromMatrix(matrix); const rec={id,name:file.name,path:companyPath+file.name,folder:co?.name||'Дані',companyId,ext,type:file.type||'text/csv',size:file.size,isData:true,contentText:text}; REPORT.files.push(rec); const ds={id:uid('ds'),name:file.name.replace(/\.[^.]+$/,''),sourceFileId:id,createdAt:new Date().toISOString(),rows,columns:inferColumns(rows)}; REPORT.datasets.push(ds); state.activeDataset=ds.id; toast(`Додано таблицю: ${file.name}`); return;}
  if(ext==='json'){const text=await file.text(); let rows=[]; let obj=null; try{obj=JSON.parse(text); if(obj && Array.isArray(obj.datasets)){REPORT=stripLegacyTrueSavageDemoPack(stripLegacyCaspianPack(normalizeReport(obj))); state.activeDataset=REPORT.datasets[0]?.id||null; state.openTabs=[]; initState(); toast('Проєкт JSON завантажено'); return;} rows=jsonRows(obj);}catch(e){toast('JSON не прочитався');} const rec={id,name:file.name,path:companyPath+file.name,folder:co?.name||'Дані',companyId,ext,type:file.type||'application/json',size:file.size,isData:rows.length>0,contentText:text}; REPORT.files.push(rec); if(rows.length){const ds={id:uid('ds'),name:file.name.replace(/\.[^.]+$/,''),sourceFileId:id,createdAt:new Date().toISOString(),rows,columns:inferColumns(rows)}; REPORT.datasets.push(ds); state.activeDataset=ds.id; toast(`Додано JSON-таблицю: ${file.name}`);} return;}
  if(ext==='xlsx'){const ab=await file.arrayBuffer(); const b64=abToBase64(ab); const rec={id,name:file.name,path:companyPath+file.name,folder:co?.name||'Дані',companyId,ext,type:file.type||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',size:file.size,isData:true,contentBase64:b64}; REPORT.files.push(rec); try{const sheets=await parseXlsx(ab); let added=0; for(const sh of sheets){if(sh.rows.length){REPORT.datasets.push({id:uid('ds'),name:file.name.replace(/\.[^.]+$/,'')+' / '+sh.name,sourceFileId:id,createdAt:new Date().toISOString(),rows:sh.rows,columns:inferColumns(sh.rows)}); added++;}} if(added){state.activeDataset=REPORT.datasets[REPORT.datasets.length-1].id; toast(`Excel прочитано: ${added} лист(ів)`);} else toast('Excel відкрито, але таблиць не знайдено');}catch(e){console.error(e); toast('Не вдалося прочитати .xlsx');} return;}
  if(ext==='md' && /YT_VIDEO_VISUALIZATION_/i.test(file.name)){
    const text=await file.text();
    const rec={id,name:file.name,path:companyPath+file.name,folder:co?.name||'Файли',companyId,ext,type:file.type||'text/markdown',size:file.size,isData:false,contentText:text};
    REPORT.files.push(rec);
    const parsed=parseVisualizationMarkdown(text,file.name, co?.name || inferAuthorHintFromPath(companyPath+file.name,''));
    if(parsed){
      const dsName=(co?.name||'YouTube')+' · Video Metrics';
      let ds=(REPORT.datasets||[]).find(d=>d.name===dsName);
      if(!ds){ds={id:uid('ds'),name:dsName,sourceFileId:id,createdAt:new Date().toISOString(),rows:[],columns:[]}; REPORT.datasets.push(ds);}
      const rowKey=r=>String(r.full_title||r.video_label||'').trim().toLowerCase();
      const byLabel=new Map((ds.rows||[]).map(r=>[rowKey(r),r]));
      byLabel.set(rowKey(parsed),parsed);
      ds.rows=[...byLabel.values()];
      ds.columns=inferColumns(ds.rows);
      ensureVideoMetricsWidgets(ds,id);
      state.activeDataset=ds.id;
      toast(`Visualization додано: ${file.name}`);
      return;
    }
  }
  if(ext==='md'){
    const text=await file.text();
    const rec={id,name:file.name,path:companyPath+file.name,folder:co?.name||'Файли',companyId,ext,type:file.type||'text/markdown',size:file.size,isData:false,contentText:text};
    REPORT.files.push(rec);
    const result=upsertMarkdownTablesFromText({
      text,
      fileName:file.name,
      path:rec.path,
      sourceFileId:id,
      sourceKind:'markdown-upload',
      rootName:co?.name||'Markdown'
    });
    if(result.datasetIds.length){
      state.activeDataset=result.datasetIds[0];
      toast(`Markdown: ${result.tableCount} таблиць, ${result.rowCount} рядків`);
    }else{
      toast(`Файл додано: ${file.name}`);
    }
    return;
  }
  const isText=['txt','md','html'].includes(ext); const rec={id,name:file.name,path:companyPath+file.name,folder:co?.name||'Файли',companyId,ext,type:file.type||'application/octet-stream',size:file.size,isData:false}; if(isText) rec.contentText=await file.text(); else rec.contentBase64=abToBase64(await file.arrayBuffer()); REPORT.files.push(rec); toast(`Файл додано: ${file.name}`);
}
function parseCsv(text,delimiter){text=String(text||'').replace(/^\ufeff/,''); if(!delimiter){const first=text.split(/\r?\n/)[0]||''; delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':','; if((first.match(/\t/g)||[]).length>0) delimiter='\t';}
  const rows=[]; let row=[],cell='',q=false; for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1]; if(q){if(c==='"'&&n==='"'){cell+='"';i++;} else if(c==='"') q=false; else cell+=c;} else {if(c==='"') q=true; else if(c===delimiter){row.push(cell);cell='';} else if(c==='\n'){row.push(cell); rows.push(row); row=[]; cell='';} else if(c==='\r'){} else cell+=c;}} row.push(cell); rows.push(row); return rows.filter(r=>r.some(c=>String(c).trim()!==''));}
function parseMarkdownTable(text){
  const lines=String(text||'').split(/\r?\n/);
  const out=[];
  for(let i=0;i<lines.length-1;i++){
    const h=lines[i].trim();
    const sep=lines[i+1].trim();
    if(!h.includes('|') || !/^\|?[\s:-]+\|/.test(sep)) continue;
    const headers=h.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
    if(!headers.length) continue;
    const rows=[];
    for(let j=i+2;j<lines.length;j++){
      const ln=lines[j].trim();
      if(!ln || !ln.includes('|')) break;
      const cols=ln.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
      if(cols.length<2) break;
      rows.push(cols);
    }
    if(rows.length) out.push({headers,rows,line:i,title:markdownTableTitle(lines,i,out.length+1)});
  }
  return out;
}
function markdownTableTitle(lines, lineIndex, fallbackIndex){
  const from=Math.max(0,(lineIndex||0)-5);
  for(let i=(lineIndex||0)-1;i>=from;i--){
    const raw=String(lines[i]||'').trim();
    if(!raw) continue;
    const head=raw.match(/^#{1,6}\s+(.+)$/);
    if(head) return cleanMarkdownCell(head[1]);
    if(!raw.includes('|') && raw.length<=90) return cleanMarkdownCell(raw.replace(/[:：]\s*$/,''));
  }
  return `Markdown таблиця ${fallbackIndex||1}`;
}
function cleanMarkdownCell(v){
  return String(v??'')
    .replace(/<br\s*\/?>/gi,' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
    .replace(/[*_`~]/g,'')
    .replace(/&nbsp;/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function rowsFromMarkdownTable(table, extra){
  const headers=uniqueHeaders((table?.headers||[]).map(h=>cleanMarkdownCell(h)||'column'));
  return (table?.rows||[])
    .filter(r=>(r||[]).some(c=>cleanMarkdownCell(c)!==''))
    .map((r,idx)=>{
      const obj={};
      headers.forEach((h,i)=>{
        const v=cleanMarkdownCell(r[i]??'');
        obj[h]=isNum(v)?num(v):v;
      });
      Object.assign(obj, extra||{});
      obj._rowIndex=idx+1;
      return obj;
    });
}
function bestMarkdownChartSpec(ds){
  const cols=columns(ds).map(c=>c.name);
  const nums=numberCols(ds);
  if(!nums.length || !cols.length) return null;
  const text=cols.filter(c=>!nums.includes(c));
  const x=text.find(c=>/date|дата|time|період|period|місяць|month|day|week|year|рік/i.test(c))
    || text.find(c=>/video|title|name|назва|категор|category|author|channel|компан|бренд|client|клієнт/i.test(c))
    || text[0]
    || cols.find(c=>c!==nums[0])
    || cols[0];
  const y=nums.find(c=>!/^(id|номер|row)$/i.test(c)) || nums[0];
  const type=/date|дата|time|період|period|місяць|month|day|week|year|рік/i.test(x||'')?'line':((ds.rows||[]).length<=8?'column':'bar');
  return x&&y?{x,y,type}:null;
}
function upsertMarkdownTablesFromText({text,fileName,path,sourceFileId='',sourceKind='markdown-upload',sourceRootId='',rootName=''}){
  const tables=parseMarkdownTable(text).filter(t=>t?.headers?.length && t?.rows?.length);
  const datasetIds=[], chartIds=[], tableIds=[];
  let rowCount=0;
  tables.forEach((table,idx)=>{
    const rel=String(path||fileName||'markdown.md').replace(/\\/g,'/').replace(/^\/+/,'');
    const key=sourceKind==='markdown-live' ? `${sourceRootId}|${rel}|${idx}` : `${sourceFileId||rel}|${idx}`;
    const dsId=stableId('md-ds',sourceKind,key);
    const rows=rowsFromMarkdownTable(table,{
      _sourceFile:fileName||path||'markdown.md',
      _sourcePath:rel,
      _sourceTableIndex:idx+1
    });
    if(!rows.length) return;
    const baseTitle=table.title || `Markdown таблиця ${idx+1}`;
    const sourceTitle=sourceKind==='markdown-live'
      ? `${rootName||'Папка'} / ${rel}`
      : String(fileName||path||'Markdown');
    const dsName=`${sourceTitle} · ${baseTitle}`;
    let ds=(REPORT.datasets||[]).find(d=>d.id===dsId);
    if(!ds){
      ds={id:dsId,name:dsName,sourceFileId,createdAt:new Date().toISOString(),rows:[],columns:[]};
      REPORT.datasets.push(ds);
    }
    ds.name=dsName;
    ds.sourceFileId=sourceKind==='markdown-live'?'':sourceFileId;
    ds.sourceKind=sourceKind;
    ds.sourceRootId=sourceRootId;
    ds.sourcePath=rel;
    ds.sourceTableIndex=idx;
    ds.generated=true;
    ds.rows=rows;
    ds.columns=inferColumns(rows);
    datasetIds.push(ds.id);
    rowCount+=rows.length;

    const visibleCols=columns(ds).map(c=>c.name);
    const tbId=stableId('md-tb',ds.id);
    let tb=(REPORT.tables||[]).find(t=>t.id===tbId);
    if(!tb){
      tb={id:tbId,title:`${baseTitle} · таблиця`,datasetId:ds.id,columns:[],top:50};
      REPORT.tables.push(tb);
    }
    Object.assign(tb,{
      title:`${baseTitle} · таблиця`,
      datasetId:ds.id,
      columns:visibleCols.slice(0,Math.min(8,visibleCols.length)),
      top:50,
      sourceFileId:ds.sourceFileId||'',
      sourceKind,
      sourceRootId,
      sourcePath:rel,
      sourceDatasetId:ds.id
    });
    tableIds.push(tb.id);

    const spec=bestMarkdownChartSpec(ds);
    if(spec){
      const chId=stableId('md-ch',ds.id,spec.x,spec.y);
      let ch=(REPORT.charts||[]).find(c=>c.id===chId);
      if(!ch){
        ch={id:chId,title:`${baseTitle} · ${spec.y}`,type:spec.type,datasetId:ds.id,x:spec.x,y:spec.y,agg:'sum',sort:spec.type==='line'?'none':'desc',top:12};
        REPORT.charts.push(ch);
      }
      Object.assign(ch,{
        title:`${baseTitle} · ${spec.y}`,
        type:spec.type,
        datasetId:ds.id,
        x:spec.x,
        y:spec.y,
        agg:'sum',
        sort:spec.type==='line'?'none':'desc',
        top:12,
        sourceFileId:ds.sourceFileId||'',
        sourceKind,
        sourceRootId,
        sourcePath:rel,
        sourceDatasetId:ds.id
      });
      chartIds.push(ch.id);
    }
  });
  return {tableCount:tables.length,rowCount,datasetIds,chartIds,tableIds};
}
function normalizeVizKey(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function parseRetentionSeriesMarkdown(text,fileName){
  const src=String(text||'');
  const fullTitle=String(fileName||'')
    .replace(/^analysis_youtube_retention_?/i,'')
    .replace(/^youtube_(video|longform)_retention\s*/i,'')
    .replace(/\.[^.]+$/,'')
    .replace(/[_]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()||String(fileName||'').trim();
  const all=[];
  const blocks=[...src.matchAll(/```mermaid([\s\S]*?)```/g)].map(m=>String(m[1]||''));
  for(const b of blocks){
    if(!/xychart-beta/i.test(b)) continue;
    const xMatch=b.match(/x-axis\s*\[([^\]]+)\]/i);
    const lMatch=b.match(/line\s*\[([^\]]+)\]/i);
    if(!xMatch || !lMatch) continue;
    const xs=xMatch[1].split(',').map(s=>String(s||'').replace(/['"]/g,'').trim()).filter(Boolean);
    const ys=lMatch[1].split(',').map(v=>num(v));
    if(!xs.length || !ys.length) continue;
    const size=Math.min(xs.length,ys.length);
    const isRetention=/retention|утримання/i.test(b);
    const metric=isRetention?'retention':'tempo';
    const videoLabel=fullTitle;
    for(let i=0;i<size;i++){
      const tLabel=xs[i];
      all.push({
        video_label:videoLabel,
        full_title:fullTitle,
        metric,
        t_label:tLabel,
        t_sec:parseTimeToSeconds(tLabel),
        value:num(ys[i])
      });
    }
  }
  return all.filter(r=>isNum(r.t_sec)&&isNum(r.value));
}
function inferAuthorHintFromPath(path, fallback){
  const knownAuthors=['CaspianReport','Johnny Harris','Paul Warburg','Ryan McBeth','Savage_Sage','trueSavageSage','Zeihan on Geopolitics'];
  const norm=s=>String(s||'').toLowerCase().replace(/[_\s\-]+/g,'').trim();
  const p=String(path||'').replace(/\\/g,'/').replace(/^\/+/, '').trim();
  const parts=p.split('/').filter(Boolean);
  for(const seg of parts){
    const hit=knownAuthors.find(a=>norm(a)===norm(seg));
    if(hit) return canonicalSiteName(hit);
  }
  const fallbackName=canonicalSiteName(String(fallback||'').trim());
  if(fallbackName) return fallbackName;
  if(parts.length>=2){
    if(String(parts[0]).toLowerCase()==='companies' && parts[1]) return canonicalSiteName(parts[1]);
    return canonicalSiteName(parts[0]);
  }
  return fallbackName;
}
function upsertFsTextFileRecord(root, relPath, file, text){
  const rel=String(relPath||file?.name||'').replace(/\\/g,'/').replace(/^\/+/, '');
  if(!rel) return null;
  const ext=extFromName(file?.name||rel)||'md';
  const topAuthor=inferAuthorHintFromPath(rel, root?.name||'');
  const recPath=`companies/${slugify(topAuthor||root?.name||'data')}/${rel}`;
  const existing=(REPORT.files||[]).find(f=>String(f.path||'')===recPath || String(f.name||'')===String(file?.name||''));
  if(existing){
    existing.ext=ext;
    existing.type=file?.type||mimeFromExt(ext);
    existing.size=Number(file?.size||0);
    existing.folder=topAuthor||existing.folder||'Файли';
    existing.contentText=String(text||'');
    return existing;
  }
  const rec={
    id:uid('file'),
    name:String(file?.name||pathName(rel)||'file.md'),
    path:recPath,
    folder:topAuthor||'Файли',
    companyId:'',
    ext,
    type:file?.type||mimeFromExt(ext),
    size:Number(file?.size||0),
    isData:false,
    contentText:String(text||'')
  };
  REPORT.files.push(rec);
  return rec;
}
function parseVisualizationMarkdown(text,fileName,authorHint){
  const tables=parseMarkdownTable(text);
  const target=tables.find(t=>{
    const hs=t.headers.map(normalizeVizKey);
    const hasVideo=hs.includes('video') || hs.includes('video_label');
    const hasViews=hs.includes('views') || hs.includes('view_count');
    return hasVideo && hasViews;
  }) || null;
  if(!target || !target.rows.length) return null;
  const idx={};
  target.headers.forEach((h,i)=>{idx[normalizeVizKey(h)]=i;});
  const pick=(...keys)=>{
    for(const k of keys){
      if(idx[k]!==undefined && idx[k]!==null) return idx[k];
    }
    return -1;
  };
  const first=target.rows[0];
  const videoLabel=first[pick('video','video_label')] || 'Video';
  const row={
    author:canonicalSiteName(String(authorHint||'').trim()),
    video_label:String(videoLabel).trim(),
    format_group:String(first[pick('format','format_group')]||'').trim(),
    views:num(first[pick('views')]),
    views_per_day:num(first[pick('views_day','views_per_day')]),
    likes:num(first[pick('likes')]),
    comments_count:num(first[pick('comments','comments_count')]),
    like_rate_percent:num(first[pick('like_rate','like_rate_percent')]),
    comment_rate_percent:num(first[pick('comment_rate','comment_rate_percent')]),
    er_public_percent:num(first[pick('er_public','er_public_','er_public_percent')]),
    views_per_1k_subs:num(first[pick('views_1k_subs','views_per_1k_subs')]),
    likes_per_1k_views:num(first[pick('likes_1k_views','likes_per_1k_views')]),
    comments_per_1k_views:num(first[pick('comments_1k_views','comments_per_1k_views')]),
    duration_min:num(first[pick('duration_min','duration')]),
    avg_view_duration:String(first[pick('avg_view_duration')]||'').trim(),
    watch_time_hours:num(first[pick('watch_time_hours')]),
    subscribers_gained:num(first[pick('subscribers_gained')]),
    hook_score:num(first[pick('hook','hook_score')]),
    cta_score:num(first[pick('cta','cta_score')]),
    audio_score:num(first[pick('audio','audio_score')]),
    comment_resonance_score:num(first[pick('comments_resonance','comment_resonance','comment_resonance_score')]),
    overall_video_score:num(first[pick('overall_score','overall','overall_video_score')]),
    emotional_tempo_index:num(first[pick('emotional_tempo_index','emotional_tempo_score')]),
    retention_proxy_percent:num(first[pick('retention_proxy_percent','retention_score','retention_percent')])
  };
  const tMatch=String(text||'').match(/\n\s*Video\s*\d+\s*\n\s*([^\n]+)/i);
  row.full_title=(tMatch?.[1]||String(fileName||'').replace(/^YT_VIDEO_VISUALIZATION_?/i,'').replace(/\.[^.]+$/,'')).trim();
  if(/^video\s*\d+$/i.test(String(row.video_label||'')) && row.full_title){
    row.video_label=row.full_title;
  }
  if(!row.video_label || !isNum(row.views)) return null;
  return enrichVideoMetricsRow(row);
}
function firstMetricNumber(raw){
  const s=String(raw||'').replace(/\s+/g,' ').trim();
  const m=s.match(/-?\d[\d\s.,]*/);
  return m ? num(m[0]) : 0;
}
function parseAnalysisMarkdown(text,fileName,authorHint){
  const tables=parseMarkdownTable(text);
  if(!tables.length){
    console.warn('[viz] parseAnalysisMarkdown: no tables', {fileName});
    return null;
  }
  const hNorm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
  const hasAny=(arr,subs)=>subs.some(x=>arr.some(h=>h.includes(x)));
  let snap=null, metrics=null;
  for(const t of tables){
    const hs=t.headers.map(h=>hNorm(h));
    if(hasAny(hs,['поле','field']) && hasAny(hs,['значення','value'])) snap=t;
    if(hasAny(hs,['метрика','metric']) && hasAny(hs,['значення','value'])) metrics=t;
  }
  if(!metrics || !metrics.rows.length){
    console.warn('[viz] parseAnalysisMarkdown: no metrics table', {fileName, tableCount:tables.length});
    return null;
  }
  const mapFromTable=(tbl)=>{
    const hs=tbl.headers.map(h=>hNorm(h));
    const kIdx=hs.findIndex(h=>h.includes('метрика')||h.includes('metric')||h.includes('поле')||h.includes('field'));
    const vIdx=hs.findIndex(h=>h.includes('значення')||h.includes('value'));
    const out={};
    if(kIdx<0||vIdx<0) return out;
    for(const r of tbl.rows){
      const k=normalizeVizKey(String(r[kIdx]||''));
      const v=String(r[vIdx]||'').trim();
      if(k) out[k]=v;
    }
    return out;
  };
  const snapMap=snap?mapFromTable(snap):{};
  const metMap=mapFromTable(metrics);
  const row={
    author:canonicalSiteName(String(authorHint||snapMap.channel||'').trim()),
    video_label:String(snapMap.title||'').trim() || String(fileName||'').replace(/^(YT_VIDEO_ANALYSIS_|ANALYSIS_YOUTUBE_RETENTION_?)/i,'').replace(/\.[^.]+$/,'').trim(),
    full_title:String(snapMap.title||'').trim() || String(fileName||'').replace(/^(YT_VIDEO_ANALYSIS_|ANALYSIS_YOUTUBE_RETENTION_?)/i,'').replace(/\.[^.]+$/,'').trim(),
    format_group:String(snapMap.format_group||snapMap.format||'').trim(),
    views:firstMetricNumber(metMap.views),
    views_per_day:firstMetricNumber(metMap.views_per_day),
    likes:firstMetricNumber(metMap.likes),
    comments_count:firstMetricNumber(metMap.comments),
    like_rate_percent:firstMetricNumber(metMap.like_rate),
    comment_rate_percent:firstMetricNumber(metMap.comment_rate),
    er_public_percent:firstMetricNumber(metMap.er_public),
    views_per_1k_subs:firstMetricNumber(metMap.views_per_1k_subs),
    likes_per_1k_views:firstMetricNumber(metMap.likes_per_1k_views),
    comments_per_1k_views:firstMetricNumber(metMap.comments_per_1k_views),
    watch_time_hours:firstMetricNumber(metMap.watch_time),
    subscribers_gained:firstMetricNumber(metMap.subscribers_gained)
  };
  if(!row.video_label || !isNum(row.views)){
    console.warn('[viz] parseAnalysisMarkdown: invalid row', {fileName, video_label:row.video_label, views:row.views});
    return null;
  }
  return enrichVideoMetricsRow(row);
}
function backfillMissingMetricsFromAnalysis(vizRow, anaRow){
  if(!vizRow || !anaRow) return vizRow;
  const keys=['views','likes','comments_count','like_rate_percent','comment_rate_percent','er_public_percent','views_per_1k_subs','likes_per_1k_views','comments_per_1k_views','views_per_day','watch_time_hours','subscribers_gained'];
  for(const k of keys){
    if((!isNum(vizRow[k]) || num(vizRow[k])<=0) && isNum(anaRow[k]) && num(anaRow[k])>0){
      vizRow[k]=num(anaRow[k]);
    }
  }
  if((!vizRow.full_title || /^video\s*\d+$/i.test(String(vizRow.full_title||''))) && anaRow.full_title){
    vizRow.full_title=anaRow.full_title;
  }
  return enrichVideoMetricsRow(vizRow);
}
function resolveVideoRowFromFiles(selectedVideo, selectedAuthor){
  const modeNorm=normText(selectedVideo||'');
  const authorNorm=normSiteKey(selectedAuthor||'');
  if(!modeNorm) return null;
  const candidates=[];
  for(const f of (REPORT.files||[])){
    const p=String(f.path||'');
    if(!/\.md$/i.test(p)) continue;
    if(!/(YT_VIDEO_(VISUALIZATION|ANALYSIS)_|ANALYSIS_YOUTUBE_RETENTION_)/i.test(p)) continue;
    const txt=String(f.contentText||'');
    if(!txt) continue;
    const hint=inferAuthorHintFromPath(p, f.folder||'');
    if(selectedAuthor && selectedAuthor!=='all'){
      const a=normSiteKey(hint||f.folder||'');
      if(a!==authorNorm) continue;
    }
    const parsed=/YT_VIDEO_VISUALIZATION_/i.test(p)
      ? parseVisualizationMarkdown(txt, f.name||'', hint)
      : parseAnalysisMarkdown(txt, f.name||'', hint);
    if(!parsed) continue;
    const nk=normText(parsed.video_label||'');
    const nt=normText(parsed.full_title||'');
    const ok=(nk===modeNorm||nt===modeNorm||nk.includes(modeNorm)||modeNorm.includes(nk)||nt.includes(modeNorm)||modeNorm.includes(nt));
    if(!ok) continue;
    candidates.push(parsed);
  }
  if(!candidates.length) return null;
  candidates.sort((a,b)=>{
    const qa=(num(a.likes)>0?1000:0)+(num(a.comments_count)>0?100:0)+(num(a.views)>0?10:0)+((num(a.like_rate_percent)>0||num(a.comment_rate_percent)>0||num(a.er_public_percent)>0)?1:0);
    const qb=(num(b.likes)>0?1000:0)+(num(b.comments_count)>0?100:0)+(num(b.views)>0?10:0)+((num(b.like_rate_percent)>0||num(b.comment_rate_percent)>0||num(b.er_public_percent)>0)?1:0);
    return qb-qa;
  });
  return candidates[0]||null;
}
function ensureVideoMetricsWidgets(ds, sourceFileId){
  (ds.rows||[]).forEach(enrichVideoMetricsRow);
  const chartDefs=[
    ['Перегляди по дослідження','views','bar'],
    ['Перегляди за день по дослідження','views_per_day','bar'],
    ['ER Public (%) по дослідження','er_public_percent','bar'],
    ['Рівень лайків (%) по дослідження','like_rate_percent','bar'],
    ['Рівень коментарів (%) по дослідження','comment_rate_percent','bar'],
    ['Лайки по дослідження','likes','bar'],
    ['Коментарі по дослідження','comments_count','bar'],
    ['Перегляди на 1k підписників','views_per_1k_subs','bar'],
    ['Оцінка хука по дослідження','hook_score','column'],
    ['Оцінка CTA по дослідження','cta_score','column'],
    ['Оцінка аудіо по дослідження','audio_score','column'],
    ['Резонанс коментарів по дослідження','comment_resonance_score','bar'],
    ['Загальна оцінка по дослідження','overall_video_score','bar'],
    ['Емоційний темп (індекс) по дослідження','emotional_tempo_index','bar'],
    ['Утримання аудиторії (proxy, %) по дослідження','retention_proxy_percent','bar']
  ];
  for(const [title,y,type] of chartDefs){
    let existing=REPORT.charts.find(c=>c.datasetId===ds.id&&(c._baseTitle===title || c.title===title || c.title===translateText(title)));
    if(!existing){
      existing={id:uid('ch'),title,type,datasetId:ds.id,x:'video_label',y,agg:'sum',sort:'desc',top:10,sourceFileId:sourceFileId||''};
      existing._baseTitle=title;
      REPORT.charts.push(existing);
    }
    if(ds.sourceKind){
      existing.sourceKind=ds.sourceKind;
      existing.sourceRootId=ds.sourceRootId||'';
      existing.sourceDatasetId=ds.id;
    }
  }
  const kpiBaseTitle='Підсумкова таблиця KPI';
  const scoreBaseTitle='Таблиця розкладу оцінок';
  let kpiTable=REPORT.tables.find(tb=>tb.datasetId===ds.id&&(tb._baseTitle===kpiBaseTitle || tb.title===kpiBaseTitle || tb.title==='KPI summary table'));
  if(!kpiTable){
    kpiTable={id:uid('tb'),title:kpiBaseTitle,datasetId:ds.id,columns:['video_label','format_group','views','views_per_day','er_public_percent','overall_video_score','full_title'],top:20,sourceFileId:sourceFileId||'',_baseTitle:kpiBaseTitle};
    REPORT.tables.push(kpiTable);
  }
  let scoreTable=REPORT.tables.find(tb=>tb.datasetId===ds.id&&(tb._baseTitle===scoreBaseTitle || tb.title===scoreBaseTitle || tb.title==='Score breakdown table'));
  if(!scoreTable){
    scoreTable={id:uid('tb'),title:scoreBaseTitle,datasetId:ds.id,columns:['video_label','hook_score','cta_score','audio_score','comment_resonance_score','overall_video_score'],top:20,sourceFileId:sourceFileId||'',_baseTitle:scoreBaseTitle};
    REPORT.tables.push(scoreTable);
  }
  for(const tb of [kpiTable, scoreTable]){
    if(ds.sourceKind){
      tb.sourceKind=ds.sourceKind;
      tb.sourceRootId=ds.sourceRootId||'';
      tb.sourceDatasetId=ds.id;
    }
  }
}
function removeDatasetAndWidgets(dsId){
  if(!dsId) return;
  REPORT.datasets=(REPORT.datasets||[]).filter(d=>d.id!==dsId);
  REPORT.charts=(REPORT.charts||[]).filter(ch=>ch.datasetId!==dsId && ch.sourceDatasetId!==dsId);
  REPORT.tables=(REPORT.tables||[]).filter(tb=>tb.datasetId!==dsId && tb.sourceDatasetId!==dsId);
  try{if(state?.activeDataset===dsId) state.activeDataset=REPORT.datasets[0]?.id||null;}catch(e){}
}
async function importVisualizationFromFsRoots(force){
  const now=Date.now();
  if(!force && now-state.lastVizFsSync<12000) return;
  state.lastVizFsSync=now;
  let imported=0;
  for(const root of (state.fsRoots||[])){
    const key=`viz_from_fs_root_${root.id}`;
    const dsName=`${root.name} · Video Metrics`;
    let ds=(REPORT.datasets||[]).find(d=>String(d.name||'')===dsName);
    if(!ds){
      ds={id:uid('ds'),name:dsName,sourceFileId:'',createdAt:new Date().toISOString(),rows:[],columns:[]};
      REPORT.datasets.push(ds);
    }
    ds.sourceKind='markdown-fs-video';
    ds.sourceRootId=root.id;
    ds.generated=true;
    ds.sourceFileId='';
    const rowKey=r=>String(r.full_title||r.video_label||'').trim().toLowerCase();
    const byLabel=new Map();
    const retName=`${root.name} · Video Retention Curves`;
    let retDs=(REPORT.datasets||[]).find(d=>String(d.name||'')===retName);
    if(!retDs){
      retDs={id:uid('ds'),name:retName,sourceFileId:'',createdAt:new Date().toISOString(),rows:[],columns:[]};
      REPORT.datasets.push(retDs);
    }
    retDs.sourceKind='markdown-fs-video';
    retDs.sourceRootId=root.id;
    retDs.generated=true;
    retDs.sourceFileId='';
    const retRows=[];
    const analysisRowsByLabel=new Map();
    const vizRowsByFolder=new Map();
    const analysisRowsByFolder=new Map();
    const folderKey=(p)=>String(p||'').replace(/\\/g,'/').split('/').slice(0,-1).join('/').toLowerCase();

    for(const [relPath, handle] of (root.index||new Map()).entries()){
      if(!/YT_VIDEO_VISUALIZATION_/i.test(relPath) || !/\.md$/i.test(relPath)) continue;
      try{
        const f=await handle.getFile();
        const txt=await f.text();
        const parsed=parseVisualizationMarkdown(txt,f.name, inferAuthorHintFromPath(relPath, root.name));
        if(!parsed) continue;
        parsed._sourceRelPath=String(relPath||'');
        parsed._sourceFolderName=pathName(pathDir(relPath));
        byLabel.set(rowKey(parsed), parsed);
        vizRowsByFolder.set(folderKey(relPath), parsed);
        imported++;
      }catch(e){
        console.warn('[viz] parseVisualizationMarkdown failed for', relPath, e?.message||e);
      }
    }
    for(const [relPath, handle] of (root.index||new Map()).entries()){
      if(!/(YT_VIDEO_ANALYSIS_|ANALYSIS_YOUTUBE_RETENTION_)/i.test(relPath) || !/\.md$/i.test(relPath)) continue;
      try{
        const f=await handle.getFile();
        const txt=await f.text();
        const parsed=parseAnalysisMarkdown(txt,f.name, inferAuthorHintFromPath(relPath, root.name));
        if(!parsed) continue;
        parsed._sourceRelPath=String(relPath||'');
        parsed._sourceFolderName=pathName(pathDir(relPath));
        analysisRowsByLabel.set(rowKey(parsed), parsed);
        analysisRowsByFolder.set(folderKey(relPath), parsed);
      }catch(e){
        console.warn('[viz] parseAnalysisMarkdown failed for', relPath, e?.message||e);
      }
    }

    for(const [folder, anaRow] of analysisRowsByFolder.entries()){
      const vizRow=vizRowsByFolder.get(folder);
      if(vizRow){
        const merged=backfillMissingMetricsFromAnalysis(vizRow, anaRow);
        byLabel.set(rowKey(merged), merged);
      }
    }

    for(const [k, anaRow] of analysisRowsByLabel.entries()){
      const existing=byLabel.get(k);
      if(existing){
        byLabel.set(k, backfillMissingMetricsFromAnalysis(existing, anaRow));
      }else{
        byLabel.set(k, anaRow);
      }
    }
    for(const [relPath, handle] of (root.index||new Map()).entries()){
      if(!/(analysis_)?youtube_(video|longform)?_?retention/i.test(relPath) || !/\.md$/i.test(relPath)) continue;
      try{
        const f=await handle.getFile();
        const txt=await f.text();
        retRows.push(...parseRetentionSeriesMarkdown(txt,f.name));
      }catch(e){
        console.warn('[viz] parseRetentionSeriesMarkdown failed for', relPath, e?.message||e);
      }
    }
    const metricRows=[...byLabel.values()];
    if(metricRows.length){
      ds.rows=metricRows;
      ds.columns=inferColumns(ds.rows);
      ensureVideoMetricsWidgets(ds, '');
      if(!state.activeDataset) state.activeDataset=ds.id;
    }else{
      removeDatasetAndWidgets(ds.id);
    }
    if(retRows.length){
      retDs.rows=retRows;
      retDs.columns=inferColumns(retDs.rows);
    }else{
      removeDatasetAndWidgets(retDs.id);
    }
    REPORT.meta[key]=true;
  }
  if(imported>0) toast(`Знайдено метрики: ${imported} файлів visualization`);
}
async function syncMarkdownTablesFromFsRoots(force=false, opts={}){
  if(!force && !state.fsRoots?.length) return {files:0,tables:0,changed:false};
  const liveDatasetIds=new Set();
  const liveTableIds=new Set();
  const liveChartIds=new Set();
  let files=0, tables=0, rows=0;
  for(const root of (state.fsRoots||[])){
    if(!root?.index || !(root.index instanceof Map)) continue;
    for(const [relPath, handle] of root.index.entries()){
      if(!/\.md$/i.test(relPath) || !handle || handle.kind!=='file') continue;
      try{
        const f=await handle.getFile();
        const text=await f.text();
        const result=upsertMarkdownTablesFromText({
          text,
          fileName:f.name,
          path:relPath,
          sourceKind:'markdown-live',
          sourceRootId:root.id,
          rootName:root.name
        });
        if(result.tableCount){
          files++;
          tables+=result.tableCount;
          rows+=result.rowCount;
          result.datasetIds.forEach(id=>liveDatasetIds.add(id));
          result.tableIds.forEach(id=>liveTableIds.add(id));
          result.chartIds.forEach(id=>liveChartIds.add(id));
        }
      }catch(e){
        console.warn('[markdown-live] failed for', relPath, e?.message||e);
      }
    }
  }
  const beforeDs=REPORT.datasets.length, beforeTb=REPORT.tables.length, beforeCh=REPORT.charts.length;
  const activeWasLive=REPORT.datasets.find(d=>d.id===state.activeDataset && isGenericLiveMarkdownArtifact(d));
  REPORT.datasets=REPORT.datasets.filter(d=>!isGenericLiveMarkdownArtifact(d) || liveDatasetIds.has(d.id));
  REPORT.tables=REPORT.tables.filter(tb=>!isGenericLiveMarkdownArtifact(tb) || liveTableIds.has(tb.id));
  REPORT.charts=REPORT.charts.filter(ch=>!isGenericLiveMarkdownArtifact(ch) || liveChartIds.has(ch.id));
  if(activeWasLive && !REPORT.datasets.some(d=>d.id===state.activeDataset)){
    state.activeDataset=[...liveDatasetIds][0] || REPORT.datasets[0]?.id || null;
    if(state.activeFile?.startsWith('ds:')) state.activeFile=null;
  }else if(!state.activeDataset && liveDatasetIds.size){
    state.activeDataset=[...liveDatasetIds][0];
  }
  const changed=Boolean(tables) || beforeDs!==REPORT.datasets.length || beforeTb!==REPORT.tables.length || beforeCh!==REPORT.charts.length;
  if(tables && !opts.silent) toast(`Markdown: ${tables} таблиць, ${rows} рядків`);
  return {files,tables,rows,changed};
}
async function syncFsDerivedData(force=false, opts={}){
  const liveRootIds=new Set((state.fsRoots||[]).map(r=>String(r.id||'')));
  if(liveRootIds.size){
    REPORT.datasets=(REPORT.datasets||[]).filter(d=>{
      const kind=String(d?.sourceKind||'');
      if(kind!=='markdown-fs-video') return true;
      return liveRootIds.has(String(d?.sourceRootId||''));
    });
    REPORT.charts=(REPORT.charts||[]).filter(ch=>{
      const kind=String(ch?.sourceKind||'');
      if(kind!=='markdown-fs-video') return true;
      return liveRootIds.has(String(ch?.sourceRootId||''));
    });
    REPORT.tables=(REPORT.tables||[]).filter(tb=>{
      const kind=String(tb?.sourceKind||'');
      if(kind!=='markdown-fs-video') return true;
      return liveRootIds.has(String(tb?.sourceRootId||''));
    });
  }
  const structured=await syncStructuredDataFromFsRoots(force, opts);
  await importVisualizationFromFsRoots(force);
  const markdown=await syncMarkdownTablesFromFsRoots(force, opts);
  return {
    files:(structured?.files||0)+(markdown?.files||0),
    datasets:structured?.datasets||0,
    tables:markdown?.tables||0,
    rows:markdown?.rows||0,
    changed:Boolean(structured?.changed || markdown?.changed)
  };
}
function normalizeFsPath(p){return String(p||'').replace(/\\/g,'/').replace(/^\/+/,'');}
function structuredFsDatasetsForFile(rootId, relPath){
  const rootKey=String(rootId||'');
  const relKey=normalizeFsPath(relPath);
  return (REPORT.datasets||[]).filter(d=>
    String(d?.sourceKind||'')==='structured-fs-data' &&
    String(d?.sourceRootId||'')===rootKey &&
    normalizeFsPath(d?.sourcePath||'')===relKey
  );
}
function inheritSourceMeta(target, source){
  if(!target) return target;
  target.sourceKind=String(source?.sourceKind||'');
  target.sourceRootId=source?.sourceRootId||'';
  target.sourcePath=source?.sourcePath||'';
  target.sourceSheetName=source?.sourceSheetName||'';
  target.sourceDatasetId=source?.id||'';
  return target;
}
async function structuredDatasetsFromFile(file, ext){
  assertSafeImportFile(file);
  const base=pathName(file?.name||'file').replace(new RegExp(`\\.${ext}$`,'i'),'');
  if(ext==='csv' || ext==='tsv'){
    const text=await file.text();
    const matrix=parseCsv(text, ext==='tsv' ? '\t' : undefined);
    const rows=rowsFromMatrix(matrix);
    return rows.length ? [{name:base, rows, sheetName:'', text}] : [];
  }
  if(ext==='json'){
    const text=await file.text();
    let obj=null;
    try{
      obj=JSON.parse(text);
    }catch(e){
      return [];
    }
    if(obj && Array.isArray(obj.datasets)){
      return [];
    }
    const rows=jsonRows(obj);
    return rows.length ? [{name:base, rows, sheetName:'', text}] : [];
  }
  if(ext==='xlsx'){
    const ab=await file.arrayBuffer();
    const sheets=await parseXlsx(ab);
    return sheets
      .filter(s=>Array.isArray(s.rows) && s.rows.length)
      .map(s=>({name:`${base} / ${s.name}`, rows:s.rows, sheetName:s.name, text:''}));
  }
  return [];
}
async function syncStructuredDataFromFsRoots(force=false, opts={}){
  if(!state.fsRoots?.length) return {files:0,datasets:0,changed:false};
  const liveDatasetIds=new Set();
  let files=0, datasets=0;
  for(const root of (state.fsRoots||[])){
    if(!root?.index || !(root.index instanceof Map)) continue;
    for(const [relPath, handle] of root.index.entries()){
      if(!handle || handle.kind!=='file') continue;
      const ext=extFromName(relPath);
      if(!['csv','tsv','json','xlsx'].includes(ext)) continue;
      try{
        const file=await handle.getFile();
        const relNorm=normalizeFsPath(relPath||file.name);
        const specs=await structuredDatasetsFromFile(file, ext);
        if(!specs.length) continue;
        files++;
        for(const spec of specs){
          const dsId=stableId('fs-ds', root.id, relNorm, spec.sheetName||'', ext);
          let ds=(REPORT.datasets||[]).find(d=>d.id===dsId);
          if(!ds){
            ds={id:dsId,name:spec.name,sourceFileId:'',createdAt:new Date().toISOString(),rows:[],columns:[]};
            REPORT.datasets.push(ds);
          }
          ds.name=spec.name;
          ds.rows=Array.isArray(spec.rows)?spec.rows:[];
          ds.columns=inferColumns(ds.rows);
          ds.sourceFileId='';
          ds.sourceKind='structured-fs-data';
          ds.sourceRootId=root.id;
          ds.sourcePath=relNorm;
          ds.sourceSheetName=spec.sheetName||'';
          ds.generated=true;
          liveDatasetIds.add(ds.id);
          datasets++;
        }
      }catch(e){
        console.warn('[fs-data] structured sync failed for', relPath, e?.message||e);
      }
    }
  }
  const staleIds=(REPORT.datasets||[])
    .filter(d=>String(d?.sourceKind||'')==='structured-fs-data' && !liveDatasetIds.has(String(d.id||'')))
    .map(d=>d.id);
  for(const id of staleIds) removeDatasetAndWidgets(id);
  if(!state.activeDataset || staleIds.includes(state.activeDataset)){
    state.activeDataset=REPORT.datasets[0]?.id||null;
  }
  const changed=Boolean(files || staleIds.length);
  if(files && !opts.silent) toast(`Табличні файли з папок: ${datasets} таблиць з ${files} файлів`);
  return {files,datasets,changed};
}
function rowsFromMatrix(matrix){if(!matrix.length) return []; const headers=uniqueHeaders(matrix[0].map(h=>String(h||'').trim()||'column')); return matrix.slice(1).filter(r=>r.some(c=>String(c??'').trim()!=='')).map(r=>{const obj={}; headers.forEach((h,i)=>{const v=r[i]??''; obj[h]=isNum(v)?num(v):v;}); return obj;});}
function uniqueHeaders(hs){const seen={}; return hs.map((h,i)=>{h=h||'column_'+(i+1); if(seen[h]){seen[h]++; return h+'_'+seen[h];} seen[h]=1; return h;});}
function jsonRows(obj){if(Array.isArray(obj)) return obj.filter(x=>x&&typeof x==='object'); if(Array.isArray(obj.rows)) return obj.rows; if(Array.isArray(obj.data)) return obj.data; if(Array.isArray(obj.entities)) return obj.entities; return [];}
async function parseXlsx(ab){
  if(typeof JSZip==='undefined') throw new Error('JSZip missing');
  if(Number(ab?.byteLength||0)>MAX_IMPORT_FILE_BYTES) throw new Error('XLSX-файл завеликий.');
  const zip=await JSZip.loadAsync(ab);
  assertSafeArchive(zip,'XLSX');
  const parser=new DOMParser();
  const parseXml=(text,label)=>{
    const doc=parser.parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror')) throw new Error(`Некоректний XML у ${label}.`);
    return doc;
  };
  const workbook=parseXml(await safeZipText(zip,'xl/workbook.xml'),'workbook.xml');
  const rels=parseXml(await safeZipText(zip,'xl/_rels/workbook.xml.rels'),'workbook.xml.rels');
  const relMap={};
  [...rels.getElementsByTagName('Relationship')].forEach(r=>{relMap[r.getAttribute('Id')]=r.getAttribute('Target')});
  const shared=[];
  const ss=await safeZipText(zip,'xl/sharedStrings.xml');
  if(ss){
    const doc=parseXml(ss,'sharedStrings.xml');
    for(const si of doc.getElementsByTagName('si')){
      shared.push([...si.getElementsByTagName('t')].map(t=>t.textContent).join(''));
      if(shared.length>MAX_SHEET_CELLS) throw new Error('XLSX містить забагато спільних значень.');
    }
  }

  const sheets=[];
  const sheetNodes=[...workbook.getElementsByTagName('sheet')];
  if(sheetNodes.length>200) throw new Error('XLSX містить забагато аркушів.');
  let totalCells=0;
  for(const s of sheetNodes){
    const name=s.getAttribute('name')||'Sheet';
    const rid=s.getAttribute('r:id')||s.getAttribute('id');
    let target=String(relMap[rid]||'').replace(/^\//,'');
    if(!target) continue;
    const path=(target.startsWith('xl/')?target:'xl/'+target).replace(/\\/g,'/');
    if(path.includes('../') || !path.startsWith('xl/')) throw new Error('XLSX містить небезпечний шлях до аркуша.');
    const sheetXml=await safeZipText(zip,path);
    if(!sheetXml) continue;
    const doc=parseXml(sheetXml,path);
    const rowNodes=[...doc.getElementsByTagName('row')];
    if(rowNodes.length>MAX_SHEET_ROWS) throw new Error(`Аркуш ${name} містить забагато рядків.`);
    const matrix=[];
    for(const rowEl of rowNodes){
      const arr=[];
      const cells=[...rowEl.getElementsByTagName('c')];
      totalCells+=cells.length;
      if(totalCells>MAX_SHEET_CELLS) throw new Error('XLSX містить забагато клітинок.');
      for(const c of cells){
        const ref=c.getAttribute('r')||'';
        const idx=colIndex(ref.replace(/\d/g,''));
        if(idx<0 || idx>=MAX_SHEET_COLUMNS) throw new Error(`Аркуш ${name} містить завеликий індекс колонки.`);
        arr[idx]=cellValue(c,shared);
      }
      matrix.push(arr.map(v=>v??''));
    }
    sheets.push({name,rows:rowsFromMatrix(matrix)});
  }
  return sheets;
}
function colIndex(letters){let n=0; letters=(letters||'A').toUpperCase(); for(let i=0;i<letters.length;i++) n=n*26+(letters.charCodeAt(i)-64); return n-1;}
function cellValue(c,shared){const t=c.getAttribute('t'); const v=c.getElementsByTagName('v')[0]?.textContent ?? ''; if(t==='s') return shared[Number(v)] ?? ''; if(t==='b') return v==='1'?'TRUE':'FALSE'; if(t==='inlineStr') return [...c.getElementsByTagName('t')].map(x=>x.textContent).join(''); return isNum(v)?num(v):v;}
function abToBase64(ab){let binary=''; const bytes=new Uint8Array(ab); const chunk=0x8000; for(let i=0;i<bytes.length;i+=chunk){binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));} return btoa(binary);}
function extFromName(name){return (String(name||'').split('.').pop()||'').toLowerCase();}
function mimeFromExt(ext){
  const map={txt:'text/plain',md:'text/markdown',html:'text/html',json:'application/json',csv:'text/csv',tsv:'text/tab-separated-values',xml:'application/xml',js:'application/javascript',css:'text/css',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',svg:'image/svg+xml',pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
  return map[String(ext||'').toLowerCase()]||'application/octet-stream';
}
function zipSafeSegment(s){return String(s||'').replace(/[<>:"|?*]/g,'_').replace(/^\.+$/,'_').trim()||'item';}
function pathDir(p){const i=String(p||'').lastIndexOf('/'); return i>0?String(p).slice(0,i):'';}
function pathName(p){const parts=String(p||'').split('/'); return parts[parts.length-1]||String(p||'');}
async function buildClientBundleFromFs(reportBase){
  const report=makeFsDerivedPortable(clone(reportBase||REPORT));
  const zipEntries=[];
  if(!Array.isArray(report.files)) report.files=[];
  const existingPaths=new Set((report.files||[]).map(f=>String(f.path||'')));

  for(const root of (state.fsRoots||[])){
    if(!root?.index || !(root.index instanceof Map)) continue;
    const rootName=zipSafeSegment(root.name||'folder');
    for(const [relPath, handle] of root.index.entries()){
      if(!handle || handle.kind!=='file') continue;
      try{
        const file=await handle.getFile();
        assertSafeImportFile(file);
        const ext=extFromName(file.name);
        const relNorm=String(relPath||file.name).replace(/\\/g,'/');
        const fullPath=`folders/${rootName}/${relNorm}`;
        const uniquePath=existingPaths.has(fullPath)?`folders/${rootName}/${Date.now()}-${Math.random().toString(36).slice(2,6)}-${pathName(relNorm)}`:fullPath;
        existingPaths.add(uniquePath);

        const ab=await file.arrayBuffer();
        const rec={
          id:uid('file'),
          name:file.name,
          path:uniquePath,
          folder:pathDir(uniquePath)||rootName,
          ext,
          type:file.type||mimeFromExt(ext),
          size:file.size||ab.byteLength||0,
          isData:false
        };
        if(['txt','md','html','json','csv','tsv','js','css','xml'].includes(ext)){
          rec.contentText=await file.text();
        }else{
          rec.contentBase64=abToBase64(ab);
        }
        report.files.push(rec);
        zipEntries.push({zipPath:uniquePath,bytes:ab});
      }catch(e){
        console.warn('[bundle] skipped file during buildClientBundleFromFs:', relPath, e?.message||e);
      }
    }
  }
  return {report, zipEntries};
}
function download(name,content,type){const a=document.createElement('a'); const blob=(content instanceof Blob)?content:new Blob([content],{type}); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function saveHtml(){
  if(!guardAdmin()) return;
  const titleBase=(REPORT.meta.title||'marketing-report-admin').replace(/[^a-z0-9а-яіїєґ_-]+/gi,'-');
  const oldAccess=state.access;
  const oldMetaAccess=REPORT.meta.accessMode;
  const oldData=$('reportData').textContent;
  const oldDataset=state.activeDataset;

  try{
    toast('Готую архів для адміна...');
    const {report:packedReport, zipEntries}=await buildClientBundleFromFs(exportReportSnapshot());
    packedReport.meta=packedReport.meta||{};
    packedReport.meta.accessMode='admin';
    delete packedReport.meta.clientLocked;
    packedReport.meta.activeDataset=oldDataset||packedReport.meta.activeDataset||packedReport.datasets?.[0]?.id||null;

    state.access='admin';
    REPORT.meta.accessMode='admin';
    app.dataset.access='admin';
    $('reportData').textContent=serializeReportData(packedReport);
    const html='<!doctype html>\n'+document.documentElement.outerHTML;

    if(typeof JSZip==='undefined'){
      download(`${titleBase}-admin.html`,html,'text/html;charset=utf-8');
      toast('JSZip недоступний: збережено лише HTML');
      return;
    }

    const zip=new JSZip();
    zip.file(`${titleBase}-admin.html`, html);
    zip.file('project.json', JSON.stringify(packedReport,null,2));
    for(const z of zipEntries){
      zip.file(z.zipPath, z.bytes);
    }
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    download(`${titleBase}-admin-bundle.zip`, blob, 'application/zip');
    toast(`Готово: архів адміна створено (${zipEntries.length} файлів)`);
  }catch(e){
    console.error(e);
    toast('Не вдалося зібрати адмінський архів');
  }finally{
    state.access=oldAccess;
    REPORT.meta.accessMode=oldMetaAccess;
    app.dataset.access=oldAccess;
    $('reportData').textContent=oldData;
    persistNow();
    refresh();
  }
}
function saveProjectHtmlOnly(){
  if(!guardAdmin()) return;
  const oldAccess=state.access;
  const oldMetaAccess=REPORT.meta.accessMode;
  const oldData=$('reportData').textContent;
  try{
    REPORT.meta=REPORT.meta||{};
    REPORT.meta.accessMode='admin';
    REPORT.meta.activeDataset=state.activeDataset||REPORT.meta.activeDataset||REPORT.datasets?.[0]?.id||null;
    state.access='admin';
    app.dataset.access='admin';
    const snapshot=exportReportSnapshot();
    snapshot.meta=snapshot.meta||{};
    snapshot.meta.accessMode='admin';
    delete snapshot.meta.clientLocked;
    snapshot.meta.activeDataset=state.activeDataset&&snapshot.datasets?.some(d=>d.id===state.activeDataset)?state.activeDataset:snapshot.datasets?.[0]?.id||null;
    $('reportData').textContent=serializeReportData(snapshot);
    const html='<!doctype html>\n'+document.documentElement.outerHTML;
    const base=(REPORT.meta.title||'marketing_report_studio_v8_access_folders_fixed').replace(/[^a-z0-9а-яіїєґ_-]+/gi,'-');
    download(`${base}.html`, html, 'text/html;charset=utf-8');
    toast('Збережено HTML-файл проєкту');
  }catch(e){
    console.error(e);
    toast('Не вдалося зберегти HTML-файл');
  }finally{
    state.access=oldAccess;
    REPORT.meta.accessMode=oldMetaAccess;
    app.dataset.access=oldAccess;
    $('reportData').textContent=oldData;
    persistNow();
    refresh();
  }
}
async function saveClientHtml(){
  if(!guardAdmin()) return;
  const titleBase=(REPORT.meta.title||'marketing-report-client').replace(/[^a-z0-9а-яіїєґ_-]+/gi,'-');
  const oldAccess=state.access;
  const oldMetaAccess=REPORT.meta.accessMode;
  const oldData=$('reportData').textContent;
  const oldDataset=state.activeDataset;

  try{
    toast('Готую архів для клієнта...');
    const {report:packedReport, zipEntries}=await buildClientBundleFromFs(exportReportSnapshot());
    packedReport.meta=packedReport.meta||{};
    packedReport.meta.accessMode='viewer';
    packedReport.meta.clientLocked=true;
    packedReport.meta.clientExportedAt=new Date().toISOString();
    packedReport.meta.activeDataset=oldDataset||packedReport.meta.activeDataset||packedReport.datasets?.[0]?.id||null;

    state.access='viewer';
    REPORT.meta.accessMode='viewer';
    app.dataset.access='viewer';
    $('reportData').textContent=serializeReportData(packedReport);
    const html='<!doctype html>\n'+document.documentElement.outerHTML;

    if(typeof JSZip==='undefined'){
      download(`${titleBase}-client.html`,html,'text/html;charset=utf-8');
      toast('JSZip недоступний: збережено лише HTML');
      return;
    }

    const zip=new JSZip();
    zip.file(`${titleBase}-client.html`, html);
    zip.file('project.json', JSON.stringify(packedReport,null,2));
    for(const z of zipEntries){
      zip.file(z.zipPath, z.bytes);
    }
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    download(`${titleBase}-client-bundle.zip`, blob, 'application/zip');
    toast(`Готово: архів створено (${zipEntries.length} файлів)`);
  }catch(e){
    console.error(e);
    toast('Не вдалося зібрати клієнтський архів');
  }finally{
    state.access=oldAccess;
    REPORT.meta.accessMode=oldMetaAccess;
    app.dataset.access=oldAccess;
    $('reportData').textContent=oldData;
    persistNow();
    refresh();
  }
}
function exportJson(){if(!guardAdmin()) return; const snapshot=persistedReportSnapshot(); download('ci-os-unified-data.json',JSON.stringify(snapshot.ci,null,2),'application/json;charset=utf-8')}
function setupResizers(){const layout=$('layout'); let drag=null; $('splitX').addEventListener('pointerdown',e=>{drag='x'; e.preventDefault();}); $('splitY').addEventListener('pointerdown',e=>{drag='y'; e.preventDefault();}); window.addEventListener('pointermove',e=>{if(!drag) return; const r=layout.getBoundingClientRect(); if(drag==='x'){const side=Math.min(520,Math.max(220,r.right-e.clientX-10)); document.documentElement.style.setProperty('--side',side+'px');} else {const top=Math.min(90,Math.max(15,((e.clientY-r.top)/r.height)*100)); document.documentElement.style.setProperty('--top',top+'%');}}); window.addEventListener('pointerup',()=>drag=null);}
async function openMembersModal(){
  if(cloudSync.role!=='owner'){toast('Керування користувачами доступне лише власнику');return;}
  openModal('Користувачі спільного звіту','<div class="empty">Завантаження…</div>','<button class="btn" id="cancelModal">Закрити</button><button class="btn primary" id="saveMember">Додати / оновити</button>');
  $('cancelModal').onclick=closeModal;
  try{
    const payload=await cloudApi('/api/members');
    const rows=(payload.members||[]).map(m=>`<tr><td>${esc(m.email)}</td><td>${esc(m.displayName||'')}</td><td><span class="pill">${esc(m.role)}</span></td></tr>`).join('');
    $('modalBody').innerHTML=`<div class="formGrid"><div class="field"><label>Email</label><input id="memberEmail" type="email" placeholder="user@example.com"></div><div class="field"><label>Роль</label><select id="memberRole"><option value="editor">editor</option><option value="viewer">viewer</option><option value="owner">owner</option></select></div><div class="field full"><div class="hintBox">Користувач також має бути дозволений у політиці Cloudflare Access. Роль тут визначає права всередині робочого простору.</div></div><div class="field full"><div style="overflow:auto"><table class="previewTable"><thead><tr><th>Email</th><th>Ім'я</th><th>Роль</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Немає користувачів</td></tr>'}</tbody></table></div></div></div>`;
    $('saveMember').onclick=async()=>{
      const email=String($('memberEmail')?.value||'').trim();
      const role=$('memberRole')?.value||'editor';
      if(!email){toast('Вкажіть email користувача');return;}
      $('saveMember').disabled=true;
      try{
        await cloudApi('/api/members',{method:'POST',body:JSON.stringify({email,role})});
        toast('Доступ користувача оновлено');
        closeModal();
        openMembersModal();
      }catch(e){toast(e.message||'Не вдалося оновити користувача');$('saveMember').disabled=false;}
    };
  }catch(e){
    $('modalBody').innerHTML=`<div class="empty">${esc(e.message||'Не вдалося завантажити користувачів')}</div>`;
    $('saveMember').disabled=true;
  }
}
function toggleEditMode(){
  if(isClientLocked()){toast('Клієнтська версія зафіксована й не має режиму редагування.');return;}
  if(HOSTED_MODE&&!BROWSER_ONLY_MODE&&cloudSync.ready&&!cloudCanWrite()){toast('Ваша роль у робочому просторі дозволяє лише перегляд.');return;}
  if(HOSTED_MODE&&!BROWSER_ONLY_MODE&&!cloudSync.ready){toast('Редагування стане доступним після підключення до спільного сховища.');return;}
  state.access=state.access==='viewer'?'admin':'viewer';
  REPORT.meta.accessMode=state.access;
  refresh();
  toast(state.access==='admin'?'Режим редагування':'Режим перегляду');
}
function bind(){
  $('pasteBtn').onclick=()=>openDataModal(); $('uploadFilesBtn').onclick=()=>$('fileInput').click(); $('connectFolderBtn').onclick=()=>pickAndConnectFolder(); $('saveDiskBtn').onclick=()=>{toast('Зберігаю HTML-файл на диск...'); saveProjectHtmlOnly();}; $('saveHtmlBtn').onclick=saveHtml; $('saveClientHtmlBtn').onclick=saveClientHtml; $('exportJsonBtn').onclick=exportJson; $('membersBtn').onclick=openMembersModal; $('clearReaderBtn').onclick=()=>{state.openTabs=[]; state.activeFile=null; reader.innerHTML=`<div class="empty">${t('emptyReader')}</div>`; renderReaderTabs(); renderSide();}; $('unlockAdminBtn').onclick=toggleEditMode; $('cloudStatus').onclick=()=>{if(BROWSER_ONLY_MODE){toast('Файли й дані залишаються лише у цьому браузері.');return;} if(cloudSync.conflict){toast('Збережіть свою копію локально, потім перезавантажте сторінку.');return;} if(cloudSync.ready&&cloudSync.dirty){saveReportToCloud();return;} if(cloudSync.ready) reloadCloudReport(); else if(HOSTED_MODE) initCloudSync();}; $('langBtn').onclick=()=>setLanguage(state.lang==='uk'?'en':'uk'); $('themeBtn').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark'; app.dataset.theme=state.theme}; $('modalClose').onclick=closeModal; $('appNoticeClose').onclick=hideNotice; $('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();}); document.addEventListener('keydown',handleModalKeydown); $('fileInput').addEventListener('change',e=>{handleFiles(e.target.files); e.target.value='';}); search.addEventListener('input',renderSide); sideList.addEventListener('click', onSideListClick);
  $('companyNameInput')?.addEventListener('input',e=>{REPORT.meta=REPORT.meta||{}; REPORT.meta.companyName=String(e.target.value||'').trim(); renderReportTitle(); schedulePersist();});
  renderReportTitle();
  analytics.addEventListener('click',e=>{
    if(e.target.closest('[data-open-add]')){openDataModal();return;}
    const b=e.target.closest('[data-open-widget]');
    if(!b) return;
    openSimpleWidgetView(b.dataset.openWidget);
  });
  const dz=$('dropZone'); ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{if(!isAdmin()) return; e.preventDefault(); dz.classList.add('drag')})); ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{if(!isAdmin()) return; e.preventDefault(); dz.classList.remove('drag')})); dz.addEventListener('drop',e=>{if(isAdmin()) handleFiles(e.dataTransfer.files)}); window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault(); saveHtml();} if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault(); search.focus();}}); window.addEventListener('beforeunload', persistNow); setupResizers(); tryAutoReconnectFs();
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.mdMermaidShift');
    if(!btn) return;
    const wrap=btn.closest('.mdMermaidWrap');
    const box=wrap?.querySelector('.mdMermaid');
    if(!box) return;
    box.scrollBy({left:420,behavior:'smooth'});
  });
  setTimeout(()=>{
    const hasConnectedRoots = Array.isArray(state.fsRoots) && state.fsRoots.length>0;
    if(hasConnectedRoots) return;
    if(state.__bootVizImportDone) return;
    state.__bootVizImportDone = true;
    syncFsDerivedData(true, {silent:true}).then(()=>refresh()).catch(()=>{});
  }, 500);
}
bind(); refresh();
reader.innerHTML=`<div class="empty">${t('emptyReader')}</div>`;
state.openTabs=[];
state.activeFile=null;
renderReaderTabs();
initCloudSync();
})();
