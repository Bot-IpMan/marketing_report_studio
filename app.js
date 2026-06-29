(function(){
'use strict';
const DEFAULT = {
  meta:{title:'Ринкова конкурентна розвідка', companyName:'', updatedAt:new Date().toISOString(), lang:'uk'},
  datasets:[],
  companies:[],
  files:[],
  charts:[],
  tables:[],
  competitorProfiles:{items:[], updatedAt:null},
  pricingFeatureMatrix:null,
  materialsInventory:{items:[], updatedAt:null},
  sourceRegistry:{items:[], updatedAt:null},
  evidenceCards:{items:[], updatedAt:null},
  aiAssistance:{aiEnabled:false, aiMode:'disabled', taskDrafts:[], suggestions:[], updatedAt:null},
  aiReviewQueue:{items:[], updatedAt:null},
  aiAuditLog:{events:[], provenance:[], updatedAt:null},
  versionRetentionPolicy:null,
  versionRetentionState:{pinnedVersionIds:[], archivedVersionIds:[], cleanupCandidateVersionIds:[], updatedAt:null},
  governanceSettings:null,
  onboardingState:null,
  firstReportFlow:null,
  ci:null
};
const CI_SCHEMA_VERSION = 'ci_os_unified_v1';
const CI_LINEAGE_RULE = 'Recommendation -> Insight -> Fact -> Source';
const REPORT_SCHEMA_VERSION = 2;
const REPORT_SECTION_STATUS = ['empty','draft','needs_review','approved'];
const MATERIAL_STATUS = ['available','needs_review','linked','ignored'];
const MATERIAL_TYPES = ['spreadsheet','csv','json','pdf','docx','markdown','html','image','text','unknown'];
const SOURCE_TYPES = ['spreadsheet','document','webpage','image','dataset','note','unknown'];
const SOURCE_TEXT_STATUS = ['not_applicable','pending','available','failed'];
const SOURCE_EVIDENCE_STATUS = ['unused','candidate','used','ignored'];
const SOURCE_CREDIBILITY_STATUS = ['unreviewed','trusted','needs_review','weak'];
const COMPETITOR_PROFILE_STATUS = ['active','archived','ignored'];
const COMPETITOR_PRIORITY = ['low','medium','high'];
const COMPETITOR_REVIEW_STATUS = ['draft','needs_review','approved'];
const PRICE_PERIODS = ['monthly','yearly','one_time','usage_based','custom','unknown'];
const PUBLIC_PRICING_STATUS = ['yes','no','partial','unknown'];
const FEATURE_CATEGORIES = ['core_product','pricing','integrations','analytics','automation','reporting','collaboration','security','support','marketing','content','seo','advertising','other'];
const MATRIX_AVAILABILITY_STATUS = ['yes','no','partial','unknown','not_applicable'];
const EVIDENCE_TYPES = ['fact','metric','quote','observation','comparison','risk','opportunity','recommendation_input'];
const EVIDENCE_REVIEW_STATUS = ['draft','needs_review','approved','rejected'];
const EVIDENCE_CONFIDENCE_STATUS = ['unknown','low','medium','high'];
const EVIDENCE_CREDIBILITY_STATUS = ['unreviewed','trusted','needs_review','weak'];
const DRAFT_BLOCK_TYPES = ['paragraph','bullet_list','metric','comparison_note','risk_note','opportunity_note','recommendation_note'];
const DRAFT_BLOCK_STATUS = ['draft','needs_review','approved'];
const ENABLE_AI_ASSISTANCE = false;
const AI_TASK_TYPES = ['extract_evidence_candidates','summarize_approved_evidence','suggest_report_sections','suggest_recommendations','improve_executive_summary','check_source_coverage'];
const AI_SUGGESTION_STATUS = ['draft','ready_for_review','accepted','rejected'];
const AI_REVIEW_SUGGESTION_TYPES = ['evidence_candidate','recommendation','executive_summary','source_coverage_gap','section_draft','unknown'];
const AI_REVIEW_STATUSES = ['draft','ready_for_review','accepted','rejected','converted'];
const AI_REVIEW_GENERATORS = ['ai_preview','ai_dry_run','rule_based','unknown'];
const AI_AUDIT_EVENT_TYPES = ['ai_preview_requested','ai_preview_completed','ai_preview_failed','suggestion_created','suggestion_sent_to_queue','suggestion_edited','suggestion_accepted','suggestion_rejected','suggestion_converted','evidence_card_created_from_suggestion','draft_block_created_from_suggestion','checklist_item_created_from_suggestion','export_excluded_ai_draft','export_included_reviewed_output','report_version_restored','version_retention_previewed','version_pinned','version_unpinned','version_archived','version_cleanup_previewed','version_cleanup_rejected_protected','version_cleanup_policy_updated','governance_settings_viewed','governance_settings_updated','governance_settings_reset_to_defaults','governance_policy_validation_failed','workspace_onboarding_started','workspace_onboarding_step_completed','workspace_onboarding_completed','workspace_onboarding_dismissed','workspace_onboarding_reset','workspace_onboarding_applied_settings','unknown'];
const VERSION_CLEANUP_ENABLED = false;
const VERSION_RETENTION_MODES = ['disabled','preview_only','archive_only','delete_allowed'];
const ONBOARDING_VERSION = 1;
const ONBOARDING_STEPS = ['welcome','workspaceBasics','rolesAndAccess','exportSafety','aiPolicy','reviewPolicy','versionRetention','restorePolicy','demoReport','finalChecklist'];
const FIRST_REPORT_FLOW_VERSION = 1;
const FIRST_REPORT_STEPS = ['createReport','addClientBasics','addCompetitors','uploadMaterials','reviewMaterialsInventory','buildSourceRegistry','addEvidence','reviewEvidence','buildDraft','runQualityChecklist','exportClientReport'];
const AI_PROVIDER_MODES = ['disabled','dry_run','real_provider','unknown'];
const AI_INPUT_REF_TYPES = ['section','source','evidence_card','material','draft_block','recommendation','checklist_item','unknown'];
const AI_OUTPUT_REF_TYPES = ['ai_suggestion','evidence_card','draft_block','checklist_item','source_coverage_gap','unknown'];
const AI_DRY_RUN_AVAILABLE = true;
const AI_TASK_DEFINITIONS = {
  extract_evidence_candidates:{label:'Extract evidence candidates',disabled:true,inputRefs:['materialsInventory','sourceRegistry'],output:'candidateEvidenceCards'},
  summarize_approved_evidence:{label:'Summarize approved evidence',disabled:true,inputRefs:['evidenceCards','sourceRegistry'],output:'executiveSummarySuggestion'},
  suggest_report_sections:{label:'Suggest report sections',disabled:true,inputRefs:['reportSections','evidenceCards'],output:'sectionDraftSuggestions'},
  suggest_recommendations:{label:'Suggest recommendations',disabled:true,inputRefs:['approvedEvidence','sourceRegistry'],output:'recommendationSuggestions'},
  improve_executive_summary:{label:'Improve executive summary',disabled:true,inputRefs:['executiveSummary','approvedEvidence'],output:'executiveSummarySuggestion'},
  check_source_coverage:{label:'Check source coverage',disabled:true,inputRefs:['sourceRegistry','evidenceCards'],output:'sourceCoverageSuggestions'}
};
const AI_OUTPUT_CONTRACTS = {
  candidateEvidenceCards:{type:'object',required:['candidates'],properties:{candidates:{type:'array',items:{required:['claim','sourceIds','sectionId','evidenceType'],enums:{evidenceType:EVIDENCE_TYPES,reviewStatus:['draft','needs_review']}}}}},
  sectionDraftSuggestions:{type:'object',required:['sections'],properties:{sections:{type:'array',items:{required:['sectionId','blocks'],enums:{blockType:DRAFT_BLOCK_TYPES,status:['draft','needs_review']}}}}},
  recommendationSuggestions:{type:'object',required:['recommendations'],properties:{recommendations:{type:'array',items:{required:['text','evidenceCardIds','sourceIds'],enums:{status:['draft','needs_review']}}}}},
  executiveSummarySuggestion:{type:'object',required:['summary'],properties:{summary:{type:'string'},evidenceCardIds:{type:'array'},sourceIds:{type:'array'}}},
  sourceCoverageSuggestions:{type:'object',required:['issues'],properties:{issues:{type:'array',items:{required:['sourceId','message','severity'],enums:{severity:['warning','blocker','info']}}}}}
};
const REPORT_SECTION_DEFINITIONS = [
  ['cover','Cover'],
  ['executiveSummary','Executive Summary'],
  ['researchScope','Research Scope'],
  ['competitiveLandscape','Competitive Landscape'],
  ['competitors','Competitors'],
  ['pricing','Pricing'],
  ['features','Features'],
  ['messaging','Messaging / Positioning'],
  ['channels','Channels / Content / SEO'],
  ['risksOpportunities','Risks and Opportunities'],
  ['recommendations','Recommendations'],
  ['sourcesEvidence','Sources and Evidence']
];
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
const SIDE_SEARCH_RENDER_DEBOUNCE_MS = 120;
const CLOUD_PERSIST_DEBOUNCE_MS = 1400;
const CLOUD_RETRY_DELAYS_MS = [3000, 10000, 30000, 60000];
const BROWSER_ONLY_MODE = true;
const HOSTED_MODE = location.protocol==='https:' || location.protocol==='http:';
let persistTimer = null;
let sideSearchRenderTimer = null;
let localStorageDisabledBySize = false;
let REPORT = normalizeReport(loadReport() || DEFAULT);
const state = {activeDataset: REPORT.datasets[0]?.id || null, activeFile:null, openTabs:[], theme:'dark', access:((HOSTED_MODE&&!BROWSER_ONLY_MODE)||REPORT.meta?.clientLocked)?'viewer':(REPORT.meta?.accessMode || 'admin'), activeCompany:null, compareA:null, compareB:null, compareOnly:false, openFolders:{}, showCompare:false, fsOpen:{}, fsRoots:[], fsPollTimer:null, analyticsSite:'all', analyticsResearch:'all', materialType:'all', reviewFilter:'all', competitorFilter:'all', matrixFilter:'all', aiStatus:null, aiStatusLoaded:false, aiSectionId:'', aiQueueType:'all', aiQueueStatus:'all', aiAuditFilter:'all', versionDiffFilter:'all', sidePanelView:'materials', lastVizFsSync:0, widgetSnapshots:{}, lang:(REPORT.meta?.lang || getSavedLang() || 'uk')};
const cloudSync = {enabled:HOSTED_MODE&&!BROWSER_ONLY_MODE, ready:false, localFallback:BROWSER_ONLY_MODE, saving:false, dirty:false, conflict:false, suppress:false, saveTimer:null, retryCount:0, reportId:null, version:null, role:null, user:null, workspace:null};
let VERSION_DIFF_BASELINE = null;
let VERSION_DIFF_BASELINE_REPORT = null;
const $ = id => document.getElementById(id);
const app = $('app'), analytics = $('analyticsContent'), reader = $('readerContent'), readerTabs = $('readerTabs'), sideList = $('sideList'), search = $('search');
const UI_TEXT = {
  uk: {
    appTitle: 'Marketing Report Studio',
    reportTitlePrefix: 'Marketing Report Studio',
    reportTitleDefaultCompany: 'ваша компанія',
    reportSubtitle: 'Завантажте матеріали -> перевірте докази -> експортуйте звіт для клієнта',
    companyName: 'Назва компанії',
    pasteCsv: 'Завантажити матеріали',
    pasteTitle: 'Додати таблицю, файли або папку',
    exportCiJson: 'CI JSON',
    exportCiJsonTitle: 'Експорт у єдиній CI OS структурі',
    saveDisk: 'Зберегти на диск',
    saveAdmin: 'Зберегти адмін',
    saveClient: 'Для клієнта',
    saveClientPackage: 'Пакет для клієнта',
    internalAuditPackage: 'Внутрішній аудит',
    internalAuditPackageTitle: 'Лише для аналітиків. Не для клієнтів.',
    clientPackageBlocked: 'Пакет для клієнта заблоковано: {message}',
    fixClientPackageBlockers: 'Виправте блокери експорту перед створенням пакета для клієнта',
    clientPackageWarnings: 'Пакет для клієнта має попередження: {message}',
    jszipClientPackageUnavailable: 'JSZip недоступний. Неможливо створити ZIP-пакет для клієнта.',
    preparingClientPackage: 'Готую пакет для клієнта...',
    clientPackageCreated: 'Пакет для клієнта створено ({files} файлів ресурсів)',
    couldNotBuildClientPackage: 'Не вдалося зібрати пакет для клієнта',
    internalAuditUnavailableClientLocked: 'Експорт внутрішнього аудиту недоступний у clientLocked-режимі.',
    internalAuditConfirm: 'Цей пакет містить внутрішні review та audit metadata. Не надсилайте його клієнтам без перевірки.',
    buildingInternalAuditPackage: 'Збираю пакет внутрішнього аудиту...',
    internalAuditPackageExported: 'Пакет внутрішнього аудиту експортовано',
    internalAuditPackageFailed: 'Не вдалося зібрати пакет внутрішнього аудиту: {message}',
    couldNotBuildInternalAuditPackage: 'Не вдалося зібрати пакет внутрішнього аудиту',
    editModeEnabled: 'Режим редагування',
    viewModeEnabled: 'Режим перегляду',
    clientLockedEditUnavailable: 'Клієнтська версія зафіксована й не має режиму редагування.',
    viewerRoleOnly: 'Ваша роль у робочому просторі дозволяє лише перегляд.',
    sharedStorageRequired: 'Редагування стане доступним після підключення до спільного сховища.',
    firstReportFallback: 'Перший звіт',
    firstReportContinue: 'Продовжити',
    firstReportCreateReport: 'Створити звіт',
    firstReportAddClientBasics: 'Додати клієнта',
    firstReportAddCompetitors: 'Додати конкурентів',
    firstReportUploadMaterials: 'Завантажити матеріали',
    firstReportReviewMaterials: 'Перевірити матеріали',
    firstReportBuildSources: 'Зібрати джерела',
    firstReportRefreshSources: 'Оновити джерела',
    firstReportAddEvidence: 'Додати докази',
    firstReportReviewEvidence: 'Перевірити докази',
    firstReportBuildDraft: 'Зібрати чернетку',
    firstReportRunQualityChecklist: 'Перевірити чекліст',
    firstReportExportClientReport: 'Експорт для клієнта',
    firstReportNameReport: 'Назвати звіт',
    firstReportAddClient: 'Додати клієнта',
    firstReportTitleEmpty: 'Створіть перший marketing intelligence звіт',
    firstReportTitleContinue: 'Продовжуйте звіт',
    firstReportSubtitleEmpty: 'Почніть із клієнта, конкурентів і дослідницьких матеріалів. Потім перетворіть їх на розділи з доказами та готовий клієнтський експорт.',
    firstReportSubtitleContinue: 'Рухайтесь від матеріалів до джерел, доказів, чернетки, чекліста та клієнтського експорту.',
    firstReportSampleData: 'Ви переглядаєте демонстраційні дані.',
    firstReportLocalOnly: 'Локальний guide: зміни застосовуються до цього файлу звіту або сесії браузера.',
    firstReportProgress: 'Прогрес {percent}% - наступний крок: {step}',
    firstReportOpenDemo: 'Відкрити демо-звіт',
    firstReportSkipStep: 'Пропустити крок',
    firstReportHideGuide: 'Сховати guide',
    firstReportStartGuided: 'Запустити guided report',
    firstReportPasteTable: 'Вставити таблицю',
    firstReportConnectLocalFolder: 'Підключити локальну папку',
    firstReportImportSpreadsheet: 'Імпорт CSV/XLSX',
    workflowUploadMaterialsTitle: 'Завантажте матеріали',
    workflowUploadMaterialsBody: 'Таблиці, PDF, DOCX, Markdown, скриншоти, зображення, JSON і нотатки.',
    workflowStructureTitle: 'Структуруйте',
    workflowStructureBody: 'Організуйте конкурентів, ціни, функції, графіки, таблиці та джерела.',
    workflowReviewEvidenceTitle: 'Перевірте докази',
    workflowReviewEvidenceBody: 'Тримайте висновки привʼязаними до джерел перед передачею клієнту.',
    workflowExportReportTitle: 'Експортуйте звіт',
    workflowExportReportBody: 'Створюйте клієнтський HTML, ZIP-пакети та результат, готовий для друку або PDF.',
    workflowBestFor: 'Кому підходить',
    workflowBestForAgencies: 'Маркетингові агенції',
    workflowBestForCiTeams: 'Команди конкурентної розвідки',
    workflowBestForConsultants: 'Консультанти й аналітики',
    workflowBestForFounders: 'Засновники, що готують market research',
    workflowBestForResearchTeams: 'Content та research команди',
    workflowClientReceives: 'Що отримує клієнт',
    workflowClientSummary: 'Чіткий executive summary',
    workflowClientComparison: 'Порівняння конкурентів',
    workflowClientPricing: 'Таблиці цін і функцій',
    workflowClientCharts: 'Графіки та візуальні інсайти',
    workflowClientSources: 'Висновки з посиланням на джерела',
    workflowClientReport: 'Інтерактивний клієнтський звіт',
    all: 'Усі',
    totalCount: '{count} всього',
    sourceSingular: 'джерело',
    sourcePlural: 'джерел',
    evidenceCardSingular: 'картка доказу',
    evidenceCardPlural: 'карток доказів',
    competitorProfilesTitle: 'Профілі конкурентів',
    activeCount: 'Активні {count}',
    archivedCount: 'Архівні {count}',
    needsReviewCount: 'Потребують перевірки {count}',
    active: 'активні',
    archived: 'архівні',
    needsReview: 'потребують перевірки',
    high: 'високий',
    noWebsite: 'Без сайту',
    noCategory: 'Без категорії',
    priorityLabel: 'пріоритет',
    edit: 'Редагувати',
    addSummaryToDraft: 'Додати summary до чернетки',
    archive: 'Архівувати',
    addCompetitor: 'Додати конкурента',
    competitorProfilesEmpty: 'Додайте конкурентів, щоб організувати positioning, pricing, features, sources та evidence. Scraping або AI не використовується.',
    pricingFeatureMatrixTitle: 'Матриця цін і функцій',
    coverageLabel: '{score}% покриття',
    competitorsCount: 'Конкуренти {count}',
    pricingTiersCount: 'Тарифні рівні {count}',
    featureRowsCount: 'Рядки функцій {count}',
    cellsNeedingReviewCount: 'Клітинки для перевірки {count}',
    allRows: 'Усі рядки',
    pricing: 'ціни',
    coreProduct: 'основний продукт',
    integrations: 'інтеграції',
    reporting: 'звітність',
    security: 'безпека',
    missingSources: 'бракує джерел',
    addCompetitorToMatrix: 'Додати конкурента до матриці',
    addPricingTier: 'Додати тариф',
    addFeatureRow: 'Додати рядок функції',
    addMatrixSummaryToDraft: 'Додати summary матриці до чернетки',
    featurePricing: 'Функція / ціна',
    importanceLabel: 'важливість',
    srcAbbr: 'джер.',
    evAbbr: 'док.',
    untitledTier: 'Тариф без назви',
    publicPricing: 'публічні ціни',
    noMatrixRowsYet: 'Рядків матриці ще немає.',
    materialsInventoryTitle: 'Інвентар матеріалів',
    materialsInventoryEmpty: 'Завантажте таблиці, PDF, DOCX, Markdown, скриншоти або дослідницькі файли, щоб почати створювати звіт.',
    showingMaterials: 'Показано 12 із {count} матеріалів.',
    linkedCompany: 'Привʼязана компанія',
    reportSection: 'Розділ звіту',
    notLinked: 'Не привʼязано',
    statusAvailable: 'доступно',
    statusLinked: 'привʼязано',
    statusIgnored: 'ігноровано',
    statusDraft: 'чернетка',
    statusApproved: 'затверджено',
    statusRejected: 'відхилено',
    statusUnknown: 'невідомо',
    statusTrusted: 'надійне',
    statusWeak: 'слабке',
    statusUnreviewed: 'не перевірено',
    statusUsed: 'використано',
    statusCandidate: 'кандидат',
    statusPending: 'очікує',
    statusFailed: 'помилка',
    statusYes: 'так',
    statusNo: 'ні',
    statusPartial: 'частково',
    statusNotApplicable: 'не застосовується',
    priorityLow: 'низький',
    priorityMedium: 'середній',
    priorityHigh: 'високий',
    typeSpreadsheet: 'таблиця',
    typeImage: 'зображення',
    typeText: 'текст',
    typeUnknown: 'невідомо',
    sourceRegistryTitle: 'Реєстр джерел',
    refreshSourcesFromMaterials: 'Оновити джерела з матеріалів',
    sourceRegistryEmpty: 'Джерела зʼявляться тут після завантаження або імпорту дослідницьких матеріалів.',
    sectionsCount: '{count} розд.',
    evidenceLabel: 'докази',
    credibilityLabel: 'надійність',
    showingSources: 'Показано 10 із {count} джерел.',
    evidenceCardsTitle: 'Картки доказів',
    addEvidenceCard: 'Додати картку доказу',
    evidenceCardsEmpty: 'Картки доказів зʼявляться тут після привʼязки висновків до джерел.',
    unlinkedSection: 'Розділ не привʼязано',
    missingSection: 'Розділ відсутній',
    untitledEvidenceCard: 'Картка доказу без назви',
    confidenceLabel: 'довіра',
    showingEvidenceCards: 'Показано 10 із {count} карток доказів.',
    evidenceReviewTitle: 'Перевірка доказів',
    approvedCount: 'Затверджено {count}',
    rejectedCount: 'Відхилено {count}',
    draftCount: 'Чернетки {count}',
    approve: 'Затвердити',
    reject: 'Відхилити',
    saveNotes: 'Зберегти нотатки',
    reviewNotesPlaceholder: 'Нотатки перевірки або причина відхилення',
    showingFilteredEvidenceCards: 'Показано 8 відфільтрованих карток доказів.',
    approvedCardsReady: '{count} затверджених карток готові для майбутньої генерації звіту.',
    draftBuilderTitle: 'Конструктор чернетки звіту',
    blocksCount: '{count} блоків',
    buildDraftFromEvidence: 'Зібрати чернетку з затверджених доказів',
    clearGeneratedDraft: 'Очистити згенеровану чернетку',
    approveEvidenceFirst: 'Спочатку затвердьте картки доказів, потім збирайте чернетку звіту.',
    generatedBlocksCount: '{blocks} згенер. блоків',
    evidenceCardsCount: '{count} карток доказів',
    draftBlockNoPreview: 'У draft-блоку немає preview-тексту.',
    noGeneratedDraftBlocks: 'Згенерованих draft-блоків ще немає.',
    approvedEvidenceAvailable: '{count} затверджених карток доказів доступно. Згенерований текст є чернеткою.',
    ready: 'Готово',
    blocked: 'Заблоковано',
    exportReadinessTitle: 'Готовність до експорту',
    completenessLabel: 'Повнота',
    clientSafetyLabel: 'Безпека для клієнта',
    blockersCount: 'Блокери {count}',
    warningsCount: 'Попередження {count}',
    passedCount: 'Пройдено {count}',
    clientReport: 'Клієнтський звіт',
    evidenceBackedReport: 'Marketing intelligence звіт із доказами.',
    noApprovedDraftSections: 'Затверджених draft-розділів звіту ще немає.',
    evidenceRefLabel: 'Докази',
    sourceRefLabel: 'Джерела',
    untitledSource: 'Джерело без назви',
    sourcesEvidenceTitle: 'Джерела й докази',
    admin: 'Адмін',
    viewer: 'Перегляд',
    unlockAdmin: 'Увімкнути режим адміністратора',
    theme: 'Тема',
    analytics: 'Report workspace',
    analyticsHint: 'Матеріали -> структура -> перевірка -> експорт',
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
    savingHtml: 'Зберігаю HTML-файл на диск...',
    saveDiskTitle: 'Зберегти поточний проєкт у HTML-файл на диск',
    members: 'Користувачі',
    cloudLocal: 'Локально',
    cloudStatusTitle: 'Стан спільного збереження',
    closeNotice: 'Закрити повідомлення',
    closeDialog: 'Закрити діалог',
    uploadFilesTitle: 'Вибрати один або кілька файлів з диска',
    connectFolderTitle: 'Підключити локальну папку з матеріалами'
  },
  en: {
    appTitle: 'Marketing Report Studio',
    reportTitlePrefix: 'Marketing Report Studio',
    reportTitleDefaultCompany: 'your company',
    reportSubtitle: 'Upload materials -> review evidence -> export client report',
    companyName: 'Company name',
    pasteCsv: 'Upload materials',
    pasteTitle: 'Add a table, files, or a folder',
    exportCiJson: 'CI JSON',
    exportCiJsonTitle: 'Export to unified CI OS structure',
    saveDisk: 'Save to disk',
    saveAdmin: 'Save admin',
    saveClient: 'For client',
    saveClientPackage: 'Client package',
    internalAuditPackage: 'Export internal audit package',
    internalAuditPackageTitle: 'For analysts only. Not for clients.',
    clientPackageBlocked: 'Client package blocked: {message}',
    fixClientPackageBlockers: 'Fix export blockers before client package',
    clientPackageWarnings: 'Client package has warnings: {message}',
    jszipClientPackageUnavailable: 'JSZip is unavailable. Client package ZIP cannot be created.',
    preparingClientPackage: 'Preparing client package...',
    clientPackageCreated: 'Client package created ({files} asset files)',
    couldNotBuildClientPackage: 'Could not build client package',
    internalAuditUnavailableClientLocked: 'Internal audit export is unavailable in clientLocked mode.',
    internalAuditConfirm: 'This package contains internal review and audit metadata. Do not send it to clients unless reviewed.',
    buildingInternalAuditPackage: 'Building internal audit package...',
    internalAuditPackageExported: 'Internal audit package exported',
    internalAuditPackageFailed: 'Internal audit package failed: {message}',
    couldNotBuildInternalAuditPackage: 'Could not build internal audit package',
    editModeEnabled: 'Edit mode',
    viewModeEnabled: 'View mode',
    clientLockedEditUnavailable: 'The client version is locked and has no edit mode.',
    viewerRoleOnly: 'Your workspace role allows view-only access.',
    sharedStorageRequired: 'Editing will become available after connecting shared storage.',
    firstReportFallback: 'First report',
    firstReportContinue: 'Continue',
    firstReportCreateReport: 'Create report',
    firstReportAddClientBasics: 'Add client basics',
    firstReportAddCompetitors: 'Add competitors',
    firstReportUploadMaterials: 'Upload materials',
    firstReportReviewMaterials: 'Review materials',
    firstReportBuildSources: 'Build sources',
    firstReportRefreshSources: 'Refresh sources',
    firstReportAddEvidence: 'Add evidence',
    firstReportReviewEvidence: 'Review evidence',
    firstReportBuildDraft: 'Build draft',
    firstReportRunQualityChecklist: 'Run quality checklist',
    firstReportExportClientReport: 'Export client report',
    firstReportNameReport: 'Name report',
    firstReportAddClient: 'Add client',
    firstReportTitleEmpty: 'Build your first marketing intelligence report',
    firstReportTitleContinue: 'Continue your report',
    firstReportSubtitleEmpty: 'Start with a client, competitors, and research materials. Then turn them into evidence-backed sections and a client-ready export.',
    firstReportSubtitleContinue: 'Keep moving from materials to sources, evidence, draft, checklist, and client export.',
    firstReportSampleData: 'You are viewing sample data.',
    firstReportLocalOnly: 'Local-only guide: changes apply to this report file/browser session.',
    firstReportProgress: 'Progress {percent}% - next: {step}',
    firstReportOpenDemo: 'Open demo report',
    firstReportSkipStep: 'Skip step',
    firstReportHideGuide: 'Hide guide',
    firstReportStartGuided: 'Start guided report',
    firstReportPasteTable: 'Paste table',
    firstReportConnectLocalFolder: 'Connect local folder',
    firstReportImportSpreadsheet: 'Import CSV/XLSX',
    workflowUploadMaterialsTitle: 'Upload materials',
    workflowUploadMaterialsBody: 'Spreadsheets, PDFs, DOCX, Markdown, screenshots, images, JSON, and notes.',
    workflowStructureTitle: 'Structure',
    workflowStructureBody: 'Organize competitors, pricing, features, charts, tables, and sources.',
    workflowReviewEvidenceTitle: 'Review evidence',
    workflowReviewEvidenceBody: 'Keep findings tied to source material before client delivery.',
    workflowExportReportTitle: 'Export report',
    workflowExportReportBody: 'Create client-ready HTML, ZIP bundles, and browser print/PDF-ready output.',
    workflowBestFor: 'Best for',
    workflowBestForAgencies: 'Marketing agencies',
    workflowBestForCiTeams: 'Competitive intelligence teams',
    workflowBestForConsultants: 'Consultants and analysts',
    workflowBestForFounders: 'Founders preparing market research',
    workflowBestForResearchTeams: 'Content and research teams',
    workflowClientReceives: 'What the client receives',
    workflowClientSummary: 'Clear executive summary',
    workflowClientComparison: 'Competitor comparison',
    workflowClientPricing: 'Pricing and feature tables',
    workflowClientCharts: 'Charts and visual insights',
    workflowClientSources: 'Source-backed findings',
    workflowClientReport: 'Client-facing interactive report',
    all: 'All',
    totalCount: '{count} total',
    sourceSingular: 'source',
    sourcePlural: 'sources',
    evidenceCardSingular: 'evidence card',
    evidenceCardPlural: 'evidence cards',
    competitorProfilesTitle: 'Competitor Profiles',
    activeCount: 'Active {count}',
    archivedCount: 'Archived {count}',
    needsReviewCount: 'Needs review {count}',
    active: 'active',
    archived: 'archived',
    needsReview: 'needs review',
    high: 'high',
    noWebsite: 'No website',
    noCategory: 'No category',
    priorityLabel: 'priority',
    edit: 'Edit',
    addSummaryToDraft: 'Add summary to draft',
    archive: 'Archive',
    addCompetitor: 'Add competitor',
    competitorProfilesEmpty: 'Add competitors to organize positioning, pricing, features, sources, and evidence. No scraping or AI is used.',
    pricingFeatureMatrixTitle: 'Pricing & Feature Matrix',
    coverageLabel: '{score}% coverage',
    competitorsCount: 'Competitors {count}',
    pricingTiersCount: 'Pricing tiers {count}',
    featureRowsCount: 'Feature rows {count}',
    cellsNeedingReviewCount: 'Cells needing review {count}',
    allRows: 'All rows',
    pricing: 'pricing',
    coreProduct: 'core product',
    integrations: 'integrations',
    reporting: 'reporting',
    security: 'security',
    missingSources: 'missing sources',
    addCompetitorToMatrix: 'Add competitor to matrix',
    addPricingTier: 'Add pricing tier',
    addFeatureRow: 'Add feature row',
    addMatrixSummaryToDraft: 'Add matrix summary to draft',
    featurePricing: 'Feature / pricing',
    importanceLabel: 'importance',
    srcAbbr: 'src',
    evAbbr: 'ev',
    untitledTier: 'Untitled tier',
    publicPricing: 'public pricing',
    noMatrixRowsYet: 'No matrix rows yet.',
    materialsInventoryTitle: 'Materials Inventory',
    materialsInventoryEmpty: 'Upload spreadsheets, PDFs, DOCX, Markdown, screenshots, or research files to start building your report.',
    showingMaterials: 'Showing 12 of {count} materials.',
    linkedCompany: 'Linked company',
    reportSection: 'Report section',
    notLinked: 'Not linked',
    statusAvailable: 'available',
    statusLinked: 'linked',
    statusIgnored: 'ignored',
    statusDraft: 'draft',
    statusApproved: 'approved',
    statusRejected: 'rejected',
    statusUnknown: 'unknown',
    statusTrusted: 'trusted',
    statusWeak: 'weak',
    statusUnreviewed: 'unreviewed',
    statusUsed: 'used',
    statusCandidate: 'candidate',
    statusPending: 'pending',
    statusFailed: 'failed',
    statusYes: 'yes',
    statusNo: 'no',
    statusPartial: 'partial',
    statusNotApplicable: 'not applicable',
    priorityLow: 'low',
    priorityMedium: 'medium',
    priorityHigh: 'high',
    typeSpreadsheet: 'spreadsheet',
    typeImage: 'image',
    typeText: 'text',
    typeUnknown: 'unknown',
    sourceRegistryTitle: 'Source Registry',
    refreshSourcesFromMaterials: 'Refresh sources from materials',
    sourceRegistryEmpty: 'Sources will appear here after you upload or import research materials.',
    sectionsCount: '{count} section(s)',
    evidenceLabel: 'evidence',
    credibilityLabel: 'credibility',
    showingSources: 'Showing 10 of {count} sources.',
    evidenceCardsTitle: 'Evidence Cards',
    addEvidenceCard: 'Add evidence card',
    evidenceCardsEmpty: 'Evidence cards will appear here after you connect findings to sources.',
    unlinkedSection: 'Unlinked section',
    missingSection: 'Missing section',
    untitledEvidenceCard: 'Untitled evidence card',
    confidenceLabel: 'confidence',
    showingEvidenceCards: 'Showing 10 of {count} evidence cards.',
    evidenceReviewTitle: 'Evidence Review',
    approvedCount: 'Approved {count}',
    rejectedCount: 'Rejected {count}',
    draftCount: 'Draft {count}',
    approve: 'Approve',
    reject: 'Reject',
    saveNotes: 'Save notes',
    reviewNotesPlaceholder: 'Review notes or rejection reason',
    showingFilteredEvidenceCards: 'Showing 8 filtered evidence cards.',
    approvedCardsReady: '{count} approved cards are ready for future report generation.',
    draftBuilderTitle: 'Report Draft Builder',
    blocksCount: '{count} blocks',
    buildDraftFromEvidence: 'Build draft from approved evidence',
    clearGeneratedDraft: 'Clear generated draft',
    approveEvidenceFirst: 'Approve evidence cards first, then build a draft report.',
    generatedBlocksCount: '{blocks} generated block(s)',
    evidenceCardsCount: '{count} evidence card(s)',
    draftBlockNoPreview: 'Draft block has no preview text.',
    noGeneratedDraftBlocks: 'No generated draft blocks yet.',
    approvedEvidenceAvailable: '{count} approved evidence cards available. Generated text is a draft.',
    ready: 'Ready',
    blocked: 'Blocked',
    exportReadinessTitle: 'Export Readiness',
    completenessLabel: 'Completeness',
    clientSafetyLabel: 'Client safety',
    blockersCount: 'Blockers {count}',
    warningsCount: 'Warnings {count}',
    passedCount: 'Passed {count}',
    clientReport: 'Client Report',
    evidenceBackedReport: 'Evidence-backed marketing intelligence report.',
    noApprovedDraftSections: 'No approved draft report sections are available yet.',
    evidenceRefLabel: 'Evidence',
    sourceRefLabel: 'Sources',
    untitledSource: 'Untitled source',
    sourcesEvidenceTitle: 'Sources and Evidence',
    admin: 'Admin',
    viewer: 'View',
    unlockAdmin: 'Enable admin mode',
    theme: 'Theme',
    analytics: 'Report workspace',
    analyticsHint: 'Upload materials -> Structure -> Review -> Export',
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
    savingHtml: 'Saving HTML file to disk...',
    saveDiskTitle: 'Save the current project as an HTML file',
    members: 'Users',
    cloudLocal: 'Local',
    cloudStatusTitle: 'Shared save status',
    closeNotice: 'Close notice',
    closeDialog: 'Close dialog',
    uploadFilesTitle: 'Choose one or more files from disk',
    connectFolderTitle: 'Connect a local materials folder'
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
const ADDITIONAL_TEXT_REPLACEMENTS = [
  ['Додати вибраних кандидатів до карток доказів', 'Add selected candidates to Evidence Cards'],
  ['Надіслати вибрані пропозиції на перевірку', 'Send selected suggestions to review queue'],
  ['Додати вибрані рекомендації до чернетки', 'Add selected recommendations to draft'],
  ['Додати вибрані блоки summary до чернетки', 'Add selected summary blocks to draft'],
  ['Додати вибрані прогалини до чекліста', 'Add selected gaps to checklist'],
  ['Додати вибрані блоки до чернетки розділу', 'Add selected blocks to section draft'],
  ['Усі', 'All'],
  ['Усі статуси', 'All statuses'],
  ['Готові', 'Ready'],
  ['Зберегти', 'Save'],
  ['Скасувати', 'Cancel'],
  ['Редагувати', 'Edit'],
  ['Відхилити', 'Reject'],
  ['Переглянути', 'View'],
  ['Закрити', 'Close'],
  ['Дозволено', 'allowed'],
  ['Не дозволено', 'not allowed'],
  ['робочий простір', 'workspace'],
  ['подій', 'events'],
  ['всього', 'total'],
  ['AI-помічник', 'AI Assistance'],
  ['AI suggestions require review before export. AI output is not added to the client report automatically.', 'AI suggestions require review before export. AI output is not added to the client report automatically.'],
  ['AI-пропозиції потребують перевірки перед експортом. AI-вивід не додається до клієнтського звіту автоматично.', 'AI suggestions require review before export. AI output is not added to the client report automatically.'],
  ['AI-сервер', 'AI server'],
  ['Провайдер', 'Provider'],
  ['Дозвіл', 'Permission'],
  ['Клієнтський режим', 'Client mode'],
  ['Режим', 'Mode'],
  ['Пропозиції', 'Suggestions'],
  ['Виберіть розділ для чернетки', 'Select section for draft'],
  ['Попередній перегляд кандидатів доказів', 'Preview evidence candidates'],
  ['Попередній перегляд executive summary', 'Preview executive summary'],
  ['Попередній перегляд рекомендацій', 'Preview recommendations'],
  ['Попередній перегляд покриття джерел', 'Preview source coverage'],
  ['Попередній перегляд чернетки розділу', 'Preview section draft'],
  ['Лише попередній перегляд evidence suggestions. Без автоматичного затвердження.', 'Preview evidence suggestions only. No automatic approval.'],
  ['Лише попередній перегляд recommendation suggestions. Без автоматичного затвердження.', 'Preview recommendation suggestions only. No automatic approval.'],
  ['Лише попередній перегляд executive summary suggestions. Без автоматичного затвердження.', 'Preview executive summary suggestions only. No automatic approval.'],
  ['Лише попередній перегляд прогалин покриття джерел. Без автоматичних виправлень.', 'Preview source coverage gaps only. No automatic fixes.'],
  ['Лише попередній перегляд блоків чернетки розділу. Без автоматичного затвердження.', 'Preview section draft blocks only. No automatic approval.'],
  ['вимкнено', 'disabled'],
  ['контракт готовий', 'contract ready'],
  ['Черга перевірки AI', 'AI Review Queue'],
  ['Переглянути', 'View'],
  ['Прийняти', 'Accept'],
  ['Прийняти й перетворити на чернетку для перевірки', 'Accept and convert to needs-review draft'],
  ['Усі статуси', 'All statuses'],
  ['AI-пропозиції, надіслані на перевірку, зʼявляться тут.', 'AI suggestions sent for review will appear here.'],
  ['AI-аудит і походження', 'AI Audit & Provenance'],
  ['Усі події', 'All events'],
  ['Preview-запуски', 'Preview runs'],
  ['Створені пропозиції', 'Created suggestions'],
  ['Прийняті', 'Accepted'],
  ['Відхилені', 'Rejected'],
  ['Перетворені', 'Converted'],
  ['Помилки', 'Errors'],
  ['Переглянути походження', 'View provenance'],
  ['Запуски задач', 'Task runs'],
  ['Остання AI/dry-run активність', 'Last AI/dry-run activity'],
  ['AI preview та review-дії зʼявляться тут.', 'AI preview and review actions will appear here.'],
  ['Деталі AI-пропозиції', 'AI suggestion details'],
  ['Редагувати AI-пропозицію', 'Edit AI suggestion'],
  ['Заголовок', 'Title'],
  ['Summary', 'Summary'],
  ['Текст / claim / recommendation', 'Text / claim / recommendation'],
  ['Нотатки аналітика', 'Analyst notes'],
  ['Закрити', 'Close'],
  ['Опційна причина відхилення', 'Optional rejection reason'],
  ['Пропозицію оновлено', 'Suggestion updated'],
  ['Пропозицію прийнято', 'Suggestion accepted'],
  ['Пропозицію відхилено', 'Suggestion rejected'],
  ['Пропозицію перетворено для перевірки', 'Suggestion converted for review'],
  ['Не вдалося перетворити пропозицію', 'Could not convert suggestion'],
  ['Картку доказу збережено', 'Evidence card saved'],
  ['Картку доказу видалено', 'Evidence card deleted'],
  ['Редагувати картку доказу', 'Edit evidence card'],
  ['Додати картку доказу', 'Add evidence card'],
  ['Зберегти картку доказу', 'Save evidence card'],
  ['Видалити', 'Delete'],
  ['Claim', 'Claim'],
  ['Короткий доказовий висновок', 'Short evidence-backed claim'],
  ['Короткий контекст або деталь підтвердження', 'Brief context or supporting detail'],
  ['Тип доказу', 'Evidence type'],
  ['Джерела', 'Sources'],
  ['Джерел ще немає', 'No sources available yet'],
  ['Утримуйте Ctrl або Cmd, щоб вибрати кілька джерел.', 'Hold Ctrl or Cmd to select multiple sources.'],
  ['Статус перевірки', 'Review status'],
  ['Довіра', 'Confidence'],
  ['Надійність', 'Credibility'],
  ['ID компанії / конкурента', 'Company / competitor ID'],
  ['Необовʼязково', 'Optional'],
  ['Відсутнє джерело', 'Missing source'],
  ['Профіль конкурента збережено', 'Competitor profile saved'],
  ['Потрібна назва конкурента.', 'Competitor name is required.'],
  ['Не вдалося зберегти профіль конкурента', 'Could not save competitor profile'],
  ['Редагувати профіль конкурента', 'Edit competitor profile'],
  ['Додати профіль конкурента', 'Add competitor profile'],
  ['Зберегти конкурента', 'Save competitor'],
  ['Назва *', 'Name *'],
  ['Вебсайт', 'Website'],
  ['Категорія', 'Category'],
  ['Ринок', 'Market'],
  ['Короткий опис', 'Short description'],
  ['Позиціонування', 'Positioning'],
  ['Нотатки щодо цін', 'Pricing notes'],
  ['Нотатки щодо функцій', 'Feature notes'],
  ['Нотатки щодо каналів / контенту', 'Channels / content notes'],
  ['Сильні сторони', 'Strengths'],
  ['Слабкі сторони', 'Weaknesses'],
  ['Ризики', 'Risks'],
  ['Можливості', 'Opportunities'],
  ['Пріоритет', 'Priority'],
  ['Матеріали', 'Materials'],
  ['Картки доказів', 'Evidence cards'],
  ['Розділи звіту', 'Report sections'],
  ['Матеріалів ще немає', 'No materials available'],
  ['Доказових карток ще немає', 'No evidence cards available'],
  ['Додати конкурента до матриці', 'Add competitor to matrix'],
  ['Конкурент', 'Competitor'],
  ['Активних конкурентів ще немає', 'No active competitors available'],
  ['Редагувати рядок функції', 'Edit feature row'],
  ['Додати рядок функції', 'Add feature row'],
  ['Назва функції *', 'Feature name *'],
  ['Важливість', 'Importance'],
  ['Опис', 'Description'],
  ['Зберегти рядок', 'Save row'],
  ['Рядок матриці збережено', 'Matrix row saved'],
  ['Не вдалося зберегти рядок', 'Could not save row'],
  ['Додати тариф', 'Add pricing tier'],
  ['Компанія', 'Company'],
  ['Назва тарифу', 'Tier name'],
  ['Сума ціни', 'Price amount'],
  ['Невідомо, якщо порожньо', 'Unknown if blank'],
  ['Валюта', 'Currency'],
  ['Період', 'Period'],
  ['Публічна ціна', 'Public pricing'],
  ['Платіжні нотатки', 'Billing notes'],
  ['Зберегти тариф', 'Save tier'],
  ['Тариф додано', 'Pricing tier added'],
  ['Клітинка матриці', 'Matrix cell'],
  ['Доступність', 'Availability'],
  ['Значення', 'Value'],
  ['Посилання на джерела', 'Source links'],
  ['Посилання на докази', 'Evidence links'],
  ['Зберегти клітинку', 'Save cell'],
  ['Клітинку матриці збережено', 'Matrix cell saved'],
  ['Походження пропозиції', 'Suggestion provenance'],
  ['Тип задачі', 'Task type'],
  ['Режим провайдера', 'Provider mode'],
  ['Вхідні посилання', 'Input refs'],
  ['Вихідні посилання', 'Output refs'],
  ['Історія перевірки', 'Review history'],
  ['Походження недоступне.', 'No provenance available.'],
  ['Налаштування governance збережено', 'Governance settings saved'],
  ['Налаштування governance скинуто', 'Governance settings reset'],
  ['Скинути governance settings до безпечних стандартних значень?', 'Reset governance settings to safe defaults?'],
  ['Відновити вибрану версію', 'Restore selected version'],
  ['Вибрана версія', 'Selected version'],
  ['Поточна версія', 'Current version'],
  ['Рівень ризику', 'Risk level'],
  ['Готовність після відновлення', 'Readiness after restore'],
  ['Чому ви відновлюєте цю версію?', 'Why are you restoring this version?'],
  ['Необовʼязкова причина відновлення', 'Optional restore reason'],
  ['Введіть RESTORE для підтвердження', 'Type RESTORE to confirm'],
  ['Позначте для підтвердження', 'Check to confirm'],
  ['Відновити цю версію як нову поточну версію', 'Restore this version as a new current version'],
  ['Це відновлення може знизити готовність експорту або прибрати перевірені звʼязки доказів/джерел.', 'This restore may reduce export readiness or remove reviewed evidence/source links.'],
  ['Підготовлено для', 'Prepared for'],
  ['Назва звіту', 'Report title'],
  ['Зберегти basics', 'Save basics'],
  ['Назва клієнта', 'Client name'],
  ['Зберегти клієнта', 'Save client'],
  ['Нотатки або URL', 'Notes or URL'],
  ['Додайте 2-5 конкурентів, якщо знаєте їх. Guide не парсить сайти й не генерує claims.', 'Add 2-5 competitors if you know them. The guide will not scrape websites or generate claims.'],
  ['Зберегти конкурентів', 'Save competitors'],
  ['Профілі конкурентів збережено', 'Competitor profiles saved'],
  ['Крок матеріалів позначено завершеним', 'Materials step marked complete'],
  ['Використайте Evidence Review, щоб затвердити, позначити як needs review або відхилити докази.', 'Use Evidence Review to approve, mark needs review, or reject evidence.'],
  ['Чекліст якості оновлено', 'Quality checklist refreshed'],
  ['Сховано guide першого звіту', 'First report guide hidden'],
  ['Крок guide пропущено', 'Guide step skipped'],
  ['Показано guide першого звіту', 'First report guide shown'],
  ['Демо-звіт завантажено з вигаданими sample data.', 'Demo report loaded with fictional sample data.'],
  ['Відкрити demo report? Це замінить поточний робочий простір у памʼяті. Спершу експортуйте або збережіть роботу, якщо вона потрібна.', 'Open demo report? This will replace the current in-memory workspace. Export or save your work first if you need it.'],
  ['Дані додано', 'Data added'],
  ['Користувачі спільного звіту', 'Shared report users'],
  ['Користувачі', 'Users'],
  ['Завантаження...', 'Loading...'],
  ['Завантаження…', 'Loading...'],
  ['Роль', 'Role'],
  ['Імʼя', 'Name'],
  ['Ім\'я', 'Name'],
  ['Немає користувачів', 'No users'],
  ['Додати / оновити', 'Add / update'],
  ['Користувач також має бути дозволений у політиці Cloudflare Access. Роль тут визначає права всередині робочого простору.', 'The user must also be allowed in the Cloudflare Access policy. The role here controls permissions inside the workspace.'],
  ['Керування користувачами доступне лише власнику', 'User management is available only to the owner'],
  ['Вкажіть email користувача', 'Enter user email'],
  ['Доступ користувача оновлено', 'User access updated'],
  ['Не вдалося завантажити користувачів', 'Could not load users'],
  ['Готово', 'Done'],
  ['Відкрити таблицю', 'Open table'],
  ['Створити авто-звіт', 'Create auto report'],
  ['Додати дані', 'Add data'],
  ['Вставити таблицю', 'Paste table'],
  ['CSV або TSV з Excel чи Google Sheets', 'CSV or TSV from Excel or Google Sheets'],
  ['Excel, CSV, JSON, документи та зображення', 'Excel, CSV, JSON, documents and images'],
  ['Працювати з локальною структурою файлів', 'Work with a local file structure'],
  ['Вставте таблицю, щоб перевірити її перед імпортом.', 'Paste a table to validate it before import.'],
  ['Створити таблицю', 'Create table'],
  ['Пакет для клієнта заблоковано', 'Client package blocked'],
  ['Виправте блокери експорту перед клієнтським експортом', 'Fix export blockers before client export'],
  ['Клієнтський експорт заблоковано', 'Client export blocked'],
  ['Клієнтський експорт має попередження', 'Client export has warnings'],
  ['Демо-звіт - вигадані sample data', 'Demo report - fictional sample data'],
  ['Хмара', 'Cloud'],
  ['Збереження спільного звіту', 'Saving shared report'],
  ['Збережено', 'Saved'],
  ['Конфлікт', 'Conflict'],
  ['Інший користувач уже змінив цей звіт', 'Another user has already changed this report'],
  ['Хмара: повтор', 'Cloud: retrying'],
  ['Помилка збереження', 'Save error'],
  ['Повтор через', 'Retry in'],
  ['Спільний звіт', 'Shared report'],
  ['Оновлення...', 'Refreshing...'],
  ['Оновлення…', 'Refreshing...'],
  ['Хмара: помилка', 'Cloud: error'],
  ['Помилка завантаження', 'Load error'],
  ['Лише браузер', 'Browser only'],
  ['Файли й дані не відправляються на сервер', 'Files and data are not sent to the server'],
  ['Клієнтська копія', 'Client copy'],
  ['Підключення...', 'Connecting...'],
  ['Підключення…', 'Connecting...'],
  ['Підключення до спільного сховища', 'Connecting to shared storage'],
  ['Хмарне сховище ще не налаштоване', 'Cloud storage is not configured yet'],
  ['Помилка підключення', 'Connection error'],
  ['Не вдалося зберегти звіт у хмарі. Повторю автоматично.', 'Could not save the report to the cloud. I will retry automatically.'],
  ['Спочатку дочекайтеся збереження локальних змін', 'Wait for local changes to finish saving first'],
  ['Завантажено актуальну версію звіту', 'Loaded the current report version'],
  ['Хмарне сховище ще не налаштоване. Дані зберігаються лише в цьому браузері.', 'Cloud storage is not configured yet. Data is stored only in this browser.'],
  ['Власник керує користувачами та governance. Редактор редагує звіти. Переглядач має лише перегляд.', 'Owner manages users and governance. Editor edits reports. Viewer is read-only.'],
  ['Поточна кількість учасників доступна в наявній панелі Members, коли API увімкнено. Роль:', 'Current member count is available in the existing Members panel when the API is enabled. Role:'],
  ['Локальний режим не має серверного командного доступу або Cloudflare Access enforcement.', 'Local mode has no server-side team access or Cloudflare Access enforcement.'],
  ['Відкрити користувачів', 'Open members'],
  ['Використайте вигадані sample data, щоб побачити workflow materials -> evidence -> report, або залиште поточний workspace порожнім.', 'Use fictional sample data to see the materials -> evidence -> report workflow, or keep the current workspace empty.'],
  ['Залишити поточний workspace', 'Keep current workspace'],
  ['Якщо поточний звіт має дані, demo loading попросить підтвердження перед заміною workspace у памʼяті.', 'If the current report has data, demo loading asks for confirmation before replacing the in-memory workspace.'],
  ['Налаштування робочого простору пропущено', 'Workspace setup skipped'],
  ['Базові дані звіту збережено', 'Report basics saved'],
  ['Дані клієнта збережено', 'Client basics saved'],
  ['Поточна версія залишиться доступною через звичайну історію збережень/експортів. Вибрана версія копіюється в новий активний локальний snapshot.', 'Current version will remain available through normal saved/exported history. The selected version is copied into a new active local snapshot.']
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
const EN_MESSAGE_REPLACEMENTS = [
  [/^Evidence marked (.+)$/u, 'Доказ позначено як $1'],
  [/^Built (\d+) draft blocks$/u, 'Зібрано $1 блок(ів) чернетки'],
  [/^Cleared (\d+) generated draft blocks$/u, 'Очищено $1 згенерованих блоків чернетки'],
  [/^No generated draft blocks to clear$/u, 'Немає згенерованих блоків чернетки для очищення'],
  [/^Previewed (\d+) candidate evidence item(s?)$/u, 'Попередньо переглянуто $1 кандидат(ів) доказів'],
  [/^No evidence candidates found$/u, 'Кандидатів доказів не знайдено'],
  [/^Added (\d+) candidate(s?) to Evidence Cards for review$/u, 'Додано $1 кандидат(ів) до карток доказів для перевірки'],
  [/^Queued (\d+) suggestion(s?) for review$/u, 'Поставлено $1 пропозицій у чергу перевірки'],
  [/^Previewed (\d+) recommendation(s?)$/u, 'Попередньо переглянуто $1 рекомендацій'],
  [/^No recommendations suggested$/u, 'Рекомендацій не запропоновано'],
  [/^Added (\d+) recommendation(s?) to draft for review$/u, 'Додано $1 рекомендацій до чернетки для перевірки'],
  [/^Previewed (\d+) summary block(s?)$/u, 'Попередньо переглянуто $1 summary-блоків'],
  [/^No summary blocks suggested$/u, 'Summary-блоків не запропоновано'],
  [/^Added (\d+) summary block(s?) to draft for review$/u, 'Додано $1 summary-блоків до чернетки для перевірки'],
  [/^Coverage preview: (.+) \((\d+)%\)$/u, 'Попередній перегляд покриття: $1 ($2%)'],
  [/^Added (\d+) coverage gap(s?) for review$/u, 'Додано $1 прогалин покриття для перевірки'],
  [/^Previewed (\d+) section draft block(s?)$/u, 'Попередньо переглянуто $1 блоків чернетки розділу'],
  [/^No section draft blocks suggested$/u, 'Блоків чернетки розділу не запропоновано'],
  [/^Added (\d+) section draft block(s?) for review$/u, 'Додано $1 блоків чернетки розділу для перевірки'],
  [/^Cleanup preview: (\d+) cleanup candidate\(s\), (\d+) protected$/u, 'Попередній перегляд очищення: $1 кандидат(ів), $2 захищено'],
  [/^Restored as (.+)\. Recheck export readiness before client export\.$/u, 'Відновлено як $1. Перевірте готовність експорту перед клієнтським експортом.'],
  [/^Client export blocked: (.+)$/u, 'Клієнтський експорт заблоковано: $1'],
  [/^Client export has warnings: (.+)$/u, 'Клієнтський експорт має попередження: $1'],
  [/^Queued (.+) suggestion(s?) for review$/u, 'Поставлено $1 пропозицій у чергу перевірки'],
  [/^Select (.+) first\.$/u, 'Спочатку виберіть $1.']
];
const TRANSLATION_CACHE = {en:null, uk:null};
function translationPairsForLang(lang){
  const key=lang==='en'?'en':'uk';
  if(TRANSLATION_CACHE[key]) return TRANSLATION_CACHE[key];
  const base=key==='en'?[...TEXT_REPLACEMENTS,...ADDITIONAL_TEXT_REPLACEMENTS]:ADDITIONAL_TEXT_REPLACEMENTS;
  const pairs=key==='en' ? base : base.map(([uk,en])=>[en,uk]);
  const seen=new Set();
  TRANSLATION_CACHE[key]=pairs
    .filter(([from,to])=>{
      if(!from || !to || from===to) return false;
      const k=`${from}\u0000${to}`;
      if(seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a,b)=>String(b[0]).length-String(a[0]).length);
  return TRANSLATION_CACHE[key];
}
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
  const lang=state.lang==='en'?'en':'uk';
  const messageReplacements=lang==='en'?MESSAGE_REPLACEMENTS:EN_MESSAGE_REPLACEMENTS;
  for(const [pattern, replacement] of messageReplacements){
    text=text.replace(pattern, replacement);
  }
  for(const [from,to] of translationPairsForLang(lang)){
    text=text.split(from).join(to);
  }
  return text;
}
function t(key, values={}){
  const lang=state.lang==='en'?'en':'uk';
  const template=UI_TEXT[lang]?.[key] ?? UI_TEXT.uk?.[key] ?? key;
  return translateText(formatText(template, values));
}
function countLabel(count, singularKey, pluralKey){
  return `${count} ${t(count===1?singularKey:pluralKey)}`;
}
function statusLabel(value){
  const key=String(value||'unknown');
  return ({
    available:t('statusAvailable'),
    needs_review:t('needsReview'),
    linked:t('statusLinked'),
    ignored:t('statusIgnored'),
    draft:t('statusDraft'),
    approved:t('statusApproved'),
    rejected:t('statusRejected'),
    active:t('active'),
    archived:t('archived'),
    trusted:t('statusTrusted'),
    weak:t('statusWeak'),
    unreviewed:t('statusUnreviewed'),
    used:t('statusUsed'),
    candidate:t('statusCandidate'),
    pending:t('statusPending'),
    failed:t('statusFailed'),
    yes:t('statusYes'),
    no:t('statusNo'),
    partial:t('statusPartial'),
    not_applicable:t('statusNotApplicable'),
    unknown:t('statusUnknown')
  })[key]||key.replace(/_/g,' ');
}
function priorityLabel(value){
  const key=String(value||'medium');
  return ({low:t('priorityLow'),medium:t('priorityMedium'),high:t('priorityHigh')})[key]||key;
}
function featureCategoryLabel(value){
  const key=String(value||'unknown');
  return ({
    pricing:t('pricing'),
    core_product:t('coreProduct'),
    integrations:t('integrations'),
    reporting:t('reporting'),
    security:t('security')
  })[key]||key.replace(/_/g,' ');
}
function materialTypeLabel(type){
  const key=String(type||'unknown');
  return ({
    spreadsheet:t('typeSpreadsheet'),
    image:t('typeImage'),
    text:t('typeText'),
    unknown:t('typeUnknown')
  })[key]||key.toUpperCase();
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
  $('reportSubtitle') && ($('reportSubtitle').textContent=REPORT.meta?.isDemoReport?translateText('Demo report - fictional sample data'):t('reportSubtitle'));
  $('companyNameInput') && ($('companyNameInput').placeholder=t('companyName'));
  $('pasteBtn') && ($('pasteBtn').innerHTML=`<span class="hideMob">${t('pasteCsv')}</span>`, $('pasteBtn').setAttribute('aria-label',t('pasteCsv')), $('pasteBtn').title=t('pasteTitle'));
  $('exportJsonBtn') && ($('exportJsonBtn').innerHTML=`<span class="hideMob">${t('exportCiJson')}</span>`);
  $('exportJsonBtn') && ($('exportJsonBtn').title=t('exportCiJsonTitle'));
  $('saveDiskBtn') && ($('saveDiskBtn').textContent=t('saveDisk'), $('saveDiskBtn').title=t('saveDiskTitle'));
  $('saveHtmlBtn') && ($('saveHtmlBtn').textContent=t('saveAdmin'));
  $('saveClientHtmlBtn') && ($('saveClientHtmlBtn').textContent=t('saveClient'));
  $('saveClientPackageBtn') && ($('saveClientPackageBtn').textContent=t('saveClientPackage'));
  $('internalAuditPackageBtn') && ($('internalAuditPackageBtn').textContent=t('internalAuditPackage'), $('internalAuditPackageBtn').title=t('internalAuditPackageTitle'));
  $('membersBtn') && ($('membersBtn').textContent=t('members'));
  $('cloudStatus') && ($('cloudStatus').title=t('cloudStatusTitle'), $('cloudStatus').textContent=$('cloudStatus').dataset.state==='local'?t('cloudLocal'):$('cloudStatus').textContent);
  $('unlockAdminBtn') && ($('unlockAdminBtn').title=t('unlockAdmin'));
  $('themeBtn') && ($('themeBtn').title=t('theme'));
  $('langBtn') && ($('langBtn').textContent=t('langCode'));
  $('langBtn') && ($('langBtn').title=t('switchLanguage'));
  $('appNoticeClose') && ($('appNoticeClose').setAttribute('aria-label',t('closeNotice')));
  $('modalClose') && ($('modalClose').setAttribute('aria-label',t('closeDialog')));
  $('analyticsPanelTitle') && ($('analyticsPanelTitle').textContent=t('analytics'));
  $('analyticsHint') && ($('analyticsHint').textContent=t('analyticsHint'));
  $('readerPanelTitle') && ($('readerPanelTitle').textContent=t('reader'));
  $('filesPanelTitle') && ($('filesPanelTitle').textContent=t('dataFiles'));
  $('clearReaderBtn') && ($('clearReaderBtn').textContent=t('clear'));
  $('connectFolderBtn') && ($('connectFolderBtn').textContent=t('connectFolder'), $('connectFolderBtn').title=t('connectFolderTitle'));
  $('uploadFilesBtn') && ($('uploadFilesBtn').textContent=t('uploadFiles'), $('uploadFilesBtn').title=t('uploadFilesTitle'), $('uploadFilesBtn').setAttribute('aria-label',t('uploadFiles')));
  $('search').placeholder=t('searchPlaceholder');
  const drop=$('dropZone');
  if(drop) drop.innerHTML = `${t('dropZone')}<br><small>${t('dropZoneSmall')}</small>`;
  const headTitle=$('reportTitle');
  if(headTitle) headTitle.textContent = t('reportTitlePrefix');
  document.title=t('reportTitlePrefix');
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
  el.textContent=translateText(label);
  el.title=translateText(title||label);
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
function createDefaultReportSections(){
  return REPORT_SECTION_DEFINITIONS.map(([id,title],idx)=>({
    id,
    title,
    type:id,
    order:idx+1,
    blocks:[],
    status:'empty'
  }));
}
function normalizeReportSection(section, fallback){
  const base=fallback||{};
  const out=section&&typeof section==='object'?{...section}:{};
  out.id=String(out.id||base.id||uid('section'));
  out.title=String(out.title||base.title||out.id);
  out.type=String(out.type||base.type||out.id);
  out.order=Number.isFinite(Number(out.order))?Number(out.order):(Number(base.order)||0);
  out.blocks=Array.isArray(out.blocks)?out.blocks:[];
  out.status=REPORT_SECTION_STATUS.includes(String(out.status))?String(out.status):(base.status||'empty');
  return out;
}
function normalizeReportSchema(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  report.reportSchemaVersion=Number(report.reportSchemaVersion)>=REPORT_SCHEMA_VERSION
    ? Number(report.reportSchemaVersion)
    : REPORT_SCHEMA_VERSION;
  const existing=Array.isArray(report.reportSections)
    ? report.reportSections
    : (report.reportSections&&typeof report.reportSections==='object'
      ? Object.entries(report.reportSections).map(([id,section])=>section&&typeof section==='object'?{id,...section}:{id})
      : []);
  const existingById=new Map(existing.filter(Boolean).map(section=>[String(section.id||''),section]));
  const defaults=createDefaultReportSections();
  const normalized=defaults.map(section=>normalizeReportSection(existingById.get(section.id),section));
  const defaultIds=new Set(defaults.map(section=>section.id));
  for(const section of existing){
    const id=String(section?.id||'');
    if(!id||defaultIds.has(id)) continue;
    normalized.push(normalizeReportSection(section,{order:normalized.length+1}));
  }
  report.reportSections=normalized.sort((a,b)=>num(a.order)-num(b.order));
  return report;
}
function getReportSection(reportData, sectionId){
  const report=normalizeReportSchema(reportData);
  return (report.reportSections||[]).find(section=>section.id===sectionId)||null;
}
function updateReportSection(reportData, sectionId, patch){
  const report=normalizeReportSchema(reportData);
  const section=getReportSection(report, sectionId);
  if(!section) return null;
  Object.assign(section, patch&&typeof patch==='object'?patch:{});
  Object.assign(section, normalizeReportSection(section, section));
  return section;
}
function createDemoReportData(){
  const now=new Date().toISOString();
  const sections=createDefaultReportSections();
  const setStatus=(id,status='draft')=>{
    const section=sections.find(item=>item.id===id);
    if(section) section.status=status;
  };
  ['cover','executiveSummary','researchScope','competitiveLandscape','competitors','pricing','features','messaging','channels','risksOpportunities','recommendations','sourcesEvidence'].forEach(id=>setStatus(id));
  const companies=[
    {id:'demo-co-apex',name:'Apex Analytics',type:'competitor',folder:'apex-analytics',createdAt:now},
    {id:'demo-co-signalforge',name:'SignalForge',type:'competitor',folder:'signalforge',createdAt:now},
    {id:'demo-co-marketlens',name:'MarketLens',type:'competitor',folder:'marketlens',createdAt:now}
  ];
  const files=[
    {id:'demo-file-pricing',name:'competitor-pricing.csv',path:'demo/competitor-pricing.csv',folder:'Demo materials',ext:'csv',type:'text/csv',size:318,isData:true,contentText:'company,tier,monthly_price_usd,key_limit\nApex Analytics,Pro,149,5 dashboards\nSignalForge,Growth,199,10 workspaces\nMarketLens,Team,99,3 projects',createdAt:now},
    {id:'demo-file-positioning',name:'website-positioning-notes.md',path:'demo/website-positioning-notes.md',folder:'Demo materials',ext:'md',type:'text/markdown',size:512,isData:false,contentText:'# Demo positioning notes\n\nFictional sample notes for showing source traceability only. Apex emphasizes dashboards, SignalForge emphasizes automation, and MarketLens emphasizes approachable research workflows.',createdAt:now},
    {id:'demo-file-screenshot',name:'market-screenshots.zip',path:'demo/market-screenshots.zip',folder:'Demo materials',ext:'zip',type:'application/zip',size:2048,isData:false,createdAt:now},
    {id:'demo-file-summary',name:'analyst-summary.docx',path:'demo/analyst-summary.docx',folder:'Demo materials',ext:'docx',type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',size:1536,isData:false,createdAt:now}
  ];
  const pricingRows=[
    {company:'Apex Analytics',tier:'Pro',monthly_price_usd:149,key_limit:'5 dashboards',positioning:'Dashboard-led analytics',_companyId:'demo-co-apex'},
    {company:'SignalForge',tier:'Growth',monthly_price_usd:199,key_limit:'10 workspaces',positioning:'Automation for campaign teams',_companyId:'demo-co-signalforge'},
    {company:'MarketLens',tier:'Team',monthly_price_usd:99,key_limit:'3 projects',positioning:'Accessible market research',_companyId:'demo-co-marketlens'}
  ];
  const featureRows=[
    {feature:'Dashboard templates','Apex Analytics':'Yes','SignalForge':'Yes','MarketLens':'Limited'},
    {feature:'Workflow automation','Apex Analytics':'Limited','SignalForge':'Strong','MarketLens':'No'},
    {feature:'Research brief export','Apex Analytics':'PDF','SignalForge':'HTML','MarketLens':'DOCX/PDF'},
    {feature:'Positioning notes','Apex Analytics':'Moderate','SignalForge':'Strong','MarketLens':'Strong'}
  ];
  const datasets=[
    {id:'demo-ds-pricing',name:'Demo competitor pricing',sourceFileId:'demo-file-pricing',createdAt:now,rows:pricingRows,columns:inferColumns(pricingRows)},
    {id:'demo-ds-features',name:'Demo feature comparison',sourceFileId:'demo-file-summary',createdAt:now,rows:featureRows,columns:inferColumns(featureRows)}
  ];
  const sourceRegistry={
    items:[
      {id:'source:file:demo-file-pricing',materialId:'file:demo-file-pricing',title:'Demo competitor pricing CSV',sourceType:'spreadsheet',sourceKind:'file',mimeType:'text/csv',extension:'csv',fileName:'competitor-pricing.csv',url:'',localPathLabel:'demo/competitor-pricing.csv',linkedCompanyId:'',linkedSectionIds:['pricing','competitiveLandscape'],extractedTextStatus:'not_applicable',evidenceStatus:'used',credibilityStatus:'trusted',notes:'Sample/demo data only.',createdAt:now,updatedAt:now},
      {id:'source:file:demo-file-positioning',materialId:'file:demo-file-positioning',title:'Demo website positioning notes',sourceType:'document',sourceKind:'file',mimeType:'text/markdown',extension:'md',fileName:'website-positioning-notes.md',url:'https://example.com/demo-positioning',localPathLabel:'demo/website-positioning-notes.md',linkedCompanyId:'',linkedSectionIds:['messaging','channels'],extractedTextStatus:'available',evidenceStatus:'used',credibilityStatus:'trusted',notes:'Fictional sample notes.',createdAt:now,updatedAt:now},
      {id:'source:file:demo-file-screenshot',materialId:'file:demo-file-screenshot',title:'Demo market screenshots archive',sourceType:'image',sourceKind:'file',mimeType:'application/zip',extension:'zip',fileName:'market-screenshots.zip',url:'',localPathLabel:'demo/market-screenshots.zip',linkedCompanyId:'',linkedSectionIds:['features'],extractedTextStatus:'not_applicable',evidenceStatus:'candidate',credibilityStatus:'needs_review',notes:'Sample screenshot bundle placeholder.',createdAt:now,updatedAt:now},
      {id:'source:file:demo-file-summary',materialId:'file:demo-file-summary',title:'Demo analyst summary document',sourceType:'document',sourceKind:'file',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',extension:'docx',fileName:'analyst-summary.docx',url:'',localPathLabel:'demo/analyst-summary.docx',linkedCompanyId:'',linkedSectionIds:['executiveSummary','recommendations'],extractedTextStatus:'pending',evidenceStatus:'used',credibilityStatus:'trusted',notes:'Sample analyst memo.',createdAt:now,updatedAt:now}
    ],
    updatedAt:now
  };
  const evidenceCards={items:[
    createEvidenceCard({id:'demo-ev-pricing',claim:'MarketLens is the lowest-priced sample competitor at $99/month for the Team tier.',summary:'The demo pricing table positions MarketLens below Apex Analytics and SignalForge on entry team pricing.',sourceIds:['source:file:demo-file-pricing'],sectionId:'pricing',materialIds:['file:demo-file-pricing'],competitorId:'demo-co-marketlens',companyId:'demo-co-marketlens',evidenceType:'metric',reviewStatus:'approved',confidenceStatus:'high',credibilityStatus:'trusted',analystNotes:'Demo evidence. Not real market research.',reviewedAt:now,reviewedBy:'demo analyst',reviewNotes:'Approved for demo draft.',createdAt:now,updatedAt:now}),
    createEvidenceCard({id:'demo-ev-positioning',claim:'SignalForge sample positioning emphasizes workflow automation for campaign teams.',summary:'The demo notes describe SignalForge as automation-oriented compared with the other fictional competitors.',sourceIds:['source:file:demo-file-positioning'],sectionId:'messaging',materialIds:['file:demo-file-positioning'],competitorId:'demo-co-signalforge',companyId:'demo-co-signalforge',evidenceType:'observation',reviewStatus:'approved',confidenceStatus:'medium',credibilityStatus:'trusted',analystNotes:'Demo evidence. Not real market research.',reviewedAt:now,reviewedBy:'demo analyst',reviewNotes:'Approved for demo draft.',createdAt:now,updatedAt:now}),
    createEvidenceCard({id:'demo-ev-risk',claim:'Screenshot review may reveal UX gaps, but the sample screenshot archive still needs analyst review.',summary:'This placeholder demonstrates a needs-review evidence card that should not be exported as approved.',sourceIds:['source:file:demo-file-screenshot'],sectionId:'risksOpportunities',materialIds:['file:demo-file-screenshot'],evidenceType:'risk',reviewStatus:'needs_review',confidenceStatus:'low',credibilityStatus:'needs_review',analystNotes:'Needs real review in a real project.',reviewedAt:now,reviewedBy:'demo analyst',reviewNotes:'Needs review.',createdAt:now,updatedAt:now}),
    createEvidenceCard({id:'demo-ev-rejected',claim:'Apex Analytics has twice the automation coverage of all competitors.',summary:'Rejected because the sample materials do not support this exact claim.',sourceIds:['source:file:demo-file-summary'],sectionId:'features',materialIds:['file:demo-file-summary'],competitorId:'demo-co-apex',companyId:'demo-co-apex',evidenceType:'comparison',reviewStatus:'rejected',confidenceStatus:'low',credibilityStatus:'weak',analystNotes:'Unsupported demo claim.',reviewedAt:now,reviewedBy:'demo analyst',reviewNotes:'Rejected: unsupported by demo sources.',rejectionReason:'Unsupported by sample data.',createdAt:now,updatedAt:now}),
    createEvidenceCard({id:'demo-ev-draft',claim:'MarketLens may be strongest for founder-led research teams.',summary:'Draft idea for later review.',sourceIds:['source:file:demo-file-summary'],sectionId:'recommendations',materialIds:['file:demo-file-summary'],competitorId:'demo-co-marketlens',companyId:'demo-co-marketlens',evidenceType:'recommendation_input',reviewStatus:'draft',confidenceStatus:'unknown',credibilityStatus:'unreviewed',analystNotes:'Draft demo note.',createdAt:now,updatedAt:now})
  ],updatedAt:now};
  const competitorProfiles={items:[
    createCompetitorProfile({id:'demo-co-apex',name:'Apex Analytics',website:'https://example.com/apex-demo',category:'Analytics',market:'Marketing intelligence',shortDescription:'Fictional demo competitor for dashboard-led analytics positioning.',positioning:'Dashboard-led analytics for teams that need reporting speed.',pricingNotes:'Sample Pro tier shown at $149/month in demo CSV.',featureNotes:'Demo notes: dashboard templates yes, workflow automation limited.',channelNotes:'Sample content notes only.',strengths:'Clear dashboards and reporting packaging.',weaknesses:'Automation coverage is limited in the sample feature table.',risks:'Rejected demo claim shows unsupported automation comparison risk.',opportunities:'Could be compared against automation-focused competitors.',priority:'medium',status:'active',linkedMaterialIds:['file:demo-file-pricing','file:demo-file-summary'],linkedSourceIds:['source:file:demo-file-pricing','source:file:demo-file-summary'],linkedEvidenceCardIds:['demo-ev-rejected'],linkedSectionIds:['competitiveLandscape','pricing','features'],confidenceStatus:'medium',reviewStatus:'needs_review',analystNotes:'Demo/sample profile only. Do not treat as real market research.',createdAt:now,updatedAt:now}),
    createCompetitorProfile({id:'demo-co-signalforge',name:'SignalForge',website:'https://example.com/signalforge-demo',category:'Marketing automation',market:'Marketing intelligence',shortDescription:'Fictional demo competitor for automation-oriented positioning.',positioning:'Automation for campaign teams and workflow-heavy marketing operations.',pricingNotes:'Sample Growth tier shown at $199/month in demo CSV.',featureNotes:'Demo notes: workflow automation strong; dashboards available.',channelNotes:'Sample positioning notes only.',strengths:'Strong sample automation positioning.',weaknesses:'Higher sample price than MarketLens.',risks:'Needs real source validation in live projects.',opportunities:'Useful comparison for automation-oriented client needs.',priority:'high',status:'active',linkedMaterialIds:['file:demo-file-pricing','file:demo-file-positioning'],linkedSourceIds:['source:file:demo-file-pricing','source:file:demo-file-positioning'],linkedEvidenceCardIds:['demo-ev-positioning'],linkedSectionIds:['messaging','channels','pricing'],confidenceStatus:'medium',reviewStatus:'needs_review',analystNotes:'Demo/sample profile only. Do not treat as real market research.',createdAt:now,updatedAt:now}),
    createCompetitorProfile({id:'demo-co-marketlens',name:'MarketLens',website:'https://example.com/marketlens-demo',category:'Market research',market:'Marketing intelligence',shortDescription:'Fictional demo competitor for approachable research workflow positioning.',positioning:'Accessible market research workflows for smaller teams.',pricingNotes:'Sample Team tier shown at $99/month in demo CSV.',featureNotes:'Demo notes: research brief export available, limited dashboards.',channelNotes:'Sample channel notes only.',strengths:'Lowest sample price among demo competitors.',weaknesses:'Dashboard and automation depth appear limited in sample data.',risks:'Draft recommendation still needs analyst review.',opportunities:'May fit founder-led or lean research teams after validation.',priority:'high',status:'active',linkedMaterialIds:['file:demo-file-pricing','file:demo-file-summary'],linkedSourceIds:['source:file:demo-file-pricing','source:file:demo-file-summary'],linkedEvidenceCardIds:['demo-ev-pricing','demo-ev-draft'],linkedSectionIds:['pricing','recommendations'],confidenceStatus:'medium',reviewStatus:'needs_review',analystNotes:'Demo/sample profile only. Do not treat as real market research.',createdAt:now,updatedAt:now})
  ],updatedAt:now};
  const pricingFeatureMatrix=createPricingFeatureMatrix({
    title:'Demo Pricing & Feature Matrix',
    description:'Fictional sample matrix for showing how pricing and features can be linked to sources and evidence.',
    competitorIds:['demo-co-apex','demo-co-signalforge','demo-co-marketlens'],
    pricingTiers:[
      {id:'demo-tier-apex-pro',competitorId:'demo-co-apex',tierName:'Pro',priceAmount:'149',priceCurrency:'USD',pricePeriod:'monthly',priceLabel:'$149/month',publicPricingAvailable:'yes',sourceIds:['source:file:demo-file-pricing'],evidenceCardIds:['demo-ev-rejected'],confidenceStatus:'medium',reviewStatus:'needs_review',analystNotes:'Fictional demo pricing.'},
      {id:'demo-tier-signalforge-growth',competitorId:'demo-co-signalforge',tierName:'Growth',priceAmount:'199',priceCurrency:'USD',pricePeriod:'monthly',priceLabel:'$199/month',publicPricingAvailable:'yes',sourceIds:['source:file:demo-file-pricing'],evidenceCardIds:['demo-ev-positioning'],confidenceStatus:'medium',reviewStatus:'needs_review',analystNotes:'Fictional demo pricing.'},
      {id:'demo-tier-marketlens-team',competitorId:'demo-co-marketlens',tierName:'Team',priceAmount:'99',priceCurrency:'USD',pricePeriod:'monthly',priceLabel:'$99/month',publicPricingAvailable:'yes',sourceIds:['source:file:demo-file-pricing'],evidenceCardIds:['demo-ev-pricing'],confidenceStatus:'high',reviewStatus:'needs_review',analystNotes:'Fictional demo pricing.'}
    ],
    featureRows:[
      {id:'demo-feature-dashboards',featureName:'Dashboard templates',category:'reporting',importance:'medium',sourceIds:['source:file:demo-file-summary'],evidenceCardIds:[]},
      {id:'demo-feature-automation',featureName:'Workflow automation',category:'automation',importance:'high',sourceIds:['source:file:demo-file-positioning'],evidenceCardIds:['demo-ev-positioning']},
      {id:'demo-feature-export',featureName:'Research brief export',category:'reporting',importance:'high',sourceIds:['source:file:demo-file-summary'],evidenceCardIds:['demo-ev-draft']}
    ],
    matrixCells:[
      {rowId:'demo-feature-dashboards',competitorId:'demo-co-apex',value:'Yes',normalizedValue:'true',availabilityStatus:'yes',sourceIds:['source:file:demo-file-summary'],reviewStatus:'needs_review',confidenceStatus:'medium'},
      {rowId:'demo-feature-dashboards',competitorId:'demo-co-signalforge',value:'Yes',normalizedValue:'true',availabilityStatus:'yes',sourceIds:['source:file:demo-file-summary'],reviewStatus:'needs_review',confidenceStatus:'medium'},
      {rowId:'demo-feature-dashboards',competitorId:'demo-co-marketlens',value:'Limited',normalizedValue:'partial',availabilityStatus:'partial',sourceIds:['source:file:demo-file-summary'],reviewStatus:'needs_review',confidenceStatus:'medium'},
      {rowId:'demo-feature-automation',competitorId:'demo-co-apex',value:'Limited',normalizedValue:'partial',availabilityStatus:'partial',evidenceCardIds:['demo-ev-rejected'],sourceIds:['source:file:demo-file-summary'],reviewStatus:'needs_review',confidenceStatus:'low'},
      {rowId:'demo-feature-automation',competitorId:'demo-co-signalforge',value:'Strong',normalizedValue:'true',availabilityStatus:'yes',evidenceCardIds:['demo-ev-positioning'],sourceIds:['source:file:demo-file-positioning'],reviewStatus:'needs_review',confidenceStatus:'medium'},
      {rowId:'demo-feature-automation',competitorId:'demo-co-marketlens',value:'No',normalizedValue:'false',availabilityStatus:'no',sourceIds:['source:file:demo-file-summary'],reviewStatus:'needs_review',confidenceStatus:'medium'},
      {rowId:'demo-feature-export',competitorId:'demo-co-apex',value:'PDF',normalizedValue:'custom text',availabilityStatus:'partial',sourceIds:['source:file:demo-file-summary'],reviewStatus:'needs_review',confidenceStatus:'medium'},
      {rowId:'demo-feature-export',competitorId:'demo-co-signalforge',value:'HTML',normalizedValue:'custom text',availabilityStatus:'yes',sourceIds:['source:file:demo-file-summary'],reviewStatus:'needs_review',confidenceStatus:'medium'},
      {rowId:'demo-feature-export',competitorId:'demo-co-marketlens',value:'DOCX/PDF',normalizedValue:'custom text',availabilityStatus:'yes',evidenceCardIds:['demo-ev-draft'],sourceIds:['source:file:demo-file-summary'],reviewStatus:'needs_review',confidenceStatus:'unknown'}
    ],
    notes:'Demo/sample matrix only. Do not treat as real market research.',
    reviewStatus:'needs_review',
    confidenceStatus:'medium',
    createdAt:now,
    updatedAt:now
  });
  const report={
    meta:{title:'Marketing Report Studio Demo Report',companyName:'Sample Client',updatedAt:now,lang:state?.lang||'uk',accessMode:'admin',isDemoReport:true,demoLabel:'Demo report - fictional sample data'},
    reportSchemaVersion:REPORT_SCHEMA_VERSION,
    reportSections:sections,
    datasets,
    companies,
    files,
    charts:[],
    tables:[
      {id:'demo-table-pricing',title:'Demo pricing tiers',datasetId:'demo-ds-pricing',columns:['company','tier','monthly_price_usd','key_limit'],top:10,sourceFileId:'demo-file-pricing'},
      {id:'demo-table-features',title:'Demo feature comparison',datasetId:'demo-ds-features',columns:['feature','Apex Analytics','SignalForge','MarketLens'],top:10,sourceFileId:'demo-file-summary'}
    ],
    materialsInventory:{items:[],updatedAt:null},
    competitorProfiles,
    pricingFeatureMatrix,
    sourceRegistry,
    evidenceCards,
    ci:null
  };
  const normalized=normalizeReport(report);
  buildRuleBasedReportDraft(normalized);
  const cover=getReportSection(normalized,'cover');
  if(cover){
    cover.blocks.unshift(normalizeDraftBlock({id:'demo-cover-block',type:'paragraph',title:'Demo cover',text:'This is fictional sample data showing the Marketing Report Studio workflow from materials to evidence-backed client export.',sectionId:'cover',evidenceCardIds:[],sourceIds:[],generatedBy:'demo_seed',createdAt:now,updatedAt:now,status:'approved'}));
    cover.status='approved';
  }
  const executive=getReportSection(normalized,'executiveSummary');
  if(executive){
    executive.blocks.unshift(normalizeDraftBlock({id:'demo-exec-block',type:'paragraph',title:'Demo executive summary',text:'This fictional demo shows how approved evidence becomes a concise client-ready marketing intelligence draft.',sectionId:'executiveSummary',evidenceCardIds:['demo-ev-pricing','demo-ev-positioning'],sourceIds:['source:file:demo-file-pricing','source:file:demo-file-positioning'],generatedBy:'demo_seed',createdAt:now,updatedAt:now,status:'approved'}));
    executive.status='approved';
  }
  const recommendations=getReportSection(normalized,'recommendations');
  if(recommendations){
    recommendations.blocks.unshift(normalizeDraftBlock({id:'demo-recommendation-block',type:'recommendation_note',title:'Demo recommendation',text:'Use the approved pricing and positioning evidence to prioritize a client-facing comparison of value, automation, and research workflow fit.',sectionId:'recommendations',evidenceCardIds:['demo-ev-pricing','demo-ev-positioning'],sourceIds:['source:file:demo-file-pricing','source:file:demo-file-positioning'],generatedBy:'demo_seed',createdAt:now,updatedAt:now,status:'draft'}));
    recommendations.status='draft';
  }
  normalized.clientExportV2=buildClientExportDataV2(normalized);
  return normalized;
}
function resetDemoReportIfNeeded(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:REPORT;
  if(report.meta?.isDemoReport) report.meta.demoResetAt=new Date().toISOString();
  return report;
}
function hasActiveUserReport(){
  if(REPORT.meta?.isDemoReport) return false;
  return reportContentScore(REPORT)>0 || (REPORT.reportSections||[]).some(section=>(section.blocks||[]).length) || (REPORT.evidenceCards?.items||[]).length;
}
function loadDemoReport(){
  if(!guardAdmin()) return;
  if(hasActiveUserReport() && !confirmI18n('Open demo report? This will replace the current in-memory workspace. Export or save your work first if you need it.')) return;
  REPORT=resetDemoReportIfNeeded(createDemoReportData());
  state.activeDataset=REPORT.datasets[0]?.id||null;
  state.openTabs=[];
  state.activeFile=null;
  state.activeCompany=REPORT.companies[0]?.id||null;
  state.compareA=REPORT.companies[0]?.id||null;
  state.compareB=REPORT.companies[1]?.id||null;
  initState();
  refresh();
  reader.innerHTML=`<div class="empty">Demo report loaded. Review the Materials, Sources, Evidence, Draft Builder, and Client Export flow.</div>`;
  showNotice('Demo report loaded with fictional sample data.','success');
}
function createDefaultMaterialsInventory(){
  return {items:[], updatedAt:null};
}
function getMaterialType(material){
  const ext=String(material?.extension||material?.ext||material?.name||'').split('.').pop().toLowerCase();
  const mime=String(material?.mimeType||material?.type||'').toLowerCase();
  if(['xlsx','xls'].includes(ext)||/spreadsheet|excel/.test(mime)) return 'spreadsheet';
  if(['csv','tsv'].includes(ext)||/csv|tab-separated/.test(mime)) return 'csv';
  if(ext==='json'||/json/.test(mime)) return 'json';
  if(ext==='pdf'||/pdf/.test(mime)) return 'pdf';
  if(ext==='docx'||/wordprocessingml|msword/.test(mime)) return 'docx';
  if(['md','markdown'].includes(ext)||/markdown/.test(mime)) return 'markdown';
  if(['html','htm'].includes(ext)||/html/.test(mime)) return 'html';
  if(['png','jpg','jpeg','webp','gif','bmp','svg'].includes(ext)||/^image\//.test(mime)) return 'image';
  if(['txt','text'].includes(ext)||/^text\//.test(mime)) return 'text';
  return 'unknown';
}
function normalizeMaterialItem(item){
  const out=item&&typeof item==='object'?{...item}:{};
  out.id=String(out.id||uid('material'));
  out.name=String(out.name||'Untitled material');
  out.extension=String(out.extension||out.ext||extFromName(out.name)||'').toLowerCase();
  out.mimeType=String(out.mimeType||out.type||'');
  out.type=MATERIAL_TYPES.includes(String(out.type))?String(out.type):getMaterialType(out);
  out.sourceKind=String(out.sourceKind||'manual');
  out.sizeLabel=String(out.sizeLabel||bytes(out.size||0));
  out.linkedCompanyId=String(out.linkedCompanyId||out.companyId||'');
  out.linkedSectionId=String(out.linkedSectionId||'');
  out.createdAt=String(out.createdAt||'');
  out.updatedAt=String(out.updatedAt||out.createdAt||'');
  out.status=MATERIAL_STATUS.includes(String(out.status))?String(out.status):(out.linkedCompanyId||out.linkedSectionId?'linked':'available');
  return out;
}
function normalizeMaterialsInventory(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const inv=report.materialsInventory&&typeof report.materialsInventory==='object'
    ? report.materialsInventory
    : createDefaultMaterialsInventory();
  inv.items=Array.isArray(inv.items)?inv.items.map(normalizeMaterialItem):[];
  inv.updatedAt=inv.updatedAt||null;
  report.materialsInventory=inv;
  return inv;
}
function collectMaterialsFromCurrentState(reportData, fsRoots=[]){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const previous=new Map((normalizeMaterialsInventory(report).items||[]).map(item=>[String(item.id),item]));
  const items=[];
  const add=(raw)=>{
    const prior=previous.get(String(raw.id||''));
    const item=normalizeMaterialItem({...prior,...raw});
    items.push(item);
  };
  for(const f of (report.files||[])){
    add({
      id:`file:${f.id}`,
      name:f.name||f.path||'File',
      sourceKind:f.sourceKind||'file',
      mimeType:f.type||mimeFromExt(f.ext),
      extension:f.ext||extFromName(f.name),
      size:f.size||0,
      sizeLabel:bytes(f.size||0),
      linkedCompanyId:f.companyId||'',
      createdAt:f.createdAt||'',
      updatedAt:f.updatedAt||f.createdAt||'',
      status:f.companyId?'linked':'available'
    });
  }
  for(const ds of (report.datasets||[])){
    const sourceFile=(report.files||[]).find(f=>String(f.id||'')===String(ds.sourceFileId||''));
    add({
      id:`dataset:${ds.id}`,
      name:ds.name||'Table',
      sourceKind:ds.sourceKind||'dataset',
      mimeType:sourceFile?.type||'application/x-report-table',
      extension:sourceFile?.ext||'',
      size:0,
      sizeLabel:`${(ds.rows||[]).length} rows`,
      linkedCompanyId:'',
      createdAt:ds.createdAt||'',
      updatedAt:ds.updatedAt||ds.createdAt||'',
      status:'available'
    });
  }
  for(const root of (fsRoots||[])){
    if(!root?.index || !(root.index instanceof Map)) continue;
    for(const [relPath, handle] of root.index.entries()){
      const name=pathName(relPath)||String(handle?.name||'File');
      const ext=extFromName(name);
      add({
        id:`fs:${root.id}:${relPath}`,
        name,
        sourceKind:'connected-folder',
        mimeType:mimeFromExt(ext),
        extension:ext,
        size:Number(handle?.size||0),
        sizeLabel:'connected folder',
        linkedCompanyId:'',
        createdAt:'',
        updatedAt:'',
        status:'available'
      });
    }
  }
  report.materialsInventory={items, updatedAt:new Date().toISOString()};
  return report.materialsInventory;
}
function createDefaultSourceRegistry(){
  return {items:[], updatedAt:null};
}
function materialSourceType(material){
  const type=String(material?.type||'unknown');
  const kind=String(material?.sourceKind||'');
  if(kind==='dataset') return 'dataset';
  if(['spreadsheet','csv','json'].includes(type)) return 'spreadsheet';
  if(['pdf','docx','markdown','html','text'].includes(type)) return 'document';
  if(type==='image') return 'image';
  return 'unknown';
}
function defaultSourceTextStatus(material){
  const type=String(material?.type||'unknown');
  if(['spreadsheet','csv','json','image'].includes(type)) return 'not_applicable';
  if(['pdf','docx','markdown','html','text'].includes(type)) return 'pending';
  return 'pending';
}
function normalizeSourceRegistryItem(item){
  const out=item&&typeof item==='object'?{...item}:{};
  out.id=String(out.id||uid('source'));
  out.materialId=String(out.materialId||'');
  out.title=String(out.title||out.fileName||'Untitled source');
  out.sourceType=SOURCE_TYPES.includes(String(out.sourceType))?String(out.sourceType):'unknown';
  out.sourceKind=String(out.sourceKind||'manual');
  out.mimeType=String(out.mimeType||'');
  out.extension=String(out.extension||'').toLowerCase();
  out.fileName=String(out.fileName||out.title||'');
  out.url=String(out.url||'');
  out.localPathLabel=String(out.localPathLabel||'');
  out.linkedCompanyId=String(out.linkedCompanyId||'');
  out.linkedSectionIds=Array.isArray(out.linkedSectionIds)?out.linkedSectionIds.map(String).filter(Boolean):[];
  out.extractedTextStatus=SOURCE_TEXT_STATUS.includes(String(out.extractedTextStatus))?String(out.extractedTextStatus):'pending';
  out.evidenceStatus=SOURCE_EVIDENCE_STATUS.includes(String(out.evidenceStatus))?String(out.evidenceStatus):'unused';
  out.credibilityStatus=SOURCE_CREDIBILITY_STATUS.includes(String(out.credibilityStatus))?String(out.credibilityStatus):'unreviewed';
  out.notes=String(out.notes||'');
  out.createdAt=String(out.createdAt||'');
  out.updatedAt=String(out.updatedAt||out.createdAt||'');
  return out;
}
function normalizeSourceRegistry(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const registry=Array.isArray(report.sourceRegistry)
    ? {items:report.sourceRegistry, updatedAt:null}
    : (report.sourceRegistry&&typeof report.sourceRegistry==='object'
      ? report.sourceRegistry
      : createDefaultSourceRegistry());
  registry.items=Array.isArray(registry.items)?registry.items.map(normalizeSourceRegistryItem):[];
  registry.updatedAt=registry.updatedAt||null;
  report.sourceRegistry=registry;
  return registry;
}
function sourceFromMaterial(material, prior){
  const now=new Date().toISOString();
  const materialId=String(material?.id||'');
  const existing=prior&&typeof prior==='object'?prior:{};
  const linkedSectionIds=new Set(Array.isArray(existing.linkedSectionIds)?existing.linkedSectionIds.map(String):[]);
  if(material.linkedSectionId) linkedSectionIds.add(String(material.linkedSectionId));
  return normalizeSourceRegistryItem({
    ...existing,
    id:existing.id||`source:${materialId}`,
    materialId,
    title:existing.title||material.name||'Untitled source',
    sourceType:existing.sourceType&&existing.sourceType!=='unknown'?existing.sourceType:materialSourceType(material),
    sourceKind:material.sourceKind||existing.sourceKind||'material',
    mimeType:material.mimeType||existing.mimeType||'',
    extension:material.extension||existing.extension||'',
    fileName:material.name||existing.fileName||'',
    localPathLabel:existing.localPathLabel||material.localPathLabel||'',
    linkedCompanyId:material.linkedCompanyId||existing.linkedCompanyId||'',
    linkedSectionIds:[...linkedSectionIds],
    extractedTextStatus:existing.extractedTextStatus||defaultSourceTextStatus(material),
    evidenceStatus:existing.evidenceStatus||'unused',
    credibilityStatus:existing.credibilityStatus||'unreviewed',
    notes:existing.notes||'',
    createdAt:existing.createdAt||material.createdAt||now,
    updatedAt:now
  });
}
function buildSourcesFromMaterials(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const materials=normalizeMaterialsInventory(report).items||[];
  const registry=normalizeSourceRegistry(report);
  const priorItems=registry.items||[];
  const priorByMaterial=new Map(priorItems.filter(item=>item.materialId).map(item=>[String(item.materialId),item]));
  const priorById=new Map(priorItems.map(item=>[String(item.id),item]));
  const materialIds=new Set(materials.map(item=>String(item.id)));
  const items=[];
  for(const material of materials){
    const sourceId=`source:${material.id}`;
    const prior=priorByMaterial.get(String(material.id))||priorById.get(sourceId);
    items.push(sourceFromMaterial(material, prior));
  }
  for(const prior of priorItems){
    const linked=Array.isArray(prior.linkedSectionIds)&&prior.linkedSectionIds.length;
    const hasManualValue=String(prior.notes||'').trim()||linked||String(prior.url||'').trim();
    if(prior.materialId && materialIds.has(String(prior.materialId))) continue;
    if(!prior.materialId || hasManualValue) items.push(normalizeSourceRegistryItem(prior));
  }
  report.sourceRegistry={items, updatedAt:new Date().toISOString()};
  return report.sourceRegistry;
}
function getSourceById(reportData, sourceId){
  const registry=normalizeSourceRegistry(reportData);
  return (registry.items||[]).find(source=>source.id===sourceId)||null;
}
function linkSourceToSection(reportData, sourceId, sectionId){
  const source=getSourceById(reportData, sourceId);
  const section=getReportSection(reportData, sectionId);
  if(!source||!section) return null;
  const ids=new Set(Array.isArray(source.linkedSectionIds)?source.linkedSectionIds:[]);
  ids.add(section.id);
  source.linkedSectionIds=[...ids];
  source.updatedAt=new Date().toISOString();
  return source;
}
function updateSourceRegistryItem(reportData, sourceId, patch){
  const source=getSourceById(reportData, sourceId);
  if(!source) return null;
  Object.assign(source, patch&&typeof patch==='object'?patch:{});
  Object.assign(source, normalizeSourceRegistryItem(source));
  source.updatedAt=new Date().toISOString();
  return source;
}
function createDefaultCompetitorProfiles(){return {items:[], updatedAt:null};}
function normalizeStringArray(value){
  return [...new Set((Array.isArray(value)?value:[]).map(String).map(s=>s.trim()).filter(Boolean))];
}
function normalizeCompetitorProfileItem(input={}){
  const now=new Date().toISOString();
  const out=input&&typeof input==='object'?{...input}:{};
  out.id=String(out.id||out.competitorId||out.companyId||uid('competitor'));
  out.name=String(out.name||'').trim();
  out.website=String(out.website||'').trim();
  out.category=String(out.category||'').trim();
  out.market=String(out.market||'').trim();
  out.country=String(out.country||'').trim();
  out.shortDescription=String(out.shortDescription||out.description||'').trim();
  out.positioning=String(out.positioning||'').trim();
  out.pricingNotes=String(out.pricingNotes||'').trim();
  out.featureNotes=String(out.featureNotes||'').trim();
  out.channelNotes=String(out.channelNotes||out.contentNotes||'').trim();
  out.seoNotes=String(out.seoNotes||'').trim();
  out.messagingNotes=String(out.messagingNotes||'').trim();
  out.strengths=String(out.strengths||'').trim();
  out.weaknesses=String(out.weaknesses||'').trim();
  out.risks=String(out.risks||'').trim();
  out.opportunities=String(out.opportunities||'').trim();
  out.priority=COMPETITOR_PRIORITY.includes(String(out.priority))?String(out.priority):'medium';
  out.status=COMPETITOR_PROFILE_STATUS.includes(String(out.status))?String(out.status):'active';
  out.linkedMaterialIds=normalizeStringArray(out.linkedMaterialIds);
  out.linkedSourceIds=normalizeStringArray(out.linkedSourceIds);
  out.linkedEvidenceCardIds=normalizeStringArray(out.linkedEvidenceCardIds);
  out.linkedSectionIds=normalizeStringArray(out.linkedSectionIds);
  out.confidenceStatus=EVIDENCE_CONFIDENCE_STATUS.includes(String(out.confidenceStatus))?String(out.confidenceStatus):'unknown';
  out.reviewStatus=COMPETITOR_REVIEW_STATUS.includes(String(out.reviewStatus))?String(out.reviewStatus):'draft';
  if(out.reviewStatus==='approved' && !input.reviewedAt) out.reviewStatus='needs_review';
  out.analystNotes=String(out.analystNotes||'').trim();
  out.createdAt=String(out.createdAt||now);
  out.updatedAt=String(out.updatedAt||out.createdAt);
  return out;
}
function normalizeCompetitorProfiles(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  report.competitorProfiles=report.competitorProfiles&&typeof report.competitorProfiles==='object'?report.competitorProfiles:createDefaultCompetitorProfiles();
  const existing=Array.isArray(report.competitorProfiles.items)?report.competitorProfiles.items:[];
  const byId=new Map();
  for(const item of existing){
    const profile=normalizeCompetitorProfileItem(item);
    if(profile.name) byId.set(profile.id,profile);
  }
  for(const co of (report.companies||[]).filter(c=>c&&c.type!=='client')){
    const id=String(co.id||stableId('competitor',co.name||'competitor'));
    if(byId.has(id)) continue;
    byId.set(id,normalizeCompetitorProfileItem({id,name:co.name||'',website:co.website||'',category:co.category||'',market:co.market||'',shortDescription:co.description||co.notes||'',priority:co.priority||'medium',status:'active',reviewStatus:'draft',createdAt:co.createdAt}));
  }
  const materialIds=new Set((report.materialsInventory?.items||[]).map(item=>item.id));
  const sourceIds=new Set((report.sourceRegistry?.items||[]).map(item=>item.id));
  const evidenceIds=new Set((report.evidenceCards?.items||[]).map(item=>item.id));
  const sectionIds=new Set((report.reportSections||[]).map(item=>item.id));
  report.competitorProfiles.items=[...byId.values()].map(profile=>{
    profile.linkedMaterialIds=profile.linkedMaterialIds.filter(id=>materialIds.has(id)||String(id).startsWith('file:')||String(id).startsWith('dataset:'));
    profile.linkedSourceIds=profile.linkedSourceIds.filter(id=>sourceIds.has(id));
    profile.linkedEvidenceCardIds=profile.linkedEvidenceCardIds.filter(id=>evidenceIds.has(id));
    profile.linkedSectionIds=profile.linkedSectionIds.filter(id=>sectionIds.has(id));
    return profile;
  }).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  report.competitorProfiles.updatedAt=report.competitorProfiles.updatedAt||null;
  return report.competitorProfiles;
}
function createCompetitorProfile(input){
  const profile=normalizeCompetitorProfileItem({...(input||{}),id:(input&&input.id)||uid('competitor'),reviewStatus:(input&&input.reviewStatus)||'draft',status:(input&&input.status)||'active'});
  if(!profile.name) throw new Error('Competitor name is required.');
  return profile;
}
function getCompetitorProfileById(reportData, competitorId){
  return (normalizeCompetitorProfiles(reportData).items||[]).find(profile=>profile.id===competitorId)||null;
}
function updateCompetitorProfile(reportData, competitorId, patch){
  const profiles=normalizeCompetitorProfiles(reportData);
  const profile=(profiles.items||[]).find(item=>item.id===competitorId);
  if(!profile) return null;
  const next=normalizeCompetitorProfileItem({...profile,...(patch||{}),id:profile.id,updatedAt:new Date().toISOString()});
  if(!next.name) throw new Error('Competitor name is required.');
  Object.assign(profile,next);
  profiles.updatedAt=new Date().toISOString();
  const co=ensureCompany(profile.name,'competitor',reportData);
  if(co){co.website=profile.website||co.website||''; co.category=profile.category||co.category||''; co.market=profile.market||co.market||''; co.notes=profile.shortDescription||co.notes||'';}
  return profile;
}
function deleteCompetitorProfile(reportData, competitorId){return archiveCompetitorProfile(reportData,competitorId);}
function archiveCompetitorProfile(reportData, competitorId){return updateCompetitorProfile(reportData,competitorId,{status:'archived',updatedAt:new Date().toISOString()});}
function linkCompetitorToSource(reportData, competitorId, sourceId){
  const profile=getCompetitorProfileById(reportData,competitorId), source=getSourceById(reportData,sourceId);
  if(!profile||!source) return null;
  if(!profile.linkedSourceIds.includes(source.id)) profile.linkedSourceIds.push(source.id);
  source.linkedCompanyId=profile.id;
  profile.updatedAt=source.updatedAt=new Date().toISOString();
  return profile;
}
function linkCompetitorToEvidence(reportData, competitorId, evidenceCardId){
  const profile=getCompetitorProfileById(reportData,competitorId), card=getEvidenceCardById(reportData,evidenceCardId);
  if(!profile||!card) return null;
  if(!profile.linkedEvidenceCardIds.includes(card.id)) profile.linkedEvidenceCardIds.push(card.id);
  updateEvidenceCard(reportData,card.id,{competitorId:profile.id,companyId:profile.id});
  profile.updatedAt=new Date().toISOString();
  return profile;
}
function linkCompetitorToMaterial(reportData, competitorId, materialId){
  const profile=getCompetitorProfileById(reportData,competitorId);
  const material=(normalizeMaterialsInventory(reportData).items||[]).find(item=>item.id===materialId);
  if(!profile||!material) return null;
  if(!profile.linkedMaterialIds.includes(material.id)) profile.linkedMaterialIds.push(material.id);
  material.linkedCompanyId=profile.id;
  material.updatedAt=profile.updatedAt=new Date().toISOString();
  return profile;
}
function getEvidenceCardsByCompetitor(reportData, competitorId){return getCompetitorEvidence(reportData,competitorId);}
function getCompetitorEvidence(reportData, competitorId){
  const profile=getCompetitorProfileById(reportData,competitorId);
  const ids=new Set(profile?.linkedEvidenceCardIds||[]);
  return (normalizeEvidenceCards(reportData).items||[]).filter(card=>ids.has(card.id)||card.competitorId===competitorId||card.companyId===competitorId);
}
function getCompetitorSources(reportData, competitorId){
  const profile=getCompetitorProfileById(reportData,competitorId);
  const ids=new Set(profile?.linkedSourceIds||[]);
  return (normalizeSourceRegistry(reportData).items||[]).filter(source=>ids.has(source.id)||source.linkedCompanyId===competitorId);
}
function getCompetitorMaterials(reportData, competitorId){
  const profile=getCompetitorProfileById(reportData,competitorId);
  const ids=new Set(profile?.linkedMaterialIds||[]);
  return (normalizeMaterialsInventory(reportData).items||[]).filter(item=>ids.has(item.id)||item.linkedCompanyId===competitorId);
}
function createDefaultPricingFeatureMatrix(){
  const now=new Date().toISOString();
  return {id:'pricing-feature-matrix',title:'Pricing & Feature Matrix',description:'',clientCompanyId:'',competitorIds:[],pricingTiers:[],featureRows:[],matrixCells:[],notes:'',reviewStatus:'draft',confidenceStatus:'unknown',createdAt:now,updatedAt:now};
}
function normalizePricingTier(tier={}){
  const now=new Date().toISOString();
  const out={...tier};
  out.id=String(out.id||uid('tier'));
  out.companyId=String(out.companyId||'');
  out.competitorId=String(out.competitorId||out.companyId||'');
  out.tierName=String(out.tierName||'').trim();
  out.priceAmount=String(out.priceAmount??'').trim();
  out.priceCurrency=String(out.priceCurrency||'USD').trim().slice(0,12);
  out.pricePeriod=PRICE_PERIODS.includes(String(out.pricePeriod))?String(out.pricePeriod):'unknown';
  out.priceLabel=String(out.priceLabel||'').trim();
  out.billingNotes=String(out.billingNotes||'').trim();
  out.includedSeats=String(out.includedSeats||'').trim();
  out.usageLimits=String(out.usageLimits||'').trim();
  out.targetSegment=String(out.targetSegment||'').trim();
  out.publicPricingAvailable=PUBLIC_PRICING_STATUS.includes(String(out.publicPricingAvailable))?String(out.publicPricingAvailable):'unknown';
  out.sourceIds=normalizeStringArray(out.sourceIds);
  out.evidenceCardIds=normalizeStringArray(out.evidenceCardIds);
  out.confidenceStatus=EVIDENCE_CONFIDENCE_STATUS.includes(String(out.confidenceStatus))?String(out.confidenceStatus):'unknown';
  out.reviewStatus=COMPETITOR_REVIEW_STATUS.includes(String(out.reviewStatus))?String(out.reviewStatus):'draft';
  if(out.reviewStatus==='approved' && !tier.reviewedAt) out.reviewStatus='needs_review';
  out.analystNotes=String(out.analystNotes||'').trim();
  out.createdAt=String(out.createdAt||now);
  out.updatedAt=String(out.updatedAt||out.createdAt);
  return out;
}
function normalizeFeatureRow(row={}){
  const now=new Date().toISOString();
  const out={...row};
  out.id=String(out.id||uid('feature'));
  out.featureName=String(out.featureName||'').trim();
  out.category=FEATURE_CATEGORIES.includes(String(out.category))?String(out.category):'other';
  out.description=String(out.description||'').trim();
  out.importance=COMPETITOR_PRIORITY.includes(String(out.importance))?String(out.importance):'medium';
  out.clientRelevance=String(out.clientRelevance||'').trim();
  out.sourceIds=normalizeStringArray(out.sourceIds);
  out.evidenceCardIds=normalizeStringArray(out.evidenceCardIds);
  out.createdAt=String(out.createdAt||now);
  out.updatedAt=String(out.updatedAt||out.createdAt);
  return out;
}
function normalizeMatrixCell(cell={}){
  const now=new Date().toISOString();
  const out={...cell};
  out.rowId=String(out.rowId||'');
  out.companyId=String(out.companyId||out.competitorId||'');
  out.competitorId=String(out.competitorId||out.companyId||'');
  out.id=String(out.id||stableId('cell',out.rowId,out.competitorId||out.companyId));
  out.value=String(out.value||'').trim();
  out.normalizedValue=String(out.normalizedValue||'unknown').trim()||'unknown';
  out.availabilityStatus=MATRIX_AVAILABILITY_STATUS.includes(String(out.availabilityStatus))?String(out.availabilityStatus):'unknown';
  out.notes=String(out.notes||'').trim();
  out.sourceIds=normalizeStringArray(out.sourceIds);
  out.evidenceCardIds=normalizeStringArray(out.evidenceCardIds);
  out.confidenceStatus=EVIDENCE_CONFIDENCE_STATUS.includes(String(out.confidenceStatus))?String(out.confidenceStatus):'unknown';
  out.reviewStatus=COMPETITOR_REVIEW_STATUS.includes(String(out.reviewStatus))?String(out.reviewStatus):'draft';
  if(out.reviewStatus==='approved' && !cell.lastReviewedAt) out.reviewStatus='needs_review';
  if(!out.sourceIds.length&&!out.evidenceCardIds.length&&out.reviewStatus==='approved') out.reviewStatus='needs_review';
  out.lastReviewedAt=String(out.lastReviewedAt||'');
  out.createdAt=String(out.createdAt||now);
  out.updatedAt=String(out.updatedAt||out.createdAt);
  return out;
}
function createPricingFeatureMatrix(input){
  const matrix={...createDefaultPricingFeatureMatrix(),...(input||{})};
  matrix.reviewStatus=COMPETITOR_REVIEW_STATUS.includes(String(matrix.reviewStatus))?String(matrix.reviewStatus):'draft';
  if(matrix.reviewStatus==='approved'&&!input?.reviewedAt) matrix.reviewStatus='needs_review';
  matrix.confidenceStatus=EVIDENCE_CONFIDENCE_STATUS.includes(String(matrix.confidenceStatus))?String(matrix.confidenceStatus):'unknown';
  matrix.competitorIds=normalizeStringArray(matrix.competitorIds);
  matrix.pricingTiers=(Array.isArray(matrix.pricingTiers)?matrix.pricingTiers:[]).map(normalizePricingTier);
  matrix.featureRows=(Array.isArray(matrix.featureRows)?matrix.featureRows:[]).map(normalizeFeatureRow).filter(row=>row.featureName);
  matrix.matrixCells=(Array.isArray(matrix.matrixCells)?matrix.matrixCells:[]).map(normalizeMatrixCell).filter(cell=>cell.rowId&&(cell.companyId||cell.competitorId));
  return matrix;
}
function normalizePricingFeatureMatrix(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const base=createPricingFeatureMatrix(report.pricingFeatureMatrix&&typeof report.pricingFeatureMatrix==='object'?report.pricingFeatureMatrix:{});
  const competitorIds=new Set((normalizeCompetitorProfiles(report).items||[]).filter(profile=>profile.status!=='ignored').map(profile=>profile.id));
  const client=(report.companies||[]).find(c=>c.type==='client');
  base.clientCompanyId=String(base.clientCompanyId||client?.id||'');
  base.competitorIds=base.competitorIds.filter(id=>competitorIds.has(id));
  const sourceIds=new Set((report.sourceRegistry?.items||[]).map(source=>source.id));
  const evidenceIds=new Set((report.evidenceCards?.items||[]).map(card=>card.id));
  const rowIds=new Set(base.featureRows.map(row=>row.id));
  const cleanLinks=item=>{item.sourceIds=(item.sourceIds||[]).filter(id=>sourceIds.has(id)); item.evidenceCardIds=(item.evidenceCardIds||[]).filter(id=>evidenceIds.has(id)); return item;};
  base.pricingTiers=base.pricingTiers.map(cleanLinks);
  base.featureRows=base.featureRows.map(cleanLinks);
  base.matrixCells=base.matrixCells.filter(cell=>rowIds.has(cell.rowId)).map(cleanLinks);
  report.pricingFeatureMatrix=base;
  return base;
}
function getPricingFeatureMatrix(reportData){return normalizePricingFeatureMatrix(reportData);}
function updatePricingFeatureMatrix(reportData, patch){
  const matrix=normalizePricingFeatureMatrix(reportData);
  Object.assign(matrix,patch&&typeof patch==='object'?patch:{}, {updatedAt:new Date().toISOString()});
  reportData.pricingFeatureMatrix=createPricingFeatureMatrix(matrix);
  return reportData.pricingFeatureMatrix;
}
function addMatrixCompetitor(reportData, competitorId){
  const profile=getCompetitorProfileById(reportData,competitorId);
  if(!profile||profile.status==='archived'||profile.status==='ignored') return null;
  const matrix=normalizePricingFeatureMatrix(reportData);
  if(!matrix.competitorIds.includes(profile.id)) matrix.competitorIds.push(profile.id);
  matrix.updatedAt=new Date().toISOString();
  return matrix;
}
function removeMatrixCompetitor(reportData, competitorId){
  const matrix=normalizePricingFeatureMatrix(reportData);
  matrix.competitorIds=matrix.competitorIds.filter(id=>id!==competitorId);
  matrix.updatedAt=new Date().toISOString();
  return matrix;
}
function addPricingTier(reportData,input){const matrix=normalizePricingFeatureMatrix(reportData); const tier=normalizePricingTier(input); matrix.pricingTiers.push(tier); matrix.updatedAt=new Date().toISOString(); return tier;}
function updatePricingTier(reportData,tierId,patch){const tier=normalizePricingFeatureMatrix(reportData).pricingTiers.find(item=>item.id===tierId); if(!tier) return null; Object.assign(tier,normalizePricingTier({...tier,...(patch||{}),id:tier.id,updatedAt:new Date().toISOString()})); return tier;}
function deletePricingTier(reportData,tierId){const matrix=normalizePricingFeatureMatrix(reportData); matrix.pricingTiers=matrix.pricingTiers.filter(item=>item.id!==tierId); matrix.updatedAt=new Date().toISOString(); return matrix;}
function addFeatureRow(reportData,input){const matrix=normalizePricingFeatureMatrix(reportData); const row=normalizeFeatureRow(input); if(!row.featureName) throw new Error('Feature name is required.'); matrix.featureRows.push(row); matrix.updatedAt=new Date().toISOString(); return row;}
function updateFeatureRow(reportData,featureId,patch){const row=normalizePricingFeatureMatrix(reportData).featureRows.find(item=>item.id===featureId); if(!row) return null; Object.assign(row,normalizeFeatureRow({...row,...(patch||{}),id:row.id,updatedAt:new Date().toISOString()})); if(!row.featureName) throw new Error('Feature name is required.'); return row;}
function deleteFeatureRow(reportData,featureId){const matrix=normalizePricingFeatureMatrix(reportData); matrix.featureRows=matrix.featureRows.filter(item=>item.id!==featureId); matrix.matrixCells=matrix.matrixCells.filter(cell=>cell.rowId!==featureId); matrix.updatedAt=new Date().toISOString(); return matrix;}
function getMatrixCell(reportData,rowId,competitorId){const matrix=normalizePricingFeatureMatrix(reportData); return matrix.matrixCells.find(cell=>cell.rowId===rowId&&(cell.competitorId===competitorId||cell.companyId===competitorId))||null;}
function updateMatrixCell(reportData,rowId,competitorId,patch){
  const matrix=normalizePricingFeatureMatrix(reportData);
  let cell=getMatrixCell(reportData,rowId,competitorId);
  if(!cell){cell=normalizeMatrixCell({rowId,companyId:competitorId,competitorId}); matrix.matrixCells.push(cell);}
  Object.assign(cell,normalizeMatrixCell({...cell,...(patch||{}),rowId,companyId:competitorId,competitorId,updatedAt:new Date().toISOString()}));
  matrix.updatedAt=new Date().toISOString();
  return cell;
}
function linkMatrixCellToEvidence(reportData,rowId,competitorId,evidenceCardId){const card=getEvidenceCardById(reportData,evidenceCardId); if(!card) return null; const cell=updateMatrixCell(reportData,rowId,competitorId,{}); if(!cell.evidenceCardIds.includes(card.id)) cell.evidenceCardIds.push(card.id); updateEvidenceCard(reportData,card.id,{matrixCellId:cell.id,featureRowId:rowId}); return cell;}
function linkMatrixCellToSource(reportData,rowId,competitorId,sourceId){const source=getSourceById(reportData,sourceId); if(!source) return null; const cell=updateMatrixCell(reportData,rowId,competitorId,{}); if(!cell.sourceIds.includes(source.id)) cell.sourceIds.push(source.id); return cell;}
function getEvidenceCardsByMatrixCell(reportData,rowId,competitorId){const cell=getMatrixCell(reportData,rowId,competitorId); const ids=new Set(cell?.evidenceCardIds||[]); return (normalizeEvidenceCards(reportData).items||[]).filter(card=>ids.has(card.id)||card.matrixCellId===cell?.id);}
function getMatrixCellsNeedingReview(reportData){return (normalizePricingFeatureMatrix(reportData).matrixCells||[]).filter(cell=>cell.reviewStatus!=='approved'||!cell.sourceIds.length&&!cell.evidenceCardIds.length||getEvidenceCardsByMatrixCell(reportData,cell.rowId,cell.competitorId).some(card=>card.reviewStatus==='rejected'));}
function getMatrixEvidenceCoverage(reportData){
  const matrix=normalizePricingFeatureMatrix(reportData), cells=matrix.matrixCells||[];
  if(!cells.length) return {total:0,covered:0,approvedEvidence:0,score:0};
  let covered=0, approvedEvidence=0;
  for(const cell of cells){const evidence=getEvidenceCardsByMatrixCell(reportData,cell.rowId,cell.competitorId).filter(card=>card.reviewStatus!=='rejected'); if(cell.sourceIds.length||evidence.length) covered++; if(evidence.some(card=>card.reviewStatus==='approved')) approvedEvidence++;}
  return {total:cells.length,covered,approvedEvidence,score:Math.round((covered/cells.length)*100)};
}
function suggestMatrixRowsFromImportedTable(reportData, tableId){
  const table=(reportData.tables||[]).find(t=>t.id===tableId), ds=table?dataset(table.datasetId):null;
  if(!ds) return [];
  return columns(ds).map(c=>c.name).filter(name=>/price|pricing|tier|feature|plan|limit|seat|integration|security|support|analytics|automation|report/i.test(name)).slice(0,12).map(name=>({featureName:name,category:/price|tier|plan/i.test(name)?'pricing':'other',sourceDatasetId:ds.id,requiresConfirmation:true}));
}
function createDefaultEvidenceCards(){
  return {items:[], updatedAt:null};
}
function normalizeEvidenceCardItem(item){
  const out=item&&typeof item==='object'?{...item}:{};
  out.id=String(out.id||uid('evidence'));
  out.claim=String(out.claim||'');
  out.summary=String(out.summary||'');
  out.sourceIds=Array.isArray(out.sourceIds)?out.sourceIds.map(String).filter(Boolean):[];
  out.sectionId=String(out.sectionId||'');
  out.materialIds=Array.isArray(out.materialIds)?out.materialIds.map(String).filter(Boolean):[];
  out.companyId=String(out.companyId||'');
  out.competitorId=String(out.competitorId||'');
  out.evidenceType=EVIDENCE_TYPES.includes(String(out.evidenceType))?String(out.evidenceType):'observation';
  out.reviewStatus=EVIDENCE_REVIEW_STATUS.includes(String(out.reviewStatus))?String(out.reviewStatus):'draft';
  out.confidenceStatus=EVIDENCE_CONFIDENCE_STATUS.includes(String(out.confidenceStatus))?String(out.confidenceStatus):'unknown';
  out.credibilityStatus=EVIDENCE_CREDIBILITY_STATUS.includes(String(out.credibilityStatus))?String(out.credibilityStatus):'unreviewed';
  out.analystNotes=String(out.analystNotes||'');
  out.reviewedAt=String(out.reviewedAt||'');
  out.reviewedBy=String(out.reviewedBy||'');
  out.reviewNotes=String(out.reviewNotes||'');
  out.rejectionReason=String(out.rejectionReason||'');
  out.generatedBy=String(out.generatedBy||'');
  out.createdAt=String(out.createdAt||'');
  out.updatedAt=String(out.updatedAt||out.createdAt||'');
  return out;
}
function normalizeEvidenceCards(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const cards=Array.isArray(report.evidenceCards)
    ? {items:report.evidenceCards, updatedAt:null}
    : (report.evidenceCards&&typeof report.evidenceCards==='object'
      ? report.evidenceCards
      : createDefaultEvidenceCards());
  cards.items=Array.isArray(cards.items)?cards.items.map(normalizeEvidenceCardItem):[];
  cards.updatedAt=cards.updatedAt||null;
  report.evidenceCards=cards;
  return cards;
}
function createEvidenceCard(input={}){
  const now=new Date().toISOString();
  return normalizeEvidenceCardItem({
    id:uid('evidence'),
    claim:'',
    summary:'',
    sourceIds:[],
    sectionId:'',
    materialIds:[],
    companyId:'',
    competitorId:'',
    evidenceType:'observation',
    reviewStatus:'draft',
    confidenceStatus:'unknown',
    credibilityStatus:'unreviewed',
    analystNotes:'',
    reviewedAt:'',
    reviewedBy:'',
    reviewNotes:'',
    rejectionReason:'',
    createdAt:now,
    updatedAt:now,
    ...(input&&typeof input==='object'?input:{})
  });
}
function getEvidenceCardById(reportData, evidenceCardId){
  const cards=normalizeEvidenceCards(reportData);
  return (cards.items||[]).find(card=>card.id===evidenceCardId)||null;
}
function updateEvidenceCard(reportData, evidenceCardId, patch){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const card=getEvidenceCardById(report, evidenceCardId);
  if(!card) return null;
  Object.assign(card, patch&&typeof patch==='object'?patch:{});
  Object.assign(card, normalizeEvidenceCardItem(card));
  card.updatedAt=new Date().toISOString();
  report.evidenceCards.updatedAt=card.updatedAt;
  return card;
}
function deleteEvidenceCard(reportData, evidenceCardId){
  const cards=normalizeEvidenceCards(reportData);
  const before=cards.items.length;
  cards.items=cards.items.filter(card=>card.id!==evidenceCardId);
  if(cards.items.length!==before) cards.updatedAt=new Date().toISOString();
  return cards.items.length!==before;
}
function getEvidenceCardsBySection(reportData, sectionId){
  const cards=normalizeEvidenceCards(reportData);
  return (cards.items||[]).filter(card=>card.sectionId===sectionId);
}
function getEvidenceCardsBySource(reportData, sourceId){
  const cards=normalizeEvidenceCards(reportData);
  return (cards.items||[]).filter(card=>(card.sourceIds||[]).includes(sourceId));
}
function reviewActorLabel(){
  return String(cloudSync.user?.email||cloudSync.user?.name||REPORT.meta?.reviewerName||'local analyst');
}
function setEvidenceReviewStatus(reportData, evidenceCardId, reviewStatus){
  if(!EVIDENCE_REVIEW_STATUS.includes(String(reviewStatus))) return null;
  const now=new Date().toISOString();
  const patch={reviewStatus:String(reviewStatus), reviewedAt:now, reviewedBy:reviewActorLabel()};
  if(reviewStatus!=='rejected') patch.rejectionReason='';
  return updateEvidenceCard(reportData,evidenceCardId,patch);
}
function approveEvidenceCard(reportData, evidenceCardId){
  return setEvidenceReviewStatus(reportData,evidenceCardId,'approved');
}
function rejectEvidenceCard(reportData, evidenceCardId){
  return setEvidenceReviewStatus(reportData,evidenceCardId,'rejected');
}
function markEvidenceNeedsReview(reportData, evidenceCardId){
  return setEvidenceReviewStatus(reportData,evidenceCardId,'needs_review');
}
function updateEvidenceAnalystNotes(reportData, evidenceCardId, notes){
  return updateEvidenceCard(reportData,evidenceCardId,{reviewNotes:String(notes||'')});
}
function getEvidenceCardsForReview(reportData, filters={}){
  const cards=normalizeEvidenceCards(reportData).items||[];
  const status=String(filters.reviewStatus||filters.status||'all');
  return status==='all'?cards:cards.filter(card=>card.reviewStatus===status);
}
function getApprovedEvidenceCards(reportData){
  return getEvidenceCardsForReview(reportData,{reviewStatus:'approved'});
}
function draftBlockTypeForEvidence(evidenceCard){
  const map={
    fact:'paragraph',
    metric:'metric',
    quote:'paragraph',
    observation:'paragraph',
    comparison:'comparison_note',
    risk:'risk_note',
    opportunity:'opportunity_note',
    recommendation_input:'recommendation_note'
  };
  return map[String(evidenceCard?.evidenceType||'')]||'paragraph';
}
function normalizeDraftBlock(block){
  const out=block&&typeof block==='object'?{...block}:{};
  out.id=String(out.id||uid('draft'));
  out.type=DRAFT_BLOCK_TYPES.includes(String(out.type))?String(out.type):'paragraph';
  out.title=String(out.title||'Draft note');
  out.text=String(out.text||'');
  out.sectionId=String(out.sectionId||'');
  out.evidenceCardIds=Array.isArray(out.evidenceCardIds)?out.evidenceCardIds.map(String).filter(Boolean):[];
  out.sourceIds=Array.isArray(out.sourceIds)?out.sourceIds.map(String).filter(Boolean):[];
  out.generatedBy=String(out.generatedBy||'rule_based');
  out.createdAt=String(out.createdAt||'');
  out.updatedAt=String(out.updatedAt||out.createdAt||'');
  out.status=DRAFT_BLOCK_STATUS.includes(String(out.status))?String(out.status):'draft';
  return out;
}
function mapEvidenceToReportSection(reportData, evidenceCard){
  const preferred=String(evidenceCard?.sectionId||'');
  if(preferred && getReportSection(reportData,preferred)) return preferred;
  const type=String(evidenceCard?.evidenceType||'');
  if(type==='risk'||type==='opportunity') return 'risksOpportunities';
  if(type==='recommendation_input') return 'recommendations';
  if(type==='comparison') return 'competitiveLandscape';
  return 'sourcesEvidence';
}
function createDraftBlockFromEvidence(evidenceCard, sources){
  const now=new Date().toISOString();
  const sourceIds=[...new Set([...(evidenceCard.sourceIds||[]),...(sources||[]).map(source=>source.id).filter(Boolean)])];
  const text=String(evidenceCard.claim||evidenceCard.summary||'').trim();
  const type=draftBlockTypeForEvidence(evidenceCard);
  return normalizeDraftBlock({
    id:uid('draft'),
    type,
    title:String(evidenceCard.evidenceType||'evidence').replace(/_/g,' '),
    text,
    sectionId:evidenceCard.sectionId||'',
    evidenceCardIds:[evidenceCard.id],
    sourceIds,
    generatedBy:'rule_based',
    createdAt:now,
    updatedAt:now,
    status:'draft'
  });
}
function buildDraftBlocksForSection(reportData, sectionId){
  const report=normalizeReportSchema(reportData);
  normalizeSourceRegistry(report);
  const sourceMap=new Map((report.sourceRegistry.items||[]).map(source=>[source.id,source]));
  return getApprovedEvidenceCards(report)
    .filter(card=>mapEvidenceToReportSection(report,card)===sectionId)
    .map(card=>{
      const sources=(card.sourceIds||[]).map(id=>sourceMap.get(id)).filter(Boolean);
      const block=createDraftBlockFromEvidence({...card,sectionId},sources);
      block.sectionId=sectionId;
      return block;
    })
    .filter(block=>block.text);
}
function clearGeneratedDraftBlocks(reportData){
  const report=normalizeReportSchema(reportData);
  let removed=0;
  for(const section of (report.reportSections||[])){
    const before=Array.isArray(section.blocks)?section.blocks.length:0;
    section.blocks=(section.blocks||[]).filter(block=>String(block?.generatedBy||'')!=='rule_based');
    removed += before-section.blocks.length;
    if(section.blocks.length===0 && section.status==='draft') section.status='empty';
  }
  return removed;
}
function buildRuleBasedReportDraft(reportData){
  const report=normalizeReportSchema(reportData);
  normalizeEvidenceCards(report);
  normalizeSourceRegistry(report);
  clearGeneratedDraftBlocks(report);
  let blocksCreated=0;
  const sectionsTouched=new Set();
  for(const section of (report.reportSections||[])){
    const blocks=buildDraftBlocksForSection(report,section.id);
    if(!blocks.length) continue;
    section.blocks=[...(section.blocks||[]),...blocks];
    section.status=section.status==='approved'?'approved':'draft';
    section.updatedAt=new Date().toISOString();
    blocksCreated += blocks.length;
    sectionsTouched.add(section.id);
  }
  return {blocksCreated, sectionsTouched:[...sectionsTouched]};
}
function isBlockClientVisible(block){
  if(!block || typeof block!=='object') return false;
  const status=String(block.status||'draft');
  return DRAFT_BLOCK_STATUS.includes(status) && String(block.text||'').trim();
}
function isEvidenceClientVisible(evidenceCard){
  return evidenceCard && evidenceCard.reviewStatus==='approved';
}
function clientBlockSort(a,b){
  const rank={approved:0,needs_review:1,draft:2};
  return (rank[String(a.status||'draft')]??9)-(rank[String(b.status||'draft')]??9);
}
function buildClientExportDataV2(reportData){
  const report=normalizeReportSchema(clone(reportData||{}));
  normalizeSourceRegistry(report);
  normalizeEvidenceCards(report);
  const visibleEvidence=(report.evidenceCards.items||[]).filter(isEvidenceClientVisible);
  const evidenceIds=new Set(visibleEvidence.map(card=>card.id));
  const usedSourceIds=new Set();
  const sections=(report.reportSections||[]).map(section=>{
    const blocks=(section.blocks||[])
      .map(normalizeDraftBlock)
      .filter(isBlockClientVisible)
      .filter(block=>!(block.evidenceCardIds||[]).length || (block.evidenceCardIds||[]).some(id=>evidenceIds.has(id)))
      .sort(clientBlockSort);
    for(const block of blocks) (block.sourceIds||[]).forEach(id=>usedSourceIds.add(id));
    return {
      id:section.id,
      title:section.title,
      order:section.order,
      blocks
    };
  }).filter(section=>section.blocks.length);
  for(const card of visibleEvidence) (card.sourceIds||[]).forEach(id=>usedSourceIds.add(id));
  const sectionTitles=new Map((report.reportSections||[]).map(section=>[section.id,section.title]));
  const sources=(report.sourceRegistry.items||[])
    .filter(source=>usedSourceIds.has(source.id))
    .map(source=>({
      id:source.id,
      title:source.title,
      sourceType:source.sourceType,
      credibilityStatus:source.credibilityStatus,
      linkedSectionIds:(source.linkedSectionIds||[]).filter(Boolean),
      linkedSections:(source.linkedSectionIds||[]).map(id=>sectionTitles.get(id)).filter(Boolean)
    }));
  const evidence=visibleEvidence.map(card=>({
    id:card.id,
    claim:card.claim,
    summary:card.summary,
    sectionId:card.sectionId,
    sourceIds:card.sourceIds||[],
    evidenceType:card.evidenceType,
    confidenceStatus:card.confidenceStatus,
    credibilityStatus:card.credibilityStatus
  }));
  return {
    clientExportVersion:2,
    generatedAt:new Date().toISOString(),
    title:report.meta?.title||'Marketing Report Studio',
    sections,
    sources,
    evidence
  };
}
function prepareClientExportReportV2(reportData){
  const report=clone(reportData||{});
  report.meta=report.meta||{};
  if(Number(report.reportSchemaVersion)>=REPORT_SCHEMA_VERSION && Array.isArray(report.reportSections)){
    report.meta.clientExportVersion=2;
    report.clientExportV2=buildClientExportDataV2(report);
    if(report.evidenceCards?.items){
      report.evidenceCards.items=(report.evidenceCards.items||[])
        .filter(isEvidenceClientVisible)
        .map(card=>{
          const out=normalizeEvidenceCardItem(card);
          delete out.analystNotes;
          delete out.reviewNotes;
          delete out.rejectionReason;
          delete out.reviewedBy;
          delete out.generatedBy;
          return out;
        });
    }
    if(report.sourceRegistry?.items){
      const usedSourceIds=new Set((report.clientExportV2.sources||[]).map(source=>source.id));
      report.sourceRegistry.items=(report.sourceRegistry.items||[])
        .filter(source=>usedSourceIds.has(source.id))
        .map(source=>({
          id:source.id,
          materialId:source.materialId,
          title:source.title,
          sourceType:source.sourceType,
          sourceKind:source.sourceKind,
          mimeType:source.mimeType,
          extension:source.extension,
          fileName:source.fileName,
          url:source.url,
          linkedCompanyId:source.linkedCompanyId,
          linkedSectionIds:source.linkedSectionIds,
          extractedTextStatus:source.extractedTextStatus,
          evidenceStatus:source.evidenceStatus,
          credibilityStatus:source.credibilityStatus,
          notes:'',
          createdAt:source.createdAt,
          updatedAt:source.updatedAt
        }));
    }
    if(report.files?.length){
      const usedFileIds=new Set((report.sourceRegistry?.items||[])
        .map(source=>String(source.materialId||'').replace(/^file:/,''))
        .filter(Boolean));
      report.files=(report.files||[])
        .filter(file=>usedFileIds.has(String(file.id||'')))
        .map(file=>({
          id:file.id,
          name:file.name,
          path:file.path,
          folder:file.folder,
          ext:file.ext,
          type:file.type,
          size:file.size,
          isData:Boolean(file.isData),
          companyId:file.companyId||'',
          createdAt:file.createdAt||''
        }));
    }
  }
  delete report.aiAssistance;
  delete report.aiReviewQueue;
  report.aiAuditLog=sanitizeAiAuditForClientExport(report);
  delete report.aiAuditLog;
  delete report.versionRetentionPolicy;
  delete report.versionRetentionState;
  delete report.governanceSettings;
  delete report.onboardingState;
  delete report.firstReportFlow;
  delete report.competitorProfiles;
  delete report.pricingFeatureMatrix;
  return report;
}
function sanitizeClientExportData(reportData){
  const report=prepareClientExportReportV2(clone(reportData||{}));
  report.meta=report.meta||{};
  report.meta.accessMode='viewer';
  report.meta.clientLocked=true;
  report.meta.clientPackageSanitized=true;
  delete report.meta.accessToken;
  delete report.meta.cloudflareAccessToken;
  delete report.meta.apiToken;
  delete report.meta.workspace;
  delete report.aiAssistance;
  delete report.aiReviewQueue;
  report.aiAuditLog=sanitizeAiAuditForClientExport(report);
  delete report.aiAuditLog;
  delete report.versionRetentionPolicy;
  delete report.versionRetentionState;
  delete report.governanceSettings;
  delete report.onboardingState;
  delete report.firstReportFlow;
  delete report.competitorProfiles;
  delete report.pricingFeatureMatrix;
  return report;
}
function buildSourcesIndexForExport(reportData){
  const report=sanitizeClientExportData(reportData);
  const sourceIds=new Set((report.clientExportV2?.sources||[]).map(source=>source.id));
  return (report.sourceRegistry?.items||[])
    .filter(source=>sourceIds.has(source.id))
    .map(source=>({
      id:source.id,
      title:source.title,
      sourceType:source.sourceType,
      fileName:source.fileName,
      linkedSectionIds:source.linkedSectionIds||[],
      credibilityStatus:source.credibilityStatus,
      evidenceStatus:source.evidenceStatus
    }));
}
function buildEvidenceSummaryForExport(reportData){
  const report=sanitizeClientExportData(reportData);
  const sections=new Map((report.reportSections||[]).map(section=>[section.id,section.title]));
  return (report.evidenceCards?.items||[])
    .filter(isEvidenceClientVisible)
    .map(card=>({
      id:card.id,
      claim:card.claim,
      summary:card.summary,
      linkedSectionId:card.sectionId,
      linkedSectionTitle:sections.get(card.sectionId)||'',
      sourceIds:card.sourceIds||[],
      confidenceStatus:card.confidenceStatus,
      credibilityStatus:card.credibilityStatus
    }));
}
function buildClientPackageManifest(reportData){
  const report=sanitizeClientExportData(reportData);
  return {
    packageVersion:1,
    exportedAt:new Date().toISOString(),
    reportTitle:report.meta?.title||'Marketing Report Studio',
    clientExportVersion:Number(report.meta?.clientExportVersion||0)||2,
    files:['report.html','report-data.json','sources-index.json','evidence-summary.json','README.txt','print.css']
  };
}
function buildClientReadmeText(reportData, assetCount=0){
  const manifest=buildClientPackageManifest(reportData);
  return [
    `${manifest.reportTitle} - Client Export Package`,
    '',
    'This package is a client-facing export from Marketing Report Studio.',
    '',
    'Included files:',
    '- report.html: open this file in a browser to view the client report.',
    '- report-data.json: sanitized client-facing report snapshot.',
    '- sources-index.json: source index used by the report.',
    '- evidence-summary.json: approved, client-safe evidence summary.',
    '- print.css: print/PDF-ready styles for report.html.',
    assetCount ? `- assets/: ${assetCount} exported source asset file(s).` : '- assets/: no separate asset files were available for this package.',
    '',
    'To create a PDF:',
    '1. Open report.html in a browser.',
    '2. Use Print.',
    '3. Choose Save as PDF.',
    '',
    'report.html is locked for client viewing and does not require cloud login or API access.',
    'Rejected evidence, review controls, editing controls, and analyst-only notes are not included.',
    '',
    `Exported at: ${manifest.exportedAt}`,
    `Package version: ${manifest.packageVersion}`,
    `Client export version: ${manifest.clientExportVersion}`,
    ''
  ].join('\n');
}
function buildPrintCss(){
  return [
    '@media print {',
    '  body { background: #fff !important; color: #111 !important; }',
    '  .topbar, .files, .analytics, .splitX, .splitY, .readerTabs, .appNotice, .toast, .adminOnly, .rolePill, .cloudStatus { display: none !important; }',
    '  .app, .layout, .reader, .readerBody { display: block !important; height: auto !important; overflow: visible !important; background: #fff !important; color: #111 !important; }',
    '  .reader { border: 0 !important; box-shadow: none !important; }',
    '  .clientReportV2 { max-width: 7.2in !important; margin: 0 auto !important; padding: 0 !important; }',
    '  .heroBlock, .widget, .clientBlock { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; background: #fff !important; color: #111 !important; }',
    '  .clientSection { break-before: auto; page-break-before: auto; margin-top: 18pt !important; }',
    '  .widgetHead, .widgetBody { background: #fff !important; color: #111 !important; border-color: #ccc !important; }',
    '  .itemMeta, .pill { color: #333 !important; border-color: #999 !important; }',
    '  a[href]::after { content: " (" attr(href) ")"; font-size: 9pt; }',
    '}',
    ''
  ].join('\n');
}
function injectPackagePrintCss(html, css){
  const style=`<style id="clientPackagePrintCss">\n${css.replace(/<\/style/gi,'<\\/style')}\n</style>`;
  return String(html||'').replace('</head>', `${style}\n</head>`);
}
async function buildClientPackageZip(reportData, reportHtml, zipEntries=[]){
  if(typeof JSZip==='undefined') throw new Error('JSZip is unavailable. Client package ZIP cannot be created.');
  const report=sanitizeClientExportData(reportData);
  const zip=new JSZip();
  const printCss=buildPrintCss();
  const assetEntries=Array.isArray(zipEntries)?zipEntries:[];
  zip.file('report.html', injectPackagePrintCss(reportHtml,printCss));
  zip.file('report-data.json', JSON.stringify(report,null,2));
  zip.file('sources-index.json', JSON.stringify(buildSourcesIndexForExport(report),null,2));
  zip.file('evidence-summary.json', JSON.stringify(buildEvidenceSummaryForExport(report),null,2));
  zip.file('README.txt', buildClientReadmeText(report,assetEntries.length));
  zip.file('print.css', printCss);
  zip.file('manifest.json', JSON.stringify(buildClientPackageManifest(report),null,2));
  for(const entry of assetEntries){
    if(!entry?.zipPath || !entry?.bytes) continue;
    zip.file(`assets/${entry.zipPath}`, entry.bytes);
  }
  return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
function scrubInternalValue(value){
  if(Array.isArray(value)) return value.map(scrubInternalValue);
  if(!value||typeof value!=='object') return value;
  const out={};
  for(const [key,val] of Object.entries(value)){
    if(/(api[_-]?key|token|secret|password|authorization|cookie|env|environment|cloudflareAccessToken|accessToken|privateKey|headers|stack|systemPrompt|hiddenPrompt|rawProvider|rawResponse|localHandle|handle)$/i.test(key)) continue;
    if(key==='localPathLabel' || key==='path') continue;
    out[key]=scrubInternalValue(val);
  }
  return out;
}
function sanitizeInternalAuditExport(data){
  return scrubInternalValue(clone(data||{}));
}
function buildInternalAuditManifest(reportData){
  const report=normalizeReport(clone(reportData||{}));
  const checklist=runReportQualityChecklist(report);
  return sanitizeInternalAuditExport({
    packageType:'internal_audit_package',
    packageVersion:1,
    exportedAt:new Date().toISOString(),
    reportTitle:report.meta?.title||'Marketing Report Studio',
    reportId:report.meta?.reportId||report.meta?.id||'',
    reportSchemaVersion:report.reportSchemaVersion||REPORT_SCHEMA_VERSION,
    clientExportVersion:report.meta?.clientExportVersion||report.clientExportV2?.clientExportVersion||null,
    auditEventCount:(report.aiAuditLog?.events||[]).length,
    reviewQueueItemCount:(report.aiReviewQueue?.items||[]).length,
    evidenceCardCount:(report.evidenceCards?.items||[]).length,
    sourceCount:(report.sourceRegistry?.items||[]).length,
    qualityReadinessStatus:checklist.status,
    exportedByRole:currentAiUser().role,
    actorLabel:reviewActorLabel(),
    files:['internal-report-audit.json','ai-review-queue.json','ai-provenance-log.json','evidence-cards.json','source-registry.json','source-coverage-summary.json','quality-checklist.json','report-sections-summary.json','materials-inventory.json','draft-blocks-summary.json','export-readiness-summary.json','README-internal.txt']
  });
}
function buildAiReviewQueueExport(reportData){
  const queue=normalizeAiReviewQueue(clone(reportData||{}));
  return sanitizeInternalAuditExport({items:(queue.items||[]).map(item=>({id:item.id,suggestionType:item.suggestionType,title:item.title,summary:item.summary,reviewStatus:item.reviewStatus,confidenceStatus:item.confidenceStatus,sourceIds:item.sourceIds,evidenceCardIds:item.evidenceCardIds,materialIds:item.materialIds,sectionId:item.sectionId,warnings:item.warnings,analystNotes:item.analystNotes,rejectionReason:item.rejectionReason,convertedId:item.convertedId,outputRefs:item.outputRefs,originalTaskRunId:item.originalTaskRunId,originalSuggestionId:item.originalSuggestionId,provenanceId:item.provenanceId,providerMode:item.providerMode,generatedBy:item.generatedBy,createdAt:item.createdAt,updatedAt:item.updatedAt,reviewedAt:item.reviewedAt,reviewedBy:item.reviewedBy})),updatedAt:queue.updatedAt});
}
function buildAiProvenanceExport(reportData){
  const report=clone(reportData||{});
  const log=normalizeAiAuditLog(report);
  const events=log.events||[];
  return sanitizeInternalAuditExport({
    provenance:(log.provenance||[]).map(record=>({...record,reviewStatusHistory:events.filter(event=>event.suggestionId===record.suggestionId).map(event=>({eventType:event.eventType,statusBefore:event.statusBefore,statusAfter:event.statusAfter,outputType:event.outputType,outputId:event.outputId,createdAt:event.createdAt,warnings:event.warnings,errorCode:event.errorCode}))})),
    events,
    updatedAt:log.updatedAt
  });
}
function buildEvidenceCardsAuditExport(reportData){
  const cards=normalizeEvidenceCards(clone(reportData||{}));
  return sanitizeInternalAuditExport({items:(cards.items||[]).map(card=>({id:card.id,claim:card.claim,summary:card.summary,evidenceType:card.evidenceType,reviewStatus:card.reviewStatus,confidenceStatus:card.confidenceStatus,credibilityStatus:card.credibilityStatus,sourceIds:card.sourceIds,materialIds:card.materialIds,sectionId:card.sectionId,generatedBy:card.generatedBy,originalSuggestionId:card.originalSuggestionId||'',originalTaskRunId:card.originalTaskRunId||'',provenanceId:card.provenanceId||'',analystNotes:card.analystNotes||'',reviewNotes:card.reviewNotes||'',rejectionReason:card.rejectionReason||'',reviewedAt:card.reviewedAt||'',reviewedBy:card.reviewedBy||'',createdAt:card.createdAt,updatedAt:card.updatedAt})),updatedAt:cards.updatedAt});
}
function buildSourceRegistryAuditExport(reportData){
  const registry=normalizeSourceRegistry(clone(reportData||{}));
  return sanitizeInternalAuditExport({items:(registry.items||[]).map(source=>({id:source.id,materialId:source.materialId,title:source.title,sourceType:source.sourceType,sourceKind:source.sourceKind,mimeType:source.mimeType,extension:source.extension,fileName:source.fileName,url:source.url,linkedCompanyId:source.linkedCompanyId,linkedSectionIds:source.linkedSectionIds,extractedTextStatus:source.extractedTextStatus,evidenceStatus:source.evidenceStatus,credibilityStatus:source.credibilityStatus,notes:source.notes,createdAt:source.createdAt,updatedAt:source.updatedAt})),updatedAt:registry.updatedAt});
}
function buildSourceCoverageSummaryExport(reportData){
  const report=clone(reportData||{});
  const preview=latestAiSourceCoveragePreview(report)?.outputPreview||null;
  const checklist=runReportQualityChecklist(report);
  return sanitizeInternalAuditExport({preview:preview?{taskRunId:preview.taskRunId||'',taskType:preview.taskType,providerMode:preview.providerMode||'',overallCoverageStatus:preview.overallCoverageStatus,coverageScore:preview.coverageScore,sectionCoverage:preview.sectionCoverage||[],coverageGaps:preview.coverageGaps||[],weakSources:preview.weakSources||[],suggestedNextSources:preview.suggestedNextSources||[],warnings:preview.warnings||[]}:null,checklistSourceItems:checklist.items.filter(item=>['sources','source_coverage'].includes(item.category))});
}
function buildQualityChecklistExport(reportData){
  const result=runReportQualityChecklist(reportData);
  return sanitizeInternalAuditExport(result);
}
function buildReportSectionsSummaryExport(reportData){
  const report=normalizeReportSchema(clone(reportData||{}));
  return sanitizeInternalAuditExport({sections:(report.reportSections||[]).map(section=>({id:section.id,title:section.title,type:section.type,order:section.order,status:section.status,blockCount:(section.blocks||[]).length,evidenceCardIds:[...new Set((section.blocks||[]).flatMap(block=>block.evidenceCardIds||[]))],sourceIds:[...new Set((section.blocks||[]).flatMap(block=>block.sourceIds||[]))]}))});
}
function buildMaterialsInventoryAuditExport(reportData){
  const inventory=normalizeMaterialsInventory(clone(reportData||{}));
  return sanitizeInternalAuditExport({items:(inventory.items||[]).map(item=>({id:item.id,name:item.name,type:item.type,sourceKind:item.sourceKind,mimeType:item.mimeType,extension:item.extension,sizeLabel:item.sizeLabel,linkedCompanyId:item.linkedCompanyId,linkedSectionId:item.linkedSectionId,status:item.status,createdAt:item.createdAt,updatedAt:item.updatedAt})),updatedAt:inventory.updatedAt});
}
function buildDraftBlocksSummaryExport(reportData){
  const report=normalizeReportSchema(clone(reportData||{}));
  return sanitizeInternalAuditExport({items:(report.reportSections||[]).flatMap(section=>(section.blocks||[]).map(block=>({id:block.id,title:block.title,type:block.type,sectionId:block.sectionId||section.id,status:block.status,generatedBy:block.generatedBy,sourceIds:block.sourceIds||[],evidenceCardIds:block.evidenceCardIds||[],originalSuggestionId:block.originalSuggestionId||'',originalTaskRunId:block.originalTaskRunId||'',provenanceId:block.provenanceId||'',createdAt:block.createdAt,updatedAt:block.updatedAt})))});
}
function buildInternalReportAuditJson(reportData){
  const report=normalizeReport(clone(reportData||{}));
  return sanitizeInternalAuditExport({manifest:buildInternalAuditManifest(report),meta:{title:report.meta?.title||'',companyName:report.meta?.companyName||'',updatedAt:report.meta?.updatedAt||'',isDemoReport:Boolean(report.meta?.isDemoReport)},readiness:getExportReadinessStatus(report),counts:{sections:(report.reportSections||[]).length,materials:(report.materialsInventory?.items||[]).length,sources:(report.sourceRegistry?.items||[]).length,evidenceCards:(report.evidenceCards?.items||[]).length,reviewQueue:(report.aiReviewQueue?.items||[]).length,auditEvents:(report.aiAuditLog?.events||[]).length}});
}
function buildInternalReadmeText(reportData){
  const manifest=buildInternalAuditManifest(reportData);
  return [
    `${manifest.reportTitle} - Internal Audit Package`,
    '',
    'This package is for internal analyst/editor review only.',
    'It is not a client-facing deliverable and should not be sent to clients unless manually reviewed.',
    '',
    'It may contain internal review statuses, AI suggestion metadata, provenance records, analyst notes, and readiness risks.',
    'Client-facing export is separate and remains sanitized.',
    '',
    'No API keys, Cloudflare secrets, environment variables, hidden prompts, raw provider headers, or raw provider stack traces are included by design.',
    'AI suggestions require human review before they become client-ready content.',
    '',
    `Exported at: ${manifest.exportedAt}`,
    `Readiness: ${manifest.qualityReadinessStatus}`,
    ''
  ].join('\n');
}
async function buildInternalAuditPackage(reportData, options={}){
  if(typeof JSZip==='undefined') throw new Error('JSZip is unavailable. Internal audit package ZIP cannot be created.');
  const report=normalizeReport(clone(reportData||{}));
  const zip=new JSZip();
  const files={
    'manifest.json':buildInternalAuditManifest(report),
    'internal-report-audit.json':buildInternalReportAuditJson(report),
    'ai-review-queue.json':buildAiReviewQueueExport(report),
    'ai-provenance-log.json':buildAiProvenanceExport(report),
    'evidence-cards.json':buildEvidenceCardsAuditExport(report),
    'source-registry.json':buildSourceRegistryAuditExport(report),
    'source-coverage-summary.json':buildSourceCoverageSummaryExport(report),
    'quality-checklist.json':buildQualityChecklistExport(report),
    'report-sections-summary.json':buildReportSectionsSummaryExport(report),
    'materials-inventory.json':buildMaterialsInventoryAuditExport(report),
    'draft-blocks-summary.json':buildDraftBlocksSummaryExport(report),
    'export-readiness-summary.json':{readiness:getExportReadinessStatus(report),checklist:buildQualityChecklistExport(report)}
  };
  for(const [name,value] of Object.entries(files)) zip.file(name, JSON.stringify(sanitizeInternalAuditExport(value),null,2));
  zip.file('README-internal.txt', buildInternalReadmeText(report));
  return zip.generateAsync({type:options.type||'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
function createReportVersionSnapshot(reportData){
  const report=normalizeReport(clone(reportData||{}));
  const checklist=runReportQualityChecklist(report);
  return normalizeReportVersionSnapshot(sanitizeInternalAuditExport({
    id:uid('rvs'),
    versionId:report.meta?.versionId||cloudSync.version||report.meta?.savedAt||report.meta?.updatedAt||'current',
    createdAt:new Date().toISOString(),
    reportTitle:report.meta?.title||'Marketing Report Studio',
    reportSchemaVersion:report.reportSchemaVersion||REPORT_SCHEMA_VERSION,
    clientExportVersion:report.meta?.clientExportVersion||report.clientExportV2?.clientExportVersion||null,
    sections:report.reportSections||[],
    evidenceCards:report.evidenceCards?.items||[],
    sourceRegistry:report.sourceRegistry?.items||[],
    materialsInventory:report.materialsInventory?.items||[],
    aiReviewQueue:report.aiReviewQueue?.items||[],
    aiAuditSummary:{eventCount:(report.aiAuditLog?.events||[]).length,provenanceCount:(report.aiAuditLog?.provenance||[]).length,lastEventAt:(report.aiAuditLog?.events||[]).map(event=>event.createdAt).filter(Boolean).sort().pop()||''},
    qualityChecklist:checklist,
    canExportClient:!checklist.blockers.length,
    clientSafetyStatus:checklist.clientSafetyStatus,
    unsafeClientKeys:findUnsafeClientKeys(sanitizeClientExportData(report)).filter(key=>!/^clientExportV2/.test(key))
  }));
}
function normalizeReportVersionSnapshot(snapshot){
  const out=snapshot&&typeof snapshot==='object'?{...snapshot}:{};
  out.id=String(out.id||uid('rvs'));
  out.versionId=String(out.versionId||out.id);
  out.createdAt=String(out.createdAt||new Date().toISOString());
  out.reportTitle=String(out.reportTitle||'Marketing Report Studio');
  out.sections=Array.isArray(out.sections)?out.sections.map(normalizeReportSection):[];
  out.evidenceCards=Array.isArray(out.evidenceCards)?out.evidenceCards.map(normalizeEvidenceCardItem):[];
  out.sourceRegistry=Array.isArray(out.sourceRegistry)?out.sourceRegistry.map(normalizeSourceRegistryItem):[];
  out.materialsInventory=Array.isArray(out.materialsInventory)?out.materialsInventory.map(normalizeMaterialItem):[];
  out.aiReviewQueue=Array.isArray(out.aiReviewQueue)?out.aiReviewQueue.map(normalizeAiReviewQueueItem):[];
  out.aiAuditSummary=out.aiAuditSummary&&typeof out.aiAuditSummary==='object'?out.aiAuditSummary:{eventCount:0,provenanceCount:0,lastEventAt:''};
  out.qualityChecklist=out.qualityChecklist&&typeof out.qualityChecklist==='object'?out.qualityChecklist:{status:'unknown',items:[],blockers:[],warnings:[],passed:[],clientSafetyStatus:'unknown'};
  out.canExportClient=Boolean(out.canExportClient);
  out.clientSafetyStatus=String(out.clientSafetyStatus||out.qualityChecklist.clientSafetyStatus||'unknown');
  out.unsafeClientKeys=Array.isArray(out.unsafeClientKeys)?out.unsafeClientKeys.map(String):[];
  return out;
}
function stableDiffValue(value){
  return JSON.stringify(value, Object.keys(value&&typeof value==='object'?value:{}).sort());
}
function diffListById(previous,next,idKey,labelFn,changeFn){
  const prevMap=new Map((previous||[]).map(item=>[String(item?.[idKey]||''),item]).filter(([id])=>id));
  const nextMap=new Map((next||[]).map(item=>[String(item?.[idKey]||''),item]).filter(([id])=>id));
  const ids=new Set([...prevMap.keys(),...nextMap.keys()]);
  const changes=[];
  for(const id of ids){
    const before=prevMap.get(id), after=nextMap.get(id);
    const changeType=!before?'added':(!after?'removed':(stableDiffValue(before)!==stableDiffValue(after)?'changed':'unchanged'));
    if(changeType==='unchanged') continue;
    changes.push(changeFn(id,before,after,changeType,labelFn(before||after,id)));
  }
  return changes;
}
function blockSignature(block){return JSON.stringify({id:block.id,type:block.type,title:block.title,text:block.text,status:block.status,sourceIds:block.sourceIds||[],evidenceCardIds:block.evidenceCardIds||[]});}
function diffReportSections(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  return diffListById(prev.sections,next.sections,'id',section=>section?.title||'',(id,before,after,changeType,label)=>{
    const beforeBlocks=before?.blocks||[], afterBlocks=after?.blocks||[];
    const beforeById=new Map(beforeBlocks.map(block=>[block.id,block]));
    const afterById=new Map(afterBlocks.map(block=>[block.id,block]));
    const blockIds=new Set([...beforeById.keys(),...afterById.keys()].filter(Boolean));
    let blocksAdded=0, blocksRemoved=0, blocksChanged=0;
    for(const blockId of blockIds){
      const b=beforeById.get(blockId), a=afterById.get(blockId);
      if(!b) blocksAdded++;
      else if(!a) blocksRemoved++;
      else if(blockSignature(b)!==blockSignature(a)) blocksChanged++;
    }
    return {sectionId:id,sectionTitle:label,changeType,beforeStatus:before?.status||'',afterStatus:after?.status||'',blocksAdded,blocksRemoved,blocksChanged,sourceRefsChanged:JSON.stringify((beforeBlocks||[]).flatMap(block=>block.sourceIds||[]).sort())!==JSON.stringify((afterBlocks||[]).flatMap(block=>block.sourceIds||[]).sort()),evidenceRefsChanged:JSON.stringify((beforeBlocks||[]).flatMap(block=>block.evidenceCardIds||[]).sort())!==JSON.stringify((afterBlocks||[]).flatMap(block=>block.evidenceCardIds||[]).sort())};
  });
}
function diffEvidenceCards(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  return diffListById(prev.evidenceCards,next.evidenceCards,'id',card=>card?.claim||card?.summary||'',(id,before,after,changeType,label)=>{
    const riskNotes=[];
    const beforeSources=before?.sourceIds||[], afterSources=after?.sourceIds||[];
    if(before?.reviewStatus==='approved' && after && after.reviewStatus==='rejected') riskNotes.push('Approved evidence became rejected.');
    if(before?.reviewStatus==='approved' && beforeSources.length && !afterSources.length) riskNotes.push('Approved evidence lost all linked sources.');
    if(before?.reviewStatus==='approved' && after && String(before.claim||'')!==String(after.claim||'')) riskNotes.push('Approved evidence claim changed.');
    return {evidenceCardId:id,claim:label,changeType,beforeReviewStatus:before?.reviewStatus||'',afterReviewStatus:after?.reviewStatus||'',beforeConfidenceStatus:before?.confidenceStatus||'',afterConfidenceStatus:after?.confidenceStatus||'',sourceIdsBefore:beforeSources,sourceIdsAfter:afterSources,sectionIdBefore:before?.sectionId||'',sectionIdAfter:after?.sectionId||'',riskNotes};
  });
}
function diffSourceRegistry(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  return diffListById(prev.sourceRegistry,next.sourceRegistry,'id',source=>source?.title||source?.fileName||'',(id,before,after,changeType,label)=>({sourceId:id,title:label,changeType,beforeCredibilityStatus:before?.credibilityStatus||'',afterCredibilityStatus:after?.credibilityStatus||'',beforeEvidenceStatus:before?.evidenceStatus||'',afterEvidenceStatus:after?.evidenceStatus||'',linkedSectionIdsBefore:before?.linkedSectionIds||[],linkedSectionIdsAfter:after?.linkedSectionIds||[]}));
}
function diffMaterialsInventory(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  return diffListById(prev.materialsInventory,next.materialsInventory,'id',item=>item?.name||'',(id,before,after,changeType,label)=>({materialId:id,name:label,changeType,beforeStatus:before?.status||'',afterStatus:after?.status||'',beforeType:before?.type||'',afterType:after?.type||''}));
}
function diffReviewStatuses(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  const changes=[];
  const collect=(objectType,items,idKey,labelKey,statusKey)=>{
    const prevMap=new Map((prev[items]||[]).map(item=>[item[idKey],item]));
    for(const item of (next[items]||[])){
      const before=prevMap.get(item[idKey]);
      if(before && String(before[statusKey]||'')!==String(item[statusKey]||'')){
        changes.push({objectType,objectId:item[idKey],label:String(item[labelKey]||item.claim||item.title||item.id),statusBefore:String(before[statusKey]||''),statusAfter:String(item[statusKey]||''),riskNotes:before[statusKey]==='approved'&&item[statusKey]!=='approved'?['Approved item moved out of approved status.']:[]});
      }
    }
  };
  collect('section','sections','id','title','status');
  collect('evidence_card','evidenceCards','id','claim','reviewStatus');
  collect('ai_suggestion','aiReviewQueue','id','title','reviewStatus');
  return changes;
}
function diffAiReviewQueue(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  return diffListById(prev.aiReviewQueue,next.aiReviewQueue,'id',item=>item?.title||'',(id,before,after,changeType,label)=>({suggestionId:id,title:label,suggestionType:after?.suggestionType||before?.suggestionType||'unknown',changeType,beforeStatus:before?.reviewStatus||'',afterStatus:after?.reviewStatus||'',converted:Boolean(after?.convertedId),warnings:after?.warnings||[]}));
}
function diffAiAuditSummary(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  return {eventCountBefore:Number(prev.aiAuditSummary.eventCount||0),eventCountAfter:Number(next.aiAuditSummary.eventCount||0),provenanceCountBefore:Number(prev.aiAuditSummary.provenanceCount||0),provenanceCountAfter:Number(next.aiAuditSummary.provenanceCount||0),lastEventAtBefore:prev.aiAuditSummary.lastEventAt||'',lastEventAtAfter:next.aiAuditSummary.lastEventAt||''};
}
function checklistMessages(items){return new Set((items||[]).map(item=>`${item.category}|${item.severity}|${item.message}`));}
function diffQualityChecklist(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  const beforeBlockers=checklistMessages(prev.qualityChecklist.blockers), afterBlockers=checklistMessages(next.qualityChecklist.blockers);
  const beforeWarnings=checklistMessages(prev.qualityChecklist.warnings), afterWarnings=checklistMessages(next.qualityChecklist.warnings);
  return {readinessBefore:prev.qualityChecklist.status||'unknown',readinessAfter:next.qualityChecklist.status||'unknown',blockersAdded:[...afterBlockers].filter(item=>!beforeBlockers.has(item)),blockersResolved:[...beforeBlockers].filter(item=>!afterBlockers.has(item)),warningsAdded:[...afterWarnings].filter(item=>!beforeWarnings.has(item)),warningsResolved:[...beforeWarnings].filter(item=>!afterWarnings.has(item)),clientSafetyChanged:prev.clientSafetyStatus!==next.clientSafetyStatus};
}
function diffClientExportReadiness(previousSnapshot,nextSnapshot){
  const prev=normalizeReportVersionSnapshot(previousSnapshot), next=normalizeReportVersionSnapshot(nextSnapshot);
  const rejectedRisk=snapshot=>snapshot.evidenceCards.some(card=>card.reviewStatus==='rejected'&&snapshot.sections.some(section=>(section.blocks||[]).some(block=>(block.evidenceCardIds||[]).includes(card.id))));
  const missingSourcesRisk=snapshot=>snapshot.evidenceCards.some(card=>card.reviewStatus==='approved'&&!(card.sourceIds||[]).length);
  return {canExportBefore:prev.canExportClient,canExportAfter:next.canExportClient,clientLockedSafetyBefore:prev.clientSafetyStatus,clientLockedSafetyAfter:next.clientSafetyStatus,rejectedEvidenceExportRiskBefore:rejectedRisk(prev),rejectedEvidenceExportRiskAfter:rejectedRisk(next),missingSourcesRiskBefore:missingSourcesRisk(prev),missingSourcesRiskAfter:missingSourcesRisk(next),unsafeClientKeysBefore:prev.unsafeClientKeys,unsafeClientKeysAfter:next.unsafeClientKeys};
}
function summarizeVersionDiff(diff){
  const c=diff.changedCounts||{};
  const parts=[];
  if(c.sectionsAdded||c.sectionsRemoved||c.sectionsChanged) parts.push(`${c.sectionsAdded+c.sectionsRemoved+c.sectionsChanged} section change(s)`);
  if(c.evidenceAdded||c.evidenceRemoved||c.evidenceChanged) parts.push(`${c.evidenceAdded+c.evidenceRemoved+c.evidenceChanged} evidence change(s)`);
  if(c.sourcesAdded||c.sourcesRemoved||c.sourcesChanged) parts.push(`${c.sourcesAdded+c.sourcesRemoved+c.sourcesChanged} source change(s)`);
  if(c.reviewStatusesChanged) parts.push(`${c.reviewStatusesChanged} review status change(s)`);
  if(c.blockersAdded||c.blockersResolved) parts.push(`${c.blockersAdded} blocker(s) added, ${c.blockersResolved} resolved`);
  return parts.length?parts.join('; '):'No material report changes detected.';
}
function getVersionDiffRiskLevel(diff){
  const c=diff.changedCounts||{};
  const exportChange=diff.exportReadinessChanges||{};
  if(diff.warnings?.some(w=>/secret|private|unsafe/i.test(w))) return 'high';
  if(exportChange.canExportBefore && !exportChange.canExportAfter) return 'high';
  if((diff.qualityChecklistChanges?.blockersAdded||[]).length) return 'high';
  if((diff.evidenceChanges||[]).some(change=>change.riskNotes?.length)) return 'high';
  if(exportChange.missingSourcesRiskAfter&&!exportChange.missingSourcesRiskBefore) return 'high';
  if((diff.sourceChanges||[]).some(change=>change.beforeCredibilityStatus==='trusted'&&['weak','unreviewed','needs_review'].includes(change.afterCredibilityStatus))) return 'medium';
  if(c.warningsAdded||c.sectionsRemoved||c.evidenceChanged||c.sourcesRemoved) return 'medium';
  return 'low';
}
function getChangedSectionLabels(diff){return (diff.sectionChanges||[]).map(item=>item.sectionTitle||item.sectionId).filter(Boolean);}
function getChangedEvidenceLabels(diff){return (diff.evidenceChanges||[]).map(item=>item.claim||item.evidenceCardId).filter(Boolean);}
function getChangedSourceLabels(diff){return (diff.sourceChanges||[]).map(item=>item.title||item.sourceId).filter(Boolean);}
function diffReportVersions(previousSnapshot,nextSnapshot){
  const previous=normalizeReportVersionSnapshot(previousSnapshot);
  const next=normalizeReportVersionSnapshot(nextSnapshot);
  const sectionChanges=diffReportSections(previous,next);
  const evidenceChanges=diffEvidenceCards(previous,next);
  const sourceChanges=diffSourceRegistry(previous,next);
  const materialChanges=diffMaterialsInventory(previous,next);
  const reviewStatusChanges=diffReviewStatuses(previous,next);
  const aiSuggestionChanges=diffAiReviewQueue(previous,next);
  const aiAuditSummaryChanges=diffAiAuditSummary(previous,next);
  const qualityChecklistChanges=diffQualityChecklist(previous,next);
  const exportReadinessChanges=diffClientExportReadiness(previous,next);
  const changedCounts={sectionsAdded:sectionChanges.filter(c=>c.changeType==='added').length,sectionsRemoved:sectionChanges.filter(c=>c.changeType==='removed').length,sectionsChanged:sectionChanges.filter(c=>c.changeType==='changed').length,evidenceAdded:evidenceChanges.filter(c=>c.changeType==='added').length,evidenceRemoved:evidenceChanges.filter(c=>c.changeType==='removed').length,evidenceChanged:evidenceChanges.filter(c=>c.changeType==='changed').length,sourcesAdded:sourceChanges.filter(c=>c.changeType==='added').length,sourcesRemoved:sourceChanges.filter(c=>c.changeType==='removed').length,sourcesChanged:sourceChanges.filter(c=>c.changeType==='changed').length,reviewStatusesChanged:reviewStatusChanges.length,aiSuggestionsAdded:aiSuggestionChanges.filter(c=>c.changeType==='added').length,aiSuggestionsRejected:aiSuggestionChanges.filter(c=>c.afterStatus==='rejected'&&c.beforeStatus!=='rejected').length,aiSuggestionsConverted:aiSuggestionChanges.filter(c=>c.afterStatus==='converted'&&c.beforeStatus!=='converted').length,blockersAdded:qualityChecklistChanges.blockersAdded.length,blockersResolved:qualityChecklistChanges.blockersResolved.length,warningsAdded:qualityChecklistChanges.warningsAdded.length,warningsResolved:qualityChecklistChanges.warningsResolved.length};
  const warnings=[];
  if(exportReadinessChanges.unsafeClientKeysAfter?.length) warnings.push(`Unsafe/private keys detected in export snapshot: ${exportReadinessChanges.unsafeClientKeysAfter.slice(0,5).join(', ')}`);
  const diff={id:uid('diff'),previousVersionId:previous.versionId,nextVersionId:next.versionId,comparedAt:new Date().toISOString(),changedCounts,riskLevel:'unknown',summary:'',sectionChanges,evidenceChanges,sourceChanges,materialChanges,reviewStatusChanges,aiSuggestionChanges,aiAuditSummaryChanges,qualityChecklistChanges,exportReadinessChanges,warnings};
  diff.riskLevel=getVersionDiffRiskLevel(diff);
  diff.summary=summarizeVersionDiff(diff);
  return diff;
}
function currentVersionLabel(){
  return String(cloudSync.version||REPORT.meta?.savedAt||REPORT.meta?.updatedAt||'current');
}
function ensureVersionDiffBaselineReport(){
  if(!VERSION_DIFF_BASELINE_REPORT) VERSION_DIFF_BASELINE_REPORT=normalizeReport(clone(REPORT));
  if(!VERSION_DIFF_BASELINE) VERSION_DIFF_BASELINE=createReportVersionSnapshot(VERSION_DIFF_BASELINE_REPORT);
  return VERSION_DIFF_BASELINE_REPORT;
}
function restoreComparisonSignature(reportData){
  const snapshot=createReportVersionSnapshot(reportData);
  delete snapshot.id;
  delete snapshot.createdAt;
  return JSON.stringify(sanitizeInternalAuditExport(snapshot));
}
function canRestoreReportVersion(context={}){
  if(isClientLocked() || context.clientLocked) return {ok:false, reason:'Restore is unavailable in clientLocked mode.'};
  const governance=getEffectiveGovernancePolicy(REPORT);
  if(!governance.restorePolicy.allowRestore) return {ok:false, reason:'Restore is disabled by governance policy.'};
  if(!isAdmin()) return {ok:false, reason:'Only owner/editor can restore report versions.'};
  if(currentAiUser().role==='viewer'&&!governance.permissionsPolicy.viewerCanRestoreVersions) return {ok:false, reason:'Viewer restore is disabled by governance policy.'};
  if(context.cloudMode && (!cloudSync.ready || !cloudCanWrite())) return {ok:false, reason:'Cloud restore requires owner/editor write access.'};
  if(!context.targetReport && !context.targetVersionSnapshot) return {ok:false, reason:'No previous version snapshot is available to restore.'};
  return {ok:true, reason:''};
}
function prepareRestorePreview(reportData,targetVersionSnapshot){
  const targetReport=targetVersionSnapshot?.reportData?normalizeReport(clone(targetVersionSnapshot.reportData)):normalizeReport(clone(targetVersionSnapshot||{}));
  const currentSnapshot=createReportVersionSnapshot(reportData);
  const targetSnapshot=createReportVersionSnapshot(targetReport);
  const diff=diffReportVersions(currentSnapshot,targetSnapshot);
  const riskLevel=getRestoreRiskLevel(diff);
  return {
    id:uid('restore-preview'),
    currentVersionId:currentSnapshot.versionId||currentVersionLabel(),
    targetVersionId:targetSnapshot.versionId||targetReport.meta?.restoredFromVersionId||'loaded baseline',
    previewedAt:new Date().toISOString(),
    expectedCurrentVersion:restoreComparisonSignature(reportData),
    targetReport,
    targetSnapshot,
    diff,
    riskLevel,
    impactSummary:summarizeRestoreImpact(diff),
    canRestore:canRestoreReportVersion({targetReport}).ok
  };
}
function validateRestorePreconditions(currentReport,targetVersionSnapshot,expectedCurrentVersion){
  const permission=canRestoreReportVersion({targetVersionSnapshot});
  if(!permission.ok) return {ok:false, error:permission.reason};
  if(expectedCurrentVersion && restoreComparisonSignature(currentReport)!==String(expectedCurrentVersion)){
    return {ok:false, error:'The current report changed since restore preview. Review the diff again before restoring.'};
  }
  const target=targetVersionSnapshot?.reportData||targetVersionSnapshot;
  if(!target || typeof target!=='object') return {ok:false, error:'Restore target snapshot is missing or invalid.'};
  return {ok:true, error:''};
}
function createRestoreAuditEvent(input={}){
  return createAiAuditEvent(input.reportData||REPORT,{
    eventType:'report_version_restored',
    taskRunId:String(input.restoreRunId||uid('restore')),
    taskType:'',
    provider:'local',
    providerMode:'disabled',
    generatedBy:'manual',
    statusBefore:String(input.restoredFromVersionId||''),
    statusAfter:String(input.restoredToVersionId||''),
    notes:String(input.notes||''),
    warnings:Array.isArray(input.warnings)?input.warnings:[],
    outputRefs:[normalizeAiOutputRef({type:'unknown',id:String(input.restoredToVersionId||''),label:'Restored report version',status:String(input.riskLevel||'unknown')})]
  });
}
function restoreVersionAsNewSnapshot(currentReport,targetVersionSnapshot,options={}){
  const restored=normalizeReport(clone(targetVersionSnapshot?.reportData||targetVersionSnapshot||{}));
  restored.meta=restored.meta||{};
  const now=new Date().toISOString();
  const restoredFrom=String(options.restoredFromVersionId||targetVersionSnapshot?.versionId||restored.meta.versionId||'loaded-baseline');
  const newVersionId=uid('restored');
  restored.meta.restoredFromVersionId=restoredFrom;
  restored.meta.restoredAt=now;
  restored.meta.restoredByRole=currentAiUser().role;
  restored.meta.restoreReason=String(options.restoreReason||'');
  restored.meta.restoreRiskLevel=String(options.restoreRiskLevel||'unknown');
  restored.meta.restoreDiffSummary=String(options.restoreDiffSummary||'');
  restored.meta.versionId=newVersionId;
  restored.meta.updatedAt=now;
  appendAiAuditEvent(restored,createRestoreAuditEvent({reportData:restored,restoreRunId:uid('restore'),restoredFromVersionId:restoredFrom,restoredToVersionId:newVersionId,riskLevel:restored.meta.restoreRiskLevel,notes:restored.meta.restoreReason,warnings:options.warnings||[]}));
  return restored;
}
function summarizeRestoreImpact(diff){
  return [
    `Risk: ${versionDiffRiskLabel(getRestoreRiskLevel(diff))}`,
    diff.summary,
    `Readiness after restore: ${diff.qualityChecklistChanges.readinessAfter}`,
    `Blockers +${diff.changedCounts.blockersAdded}/-${diff.changedCounts.blockersResolved}, warnings +${diff.changedCounts.warningsAdded}/-${diff.changedCounts.warningsResolved}`
  ].join(' ');
}
function getRestoreRiskLevel(diff){
  if(!diff) return 'unknown';
  const base=getVersionDiffRiskLevel(diff);
  const removesApproved=(diff.evidenceChanges||[]).some(change=>change.changeType==='removed'&&change.beforeReviewStatus==='approved');
  const losesTrustedSource=(diff.sourceChanges||[]).some(change=>change.changeType==='removed'&&change.beforeCredibilityStatus==='trusted');
  const removesKeySection=(diff.sectionChanges||[]).some(change=>change.changeType==='removed'&&['executiveSummary','recommendations'].includes(change.sectionId));
  const readinessDrops=diff.exportReadinessChanges.canExportBefore&&!diff.exportReadinessChanges.canExportAfter;
  if(removesApproved||losesTrustedSource||removesKeySection||readinessDrops) return 'high';
  return base||'unknown';
}
function createDefaultVersionRetentionPolicy(){
  const now=new Date().toISOString();
  return {
    enabled:false,
    mode:'preview_only',
    keepAllVersionsByDefault:true,
    minVersionsToKeep:20,
    minDaysToKeep:90,
    keepMonthlySnapshots:true,
    keepVersionsWithClientExports:true,
    keepVersionsWithRestoreEvents:true,
    keepVersionsWithAiConversions:true,
    keepVersionsWithApprovedEvidenceChanges:true,
    keepVersionsWithQualityReadyStatus:true,
    alwaysKeepCurrentVersion:true,
    alwaysKeepRestoredVersions:true,
    alwaysKeepClientExportedVersions:true,
    alwaysKeepAuditReferencedVersions:true,
    alwaysKeepPinnedVersions:true,
    allowArchive:true,
    allowHardDelete:false,
    requireConfirmation:true,
    createdAt:now,
    updatedAt:now
  };
}
function createDefaultGovernanceSettings(){
  const now=new Date().toISOString();
  return {
    retentionPolicy:{enabled:false,mode:'preview_only',minVersionsToKeep:20,minDaysToKeep:90,allowArchive:true,allowHardDelete:false,requireConfirmation:true,protectClientExportVersions:true,protectRestorePoints:true,protectAuditReferencedVersions:true},
    exportPolicy:{requireQualityChecklistBeforeClientExport:true,blockExportOnQualityBlockers:true,allowExportWithWarnings:true,excludeRejectedEvidence:true,excludeInternalAuditLog:true,excludeAiPrompts:true,excludeSecrets:true,includeSourceIndex:true,includeEvidenceSummary:true,includePrintCss:true},
    aiPolicy:{aiEnabled:false,aiProviderMode:'disabled',dryRunAllowed:true,realProviderAllowed:false,requireHumanReview:true,allowViewerAiPreview:false,allowClientLockedAiPreview:false,allowAutoApproveAiOutput:false,allowAiOutputInClientExportBeforeReview:false},
    reviewPolicy:{requireApprovedEvidenceForDraftBuilder:true,requireReviewForAiSuggestions:true,requireSourceLinksForApprovedEvidence:true,allowNeedsReviewContentInClientExport:true,allowRejectedContentInClientExport:false},
    restorePolicy:{allowRestore:true,requireDiffBeforeRestore:true,requireConfirmation:true,requireStrongConfirmationForHighRisk:true,requireExpectedCurrentVersion:true,createAuditEventOnRestore:true},
    auditPolicy:{enableAiAuditLog:true,enableSuggestionProvenance:true,includeAuditInInternalPackage:true,includeAuditInClientPackage:false,allowViewerAuditVisibility:false,redactActorLabels:false,redactInternalNotesFromClientExport:true},
    permissionsPolicy:{ownerCanManageGovernance:true,editorCanManageGovernance:false,viewerCanManageGovernance:false,viewerCanExportClientPackage:false,viewerCanExportInternalAuditPackage:false,viewerCanRestoreVersions:false,viewerCanRunAiPreview:false},
    createdAt:now,
    updatedAt:now
  };
}
function normalizeGovernanceSettings(reportDataOrWorkspace){
  const target=reportDataOrWorkspace&&typeof reportDataOrWorkspace==='object'?reportDataOrWorkspace:{};
  const defaults=createDefaultGovernanceSettings();
  const source=target.governanceSettings&&typeof target.governanceSettings==='object'?target.governanceSettings:{};
  const settings={...defaults};
  for(const key of ['retentionPolicy','exportPolicy','aiPolicy','reviewPolicy','restorePolicy','auditPolicy','permissionsPolicy']){
    settings[key]={...defaults[key],...(source[key]&&typeof source[key]==='object'?source[key]:{})};
  }
  settings.createdAt=String(source.createdAt||defaults.createdAt);
  settings.updatedAt=String(source.updatedAt||settings.createdAt);
  settings.retentionPolicy.mode=VERSION_RETENTION_MODES.includes(String(settings.retentionPolicy.mode))?String(settings.retentionPolicy.mode):'preview_only';
  settings.aiPolicy.aiProviderMode=['disabled','dry_run','real_provider','unknown'].includes(String(settings.aiPolicy.aiProviderMode))?String(settings.aiPolicy.aiProviderMode):'disabled';
  settings.retentionPolicy.allowHardDelete=false;
  settings.aiPolicy.aiEnabled=false;
  settings.aiPolicy.realProviderAllowed=false;
  settings.aiPolicy.allowClientLockedAiPreview=false;
  settings.aiPolicy.allowAutoApproveAiOutput=false;
  settings.aiPolicy.allowAiOutputInClientExportBeforeReview=false;
  settings.exportPolicy.excludeSecrets=true;
  settings.exportPolicy.excludeAiPrompts=true;
  settings.exportPolicy.excludeRejectedEvidence=true;
  settings.exportPolicy.excludeInternalAuditLog=true;
  settings.reviewPolicy.allowRejectedContentInClientExport=false;
  settings.permissionsPolicy.viewerCanManageGovernance=false;
  settings.permissionsPolicy.viewerCanRestoreVersions=false;
  settings.permissionsPolicy.viewerCanRunAiPreview=false;
  settings.permissionsPolicy.viewerCanExportInternalAuditPackage=false;
  target.governanceSettings=settings;
  return settings;
}
function getGovernanceSettings(context=REPORT){
  return normalizeGovernanceSettings(context?.reportData||context||REPORT);
}
function validateGovernanceSettings(settings){
  const s=normalizeGovernanceSettings({governanceSettings:settings});
  const blockers=[], warnings=[], passed=[];
  const block=(ok,msg)=>ok?passed.push(msg):blockers.push(msg);
  block(!s.aiPolicy.allowClientLockedAiPreview,'clientLocked AI preview must stay disabled.');
  block(!s.aiPolicy.allowAutoApproveAiOutput,'AI auto-approval must stay disabled.');
  block(!s.reviewPolicy.allowRejectedContentInClientExport,'Rejected content cannot be allowed in client export.');
  block(s.exportPolicy.excludeSecrets,'Secrets must be excluded from exports.');
  block(s.exportPolicy.excludeAiPrompts,'Hidden AI prompts must be excluded from exports.');
  block(!s.auditPolicy.includeAuditInClientPackage,'Internal audit logs cannot be included in client package.');
  block(!s.retentionPolicy.allowHardDelete,'Hard delete must stay disabled.');
  if(!s.exportPolicy.requireQualityChecklistBeforeClientExport) warnings.push('Client export quality checklist requirement is disabled.');
  if(!s.exportPolicy.blockExportOnQualityBlockers) warnings.push('Client export blockers would not block export.');
  if(s.permissionsPolicy.editorCanManageGovernance) warnings.push('Editors can manage governance settings.');
  return {ok:!blockers.length, blockers, warnings, passed, settings:s};
}
function getEffectiveGovernancePolicy(context=REPORT){
  const settings=getGovernanceSettings(context);
  return {settings,retentionPolicy:{...createDefaultVersionRetentionPolicy(),...settings.retentionPolicy},exportPolicy:settings.exportPolicy,aiPolicy:settings.aiPolicy,reviewPolicy:settings.reviewPolicy,restorePolicy:settings.restorePolicy,auditPolicy:settings.auditPolicy,permissionsPolicy:settings.permissionsPolicy};
}
function getGovernancePolicyWarnings(settings){
  const validation=validateGovernanceSettings(settings);
  return [...validation.blockers,...validation.warnings];
}
function getGovernancePolicySummary(settings){
  const s=normalizeGovernanceSettings({governanceSettings:settings});
  return {
    exportSafety:s.exportPolicy.blockExportOnQualityBlockers?'Blocks on quality blockers':'Does not block on quality blockers',
    aiPolicy:s.aiPolicy.aiEnabled?'AI enabled':'AI disabled',
    retention:s.retentionPolicy.mode,
    restore:s.restorePolicy.allowRestore?'Restore allowed with confirmation':'Restore disabled',
    audit:s.auditPolicy.includeAuditInClientPackage?'Audit exposed to client package':'Audit internal only',
    permissions:s.permissionsPolicy.editorCanManageGovernance?'Owner/editor manage governance':'Owner manages governance'
  };
}
function canCurrentUserManageGovernance(context=REPORT){
  if(isClientLocked()) return false;
  const s=getGovernanceSettings(context);
  if(cloudSync.ready) return cloudSync.role==='owner' || (cloudSync.role==='editor'&&s.permissionsPolicy.editorCanManageGovernance);
  if(state.access==='viewer') return false;
  return s.permissionsPolicy.ownerCanManageGovernance;
}
function updateGovernanceSettings(context,patch){
  const target=context&&typeof context==='object'?context:REPORT;
  if(!canCurrentUserManageGovernance(target)) return {ok:false,errors:['Only owner can manage governance settings by default.']};
  const current=getGovernanceSettings(target);
  const next=clone(current);
  for(const [group,value] of Object.entries(patch||{})){
    if(next[group]&&typeof next[group]==='object'&&value&&typeof value==='object') next[group]={...next[group],...value};
  }
  next.updatedAt=new Date().toISOString();
  const validation=validateGovernanceSettings(next);
  if(!validation.ok){
    appendAiAuditEvent(target,createAiAuditEvent(target,{eventType:'governance_policy_validation_failed',provider:'local',providerMode:'disabled',generatedBy:'manual',warnings:validation.blockers,notes:'Governance settings rejected.'}));
    return {ok:false,errors:validation.blockers,warnings:validation.warnings};
  }
  target.governanceSettings=validation.settings;
  appendAiAuditEvent(target,createAiAuditEvent(target,{eventType:'governance_settings_updated',provider:'local',providerMode:'disabled',generatedBy:'manual',warnings:validation.warnings,notes:`Updated groups: ${Object.keys(patch||{}).join(', ')}`}));
  return {ok:true,settings:target.governanceSettings,warnings:validation.warnings};
}
function createDefaultOnboardingState(){
  const now=new Date().toISOString();
  return {enabled:true,completed:false,completedAt:null,dismissed:false,dismissedAt:null,currentStepId:'welcome',completedStepIds:[],skippedStepIds:[],firstRunDetected:true,createdAt:now,updatedAt:now,version:ONBOARDING_VERSION};
}
function normalizeOnboardingState(reportDataOrWorkspace){
  const target=reportDataOrWorkspace&&typeof reportDataOrWorkspace==='object'?reportDataOrWorkspace:{};
  const defaults=createDefaultOnboardingState();
  const source=target.onboardingState&&typeof target.onboardingState==='object'?target.onboardingState:{};
  const validStep=id=>ONBOARDING_STEPS.includes(String(id||''));
  const stateObj={...defaults,...source};
  stateObj.enabled=source.enabled!==false;
  stateObj.completed=Boolean(source.completed);
  stateObj.completedAt=stateObj.completed?String(source.completedAt||source.updatedAt||defaults.updatedAt):null;
  stateObj.dismissed=Boolean(source.dismissed);
  stateObj.dismissedAt=stateObj.dismissed?String(source.dismissedAt||source.updatedAt||defaults.updatedAt):null;
  stateObj.currentStepId=validStep(source.currentStepId)?String(source.currentStepId):'welcome';
  stateObj.completedStepIds=[...new Set((Array.isArray(source.completedStepIds)?source.completedStepIds:[]).map(String).filter(validStep))];
  stateObj.skippedStepIds=[...new Set((Array.isArray(source.skippedStepIds)?source.skippedStepIds:[]).map(String).filter(validStep))];
  stateObj.firstRunDetected=source.firstRunDetected!==false;
  stateObj.createdAt=String(source.createdAt||defaults.createdAt);
  stateObj.updatedAt=String(source.updatedAt||stateObj.createdAt);
  stateObj.version=Number(source.version)||ONBOARDING_VERSION;
  target.onboardingState=stateObj;
  return stateObj;
}
function getOnboardingProgress(context=REPORT){
  const stateObj=normalizeOnboardingState(context?.reportData||context||REPORT);
  return {currentStepId:stateObj.currentStepId,totalSteps:ONBOARDING_STEPS.length,completedSteps:stateObj.completedStepIds.length,completed:stateObj.completed,dismissed:stateObj.dismissed,percent:Math.round((stateObj.completedStepIds.length/ONBOARDING_STEPS.length)*100)};
}
function canCurrentUserRunOnboarding(context=REPORT){
  if(isClientLocked() || context?.meta?.clientLocked===true) return false;
  const settings=getGovernanceSettings(context);
  if(cloudSync.ready) return cloudSync.role==='owner' || (cloudSync.role==='editor'&&settings.permissionsPolicy.editorCanManageGovernance);
  if(HOSTED_MODE&&!BROWSER_ONLY_MODE&&!cloudSync.ready) return false;
  if(state.access==='viewer') return false;
  return settings.permissionsPolicy.ownerCanManageGovernance;
}
function markOnboardingStepComplete(context,stepId){
  const target=context&&typeof context==='object'?context:REPORT;
  const stateObj=normalizeOnboardingState(target);
  const id=ONBOARDING_STEPS.includes(String(stepId||''))?String(stepId):stateObj.currentStepId;
  if(!stateObj.completedStepIds.includes(id)) stateObj.completedStepIds.push(id);
  stateObj.currentStepId=ONBOARDING_STEPS[Math.min(ONBOARDING_STEPS.indexOf(id)+1,ONBOARDING_STEPS.length-1)]||id;
  stateObj.updatedAt=new Date().toISOString();
  appendAiAuditEvent(target,createAiAuditEvent(target,{eventType:'workspace_onboarding_step_completed',provider:'local',providerMode:'disabled',generatedBy:'manual',notes:`Completed onboarding step: ${id}`}));
  return stateObj;
}
function resetOnboarding(context=REPORT){
  const target=context&&typeof context==='object'?context:REPORT;
  if(!canCurrentUserRunOnboarding(target)) return {ok:false,errors:['Only owner can reset workspace onboarding by default.']};
  target.onboardingState=createDefaultOnboardingState();
  appendAiAuditEvent(target,createAiAuditEvent(target,{eventType:'workspace_onboarding_reset',provider:'local',providerMode:'disabled',generatedBy:'manual',notes:'Workspace onboarding reset.'}));
  return {ok:true,onboardingState:target.onboardingState};
}
function validateOnboardingSelections(selections={}){
  const blockers=[], warnings=[];
  const raw=JSON.stringify(selections||{}).toLowerCase();
  if(/api[_-]?key|secret|token|password|openai_api_key|process\.env/.test(raw)) blockers.push('Onboarding selections cannot contain secrets, API keys, tokens, or environment values.');
  if(selections?.aiPolicy?.allowAutoApproveAiOutput) blockers.push('AI output cannot be auto-approved.');
  if(selections?.aiPolicy?.allowClientLockedAiPreview) blockers.push('AI preview cannot run in clientLocked mode.');
  if(selections?.reviewPolicy?.allowRejectedContentInClientExport) blockers.push('Rejected content cannot be allowed in client export.');
  if(selections?.exportPolicy?.excludeSecrets===false) blockers.push('Secrets must stay excluded from exports.');
  if(selections?.exportPolicy?.excludeAiPrompts===false) blockers.push('AI prompts must stay excluded from exports.');
  if(selections?.exportPolicy?.excludeInternalAuditLog===false) blockers.push('Internal audit logs must stay out of client packages.');
  if(selections?.retentionPolicy?.allowHardDelete) blockers.push('Hard delete cannot be enabled from onboarding.');
  if(selections?.exportPolicy?.requireQualityChecklistBeforeClientExport===false) warnings.push('Quality checklist requirement should stay enabled before client export.');
  return {ok:!blockers.length, blockers, warnings};
}
function safeOnboardingGovernancePatch(){
  const safe=createDefaultGovernanceSettings();
  return {
    exportPolicy:safe.exportPolicy,
    aiPolicy:safe.aiPolicy,
    reviewPolicy:{...safe.reviewPolicy,allowNeedsReviewContentInClientExport:false},
    retentionPolicy:safe.retentionPolicy,
    restorePolicy:safe.restorePolicy
  };
}
function applyOnboardingSelections(context=REPORT,selections={}){
  const target=context&&typeof context==='object'?context:REPORT;
  if(!canCurrentUserRunOnboarding(target)) return {ok:false,errors:['Only owner can apply workspace onboarding settings by default.']};
  const validation=validateOnboardingSelections(selections);
  if(!validation.ok) return {ok:false,errors:validation.blockers,warnings:validation.warnings};
  target.meta=target.meta||{};
  if(selections.workspaceName) target.meta.workspaceName=String(selections.workspaceName).slice(0,120);
  if(selections.reportTitle) target.meta.title=String(selections.reportTitle).slice(0,160);
  if(selections.clientName!==undefined) target.meta.companyName=String(selections.clientName||'').slice(0,160);
  if(selections.researchLanguage) target.meta.lang=String(selections.researchLanguage).slice(0,12);
  const patch=safeOnboardingGovernancePatch();
  const result=updateGovernanceSettings(target,patch);
  if(!result.ok) return result;
  target.versionRetentionPolicy={...normalizeVersionRetentionPolicy(target),...patch.retentionPolicy,updatedAt:new Date().toISOString()};
  const stateObj=normalizeOnboardingState(target);
  stateObj.completed=true;
  stateObj.dismissed=false;
  stateObj.completedStepIds=[...ONBOARDING_STEPS];
  stateObj.currentStepId='finalChecklist';
  stateObj.completedAt=new Date().toISOString();
  stateObj.updatedAt=stateObj.completedAt;
  appendAiAuditEvent(target,createAiAuditEvent(target,{eventType:'workspace_onboarding_applied_settings',provider:'local',providerMode:'disabled',generatedBy:'manual',warnings:validation.warnings,notes:'Workspace onboarding applied safe defaults for export, AI, review, retention, and restore policies.'}));
  appendAiAuditEvent(target,createAiAuditEvent(target,{eventType:'workspace_onboarding_completed',provider:'local',providerMode:'disabled',generatedBy:'manual',warnings:getOnboardingWarnings(target,selections),notes:'Workspace onboarding completed.'}));
  return {ok:true,onboardingState:stateObj,warnings:validation.warnings};
}
function getOnboardingWarnings(context=REPORT,selections={}){
  const target=context&&typeof context==='object'?context:REPORT;
  const warnings=[];
  const settings=getGovernanceSettings(target);
  const checklist=runReportQualityChecklist(target);
  if(!state.aiStatus?.aiEnabled) warnings.push('Real AI provider is not configured; dry-run/local preview remains the safe default.');
  if(cloudSync.ready && !cloudSync.user) warnings.push('Cloud identity is unavailable; write actions fail closed.');
  if(!cloudSync.ready || BROWSER_ONLY_MODE) warnings.push('Local mode only: setup applies to this report file/browser session.');
  if(!(target.meta||{}).isDemoReport && !selections.loadDemo) warnings.push('Demo report has not been loaded.');
  if(checklist.blockers?.length) warnings.push(`Quality checklist has ${checklist.blockers.length} blocker(s).`);
  if(!settings.exportPolicy.blockExportOnQualityBlockers) warnings.push('Export policy is relaxed and should be reviewed.');
  return warnings;
}
function createDefaultFirstReportFlowState(){
  const now=new Date().toISOString();
  return {enabled:true,completed:false,completedAt:null,dismissed:false,dismissedAt:null,currentStepId:'createReport',completedStepIds:[],skippedStepIds:[],createdAt:now,updatedAt:now,version:FIRST_REPORT_FLOW_VERSION};
}
function normalizeFirstReportFlowState(reportData){
  const target=reportData&&typeof reportData==='object'?reportData:{};
  const defaults=createDefaultFirstReportFlowState();
  const source=target.firstReportFlow&&typeof target.firstReportFlow==='object'?target.firstReportFlow:{};
  const validStep=id=>FIRST_REPORT_STEPS.includes(String(id||''));
  const flow={...defaults,...source};
  flow.enabled=source.enabled!==false;
  flow.completed=Boolean(source.completed);
  flow.completedAt=flow.completed?String(source.completedAt||source.updatedAt||defaults.updatedAt):null;
  flow.dismissed=Boolean(source.dismissed);
  flow.dismissedAt=flow.dismissed?String(source.dismissedAt||source.updatedAt||defaults.updatedAt):null;
  flow.currentStepId=validStep(source.currentStepId)?String(source.currentStepId):'createReport';
  flow.completedStepIds=[...new Set((Array.isArray(source.completedStepIds)?source.completedStepIds:[]).map(String).filter(validStep))];
  flow.skippedStepIds=[...new Set((Array.isArray(source.skippedStepIds)?source.skippedStepIds:[]).map(String).filter(validStep))];
  flow.createdAt=String(source.createdAt||defaults.createdAt);
  flow.updatedAt=String(source.updatedAt||flow.createdAt);
  flow.version=Number(source.version)||FIRST_REPORT_FLOW_VERSION;
  target.firstReportFlow=flow;
  return flow;
}
function firstReportStepLabel(stepId){
  return ({
    createReport:t('firstReportCreateReport'),
    addClientBasics:t('firstReportAddClientBasics'),
    addCompetitors:t('firstReportAddCompetitors'),
    uploadMaterials:t('firstReportUploadMaterials'),
    reviewMaterialsInventory:t('firstReportReviewMaterials'),
    buildSourceRegistry:t('firstReportBuildSources'),
    addEvidence:t('firstReportAddEvidence'),
    reviewEvidence:t('firstReportReviewEvidence'),
    buildDraft:t('firstReportBuildDraft'),
    runQualityChecklist:t('firstReportRunQualityChecklist'),
    exportClientReport:t('firstReportExportClientReport')
  })[stepId]||t('firstReportFallback');
}
function firstReportMeaningfulScore(reportData=REPORT){
  const r=reportData||{};
  const title=String(r.meta?.title||'').trim();
  const defaultTitle=/^(marketing report studio|ринкова конкурентна розвідка)$/i;
  const draftBlocks=(r.reportSections||[]).flatMap(section=>section.blocks||[]);
  return [
    title && !defaultTitle.test(title),
    String(r.meta?.companyName||'').trim(),
    (r.companies||[]).length,
    (r.datasets||[]).length,
    (r.files||[]).length,
    (r.materialsInventory?.items||[]).length,
    (r.competitorProfiles?.items||[]).filter(profile=>profile.status==='active').length,
    (r.pricingFeatureMatrix?.featureRows||[]).length,
    (r.sourceRegistry?.items||[]).length,
    (r.evidenceCards?.items||[]).length,
    draftBlocks.length,
    r.meta?.clientExportedAt
  ].filter(Boolean).length;
}
function isReportEmptyOrNearlyEmpty(reportData=REPORT){
  return firstReportMeaningfulScore(reportData)<=1;
}
function hasDraftBlocks(reportData=REPORT){
  return (reportData.reportSections||[]).some(section=>(section.blocks||[]).length>0);
}
function firstReportStepDetected(reportData,stepId){
  const r=reportData||{};
  const cards=r.evidenceCards?.items||[];
  const client=(r.companies||[]).find(c=>c.type==='client');
  const competitors=(r.companies||[]).filter(c=>c.type!=='client');
  const activeProfiles=(r.competitorProfiles?.items||[]).filter(profile=>profile.status==='active');
  const title=String(r.meta?.title||'').trim();
  const checklist=runReportQualityChecklist(r);
  if(stepId==='createReport') return Boolean(title && !/^marketing report studio$/i.test(title));
  if(stepId==='addClientBasics') return Boolean(String(r.meta?.companyName||'').trim() || client);
  if(stepId==='addCompetitors') return activeProfiles.length>0 || competitors.length>0;
  if(stepId==='uploadMaterials') return (r.materialsInventory?.items||[]).length>0 || (r.files||[]).length>0 || (r.datasets||[]).length>0;
  if(stepId==='reviewMaterialsInventory') return (r.materialsInventory?.items||[]).length>0;
  if(stepId==='buildSourceRegistry') return (r.sourceRegistry?.items||[]).length>0;
  if(stepId==='addEvidence') return cards.length>0;
  if(stepId==='reviewEvidence') return cards.some(card=>card.reviewStatus==='approved');
  if(stepId==='buildDraft') return hasDraftBlocks(r);
  if(stepId==='runQualityChecklist') return Boolean(checklist && Array.isArray(checklist.items));
  if(stepId==='exportClientReport') return Boolean(r.meta?.clientExportedAt || r.meta?.clientPackageExportedAt);
  return false;
}
function getFirstReportProgress(reportData=REPORT){
  const flow=normalizeFirstReportFlowState(reportData);
  const steps=FIRST_REPORT_STEPS.map(stepId=>{
    const detected=firstReportStepDetected(reportData,stepId);
    const skipped=flow.skippedStepIds.includes(stepId);
    const manual=flow.completedStepIds.includes(stepId);
    const warnings=getFirstReportStepWarnings(reportData,stepId);
    const status=(detected||manual)?'completed':(skipped?'skipped':(warnings.some(w=>/^Blocked:/i.test(w))?'blocked':(flow.currentStepId===stepId?'in_progress':'not_started')));
    return {stepId,label:firstReportStepLabel(stepId),status,warnings};
  });
  const completed=steps.filter(step=>step.status==='completed').length;
  return {steps,completed,total:FIRST_REPORT_STEPS.length,percent:Math.round((completed/FIRST_REPORT_STEPS.length)*100),nextStepId:getNextRecommendedFirstReportStep(reportData),isDemo:Boolean(reportData?.meta?.isDemoReport),isEmpty:isReportEmptyOrNearlyEmpty(reportData)};
}
function markFirstReportStepComplete(reportData,stepId){
  const flow=normalizeFirstReportFlowState(reportData);
  const id=FIRST_REPORT_STEPS.includes(String(stepId||''))?String(stepId):flow.currentStepId;
  if(!flow.completedStepIds.includes(id)) flow.completedStepIds.push(id);
  flow.currentStepId=FIRST_REPORT_STEPS[Math.min(FIRST_REPORT_STEPS.indexOf(id)+1,FIRST_REPORT_STEPS.length-1)]||id;
  flow.updatedAt=new Date().toISOString();
  if(flow.completedStepIds.length>=FIRST_REPORT_STEPS.length){flow.completed=true; flow.completedAt=flow.updatedAt;}
  return flow;
}
function getNextRecommendedFirstReportStep(reportData=REPORT){
  const flow=normalizeFirstReportFlowState(reportData);
  for(const stepId of FIRST_REPORT_STEPS){
    if(flow.skippedStepIds.includes(stepId)) continue;
    if(!firstReportStepDetected(reportData,stepId) && !flow.completedStepIds.includes(stepId)) return stepId;
  }
  return 'exportClientReport';
}
function getFirstReportStepWarnings(reportData=REPORT,stepId){
  const r=reportData||{};
  const warnings=[];
  if(isClientLocked() || r.meta?.clientLocked) warnings.push('Blocked: clientLocked reports cannot show guided editing controls.');
  if(stepId==='buildSourceRegistry' && !(r.materialsInventory?.items||[]).length) warnings.push('Upload or import materials before building sources.');
  if(stepId==='addEvidence' && !(r.sourceRegistry?.items||[]).length) warnings.push('Create sources before adding evidence.');
  if(stepId==='reviewEvidence' && !(r.evidenceCards?.items||[]).length) warnings.push('Add evidence before review.');
  if(stepId==='buildDraft' && !(r.evidenceCards?.items||[]).some(card=>card.reviewStatus==='approved')) warnings.push('Approve evidence before building draft blocks.');
  if(stepId==='exportClientReport'){
    const checklist=runReportQualityChecklist(r);
    if(checklist.blockers?.length) warnings.push(`${checklist.blockers.length} quality blocker(s) must be resolved before client export.`);
  }
  if(r.meta?.isDemoReport) warnings.push('You are viewing sample data.');
  return warnings;
}
function resetFirstReportFlow(reportData=REPORT){
  if(!canShowFirstReportFlow(reportData)) return {ok:false,errors:['First report guide is unavailable in this mode.']};
  reportData.firstReportFlow=createDefaultFirstReportFlowState();
  return {ok:true,firstReportFlow:reportData.firstReportFlow};
}
function canShowFirstReportFlow(context=REPORT){
  const report=context?.reportData||context||REPORT;
  if(isClientLocked() || report?.meta?.clientLocked===true) return false;
  if(cloudSync.ready && !['owner','editor','admin'].includes(String(cloudSync.role||''))) return false;
  return true;
}
function normalizeVersionRetentionPolicy(reportDataOrWorkspace){
  const target=reportDataOrWorkspace&&typeof reportDataOrWorkspace==='object'?reportDataOrWorkspace:{};
  const governance=target.governanceSettings?normalizeGovernanceSettings(target):createDefaultGovernanceSettings();
  const base={...createDefaultVersionRetentionPolicy(),...governance.retentionPolicy};
  const policy=target.versionRetentionPolicy&&typeof target.versionRetentionPolicy==='object'?{...base,...target.versionRetentionPolicy}:base;
  policy.enabled=Boolean(policy.enabled);
  policy.mode=VERSION_RETENTION_MODES.includes(String(policy.mode))?String(policy.mode):'preview_only';
  policy.minVersionsToKeep=Math.max(1,Number(policy.minVersionsToKeep)||20);
  policy.minDaysToKeep=Math.max(0,Number(policy.minDaysToKeep)||90);
  policy.keepMonthlySnapshots=policy.keepMonthlySnapshots!==false;
  policy.keepVersionsWithClientExports=policy.keepVersionsWithClientExports!==false;
  policy.keepVersionsWithRestoreEvents=policy.keepVersionsWithRestoreEvents!==false;
  policy.keepVersionsWithAiConversions=policy.keepVersionsWithAiConversions!==false;
  policy.keepVersionsWithApprovedEvidenceChanges=policy.keepVersionsWithApprovedEvidenceChanges!==false;
  policy.keepVersionsWithQualityReadyStatus=policy.keepVersionsWithQualityReadyStatus!==false;
  policy.alwaysKeepCurrentVersion=policy.alwaysKeepCurrentVersion!==false;
  policy.alwaysKeepRestoredVersions=policy.alwaysKeepRestoredVersions!==false;
  policy.alwaysKeepClientExportedVersions=policy.alwaysKeepClientExportedVersions!==false;
  policy.alwaysKeepAuditReferencedVersions=policy.alwaysKeepAuditReferencedVersions!==false;
  policy.alwaysKeepPinnedVersions=policy.alwaysKeepPinnedVersions!==false;
  policy.allowArchive=policy.allowArchive!==false;
  policy.allowHardDelete=false;
  policy.requireConfirmation=policy.requireConfirmation!==false;
  policy.createdAt=String(policy.createdAt||new Date().toISOString());
  policy.updatedAt=String(policy.updatedAt||policy.createdAt);
  target.versionRetentionPolicy=policy;
  target.versionRetentionState=target.versionRetentionState&&typeof target.versionRetentionState==='object'?target.versionRetentionState:{};
  target.versionRetentionState.pinnedVersionIds=Array.isArray(target.versionRetentionState.pinnedVersionIds)?target.versionRetentionState.pinnedVersionIds.map(String):[];
  target.versionRetentionState.archivedVersionIds=Array.isArray(target.versionRetentionState.archivedVersionIds)?target.versionRetentionState.archivedVersionIds.map(String):[];
  target.versionRetentionState.cleanupCandidateVersionIds=Array.isArray(target.versionRetentionState.cleanupCandidateVersionIds)?target.versionRetentionState.cleanupCandidateVersionIds.map(String):[];
  target.versionRetentionState.updatedAt=target.versionRetentionState.updatedAt||null;
  return policy;
}
function localReportVersionsForRetention(reportData=REPORT){
  ensureVersionDiffBaselineReport();
  const current=createReportVersionSnapshot(reportData);
  current.versionId=currentVersionLabel();
  current.label='Current report';
  const baseline=createReportVersionSnapshot(VERSION_DIFF_BASELINE_REPORT);
  baseline.versionId=baseline.versionId==='current'?'loaded-baseline':baseline.versionId;
  baseline.label='Loaded/start baseline';
  return [baseline,current].filter((item,index,arr)=>arr.findIndex(other=>other.versionId===item.versionId)===index);
}
function getProtectedVersionIds(report, versions, auditLog){
  const policy=normalizeVersionRetentionPolicy(report);
  const protectedIds=new Set();
  const currentId=currentVersionLabel();
  if(policy.alwaysKeepCurrentVersion) protectedIds.add(currentId);
  const state=report.versionRetentionState||{};
  if(policy.alwaysKeepPinnedVersions) (state.pinnedVersionIds||[]).forEach(id=>protectedIds.add(id));
  if(policy.alwaysKeepRestoredVersions && report.meta?.restoredFromVersionId) protectedIds.add(String(report.meta.restoredFromVersionId));
  if(policy.alwaysKeepClientExportedVersions && report.meta?.clientExportedAt) protectedIds.add(currentId);
  for(const event of (auditLog?.events||report.aiAuditLog?.events||[])){
    if(policy.alwaysKeepAuditReferencedVersions){
      [event.statusBefore,event.statusAfter,event.outputId].filter(Boolean).forEach(id=>protectedIds.add(String(id)));
    }
    if(event.eventType==='report_version_restored'){
      if(event.statusBefore) protectedIds.add(String(event.statusBefore));
      if(event.statusAfter) protectedIds.add(String(event.statusAfter));
    }
  }
  for(const version of (versions||[])){
    if(version.qualityChecklist?.status==='ready' && policy.keepVersionsWithQualityReadyStatus) protectedIds.add(version.versionId);
    const ageDays=(Date.now()-new Date(version.createdAt||Date.now()).getTime())/86400000;
    if(ageDays<=policy.minDaysToKeep) protectedIds.add(version.versionId);
  }
  if((versions||[]).length<=policy.minVersionsToKeep) (versions||[]).forEach(version=>protectedIds.add(version.versionId));
  return protectedIds;
}
function classifyReportVersionsForRetention(report, versions, policy=normalizeVersionRetentionPolicy(report)){
  const state=report.versionRetentionState||{};
  const protectedIds=getProtectedVersionIds(report,versions,report.aiAuditLog);
  const pinned=new Set(state.pinnedVersionIds||[]);
  const archived=new Set(state.archivedVersionIds||[]);
  const currentId=currentVersionLabel();
  return (versions||[]).map(version=>{
    const versionId=String(version.versionId||version.id||'unknown');
    const reasons=[];
    let classification='unknown';
    if(versionId===currentId){classification='current'; reasons.push('current active version');}
    else if(pinned.has(versionId)){classification='pinned'; reasons.push('pinned manually');}
    else if(protectedIds.has(versionId)){classification='protected'; reasons.push('protected by retention policy');}
    else if(archived.has(versionId)){classification='archive_candidate'; reasons.push('already archived locally');}
    else if(!policy.keepAllVersionsByDefault && VERSION_CLEANUP_ENABLED){classification='cleanup_candidate'; reasons.push('eligible by policy preview');}
    else {classification='archive_candidate'; reasons.push('preview-only candidate; cleanup disabled');}
    return {...version,versionId,classification,retentionStatus:classification,protected:protectedIds.has(versionId)||classification==='current'||classification==='pinned',pinned:pinned.has(versionId),archived:archived.has(versionId),protectedReasons:reasons};
  });
}
function getVersionRetentionCandidates(report, versions, policy=normalizeVersionRetentionPolicy(report)){
  return classifyReportVersionsForRetention(report,versions,policy).filter(item=>['cleanup_candidate','archive_candidate'].includes(item.classification)&&!item.protected);
}
function buildVersionCleanupPreview(report, versions, policy=normalizeVersionRetentionPolicy(report)){
  const classified=classifyReportVersionsForRetention(report,versions,policy);
  const candidates=classified.filter(item=>item.classification==='cleanup_candidate');
  const archiveCandidates=classified.filter(item=>item.classification==='archive_candidate'&&!item.protected);
  return {policy,cleanupEnabled:VERSION_CLEANUP_ENABLED,totalVersions:classified.length,protectedVersions:classified.filter(item=>item.protected).length,pinnedVersions:classified.filter(item=>item.pinned).length,archiveCandidates:archiveCandidates.length,cleanupCandidates:candidates.length,versions:classified,warnings:['Cleanup is preview-only by default. No snapshots are deleted automatically.']};
}
function validateVersionCleanupSelection(report, versions, selectedVersionIds, policy=normalizeVersionRetentionPolicy(report)){
  const selected=new Set((selectedVersionIds||[]).map(String));
  const classified=classifyReportVersionsForRetention(report,versions,policy);
  const blocked=classified.filter(item=>selected.has(item.versionId)&&item.protected);
  if(blocked.length){
    appendAiAuditEvent(report,createVersionCleanupAuditEvent({reportData:report,action:'version_cleanup_rejected_protected',versionIds:blocked.map(item=>item.versionId),reason:'Protected versions cannot be cleaned up.',protectedReason:blocked.flatMap(item=>item.protectedReasons||[]).join('; '),retentionPolicySnapshot:policy}));
  }
  return {ok:!blocked.length,blocked,selected:[...selected]};
}
function createVersionCleanupAuditEvent(input={}){
  return createAiAuditEvent(input.reportData||REPORT,{eventType:AI_AUDIT_EVENT_TYPES.includes(input.action)?input.action:'version_cleanup_previewed',provider:'local',providerMode:'disabled',generatedBy:'manual',notes:String(input.reason||''),warnings:[input.protectedReason||''].filter(Boolean),outputRefs:(input.versionIds||[]).map(id=>normalizeAiOutputRef({type:'unknown',id,label:'Report version',status:'retention'}))});
}
function markVersionsAsArchived(report, versionIds, options={}){
  const policy=normalizeVersionRetentionPolicy(report);
  if(policy.mode!=='archive_only' || !VERSION_CLEANUP_ENABLED) return {archived:0,error:'Archive is disabled in preview-only retention mode.'};
  const versions=localReportVersionsForRetention(report);
  const validation=validateVersionCleanupSelection(report,versions,versionIds,policy);
  if(!validation.ok) return {archived:0,error:'Protected versions cannot be archived.'};
  const state=report.versionRetentionState;
  const ids=new Set([...(state.archivedVersionIds||[]),...(versionIds||[]).map(String)]);
  state.archivedVersionIds=[...ids];
  state.updatedAt=new Date().toISOString();
  appendAiAuditEvent(report,createVersionCleanupAuditEvent({reportData:report,action:'version_archived',versionIds:versionIds||[],reason:options.reason||'Versions archived locally.',retentionPolicySnapshot:policy}));
  return {archived:(versionIds||[]).length,error:''};
}
function markVersionsAsCleanupCandidates(report, versionIds, options={}){
  normalizeVersionRetentionPolicy(report);
  const state=report.versionRetentionState;
  const ids=new Set([...(state.cleanupCandidateVersionIds||[]),...(versionIds||[]).map(String)]);
  state.cleanupCandidateVersionIds=[...ids];
  state.updatedAt=new Date().toISOString();
  return {marked:(versionIds||[]).length};
}
function pinVersionForRetention(report,versionId){
  if(!guardAdmin()) return null;
  normalizeVersionRetentionPolicy(report);
  const id=String(versionId||'');
  if(!id) return null;
  const state=report.versionRetentionState;
  state.pinnedVersionIds=[...new Set([...(state.pinnedVersionIds||[]),id])];
  state.updatedAt=new Date().toISOString();
  appendAiAuditEvent(report,createVersionCleanupAuditEvent({reportData:report,action:'version_pinned',versionIds:[id],reason:'Version pinned by analyst/editor.'}));
  return id;
}
function unpinVersionForRetention(report,versionId){
  if(!guardAdmin()) return null;
  normalizeVersionRetentionPolicy(report);
  const id=String(versionId||'');
  const state=report.versionRetentionState;
  state.pinnedVersionIds=(state.pinnedVersionIds||[]).filter(item=>item!==id);
  state.updatedAt=new Date().toISOString();
  appendAiAuditEvent(report,createVersionCleanupAuditEvent({reportData:report,action:'version_unpinned',versionIds:[id],reason:'Version unpinned by analyst/editor.'}));
  return id;
}
function checklistItem(category,severity,message){
  return {category,severity,message};
}
function sectionHasClientContent(section){
  return (section?.blocks||[]).some(block=>String(block?.text||'').trim());
}
function getReportCompletenessScore(reportData){
  const report=normalizeReportSchema(clone(reportData||{}));
  const required=['cover','executiveSummary','researchScope','competitors','recommendations','sourcesEvidence'];
  const passed=required.filter(id=>sectionHasClientContent(getReportSection(report,id)) || (id==='cover'&&getReportSection(report,id)) || (id==='sourcesEvidence'&&getReportSection(report,id))).length;
  return Math.round((passed/required.length)*100);
}
function getEvidenceQualityScore(reportData){
  const cards=normalizeEvidenceCards(clone(reportData||{})).items||[];
  const approved=cards.filter(card=>card.reviewStatus==='approved');
  if(!cards.length) return 0;
  const sourced=approved.filter(card=>(card.sourceIds||[]).length).length;
  return Math.round(((approved.length/cards.length)*60 + (approved.length?sourced/approved.length:0)*40));
}
function getSourceCoverageScore(reportData){
  const report=clone(reportData||{});
  const sources=normalizeSourceRegistry(report).items||[];
  const approved=getApprovedEvidenceCards(report);
  if(!sources.length) return 0;
  if(!approved.length) return 50;
  const linked=approved.filter(card=>(card.sourceIds||[]).length).length;
  return Math.round((linked/approved.length)*100);
}
function findUnsafeClientKeys(value,path='',hits=[]){
  if(!value || typeof value!=='object' || hits.length>20) return hits;
  for(const [key,val] of Object.entries(value)){
    const next=path?`${path}.${key}`:key;
    if(/(token|secret|apikey|api_key|environment|env|cloudflareAccessToken|localPathLabel|handle|analystNotes|reviewNotes|rejectionReason|reviewedBy)/i.test(key)){
      hits.push(next);
    }
    if(val && typeof val==='object') findUnsafeClientKeys(val,next,hits);
  }
  return hits;
}
function getClientSafetyIssues(reportData){
  const report=sanitizeClientExportData(reportData);
  const issues=[];
  const exportedEvidence=buildEvidenceSummaryForExport(report);
  const rejected=(report.evidenceCards?.items||[]).filter(card=>card.reviewStatus==='rejected');
  if(rejected.length) issues.push('Rejected evidence is present in sanitized export data.');
  if(exportedEvidence.some(card=>card.reviewStatus==='rejected')) issues.push('Rejected evidence appears in evidence summary.');
  if(!report.meta?.clientLocked) issues.push('Client export is not locked.');
  if(!report.clientExportV2) issues.push('Client Export V2 payload is missing.');
  const unsafe=findUnsafeClientKeys(report);
  if(unsafe.length) issues.push(`Potential internal fields found: ${unsafe.slice(0,5).join(', ')}`);
  return issues;
}
function getExportReadinessStatus(reportData){
  const result=runReportQualityChecklist(reportData);
  if(result.blockers.length) return 'not_ready';
  if(result.warnings.length) return 'needs_review';
  return 'ready';
}
function runReportQualityChecklist(reportData){
  const report=clone(reportData||{});
  normalizeReportSchema(report);
  normalizeEvidenceCards(report);
  normalizeSourceRegistry(report);
  const items=[];
  const section=(id)=>getReportSection(report,id);
  if(!(report.reportSections||[]).length) items.push(checklistItem('report_structure','blocker','No Report Schema V2 sections found.'));
  section('cover')?items.push(checklistItem('report_structure','passed','Cover section exists.')):items.push(checklistItem('report_structure','blocker','Cover section is missing.'));
  sectionHasClientContent(section('executiveSummary'))?items.push(checklistItem('report_structure','passed','Executive summary has content.')):items.push(checklistItem('report_structure','blocker','Executive summary has no draft content.'));
  sectionHasClientContent(section('researchScope'))?items.push(checklistItem('report_structure','passed','Research scope has content.')):items.push(checklistItem('report_structure','warning','Research scope is empty.'));
  sectionHasClientContent(section('competitors'))?items.push(checklistItem('report_structure','passed','Competitors section has content.')):items.push(checklistItem('report_structure','warning','Competitors section is empty.'));
  sectionHasClientContent(section('recommendations'))?items.push(checklistItem('report_structure','passed','Recommendations section has content.')):items.push(checklistItem('report_structure','warning','No recommendation draft blocks yet.'));
  section('sourcesEvidence')?items.push(checklistItem('report_structure','passed','Sources and Evidence section exists.')):items.push(checklistItem('report_structure','blocker','Sources and Evidence section is missing.'));

  const cards=report.evidenceCards.items||[];
  const approved=cards.filter(card=>card.reviewStatus==='approved');
  const needsReview=cards.filter(card=>card.reviewStatus==='needs_review');
  approved.length?items.push(checklistItem('approved_evidence','passed',`${approved.length} approved evidence card(s).`)):items.push(checklistItem('approved_evidence','blocker','No approved evidence cards.'));
  if(needsReview.length) items.push(checklistItem('approved_evidence','warning',`${needsReview.length} evidence card(s) still need review.`));
  const clientData=buildClientExportDataV2(report);
  const exportedEvidenceIds=new Set(clientData.evidence.map(card=>card.id));
  const rejectedInExport=cards.some(card=>card.reviewStatus==='rejected' && exportedEvidenceIds.has(card.id));
  rejectedInExport?items.push(checklistItem('approved_evidence','blocker','Rejected evidence appears in client export data.')):items.push(checklistItem('approved_evidence','passed','Rejected evidence is excluded from client export data.'));
  const exportedBlocks=clientData.sections.flatMap(sec=>sec.blocks||[]);
  const unreferencedBlocks=exportedBlocks.filter(block=>!(block.sourceIds||[]).length && !(block.evidenceCardIds||[]).length);
  if(unreferencedBlocks.length) items.push(checklistItem('approved_evidence','warning',`${unreferencedBlocks.length} exported draft block(s) have no evidence/source references.`));
  const aiBlocks=(report.reportSections||[]).flatMap(section=>(section.blocks||[]).map(block=>({...block,sectionId:block.sectionId||section.id}))).filter(block=>['ai_preview','ai_dry_run'].includes(String(block.generatedBy||'')) || block.originalSuggestionId || block.provenanceId);
  const needsReviewAi=aiBlocks.filter(block=>String(block.status||'draft')==='needs_review');
  if(needsReviewAi.length) items.push(checklistItem('client_safety','warning',`${needsReviewAi.length} AI-derived draft block(s) still need review.`));
  const unsourcedAi=aiBlocks.filter(block=>!(block.sourceIds||[]).length && !(block.evidenceCardIds||[]).length);
  if(unsourcedAi.length) items.push(checklistItem('sources','warning',`${unsourcedAi.length} AI-derived draft block(s) have no evidence/source links.`));

  const sources=report.sourceRegistry.items||[];
  sources.length?items.push(checklistItem('sources','passed',`${sources.length} source(s) in Source Registry.`)):items.push(checklistItem('sources','blocker','Source Registry has no sources.'));
  const unsourced=approved.filter(card=>!(card.sourceIds||[]).length);
  unsourced.length?items.push(checklistItem('sources','blocker',`${unsourced.length} approved evidence card(s) lack linked sources.`)):items.push(checklistItem('sources','passed','Approved evidence cards have linked sources.'));
  const weakSources=sources.filter(source=>['weak','unreviewed','needs_review'].includes(String(source.credibilityStatus||'')));
  if(weakSources.length) items.push(checklistItem('sources','warning',`${weakSources.length} source(s) need credibility review.`));

  const matrix=normalizePricingFeatureMatrix(report);
  const matrixCoverage=getMatrixEvidenceCoverage(report);
  if(matrix.competitorIds.length) items.push(checklistItem('pricing_features','passed',`Pricing/feature matrix includes ${matrix.competitorIds.length} competitor(s).`));
  else items.push(checklistItem('pricing_features','warning','Pricing/feature matrix has no competitors yet.'));
  const matrixNeedsReview=getMatrixCellsNeedingReview(report);
  if(matrixNeedsReview.length) items.push(checklistItem('pricing_features','warning',`${matrixNeedsReview.length} matrix cell(s) need review, sources, or non-rejected evidence.`));
  if(matrixCoverage.total && matrixCoverage.score<100) items.push(checklistItem('pricing_features','warning',`Matrix evidence/source coverage is ${matrixCoverage.score}%. Unknown cells must remain clearly marked.`));

  const safety=getClientSafetyIssues(report);
  if(safety.length) safety.forEach(issue=>items.push(checklistItem('client_safety','blocker',issue)));
  else items.push(checklistItem('client_safety','passed','Client export data has no obvious internal/review-only fields.'));
  try{
    buildClientExportDataV2(report);
    sanitizeClientExportData(report);
    buildSourcesIndexForExport(report);
    buildEvidenceSummaryForExport(report);
    buildClientReadmeText(report,0);
    buildPrintCss();
    items.push(checklistItem('export_package','passed','Client package files can be generated.'));
  }catch(e){
    items.push(checklistItem('export_package','blocker',`Client package generation check failed: ${e?.message||e}`));
  }
  if(report.meta?.isDemoReport) items.push(checklistItem('demo_status','warning','Current report is demo/sample data. Do not send as real research.'));
  else items.push(checklistItem('demo_status','passed','Report is not marked as demo data.'));

  const blockers=items.filter(item=>item.severity==='blocker');
  const warnings=items.filter(item=>item.severity==='warning');
  const passed=items.filter(item=>item.severity==='passed');
  const status=blockers.length?'not_ready':(warnings.length?'needs_review':'ready');
  return {
    status,
    completenessScore:getReportCompletenessScore(report),
    evidenceScore:getEvidenceQualityScore(report),
    sourceCoverageScore:getSourceCoverageScore(report),
    clientSafetyStatus:blockers.some(item=>item.category==='client_safety')?'not_ready':'ready',
    items,
    blockers,
    warnings,
    passed
  };
}
function canExportClientReport(reportData){
  const policy=getEffectiveGovernancePolicy(reportData).exportPolicy;
  if(!policy.requireQualityChecklistBeforeClientExport) return true;
  const checklist=runReportQualityChecklist(reportData);
  return policy.blockExportOnQualityBlockers?!checklist.blockers.length:true;
}
function createDefaultAiAssistanceState(){
  return {aiEnabled:false, aiMode:'disabled', taskDrafts:[], suggestions:[], updatedAt:null};
}
function normalizeAiSuggestion(item){
  const out=item&&typeof item==='object'?{...item}:{};
  out.id=String(out.id||uid('ai'));
  out.taskType=AI_TASK_TYPES.includes(String(out.taskType))?String(out.taskType):'extract_evidence_candidates';
  out.title=String(out.title||AI_TASK_DEFINITIONS[out.taskType]?.label||'AI suggestion');
  out.summary=String(out.summary||'');
  out.inputRefs=Array.isArray(out.inputRefs)?out.inputRefs.map(ref=>ref&&typeof ref==='object'?normalizeAiInputRef(ref):String(ref)):[];
  out.outputPreview=out.outputPreview&&typeof out.outputPreview==='object'?out.outputPreview:{};
  out.status=AI_SUGGESTION_STATUS.includes(String(out.status))?String(out.status):'draft';
  out.taskRunId=String(out.taskRunId||out.outputPreview.taskRunId||'');
  out.provider=String(out.provider||out.outputPreview.provider||'dry_run');
  out.providerMode=AI_PROVIDER_MODES.includes(String(out.providerMode))?String(out.providerMode):(out.provider==='dry_run'?'dry_run':'unknown');
  out.generatedBy=AI_REVIEW_GENERATORS.includes(String(out.generatedBy))?String(out.generatedBy):(out.providerMode==='dry_run'?'ai_dry_run':'ai_preview');
  out.createdAt=String(out.createdAt||'');
  out.updatedAt=String(out.updatedAt||out.createdAt||'');
  return out;
}
function normalizeAiAssistanceState(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const state=report.aiAssistance&&typeof report.aiAssistance==='object'
    ? report.aiAssistance
    : createDefaultAiAssistanceState();
  state.aiEnabled=false;
  state.aiMode='disabled';
  state.taskDrafts=Array.isArray(state.taskDrafts)?state.taskDrafts.map(normalizeAiSuggestion):[];
  state.suggestions=Array.isArray(state.suggestions)?state.suggestions.map(normalizeAiSuggestion):[];
  state.updatedAt=state.updatedAt||null;
  report.aiAssistance=state;
  return state;
}
function createDefaultAiAuditLog(){
  return {events:[], provenance:[], updatedAt:null};
}
function normalizeAiInputRef(ref){
  const out=ref&&typeof ref==='object'?{...ref}:{id:String(ref||'')};
  out.type=AI_INPUT_REF_TYPES.includes(String(out.type))?String(out.type):'unknown';
  out.id=String(out.id||out.sourceId||out.evidenceCardId||out.materialId||out.sectionId||'');
  out.label=String(out.label||out.id||'');
  out.sectionId=String(out.sectionId||'');
  out.sourceId=String(out.sourceId||'');
  out.evidenceCardId=String(out.evidenceCardId||'');
  out.materialId=String(out.materialId||'');
  return out;
}
function normalizeAiOutputRef(ref){
  const out=ref&&typeof ref==='object'?{...ref}:{id:String(ref||'')};
  out.type=AI_OUTPUT_REF_TYPES.includes(String(out.type))?String(out.type):'unknown';
  out.id=String(out.id||'');
  out.label=String(out.label||out.id||'');
  out.sectionId=String(out.sectionId||'');
  out.status=String(out.status||'');
  return out;
}
function normalizeAiProvenanceRecord(record){
  const out=record&&typeof record==='object'?{...record}:{};
  out.id=String(out.id||uid('aip'));
  out.taskRunId=String(out.taskRunId||'');
  out.taskType=AI_TASK_TYPES.includes(String(out.taskType))?String(out.taskType):'extract_evidence_candidates';
  out.suggestionId=String(out.suggestionId||'');
  out.originalSuggestionId=String(out.originalSuggestionId||out.suggestionId||'');
  out.provider=String(out.provider||'dry_run');
  out.providerMode=AI_PROVIDER_MODES.includes(String(out.providerMode))?String(out.providerMode):'unknown';
  out.generatedBy=AI_REVIEW_GENERATORS.includes(String(out.generatedBy))?String(out.generatedBy):'unknown';
  out.inputRefs=Array.isArray(out.inputRefs)?out.inputRefs.map(normalizeAiInputRef):[];
  out.outputRefs=Array.isArray(out.outputRefs)?out.outputRefs.map(normalizeAiOutputRef):[];
  out.warnings=Array.isArray(out.warnings)?out.warnings.map(String):[];
  out.createdAt=String(out.createdAt||new Date().toISOString());
  out.updatedAt=String(out.updatedAt||out.createdAt);
  return out;
}
function normalizeAiAuditEvent(event){
  const out=event&&typeof event==='object'?{...event}:{};
  out.id=String(out.id||uid('aie'));
  out.eventType=AI_AUDIT_EVENT_TYPES.includes(String(out.eventType))?String(out.eventType):'unknown';
  out.taskRunId=String(out.taskRunId||'');
  out.taskType=AI_TASK_TYPES.includes(String(out.taskType))?String(out.taskType):'';
  out.suggestionId=String(out.suggestionId||'');
  out.outputType=String(out.outputType||'');
  out.outputId=String(out.outputId||'');
  out.actorRole=String(out.actorRole||'editor');
  out.actorLabel=String(out.actorLabel||'local analyst');
  out.provider=String(out.provider||'dry_run');
  out.providerMode=AI_PROVIDER_MODES.includes(String(out.providerMode))?String(out.providerMode):'unknown';
  out.generatedBy=AI_REVIEW_GENERATORS.includes(String(out.generatedBy))?String(out.generatedBy):'unknown';
  out.inputRefs=Array.isArray(out.inputRefs)?out.inputRefs.map(normalizeAiInputRef):[];
  out.outputRefs=Array.isArray(out.outputRefs)?out.outputRefs.map(normalizeAiOutputRef):[];
  out.statusBefore=String(out.statusBefore||'');
  out.statusAfter=String(out.statusAfter||'');
  out.warnings=Array.isArray(out.warnings)?out.warnings.map(String):[];
  out.errorCode=String(out.errorCode||'');
  out.createdAt=String(out.createdAt||new Date().toISOString());
  out.notes=String(out.notes||'');
  return out;
}
function normalizeAiAuditLog(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const log=report.aiAuditLog&&typeof report.aiAuditLog==='object'?report.aiAuditLog:createDefaultAiAuditLog();
  log.events=Array.isArray(log.events)?log.events.map(normalizeAiAuditEvent):[];
  log.provenance=Array.isArray(log.provenance)?log.provenance.map(normalizeAiProvenanceRecord):[];
  log.updatedAt=log.updatedAt||null;
  report.aiAuditLog=log;
  return log;
}
function aiProviderMode(provider, aiStatus){
  const name=String(provider||aiStatus?.provider||'dry_run');
  if(name==='dry_run') return 'dry_run';
  if(String(aiStatus?.currentMode||'')==='disabled') return 'disabled';
  if(name && name!=='unknown') return 'real_provider';
  return 'unknown';
}
function aiActor(){
  const user=currentAiUser();
  return {actorRole:String(user.role||'viewer'), actorLabel:['owner','editor','admin'].includes(String(user.role||''))?reviewActorLabel():'viewer'};
}
function createAiAuditEvent(reportData,input={}){
  return normalizeAiAuditEvent({...aiActor(),...input,createdAt:input.createdAt||new Date().toISOString()});
}
function appendAiAuditEvent(reportData,event){
  const log=normalizeAiAuditLog(reportData);
  const item=normalizeAiAuditEvent(event);
  log.events.push(item);
  log.updatedAt=item.createdAt;
  return item;
}
function getAiAuditEvents(reportData,filters={}){
  const events=normalizeAiAuditLog(reportData).events||[];
  return events.filter(event=>(!filters.eventType||filters.eventType==='all'||event.eventType===filters.eventType)&&(!filters.taskRunId||event.taskRunId===filters.taskRunId)&&(!filters.suggestionId||event.suggestionId===filters.suggestionId));
}
function getAiAuditEventsBySuggestionId(reportData,suggestionId){
  return getAiAuditEvents(reportData,{suggestionId:String(suggestionId||'')});
}
function getAiAuditEventsByOutputRef(reportData,outputRef){
  const type=String(outputRef?.type||outputRef?.outputType||'');
  const id=String(outputRef?.id||outputRef?.outputId||'');
  return (normalizeAiAuditLog(reportData).events||[]).filter(event=>(event.outputType===type&&event.outputId===id)||(event.outputRefs||[]).some(ref=>ref.type===type&&ref.id===id));
}
function createSuggestionProvenanceRecord(input){
  return normalizeAiProvenanceRecord(input);
}
function getAiSuggestionProvenance(reportData,suggestionId){
  const id=String(suggestionId||'');
  return (normalizeAiAuditLog(reportData).provenance||[]).find(item=>item.suggestionId===id||item.originalSuggestionId===id)||null;
}
function getOutputObjectProvenance(reportData,outputType,outputId){
  const type=String(outputType||'');
  const id=String(outputId||'');
  return (normalizeAiAuditLog(reportData).provenance||[]).filter(item=>(item.outputRefs||[]).some(ref=>ref.type===type&&ref.id===id));
}
function upsertAiProvenance(reportData,record){
  const log=normalizeAiAuditLog(reportData);
  const item=normalizeAiProvenanceRecord(record);
  const idx=log.provenance.findIndex(existing=>existing.id===item.id||(item.suggestionId&&existing.suggestionId===item.suggestionId));
  if(idx>=0) log.provenance[idx]={...log.provenance[idx],...item,updatedAt:new Date().toISOString()};
  else log.provenance.push(item);
  log.updatedAt=new Date().toISOString();
  return idx>=0?log.provenance[idx]:item;
}
function linkSuggestionToOutput(reportData,suggestionId,outputRef){
  const ref=normalizeAiOutputRef(outputRef);
  const provenance=getAiSuggestionProvenance(reportData,suggestionId);
  if(!provenance) return null;
  const refs=[...(provenance.outputRefs||[])];
  if(!refs.some(item=>item.type===ref.type&&item.id===ref.id)) refs.push(ref);
  return upsertAiProvenance(reportData,{...provenance,outputRefs:refs});
}
function linkAiTaskToSuggestions(reportData,taskRunId,suggestionIds){
  const ids=(suggestionIds||[]).map(String).filter(Boolean);
  for(const id of ids){
    const provenance=getAiSuggestionProvenance(reportData,id);
    if(provenance) upsertAiProvenance(reportData,{...provenance,taskRunId:String(taskRunId||provenance.taskRunId)});
  }
  return ids;
}
function markSuggestionConvertedInProvenance(reportData,suggestionId,outputRefs){
  const refs=(outputRefs||[]).map(normalizeAiOutputRef);
  for(const ref of refs) linkSuggestionToOutput(reportData,suggestionId,ref);
  return getAiSuggestionProvenance(reportData,suggestionId);
}
function recordAiSuggestionOutput(reportData,suggestion,output,outputType){
  if(!suggestion||!output) return output;
  output.originalSuggestionId=String(suggestion.id||output.originalSuggestionId||'');
  output.originalTaskRunId=String(suggestion.originalTaskRunId||suggestion.taskRunId||output.originalTaskRunId||'');
  output.provenanceId=String(suggestion.provenanceId||output.provenanceId||'');
  output.provider=String(suggestion.provider||output.provider||'dry_run');
  output.generatedBy=String(suggestion.generatedBy||output.generatedBy||'ai_dry_run');
  const ref=normalizeAiOutputRef({type:outputType,id:output.id||output.message||uid('out'),label:output.title||output.claim||output.message||suggestion.title||suggestion.claim||suggestion.heading||'',sectionId:output.sectionId||suggestion.sectionId||suggestion.suggestedSectionId||'',status:output.reviewStatus||output.status||'needs_review'});
  markSuggestionConvertedInProvenance(reportData,suggestion.id,[ref]);
  appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:outputType==='evidence_card'?'evidence_card_created_from_suggestion':(outputType==='draft_block'?'draft_block_created_from_suggestion':'checklist_item_created_from_suggestion'),taskRunId:output.originalTaskRunId,taskType:suggestion.taskType||'',suggestionId:suggestion.id,outputType:ref.type,outputId:ref.id,provider:output.provider,providerMode:suggestion.providerMode||'dry_run',generatedBy:output.generatedBy,inputRefs:suggestion.inputRefs||[],outputRefs:[ref],statusAfter:ref.status}));
  return output;
}
function sanitizeAiAuditForClientExport(){
  return createDefaultAiAuditLog();
}
function buildAiInputRefs(reportData,taskType,options={}){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const selectedSections=new Set((options.selectedSectionIds||[]).map(String).filter(Boolean));
  const selectedSources=new Set((options.selectedSourceIds||[]).map(String).filter(Boolean));
  const selectedMaterials=new Set((options.selectedMaterialIds||[]).map(String).filter(Boolean));
  const refs=[];
  const push=(ref)=>{const item=normalizeAiInputRef(ref); if(item.id && !refs.some(existing=>existing.type===item.type&&existing.id===item.id)) refs.push(item);};
  (report.reportSections||[]).forEach(section=>{if(!selectedSections.size||selectedSections.has(section.id)||section.id===options.selectedSectionId) push({type:'section',id:section.id,label:section.title,sectionId:section.id});});
  (report.sourceRegistry?.items||[]).forEach(source=>{if(!selectedSources.size||selectedSources.has(source.id)) push({type:'source',id:source.id,label:source.title||source.fileName,sourceId:source.id,materialId:source.materialId||'',sectionId:(source.linkedSectionIds||[])[0]||''});});
  (report.materialsInventory?.items||[]).forEach(material=>{if(!selectedMaterials.size||selectedMaterials.has(material.id)) push({type:'material',id:material.id,label:material.name,materialId:material.id,sectionId:material.linkedSectionId||''});});
  if(['suggest_recommendations','improve_executive_summary','check_source_coverage','suggest_report_sections'].includes(String(taskType))){
    (report.evidenceCards?.items||[]).filter(card=>card.reviewStatus==='approved'||taskType==='check_source_coverage').slice(0,16).forEach(card=>push({type:'evidence_card',id:card.id,label:card.claim||card.summary,evidenceCardId:card.id,sectionId:card.sectionId,sourceId:(card.sourceIds||[])[0]||''}));
  }
  return refs.slice(0,32);
}
function outputRefsForSuggestion(item,type='ai_suggestion'){
  return [normalizeAiOutputRef({type,id:item?.id||'',label:item?.title||item?.claim||item?.heading||item?.description||'',sectionId:item?.sectionId||item?.suggestedSectionId||'',status:item?.reviewStatus||'needs_review'})].filter(ref=>ref.id);
}
function stampAiPreviewOutput(output,meta={}){
  const taskRunId=String(meta.taskRunId||output.taskRunId||uid('aitask'));
  const provider=String(meta.provider||output.provider||'dry_run');
  const providerMode=AI_PROVIDER_MODES.includes(String(meta.providerMode))?String(meta.providerMode):aiProviderMode(provider,meta.aiStatus);
  const generatedBy=providerMode==='dry_run'?'ai_dry_run':'ai_preview';
  const inputRefs=(meta.inputRefs||output.inputRefs||[]).map(normalizeAiInputRef);
  const stamp=(item)=>{
    if(!item||typeof item!=='object') return item;
    item.id=String(item.id||uid('ais'));
    item.taskRunId=taskRunId;
    item.originalTaskRunId=taskRunId;
    item.provenanceId=String(item.provenanceId||uid('aip'));
    item.provider=provider;
    item.providerMode=providerMode;
    item.generatedBy=item.generatedBy||generatedBy;
    item.inputRefs=inputRefs;
    return item;
  };
  ['candidates','recommendations','summaryBlocks','coverageGaps','draftBlocks'].forEach(key=>{
    if(Array.isArray(output[key])) output[key]=output[key].map(stamp);
  });
  output.taskRunId=taskRunId;
  output.provider=provider;
  output.providerMode=providerMode;
  output.generatedBy=generatedBy;
  output.inputRefs=inputRefs;
  output.outputSuggestionIds=['candidates','recommendations','summaryBlocks','coverageGaps','draftBlocks'].flatMap(key=>(output[key]||[]).map(item=>item.id)).filter(Boolean);
  return output;
}
function beginAiPreviewAudit(reportData,taskType,aiStatus,options={}){
  const taskRunId=uid('aitask');
  const provider=String(aiStatus?.provider||'dry_run');
  const providerMode=aiProviderMode(provider,aiStatus);
  const inputRefs=buildAiInputRefs(reportData,taskType,options);
  appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:'ai_preview_requested',taskRunId,taskType,provider,providerMode,generatedBy:providerMode==='dry_run'?'ai_dry_run':'ai_preview',inputRefs}));
  return {taskRunId,taskType,provider,providerMode,inputRefs,aiStatus};
}
function failAiPreviewAudit(reportData,meta,errorCode,warnings=[]){
  appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:'ai_preview_failed',taskRunId:meta?.taskRunId,taskType:meta?.taskType,provider:meta?.provider,providerMode:meta?.providerMode,generatedBy:meta?.providerMode==='dry_run'?'ai_dry_run':'ai_preview',inputRefs:meta?.inputRefs||[],warnings,errorCode:String(errorCode||'preview_failed')}));
}
function createDefaultAiReviewQueue(){
  return {items:[], updatedAt:null};
}
function normalizeAiReviewQueueItem(item){
  const out=item&&typeof item==='object'?{...item}:{};
  out.id=String(out.id||uid('aiq'));
  out.suggestionType=AI_REVIEW_SUGGESTION_TYPES.includes(String(out.suggestionType))?String(out.suggestionType):'unknown';
  out.title=String(out.title||'AI suggestion');
  out.summary=String(out.summary||'');
  out.payload=out.payload&&typeof out.payload==='object'?out.payload:{};
  out.sourceIds=Array.isArray(out.sourceIds)?out.sourceIds.map(String).filter(Boolean):[];
  out.evidenceCardIds=Array.isArray(out.evidenceCardIds)?out.evidenceCardIds.map(String).filter(Boolean):[];
  out.materialIds=Array.isArray(out.materialIds)?out.materialIds.map(String).filter(Boolean):[];
  out.sectionId=String(out.sectionId||'');
  out.confidenceStatus=['low','medium','high','unknown'].includes(String(out.confidenceStatus))?String(out.confidenceStatus):'unknown';
  out.reviewStatus=AI_REVIEW_STATUSES.includes(String(out.reviewStatus))?String(out.reviewStatus):'ready_for_review';
  out.generatedBy=AI_REVIEW_GENERATORS.includes(String(out.generatedBy))?String(out.generatedBy):'unknown';
  out.provider=String(out.provider||'dry_run');
  out.warnings=Array.isArray(out.warnings)?out.warnings.map(String):[];
  out.analystNotes=String(out.analystNotes||'');
  out.rejectionReason=String(out.rejectionReason||'');
  out.createdAt=String(out.createdAt||new Date().toISOString());
  out.updatedAt=String(out.updatedAt||out.createdAt);
  out.reviewedAt=String(out.reviewedAt||'');
  out.reviewedBy=String(out.reviewedBy||'');
  out.convertedId=String(out.convertedId||'');
  out.originalTaskRunId=String(out.originalTaskRunId||out.taskRunId||out.payload.taskRunId||'');
  out.originalSuggestionId=String(out.originalSuggestionId||out.payload.id||out.id);
  out.provenanceId=String(out.provenanceId||out.payload.provenanceId||'');
  out.providerMode=AI_PROVIDER_MODES.includes(String(out.providerMode))?String(out.providerMode):(out.provider==='dry_run'?'dry_run':'unknown');
  out.inputRefs=Array.isArray(out.inputRefs)?out.inputRefs.map(normalizeAiInputRef):(Array.isArray(out.payload.inputRefs)?out.payload.inputRefs.map(normalizeAiInputRef):[]);
  out.outputRefs=Array.isArray(out.outputRefs)?out.outputRefs.map(normalizeAiOutputRef):[];
  return out;
}
function normalizeAiReviewQueue(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const queue=report.aiReviewQueue&&typeof report.aiReviewQueue==='object'?report.aiReviewQueue:createDefaultAiReviewQueue();
  queue.items=Array.isArray(queue.items)?queue.items.map(normalizeAiReviewQueueItem):[];
  queue.updatedAt=queue.updatedAt||null;
  report.aiReviewQueue=queue;
  return queue;
}
function queueItemFromSuggestion(suggestion){
  const raw=suggestion?.candidate||suggestion?.recommendation||suggestion?.summaryBlock||suggestion?.gap||suggestion?.block||suggestion?.payload||suggestion||{};
  const type=suggestion?.suggestionType||suggestion?.type||(
    suggestion?.candidate?'evidence_candidate':
    suggestion?.recommendation?'recommendation':
    suggestion?.summaryBlock?'executive_summary':
    suggestion?.gap?'source_coverage_gap':
    suggestion?.block?'section_draft':'unknown'
  );
  const payload=raw&&typeof raw==='object'?raw:{};
  return normalizeAiReviewQueueItem({
    id:uid('aiq'),
    suggestionType:type,
    title:payload.title||payload.heading||payload.claim||payload.id||String(type).replace(/_/g,' '),
    summary:payload.summary||payload.recommendation||payload.text||payload.description||payload.rationale||'',
    payload,
    sourceIds:payload.sourceIds||[],
    evidenceCardIds:payload.evidenceCardIds||[],
    materialIds:payload.materialIds||[],
    sectionId:payload.sectionId||payload.suggestedSectionId||'',
    confidenceStatus:payload.confidenceStatus||'unknown',
    reviewStatus:'ready_for_review',
    generatedBy:payload.generatedBy||'ai_dry_run',
    provider:suggestion?.provider||'dry_run',
    providerMode:payload.providerMode||suggestion?.providerMode||(String(suggestion?.provider||payload.provider||'dry_run')==='dry_run'?'dry_run':'unknown'),
    warnings:payload.warnings||[],
    originalTaskRunId:payload.originalTaskRunId||payload.taskRunId||suggestion?.taskRunId||'',
    originalSuggestionId:payload.id||suggestion?.id||'',
    provenanceId:payload.provenanceId||suggestion?.provenanceId||'',
    inputRefs:payload.inputRefs||suggestion?.inputRefs||[],
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
}
function validateQueueItemLinks(reportData,item){
  const sections=new Set((reportData.reportSections||[]).map(section=>section.id));
  const sources=new Set((reportData.sourceRegistry?.items||[]).map(source=>source.id));
  const evidence=new Set((reportData.evidenceCards?.items||[]).map(card=>card.id));
  if(item.sectionId && !sections.has(item.sectionId)) item.warnings=[...item.warnings,`Missing section: ${item.sectionId}`];
  item.sourceIds=item.sourceIds.filter(id=>sources.has(id));
  item.evidenceCardIds=item.evidenceCardIds.filter(id=>evidence.has(id));
  return item;
}
function addAiSuggestionToReviewQueue(reportData,suggestion){
  const queue=normalizeAiReviewQueue(reportData);
  const item=validateQueueItemLinks(reportData,queueItemFromSuggestion(suggestion));
  queue.items.push(item);
  queue.updatedAt=new Date().toISOString();
  upsertAiProvenance(reportData,createSuggestionProvenanceRecord({
    id:item.provenanceId||uid('aip'),
    taskRunId:item.originalTaskRunId,
    taskType:taskTypeForQueueItem(item),
    suggestionId:item.originalSuggestionId||item.id,
    originalSuggestionId:item.originalSuggestionId||item.id,
    provider:item.provider,
    providerMode:item.providerMode,
    generatedBy:item.generatedBy,
    inputRefs:item.inputRefs,
    outputRefs:outputRefsForSuggestion(item,'ai_suggestion'),
    warnings:item.warnings,
    createdAt:item.createdAt,
    updatedAt:item.updatedAt
  }));
  appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{
    eventType:'suggestion_sent_to_queue',
    taskRunId:item.originalTaskRunId,
    taskType:taskTypeForQueueItem(item),
    suggestionId:item.originalSuggestionId||item.id,
    provider:item.provider,
    providerMode:item.providerMode,
    generatedBy:item.generatedBy,
    inputRefs:item.inputRefs,
    outputRefs:outputRefsForSuggestion(item,'ai_suggestion'),
    statusAfter:item.reviewStatus
  }));
  return item;
}
function addAiSuggestionsToReviewQueue(reportData,suggestions){
  return (suggestions||[]).map(suggestion=>addAiSuggestionToReviewQueue(reportData,suggestion));
}
function taskTypeForQueueItem(item){
  const map={evidence_candidate:'extract_evidence_candidates',recommendation:'suggest_recommendations',executive_summary:'improve_executive_summary',source_coverage_gap:'check_source_coverage',section_draft:'suggest_report_sections'};
  return map[String(item?.suggestionType||'')]||String(item?.payload?.taskType||'extract_evidence_candidates');
}
function getAiReviewQueueItems(reportData,filters={}){
  const items=normalizeAiReviewQueue(reportData).items||[];
  return items.filter(item=>(!filters.type||filters.type==='all'||item.suggestionType===filters.type)&&(!filters.status||filters.status==='all'||item.reviewStatus===filters.status));
}
function getAiReviewQueueItemById(reportData,suggestionId){
  return (normalizeAiReviewQueue(reportData).items||[]).find(item=>item.id===suggestionId)||null;
}
function updateAiReviewQueueItem(reportData,suggestionId,patch){
  const item=getAiReviewQueueItemById(reportData,suggestionId);
  if(!item) return null;
  Object.assign(item,patch&&typeof patch==='object'?patch:{});
  Object.assign(item,normalizeAiReviewQueueItem(item));
  item.updatedAt=new Date().toISOString();
  reportData.aiReviewQueue.updatedAt=item.updatedAt;
  return item;
}
function editAiReviewQueueItem(reportData,suggestionId,patch){
  const before=getAiReviewQueueItemById(reportData,suggestionId);
  const safe={};
  for(const key of ['title','summary','analystNotes']) if(Object.prototype.hasOwnProperty.call(patch||{},key)) safe[key]=String(patch[key]||'');
  if(patch?.payload&&typeof patch.payload==='object') safe.payload={...getAiReviewQueueItemById(reportData,suggestionId)?.payload,...patch.payload};
  const item=updateAiReviewQueueItem(reportData,suggestionId,safe);
  if(item) appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:'suggestion_edited',taskRunId:item.originalTaskRunId,taskType:taskTypeForQueueItem(item),suggestionId:item.originalSuggestionId||item.id,provider:item.provider,providerMode:item.providerMode,generatedBy:item.generatedBy,inputRefs:item.inputRefs,outputRefs:item.outputRefs,statusBefore:before?.reviewStatus||'',statusAfter:item.reviewStatus}));
  return item;
}
function acceptAiReviewQueueItem(reportData,suggestionId){
  const before=getAiReviewQueueItemById(reportData,suggestionId);
  const item=updateAiReviewQueueItem(reportData,suggestionId,{reviewStatus:'accepted',reviewedAt:new Date().toISOString(),reviewedBy:reviewActorLabel()});
  if(item) appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:'suggestion_accepted',taskRunId:item.originalTaskRunId,taskType:taskTypeForQueueItem(item),suggestionId:item.originalSuggestionId||item.id,provider:item.provider,providerMode:item.providerMode,generatedBy:item.generatedBy,inputRefs:item.inputRefs,outputRefs:item.outputRefs,statusBefore:before?.reviewStatus||'',statusAfter:item.reviewStatus}));
  return item;
}
function rejectAiReviewQueueItem(reportData,suggestionId,reason=''){
  const before=getAiReviewQueueItemById(reportData,suggestionId);
  const item=updateAiReviewQueueItem(reportData,suggestionId,{reviewStatus:'rejected',rejectionReason:String(reason||''),reviewedAt:new Date().toISOString(),reviewedBy:reviewActorLabel()});
  if(item) appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:'suggestion_rejected',taskRunId:item.originalTaskRunId,taskType:taskTypeForQueueItem(item),suggestionId:item.originalSuggestionId||item.id,provider:item.provider,providerMode:item.providerMode,generatedBy:item.generatedBy,inputRefs:item.inputRefs,outputRefs:item.outputRefs,statusBefore:before?.reviewStatus||'',statusAfter:item.reviewStatus,notes:String(reason||'')}));
  return item;
}
function convertEvidenceCandidateSuggestionToEvidenceCard(suggestion){
  const payload=suggestion.payload||{};
  const card=convertCandidateToEvidenceCard({...payload,generatedBy:suggestion.generatedBy},REPORT);
  card.originalSuggestionId=suggestion.originalSuggestionId||payload.id||suggestion.id;
  card.originalTaskRunId=suggestion.originalTaskRunId||payload.taskRunId||'';
  card.provenanceId=suggestion.provenanceId||payload.provenanceId||'';
  card.provider=suggestion.provider||payload.provider||'dry_run';
  card.sourceIds=Array.isArray(card.sourceIds)?card.sourceIds:[];
  card.materialIds=Array.isArray(card.materialIds)?card.materialIds:[];
  card.analystNotes=[card.analystNotes,suggestion.analystNotes].filter(Boolean).join('\n');
  return card;
}
function convertRecommendationSuggestionToDraftBlock(suggestion){
  const block=convertRecommendationSuggestionToDraftBlockBase({...suggestion.payload,generatedBy:suggestion.generatedBy},REPORT);
  if(block) block.originalSuggestionId=suggestion.originalSuggestionId||suggestion.payload?.id||suggestion.id;
  if(block){block.originalTaskRunId=suggestion.originalTaskRunId; block.provenanceId=suggestion.provenanceId; block.provider=suggestion.provider||'dry_run';}
  return block;
}
function convertRecommendationSuggestionToDraftBlockBase(payload,reportData=REPORT){
  return convertRecommendationSuggestionToDraftBlock(payload,reportData);
}
function convertExecutiveSummarySuggestionToDraftBlock(suggestion){
  const block=convertExecutiveSummarySuggestionToDraftBlockBase({...suggestion.payload,generatedBy:suggestion.generatedBy},REPORT);
  if(block) block.originalSuggestionId=suggestion.originalSuggestionId||suggestion.payload?.id||suggestion.id;
  if(block){block.originalTaskRunId=suggestion.originalTaskRunId; block.provenanceId=suggestion.provenanceId; block.provider=suggestion.provider||'dry_run';}
  return block;
}
function convertExecutiveSummarySuggestionToDraftBlockBase(payload,reportData=REPORT){
  return convertExecutiveSummarySuggestionToDraftBlock(payload,reportData);
}
function convertSectionDraftSuggestionToDraftBlocks(suggestion){
  const block=convertSectionDraftSuggestionToDraftBlock({...suggestion.payload,generatedBy:suggestion.generatedBy},REPORT);
  if(block) block.originalSuggestionId=suggestion.originalSuggestionId||suggestion.payload?.id||suggestion.id;
  if(block){block.originalTaskRunId=suggestion.originalTaskRunId; block.provenanceId=suggestion.provenanceId; block.provider=suggestion.provider||'dry_run';}
  return block?[block]:[];
}
function convertSourceCoverageGapToChecklistItem(suggestion){
  const gap=suggestion.payload||{};
  return checklistItem('source_coverage',gap.severity==='blocker'?'blocker':'warning',`${gap.title||suggestion.title}: ${gap.description||suggestion.summary}`);
}
function convertAcceptedSuggestion(reportData,suggestionId){
  const item=getAiReviewQueueItemById(reportData,suggestionId);
  if(!item) return {converted:false,error:'Suggestion not found.'};
  if(!['accepted','ready_for_review'].includes(item.reviewStatus)) return {converted:false,error:'Accept the suggestion before conversion.'};
  let converted=null;
  if(item.suggestionType==='evidence_candidate'){
    const cards=normalizeEvidenceCards(reportData);
    converted=convertEvidenceCandidateSuggestionToEvidenceCard(item);
    cards.items.push(converted);
    cards.updatedAt=new Date().toISOString();
  }else if(item.suggestionType==='recommendation'){
    converted=convertRecommendationSuggestionToDraftBlockBase({...item.payload,generatedBy:item.generatedBy},reportData);
    if(converted){converted.originalSuggestionId=item.originalSuggestionId||item.id; converted.originalTaskRunId=item.originalTaskRunId; converted.provenanceId=item.provenanceId; converted.provider=item.provider||'dry_run';}
    if(converted){const section=getReportSection(reportData,converted.sectionId); if(section){section.blocks=[...(section.blocks||[]),converted]; section.status=section.status==='approved'?'approved':'needs_review';}}
  }else if(item.suggestionType==='executive_summary'){
    converted=convertExecutiveSummarySuggestionToDraftBlockBase({...item.payload,generatedBy:item.generatedBy},reportData);
    if(converted){converted.originalSuggestionId=item.originalSuggestionId||item.id; converted.originalTaskRunId=item.originalTaskRunId; converted.provenanceId=item.provenanceId; converted.provider=item.provider||'dry_run';}
    if(converted){const section=getReportSection(reportData,converted.sectionId); if(section){section.blocks=[...(section.blocks||[]),converted]; section.status=section.status==='approved'?'approved':'needs_review';}}
  }else if(item.suggestionType==='section_draft'){
    const blocks=convertSectionDraftSuggestionToDraftBlocks(item);
    for(const block of blocks){const section=getReportSection(reportData,block.sectionId); if(section){section.blocks=[...(section.blocks||[]),block]; section.status=section.status==='approved'?'approved':'needs_review'; converted=block;}}
  }else if(item.suggestionType==='source_coverage_gap'){
    converted=convertSourceCoverageGapToChecklistItem(item);
  }
  if(!converted) return {converted:false,error:'Could not convert this suggestion.'};
  const type=item.suggestionType==='evidence_candidate'?'evidence_card':(item.suggestionType==='source_coverage_gap'?'checklist_item':'draft_block');
  const outputRef=normalizeAiOutputRef({type,id:converted.id||converted.message||uid('out'),label:converted.title||converted.claim||converted.message||item.title,sectionId:converted.sectionId||item.sectionId,status:converted.reviewStatus||converted.status||'needs_review'});
  markSuggestionConvertedInProvenance(reportData,item.originalSuggestionId||item.id,[outputRef]);
  appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:'suggestion_converted',taskRunId:item.originalTaskRunId,taskType:taskTypeForQueueItem(item),suggestionId:item.originalSuggestionId||item.id,outputType:outputRef.type,outputId:outputRef.id,provider:item.provider,providerMode:item.providerMode,generatedBy:item.generatedBy,inputRefs:item.inputRefs,outputRefs:[outputRef],statusBefore:item.reviewStatus,statusAfter:'converted'}));
  appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:type==='evidence_card'?'evidence_card_created_from_suggestion':(type==='draft_block'?'draft_block_created_from_suggestion':'checklist_item_created_from_suggestion'),taskRunId:item.originalTaskRunId,taskType:taskTypeForQueueItem(item),suggestionId:item.originalSuggestionId||item.id,outputType:outputRef.type,outputId:outputRef.id,provider:item.provider,providerMode:item.providerMode,generatedBy:item.generatedBy,inputRefs:item.inputRefs,outputRefs:[outputRef],statusAfter:outputRef.status}));
  updateAiReviewQueueItem(reportData,suggestionId,{reviewStatus:'converted',convertedId:outputRef.id,outputRefs:[outputRef],reviewedAt:new Date().toISOString(),reviewedBy:reviewActorLabel()});
  return {converted:true,item:converted};
}
function getAvailableAiTasks(reportData){
  normalizeAiAssistanceState(reportData);
  return AI_TASK_TYPES.map(type=>({
    type,
    label:AI_TASK_DEFINITIONS[type].label,
    enabled:false,
    mode:'disabled',
    comingSoon:true,
    inputRefs:AI_TASK_DEFINITIONS[type].inputRefs,
    outputContract:AI_TASK_DEFINITIONS[type].output
  }));
}
function createDefaultAiStatus(){
  return {
    ok:true,
    aiEnabled:false,
    provider:'dry_run',
    providerConfigured:false,
    dryRunAvailable:AI_DRY_RUN_AVAILABLE,
    availableTasks:['extract_evidence_candidates','suggest_recommendations','improve_executive_summary','check_source_coverage','suggest_report_sections'],
    currentMode:'dry_run',
    source:BROWSER_ONLY_MODE?'local':'unknown'
  };
}
function currentAiUser(){
  const role=isAdmin()?'editor':'viewer';
  return {role};
}
async function fetchAiStatus(){
  const fallback=createDefaultAiStatus();
  if(BROWSER_ONLY_MODE || !HOSTED_MODE || isClientLocked()){
    state.aiStatus={...fallback, currentMode:isClientLocked()?'disabled':'dry_run'};
    state.aiStatusLoaded=true;
    return state.aiStatus;
  }
  try{
    const nativeFetch=globalThis['fetch'];
    if(typeof nativeFetch!=='function') throw new Error('Fetch unavailable.');
    const res=await nativeFetch('/api/ai/status',{method:'GET',headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error('AI status unavailable.');
    const data=await res.json();
    state.aiStatus={
      ok:data?.ok===true,
      aiEnabled:Boolean(data?.aiEnabled),
      provider:String(data?.provider||'dry_run'),
      providerConfigured:Boolean(data?.providerConfigured),
      dryRunAvailable:data?.dryRunAvailable!==false,
      availableTasks:Array.isArray(data?.availableTasks)?data.availableTasks.map(String):[],
      currentMode:String(data?.currentMode||data?.provider||'disabled'),
      source:'backend'
    };
  }catch(e){
    state.aiStatus={...fallback, ok:false, currentMode:'disabled', source:'unavailable'};
  }
  state.aiStatusLoaded=true;
  return state.aiStatus;
}
function aiStatusLabel(status){
  const s=status||createDefaultAiStatus();
  if(isClientLocked()) return 'clientLocked';
  if(s.aiEnabled) return 'enabled';
  if(s.dryRunAvailable) return 'dry-run';
  return 'disabled';
}
function canRunAiEvidencePreview(reportData, aiStatus, currentUser=currentAiUser()){
  const status=aiStatus||createDefaultAiStatus();
  const policy=getEffectiveGovernancePolicy(reportData).aiPolicy;
  const reasons=[];
  if(!policy.dryRunAllowed && !policy.aiEnabled) reasons.push('AI preview is disabled by governance policy');
  if(policy.allowAutoApproveAiOutput) reasons.push('AI auto-approval is blocked by safety policy');
  if(!['owner','editor','admin'].includes(String(currentUser?.role||'viewer'))) reasons.push('viewer role cannot run AI preview');
  if((reportData?.meta?.clientLocked===true || isClientLocked()) && !policy.allowClientLockedAiPreview) reasons.push('clientLocked mode cannot run AI preview');
  if(!hasAiEvidenceDryRunInputs(reportData)) reasons.push('add sources first');
  if(!(status.availableTasks||[]).includes('extract_evidence_candidates')) reasons.push('AI evidence preview is not available');
  if(!status.dryRunAvailable && (!status.aiEnabled || !status.providerConfigured)) reasons.push(status.aiEnabled?'provider is not configured':'AI is disabled');
  return {ok:!reasons.length, reasons, status};
}
function canRunAiRecommendationPreview(reportData, aiStatus, currentUser=currentAiUser()){
  const status=aiStatus||createDefaultAiStatus();
  const policy=getEffectiveGovernancePolicy(reportData).aiPolicy;
  const reasons=[];
  if(!policy.dryRunAllowed && !policy.aiEnabled) reasons.push('AI preview is disabled by governance policy');
  if(!['owner','editor','admin'].includes(String(currentUser?.role||'viewer'))) reasons.push('viewer role cannot run AI preview');
  if((reportData?.meta?.clientLocked===true || isClientLocked()) && !policy.allowClientLockedAiPreview) reasons.push('clientLocked mode cannot run AI preview');
  if(!getApprovedEvidenceCards(reportData).length) reasons.push('approve evidence first');
  if(!(status.availableTasks||[]).includes('suggest_recommendations')) reasons.push('AI recommendation preview is not available');
  if(!status.dryRunAvailable && (!status.aiEnabled || !status.providerConfigured)) reasons.push(status.aiEnabled?'provider is not configured':'AI is disabled');
  return {ok:!reasons.length, reasons, status};
}
function reviewedExecutiveSummaryInputs(reportData){
  const sections=Array.isArray(reportData?.reportSections)?reportData.reportSections:[];
  return sections.flatMap(section=>(section.blocks||[]).map(block=>({...block, sectionId:block.sectionId||section.id})))
    .filter(block=>['needs_review','approved'].includes(String(block.status||'')))
    .filter(block=>['recommendation_note','risk_note','opportunity_note','comparison_note','paragraph'].includes(String(block.type||'')));
}
function canRunAiExecutiveSummaryPreview(reportData, aiStatus, currentUser=currentAiUser()){
  const status=aiStatus||createDefaultAiStatus();
  const policy=getEffectiveGovernancePolicy(reportData).aiPolicy;
  const reasons=[];
  if(!policy.dryRunAllowed && !policy.aiEnabled) reasons.push('AI preview is disabled by governance policy');
  if(!['owner','editor','admin'].includes(String(currentUser?.role||'viewer'))) reasons.push('viewer role cannot run AI preview');
  if((reportData?.meta?.clientLocked===true || isClientLocked()) && !policy.allowClientLockedAiPreview) reasons.push('clientLocked mode cannot run AI preview');
  if(!getApprovedEvidenceCards(reportData).length && !reviewedExecutiveSummaryInputs(reportData).length) reasons.push('approve evidence first');
  if(!(status.availableTasks||[]).includes('improve_executive_summary')) reasons.push('AI executive summary preview is not available');
  if(!status.dryRunAvailable && (!status.aiEnabled || !status.providerConfigured)) reasons.push(status.aiEnabled?'provider is not configured':'AI is disabled');
  return {ok:!reasons.length, reasons, status};
}
function canRunAiSourceCoveragePreview(reportData, aiStatus, currentUser=currentAiUser()){
  const status=aiStatus||createDefaultAiStatus();
  const policy=getEffectiveGovernancePolicy(reportData).aiPolicy;
  const reasons=[];
  if(!policy.dryRunAllowed && !policy.aiEnabled) reasons.push('AI preview is disabled by governance policy');
  if(!['owner','editor','admin'].includes(String(currentUser?.role||'viewer'))) reasons.push('viewer role cannot run AI preview');
  if((reportData?.meta?.clientLocked===true || isClientLocked()) && !policy.allowClientLockedAiPreview) reasons.push('clientLocked mode cannot run AI preview');
  if(!(reportData?.reportSections||[]).length) reasons.push('Report Schema V2 sections are required');
  if(!(reportData?.sourceRegistry?.items||[]).length && !(reportData?.evidenceCards?.items||[]).length) reasons.push('add sources first');
  if(!(status.availableTasks||[]).includes('check_source_coverage')) reasons.push('AI source coverage preview is not available');
  if(!status.dryRunAvailable && (!status.aiEnabled || !status.providerConfigured)) reasons.push(status.aiEnabled?'provider is not configured':'AI is disabled');
  return {ok:!reasons.length, reasons, status};
}
function canRunAiSectionDraftPreview(reportData, aiStatus, currentUser=currentAiUser()){
  const status=aiStatus||createDefaultAiStatus();
  const policy=getEffectiveGovernancePolicy(reportData).aiPolicy;
  const sectionId=state.aiSectionId||'';
  const section=sectionId?getReportSection(reportData,sectionId):null;
  const reasons=[];
  if(!policy.dryRunAllowed && !policy.aiEnabled) reasons.push('AI preview is disabled by governance policy');
  if(!['owner','editor','admin'].includes(String(currentUser?.role||'viewer'))) reasons.push('viewer role cannot run AI preview');
  if((reportData?.meta?.clientLocked===true || isClientLocked()) && !policy.allowClientLockedAiPreview) reasons.push('clientLocked mode cannot run AI preview');
  if(!section) reasons.push('select a section first');
  if(section && !approvedEvidenceForSection(reportData,section.id).length) reasons.push('approve evidence first');
  if(!(status.availableTasks||[]).includes('suggest_report_sections')) reasons.push('AI section draft preview is not available');
  if(!status.dryRunAvailable && (!status.aiEnabled || !status.providerConfigured)) reasons.push(status.aiEnabled?'provider is not configured':'AI is disabled');
  return {ok:!reasons.length, reasons, status};
}
function aiPreviewDisabledReason(reportData, aiStatus, currentUser=currentAiUser()){
  const result=canRunAiEvidencePreview(reportData,aiStatus,currentUser);
  return result.ok?'':result.reasons[0];
}
function aiRecommendationDisabledReason(reportData, aiStatus, currentUser=currentAiUser()){
  const result=canRunAiRecommendationPreview(reportData,aiStatus,currentUser);
  return result.ok?'':result.reasons[0];
}
function aiExecutiveSummaryDisabledReason(reportData, aiStatus, currentUser=currentAiUser()){
  const result=canRunAiExecutiveSummaryPreview(reportData,aiStatus,currentUser);
  return result.ok?'':result.reasons[0];
}
function aiSourceCoverageDisabledReason(reportData, aiStatus, currentUser=currentAiUser()){
  const result=canRunAiSourceCoveragePreview(reportData,aiStatus,currentUser);
  return result.ok?'':result.reasons[0];
}
function aiSectionDraftDisabledReason(reportData, aiStatus, currentUser=currentAiUser()){
  const result=canRunAiSectionDraftPreview(reportData,aiStatus,currentUser);
  return result.ok?'':result.reasons[0];
}
function normalizeEvidenceCandidatePreviewResponse(payload, provider='dry_run'){
  if(payload?.output?.taskType==='extract_evidence_candidates') return payload.output;
  const suggestions=Array.isArray(payload?.suggestions)?payload.suggestions:[];
  const candidates=suggestions
    .map(item=>item?.candidate)
    .filter(candidate=>candidate&&typeof candidate==='object')
    .map(candidate=>({...candidate, generatedBy:provider==='dry_run'?'ai_dry_run':'ai_preview'}));
  return {
    taskType:String(payload?.taskType||'extract_evidence_candidates'),
    candidates,
    warnings:Array.isArray(payload?.warnings)?payload.warnings.map(String):[],
    createdAt:new Date().toISOString()
  };
}
function normalizeRecommendationPreviewResponse(payload, provider='dry_run'){
  if(payload?.output?.taskType==='suggest_recommendations') return payload.output;
  const suggestions=Array.isArray(payload?.suggestions)?payload.suggestions:[];
  const recommendations=suggestions
    .map(item=>item?.recommendation)
    .filter(item=>item&&typeof item==='object')
    .map(item=>({...item, generatedBy:provider==='dry_run'?'ai_dry_run':'ai_preview'}));
  return {
    taskType:String(payload?.taskType||'suggest_recommendations'),
    recommendations,
    warnings:Array.isArray(payload?.warnings)?payload.warnings.map(String):[],
    createdAt:new Date().toISOString()
  };
}
function normalizeExecutiveSummaryPreviewResponse(payload, provider='dry_run'){
  if(payload?.output?.taskType==='improve_executive_summary') return payload.output;
  const suggestions=Array.isArray(payload?.suggestions)?payload.suggestions:[];
  const summaryBlocks=suggestions
    .map(item=>item?.summaryBlock)
    .filter(item=>item&&typeof item==='object')
    .map(item=>({...item, generatedBy:provider==='dry_run'?'ai_dry_run':'ai_preview'}));
  return {
    taskType:String(payload?.taskType||'improve_executive_summary'),
    summaryTitle:String(payload?.summaryTitle||'Executive Summary Preview'),
    summaryBlocks,
    keyTakeaways:Array.isArray(payload?.keyTakeaways)?payload.keyTakeaways.map(String):[],
    warnings:Array.isArray(payload?.warnings)?payload.warnings.map(String):[],
    createdAt:new Date().toISOString()
  };
}
function normalizeSourceCoveragePreviewResponse(payload){
  if(payload?.output?.taskType==='check_source_coverage') return payload.output;
  const suggestions=Array.isArray(payload?.suggestions)?payload.suggestions:[];
  return {
    taskType:String(payload?.taskType||'check_source_coverage'),
    overallCoverageStatus:String(payload?.overallCoverageStatus||'weak'),
    coverageScore:Number(payload?.coverageScore||0),
    sectionCoverage:Array.isArray(payload?.sectionCoverage)?payload.sectionCoverage:[],
    coverageGaps:suggestions.map(item=>item?.gap).filter(Boolean),
    weakSources:Array.isArray(payload?.weakSources)?payload.weakSources:[],
    suggestedNextSources:Array.isArray(payload?.suggestedNextSources)?payload.suggestedNextSources:[],
    warnings:Array.isArray(payload?.warnings)?payload.warnings.map(String):[],
    createdAt:new Date().toISOString()
  };
}
function normalizeSectionDraftPreviewResponse(payload, provider='dry_run'){
  if(payload?.output?.taskType==='suggest_report_sections') return payload.output;
  const suggestions=Array.isArray(payload?.suggestions)?payload.suggestions:[];
  return {
    taskType:String(payload?.taskType||'suggest_report_sections'),
    sectionId:String(payload?.sectionId||state.aiSectionId||''),
    sectionTitle:String(payload?.sectionTitle||''),
    draftBlocks:suggestions.map(item=>item?.block).filter(Boolean).map(block=>({...block,generatedBy:provider==='dry_run'?'ai_dry_run':'ai_preview'})),
    coverageWarnings:Array.isArray(payload?.coverageWarnings)?payload.coverageWarnings.map(String):[],
    missingInputs:Array.isArray(payload?.missingInputs)?payload.missingInputs.map(String):[],
    warnings:Array.isArray(payload?.warnings)?payload.warnings.map(String):[],
    createdAt:new Date().toISOString()
  };
}
function createAiTaskDraft(taskType, reportData, options={}){
  const type=AI_TASK_TYPES.includes(String(taskType))?String(taskType):'extract_evidence_candidates';
  const now=new Date().toISOString();
  return normalizeAiSuggestion({
    id:uid('ai-task'),
    taskType:type,
    title:AI_TASK_DEFINITIONS[type]?.label||type,
    summary:'Prepared preview contract only. AI execution is disabled.',
    inputRefs:AI_TASK_DEFINITIONS[type]?.inputRefs||[],
    outputPreview:{options:options&&typeof options==='object'?options:{}, contract:AI_TASK_DEFINITIONS[type]?.output||''},
    status:'draft',
    createdAt:now,
    updatedAt:now
  });
}
function validateAiTaskInput(taskDraft){
  const draft=normalizeAiSuggestion(taskDraft);
  const errors=[];
  if(!AI_TASK_TYPES.includes(draft.taskType)) errors.push('Unsupported AI task type.');
  if(ENABLE_AI_ASSISTANCE || draft.status!=='draft') errors.push('AI tasks must remain draft while AI assistance is disabled.');
  return {ok:!errors.length, errors, draft};
}
function validateAiTaskOutput(taskType, output){
  const type=AI_TASK_TYPES.includes(String(taskType))?String(taskType):'';
  const contractName=AI_TASK_DEFINITIONS[type]?.output;
  const contract=AI_OUTPUT_CONTRACTS[contractName];
  const errors=[];
  if(!contract) errors.push('Missing AI output contract.');
  if(!output || typeof output!=='object') errors.push('AI output must be an object.');
  for(const field of (contract?.required||[])){
    if(!(field in (output||{}))) errors.push(`Missing required output field: ${field}`);
  }
  return {ok:!errors.length, errors, contractName};
}
function applyAiTaskOutputPreview(reportData, taskType, output, meta={}){
  const validation=validateAiTaskOutput(taskType, output);
  const ai=normalizeAiAssistanceState(reportData);
  const now=new Date().toISOString();
  const stamped=stampAiPreviewOutput(output&&typeof output==='object'?output:{},meta);
  const suggestion=normalizeAiSuggestion({
    id:uid('ai-preview'),
    taskType,
    title:AI_TASK_DEFINITIONS[taskType]?.label||String(taskType||'AI preview'),
    summary:validation.ok?'AI output preview prepared for future human review.':'Invalid AI output preview.',
    inputRefs:stamped.inputRefs||AI_TASK_DEFINITIONS[taskType]?.inputRefs||[],
    outputPreview:stamped,
    status:validation.ok?'ready_for_review':'draft',
    taskRunId:stamped.taskRunId,
    provider:stamped.provider,
    providerMode:stamped.providerMode,
    generatedBy:stamped.generatedBy,
    createdAt:now,
    updatedAt:now
  });
  ai.suggestions.push(suggestion);
  ai.updatedAt=now;
  appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:'ai_preview_completed',taskRunId:stamped.taskRunId,taskType,provider:stamped.provider,providerMode:stamped.providerMode,generatedBy:stamped.generatedBy,inputRefs:stamped.inputRefs,outputRefs:(stamped.outputSuggestionIds||[]).map(id=>normalizeAiOutputRef({type:'ai_suggestion',id,status:'ready_for_review'})),warnings:stamped.warnings||[]}));
  for(const key of ['candidates','recommendations','summaryBlocks','coverageGaps','draftBlocks']){
    for(const item of (stamped[key]||[])){
      upsertAiProvenance(reportData,createSuggestionProvenanceRecord({id:item.provenanceId,taskRunId:stamped.taskRunId,taskType,suggestionId:item.id,originalSuggestionId:item.id,provider:stamped.provider,providerMode:stamped.providerMode,generatedBy:item.generatedBy||stamped.generatedBy,inputRefs:stamped.inputRefs,outputRefs:outputRefsForSuggestion(item,'ai_suggestion'),warnings:item.warnings||[],createdAt:now,updatedAt:now}));
      appendAiAuditEvent(reportData,createAiAuditEvent(reportData,{eventType:'suggestion_created',taskRunId:stamped.taskRunId,taskType,suggestionId:item.id,provider:stamped.provider,providerMode:stamped.providerMode,generatedBy:item.generatedBy||stamped.generatedBy,inputRefs:stamped.inputRefs,outputRefs:outputRefsForSuggestion(item,'ai_suggestion'),warnings:item.warnings||[]}));
    }
  }
  linkAiTaskToSuggestions(reportData,stamped.taskRunId,stamped.outputSuggestionIds||[]);
  return {suggestion, validation};
}
function hasAiEvidenceDryRunInputs(reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  return Boolean((report.sourceRegistry?.items||[]).length || (report.materialsInventory?.items||[]).length);
}
function suggestedSectionForSource(source, sections){
  const valid=new Map((sections||[]).map(section=>[section.id,section]));
  const linked=(source.linkedSectionIds||[]).find(id=>valid.has(id));
  if(linked) return linked;
  const text=`${source.title||''} ${source.fileName||''} ${source.extension||''}`.toLowerCase();
  const pairs=[
    ['pricing',/price|pricing|tier|plan|cost|csv|xlsx|spreadsheet/],
    ['features',/feature|capability|comparison/],
    ['messaging',/message|position|copy|website|landing/],
    ['channels',/seo|channel|content|social|campaign/],
    ['competitors',/competitor|market|landscape/]
  ];
  for(const [id,re] of pairs) if(valid.has(id) && re.test(text)) return id;
  return valid.has('sourcesEvidence')?'sourcesEvidence':((sections||[])[0]?.id||'');
}
function sourceCandidateWarning(source, material){
  const warnings=[];
  if(!source.id) warnings.push('Source is missing an ID.');
  if(!material) warnings.push('No matching material metadata was found.');
  if(['pending','failed'].includes(String(source.extractedTextStatus||''))) warnings.push('No extracted text is available; this preview uses metadata only.');
  if(String(source.credibilityStatus||'unreviewed')==='unreviewed') warnings.push('Source credibility is unreviewed.');
  if(String(source.evidenceStatus||'unused')==='ignored') warnings.push('Source is marked ignored.');
  return warnings;
}
function runAiEvidenceCandidateDryRun(reportData, options={}){
  const report=clone(reportData||{});
  normalizeReportSchema(report);
  normalizeMaterialsInventory(report);
  normalizeSourceRegistry(report);
  const now=new Date().toISOString();
  const warnings=[];
  const materials=new Map((report.materialsInventory.items||[]).map(item=>[item.id,item]));
  const sections=report.reportSections||[];
  const sources=(report.sourceRegistry.items||[])
    .filter(source=>String(source.evidenceStatus||'')!=='ignored')
    .sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')));
  if(!sources.length){
    warnings.push('No usable sources or materials are available for dry-run evidence preview.');
    return {taskType:'extract_evidence_candidates',candidates:[],warnings,createdAt:now};
  }
  const max=Math.max(1,Math.min(Number(options.maxCandidates)||8,12));
  const candidates=sources.slice(0,max).map((source,index)=>{
    const material=materials.get(source.materialId);
    const sectionId=suggestedSectionForSource(source, sections);
    const sectionTitle=(sections.find(section=>section.id===sectionId)?.title)||'Sources and Evidence';
    const sourceTitle=source.title||source.fileName||`Source ${index+1}`;
    const sourceWarnings=sourceCandidateWarning(source, material);
    const hasText=String(source.extractedTextStatus||'')==='available' || String(source.notes||'').trim();
    const confidenceStatus=hasText?'medium':'low';
    const materialId=material?.id||source.materialId||'';
    return {
      id:`candidate:${source.id}`,
      claim:`Review "${sourceTitle}" as candidate evidence for ${sectionTitle}.`,
      summary:`Dry-run preview based only on existing ${hasText?'source notes or extracted text status':'source/material metadata'}. Verify the source before approval.`,
      sourceIds:source.id?[source.id]:[],
      materialIds:materialId?[materialId]:[],
      suggestedSectionId:sectionId,
      evidenceType:source.sourceType==='spreadsheet'||source.sourceType==='dataset'?'metric':'observation',
      confidenceStatus,
      credibilityStatus:source.credibilityStatus||'unreviewed',
      reviewStatus:'needs_review',
      warnings:sourceWarnings
    };
  });
  if(candidates.some(candidate=>candidate.confidenceStatus==='low')) warnings.push('Some candidates are low confidence because source text was not available.');
  return {taskType:'extract_evidence_candidates',candidates,warnings,createdAt:now};
}
function validateEvidenceCandidateOutput(output, reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const sourceIds=new Set((report.sourceRegistry?.items||[]).map(source=>source.id));
  const sectionIds=new Set((report.reportSections||[]).map(section=>section.id));
  const errors=[];
  if(!output || typeof output!=='object') errors.push('Candidate output must be an object.');
  if(output?.taskType!=='extract_evidence_candidates') errors.push('Candidate output taskType must be extract_evidence_candidates.');
  if(!Array.isArray(output?.candidates)) errors.push('Candidate output must include candidates array.');
  (output?.candidates||[]).forEach((candidate,index)=>{
    const label=`Candidate ${index+1}`;
    if(!String(candidate.claim||candidate.summary||'').trim()) errors.push(`${label} needs a claim or summary.`);
    if(!['draft','needs_review'].includes(String(candidate.reviewStatus||''))) errors.push(`${label} cannot be auto-approved.`);
    if(!EVIDENCE_TYPES.includes(String(candidate.evidenceType||''))) errors.push(`${label} has an unsupported evidence type.`);
    for(const sourceId of (candidate.sourceIds||[])) if(!sourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
    const sectionId=String(candidate.suggestedSectionId||candidate.sectionId||'');
    if(sectionId && !sectionIds.has(sectionId)) errors.push(`${label} references unknown section ${sectionId}.`);
  });
  return {ok:!errors.length, errors};
}
function runAiRecommendationDryRun(reportData, options={}){
  const report=clone(reportData||{});
  normalizeReportSchema(report);
  normalizeEvidenceCards(report);
  normalizeSourceRegistry(report);
  const now=new Date().toISOString();
  const warnings=[];
  const sections=report.reportSections||[];
  const sectionIds=new Set(sections.map(section=>section.id));
  const approved=getApprovedEvidenceCards(report)
    .filter(card=>['risk','opportunity','comparison','recommendation_input'].includes(String(card.evidenceType||'')) || ['recommendations','risksOpportunities','executiveSummary','competitiveLandscape'].includes(String(card.sectionId||'')))
    .sort((a,b)=>String(a.id||'').localeCompare(String(b.id||'')));
  if(!approved.length){
    warnings.push('Approve evidence cards before requesting recommendations.');
    return {taskType:'suggest_recommendations',recommendations:[],warnings,createdAt:now};
  }
  const targetSection=sectionIds.has('recommendations')?'recommendations':(sections[0]?.id||'');
  const max=Math.max(1,Math.min(Number(options.maxRecommendations||options.maxCandidates)||6,10));
  const recommendations=approved.slice(0,max).map((card,index)=>{
    const kind=String(card.evidenceType||'observation');
    const evidenceText=String(card.claim||card.summary||`Approved evidence ${index+1}`).trim();
    const title=kind==='risk'?'Reduce identified market risk':kind==='opportunity'?'Prioritize validated market opportunity':kind==='comparison'?'Act on competitive comparison':'Turn evidence into a client recommendation';
    return {
      id:`recommendation:${card.id}`,
      title,
      recommendation:`Review and convert this approved evidence into an action plan: ${evidenceText}`,
      rationale:`Dry-run suggestion derived from approved evidence card "${card.id}".`,
      priority:kind==='risk'||kind==='opportunity'?'high':'medium',
      suggestedSectionId:targetSection,
      evidenceCardIds:card.id?[card.id]:[],
      sourceIds:Array.isArray(card.sourceIds)?card.sourceIds.map(String).filter(Boolean):[],
      confidenceStatus:card.confidenceStatus==='high'?'high':'medium',
      reviewStatus:'needs_review',
      risks:kind==='risk'?[evidenceText]:[],
      expectedImpact:kind==='opportunity'?'Potential growth or positioning upside after analyst validation.':'Improved client decision quality after analyst validation.',
      effortLevel:kind==='comparison'?'medium':'low',
      generatedBy:'ai_dry_run',
      warnings:[]
    };
  });
  return {taskType:'suggest_recommendations',recommendations,warnings,createdAt:now};
}
function validateRecommendationSuggestionOutput(output, reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const approvedIds=new Set((report.evidenceCards?.items||[]).filter(card=>card.reviewStatus==='approved').map(card=>card.id));
  const sourceIds=new Set((report.sourceRegistry?.items||[]).map(source=>source.id));
  const sectionIds=new Set((report.reportSections||[]).map(section=>section.id));
  const errors=[];
  if(!output || typeof output!=='object') errors.push('Recommendation output must be an object.');
  if(output?.taskType!=='suggest_recommendations') errors.push('Recommendation output taskType must be suggest_recommendations.');
  if(!Array.isArray(output?.recommendations)) errors.push('Recommendation output must include recommendations array.');
  (output?.recommendations||[]).forEach((item,index)=>{
    const label=`Recommendation ${index+1}`;
    if(!String(item.title||item.recommendation||'').trim()) errors.push(`${label} needs a title or recommendation.`);
    if(!['draft','needs_review'].includes(String(item.reviewStatus||''))) errors.push(`${label} cannot be auto-approved.`);
    if(!['low','medium','high'].includes(String(item.priority||''))) errors.push(`${label} has an unsupported priority.`);
    if(!['low','medium','high'].includes(String(item.effortLevel||''))) errors.push(`${label} has an unsupported effort level.`);
    if(!['low','medium','high'].includes(String(item.confidenceStatus||''))) errors.push(`${label} has an unsupported confidence status.`);
    for(const evidenceId of (item.evidenceCardIds||[])) if(!approvedIds.has(evidenceId)) errors.push(`${label} references non-approved or unknown evidence ${evidenceId}.`);
    for(const sourceId of (item.sourceIds||[])) if(!sourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
    const sectionId=String(item.suggestedSectionId||'');
    if(sectionId && !sectionIds.has(sectionId)) errors.push(`${label} references unknown section ${sectionId}.`);
  });
  return {ok:!errors.length, errors};
}
function runAiExecutiveSummaryDryRun(reportData, options={}){
  const report=clone(reportData||{});
  normalizeReportSchema(report);
  normalizeEvidenceCards(report);
  normalizeSourceRegistry(report);
  const now=new Date().toISOString();
  const warnings=[];
  const sections=report.reportSections||[];
  const sectionIds=new Set(sections.map(section=>section.id));
  const approved=getApprovedEvidenceCards(report).sort((a,b)=>String(a.id||'').localeCompare(String(b.id||'')));
  const reviewed=reviewedExecutiveSummaryInputs(report)
    .filter(block=>['recommendations','risksOpportunities','executiveSummary','competitiveLandscape','competitors','pricing','features'].includes(String(block.sectionId||'')))
    .sort((a,b)=>String(a.id||'').localeCompare(String(b.id||'')));
  if(!approved.length){
    warnings.push('Approve evidence cards before requesting executive summary.');
    return {taskType:'improve_executive_summary',summaryTitle:'Executive Summary Preview',summaryBlocks:[],keyTakeaways:[],warnings,createdAt:now};
  }
  const targetSection=sectionIds.has('executiveSummary')?'executiveSummary':(sections[0]?.id||'');
  const max=Math.max(1,Math.min(Number(options.maxSummaryBlocks||options.maxCandidates)||5,8));
  const evidenceBlocks=approved.slice(0,max).map((card,index)=>{
    const text=String(card.claim||card.summary||`Approved evidence ${index+1}`).trim();
    return {
      id:`summary:${card.id}`,
      heading:index===0?'Key finding':'Supporting finding',
      text,
      importance:card.confidenceStatus==='high'?'high':'medium',
      suggestedSectionId:targetSection,
      evidenceCardIds:card.id?[card.id]:[],
      sourceIds:Array.isArray(card.sourceIds)?card.sourceIds.map(String).filter(Boolean):[],
      recommendationIds:[],
      confidenceStatus:card.confidenceStatus==='high'?'high':'medium',
      reviewStatus:'needs_review',
      generatedBy:'ai_dry_run',
      warnings:[]
    };
  });
  const draftBlocks=reviewed.slice(0,Math.max(0,max-evidenceBlocks.length)).map(block=>({
    id:`summary:${block.id}`,
    heading:block.title||'Reviewed recommendation',
    text:String(block.text||'').trim(),
    importance:'medium',
    suggestedSectionId:targetSection,
    evidenceCardIds:Array.isArray(block.evidenceCardIds)?block.evidenceCardIds.map(String).filter(Boolean):[],
    sourceIds:Array.isArray(block.sourceIds)?block.sourceIds.map(String).filter(Boolean):[],
    recommendationIds:block.id?[block.id]:[],
    confidenceStatus:'medium',
    reviewStatus:'needs_review',
    generatedBy:'ai_dry_run',
    warnings:['Reviewed draft block is non-final until approved by an analyst.']
  }));
  const summaryBlocks=[...evidenceBlocks,...draftBlocks].filter(block=>block.text);
  const keyTakeaways=summaryBlocks.slice(0,3).map(block=>block.text);
  return {taskType:'improve_executive_summary',summaryTitle:'Executive Summary Preview',summaryBlocks,keyTakeaways,warnings,createdAt:now};
}
function validateExecutiveSummaryOutput(output, reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const approvedIds=new Set((report.evidenceCards?.items||[]).filter(card=>card.reviewStatus==='approved').map(card=>card.id));
  const sourceIds=new Set((report.sourceRegistry?.items||[]).map(source=>source.id));
  const sectionIds=new Set((report.reportSections||[]).map(section=>section.id));
  const draftIds=new Set(reviewedExecutiveSummaryInputs(report).map(block=>block.id));
  const errors=[];
  if(!output || typeof output!=='object') errors.push('Executive summary output must be an object.');
  if(output?.taskType!=='improve_executive_summary') errors.push('Executive summary output taskType must be improve_executive_summary.');
  if(!Array.isArray(output?.summaryBlocks)) errors.push('Executive summary output must include summaryBlocks array.');
  (output?.summaryBlocks||[]).forEach((block,index)=>{
    const label=`Summary block ${index+1}`;
    if(!String(block.heading||block.text||'').trim()) errors.push(`${label} needs a heading or text.`);
    if(!['draft','needs_review'].includes(String(block.reviewStatus||''))) errors.push(`${label} cannot be auto-approved.`);
    if(!['low','medium','high'].includes(String(block.importance||''))) errors.push(`${label} has an unsupported importance.`);
    if(!['low','medium','high'].includes(String(block.confidenceStatus||''))) errors.push(`${label} has an unsupported confidence status.`);
    for(const evidenceId of (block.evidenceCardIds||[])) if(!approvedIds.has(evidenceId)) errors.push(`${label} references non-approved or unknown evidence ${evidenceId}.`);
    for(const sourceId of (block.sourceIds||[])) if(!sourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
    for(const recommendationId of (block.recommendationIds||[])) if(!draftIds.has(recommendationId)) errors.push(`${label} references unknown recommendation draft ${recommendationId}.`);
    const sectionId=String(block.suggestedSectionId||'');
    if(sectionId && !sectionIds.has(sectionId)) errors.push(`${label} references unknown section ${sectionId}.`);
  });
  return {ok:!errors.length, errors};
}
function runAiSourceCoverageDryRun(reportData){
  const report=clone(reportData||{});
  normalizeReportSchema(report);
  normalizeSourceRegistry(report);
  normalizeEvidenceCards(report);
  const now=new Date().toISOString();
  const sections=report.reportSections||[];
  const sources=report.sourceRegistry.items||[];
  const evidence=report.evidenceCards.items||[];
  const warnings=[];
  const gaps=[];
  const sourceIds=new Set(sources.map(source=>source.id));
  const weakSources=sources.filter(source=>['weak','unreviewed','needs_review'].includes(String(source.credibilityStatus||'unreviewed'))).map(source=>({
    sourceId:source.id,
    title:source.title||source.fileName||'Untitled source',
    credibilityStatus:source.credibilityStatus||'unreviewed',
    evidenceStatus:source.evidenceStatus||'unused',
    linkedSectionIds:Array.isArray(source.linkedSectionIds)?source.linkedSectionIds:[],
    issue:'Source credibility needs analyst review.',
    suggestedFix:'Review this source before relying on it in client-facing findings.'
  }));
  if(!sources.length) warnings.push('No sources are available for coverage analysis.');
  if(!evidence.length) warnings.push('No evidence cards are available for coverage analysis.');
  const rejected=evidence.filter(card=>card.reviewStatus==='rejected');
  const sectionCoverage=sections.map(section=>{
    const blocks=Array.isArray(section.blocks)?section.blocks:[];
    const sectionEvidence=evidence.filter(card=>card.sectionId===section.id || blocks.some(block=>(block.evidenceCardIds||[]).includes(card.id)));
    const approved=sectionEvidence.filter(card=>card.reviewStatus==='approved');
    const sectionSourceIds=new Set([...approved.flatMap(card=>card.sourceIds||[]),...blocks.flatMap(block=>block.sourceIds||[]),...sources.filter(source=>(source.linkedSectionIds||[]).includes(section.id)).map(source=>source.id)].filter(Boolean));
    const weakCount=[...sectionSourceIds].filter(id=>weakSources.some(source=>source.sourceId===id)).length;
    const missing=approved.filter(card=>!(card.sourceIds||[]).length);
    const rejectedInBlocks=rejected.filter(card=>blocks.some(block=>(block.evidenceCardIds||[]).includes(card.id)));
    let blockerCount=missing.length+rejectedInBlocks.length;
    let warningCount=weakCount;
    let status='no_content';
    if(sectionEvidence.length||blocks.length){
      if(!sectionSourceIds.size) status='no_sources';
      else if(blockerCount) status='weak';
      else if(weakCount||!approved.length) status='partial';
      else status='strong';
    }
    if((sectionEvidence.length||blocks.length)&&!sectionSourceIds.size){
      const severity=approved.length?'blocker':'warning';
      severity==='blocker'?blockerCount++:warningCount++;
      gaps.push({id:`coverage:${section.id}:no_sources`,severity,sectionId:section.id,title:'Section has content without linked sources',description:`${section.title||section.id} has content or evidence but no linked source coverage.`,evidenceCardIds:sectionEvidence.map(card=>card.id).filter(Boolean),sourceIds:[],suggestedFix:'Link approved evidence to trusted sources before export.',reviewStatus:'needs_review',generatedBy:'ai_dry_run'});
    }
    for(const card of missing){
      gaps.push({id:`coverage:${card.id}:missing_source`,severity:'blocker',sectionId:section.id,title:'Approved evidence lacks sources',description:`Approved evidence "${card.claim||card.summary||card.id}" has no linked sources.`,evidenceCardIds:[card.id],sourceIds:[],suggestedFix:'Attach at least one reviewed source to this evidence card.',reviewStatus:'needs_review',generatedBy:'ai_dry_run'});
    }
    for(const card of rejectedInBlocks){
      gaps.push({id:`coverage:${card.id}:rejected_in_block`,severity:'blocker',sectionId:section.id,title:'Rejected evidence is referenced by draft content',description:`Rejected evidence "${card.claim||card.summary||card.id}" is referenced by a draft block.`,evidenceCardIds:[card.id],sourceIds:card.sourceIds||[],suggestedFix:'Remove the rejected evidence reference or replace it with approved evidence.',reviewStatus:'needs_review',generatedBy:'ai_dry_run'});
    }
    return {sectionId:section.id,sectionTitle:section.title||section.id,status,evidenceCount:sectionEvidence.length,approvedEvidenceCount:approved.length,sourceCount:[...sectionSourceIds].filter(id=>sourceIds.has(id)).length,weakSourceCount:weakCount,missingSourceCount:missing.length,blockerCount,warningCount,notes:status==='strong'?'Approved evidence and source coverage are present.':'Review source coverage before export.'};
  });
  const suggestedNextSources=sectionCoverage.filter(item=>['no_sources','weak','partial'].includes(item.status)).slice(0,8).map(item=>({id:`next-source:${item.sectionId}`,sectionId:item.sectionId,sourceType:'document',reason:`Improve source coverage for ${item.sectionTitle}.`,suggestedSearchQuery:`${item.sectionTitle} supporting evidence`,priority:item.blockerCount?'high':'medium'}));
  const strongCount=sectionCoverage.filter(item=>item.status==='strong').length;
  const coverageScore=sources.length?Math.round((strongCount/Math.max(1,sectionCoverage.length))*100):0;
  const overallCoverageStatus=coverageScore>=75?'strong':coverageScore>=35?'partial':'weak';
  if(weakSources.length) warnings.push(`${weakSources.length} source(s) need credibility review.`);
  return {taskType:'check_source_coverage',overallCoverageStatus,coverageScore,sectionCoverage,coverageGaps:gaps,weakSources,suggestedNextSources,warnings,createdAt:now};
}
function validateSourceCoverageOutput(output, reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const sectionIds=new Set((report.reportSections||[]).map(section=>section.id));
  const sourceIds=new Set((report.sourceRegistry?.items||[]).map(source=>source.id));
  const evidenceIds=new Set((report.evidenceCards?.items||[]).map(card=>card.id));
  const errors=[];
  if(!output || typeof output!=='object') errors.push('Source coverage output must be an object.');
  if(output?.taskType!=='check_source_coverage') errors.push('Source coverage output taskType must be check_source_coverage.');
  if(!['weak','partial','strong'].includes(String(output?.overallCoverageStatus||''))) errors.push('Unsupported overall coverage status.');
  const score=Number(output?.coverageScore);
  if(!Number.isFinite(score)||score<0||score>100) errors.push('Coverage score must be 0-100.');
  for(const item of (output?.sectionCoverage||[])){
    if(item.sectionId && !sectionIds.has(item.sectionId)) errors.push(`Unknown section coverage section ${item.sectionId}.`);
    if(!['no_content','no_sources','weak','partial','strong'].includes(String(item.status||''))) errors.push(`Unsupported section coverage status for ${item.sectionId}.`);
  }
  for(const gap of (output?.coverageGaps||[])){
    if(!['blocker','warning','info'].includes(String(gap.severity||''))) errors.push(`Unsupported gap severity for ${gap.id}.`);
    if(!['draft','needs_review'].includes(String(gap.reviewStatus||''))) errors.push(`Unsupported gap review status for ${gap.id}.`);
    if(gap.sectionId && !sectionIds.has(gap.sectionId)) errors.push(`Unknown gap section ${gap.sectionId}.`);
    for(const evidenceId of (gap.evidenceCardIds||[])) if(!evidenceIds.has(evidenceId)) errors.push(`Gap ${gap.id} references unknown evidence ${evidenceId}.`);
    for(const sourceId of (gap.sourceIds||[])) if(!sourceIds.has(sourceId)) errors.push(`Gap ${gap.id} references unknown source ${sourceId}.`);
  }
  for(const source of (output?.weakSources||[])) if(source.sourceId && !sourceIds.has(source.sourceId)) errors.push(`Unknown weak source ${source.sourceId}.`);
  for(const item of (output?.suggestedNextSources||[])){
    if(item.sectionId && !sectionIds.has(item.sectionId)) errors.push(`Unknown next-source section ${item.sectionId}.`);
    if(!['low','medium','high'].includes(String(item.priority||''))) errors.push(`Unsupported next-source priority for ${item.id}.`);
  }
  return {ok:!errors.length, errors};
}
function approvedEvidenceForSection(reportData, sectionId){
  const cards=normalizeEvidenceCards(reportData).items||[];
  return cards.filter(card=>card.reviewStatus==='approved').filter(card=>card.sectionId===sectionId || (['recommendations','risksOpportunities'].includes(sectionId)&&['risk','opportunity','recommendation_input'].includes(card.evidenceType)));
}
function blockTypeForSectionDraft(sectionId){
  if(sectionId==='pricing') return 'metric';
  if(['competitiveLandscape','competitors','features'].includes(sectionId)) return 'comparison_note';
  if(sectionId==='risksOpportunities') return 'risk_note';
  if(sectionId==='recommendations') return 'recommendation_note';
  return 'paragraph';
}
function runAiSectionDraftDryRun(reportData, options={}){
  const report=clone(reportData||{});
  normalizeReportSchema(report);
  normalizeSourceRegistry(report);
  normalizeEvidenceCards(report);
  const now=new Date().toISOString();
  const sectionId=String(options.selectedSectionId||state.aiSectionId||'');
  const section=getReportSection(report,sectionId);
  const warnings=[], coverageWarnings=[], missingInputs=[];
  if(!section){
    warnings.push('Select a valid report section before requesting a section draft.');
    return {taskType:'suggest_report_sections',sectionId,sectionTitle:'',draftBlocks:[],coverageWarnings,missingInputs,warnings,createdAt:now};
  }
  const sources=report.sourceRegistry.items||[];
  const sourceMap=new Map(sources.map(source=>[source.id,source]));
  const weakSources=new Set(sources.filter(source=>['weak','unreviewed','needs_review'].includes(String(source.credibilityStatus||'unreviewed'))).map(source=>source.id));
  const approved=approvedEvidenceForSection(report,sectionId).sort((a,b)=>String(a.id||'').localeCompare(String(b.id||'')));
  if(!approved.length){
    missingInputs.push('Approve evidence linked to this section before requesting a section draft.');
    return {taskType:'suggest_report_sections',sectionId,sectionTitle:section.title||sectionId,draftBlocks:[],coverageWarnings,missingInputs,warnings,createdAt:now};
  }
  const type=blockTypeForSectionDraft(sectionId);
  const max=Math.max(1,Math.min(Number(options.maxDraftBlocks||options.maxCandidates)||5,8));
  const draftBlocks=approved.slice(0,max).map((card,index)=>{
    const sourceIds=Array.isArray(card.sourceIds)?card.sourceIds.filter(id=>sourceMap.has(id)):[];
    if(!sourceIds.length) coverageWarnings.push(`Evidence ${card.id} has no linked source for ${section.title||sectionId}.`);
    if(sourceIds.some(id=>weakSources.has(id))) coverageWarnings.push(`Evidence ${card.id} uses weak or unreviewed sources.`);
    return {
      id:`section-draft:${sectionId}:${card.id}`,
      type,
      title:index===0?`${section.title||sectionId} draft point`:'Supporting draft point',
      text:String(card.claim||card.summary||'').trim(),
      sectionId,
      evidenceCardIds:card.id?[card.id]:[],
      sourceIds,
      confidenceStatus:sourceIds.length?(sourceIds.some(id=>weakSources.has(id))?'medium':'high'):'low',
      reviewStatus:'needs_review',
      generatedBy:'ai_dry_run',
      analystNotes:'Dry-run section draft based on approved evidence. Review before export.',
      warnings:sourceIds.length?[]:['Missing linked source for this draft block.']
    };
  }).filter(block=>block.text);
  return {taskType:'suggest_report_sections',sectionId,sectionTitle:section.title||sectionId,draftBlocks,coverageWarnings:[...new Set(coverageWarnings)],missingInputs,warnings,createdAt:now};
}
function validateSectionDraftOutput(output, reportData){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const sectionIds=new Set((report.reportSections||[]).map(section=>section.id));
  const sourceIds=new Set((report.sourceRegistry?.items||[]).map(source=>source.id));
  const approvedIds=new Set((report.evidenceCards?.items||[]).filter(card=>card.reviewStatus==='approved').map(card=>card.id));
  const errors=[];
  if(!output || typeof output!=='object') errors.push('Section draft output must be an object.');
  if(output?.taskType!=='suggest_report_sections') errors.push('Section draft output taskType must be suggest_report_sections.');
  if(!output?.sectionId || !sectionIds.has(output.sectionId)) errors.push('Section draft output must include a valid sectionId.');
  if(!Array.isArray(output?.draftBlocks)) errors.push('Section draft output must include draftBlocks array.');
  for(const block of (output?.draftBlocks||[])){
    if(!DRAFT_BLOCK_TYPES.includes(String(block.type||''))) errors.push(`Unsupported draft block type for ${block.id}.`);
    if(!String(block.text||'').trim()) errors.push(`Draft block ${block.id} needs text.`);
    if(block.sectionId!==output.sectionId) errors.push(`Draft block ${block.id} must target the selected section.`);
    if(!['draft','needs_review'].includes(String(block.reviewStatus||''))) errors.push(`Draft block ${block.id} cannot be auto-approved.`);
    if(!['low','medium','high'].includes(String(block.confidenceStatus||''))) errors.push(`Draft block ${block.id} has invalid confidence.`);
    for(const evidenceId of (block.evidenceCardIds||[])) if(!approvedIds.has(evidenceId)) errors.push(`Draft block ${block.id} references non-approved evidence ${evidenceId}.`);
    for(const sourceId of (block.sourceIds||[])) if(!sourceIds.has(sourceId)) errors.push(`Draft block ${block.id} references unknown source ${sourceId}.`);
  }
  return {ok:!errors.length, errors};
}
function mergeCoveragePreviewWithQualityChecklist(reportData, coveragePreview){
  const base=runReportQualityChecklist(reportData);
  const output=coveragePreview?.outputPreview||coveragePreview;
  if(!output || output.taskType!=='check_source_coverage') return base;
  const extra=(output.coverageGaps||[]).map(gap=>checklistItem('source_coverage',gap.severity==='blocker'?'blocker':'warning',`${gap.title}: ${gap.description}`));
  const items=[...base.items,...extra];
  return {...base,items,blockers:items.filter(item=>item.severity==='blocker'),warnings:items.filter(item=>item.severity==='warning'),passed:items.filter(item=>item.severity==='passed')};
}
async function requestEvidenceCandidatePreview(options={}){
  const aiStatus=state.aiStatusLoaded?state.aiStatus:await fetchAiStatus();
  const gate=canRunAiEvidencePreview(REPORT,aiStatus,currentAiUser());
  if(!gate.ok) return {ok:false, errors:gate.reasons, warnings:[], output:null};
  collectMaterialsFromCurrentState(REPORT,state.fsRoots);
  buildSourcesFromMaterials(REPORT);
  const safeOptions={
    selectedSourceIds:Array.isArray(options.selectedSourceIds)?options.selectedSourceIds.map(String).filter(Boolean):[],
    selectedMaterialIds:Array.isArray(options.selectedMaterialIds)?options.selectedMaterialIds.map(String).filter(Boolean):[],
    selectedSectionIds:Array.isArray(options.selectedSectionIds)?options.selectedSectionIds.map(String).filter(Boolean):[],
    maxCandidates:Math.max(1,Math.min(Number(options.maxCandidates)||8,12)),
    mode:String(options.mode||aiStatus.currentMode||'dry_run')
  };
  const audit=beginAiPreviewAudit(REPORT,'extract_evidence_candidates',aiStatus,safeOptions);
  let payload=null;
  if(aiStatus.source==='backend' && !BROWSER_ONLY_MODE && HOSTED_MODE){
    try{
      const nativeFetch=globalThis['fetch'];
      if(typeof nativeFetch!=='function') throw new Error('AI preview API unavailable.');
      const res=await nativeFetch('/api/ai/preview',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({
          taskType:'extract_evidence_candidates',
          user:currentAiUser(),
          reportData:exportReportSnapshot(),
          options:safeOptions
        })
      });
      payload=await res.json();
      if(!res.ok || payload?.ok===false){failAiPreviewAudit(REPORT,audit,payload?.errorCode||'preview_failed',payload?.warnings||[]); return {ok:false, errors:payload?.errors?.length?payload.errors:['AI preview failed.'], warnings:payload?.warnings||[], output:null};}
    }catch(e){
      failAiPreviewAudit(REPORT,audit,'preview_unavailable');
      return {ok:false, errors:['AI preview service is unavailable.'], warnings:[], output:null};
    }
  }else{
    const output=runAiEvidenceCandidateDryRun(REPORT,safeOptions);
    payload={ok:true,provider:'dry_run',taskType:'extract_evidence_candidates',suggestions:(output.candidates||[]).map(candidate=>({candidate:{...candidate,generatedBy:'ai_dry_run'}})),warnings:output.warnings||[]};
  }
  const output=normalizeEvidenceCandidatePreviewResponse(payload,payload?.provider||aiStatus.provider||'dry_run');
  const validation=validateEvidenceCandidateOutput(output,REPORT);
  if(!validation.ok){failAiPreviewAudit(REPORT,audit,'validation_failed',output.warnings||[]); return {ok:false, errors:validation.errors, warnings:output.warnings||[], output:null};}
  applyAiTaskOutputPreview(REPORT,'extract_evidence_candidates',output,{...audit,provider:payload?.provider||audit.provider});
  return {ok:true, errors:[], warnings:output.warnings||[], output};
}
function renderEvidenceCandidatePreview(preview){
  const output=preview?.outputPreview||preview;
  if(!output || output.taskType!=='extract_evidence_candidates') return '';
  const validation=validateEvidenceCandidateOutput(output,REPORT);
  const warnings=[...(output.warnings||[]),...(validation.errors||[])];
  const rows=(output.candidates||[]).slice(0,8).map(candidate=>{
    const section=getReportSection(REPORT,candidate.suggestedSectionId);
    return `<label class="materialRow">
      <input type="checkbox" class="adminOnly" data-ai-candidate-check="${esc(candidate.id)}">
      <div class="itemName">${esc(candidate.claim||candidate.summary||'Untitled candidate')}
        <div class="itemMeta">${esc(section?.title||'Unlinked section')} - ${(candidate.sourceIds||[]).length} source${(candidate.sourceIds||[]).length===1?'':'s'} - confidence: ${esc(candidate.confidenceStatus)} - credibility: ${esc(candidate.credibilityStatus)} - status: ${esc(candidate.reviewStatus)}</div>
        ${candidate.summary?`<div class="itemMeta">${esc(candidate.summary)}</div>`:''}
        ${(candidate.warnings||[]).length?`<div class="itemMeta">Warnings: ${esc(candidate.warnings.join(' | '))}</div>`:''}
      </div>
    </label>`;
  }).join('');
  return `<div class="materialsHead"><b>Candidate preview</b><span class="pill">${(output.candidates||[]).length} candidate${(output.candidates||[]).length===1?'':'s'}</span></div>
    <div class="itemMeta">AI suggestions require review before export. AI output is not added to the client report automatically.</div>
    ${warnings.length?`<div class="itemMeta">Warnings: ${esc(warnings.join(' | '))}</div>`:''}
    ${rows||'<div class="empty">No candidate evidence was found in this preview.</div>'}
    ${(output.candidates||[]).length?'<button class="btn small primary adminOnly" data-ai-add-candidates="1">Add selected candidates to Evidence Cards</button><button class="btn small adminOnly" data-ai-queue-candidates="1">Send selected suggestions to review queue</button>':''}`;
}
function clearEvidenceCandidatePreview(){
  const ai=normalizeAiAssistanceState(REPORT);
  ai.suggestions=(ai.suggestions||[]).filter(item=>!(item.taskType==='extract_evidence_candidates' && item.outputPreview?.taskType==='extract_evidence_candidates'));
  ai.updatedAt=new Date().toISOString();
}
async function requestRecommendationPreview(options={}){
  const aiStatus=state.aiStatusLoaded?state.aiStatus:await fetchAiStatus();
  const gate=canRunAiRecommendationPreview(REPORT,aiStatus,currentAiUser());
  if(!gate.ok) return {ok:false, errors:gate.reasons, warnings:[], output:null};
  const safeOptions={
    selectedSourceIds:Array.isArray(options.selectedSourceIds)?options.selectedSourceIds.map(String).filter(Boolean):[],
    selectedMaterialIds:Array.isArray(options.selectedMaterialIds)?options.selectedMaterialIds.map(String).filter(Boolean):[],
    selectedSectionIds:Array.isArray(options.selectedSectionIds)?options.selectedSectionIds.map(String).filter(Boolean):[],
    maxRecommendations:Math.max(1,Math.min(Number(options.maxRecommendations||options.maxCandidates)||6,10)),
    mode:String(options.mode||aiStatus.currentMode||'dry_run')
  };
  const audit=beginAiPreviewAudit(REPORT,'suggest_recommendations',aiStatus,safeOptions);
  let payload=null;
  if(aiStatus.source==='backend' && !BROWSER_ONLY_MODE && HOSTED_MODE){
    try{
      const nativeFetch=globalThis['fetch'];
      if(typeof nativeFetch!=='function') throw new Error('AI preview API unavailable.');
      const res=await nativeFetch('/api/ai/preview',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({
          taskType:'suggest_recommendations',
          user:currentAiUser(),
          reportData:exportReportSnapshot(),
          options:safeOptions
        })
      });
      payload=await res.json();
      if(!res.ok || payload?.ok===false){failAiPreviewAudit(REPORT,audit,payload?.errorCode||'preview_failed',payload?.warnings||[]); return {ok:false, errors:payload?.errors?.length?payload.errors:['AI recommendation preview failed.'], warnings:payload?.warnings||[], output:null};}
    }catch(e){
      failAiPreviewAudit(REPORT,audit,'preview_unavailable');
      return {ok:false, errors:['AI recommendation service is unavailable.'], warnings:[], output:null};
    }
  }else{
    const output=runAiRecommendationDryRun(REPORT,safeOptions);
    payload={ok:true,provider:'dry_run',taskType:'suggest_recommendations',suggestions:(output.recommendations||[]).map(recommendation=>({recommendation:{...recommendation,generatedBy:'ai_dry_run'}})),warnings:output.warnings||[]};
  }
  const output=normalizeRecommendationPreviewResponse(payload,payload?.provider||aiStatus.provider||'dry_run');
  const validation=validateRecommendationSuggestionOutput(output,REPORT);
  if(!validation.ok){failAiPreviewAudit(REPORT,audit,'validation_failed',output.warnings||[]); return {ok:false, errors:validation.errors, warnings:output.warnings||[], output:null};}
  applyAiTaskOutputPreview(REPORT,'suggest_recommendations',output,{...audit,provider:payload?.provider||audit.provider});
  return {ok:true, errors:[], warnings:output.warnings||[], output};
}
function latestAiRecommendationPreview(reportData){
  const ai=normalizeAiAssistanceState(reportData);
  return [...(ai.suggestions||[])].reverse().find(item=>item.taskType==='suggest_recommendations' && item.outputPreview?.taskType==='suggest_recommendations')||null;
}
function renderRecommendationPreview(preview){
  const output=preview?.outputPreview||preview;
  if(!output || output.taskType!=='suggest_recommendations') return '';
  const validation=validateRecommendationSuggestionOutput(output,REPORT);
  const warnings=[...(output.warnings||[]),...(validation.errors||[])];
  const rows=(output.recommendations||[]).slice(0,8).map(item=>{
    const section=getReportSection(REPORT,item.suggestedSectionId);
    return `<label class="materialRow">
      <input type="checkbox" class="adminOnly" data-ai-recommendation-check="${esc(item.id)}">
      <div class="itemName">${esc(item.title||'Recommendation suggestion')}
        <div class="itemMeta">${esc(section?.title||'Recommendations')} - priority: ${esc(item.priority)} - effort: ${esc(item.effortLevel)} - confidence: ${esc(item.confidenceStatus)} - status: ${esc(item.reviewStatus)}</div>
        <div class="itemMeta">${esc(item.recommendation||'')}</div>
        ${item.rationale?`<div class="itemMeta">Rationale: ${esc(item.rationale)}</div>`:''}
        <div class="itemMeta">Evidence ${(item.evidenceCardIds||[]).length} - Sources ${(item.sourceIds||[]).length} - Impact: ${esc(item.expectedImpact||'')}</div>
        ${(item.warnings||[]).length?`<div class="itemMeta">Warnings: ${esc(item.warnings.join(' | '))}</div>`:''}
      </div>
    </label>`;
  }).join('');
  return `<div class="materialsHead"><b>Recommendation preview</b><span class="pill">${(output.recommendations||[]).length} recommendation${(output.recommendations||[]).length===1?'':'s'}</span></div>
    <div class="itemMeta">AI recommendations require review before export.</div>
    ${warnings.length?`<div class="itemMeta">Warnings: ${esc(warnings.join(' | '))}</div>`:''}
    ${rows||'<div class="empty">No recommendations were suggested. Approve evidence cards first.</div>'}
    ${(output.recommendations||[]).length?'<button class="btn small primary adminOnly" data-ai-add-recommendations="1">Add selected recommendations to draft</button><button class="btn small adminOnly" data-ai-queue-recommendations="1">Send selected suggestions to review queue</button>':''}`;
}
function convertRecommendationSuggestionToDraftBlock(suggestion, reportData=REPORT){
  const now=new Date().toISOString();
  const sectionIds=new Set((reportData.reportSections||[]).map(section=>section.id));
  const fallback=sectionIds.has('recommendations')?'recommendations':'';
  const sectionId=sectionIds.has(suggestion.suggestedSectionId)?suggestion.suggestedSectionId:fallback;
  if(!sectionId) return null;
  const text=[suggestion.recommendation,suggestion.rationale?`Rationale: ${suggestion.rationale}`:'',suggestion.expectedImpact?`Expected impact: ${suggestion.expectedImpact}`:''].filter(Boolean).join('\n');
  return normalizeDraftBlock({
    id:uid('draft'),
    type:'recommendation_note',
    title:String(suggestion.title||'AI recommendation'),
    text,
    sectionId,
    evidenceCardIds:Array.isArray(suggestion.evidenceCardIds)?suggestion.evidenceCardIds.map(String).filter(Boolean):[],
    sourceIds:Array.isArray(suggestion.sourceIds)?suggestion.sourceIds.map(String).filter(Boolean):[],
    generatedBy:String(suggestion.generatedBy||'ai_preview')==='ai_dry_run'?'ai_dry_run':'ai_preview',
    createdAt:now,
    updatedAt:now,
    status:'needs_review',
    confidenceStatus:suggestion.confidenceStatus,
    priority:suggestion.priority,
    effortLevel:suggestion.effortLevel
  });
}
function addSelectedRecommendationsToDraft(reportData, recommendationIds){
  const report=normalizeReportSchema(reportData&&typeof reportData==='object'?reportData:{});
  const preview=latestAiRecommendationPreview(report);
  const selected=new Set((recommendationIds||[]).map(String));
  const validation=validateRecommendationSuggestionOutput(preview?.outputPreview,report);
  if(!preview || !validation.ok || !selected.size) return {added:0, errors:validation.errors||['No selected recommendations.']};
  let added=0;
  for(const item of (preview.outputPreview.recommendations||[])){
    if(!selected.has(String(item.id))) continue;
    const block=convertRecommendationSuggestionToDraftBlock(item,report);
    if(!block) continue;
    recordAiSuggestionOutput(report,item,block,'draft_block');
    const section=getReportSection(report,block.sectionId);
    if(!section) continue;
    section.blocks=[...(section.blocks||[]),block];
    section.status=section.status==='approved'?'approved':'needs_review';
    section.updatedAt=new Date().toISOString();
    added++;
  }
  return {added, errors:added?[]:['No valid recommendation section is available.']};
}
async function requestExecutiveSummaryPreview(options={}){
  const aiStatus=state.aiStatusLoaded?state.aiStatus:await fetchAiStatus();
  const gate=canRunAiExecutiveSummaryPreview(REPORT,aiStatus,currentAiUser());
  if(!gate.ok) return {ok:false, errors:gate.reasons, warnings:[], output:null};
  const safeOptions={
    selectedSourceIds:Array.isArray(options.selectedSourceIds)?options.selectedSourceIds.map(String).filter(Boolean):[],
    selectedMaterialIds:Array.isArray(options.selectedMaterialIds)?options.selectedMaterialIds.map(String).filter(Boolean):[],
    selectedSectionIds:Array.isArray(options.selectedSectionIds)?options.selectedSectionIds.map(String).filter(Boolean):[],
    maxSummaryBlocks:Math.max(1,Math.min(Number(options.maxSummaryBlocks||options.maxCandidates)||5,8)),
    mode:String(options.mode||aiStatus.currentMode||'dry_run')
  };
  const audit=beginAiPreviewAudit(REPORT,'improve_executive_summary',aiStatus,safeOptions);
  let payload=null;
  if(aiStatus.source==='backend' && !BROWSER_ONLY_MODE && HOSTED_MODE){
    try{
      const nativeFetch=globalThis['fetch'];
      if(typeof nativeFetch!=='function') throw new Error('AI preview API unavailable.');
      const res=await nativeFetch('/api/ai/preview',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({
          taskType:'improve_executive_summary',
          user:currentAiUser(),
          reportData:exportReportSnapshot(),
          options:safeOptions
        })
      });
      payload=await res.json();
      if(!res.ok || payload?.ok===false){failAiPreviewAudit(REPORT,audit,payload?.errorCode||'preview_failed',payload?.warnings||[]); return {ok:false, errors:payload?.errors?.length?payload.errors:['AI executive summary preview failed.'], warnings:payload?.warnings||[], output:null};}
    }catch(e){
      failAiPreviewAudit(REPORT,audit,'preview_unavailable');
      return {ok:false, errors:['AI executive summary service is unavailable.'], warnings:[], output:null};
    }
  }else{
    const output=runAiExecutiveSummaryDryRun(REPORT,safeOptions);
    payload={ok:true,provider:'dry_run',taskType:'improve_executive_summary',suggestions:(output.summaryBlocks||[]).map(summaryBlock=>({summaryBlock:{...summaryBlock,generatedBy:'ai_dry_run'}})),warnings:output.warnings||[],summaryTitle:output.summaryTitle,keyTakeaways:output.keyTakeaways};
  }
  const output=normalizeExecutiveSummaryPreviewResponse(payload,payload?.provider||aiStatus.provider||'dry_run');
  const validation=validateExecutiveSummaryOutput(output,REPORT);
  if(!validation.ok){failAiPreviewAudit(REPORT,audit,'validation_failed',output.warnings||[]); return {ok:false, errors:validation.errors, warnings:output.warnings||[], output:null};}
  applyAiTaskOutputPreview(REPORT,'improve_executive_summary',output,{...audit,provider:payload?.provider||audit.provider});
  return {ok:true, errors:[], warnings:output.warnings||[], output};
}
function latestAiExecutiveSummaryPreview(reportData){
  const ai=normalizeAiAssistanceState(reportData);
  return [...(ai.suggestions||[])].reverse().find(item=>item.taskType==='improve_executive_summary' && item.outputPreview?.taskType==='improve_executive_summary')||null;
}
function renderExecutiveSummaryPreview(preview){
  const output=preview?.outputPreview||preview;
  if(!output || output.taskType!=='improve_executive_summary') return '';
  const validation=validateExecutiveSummaryOutput(output,REPORT);
  const warnings=[...(output.warnings||[]),...(validation.errors||[])];
  const rows=(output.summaryBlocks||[]).slice(0,8).map(block=>{
    const section=getReportSection(REPORT,block.suggestedSectionId);
    return `<label class="materialRow">
      <input type="checkbox" class="adminOnly" data-ai-summary-check="${esc(block.id)}">
      <div class="itemName">${esc(block.heading||'Executive summary block')}
        <div class="itemMeta">${esc(section?.title||'Executive Summary')} - importance: ${esc(block.importance)} - confidence: ${esc(block.confidenceStatus)} - status: ${esc(block.reviewStatus)}</div>
        <div class="itemMeta">${esc(block.text||'')}</div>
        <div class="itemMeta">Evidence ${(block.evidenceCardIds||[]).length} - Sources ${(block.sourceIds||[]).length}</div>
        ${(block.warnings||[]).length?`<div class="itemMeta">Warnings: ${esc(block.warnings.join(' | '))}</div>`:''}
      </div>
    </label>`;
  }).join('');
  return `<div class="materialsHead"><b>${esc(output.summaryTitle||'Executive Summary Preview')}</b><span class="pill">${(output.summaryBlocks||[]).length} block${(output.summaryBlocks||[]).length===1?'':'s'}</span></div>
    <div class="itemMeta">AI executive summary requires review before export.</div>
    ${warnings.length?`<div class="itemMeta">Warnings: ${esc(warnings.join(' | '))}</div>`:''}
    ${rows||'<div class="empty">No executive summary blocks were suggested. Approve evidence cards first.</div>'}
    ${(output.summaryBlocks||[]).length?'<button class="btn small primary adminOnly" data-ai-add-summary="1">Add selected summary blocks to draft</button><button class="btn small adminOnly" data-ai-queue-summary="1">Send selected suggestions to review queue</button>':''}`;
}
function convertExecutiveSummarySuggestionToDraftBlock(suggestion, reportData=REPORT){
  const now=new Date().toISOString();
  const sectionIds=new Set((reportData.reportSections||[]).map(section=>section.id));
  const fallback=sectionIds.has('executiveSummary')?'executiveSummary':'';
  const sectionId=sectionIds.has(suggestion.suggestedSectionId)?suggestion.suggestedSectionId:fallback;
  if(!sectionId) return null;
  return normalizeDraftBlock({
    id:uid('draft'),
    type:'paragraph',
    title:String(suggestion.heading||'Executive summary'),
    text:String(suggestion.text||''),
    sectionId,
    evidenceCardIds:Array.isArray(suggestion.evidenceCardIds)?suggestion.evidenceCardIds.map(String).filter(Boolean):[],
    sourceIds:Array.isArray(suggestion.sourceIds)?suggestion.sourceIds.map(String).filter(Boolean):[],
    generatedBy:String(suggestion.generatedBy||'ai_preview')==='ai_dry_run'?'ai_dry_run':'ai_preview',
    createdAt:now,
    updatedAt:now,
    status:'needs_review',
    confidenceStatus:suggestion.confidenceStatus,
    importance:suggestion.importance
  });
}
function addSelectedSummaryBlocksToDraft(reportData, summaryIds){
  const report=normalizeReportSchema(reportData&&typeof reportData==='object'?reportData:{});
  const preview=latestAiExecutiveSummaryPreview(report);
  const selected=new Set((summaryIds||[]).map(String));
  const validation=validateExecutiveSummaryOutput(preview?.outputPreview,report);
  if(!preview || !validation.ok || !selected.size) return {added:0, errors:validation.errors||['No selected summary blocks.']};
  let added=0;
  for(const item of (preview.outputPreview.summaryBlocks||[])){
    if(!selected.has(String(item.id))) continue;
    const block=convertExecutiveSummarySuggestionToDraftBlock(item,report);
    if(!block) continue;
    recordAiSuggestionOutput(report,item,block,'draft_block');
    const section=getReportSection(report,block.sectionId);
    if(!section) continue;
    section.blocks=[...(section.blocks||[]),block];
    section.status=section.status==='approved'?'approved':'needs_review';
    section.updatedAt=new Date().toISOString();
    added++;
  }
  return {added, errors:added?[]:['No valid executive summary section is available.']};
}
async function requestSourceCoveragePreview(options={}){
  const aiStatus=state.aiStatusLoaded?state.aiStatus:await fetchAiStatus();
  const gate=canRunAiSourceCoveragePreview(REPORT,aiStatus,currentAiUser());
  if(!gate.ok) return {ok:false, errors:gate.reasons, warnings:[], output:null};
  const safeOptions={
    selectedSourceIds:Array.isArray(options.selectedSourceIds)?options.selectedSourceIds.map(String).filter(Boolean):[],
    selectedMaterialIds:Array.isArray(options.selectedMaterialIds)?options.selectedMaterialIds.map(String).filter(Boolean):[],
    selectedSectionIds:Array.isArray(options.selectedSectionIds)?options.selectedSectionIds.map(String).filter(Boolean):[],
    mode:String(options.mode||aiStatus.currentMode||'dry_run')
  };
  const audit=beginAiPreviewAudit(REPORT,'check_source_coverage',aiStatus,safeOptions);
  let payload=null;
  if(aiStatus.source==='backend' && !BROWSER_ONLY_MODE && HOSTED_MODE){
    try{
      const nativeFetch=globalThis['fetch'];
      if(typeof nativeFetch!=='function') throw new Error('AI preview API unavailable.');
      const res=await nativeFetch('/api/ai/preview',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({taskType:'check_source_coverage',user:currentAiUser(),reportData:exportReportSnapshot(),options:safeOptions})});
      payload=await res.json();
      if(!res.ok || payload?.ok===false){failAiPreviewAudit(REPORT,audit,payload?.errorCode||'preview_failed',payload?.warnings||[]); return {ok:false, errors:payload?.errors?.length?payload.errors:['AI source coverage preview failed.'], warnings:payload?.warnings||[], output:null};}
    }catch(e){
      failAiPreviewAudit(REPORT,audit,'preview_unavailable');
      return {ok:false, errors:['AI source coverage service is unavailable.'], warnings:[], output:null};
    }
  }else{
    const output=runAiSourceCoverageDryRun(REPORT);
    payload={ok:true,provider:'dry_run',taskType:'check_source_coverage',suggestions:(output.coverageGaps||[]).map(gap=>({gap:{...gap,generatedBy:'ai_dry_run'}})),warnings:output.warnings||[],overallCoverageStatus:output.overallCoverageStatus,coverageScore:output.coverageScore,sectionCoverage:output.sectionCoverage,weakSources:output.weakSources,suggestedNextSources:output.suggestedNextSources};
  }
  const output=normalizeSourceCoveragePreviewResponse(payload);
  const validation=validateSourceCoverageOutput(output,REPORT);
  if(!validation.ok){failAiPreviewAudit(REPORT,audit,'validation_failed',output.warnings||[]); return {ok:false, errors:validation.errors, warnings:output.warnings||[], output:null};}
  applyAiTaskOutputPreview(REPORT,'check_source_coverage',output,{...audit,provider:payload?.provider||audit.provider});
  return {ok:true, errors:[], warnings:output.warnings||[], output};
}
function latestAiSourceCoveragePreview(reportData){
  const ai=normalizeAiAssistanceState(reportData);
  return [...(ai.suggestions||[])].reverse().find(item=>item.taskType==='check_source_coverage' && item.outputPreview?.taskType==='check_source_coverage')||null;
}
function renderSourceCoveragePreview(preview){
  const output=preview?.outputPreview||preview;
  if(!output || output.taskType!=='check_source_coverage') return '';
  const validation=validateSourceCoverageOutput(output,REPORT);
  const warnings=[...(output.warnings||[]),...(validation.errors||[])];
  const blockerCount=(output.coverageGaps||[]).filter(gap=>gap.severity==='blocker').length;
  const warningCount=(output.coverageGaps||[]).filter(gap=>gap.severity==='warning').length;
  const sections=(output.sectionCoverage||[]).slice(0,6).map(item=>`<div class="materialRow"><div class="itemName">${esc(item.sectionTitle||item.sectionId)}<div class="itemMeta">${esc(item.status)} - evidence ${item.approvedEvidenceCount}/${item.evidenceCount} - sources ${item.sourceCount} - weak ${item.weakSourceCount}</div></div></div>`).join('');
  const gaps=(output.coverageGaps||[]).slice(0,8).map(gap=>`<label class="materialRow"><input type="checkbox" class="adminOnly" data-ai-gap-check="${esc(gap.id)}"><div class="itemName">${esc(gap.title)}<div class="itemMeta">${esc(gap.severity)} - ${esc(gap.description)}</div><div class="itemMeta">Fix: ${esc(gap.suggestedFix||'Review source coverage.')}</div></div></label>`).join('');
  const next=(output.suggestedNextSources||[]).slice(0,4).map(item=>`<div class="itemMeta">Next source: ${esc(item.reason)} (${esc(item.priority)})</div>`).join('');
  return `<div class="materialsHead"><b>Source Coverage Preview</b><span class="pill">${esc(output.overallCoverageStatus)} ${Number(output.coverageScore||0)}%</span></div>
    <div class="itemMeta">Coverage analysis is a preview and requires human review.</div>
    <div class="itemMeta">${blockerCount} blocker(s) - ${warningCount} warning(s) - ${(output.weakSources||[]).length} weak source(s)</div>
    ${warnings.length?`<div class="itemMeta">Warnings: ${esc(warnings.join(' | '))}</div>`:''}
    ${sections}
    ${gaps||'<div class="empty">No source coverage gaps found in this preview.</div>'}
    ${next}
    ${(output.coverageGaps||[]).length?'<button class="btn small primary adminOnly" data-ai-add-gaps="1">Add selected gaps to checklist</button><button class="btn small adminOnly" data-ai-queue-gaps="1">Send selected suggestions to review queue</button>':''}`;
}
function addSelectedCoverageGapsToSuggestions(reportData, gapIds){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const preview=latestAiSourceCoveragePreview(report);
  const selected=new Set((gapIds||[]).map(String));
  const validation=validateSourceCoverageOutput(preview?.outputPreview,report);
  if(!preview || !validation.ok || !selected.size) return {added:0, errors:validation.errors||['No selected coverage gaps.']};
  const ai=normalizeAiAssistanceState(report);
  let added=0;
  for(const gap of (preview.outputPreview.coverageGaps||[])){
    if(!selected.has(String(gap.id))) continue;
    ai.suggestions.push(normalizeAiSuggestion({id:uid('ai-gap'),taskType:'check_source_coverage',title:gap.title||'Source coverage gap',summary:gap.description||'',inputRefs:gap.inputRefs||[gap.sectionId,...(gap.sourceIds||[]),...(gap.evidenceCardIds||[])].filter(Boolean),outputPreview:{gap:{...gap,reviewStatus:'needs_review',generatedBy:gap.generatedBy||'ai_dry_run'}},status:'ready_for_review',taskRunId:gap.taskRunId||'',provider:gap.provider||'dry_run',providerMode:gap.providerMode||'dry_run',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));
    recordAiSuggestionOutput(report,gap,{id:gap.id,title:gap.title||'Source coverage gap',message:gap.description||'',sectionId:gap.sectionId,status:'needs_review'},'checklist_item');
    added++;
  }
  if(added) ai.updatedAt=new Date().toISOString();
  return {added, errors:[]};
}
async function requestSectionDraftPreview(options={}){
  const aiStatus=state.aiStatusLoaded?state.aiStatus:await fetchAiStatus();
  const selectedSectionId=String(options.selectedSectionId||state.aiSectionId||'');
  const gate=canRunAiSectionDraftPreview(REPORT,aiStatus,currentAiUser());
  if(!gate.ok) return {ok:false, errors:gate.reasons, warnings:[], output:null};
  const safeOptions={selectedSectionId,selectedSectionIds:selectedSectionId?[selectedSectionId]:[],maxDraftBlocks:Math.max(1,Math.min(Number(options.maxDraftBlocks||options.maxCandidates)||5,8)),mode:String(options.mode||aiStatus.currentMode||'dry_run')};
  const audit=beginAiPreviewAudit(REPORT,'suggest_report_sections',aiStatus,safeOptions);
  let payload=null;
  if(aiStatus.source==='backend' && !BROWSER_ONLY_MODE && HOSTED_MODE){
    try{
      const nativeFetch=globalThis['fetch'];
      if(typeof nativeFetch!=='function') throw new Error('AI preview API unavailable.');
      const res=await nativeFetch('/api/ai/preview',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({taskType:'suggest_report_sections',user:currentAiUser(),reportData:exportReportSnapshot(),options:safeOptions})});
      payload=await res.json();
      if(!res.ok || payload?.ok===false){failAiPreviewAudit(REPORT,audit,payload?.errorCode||'preview_failed',payload?.warnings||[]); return {ok:false, errors:payload?.errors?.length?payload.errors:['AI section draft preview failed.'], warnings:payload?.warnings||[], output:null};}
    }catch(e){
      failAiPreviewAudit(REPORT,audit,'preview_unavailable');
      return {ok:false, errors:['AI section draft service is unavailable.'], warnings:[], output:null};
    }
  }else{
    const output=runAiSectionDraftDryRun(REPORT,safeOptions);
    payload={ok:true,provider:'dry_run',taskType:'suggest_report_sections',suggestions:(output.draftBlocks||[]).map(block=>({block:{...block,generatedBy:'ai_dry_run'}})),warnings:output.warnings||[],sectionId:output.sectionId,sectionTitle:output.sectionTitle,coverageWarnings:output.coverageWarnings,missingInputs:output.missingInputs};
  }
  const output=normalizeSectionDraftPreviewResponse(payload,payload?.provider||aiStatus.provider||'dry_run');
  const validation=validateSectionDraftOutput(output,REPORT);
  if(!validation.ok){failAiPreviewAudit(REPORT,audit,'validation_failed',output.warnings||[]); return {ok:false, errors:validation.errors, warnings:output.warnings||[], output:null};}
  applyAiTaskOutputPreview(REPORT,'suggest_report_sections',output,{...audit,provider:payload?.provider||audit.provider});
  return {ok:true, errors:[], warnings:output.warnings||[], output};
}
function latestAiSectionDraftPreview(reportData){
  const ai=normalizeAiAssistanceState(reportData);
  return [...(ai.suggestions||[])].reverse().find(item=>item.taskType==='suggest_report_sections' && item.outputPreview?.taskType==='suggest_report_sections')||null;
}
function renderSectionDraftPreview(preview){
  const output=preview?.outputPreview||preview;
  if(!output || output.taskType!=='suggest_report_sections') return '';
  const validation=validateSectionDraftOutput(output,REPORT);
  const warnings=[...(output.warnings||[]),...(output.coverageWarnings||[]),...(output.missingInputs||[]),...(validation.errors||[])];
  const rows=(output.draftBlocks||[]).slice(0,8).map(block=>`<label class="materialRow"><input type="checkbox" class="adminOnly" data-ai-section-block-check="${esc(block.id)}"><div class="itemName">${esc(block.title||block.type)}<div class="itemMeta">${esc(block.type)} - evidence ${(block.evidenceCardIds||[]).length} - sources ${(block.sourceIds||[]).length} - confidence ${esc(block.confidenceStatus)} - ${esc(block.reviewStatus)}</div><div class="itemMeta">${esc(String(block.text||'').slice(0,220))}</div>${(block.warnings||[]).length?`<div class="itemMeta">Warnings: ${esc(block.warnings.join(' | '))}</div>`:''}</div></label>`).join('');
  return `<div class="materialsHead"><b>Section Draft Preview: ${esc(output.sectionTitle||output.sectionId)}</b><span class="pill">${(output.draftBlocks||[]).length} block${(output.draftBlocks||[]).length===1?'':'s'}</span></div>
    <div class="itemMeta">AI section drafts require review before export.</div>
    ${warnings.length?`<div class="itemMeta">Warnings: ${esc(warnings.join(' | '))}</div>`:''}
    ${rows||'<div class="empty">No section draft blocks were suggested. Approve evidence linked to this section first.</div>'}
    ${(output.draftBlocks||[]).length?'<button class="btn small primary adminOnly" data-ai-add-section-blocks="1">Add selected blocks to section draft</button><button class="btn small adminOnly" data-ai-queue-section-blocks="1">Send selected suggestions to review queue</button>':''}`;
}
function convertSectionDraftSuggestionToDraftBlock(suggestion, reportData=REPORT){
  const sectionIds=new Set((reportData.reportSections||[]).map(section=>section.id));
  if(!sectionIds.has(suggestion.sectionId)) return null;
  return normalizeDraftBlock({id:uid('draft'),type:DRAFT_BLOCK_TYPES.includes(String(suggestion.type))?suggestion.type:'paragraph',title:String(suggestion.title||'AI section draft'),text:String(suggestion.text||''),sectionId:suggestion.sectionId,evidenceCardIds:Array.isArray(suggestion.evidenceCardIds)?suggestion.evidenceCardIds.map(String).filter(Boolean):[],sourceIds:Array.isArray(suggestion.sourceIds)?suggestion.sourceIds.map(String).filter(Boolean):[],generatedBy:String(suggestion.generatedBy||'ai_preview')==='ai_dry_run'?'ai_dry_run':'ai_preview',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'needs_review',confidenceStatus:suggestion.confidenceStatus,analystNotes:suggestion.analystNotes});
}
function addSelectedSectionDraftBlocks(reportData, blockIds){
  const report=normalizeReportSchema(reportData&&typeof reportData==='object'?reportData:{});
  const preview=latestAiSectionDraftPreview(report);
  const selected=new Set((blockIds||[]).map(String));
  const validation=validateSectionDraftOutput(preview?.outputPreview,report);
  if(!preview || !validation.ok || !selected.size) return {added:0, errors:validation.errors||['No selected section draft blocks.']};
  let added=0;
  for(const item of (preview.outputPreview.draftBlocks||[])){
    if(!selected.has(String(item.id))) continue;
    const block=convertSectionDraftSuggestionToDraftBlock(item,report);
    if(!block) continue;
    recordAiSuggestionOutput(report,item,block,'draft_block');
    const section=getReportSection(report,block.sectionId);
    if(!section) continue;
    section.blocks=[...(section.blocks||[]),block];
    section.status=section.status==='approved'?'approved':'needs_review';
    section.updatedAt=new Date().toISOString();
    added++;
  }
  return {added, errors:added?[]:['No valid section draft blocks were selected.']};
}
function queueSelectedPreviewItems(reportData, kind, ids){
  const selected=new Set((ids||[]).map(String));
  let payloads=[];
  if(kind==='evidence_candidate') payloads=(latestAiEvidenceCandidatePreview(reportData)?.outputPreview?.candidates||[]).filter(item=>selected.has(item.id)).map(candidate=>({candidate}));
  if(kind==='recommendation') payloads=(latestAiRecommendationPreview(reportData)?.outputPreview?.recommendations||[]).filter(item=>selected.has(item.id)).map(recommendation=>({recommendation}));
  if(kind==='executive_summary') payloads=(latestAiExecutiveSummaryPreview(reportData)?.outputPreview?.summaryBlocks||[]).filter(item=>selected.has(item.id)).map(summaryBlock=>({summaryBlock}));
  if(kind==='source_coverage_gap') payloads=(latestAiSourceCoveragePreview(reportData)?.outputPreview?.coverageGaps||[]).filter(item=>selected.has(item.id)).map(gap=>({gap}));
  if(kind==='section_draft') payloads=(latestAiSectionDraftPreview(reportData)?.outputPreview?.draftBlocks||[]).filter(item=>selected.has(item.id)).map(block=>({block}));
  return addAiSuggestionsToReviewQueue(reportData,payloads);
}
function latestAiEvidenceCandidatePreview(reportData){
  const ai=normalizeAiAssistanceState(reportData);
  return [...(ai.suggestions||[])].reverse().find(item=>item.taskType==='extract_evidence_candidates' && item.outputPreview?.taskType==='extract_evidence_candidates')||null;
}
function convertCandidateToEvidenceCard(candidate, reportData=REPORT){
  const sectionIds=new Set((reportData.reportSections||[]).map(section=>section.id));
  const sourceIds=new Set((reportData.sourceRegistry?.items||[]).map(source=>source.id));
  const safeSourceIds=(candidate.sourceIds||[]).filter(id=>sourceIds.has(id));
  const sectionId=sectionIds.has(candidate.suggestedSectionId)?candidate.suggestedSectionId:'';
  return createEvidenceCard({
    claim:String(candidate.claim||'').trim(),
    summary:String(candidate.summary||'').trim(),
    sourceIds:safeSourceIds,
    materialIds:Array.isArray(candidate.materialIds)?candidate.materialIds.map(String).filter(Boolean):[],
    sectionId,
    evidenceType:EVIDENCE_TYPES.includes(String(candidate.evidenceType))?String(candidate.evidenceType):'observation',
    reviewStatus:'needs_review',
    confidenceStatus:EVIDENCE_CONFIDENCE_STATUS.includes(String(candidate.confidenceStatus))?String(candidate.confidenceStatus):'low',
    credibilityStatus:EVIDENCE_CREDIBILITY_STATUS.includes(String(candidate.credibilityStatus))?String(candidate.credibilityStatus):'unreviewed',
    analystNotes:'Created from AI evidence preview. Verify against source material before approval.',
    generatedBy:String(candidate.generatedBy||'ai_preview')==='ai_dry_run'?'ai_dry_run':'ai_preview'
  });
}
function addSelectedEvidenceCandidates(reportData, candidateIds){
  const report=reportData&&typeof reportData==='object'?reportData:{};
  const preview=latestAiEvidenceCandidatePreview(report);
  const selected=new Set((candidateIds||[]).map(String));
  const validation=validateEvidenceCandidateOutput(preview?.outputPreview, report);
  if(!preview || !validation.ok || !selected.size) return {added:0, errors:validation.errors||['No selected candidates.']};
  const cards=normalizeEvidenceCards(report);
  let added=0;
  for(const candidate of (preview.outputPreview.candidates||[])){
    if(!selected.has(String(candidate.id))) continue;
    cards.items.push(recordAiSuggestionOutput(report,candidate,convertCandidateToEvidenceCard(candidate, report),'evidence_card'));
    added++;
  }
  if(added) cards.updatedAt=new Date().toISOString();
  return {added, errors:[]};
}
function normalizeReport(r){r=clone(r); r.meta=r.meta||{}; r.datasets=Array.isArray(r.datasets)?r.datasets:[]; r.files=Array.isArray(r.files)?r.files:[]; r.charts=Array.isArray(r.charts)?r.charts:[]; r.tables=Array.isArray(r.tables)?r.tables:[]; r.companies=Array.isArray(r.companies)?r.companies:[]; normalizeReportSchema(r); normalizeMaterialsInventory(r); normalizeSourceRegistry(r); normalizeEvidenceCards(r); normalizeCompetitorProfiles(r); normalizePricingFeatureMatrix(r); normalizeAiAssistanceState(r); normalizeAiReviewQueue(r); normalizeAiAuditLog(r); normalizeVersionRetentionPolicy(r); normalizeGovernanceSettings(r); normalizeOnboardingState(r); normalizeFirstReportFlowState(r); r.ci=normalizeCiModel(r.ci); stripLiveMarkdownDerived(r); for(const ds of r.datasets){ds.id=ds.id||uid('ds'); ds.name=ds.name||'Таблиця'; ds.rows=Array.isArray(ds.rows)?ds.rows:[]; ds.columns=inferColumns(ds.rows);} syncCompaniesFromRows(r); for(const f of r.files){f.id=f.id||uid('file'); f.folder=f.folder||'Загальні'; f.path=f.path||((f.companyId?((company(f.companyId,r)?.folder||'company')+'/'):'')+f.name);} collectMaterialsFromCurrentState(r); buildSourcesFromMaterials(r); normalizeCompetitorProfiles(r); normalizePricingFeatureMatrix(r); return r;}
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
  collectMaterialsFromCurrentState(r);
  buildSourcesFromMaterials(r);
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
  collectMaterialsFromCurrentState(r);
  buildSourcesFromMaterials(r);
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
function initState(){REPORT.meta=REPORT.meta||{}; REPORT.meta.title=REPORT.meta.title||'Marketing Report Studio'; REPORT.meta.companyName=String(REPORT.meta.companyName||'').trim(); state.lang=REPORT.meta.lang || getSavedLang() || state.lang || 'uk'; REPORT.meta.lang=state.lang; const useCloudAccess=HOSTED_MODE&&!BROWSER_ONLY_MODE&&!cloudSync.localFallback; state.access=REPORT.meta.clientLocked?'viewer':(useCloudAccess?(cloudCanWrite()?'admin':'viewer'):(REPORT.meta.accessMode||state.access||'admin')); REPORT.meta.accessMode=state.access; app.dataset.access=state.access; const firstClient=(REPORT.companies||[]).find(c=>c.type==='client') || (REPORT.companies||[])[0]; state.activeCompany=REPORT.meta.activeCompany || firstClient?.id || null; state.compareA=REPORT.meta.compareA || firstClient?.id || (REPORT.companies||[])[0]?.id || null; state.compareB=REPORT.meta.compareB || (REPORT.companies||[]).find(c=>c.id!==state.compareA)?.id || null; state.openFolders=REPORT.meta.openFolders||{}; state.showCompare=!!REPORT.meta.showCompare; state.analyticsSite=REPORT.meta.analyticsSite||'all'; state.analyticsResearch=REPORT.meta.analyticsResearch||'all'; state.activeDataset=REPORT.meta.activeDataset || state.activeDataset || REPORT.datasets[0]?.id || null; applyLanguage();}
function renderReportTitle(){
  const titleEl=$('reportTitle');
  if(titleEl) titleEl.textContent=t('reportTitlePrefix');
  const subtitle=$('reportSubtitle');
  if(subtitle) subtitle.textContent=REPORT.meta?.isDemoReport?translateText('Demo report - fictional sample data'):t('reportSubtitle');
  const input=$('companyNameInput');
  if(input && input.value!==String(REPORT.meta?.companyName||'')) input.value=String(REPORT.meta?.companyName||'');
  document.title=t('reportTitlePrefix');
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
  collectMaterialsFromCurrentState(REPORT, state.fsRoots);
  buildSourcesFromMaterials(REPORT);
  REPORT.meta.activeCompany=state.activeCompany;
  REPORT.meta.compareA=state.compareA;
  REPORT.meta.compareB=state.compareB;
  REPORT.meta.openFolders=state.openFolders;
  REPORT.meta.showCompare=state.showCompare;
  REPORT.meta.analyticsSite=state.analyticsSite;
  REPORT.meta.analyticsResearch=state.analyticsResearch;
  REPORT.meta.activeDataset=state.activeDataset;
  REPORT.meta.lang=state.lang;
  app.dataset.access=state.access;
  schedulePersist();
  renderAnalytics();
  renderSide();
  renderReaderTabs();
  applyLanguage();
  const co=(REPORT.companies||[]).length;
  $('storageStat').textContent = t('storageStat', {datasets:REPORT.datasets.length, files:REPORT.files.length, folders:co});
  const rp=$('rolePill');
  if(rp) rp.textContent=isAdmin()?t('admin'):t('viewer');
  const unlock=$('unlockAdminBtn');
  if(unlock) unlock.classList.toggle('hidden',isClientLocked());
  const members=$('membersBtn');
  if(members) members.classList.toggle('hidden',cloudSync.role!=='owner');
}

function renderAnalytics(){
  state.widgetSnapshots={};
  if(!(REPORT.datasets||[]).length && !(REPORT.charts||[]).length && !(REPORT.tables||[]).length){
    analytics.innerHTML=renderFirstReportEmptyState()+`
      <div class="productHero">
        <div class="workflowSteps" aria-label="Product workflow">
          <div class="workflowStep"><span>1</span><b>${esc(t('workflowUploadMaterialsTitle'))}</b><small>${esc(t('workflowUploadMaterialsBody'))}</small></div>
          <div class="workflowStep"><span>2</span><b>${esc(t('workflowStructureTitle'))}</b><small>${esc(t('workflowStructureBody'))}</small></div>
          <div class="workflowStep"><span>3</span><b>${esc(t('workflowReviewEvidenceTitle'))}</b><small>${esc(t('workflowReviewEvidenceBody'))}</small></div>
          <div class="workflowStep"><span>4</span><b>${esc(t('workflowExportReportTitle'))}</b><small>${esc(t('workflowExportReportBody'))}</small></div>
        </div>
        <div class="productInfoGrid">
          <div class="infoBlock">
            <b>${esc(t('workflowBestFor'))}</b>
            <ul>
              <li>${esc(t('workflowBestForAgencies'))}</li>
              <li>${esc(t('workflowBestForCiTeams'))}</li>
              <li>${esc(t('workflowBestForConsultants'))}</li>
              <li>${esc(t('workflowBestForFounders'))}</li>
              <li>${esc(t('workflowBestForResearchTeams'))}</li>
            </ul>
          </div>
          <div class="infoBlock">
            <b>${esc(t('workflowClientReceives'))}</b>
            <ul>
              <li>${esc(t('workflowClientSummary'))}</li>
              <li>${esc(t('workflowClientComparison'))}</li>
              <li>${esc(t('workflowClientPricing'))}</li>
              <li>${esc(t('workflowClientCharts'))}</li>
              <li>${esc(t('workflowClientSources'))}</li>
              <li>${esc(t('workflowClientReport'))}</li>
            </ul>
          </div>
        </div>
      </div>`;
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
function competitorProfileWarnings(profile){
  const warnings=[];
  const sources=getCompetitorSources(REPORT,profile.id);
  if(sources.some(source=>['weak','unreviewed','needs_review'].includes(source.credibilityStatus))) warnings.push('Linked sources need credibility review.');
  if(getCompetitorEvidence(REPORT,profile.id).some(card=>!card.sourceIds?.length)) warnings.push('Some linked evidence has no source.');
  if(profile.reviewStatus==='approved') warnings.push('Approved profile status still requires source-backed report content.');
  return warnings;
}
function buildCompetitorProfileSummaryBlock(reportData, competitorId){
  const profile=getCompetitorProfileById(reportData,competitorId);
  if(!profile) return null;
  const evidence=getCompetitorEvidence(reportData,competitorId).filter(card=>card.reviewStatus==='approved');
  const sources=getCompetitorSources(reportData,competitorId);
  const text=[profile.shortDescription,profile.positioning?`Positioning: ${profile.positioning}`:'',profile.pricingNotes?`Pricing notes: ${profile.pricingNotes}`:'',profile.featureNotes?`Feature notes: ${profile.featureNotes}`:'',profile.strengths?`Strengths: ${profile.strengths}`:'',profile.weaknesses?`Weaknesses: ${profile.weaknesses}`:''].filter(Boolean).join('\n');
  return normalizeDraftBlock({id:uid('draft'),type:'comparison_note',title:`Competitor profile: ${profile.name}`,text:text||`Draft competitor summary for ${profile.name}. Add source-backed notes before client export.`,sectionId:'competitors',evidenceCardIds:evidence.map(card=>card.id),sourceIds:sources.map(source=>source.id),generatedBy:'rule_based',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'needs_review',competitorId:profile.id,analystNotes:'Generated from competitor profile. Review before client export.'});
}
function addCompetitorProfileSummaryToDraft(reportData, competitorId){
  const block=buildCompetitorProfileSummaryBlock(reportData,competitorId);
  const section=getReportSection(reportData,'competitors');
  if(!block||!section) return null;
  section.blocks=Array.isArray(section.blocks)?section.blocks:[];
  section.blocks.push(block);
  section.status=section.status==='approved'?'approved':'draft';
  return block;
}
function renderCompetitorProfiles(){
  const profiles=normalizeCompetitorProfiles(REPORT).items||[];
  const active=profiles.filter(p=>p.status==='active'), archived=profiles.filter(p=>p.status==='archived'), needsReview=profiles.filter(p=>p.reviewStatus!=='approved'&&p.status==='active');
  const filters=['all','active','needs_review','high','archived'];
  const selected=filters.includes(state.competitorFilter)?state.competitorFilter:'all';
  state.competitorFilter=selected;
  const visible=profiles.filter(profile=>selected==='active'?profile.status==='active':selected==='needs_review'?(profile.status==='active'&&profile.reviewStatus!=='approved'):selected==='high'?(profile.status==='active'&&profile.priority==='high'):selected==='archived'?profile.status==='archived':true);
  const filterButtons=filters.map(filter=>`<button class="btn small ${selected===filter?'primary':''}" data-competitor-filter="${esc(filter)}">${esc(filter==='all'?t('all'):statusLabel(filter))}</button>`).join('');
  const rows=visible.slice(0,10).map(profile=>{
    const sourceCount=getCompetitorSources(REPORT,profile.id).length, evidenceCount=getCompetitorEvidence(REPORT,profile.id).length, warnings=competitorProfileWarnings(profile);
    return `<div class="materialRow"><div class="itemName">${esc(profile.name)}<div class="itemMeta">${esc(profile.website||t('noWebsite'))} - ${esc([profile.category,profile.market].filter(Boolean).join(' / ')||t('noCategory'))} - ${t('priorityLabel')} ${esc(priorityLabel(profile.priority))} - ${esc(statusLabel(profile.reviewStatus))} - ${esc(countLabel(sourceCount,'sourceSingular','sourcePlural'))} - ${esc(countLabel(evidenceCount,'evidenceCardSingular','evidenceCardPlural'))}</div>${warnings.length?`<div class="itemMeta warn">${esc(translateText(warnings[0]))}</div>`:''}</div><div class="materialFilters adminOnly"><button class="btn small" data-competitor-edit="${esc(profile.id)}">${esc(t('edit'))}</button><button class="btn small" data-competitor-summary="${esc(profile.id)}">${esc(t('addSummaryToDraft'))}</button>${profile.status==='archived'?'':`<button class="btn small ghost" data-competitor-archive="${esc(profile.id)}">${esc(t('archive'))}</button>`}</div></div>`;
  }).join('');
  return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('competitorProfilesTitle'))}</b><span class="pill">${esc(t('totalCount',{count:profiles.length}))}</span></div><div class="itemMeta">${esc(t('activeCount',{count:active.length}))} - ${esc(t('archivedCount',{count:archived.length}))} - ${esc(t('needsReviewCount',{count:needsReview.length}))}</div><div class="materialFilters">${filterButtons}<button class="btn small primary adminOnly" data-competitor-add="1">${esc(t('addCompetitor'))}</button></div>${rows||`<div class="empty">${esc(t('competitorProfilesEmpty'))}</div>`}</div>`;
}
function competitorProfileFormHtml(profile){
  normalizeReportSchema(REPORT); normalizeMaterialsInventory(REPORT); normalizeSourceRegistry(REPORT); normalizeEvidenceCards(REPORT);
  const selected=(arr,id)=>arr.includes(id)?'selected':'';
  const materialOptions=(REPORT.materialsInventory?.items||[]).map(item=>`<option value="${esc(item.id)}" ${selected(profile.linkedMaterialIds,item.id)}>${esc(item.name)} (${esc(item.type)})</option>`).join('');
  const sourceOptions=(REPORT.sourceRegistry?.items||[]).map(source=>`<option value="${esc(source.id)}" ${selected(profile.linkedSourceIds,source.id)}>${esc(source.title)} (${esc(source.credibilityStatus)})</option>`).join('');
  const evidenceOptions=(REPORT.evidenceCards?.items||[]).map(card=>`<option value="${esc(card.id)}" ${selected(profile.linkedEvidenceCardIds,card.id)}>${esc(evidenceTitle(card))} (${esc(card.reviewStatus)})</option>`).join('');
  const sectionOptions=(REPORT.reportSections||[]).map(section=>`<option value="${esc(section.id)}" ${selected(profile.linkedSectionIds,section.id)}>${esc(section.title)}</option>`).join('');
  return `<div class="formGrid"><div class="field"><label>Name *</label><input id="competitorName" value="${esc(profile.name)}" required></div><div class="field"><label>Website</label><input id="competitorWebsite" value="${esc(profile.website)}" placeholder="https://example.com"></div><div class="field"><label>Category</label><input id="competitorCategory" value="${esc(profile.category)}"></div><div class="field"><label>Market</label><input id="competitorMarket" value="${esc(profile.market)}"></div><div class="field full"><label>Short description</label><textarea id="competitorDescription" rows="2">${esc(profile.shortDescription)}</textarea></div><div class="field full"><label>Positioning</label><textarea id="competitorPositioning" rows="2">${esc(profile.positioning)}</textarea></div><div class="field full"><label>Pricing notes</label><textarea id="competitorPricing" rows="2">${esc(profile.pricingNotes)}</textarea></div><div class="field full"><label>Feature notes</label><textarea id="competitorFeatures" rows="2">${esc(profile.featureNotes)}</textarea></div><div class="field full"><label>Channels / content notes</label><textarea id="competitorChannels" rows="2">${esc(profile.channelNotes)}</textarea></div><div class="field"><label>Strengths</label><textarea id="competitorStrengths" rows="2">${esc(profile.strengths)}</textarea></div><div class="field"><label>Weaknesses</label><textarea id="competitorWeaknesses" rows="2">${esc(profile.weaknesses)}</textarea></div><div class="field"><label>Risks</label><textarea id="competitorRisks" rows="2">${esc(profile.risks)}</textarea></div><div class="field"><label>Opportunities</label><textarea id="competitorOpportunities" rows="2">${esc(profile.opportunities)}</textarea></div><div class="field"><label>Priority</label><select id="competitorPriority">${COMPETITOR_PRIORITY.map(v=>`<option value="${esc(v)}" ${profile.priority===v?'selected':''}>${esc(v)}</option>`).join('')}</select></div><div class="field"><label>Review status</label><select id="competitorReview">${COMPETITOR_REVIEW_STATUS.map(v=>`<option value="${esc(v)}" ${profile.reviewStatus===v?'selected':''}>${esc(v)}</option>`).join('')}</select></div><div class="field full"><label>Materials</label><select id="competitorMaterials" multiple size="4">${materialOptions||'<option disabled>No materials available</option>'}</select></div><div class="field full"><label>Sources</label><select id="competitorSources" multiple size="4">${sourceOptions||'<option disabled>No sources available</option>'}</select></div><div class="field full"><label>Evidence cards</label><select id="competitorEvidence" multiple size="4">${evidenceOptions||'<option disabled>No evidence cards available</option>'}</select></div><div class="field full"><label>Report sections</label><select id="competitorSections" multiple size="4">${sectionOptions}</select></div><div class="field full"><label>Analyst notes</label><textarea id="competitorNotes" rows="3">${esc(profile.analystNotes)}</textarea></div></div>`;
}
function readCompetitorProfileForm(existing){
  const selectedIds=id=>[...($(id)?.selectedOptions||[])].map(option=>option.value).filter(Boolean);
  return {...(existing||{}),name:String($('competitorName')?.value||'').trim(),website:String($('competitorWebsite')?.value||'').trim(),category:String($('competitorCategory')?.value||'').trim(),market:String($('competitorMarket')?.value||'').trim(),shortDescription:String($('competitorDescription')?.value||'').trim(),positioning:String($('competitorPositioning')?.value||'').trim(),pricingNotes:String($('competitorPricing')?.value||'').trim(),featureNotes:String($('competitorFeatures')?.value||'').trim(),channelNotes:String($('competitorChannels')?.value||'').trim(),strengths:String($('competitorStrengths')?.value||'').trim(),weaknesses:String($('competitorWeaknesses')?.value||'').trim(),risks:String($('competitorRisks')?.value||'').trim(),opportunities:String($('competitorOpportunities')?.value||'').trim(),priority:String($('competitorPriority')?.value||'medium'),reviewStatus:String($('competitorReview')?.value||'draft'),linkedMaterialIds:selectedIds('competitorMaterials'),linkedSourceIds:selectedIds('competitorSources'),linkedEvidenceCardIds:selectedIds('competitorEvidence'),linkedSectionIds:selectedIds('competitorSections'),analystNotes:String($('competitorNotes')?.value||'').trim(),updatedAt:new Date().toISOString()};
}
function openCompetitorProfileModal(profileId){
  if(!guardAdmin()) return;
  const existing=profileId?getCompetitorProfileById(REPORT,profileId):null;
  const profile=existing?normalizeCompetitorProfileItem(existing):createCompetitorProfile({name:'New competitor',linkedSectionIds:['competitiveLandscape','competitors','pricing','features','messaging','channels','risksOpportunities','recommendations']});
  openModal(existing?'Edit competitor profile':'Add competitor profile',competitorProfileFormHtml(profile),'<button class="btn" id="cancelCompetitorProfile">Cancel</button><button class="btn primary" id="saveCompetitorProfile">Save competitor</button>');
  $('cancelCompetitorProfile').onclick=closeModal;
  $('saveCompetitorProfile').onclick=()=>{try{const next=readCompetitorProfileForm(existing||profile); if(!next.name){toast('Competitor name is required.'); return;} const profiles=normalizeCompetitorProfiles(REPORT); let saved=existing?updateCompetitorProfile(REPORT,existing.id,next):null; if(!saved){saved=createCompetitorProfile(next); profiles.items.push(saved); profiles.updatedAt=new Date().toISOString(); ensureCompany(saved.name,'competitor',REPORT);} for(const id of saved.linkedSourceIds) linkCompetitorToSource(REPORT,saved.id,id); for(const id of saved.linkedEvidenceCardIds) linkCompetitorToEvidence(REPORT,saved.id,id); for(const id of saved.linkedMaterialIds) linkCompetitorToMaterial(REPORT,saved.id,id); markFirstReportStepComplete(REPORT,'addCompetitors'); closeModal(); refresh(); toast('Competitor profile saved');}catch(err){toast(err.message||'Could not save competitor profile');}};
}
function matrixCompanyLabel(id){
  if(!id) return 'Client';
  const profile=getCompetitorProfileById(REPORT,id);
  if(profile) return profile.name+(profile.status==='archived'?' (archived)':'');
  return company(id)?.name||'Missing competitor';
}
function matrixCellBadge(status){return status==='yes'?'good':(status==='partial'?'warn':(status==='no'?'danger':''));}
function buildPricingFeatureMatrixSummaryBlock(reportData){
  const matrix=normalizePricingFeatureMatrix(reportData);
  const coverage=getMatrixEvidenceCoverage(reportData);
  const rows=matrix.featureRows.slice(0,6).map(row=>{
    const cells=matrix.competitorIds.map(id=>getMatrixCell(reportData,row.id,id)).filter(Boolean);
    const known=cells.filter(cell=>cell.availabilityStatus!=='unknown').length;
    return `${row.featureName}: ${known}/${Math.max(1,matrix.competitorIds.length)} competitor cells have known values.`;
  });
  const sourceIds=[...new Set([...(matrix.featureRows||[]).flatMap(row=>row.sourceIds||[]),...(matrix.matrixCells||[]).flatMap(cell=>cell.sourceIds||[])])];
  const evidenceCardIds=[...new Set([...(matrix.featureRows||[]).flatMap(row=>row.evidenceCardIds||[]),...(matrix.matrixCells||[]).flatMap(cell=>cell.evidenceCardIds||[])])].filter(id=>getEvidenceCardById(reportData,id)?.reviewStatus!=='rejected');
  return normalizeDraftBlock({id:uid('draft'),type:'comparison_note',title:'Pricing & feature matrix summary',text:[`Matrix coverage: ${coverage.score}% of cells have at least one source or non-rejected evidence link.`,...rows,'Unknown cells are missing data, not proof that a feature is absent.'].join('\n'),sectionId:'pricing',evidenceCardIds,sourceIds,generatedBy:'rule_based',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'needs_review',analystNotes:'Generated from pricing/feature matrix. Review before client export.'});
}
function addPricingFeatureMatrixSummaryToDraft(reportData){
  const block=buildPricingFeatureMatrixSummaryBlock(reportData);
  const section=getReportSection(reportData,'pricing')||getReportSection(reportData,'features');
  if(!section) return null;
  section.blocks=Array.isArray(section.blocks)?section.blocks:[];
  section.blocks.push(block);
  section.status=section.status==='approved'?'approved':'draft';
  return block;
}
function renderPricingFeatureMatrix(){
  const matrix=normalizePricingFeatureMatrix(REPORT), coverage=getMatrixEvidenceCoverage(REPORT), needing=getMatrixCellsNeedingReview(REPORT);
  const filters=['all','pricing','core_product','integrations','reporting','security','needs_review','missing_sources'];
  const selected=filters.includes(state.matrixFilter)?state.matrixFilter:'all';
  state.matrixFilter=selected;
  const filterButtons=filters.map(filter=>{
    const label=filter==='all'?t('allRows'):(filter==='needs_review'?t('needsReview'):(filter==='missing_sources'?t('missingSources'):featureCategoryLabel(filter)));
    return `<button class="btn small ${selected===filter?'primary':''}" data-matrix-filter="${esc(filter)}">${esc(label)}</button>`;
  }).join('');
  const competitorIds=matrix.competitorIds.slice(0,5);
  const rows=matrix.featureRows.filter(row=>selected==='all'?true:selected==='needs_review'?matrix.matrixCells.some(cell=>cell.rowId===row.id&&cell.reviewStatus!=='approved'):selected==='missing_sources'?matrix.matrixCells.some(cell=>cell.rowId===row.id&&!cell.sourceIds.length&&!cell.evidenceCardIds.length):row.category===selected).slice(0,8);
  const header=[t('featurePricing'),...competitorIds.map(matrixCompanyLabel)].map(h=>`<th>${esc(h)}</th>`).join('');
  const body=rows.map(row=>`<tr><td><b>${esc(row.featureName)}</b><div class="itemMeta">${esc(featureCategoryLabel(row.category))} - ${t('importanceLabel')} ${esc(priorityLabel(row.importance))}</div></td>${competitorIds.map(id=>{const cell=getMatrixCell(REPORT,row.id,id)||normalizeMatrixCell({rowId:row.id,competitorId:id}); const warn=cell.reviewStatus!=='approved'||(!cell.sourceIds.length&&!cell.evidenceCardIds.length); return `<td><button class="btn small ${matrixCellBadge(cell.availabilityStatus)} adminOnly" data-matrix-cell="${esc(row.id)}" data-company="${esc(id)}">${esc(cell.value||statusLabel(cell.availabilityStatus)||t('statusUnknown'))}</button><div class="itemMeta ${warn?'warn':''}">${esc(statusLabel(cell.reviewStatus))} - ${cell.sourceIds.length} ${t('srcAbbr')} / ${cell.evidenceCardIds.length} ${t('evAbbr')}</div></td>`;}).join('')}</tr>`).join('');
  const tierRows=matrix.pricingTiers.slice(0,5).map(tier=>`<div class="materialRow"><div class="itemName">${esc(matrixCompanyLabel(tier.competitorId||tier.companyId))}: ${esc(tier.tierName||t('untitledTier'))}<div class="itemMeta">${esc(tier.priceLabel||[tier.priceAmount,tier.priceCurrency,tier.pricePeriod].filter(Boolean).join(' '))} - ${t('publicPricing')} ${esc(statusLabel(tier.publicPricingAvailable))} - ${esc(countLabel(tier.sourceIds.length,'sourceSingular','sourcePlural'))}</div></div></div>`).join('');
  return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('pricingFeatureMatrixTitle'))}</b><span class="pill">${esc(t('coverageLabel',{score:coverage.score}))}</span></div><div class="itemMeta">${esc(t('competitorsCount',{count:matrix.competitorIds.length}))} - ${esc(t('pricingTiersCount',{count:matrix.pricingTiers.length}))} - ${esc(t('featureRowsCount',{count:matrix.featureRows.length}))} - ${esc(t('cellsNeedingReviewCount',{count:needing.length}))}</div><div class="materialFilters">${filterButtons}</div><div class="materialFilters adminOnly"><button class="btn small primary" data-matrix-add-competitor="1">${esc(t('addCompetitorToMatrix'))}</button><button class="btn small" data-matrix-add-tier="1">${esc(t('addPricingTier'))}</button><button class="btn small" data-matrix-add-row="1">${esc(t('addFeatureRow'))}</button><button class="btn small" data-matrix-summary="1">${esc(t('addMatrixSummaryToDraft'))}</button></div>${tierRows}<div style="overflow:auto"><table class="previewTable"><thead><tr>${header}</tr></thead><tbody>${body||`<tr><td colspan="6">${esc(t('noMatrixRowsYet'))}</td></tr>`}</tbody></table></div></div>`;
}
function openMatrixCompetitorModal(){
  if(!guardAdmin()) return;
  const matrix=normalizePricingFeatureMatrix(REPORT);
  const options=(normalizeCompetitorProfiles(REPORT).items||[]).filter(p=>p.status==='active'&&!matrix.competitorIds.includes(p.id)).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  openModal('Add competitor to matrix',`<div class="formGrid"><div class="field full"><label>Competitor</label><select id="matrixCompetitor">${options||'<option disabled>No active competitors available</option>'}</select></div></div>`,'<button class="btn" id="cancelMatrixCompetitor">Cancel</button><button class="btn primary" id="saveMatrixCompetitor">Add competitor</button>');
  $('cancelMatrixCompetitor').onclick=closeModal;
  $('saveMatrixCompetitor').onclick=()=>{const id=$('matrixCompetitor')?.value||''; if(id) addMatrixCompetitor(REPORT,id); closeModal(); refresh(); toast(id?'Competitor added to matrix':'No competitor selected');};
}
function openMatrixFeatureRowModal(rowId){
  if(!guardAdmin()) return;
  const row=normalizePricingFeatureMatrix(REPORT).featureRows.find(item=>item.id===rowId)||normalizeFeatureRow({featureName:'',category:'core_product'});
  openModal(rowId?'Edit feature row':'Add feature row',`<div class="formGrid"><div class="field"><label>Feature name *</label><input id="matrixFeatureName" value="${esc(row.featureName)}"></div><div class="field"><label>Category</label><select id="matrixFeatureCategory">${FEATURE_CATEGORIES.map(c=>`<option value="${esc(c)}" ${row.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="field"><label>Importance</label><select id="matrixFeatureImportance">${COMPETITOR_PRIORITY.map(v=>`<option value="${esc(v)}" ${row.importance===v?'selected':''}>${esc(v)}</option>`).join('')}</select></div><div class="field full"><label>Description</label><textarea id="matrixFeatureDescription" rows="3">${esc(row.description)}</textarea></div></div>`,'<button class="btn" id="cancelMatrixRow">Cancel</button><button class="btn primary" id="saveMatrixRow">Save row</button>');
  $('cancelMatrixRow').onclick=closeModal;
  $('saveMatrixRow').onclick=()=>{try{const patch={featureName:$('matrixFeatureName')?.value||'',category:$('matrixFeatureCategory')?.value||'other',importance:$('matrixFeatureImportance')?.value||'medium',description:$('matrixFeatureDescription')?.value||''}; if(rowId) updateFeatureRow(REPORT,rowId,patch); else addFeatureRow(REPORT,patch); closeModal(); refresh(); toast('Matrix row saved');}catch(e){toast(e.message||'Could not save row');}};
}
function openMatrixPricingTierModal(){
  if(!guardAdmin()) return;
  const matrix=normalizePricingFeatureMatrix(REPORT);
  const companies=matrix.competitorIds.map(id=>`<option value="${esc(id)}">${esc(matrixCompanyLabel(id))}</option>`).join('');
  openModal('Add pricing tier',`<div class="formGrid"><div class="field"><label>Company</label><select id="tierCompany">${companies}</select></div><div class="field"><label>Tier name</label><input id="tierName"></div><div class="field"><label>Price amount</label><input id="tierAmount" placeholder="Unknown if blank"></div><div class="field"><label>Currency</label><input id="tierCurrency" value="USD"></div><div class="field"><label>Period</label><select id="tierPeriod">${PRICE_PERIODS.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')}</select></div><div class="field"><label>Public pricing</label><select id="tierPublic">${PUBLIC_PRICING_STATUS.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')}</select></div><div class="field full"><label>Billing notes</label><textarea id="tierNotes" rows="3"></textarea></div></div>`,'<button class="btn" id="cancelTier">Cancel</button><button class="btn primary" id="saveTier">Save tier</button>');
  $('cancelTier').onclick=closeModal;
  $('saveTier').onclick=()=>{addPricingTier(REPORT,{competitorId:$('tierCompany')?.value||'',tierName:$('tierName')?.value||'',priceAmount:$('tierAmount')?.value||'',priceCurrency:$('tierCurrency')?.value||'',pricePeriod:$('tierPeriod')?.value||'unknown',publicPricingAvailable:$('tierPublic')?.value||'unknown',billingNotes:$('tierNotes')?.value||'',reviewStatus:'needs_review'}); closeModal(); refresh(); toast('Pricing tier added');};
}
function openMatrixCellModal(rowId,companyId){
  if(!guardAdmin()) return;
  const cell=getMatrixCell(REPORT,rowId,companyId)||normalizeMatrixCell({rowId,competitorId:companyId,companyId});
  const sourceOptions=(REPORT.sourceRegistry?.items||[]).map(s=>`<option value="${esc(s.id)}" ${(cell.sourceIds||[]).includes(s.id)?'selected':''}>${esc(s.title)} (${esc(s.credibilityStatus)})</option>`).join('');
  const evidenceOptions=(REPORT.evidenceCards?.items||[]).map(card=>`<option value="${esc(card.id)}" ${(cell.evidenceCardIds||[]).includes(card.id)?'selected':''}>${esc(evidenceTitle(card))} (${esc(card.reviewStatus)})</option>`).join('');
  const warning=(!cell.sourceIds.length&&!cell.evidenceCardIds.length)?'<div class="empty">This cell has no evidence yet.</div>':'';
  openModal('Edit matrix cell',`<div class="formGrid">${warning}<div class="field"><label>Availability</label><select id="cellAvailability">${MATRIX_AVAILABILITY_STATUS.map(s=>`<option value="${esc(s)}" ${cell.availabilityStatus===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div><div class="field"><label>Value</label><input id="cellValue" value="${esc(cell.value)}"></div><div class="field full"><label>Notes</label><textarea id="cellNotes" rows="3">${esc(cell.notes)}</textarea></div><div class="field full"><label>Sources</label><select id="cellSources" multiple size="4">${sourceOptions||'<option disabled>No sources available</option>'}</select></div><div class="field full"><label>Evidence</label><select id="cellEvidence" multiple size="4">${evidenceOptions||'<option disabled>No evidence available</option>'}</select></div><div class="field"><label>Confidence</label><select id="cellConfidence">${EVIDENCE_CONFIDENCE_STATUS.map(s=>`<option value="${esc(s)}" ${cell.confidenceStatus===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div><div class="field"><label>Review</label><select id="cellReview">${COMPETITOR_REVIEW_STATUS.map(s=>`<option value="${esc(s)}" ${cell.reviewStatus===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div></div>`,'<button class="btn" id="cancelCell">Cancel</button><button class="btn primary" id="saveCell">Save cell</button>');
  $('cancelCell').onclick=closeModal;
  $('saveCell').onclick=()=>{const ids=id=>[...($(id)?.selectedOptions||[])].map(o=>o.value).filter(Boolean); updateMatrixCell(REPORT,rowId,companyId,{availabilityStatus:$('cellAvailability')?.value||'unknown',value:$('cellValue')?.value||'',normalizedValue:$('cellAvailability')?.value||'unknown',notes:$('cellNotes')?.value||'',sourceIds:ids('cellSources'),evidenceCardIds:ids('cellEvidence'),confidenceStatus:$('cellConfidence')?.value||'unknown',reviewStatus:$('cellReview')?.value||'draft',lastReviewedAt:new Date().toISOString()}); closeModal(); refresh(); toast('Matrix cell saved');};
}
function materialTypeLabel(type){
  const key=String(type||'unknown');
  return ({
    spreadsheet:t('typeSpreadsheet'),
    image:t('typeImage'),
    text:t('typeText'),
    unknown:t('typeUnknown')
  })[key]||key.toUpperCase();
}
function materialLinkedLabel(item){
  if(item.linkedCompanyId){
    const co=company(item.linkedCompanyId);
    return co?.name||t('linkedCompany');
  }
  if(item.linkedSectionId){
    const section=getReportSection(REPORT,item.linkedSectionId);
    return section?.title||t('reportSection');
  }
  return t('notLinked');
}
function renderMaterialsInventory(){
  const inv=normalizeMaterialsInventory(REPORT);
  const items=inv.items||[];
  const counts=new Map();
  for(const item of items) counts.set(item.type,(counts.get(item.type)||0)+1);
  const types=[...counts.keys()].sort();
  const selected=types.includes(state.materialType)?state.materialType:'all';
  state.materialType=selected;
  const visible=selected==='all'?items:items.filter(item=>item.type===selected);
  const filterButtons=[
    `<button class="btn small ${selected==='all'?'primary':''}" data-material-filter="all">${esc(t('all'))}</button>`,
    ...types.map(type=>`<button class="btn small ${selected===type?'primary':''}" data-material-filter="${esc(type)}">${esc(materialTypeLabel(type))} (${counts.get(type)})</button>`)
  ].join('');
  if(!items.length){
    return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('materialsInventoryTitle'))}</b><span class="pill">0</span></div><div class="empty">${esc(t('materialsInventoryEmpty'))}</div></div>`;
  }
  const rows=visible.slice(0,12).map(item=>`
    <div class="materialRow">
      <div class="itemName">${esc(item.name)}<div class="itemMeta">${esc(materialTypeLabel(item.type))} · ${esc(statusLabel(item.status))} · ${esc(item.sizeLabel)} · ${esc(materialLinkedLabel(item))}</div></div>
    </div>`).join('');
  const more=visible.length>12?`<div class="tiny">${esc(t('showingMaterials',{count:visible.length}))}</div>`:'';
  return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('materialsInventoryTitle'))}</b><span class="pill">${esc(t('totalCount',{count:items.length}))}</span></div><div class="materialFilters">${filterButtons}</div>${rows}${more}</div>`;
}
function sourceTypeLabel(type){return String(type||'unknown').replace(/_/g,' ');}
function sourceSectionCountLabel(source){
  const count=(source.linkedSectionIds||[]).length;
  return t('sectionsCount',{count});
}
function renderSourceRegistry(){
  const registry=normalizeSourceRegistry(REPORT);
  const sources=registry.items||[];
  if(!sources.length){
    return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('sourceRegistryTitle'))}</b><span class="pill">0</span></div><button class="btn small adminOnly" data-source-refresh="1">${esc(t('refreshSourcesFromMaterials'))}</button><div class="empty">${esc(t('sourceRegistryEmpty'))}</div></div>`;
  }
  const rows=sources.slice(0,10).map(source=>`
    <div class="materialRow">
      <div class="itemName">${esc(source.title)}<div class="itemMeta">${esc(sourceTypeLabel(source.sourceType))} - ${esc(sourceSectionCountLabel(source))} - ${t('evidenceLabel')}: ${esc(statusLabel(source.evidenceStatus))} - ${t('credibilityLabel')}: ${esc(statusLabel(source.credibilityStatus))}</div></div>
    </div>`).join('');
  const more=sources.length>10?`<div class="tiny">${esc(t('showingSources',{count:sources.length}))}</div>`:'';
  return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('sourceRegistryTitle'))}</b><span class="pill">${esc(t('totalCount',{count:sources.length}))}</span></div><button class="btn small adminOnly" data-source-refresh="1">${esc(t('refreshSourcesFromMaterials'))}</button>${rows}${more}</div>`;
}
function evidenceSectionLabel(card){
  if(!card.sectionId) return t('unlinkedSection');
  const section=getReportSection(REPORT,card.sectionId);
  return section?.title||t('missingSection');
}
function evidenceTitle(card){
  return card.claim||card.summary||t('untitledEvidenceCard');
}
function renderEvidenceCards(){
  const cards=normalizeEvidenceCards(REPORT).items||[];
  if(!cards.length){
    return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('evidenceCardsTitle'))}</b><span class="pill">0</span></div><button class="btn small adminOnly" data-evidence-add="1">${esc(t('addEvidenceCard'))}</button><div class="empty">${esc(t('evidenceCardsEmpty'))}</div></div>`;
  }
  const rows=cards.slice(0,10).map(card=>`
    <div class="materialRow">
      <div class="itemName">${esc(evidenceTitle(card))}<div class="itemMeta">${esc(evidenceSectionLabel(card))} - ${esc(countLabel((card.sourceIds||[]).length,'sourceSingular','sourcePlural'))} - ${esc(statusLabel(card.reviewStatus))} - ${t('confidenceLabel')}: ${esc(statusLabel(card.confidenceStatus))}</div></div>
      <button class="btn small ghost adminOnly" data-evidence-edit="${esc(card.id)}">${esc(t('edit'))}</button>
    </div>`).join('');
  const more=cards.length>10?`<div class="tiny">${esc(t('showingEvidenceCards',{count:cards.length}))}</div>`:'';
  return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('evidenceCardsTitle'))}</b><span class="pill">${esc(t('totalCount',{count:cards.length}))}</span></div><button class="btn small adminOnly" data-evidence-add="1">${esc(t('addEvidenceCard'))}</button>${rows}${more}</div>`;
}
function evidenceReviewCounts(cards){
  const counts={draft:0,needs_review:0,approved:0,rejected:0};
  for(const card of cards) if(Object.prototype.hasOwnProperty.call(counts,card.reviewStatus)) counts[card.reviewStatus]++;
  return counts;
}
function renderEvidenceReview(){
  const cards=normalizeEvidenceCards(REPORT).items||[];
  const counts=evidenceReviewCounts(cards);
  const filters=['all','draft','needs_review','approved','rejected'];
  const selected=filters.includes(state.reviewFilter)?state.reviewFilter:'all';
  state.reviewFilter=selected;
  const visible=getEvidenceCardsForReview(REPORT,{reviewStatus:selected}).slice(0,8);
  const filterButtons=filters.map(filter=>{
    const label=filter==='all'?t('all'):statusLabel(filter);
    const count=filter==='all'?cards.length:counts[filter];
    return `<button class="btn small ${selected===filter?'primary':''}" data-review-filter="${esc(filter)}">${esc(label)} (${count})</button>`;
  }).join('');
  const summary=`<div class="itemMeta">${esc(t('approvedCount',{count:counts.approved}))} - ${esc(t('needsReviewCount',{count:counts.needs_review}))} - ${esc(t('rejectedCount',{count:counts.rejected}))} - ${esc(t('draftCount',{count:counts.draft}))}</div>`;
  if(!cards.length){
    return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('evidenceReviewTitle'))}</b><span class="pill">0</span></div>${summary}<div class="materialFilters">${filterButtons}</div><div class="empty">${esc(t('evidenceCardsEmpty'))}</div></div>`;
  }
  const rows=visible.map(card=>`
    <div class="materialRow">
      <div class="itemName">${esc(evidenceTitle(card))}<div class="itemMeta">${esc(evidenceSectionLabel(card))} - ${esc(countLabel((card.sourceIds||[]).length,'sourceSingular','sourcePlural'))} - ${t('credibilityLabel')}: ${esc(statusLabel(card.credibilityStatus))} - ${t('confidenceLabel')}: ${esc(statusLabel(card.confidenceStatus))} - ${esc(statusLabel(card.reviewStatus))}</div></div>
      <div class="materialFilters adminOnly">
        <button class="btn small ${card.reviewStatus==='approved'?'primary':''}" data-review-status="approved" data-id="${esc(card.id)}">${esc(t('approve'))}</button>
        <button class="btn small ${card.reviewStatus==='needs_review'?'primary':''}" data-review-status="needs_review" data-id="${esc(card.id)}">${esc(t('needsReview'))}</button>
        <button class="btn small danger ${card.reviewStatus==='rejected'?'primary':''}" data-review-status="rejected" data-id="${esc(card.id)}">${esc(t('reject'))}</button>
        <button class="btn small ghost" data-review-save="${esc(card.id)}">${esc(t('saveNotes'))}</button>
      </div>
      <textarea class="reviewNotes adminOnly" data-review-notes="${esc(card.id)}" rows="2" placeholder="${esc(t('reviewNotesPlaceholder'))}">${esc(card.reviewStatus==='rejected'?(card.rejectionReason||card.reviewNotes):card.reviewNotes)}</textarea>
    </div>`).join('');
  const more=getEvidenceCardsForReview(REPORT,{reviewStatus:selected}).length>8?`<div class="tiny">${esc(t('showingFilteredEvidenceCards'))}</div>`:'';
  return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('evidenceReviewTitle'))}</b><span class="pill">${esc(t('totalCount',{count:cards.length}))}</span></div>${summary}<div class="materialFilters">${filterButtons}</div>${rows}${more}<div class="itemMeta">${esc(t('approvedCardsReady',{count:counts.approved}))}</div></div>`;
}
function generatedDraftBlocks(section){
  return (section?.blocks||[]).filter(block=>String(block?.generatedBy||'')==='rule_based');
}
function renderDraftBuilder(){
  const approved=getApprovedEvidenceCards(REPORT);
  const sections=(normalizeReportSchema(REPORT).reportSections||[])
    .map(section=>({section,blocks:generatedDraftBlocks(section)}))
    .filter(entry=>entry.blocks.length);
  const totalBlocks=sections.reduce((sum,entry)=>sum+entry.blocks.length,0);
  const actions=`<div class="materialFilters adminOnly"><button class="btn small primary" data-draft-build="1">${esc(t('buildDraftFromEvidence'))}</button><button class="btn small ghost" data-draft-clear="1">${esc(t('clearGeneratedDraft'))}</button></div>`;
  if(!approved.length && !totalBlocks){
    return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('draftBuilderTitle'))}</b><span class="pill">${esc(t('blocksCount',{count:0}))}</span></div>${actions}<div class="empty">${esc(t('approveEvidenceFirst'))}</div></div>`;
  }
  const rows=sections.map(({section,blocks})=>{
    const evidenceIds=new Set(blocks.flatMap(block=>block.evidenceCardIds||[]));
    const preview=blocks.map(block=>block.text).filter(Boolean).join(' ').slice(0,160);
    return `<div class="materialRow"><div class="itemName">${esc(section.title)}<div class="itemMeta">${esc(t('generatedBlocksCount',{blocks:blocks.length}))} - ${esc(t('evidenceCardsCount',{count:evidenceIds.size}))}</div><div class="itemMeta">${esc(preview||t('draftBlockNoPreview'))}</div></div></div>`;
  }).join('');
  const emptyPreview=rows||`<div class="empty">${esc(t('noGeneratedDraftBlocks'))}</div>`;
  return `<div class="materialsInventory"><div class="materialsHead"><b>${esc(t('draftBuilderTitle'))}</b><span class="pill">${esc(t('blocksCount',{count:totalBlocks}))}</span></div>${actions}<div class="itemMeta">${esc(t('approvedEvidenceAvailable',{count:approved.length}))}</div>${emptyPreview}</div>`;
}
function readinessLabel(status){
  if(status==='ready') return t('ready');
  if(status==='needs_review') return t('needsReview');
  return t('blocked');
}
function renderChecklistItems(items){
  return items.slice(0,8).map(item=>`
    <div class="materialRow">
      <div class="itemName">${esc(item.message)}<div class="itemMeta">${esc(item.category)} - ${esc(item.severity)}</div></div>
    </div>`).join('');
}
function renderReportQualityChecklist(){
  const result=mergeCoveragePreviewWithQualityChecklist(REPORT,latestAiSourceCoveragePreview(REPORT));
  const priority=[...result.blockers,...result.warnings,...result.passed];
  return `<div class="materialsInventory">
    <div class="materialsHead"><b>${esc(t('exportReadinessTitle'))}</b><span class="pill">${esc(readinessLabel(result.status))}</span></div>
    <div class="itemMeta">${esc(t('completenessLabel'))} ${result.completenessScore}% - ${esc(t('evidenceLabel'))} ${result.evidenceScore}% - ${esc(t('sourcePlural'))} ${result.sourceCoverageScore}% - ${esc(t('clientSafetyLabel'))} ${esc(readinessLabel(result.clientSafetyStatus))}</div>
    <div class="itemMeta">${esc(t('blockersCount',{count:result.blockers.length}))} - ${esc(t('warningsCount',{count:result.warnings.length}))} - ${esc(t('passedCount',{count:result.passed.length}))}</div>
    ${renderChecklistItems(priority)}
  </div>`;
}
function getCurrentVersionDiff(){
  ensureVersionDiffBaselineReport();
  return diffReportVersions(VERSION_DIFF_BASELINE,createReportVersionSnapshot(REPORT));
}
function versionDiffRiskLabel(risk){return risk==='high'?'High risk':(risk==='medium'?'Medium risk':(risk==='low'?'Low risk':'Unknown risk'));}
function renderVersionDiffRows(diff,filter){
  const row=(title,meta)=>`<div class="materialRow"><div class="itemName">${esc(title)}<div class="itemMeta">${esc(meta)}</div></div></div>`;
  if(filter==='sections') return (diff.sectionChanges||[]).slice(0,8).map(item=>row(item.sectionTitle||item.sectionId,`${item.changeType} - status ${item.beforeStatus||'n/a'} -> ${item.afterStatus||'n/a'} - blocks +${item.blocksAdded}/-${item.blocksRemoved}/${item.blocksChanged} changed`)).join('');
  if(filter==='evidence') return (diff.evidenceChanges||[]).slice(0,8).map(item=>row(item.claim||item.evidenceCardId,`${item.changeType} - review ${item.beforeReviewStatus||'n/a'} -> ${item.afterReviewStatus||'n/a'} - sources ${(item.sourceIdsBefore||[]).length} -> ${(item.sourceIdsAfter||[]).length}${item.riskNotes?.length?' - '+item.riskNotes.join(' | '):''}`)).join('');
  if(filter==='sources') return (diff.sourceChanges||[]).slice(0,8).map(item=>row(item.title||item.sourceId,`${item.changeType} - credibility ${item.beforeCredibilityStatus||'n/a'} -> ${item.afterCredibilityStatus||'n/a'} - evidence ${item.beforeEvidenceStatus||'n/a'} -> ${item.afterEvidenceStatus||'n/a'}`)).join('');
  if(filter==='review') return (diff.reviewStatusChanges||[]).slice(0,8).map(item=>row(item.label||item.objectId,`${item.objectType} - ${item.statusBefore||'n/a'} -> ${item.statusAfter||'n/a'}${item.riskNotes?.length?' - '+item.riskNotes.join(' | '):''}`)).join('');
  if(filter==='ai') return (diff.aiSuggestionChanges||[]).slice(0,8).map(item=>row(item.title||item.suggestionId,`${item.suggestionType} - ${item.changeType} - ${item.beforeStatus||'n/a'} -> ${item.afterStatus||'n/a'}`)).join('');
  if(filter==='quality') return [
    ...diff.qualityChecklistChanges.blockersAdded.map(item=>row('Blocker added',item)),
    ...diff.qualityChecklistChanges.blockersResolved.map(item=>row('Blocker resolved',item)),
    ...diff.qualityChecklistChanges.warningsAdded.map(item=>row('Warning added',item)),
    ...diff.qualityChecklistChanges.warningsResolved.map(item=>row('Warning resolved',item))
  ].slice(0,8).join('');
  if(filter==='export') return row('Export readiness',`Can export ${diff.exportReadinessChanges.canExportBefore?'yes':'no'} -> ${diff.exportReadinessChanges.canExportAfter?'yes':'no'} - client safety ${diff.exportReadinessChanges.clientLockedSafetyBefore} -> ${diff.exportReadinessChanges.clientLockedSafetyAfter}`);
  return [
    ...renderVersionDiffRows(diff,'sections').split('</div></div></div>').filter(Boolean).map(x=>x+'</div></div></div>'),
    ...renderVersionDiffRows(diff,'evidence').split('</div></div></div>').filter(Boolean).map(x=>x+'</div></div></div>'),
    ...renderVersionDiffRows(diff,'sources').split('</div></div></div>').filter(Boolean).map(x=>x+'</div></div></div>'),
    ...renderVersionDiffRows(diff,'review').split('</div></div></div>').filter(Boolean).map(x=>x+'</div></div></div>')
  ].slice(0,8).join('');
}
function renderVersionDiffPanel(){
  if(isClientLocked()||!isAdmin()) return '';
  const diff=getCurrentVersionDiff();
  const c=diff.changedCounts;
  const filter=state.versionDiffFilter||'all';
  const filters=[['all','All changes'],['sections','Sections'],['evidence','Evidence'],['sources','Sources'],['review','Review statuses'],['ai','AI suggestions'],['quality','Quality checklist'],['export','Export readiness']]
    .map(([id,label])=>`<button class="btn small ${filter===id?'primary':''}" data-version-diff-filter="${esc(id)}">${esc(label)}</button>`).join('');
  const rows=renderVersionDiffRows(diff,filter);
  const highRisk=diff.riskLevel==='high'?`<div class="empty">High-risk changes detected. Review before client export.</div>`:'';
  return `<div class="materialsInventory">
    <div class="materialsHead"><b>Version Diff</b><span class="pill">${esc(versionDiffRiskLabel(diff.riskLevel))}</span></div>
    <div class="itemMeta">Comparing loaded/start snapshot to current report. Backend version comparison can be added later.</div>
    <div class="itemMeta">${esc(diff.summary)}</div>
    <div class="itemMeta">Sections ${c.sectionsAdded}/${c.sectionsRemoved}/${c.sectionsChanged} - Evidence ${c.evidenceAdded}/${c.evidenceRemoved}/${c.evidenceChanged} - Sources ${c.sourcesAdded}/${c.sourcesRemoved}/${c.sourcesChanged} - Status changes ${c.reviewStatusesChanged}</div>
    <div class="itemMeta">Readiness ${esc(diff.qualityChecklistChanges.readinessBefore)} -> ${esc(diff.qualityChecklistChanges.readinessAfter)} - Blockers +${c.blockersAdded}/-${c.blockersResolved} - Warnings +${c.warningsAdded}/-${c.warningsResolved}</div>
    ${highRisk}
    <div class="materialFilters">${filters}</div>
    <div class="materialFilters adminOnly"><button class="btn small danger" data-version-restore-preview="1">Restore selected version</button><button class="btn small" data-version-diff-copy="1">Copy diff summary</button><button class="btn small" data-version-diff-download="1">Download diff JSON</button><button class="btn small ghost" data-version-diff-baseline="1">Use current as baseline</button></div>
    ${rows||'<div class="empty">No changes in this category.</div>'}
  </div>`;
}
function retentionBadge(item){
  const labels=[];
  if(item.versionId===currentVersionLabel()) labels.push('Current');
  if(item.protected) labels.push('Protected');
  if(item.pinned) labels.push('Pinned');
  if(item.archived) labels.push('Archived');
  if(item.classification==='archive_candidate') labels.push('Archive candidate');
  if(item.classification==='cleanup_candidate') labels.push('Cleanup candidate');
  return labels.length?labels.join(' / '):'Unknown';
}
function renderVersionRetentionPanel(){
  if(isClientLocked()||!isAdmin()) return '';
  const versions=localReportVersionsForRetention(REPORT);
  const policy=normalizeVersionRetentionPolicy(REPORT);
  const preview=buildVersionCleanupPreview(REPORT,versions,policy);
  const rows=preview.versions.slice(0,8).map(item=>`
    <div class="materialRow">
      <div class="itemName">${esc(item.label||item.versionId)}
        <div class="itemMeta">${esc(retentionBadge(item))} - ${esc(item.versionId)} - ${esc((item.protectedReasons||[]).join(' | ')||'preview-only')}</div>
      </div>
      <div class="materialFilters adminOnly">
        ${item.pinned?`<button class="btn small" data-retention-unpin="${esc(item.versionId)}">Unpin</button>`:`<button class="btn small" data-retention-pin="${esc(item.versionId)}">Pin version</button>`}
      </div>
    </div>`).join('');
  return `<div class="materialsInventory">
    <div class="materialsHead"><b>Version Retention</b><span class="pill">${esc(policy.mode)}</span></div>
    <div class="itemMeta">Cleanup feature: ${VERSION_CLEANUP_ENABLED?'enabled':'disabled'} - Hard delete: disabled - Local version retention is limited because this report is stored in the current browser/session.</div>
    <div class="itemMeta">Total ${preview.totalVersions} - Protected ${preview.protectedVersions} - Pinned ${preview.pinnedVersions} - Archive candidates ${preview.archiveCandidates} - Cleanup candidates ${preview.cleanupCandidates}</div>
    <div class="empty">Cleanup is preview-only by default. No snapshots are deleted automatically.</div>
    <div class="materialFilters adminOnly"><button class="btn small" data-retention-preview="1">Preview cleanup</button></div>
    ${rows||'<div class="empty">No local version snapshots are available for retention preview.</div>'}
  </div>`;
}
function governanceBool(value){return value?'On':'Off';}
function governanceRow(label,value,warn=false){return `<div class="materialRow"><div class="itemName">${esc(label)}<div class="itemMeta ${warn?'warn':''}">${esc(value)}</div></div></div>`;}
function onboardingStepLabel(stepId){
  return ({
    welcome:'Welcome',
    workspaceBasics:'Workspace Basics',
    rolesAndAccess:'Roles and Access',
    exportSafety:'Export Safety',
    aiPolicy:'AI Policy',
    reviewPolicy:'Review Policy',
    versionRetention:'Version Retention',
    restorePolicy:'Restore Policy',
    demoReport:'Demo Report',
    finalChecklist:'Final Checklist'
  })[stepId]||'Workspace Setup';
}
function renderOnboardingSummaryPanel(){
  if(isClientLocked()||state.access==='viewer') return '';
  const progress=getOnboardingProgress(REPORT);
  const canRun=canCurrentUserRunOnboarding(REPORT);
  const status=progress.completed?'Complete':(progress.dismissed?'Skipped':'Not complete');
  const mode=BROWSER_ONLY_MODE||!cloudSync.ready?'Local setup':'Cloud workspace';
  const action=canRun?'<button class="btn small primary" data-open-onboarding="1">Open setup again</button>':'';
  return `<div class="materialRow">
    <div class="itemName">Workspace Setup<div class="itemMeta">${esc(status)} - ${progress.completedSteps}/${progress.totalSteps} steps - ${esc(mode)}</div></div>
    <div class="materialFilters adminOnly">${action}</div>
  </div>`;
}
function renderFirstReportGovernanceRow(){
  if(isClientLocked()||state.access==='viewer') return '';
  const progress=getFirstReportProgress(REPORT);
  const flow=normalizeFirstReportFlowState(REPORT);
  const status=flow.completed?'Complete':(flow.dismissed?'Hidden':'Active');
  return `<div class="materialRow">
    <div class="itemName">First Report Guide<div class="itemMeta">${esc(status)} - ${progress.completed}/${progress.total} steps - next: ${esc(firstReportStepLabel(progress.nextStepId))}</div></div>
    <div class="materialFilters adminOnly"><button class="btn small" data-first-report-show="1">Show guide again</button></div>
  </div>`;
}
function renderWorkspaceGovernancePanel(){
  if(isClientLocked()||state.access==='viewer') return '';
  const settings=getGovernanceSettings(REPORT);
  const validation=validateGovernanceSettings(settings);
  const summary=getGovernancePolicySummary(settings);
  const canManage=canCurrentUserManageGovernance(REPORT);
  const warnings=[...validation.blockers,...validation.warnings];
  const rows=[
    governanceRow('Export Safety',`${summary.exportSafety}; rejected evidence excluded: ${governanceBool(settings.exportPolicy.excludeRejectedEvidence)}`),
    governanceRow('AI Policy',`${summary.aiPolicy}; human review required: ${governanceBool(settings.aiPolicy.requireHumanReview)}`),
    governanceRow('Review Policy',`Source links for approved evidence: ${governanceBool(settings.reviewPolicy.requireSourceLinksForApprovedEvidence)}; rejected client content: ${governanceBool(settings.reviewPolicy.allowRejectedContentInClientExport)}`,settings.reviewPolicy.allowRejectedContentInClientExport),
    governanceRow('Version Retention',`${summary.retention}; hard delete: ${governanceBool(settings.retentionPolicy.allowHardDelete)}`,settings.retentionPolicy.allowHardDelete),
    governanceRow('Restore Policy',`${summary.restore}; expected current version: ${governanceBool(settings.restorePolicy.requireExpectedCurrentVersion)}`),
    governanceRow('Audit Visibility',`${summary.audit}; viewer audit visibility: ${governanceBool(settings.auditPolicy.allowViewerAuditVisibility)}`,settings.auditPolicy.allowViewerAuditVisibility),
    governanceRow('Permissions',`${summary.permissions}; viewer governance: ${governanceBool(settings.permissionsPolicy.viewerCanManageGovernance)}`,settings.permissionsPolicy.viewerCanManageGovernance)
  ].join('');
  const warningHtml=warnings.length?`<div class="empty">${esc(warnings.slice(0,3).join(' | '))}</div>`:'<div class="itemMeta">Governance settings are using safe defaults.</div>';
  const actions=canManage?'<div class="materialFilters adminOnly"><button class="btn small primary" data-governance-save="1">Save governance settings</button><button class="btn small ghost" data-governance-reset="1">Reset to safe defaults</button></div>':'<div class="itemMeta">Read-only: owner manages governance settings by default.</div>';
  return `<div class="materialsInventory">
    <div class="materialsHead"><b>Workspace Governance</b><span class="pill">${validation.ok?'Safe':'Needs review'}</span></div>
    <div class="itemMeta">Local governance settings apply only to this local report file. Server-side policy remains authoritative in cloud mode.</div>
    ${renderOnboardingSummaryPanel()}
    ${renderFirstReportGovernanceRow()}
    ${warningHtml}
    ${rows}
    ${actions}
  </div>`;
}
function onboardingModeLabel(){
  if(isClientLocked()) return 'clientLocked';
  if(cloudSync.ready) return `Cloud workspace (${cloudSync.role||'unknown role'})`;
  return 'Local-only report file/browser session';
}
function onboardingStepBody(stepId){
  const settings=getGovernanceSettings(REPORT);
  const checklist=runReportQualityChecklist(REPORT);
  const warnings=getOnboardingWarnings(REPORT,{});
  if(stepId==='welcome') return `<div class="hintBox"><b>Marketing Report Studio</b><br>Set up your workspace for safe client-ready marketing intelligence reports.</div><div class="materialFilters"><button class="btn primary" data-onboarding-next>Start setup</button><button class="btn" data-onboarding-demo>Open demo report</button><button class="btn ghost" data-onboarding-skip>Skip for now</button></div>`;
  if(stepId==='workspaceBasics') return `<div class="formGrid"><div class="field full"><label>Workspace name</label><input id="onboardingWorkspaceName" value="${esc(REPORT.meta?.workspaceName||'Marketing Report Studio Workspace')}"></div><div class="field full"><label>Default report title</label><input id="onboardingReportTitle" value="${esc(REPORT.meta?.title||'Marketing Report Studio')}"></div><div class="field"><label>Default client name</label><input id="onboardingClientName" value="${esc(REPORT.meta?.companyName||'')}"></div><div class="field"><label>Research language</label><input id="onboardingResearchLanguage" value="${esc(REPORT.meta?.lang||state.lang||'en')}"></div><div class="field full"><div class="hintBox">${esc(onboardingModeLabel())}. Local setup applies only to this standalone report file/browser session.</div></div></div>`;
  if(stepId==='rolesAndAccess') return `<div class="hintBox">Owner manages users and governance. Editor edits reports. Viewer is read-only.</div><div class="itemMeta">${cloudSync.ready?`Current member count is available in the existing Members panel when the API is enabled. Role: ${esc(cloudSync.role||'unknown')}.`:'Local mode has no server-side team access or Cloudflare Access enforcement.'}</div><div class="materialFilters">${cloudSync.role==='owner'?'<button class="btn small" id="onboardingMembersBtn">Open members</button>':''}</div>`;
  if(stepId==='exportSafety') return `<div class="hintBox">Safe client exports require quality review, block on blockers, exclude rejected evidence, exclude internal audit, exclude AI prompts, exclude secrets, and include source/evidence summaries plus print CSS.</div><div class="itemMeta">Current: blockers ${settings.exportPolicy.blockExportOnQualityBlockers?'blocked':'not blocked'}; secrets excluded ${settings.exportPolicy.excludeSecrets?'yes':'no'}.</div>`;
  if(stepId==='aiPolicy') return `<div class="hintBox">AI is disabled by default. Dry-run previews may be available, but real providers require server-side Worker secrets. Do not paste API keys into the browser.</div><div class="itemMeta">Human review required: ${settings.aiPolicy.requireHumanReview?'yes':'no'}; auto-approve: ${settings.aiPolicy.allowAutoApproveAiOutput?'unsafe':'disabled'}; clientLocked AI: ${settings.aiPolicy.allowClientLockedAiPreview?'unsafe':'disabled'}.</div>`;
  if(stepId==='reviewPolicy') return `<div class="hintBox">Draft builder output should use approved evidence, source links, and human review for AI suggestions. Rejected content stays out of client export.</div><div class="itemMeta">Approved-source links required: ${settings.reviewPolicy.requireSourceLinksForApprovedEvidence?'yes':'no'}; needs_review client export: ${settings.reviewPolicy.allowNeedsReviewContentInClientExport?'allowed by current policy':'blocked by setup defaults'}.</div>`;
  if(stepId==='versionRetention') return `<div class="hintBox">Retention remains preview-only. Keep all versions by default, keep at least 20 versions for 90 days, protect current/restore/client-export/audit-referenced versions, and keep hard delete disabled.</div><div class="itemMeta">Mode: ${esc(settings.retentionPolicy.mode)}; hard delete: disabled.</div>`;
  if(stepId==='restorePolicy') return `<div class="hintBox">Restore is safe-copy only: require diff, confirmation, strong confirmation for high risk, expected current version, and an audit event.</div><div class="itemMeta">Restore allowed: ${settings.restorePolicy.allowRestore?'yes':'no'}; expected current version: ${settings.restorePolicy.requireExpectedCurrentVersion?'required':'not required'}.</div>`;
  if(stepId==='demoReport') return `<div class="hintBox">Use fictional sample data to see the materials -> evidence -> report workflow, or keep the current workspace empty.</div><div class="materialFilters"><button class="btn small primary" data-onboarding-demo>Open demo report</button><button class="btn small" data-onboarding-next>Keep current workspace</button></div><div class="itemMeta">If the current report has data, demo loading asks for confirmation before replacing the in-memory workspace.</div>`;
  return `<div class="hintBox">Setup summary: export safety configured, AI policy safe, review policy safe, retention policy safe, restore policy safe, demo available, quality checklist available.</div><div class="itemMeta">Quality status: ${esc(checklist.status)} - blockers ${checklist.blockers.length} - warnings ${checklist.warnings.length}</div>${warnings.length?`<div class="empty">${esc(warnings.slice(0,5).join(' | '))}</div>`:'<div class="itemMeta">No setup warnings.</div>'}<div class="materialFilters"><button class="btn small primary" data-onboarding-first-report>Start guided first report</button><button class="btn small" data-governance-scroll>Go to Governance Settings</button><button class="btn small" data-onboarding-demo>Open demo report</button></div>`;
}
function readOnboardingSelections(){
  return {
    workspaceName:$('onboardingWorkspaceName')?.value||REPORT.meta?.workspaceName||'',
    reportTitle:$('onboardingReportTitle')?.value||REPORT.meta?.title||'',
    clientName:$('onboardingClientName')?.value||REPORT.meta?.companyName||'',
    researchLanguage:$('onboardingResearchLanguage')?.value||REPORT.meta?.lang||state.lang||'en'
  };
}
function openOnboardingWizard(stepId){
  if(isClientLocked()){toast('Workspace setup is unavailable in clientLocked mode.'); return;}
  const stateObj=normalizeOnboardingState(REPORT);
  const id=ONBOARDING_STEPS.includes(String(stepId||''))?String(stepId):stateObj.currentStepId||'welcome';
  stateObj.currentStepId=id;
  stateObj.updatedAt=new Date().toISOString();
  appendAiAuditEvent(REPORT,createAiAuditEvent(REPORT,{eventType:'workspace_onboarding_started',provider:'local',providerMode:'disabled',generatedBy:'manual',notes:`Opened onboarding step: ${id}`}));
  const idx=ONBOARDING_STEPS.indexOf(id);
  const canRun=canCurrentUserRunOnboarding(REPORT);
  const body=`<div class="itemMeta">Step ${idx+1} of ${ONBOARDING_STEPS.length} - ${esc(onboardingStepLabel(id))}</div>${onboardingStepBody(id)}${canRun?'<label class="checkLine"><input id="onboardingDoNotShow" type="checkbox"> Do not show again</label>':'<div class="itemMeta">Read-only summary: owner manages setup and governance by default.</div>'}`;
  const back=idx>0?'<button class="btn" id="onboardingBack">Back</button>':'';
  const next=idx<ONBOARDING_STEPS.length-1?'<button class="btn primary" id="onboardingNext">Next</button>':'<button class="btn primary" id="onboardingFinish">Finish setup</button>';
  const skip=canRun?'<button class="btn ghost" id="onboardingSkip">Skip</button>':'';
  openModal('Workspace Setup',body,`${back}${skip}${next}`);
  bindOnboardingWizard(id);
}
function bindOnboardingWizard(stepId){
  const idx=ONBOARDING_STEPS.indexOf(stepId);
  const go=nextId=>{openOnboardingWizard(nextId);};
  const saveBasics=()=>{if(stepId==='workspaceBasics') Object.assign(REPORT.meta,readOnboardingSelections());};
  $('onboardingBack')?.addEventListener('click',()=>go(ONBOARDING_STEPS[Math.max(0,idx-1)]));
  const next=()=>{saveBasics(); markOnboardingStepComplete(REPORT,stepId); schedulePersist(); go(ONBOARDING_STEPS[Math.min(ONBOARDING_STEPS.length-1,idx+1)]);};
  $('onboardingNext')?.addEventListener('click',next);
  $('modalBody')?.querySelectorAll('[data-onboarding-next]')?.forEach(btn=>btn.addEventListener('click',next));
  $('onboardingFinish')?.addEventListener('click',()=>{saveBasics(); const result=applyOnboardingSelections(REPORT,readOnboardingSelections()); if(!result.ok){toast(result.errors?.[0]||'Onboarding settings rejected'); return;} closeModal(); refresh(); persistNow(); toast('Workspace setup completed with safe defaults');});
  const skip=()=>{if(!canCurrentUserRunOnboarding(REPORT)){closeModal(); return;} const stateObj=normalizeOnboardingState(REPORT); stateObj.dismissed=true; stateObj.dismissedAt=new Date().toISOString(); stateObj.updatedAt=stateObj.dismissedAt; if($('onboardingDoNotShow')?.checked) stateObj.enabled=false; appendAiAuditEvent(REPORT,createAiAuditEvent(REPORT,{eventType:'workspace_onboarding_dismissed',provider:'local',providerMode:'disabled',generatedBy:'manual',notes:`Dismissed onboarding at step: ${stepId}`})); closeModal(); renderSide(); persistNow(); toast('Workspace setup skipped');};
  $('onboardingSkip')?.addEventListener('click',skip);
  $('modalBody')?.querySelectorAll('[data-onboarding-skip]')?.forEach(btn=>btn.addEventListener('click',skip));
  $('modalBody')?.querySelectorAll('[data-onboarding-demo]')?.forEach(btn=>btn.addEventListener('click',()=>{closeModal(); loadDemoReport();}));
  $('modalBody')?.querySelector('[data-onboarding-first-report]')?.addEventListener('click',()=>{const flow=normalizeFirstReportFlowState(REPORT); flow.enabled=true; flow.dismissed=false; flow.updatedAt=new Date().toISOString(); closeModal(); refresh(); performFirstReportAction(getNextRecommendedFirstReportStep(REPORT));});
  $('onboardingMembersBtn')?.addEventListener('click',()=>{closeModal(); openMembersModal();});
  $('modalBody')?.querySelector('[data-governance-scroll]')?.addEventListener('click',()=>{closeModal(); renderSide();});
}
function maybeOpenOnboardingWizard(){
  const stateObj=normalizeOnboardingState(REPORT);
  if(!stateObj.enabled||stateObj.completed||stateObj.dismissed||!stateObj.firstRunDetected) return;
  if(!canCurrentUserRunOnboarding(REPORT)) return;
  if(isClientLocked()||state.access==='viewer') return;
  setTimeout(()=>{if(!$('modalBackdrop')?.classList.contains('open')) openOnboardingWizard(stateObj.currentStepId||'welcome');},350);
}
function firstReportStatusClass(status){
  if(status==='completed') return 'good';
  if(status==='blocked') return 'warn';
  if(status==='skipped') return 'muted';
  if(status==='in_progress') return 'primary';
  return '';
}
function firstReportActionLabel(stepId){
  return ({
    createReport:t('firstReportNameReport'),
    addClientBasics:t('firstReportAddClient'),
    addCompetitors:t('firstReportAddCompetitors'),
    uploadMaterials:t('firstReportUploadMaterials'),
    reviewMaterialsInventory:t('firstReportReviewMaterials'),
    buildSourceRegistry:t('firstReportRefreshSources'),
    addEvidence:t('firstReportAddEvidence'),
    reviewEvidence:t('firstReportReviewEvidence'),
    buildDraft:t('firstReportBuildDraft'),
    runQualityChecklist:t('firstReportRunQualityChecklist'),
    exportClientReport:t('firstReportExportClientReport')
  })[stepId]||t('firstReportContinue');
}
function renderGuidedFirstReportPanel({hero=false}={}){
  if(!canShowFirstReportFlow(REPORT)) return '';
  const flow=normalizeFirstReportFlowState(REPORT);
  if(!flow.enabled||flow.dismissed) return '';
  const progress=getFirstReportProgress(REPORT);
  const next=progress.nextStepId;
  const rows=progress.steps.map(step=>{
    const warn=step.warnings?.[0]||'';
    return `<div class="materialRow">
      <div class="itemName">${esc(step.label)}<div class="itemMeta ${step.status==='blocked'?'warn':''}">${esc(step.status)}${warn?' - '+esc(warn):''}</div></div>
      <span class="pill ${firstReportStatusClass(step.status)}">${esc(step.status)}</span>
    </div>`;
  }).join('');
  const title=progress.isEmpty?t('firstReportTitleEmpty'):t('firstReportTitleContinue');
  const subtitle=progress.isEmpty?t('firstReportSubtitleEmpty'):t('firstReportSubtitleContinue');
  const demo=REPORT.meta?.isDemoReport?`<div class="empty">${esc(t('firstReportSampleData'))}</div>`:'';
  const localLabel=BROWSER_ONLY_MODE||!cloudSync.ready?`<div class="itemMeta">${esc(t('firstReportLocalOnly'))}</div>`:'';
  const primary=`<button class="btn small primary adminOnly" data-first-report-action="${esc(next)}">${esc(firstReportActionLabel(next))}</button>`;
  const secondary=`<button class="btn small adminOnly" data-first-report-upload="1">${esc(t('firstReportUploadMaterials'))}</button><button class="btn small adminOnly" data-open-demo>${esc(t('firstReportOpenDemo'))}</button><button class="btn small ghost adminOnly" data-first-report-skip="${esc(next)}">${esc(t('firstReportSkipStep'))}</button><button class="btn small ghost adminOnly" data-first-report-hide="1">${esc(t('firstReportHideGuide'))}</button>`;
  const extra=hero?`<div class="materialFilters adminOnly"><button class="btn small" data-first-report-action="createReport">${esc(t('firstReportStartGuided'))}</button><button class="btn small" data-first-report-upload="1">${esc(t('firstReportUploadMaterials'))}</button><button class="btn small" data-open-demo>${esc(t('firstReportOpenDemo'))}</button><button class="btn small" data-first-report-paste="1">${esc(t('firstReportPasteTable'))}</button><button class="btn small" data-first-report-folder="1">${esc(t('firstReportConnectLocalFolder'))}</button></div>`:'';
  return `<div class="materialsInventory firstReportFlow">
    <div class="materialsHead"><b>${esc(title)}</b><span class="pill">${progress.completed}/${progress.total}</span></div>
    <div class="itemMeta">${esc(subtitle)}</div>
    ${demo}${localLabel}
    <div class="itemMeta">${esc(t('firstReportProgress',{percent:progress.percent,step:firstReportStepLabel(next)}))}</div>
    <div class="materialFilters">${primary}${secondary}</div>
    ${extra}
    ${rows}
  </div>`;
}
function renderFirstReportEmptyState(){
  return `<div class="productHero">
    <h1>${esc(t('firstReportTitleEmpty'))}</h1>
    <p>${esc(t('firstReportSubtitleEmpty'))}</p>
    <div class="productActions">
      ${isAdmin()?`<button class="btn primary adminOnly" data-first-report-action="createReport">${esc(t('firstReportStartGuided'))}</button>`:''}
      ${isAdmin()?`<button class="btn adminOnly" data-first-report-upload="1">${esc(t('firstReportUploadMaterials'))}</button>`:''}
      ${isAdmin()?`<button class="btn adminOnly" data-open-demo>${esc(t('firstReportOpenDemo'))}</button>`:''}
    </div>
    <div class="productActions">
      ${isAdmin()?`<button class="btn small adminOnly" data-first-report-paste="1">${esc(t('firstReportImportSpreadsheet'))}</button><button class="btn small adminOnly" data-first-report-paste="1">${esc(t('firstReportPasteTable'))}</button><button class="btn small adminOnly" data-first-report-folder="1">${esc(t('firstReportConnectLocalFolder'))}</button>`:''}
    </div>
    ${renderGuidedFirstReportPanel({hero:true})}
  </div>`;
}
function applyFirstReportBasicsFromModal(){
  REPORT.meta=REPORT.meta||{};
  const title=String($('firstReportTitle')?.value||'').trim();
  const client=String($('firstReportClient')?.value||'').trim();
  const market=String($('firstReportMarket')?.value||'').trim();
  const objective=String($('firstReportObjective')?.value||'').trim();
  const lang=String($('firstReportLanguage')?.value||'').trim();
  if(title) REPORT.meta.title=title;
  if(client) REPORT.meta.companyName=client;
  if(market) REPORT.meta.marketCategory=market;
  if(objective) REPORT.meta.researchObjective=objective;
  if(lang) REPORT.meta.lang=lang;
  markFirstReportStepComplete(REPORT,'createReport');
}
function openFirstReportBasicsModal(){
  if(!guardAdmin()) return;
  openModal('Create report',`<div class="formGrid">
    <div class="field full"><label>Report title</label><input id="firstReportTitle" value="${esc(REPORT.meta?.title||'Marketing Intelligence Report')}"></div>
    <div class="field"><label>Client/company name</label><input id="firstReportClient" value="${esc(REPORT.meta?.companyName||'')}"></div>
    <div class="field"><label>Market/category</label><input id="firstReportMarket" value="${esc(REPORT.meta?.marketCategory||'')}"></div>
    <div class="field"><label>Language</label><input id="firstReportLanguage" value="${esc(REPORT.meta?.lang||state.lang||'en')}"></div>
    <div class="field full"><label>Research objective</label><textarea id="firstReportObjective" rows="3">${esc(REPORT.meta?.researchObjective||'')}</textarea></div>
    <div class="field full"><div class="hintBox">These fields set workspace context only. They do not create unsupported client claims.</div></div>
  </div>`,'<button class="btn" id="cancelFirstReportBasics">Cancel</button><button class="btn primary" id="saveFirstReportBasics">Save and continue</button>');
  $('cancelFirstReportBasics').onclick=closeModal;
  $('saveFirstReportBasics').onclick=()=>{applyFirstReportBasicsFromModal(); closeModal(); refresh(); toast('Report basics saved');};
}
function openFirstReportClientModal(){
  if(!guardAdmin()) return;
  const client=(REPORT.companies||[]).find(c=>c.type==='client')||{};
  openModal('Add client basics',`<div class="formGrid">
    <div class="field"><label>Company name</label><input id="firstClientName" value="${esc(client.name||REPORT.meta?.companyName||'')}"></div>
    <div class="field"><label>Website</label><input id="firstClientWebsite" value="${esc(client.website||'')}"></div>
    <div class="field"><label>Category</label><input id="firstClientCategory" value="${esc(client.category||REPORT.meta?.marketCategory||'')}"></div>
    <div class="field"><label>Market</label><input id="firstClientMarket" value="${esc(client.market||'')}"></div>
    <div class="field full"><label>Short description / notes</label><textarea id="firstClientNotes" rows="3">${esc(client.notes||'')}</textarea></div>
  </div>`,'<button class="btn" id="cancelFirstClient">Cancel</button><button class="btn primary" id="saveFirstClient">Save client</button>');
  $('cancelFirstClient').onclick=closeModal;
  $('saveFirstClient').onclick=()=>{const name=String($('firstClientName')?.value||'').trim(); if(name){const co=ensureCompany(name,'client',REPORT); Object.assign(co,{website:String($('firstClientWebsite')?.value||'').trim(),category:String($('firstClientCategory')?.value||'').trim(),market:String($('firstClientMarket')?.value||'').trim(),notes:String($('firstClientNotes')?.value||'').trim(),updatedAt:new Date().toISOString()}); REPORT.meta.companyName=name;} markFirstReportStepComplete(REPORT,'addClientBasics'); closeModal(); refresh(); toast('Client basics saved');};
}
function openFirstReportCompetitorsModal(){
  if(!guardAdmin()) return;
  const existing=(normalizeCompetitorProfiles(REPORT).items||[]).filter(c=>c.status!=='archived').slice(0,5);
  const rows=[0,1,2,3,4].map(i=>{const c=existing[i]||{}; return `<div class="field"><label>Competitor ${i+1}</label><input id="firstCompetitorName${i}" value="${esc(c.name||'')}" placeholder="Name"></div><div class="field"><label>Website / notes</label><input id="firstCompetitorNotes${i}" value="${esc(c.website||c.notes||'')}" placeholder="Optional"></div>`;}).join('');
  openModal('Add competitors',`<div class="formGrid">${rows}<div class="field full"><div class="hintBox">Add 2-5 competitors if you know them. The guide will not scrape websites or generate claims.</div></div></div>`,'<button class="btn" id="cancelFirstCompetitors">Cancel</button><button class="btn primary" id="saveFirstCompetitors">Save competitors</button>');
  $('cancelFirstCompetitors').onclick=closeModal;
  $('saveFirstCompetitors').onclick=()=>{const profiles=normalizeCompetitorProfiles(REPORT); for(let i=0;i<5;i++){const name=String($(`firstCompetitorName${i}`)?.value||'').trim(); if(!name) continue; const notes=String($(`firstCompetitorNotes${i}`)?.value||'').trim(); let profile=(profiles.items||[]).find(item=>String(item.name||'').toLowerCase()===name.toLowerCase()); if(!profile){profile=createCompetitorProfile({name,priority:i<2?'high':'medium',linkedSectionIds:['competitiveLandscape','competitors','pricing','features','messaging','channels','risksOpportunities','recommendations']}); profiles.items.push(profile);} if(/^https?:\/\//i.test(notes)) profile.website=notes; else profile.shortDescription=notes||profile.shortDescription; updateCompetitorProfile(REPORT,profile.id,profile);} markFirstReportStepComplete(REPORT,'addCompetitors'); closeModal(); refresh(); toast('Competitor profiles saved');};
}
function performFirstReportAction(stepId){
  if(!guardAdmin()) return;
  if(stepId==='createReport') return openFirstReportBasicsModal();
  if(stepId==='addClientBasics') return openFirstReportClientModal();
  if(stepId==='addCompetitors'){state.sidePanelView='report'; return openFirstReportCompetitorsModal();}
  if(stepId==='uploadMaterials'){state.sidePanelView='materials'; return openDataModal();}
  if(stepId==='reviewMaterialsInventory'){state.sidePanelView='materials'; markFirstReportStepComplete(REPORT,'reviewMaterialsInventory'); renderSide(); toast('Materials step marked complete'); return;}
  if(stepId==='buildSourceRegistry'){state.sidePanelView='evidence'; collectMaterialsFromCurrentState(REPORT,state.fsRoots); buildSourcesFromMaterials(REPORT); markFirstReportStepComplete(REPORT,'buildSourceRegistry'); refresh(); toast('Sources refreshed from materials'); return;}
  if(stepId==='addEvidence'){state.sidePanelView='evidence'; return openEvidenceCardModal();}
  if(stepId==='reviewEvidence'){state.sidePanelView='evidence'; renderSide(); toast('Use Evidence Review to approve, mark needs review, or reject evidence.'); return;}
  if(stepId==='buildDraft'){state.sidePanelView='report'; const approved=getApprovedEvidenceCards(REPORT); if(!approved.length){toast('Approve evidence cards first.'); return;} const result=buildRuleBasedReportDraft(REPORT); markFirstReportStepComplete(REPORT,'buildDraft'); refresh(); toast(result.blocksCreated?`Built ${result.blocksCreated} draft blocks`:'No draft blocks created'); return;}
  if(stepId==='runQualityChecklist'){state.sidePanelView='report'; markFirstReportStepComplete(REPORT,'runQualityChecklist'); renderSide(); toast('Quality checklist refreshed'); return;}
  if(stepId==='exportClientReport') return saveClientHtml();
}
function openRestoreVersionPreview(){
  if(!guardAdmin()) return;
  ensureVersionDiffBaselineReport();
  const preview=prepareRestorePreview(REPORT,VERSION_DIFF_BASELINE_REPORT);
  const highRisk=preview.riskLevel==='high';
  const confirmLabel=highRisk?'Type RESTORE to confirm':'Check to confirm';
  const confirmControl=highRisk
    ? '<input id="restoreConfirmText" placeholder="Type RESTORE">'
    : '<label class="checkLine"><input id="restoreConfirmCheck" type="checkbox"> Restore this version as a new current version</label>';
  const warning=highRisk?'<div class="empty">This restore may reduce export readiness or remove reviewed evidence/source links.</div>':'';
  openModal('Restore selected version',`
    <div class="formGrid">
      <div class="field"><label>Selected version</label><input readonly value="${esc(preview.targetVersionId)}"></div>
      <div class="field"><label>Current version</label><input readonly value="${esc(preview.currentVersionId)}"></div>
      <div class="field"><label>Risk level</label><input readonly value="${esc(versionDiffRiskLabel(preview.riskLevel))}"></div>
      <div class="field"><label>Readiness after restore</label><input readonly value="${esc(preview.diff.qualityChecklistChanges.readinessAfter)}"></div>
      <div class="field full"><div class="hintBox">${esc(preview.impactSummary)} Current version will remain available through normal saved/exported history. The selected version is copied into a new active local snapshot.</div></div>
      ${warning}
      <div class="field full"><label>Why are you restoring this version?</label><textarea id="restoreReason" rows="3" placeholder="Optional restore reason"></textarea></div>
      <div class="field full"><label>${esc(confirmLabel)}</label>${confirmControl}</div>
    </div>`,
    '<button class="btn" id="cancelRestoreVersion">Cancel</button><button class="btn primary danger" id="confirmRestoreVersion" disabled>Restore this version as a new current version</button>'
  );
  const confirmBtn=$('confirmRestoreVersion');
  const update=()=>{
    confirmBtn.disabled=highRisk
      ? String($('restoreConfirmText')?.value||'').trim()!=='RESTORE'
      : !$('restoreConfirmCheck')?.checked;
  };
  $('cancelRestoreVersion').onclick=closeModal;
  $('restoreConfirmText')?.addEventListener('input',update);
  $('restoreConfirmCheck')?.addEventListener('change',update);
  confirmBtn.onclick=()=>{
    const reason=String($('restoreReason')?.value||'');
    const check=validateRestorePreconditions(REPORT,preview.targetReport,preview.expectedCurrentVersion);
    if(!check.ok){toast(check.error); closeModal(); renderSide(); return;}
    const restored=restoreVersionAsNewSnapshot(REPORT,preview.targetReport,{restoredFromVersionId:preview.targetVersionId,restoreReason:reason,restoreRiskLevel:preview.riskLevel,restoreDiffSummary:preview.diff.summary,warnings:preview.diff.warnings});
    REPORT=restored;
    VERSION_DIFF_BASELINE_REPORT=normalizeReport(clone(restored));
    VERSION_DIFF_BASELINE=createReportVersionSnapshot(restored);
    state.activeDataset=REPORT.datasets[0]?.id||null;
    state.openTabs=[];
    state.activeFile=null;
    initState();
    closeModal();
    refresh();
    persistNow();
    toast(`Restored as ${REPORT.meta.versionId}. Recheck export readiness before client export.`);
  };
  update();
}
function renderAiAssistancePanel(){
  const ai=normalizeAiAssistanceState(REPORT);
  const tasks=getAvailableAiTasks(REPORT);
  const aiStatus=state.aiStatus||createDefaultAiStatus();
  const evidenceGate=canRunAiEvidencePreview(REPORT,aiStatus,currentAiUser());
  const recommendationGate=canRunAiRecommendationPreview(REPORT,aiStatus,currentAiUser());
  const summaryGate=canRunAiExecutiveSummaryPreview(REPORT,aiStatus,currentAiUser());
  const coverageGate=canRunAiSourceCoveragePreview(REPORT,aiStatus,currentAiUser());
  const sectionGate=canRunAiSectionDraftPreview(REPORT,aiStatus,currentAiUser());
  const canPreview=evidenceGate.ok;
  const canRecommend=recommendationGate.ok;
  const canSummarize=summaryGate.ok;
  const canCheckCoverage=coverageGate.ok;
  const canDraftSection=sectionGate.ok;
  const disabledReason=aiPreviewDisabledReason(REPORT,aiStatus,currentAiUser());
  const recommendationReason=aiRecommendationDisabledReason(REPORT,aiStatus,currentAiUser());
  const summaryReason=aiExecutiveSummaryDisabledReason(REPORT,aiStatus,currentAiUser());
  const coverageReason=aiSourceCoverageDisabledReason(REPORT,aiStatus,currentAiUser());
  const sectionDraftReason=aiSectionDraftDisabledReason(REPORT,aiStatus,currentAiUser());
  const preview=latestAiEvidenceCandidatePreview(REPORT);
  const recommendationPreview=latestAiRecommendationPreview(REPORT);
  const summaryPreview=latestAiExecutiveSummaryPreview(REPORT);
  const coveragePreview=latestAiSourceCoveragePreview(REPORT);
  const sectionDraftPreview=latestAiSectionDraftPreview(REPORT);
  const previewPanel=preview?renderEvidenceCandidatePreview(preview):'';
  const recommendationPanel=recommendationPreview?renderRecommendationPreview(recommendationPreview):'';
  const summaryPanel=summaryPreview?renderExecutiveSummaryPreview(summaryPreview):'';
  const coveragePanel=coveragePreview?renderSourceCoveragePreview(coveragePreview):'';
  const sectionDraftPanel=sectionDraftPreview?renderSectionDraftPreview(sectionDraftPreview):'';
  const sectionOptions=(REPORT.reportSections||[]).map(section=>`<option value="${esc(section.id)}" ${state.aiSectionId===section.id?'selected':''}>${esc(section.title)}</option>`).join('');
  const buttons=[
    ['extract_evidence_candidates','Preview evidence candidates'],
    ['improve_executive_summary','Preview executive summary'],
    ['suggest_recommendations','Preview recommendations'],
    ['check_source_coverage','Preview source coverage'],
    ['suggest_report_sections','Preview section draft']
  ].map(([type,label])=>{
    const isEvidence=type==='extract_evidence_candidates';
    const isRecommendation=type==='suggest_recommendations';
    const isSummary=type==='improve_executive_summary';
    const isCoverage=type==='check_source_coverage';
    const isSectionDraft=type==='suggest_report_sections';
    const active=(isEvidence&&canPreview)||(isRecommendation&&canRecommend)||(isSummary&&canSummarize)||(isCoverage&&canCheckCoverage)||(isSectionDraft&&canDraftSection);
    const disabled=!active;
    const attrs=isEvidence?' data-ai-preview-candidates="1"':(isRecommendation?' data-ai-preview-recommendations="1"':(isSummary?' data-ai-preview-summary="1"':(isCoverage?' data-ai-preview-coverage="1"':(isSectionDraft?' data-ai-preview-section-draft="1"':''))));
    const title=isEvidence?'Preview evidence suggestions only. No automatic approval.':(isRecommendation?'Preview recommendation suggestions only. No automatic approval.':(isSummary?'Preview executive summary suggestions only. No automatic approval.':(isCoverage?'Preview source coverage gaps only. No automatic fixes.':(isSectionDraft?'Preview section draft blocks only. No automatic approval.':AI_TASK_DEFINITIONS[type]?.label||type))));
    return `<button class="btn small ${active?'primary':''}" ${disabled?'disabled':''}${attrs} title="${esc(title)}">${esc(label)}</button>`;
  }).join('');
  const taskRows=tasks.slice(0,6).map(task=>`
    <div class="materialRow">
      <div class="itemName">${esc(task.label)}<div class="itemMeta">disabled - ${esc(task.outputContract)} contract ready</div></div>
    </div>`).join('');
  return `<div class="materialsInventory">
    <div class="materialsHead"><b>AI Assistance</b><span class="pill">${esc(aiStatusLabel(aiStatus))}</span></div>
    <div class="itemMeta">AI suggestions require review before export. AI output is not added to the client report automatically.</div>
    <div class="itemMeta">AI server: ${esc(aiStatusLabel(aiStatus))} - Provider: ${esc(aiStatus.provider||'dry_run')} - Permission: ${isAdmin()?'allowed':'not allowed'} - Client mode: ${isClientLocked()?'clientLocked':'workspace'}</div>
    <div class="itemMeta">Mode: ${esc(ai.aiMode)} - Suggestions: ${(ai.suggestions||[]).length}</div>
    <select class="input adminOnly" data-ai-section-select="1"><option value="">Select section for draft</option>${sectionOptions}</select>
    <div class="materialFilters">${buttons}</div>
    ${disabledReason?`<div class="empty">${esc(disabledReason)}</div>`:''}
    ${recommendationReason?`<div class="empty">${esc(recommendationReason)}</div>`:''}
    ${summaryReason?`<div class="empty">${esc(summaryReason)}</div>`:''}
    ${coverageReason?`<div class="empty">${esc(coverageReason)}</div>`:''}
    ${sectionDraftReason?`<div class="empty">${esc(sectionDraftReason)}</div>`:''}
    ${previewPanel}
    ${recommendationPanel}
    ${summaryPanel}
    ${coveragePanel}
    ${sectionDraftPanel}
    ${taskRows}
  </div>`;
}
function queueTypeLabel(type){return String(type||'unknown').replace(/_/g,' ');}
function renderAiReviewQueue(){
  const allItems=normalizeAiReviewQueue(REPORT).items||[];
  const counts=allItems.reduce((acc,item)=>{acc[item.reviewStatus]=(acc[item.reviewStatus]||0)+1; return acc;},{});
  const items=getAiReviewQueueItems(REPORT,{type:state.aiQueueType||'all',status:state.aiQueueStatus||'all'});
  const rows=items.slice(0,10).map(item=>`
    <div class="materialRow">
      <div class="itemName">${esc(item.title)}<div class="itemMeta">${esc(queueTypeLabel(item.suggestionType))} - ${esc(item.reviewStatus)} - section: ${esc(item.sectionId||'unlinked')} - evidence ${item.evidenceCardIds.length} - sources ${item.sourceIds.length} - confidence ${esc(item.confidenceStatus)} - warnings ${item.warnings.length}</div><div class="itemMeta">${esc(item.summary).slice(0,220)}</div></div>
      <div class="materialFilters adminOnly">
        <button class="btn small" data-aiq-detail="${esc(item.id)}">View</button>
        <button class="btn small" data-aiq-edit="${esc(item.id)}">Edit</button>
        <button class="btn small primary" data-aiq-accept="${esc(item.id)}">Accept</button>
        <button class="btn small danger" data-aiq-reject="${esc(item.id)}">Reject</button>
        <button class="btn small" data-aiq-convert="${esc(item.id)}">Accept and convert to needs-review draft</button>
      </div>
    </div>`).join('');
  return `<div class="materialsInventory">
    <div class="materialsHead"><b>AI Review Queue</b><span class="pill">${allItems.length} total</span></div>
    <div class="itemMeta">Ready ${(counts.ready_for_review||0)} - Accepted ${(counts.accepted||0)} - Rejected ${(counts.rejected||0)} - Converted ${(counts.converted||0)}</div>
    <div class="materialFilters">
      ${['all','evidence_candidate','recommendation','executive_summary','source_coverage_gap','section_draft'].map(type=>`<button class="btn small ${state.aiQueueType===type?'primary':''}" data-aiq-type="${esc(type)}">${esc(type==='all'?'All':queueTypeLabel(type))}</button>`).join('')}
    </div>
    <div class="materialFilters">
      ${['all','ready_for_review','accepted','rejected','converted'].map(status=>`<button class="btn small ${state.aiQueueStatus===status?'primary':''}" data-aiq-status="${esc(status)}">${esc(status==='all'?'All statuses':status.replace(/_/g,' '))}</button>`).join('')}
    </div>
    ${rows||'<div class="empty">AI suggestions sent for review will appear here.</div>'}
  </div>`;
}
function aiAuditFilterMatch(event,filter){
  if(filter==='preview') return ['ai_preview_requested','ai_preview_completed','ai_preview_failed'].includes(event.eventType);
  if(filter==='created') return event.eventType==='suggestion_created';
  if(filter==='accepted') return event.eventType==='suggestion_accepted';
  if(filter==='rejected') return event.eventType==='suggestion_rejected';
  if(filter==='converted') return ['suggestion_converted','evidence_card_created_from_suggestion','draft_block_created_from_suggestion','checklist_item_created_from_suggestion'].includes(event.eventType);
  if(filter==='errors') return event.eventType==='ai_preview_failed'||event.errorCode;
  return true;
}
function renderAiAuditPanel(){
  if(isClientLocked()||!isAdmin()) return '';
  const log=normalizeAiAuditLog(REPORT);
  const events=log.events||[];
  const taskRuns=new Set(events.map(event=>event.taskRunId).filter(Boolean));
  const suggestions=new Set(events.map(event=>event.suggestionId).filter(Boolean));
  const accepted=events.filter(event=>event.eventType==='suggestion_accepted').length;
  const rejected=events.filter(event=>event.eventType==='suggestion_rejected').length;
  const converted=events.filter(event=>event.eventType==='suggestion_converted').length;
  const last=events.map(event=>event.createdAt).filter(Boolean).sort().pop()||'';
  const filter=state.aiAuditFilter||'all';
  const filtered=events.filter(event=>aiAuditFilterMatch(event,filter)).slice(-10).reverse();
  const filters=[['all','All events'],['preview','Preview runs'],['created','Created suggestions'],['accepted','Accepted'],['rejected','Rejected'],['converted','Converted'],['errors','Errors']]
    .map(([id,label])=>`<button class="btn small ${filter===id?'primary':''}" data-audit-filter="${esc(id)}">${esc(label)}</button>`).join('');
  const rows=filtered.map(event=>`
    <div class="materialRow">
      <div class="itemName">${esc(event.eventType.replace(/_/g,' '))}
        <div class="itemMeta">${esc(event.taskType||'task')} - ${esc(event.providerMode)} - suggestion: ${esc(event.suggestionId||'n/a')} - output: ${esc([event.outputType,event.outputId].filter(Boolean).join(':')||'n/a')}</div>
        <div class="itemMeta">Actor ${esc(event.actorLabel||event.actorRole)} - ${esc(event.createdAt)} - warnings ${(event.warnings||[]).length}</div>
      </div>
      ${event.suggestionId?`<div class="materialFilters adminOnly"><button class="btn small" data-audit-provenance="${esc(event.suggestionId)}">View provenance</button></div>`:''}
    </div>`).join('');
  return `<div class="materialsInventory">
    <div class="materialsHead"><b>AI Audit & Provenance</b><span class="pill">${events.length} events</span></div>
    <div class="itemMeta">Task runs ${taskRuns.size} - Suggestions ${suggestions.size} - Accepted ${accepted} - Rejected ${rejected} - Converted ${converted}</div>
    <div class="itemMeta">Last AI/dry-run activity: ${esc(last||'none')}</div>
    <div class="materialFilters">${filters}</div>
    ${rows||'<div class="empty">AI preview and review actions will appear here.</div>'}
  </div>`;
}
function clientRefLabels(ids, prefix){
  return (ids||[]).map((id,index)=>`${prefix}${index+1}`).join(', ');
}
function renderClientDraftBlock(block, reportData){
  const b=normalizeDraftBlock(block);
  if(!isBlockClientVisible(b)) return '';
  const refs=[
    b.evidenceCardIds?.length?`${esc(t('evidenceRefLabel'))}: ${esc(clientRefLabels(b.evidenceCardIds,'E'))}`:'',
    b.sourceIds?.length?`${esc(t('sourceRefLabel'))}: ${esc(clientRefLabels(b.sourceIds,'S'))}`:''
  ].filter(Boolean).join(' - ');
  const label=String(b.type||'paragraph').replace(/_/g,' ');
  const text=esc(b.text);
  if(b.type==='bullet_list'){
    const bullets=String(b.text||'').split(/\n+/).map(line=>line.replace(/^[-*]\s*/,'').trim()).filter(Boolean);
    return `<div class="clientBlock" data-evidence="${esc((b.evidenceCardIds||[]).join(','))}" data-sources="${esc((b.sourceIds||[]).join(','))}"><b>${esc(b.title||label)}</b><ul>${bullets.map(line=>`<li>${esc(line)}</li>`).join('')}</ul>${refs?`<div class="itemMeta">${refs}</div>`:''}</div>`;
  }
  return `<div class="clientBlock" data-evidence="${esc((b.evidenceCardIds||[]).join(','))}" data-sources="${esc((b.sourceIds||[]).join(','))}"><div class="pill">${esc(label)}</div><p>${text}</p>${refs?`<div class="itemMeta">${refs}</div>`:''}</div>`;
}
function renderClientReportSectionsV2(reportData){
  const data=reportData.clientExportV2||buildClientExportDataV2(reportData);
  if(!data.sections?.length) return `<div class="empty">${esc(t('noApprovedDraftSections'))}</div>`;
  return data.sections.map(section=>`
    <section class="widget clientSection" id="client-section-${esc(section.id)}">
      <div class="widgetHead"><b>${esc(section.title)}</b></div>
      <div class="widgetBody">${(section.blocks||[]).map(block=>renderClientDraftBlock(block,reportData)).join('')}</div>
    </section>`).join('');
}
function renderClientSourcesSection(reportData){
  const data=reportData.clientExportV2||buildClientExportDataV2(reportData);
  if(!data.sources?.length) return '';
  const rows=data.sources.map((source,index)=>`
    <div class="materialRow" id="client-source-${esc(source.id)}">
      <div class="itemName">S${index+1}. ${esc(source.title||t('untitledSource'))}<div class="itemMeta">${esc(sourceTypeLabel(source.sourceType||'source'))} - ${t('credibilityLabel')}: ${esc(statusLabel(source.credibilityStatus||'unreviewed'))}${source.linkedSections?.length?' - '+esc(source.linkedSections.join(', ')):''}</div></div>
    </div>`).join('');
  return `<section class="widget clientSection"><div class="widgetHead"><b>${esc(t('sourcesEvidenceTitle'))}</b></div><div class="widgetBody">${rows}</div></section>`;
}
function renderClientExportV2(){
  if(!isClientLocked() || Number(REPORT.meta?.clientExportVersion||0)<2) return false;
  const data=REPORT.clientExportV2||buildClientExportDataV2(REPORT);
  readerTabs.innerHTML='';
  state.openTabs=[];
  state.activeFile=null;
  reader.innerHTML=`
    <div class="clientReportV2">
      <div class="heroBlock">
        <div class="kicker">${esc(t('clientReport'))}</div>
        <h1>${esc(data.title||REPORT.meta?.title||'Marketing Report Studio')}</h1>
        <p>${esc(t('evidenceBackedReport'))}</p>
        <div class="heroActions"><span class="pill">Client Export V2</span><span class="pill">${esc(new Date(data.generatedAt||Date.now()).toLocaleDateString(uiLocale()))}</span></div>
      </div>
      ${renderClientReportSectionsV2(REPORT)}
      ${renderClientSourcesSection(REPORT)}
    </div>`;
  return true;
}
function scheduleSideSearchRender(){
  if(sideSearchRenderTimer) clearTimeout(sideSearchRenderTimer);
  sideSearchRenderTimer=setTimeout(()=>{
    sideSearchRenderTimer=null;
    renderSide();
  }, SIDE_SEARCH_RENDER_DEBOUNCE_MS);
}
function sidePanelDefinitions(){
  const tabs=[
    ['materials',t('dataFiles')],
    ['evidence',t('evidenceCardsTitle')],
    ['report',t('clientReport')]
  ];
  if(isAdmin()) tabs.push(['admin',t('admin')]);
  return tabs;
}
function currentSidePanelView(){
  const ids=sidePanelDefinitions().map(([id])=>id);
  if(!ids.includes(state.sidePanelView)) state.sidePanelView='materials';
  return state.sidePanelView;
}
function renderSidePanelTabs(active){
  return `<div class="materialFilters" role="tablist">${sidePanelDefinitions().map(([id,label])=>`
    <button class="btn small ${active===id?'primary':''}" role="tab" aria-selected="${active===id?'true':'false'}" data-side-panel="${esc(id)}">${esc(label)}</button>
  `).join('')}</div>`;
}
function renderSideFileTree(match){
  let html='';
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
  return html;
}
function renderSide(){
  if(sideSearchRenderTimer){
    clearTimeout(sideSearchRenderTimer);
    sideSearchRenderTimer=null;
  }
  const q=search.value.trim().toLowerCase();
  const match=s=>!q || String(s||'').toLowerCase().includes(q);
  const renderDatasetItems=()=> (REPORT.datasets||[]).filter(d=>match(d.name)).map(d=>{
    const imported=d.createdAt?new Date(d.createdAt).toLocaleDateString(uiLocale()):'';
    return `<div class="item ${state.activeDataset===d.id?'active':''}" data-type="dataset" data-id="${esc(d.id)}"><div class="icon">▦</div><div class="itemName">${esc(d.name)}<div class="itemMeta">${d.rows?.length||0} рядків${imported?' · '+esc(imported):''}</div></div><button class="btn small ghost adminOnly" data-act="export-dataset" data-id="${esc(d.id)}" title="Експорт CSV">⇩</button><button class="btn small ghost danger adminOnly" data-act="delete-dataset" data-id="${esc(d.id)}" title="Видалити таблицю">×</button></div>`;
  }).join('');
  const renderChartItems=()=> (REPORT.charts||[]).filter(ch=>match(ch.title)).map(ch=>`<div class="item" data-type="chart" data-id="${esc(ch.id)}"><div class="icon">▥</div><div class="itemName">${esc(ch.title)}</div></div>`).join('');
  const view=currentSidePanelView();
  let html=renderSidePanelTabs(view);
  if(view==='materials'){
    const datasetItems=renderDatasetItems();
    html += `${renderMaterialsInventory()}<div class="sectionTitle">Таблиці даних</div>${datasetItems||'<div class="empty">Таблиць ще немає.</div>'}${renderSideFileTree(match)}`;
  }else if(view==='evidence'){
    html += `${renderSourceRegistry()}${renderEvidenceCards()}${renderEvidenceReview()}`;
  }else if(view==='report'){
    const chartItems=renderChartItems();
    html += `${renderGuidedFirstReportPanel()}${renderCompetitorProfiles()}${renderPricingFeatureMatrix()}${renderDraftBuilder()}${renderReportQualityChecklist()}<div class="sectionTitle">Графіки</div>${chartItems||'<div class="empty">Графіків ще немає.</div>'}`;
  }else{
    html += `${renderVersionDiffPanel()}${renderVersionRetentionPanel()}${renderWorkspaceGovernancePanel()}${renderAiAuditPanel()}${renderAiReviewQueue()}${renderAiAssistancePanel()}`;
  }
  sideList.innerHTML=translateText(html);
}
async function onSideListClick(e){
  const sidePanel=e.target.closest('[data-side-panel]');
  if(sidePanel && sideList.contains(sidePanel)){
    state.sidePanelView=sidePanel.dataset.sidePanel||'materials';
    renderSide();
    e.stopPropagation();
    return;
  }
  const materialFilter=e.target.closest('[data-material-filter]');
  if(materialFilter && sideList.contains(materialFilter)){state.materialType=materialFilter.dataset.materialFilter||'all'; renderSide(); e.stopPropagation(); return;}
  const reviewFilter=e.target.closest('[data-review-filter]');
  if(reviewFilter && sideList.contains(reviewFilter)){state.reviewFilter=reviewFilter.dataset.reviewFilter||'all'; renderSide(); e.stopPropagation(); return;}
  const competitorFilter=e.target.closest('[data-competitor-filter]');
  if(competitorFilter && sideList.contains(competitorFilter)){state.competitorFilter=competitorFilter.dataset.competitorFilter||'all'; renderSide(); e.stopPropagation(); return;}
  const competitorAdd=e.target.closest('[data-competitor-add]');
  if(competitorAdd && sideList.contains(competitorAdd)){openCompetitorProfileModal(); e.stopPropagation(); return;}
  const competitorEdit=e.target.closest('[data-competitor-edit]');
  if(competitorEdit && sideList.contains(competitorEdit)){openCompetitorProfileModal(competitorEdit.dataset.competitorEdit); e.stopPropagation(); return;}
  const competitorArchive=e.target.closest('[data-competitor-archive]');
  if(competitorArchive && sideList.contains(competitorArchive)){if(!guardAdmin()) return; archiveCompetitorProfile(REPORT,competitorArchive.dataset.competitorArchive); refresh(); toast('Competitor archived'); e.stopPropagation(); return;}
  const competitorSummary=e.target.closest('[data-competitor-summary]');
  if(competitorSummary && sideList.contains(competitorSummary)){if(!guardAdmin()) return; const block=addCompetitorProfileSummaryToDraft(REPORT,competitorSummary.dataset.competitorSummary); refresh(); toast(block?'Competitor summary added as needs-review draft':'Could not add competitor summary'); e.stopPropagation(); return;}
  const matrixFilter=e.target.closest('[data-matrix-filter]');
  if(matrixFilter && sideList.contains(matrixFilter)){state.matrixFilter=matrixFilter.dataset.matrixFilter||'all'; renderSide(); e.stopPropagation(); return;}
  const matrixAddCompetitor=e.target.closest('[data-matrix-add-competitor]');
  if(matrixAddCompetitor && sideList.contains(matrixAddCompetitor)){openMatrixCompetitorModal(); e.stopPropagation(); return;}
  const matrixAddTier=e.target.closest('[data-matrix-add-tier]');
  if(matrixAddTier && sideList.contains(matrixAddTier)){openMatrixPricingTierModal(); e.stopPropagation(); return;}
  const matrixAddRow=e.target.closest('[data-matrix-add-row]');
  if(matrixAddRow && sideList.contains(matrixAddRow)){openMatrixFeatureRowModal(); e.stopPropagation(); return;}
  const matrixCell=e.target.closest('[data-matrix-cell]');
  if(matrixCell && sideList.contains(matrixCell)){openMatrixCellModal(matrixCell.dataset.matrixCell,matrixCell.dataset.company); e.stopPropagation(); return;}
  const matrixSummary=e.target.closest('[data-matrix-summary]');
  if(matrixSummary && sideList.contains(matrixSummary)){if(!guardAdmin()) return; const block=addPricingFeatureMatrixSummaryToDraft(REPORT); refresh(); toast(block?'Matrix summary added as needs-review draft':'Could not add matrix summary'); e.stopPropagation(); return;}
  const qType=e.target.closest('[data-aiq-type]');
  if(qType && sideList.contains(qType)){state.aiQueueType=qType.dataset.aiqType||'all'; renderSide(); e.stopPropagation(); return;}
  const qStatus=e.target.closest('[data-aiq-status]');
  if(qStatus && sideList.contains(qStatus)){state.aiQueueStatus=qStatus.dataset.aiqStatus||'all'; renderSide(); e.stopPropagation(); return;}
  const auditFilter=e.target.closest('[data-audit-filter]');
  if(auditFilter && sideList.contains(auditFilter)){state.aiAuditFilter=auditFilter.dataset.auditFilter||'all'; renderSide(); e.stopPropagation(); return;}
  const auditProvenance=e.target.closest('[data-audit-provenance]');
  if(auditProvenance && sideList.contains(auditProvenance)){
    const suggestionId=auditProvenance.dataset.auditProvenance;
    const provenance=getAiSuggestionProvenance(REPORT,suggestionId);
    const events=getAiAuditEventsBySuggestionId(REPORT,suggestionId);
    const body=provenance
      ? `<div class="formGrid"><div class="field"><label>Task type</label><input readonly value="${esc(provenance.taskType)}"></div><div class="field"><label>Provider mode</label><input readonly value="${esc(provenance.providerMode)}"></div><div class="field full"><label>Input refs</label><pre style="white-space:pre-wrap;max-height:18vh;overflow:auto">${esc(JSON.stringify(provenance.inputRefs,null,2))}</pre></div><div class="field full"><label>Output refs</label><pre style="white-space:pre-wrap;max-height:18vh;overflow:auto">${esc(JSON.stringify(provenance.outputRefs,null,2))}</pre></div><div class="field full"><label>Review history</label><pre style="white-space:pre-wrap;max-height:18vh;overflow:auto">${esc(JSON.stringify(events.map(event=>({eventType:event.eventType,statusBefore:event.statusBefore,statusAfter:event.statusAfter,createdAt:event.createdAt,warnings:event.warnings})),null,2))}</pre></div></div>`
      : '<div class="empty">No provenance available.</div>';
    openModal('Suggestion provenance',body,'<button class="btn primary" id="closeAuditProvenance">Close</button>');
    $('closeAuditProvenance').onclick=closeModal;
    e.stopPropagation(); return;
  }
  const versionDiffFilter=e.target.closest('[data-version-diff-filter]');
  if(versionDiffFilter && sideList.contains(versionDiffFilter)){state.versionDiffFilter=versionDiffFilter.dataset.versionDiffFilter||'all'; renderSide(); e.stopPropagation(); return;}
  const versionDiffCopy=e.target.closest('[data-version-diff-copy]');
  if(versionDiffCopy && sideList.contains(versionDiffCopy)){
    if(!guardAdmin()) return;
    const diff=getCurrentVersionDiff();
    const text=[`Risk: ${versionDiffRiskLabel(diff.riskLevel)}`,diff.summary,`Sections changed: ${getChangedSectionLabels(diff).join(', ')||'none'}`,`Evidence changed: ${getChangedEvidenceLabels(diff).join(', ')||'none'}`,`Sources changed: ${getChangedSourceLabels(diff).join(', ')||'none'}`,`Readiness: ${diff.qualityChecklistChanges.readinessBefore} -> ${diff.qualityChecklistChanges.readinessAfter}`].join('\n');
    if(navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(()=>toast('Diff summary copied')).catch(()=>promptI18n('Copy diff summary',text));
    else promptI18n('Copy diff summary',text);
    e.stopPropagation(); return;
  }
  const versionDiffDownload=e.target.closest('[data-version-diff-download]');
  if(versionDiffDownload && sideList.contains(versionDiffDownload)){
    if(!guardAdmin()) return;
    const diff=sanitizeInternalAuditExport(getCurrentVersionDiff());
    download('report-version-diff.json',JSON.stringify(diff,null,2),'application/json;charset=utf-8');
    toast('Version diff JSON downloaded');
    e.stopPropagation(); return;
  }
  const versionRestorePreview=e.target.closest('[data-version-restore-preview]');
  if(versionRestorePreview && sideList.contains(versionRestorePreview)){
    if(!guardAdmin()) return;
    openRestoreVersionPreview();
    e.stopPropagation(); return;
  }
  const versionDiffBaseline=e.target.closest('[data-version-diff-baseline]');
  if(versionDiffBaseline && sideList.contains(versionDiffBaseline)){
    if(!guardAdmin()) return;
    VERSION_DIFF_BASELINE_REPORT=normalizeReport(clone(REPORT));
    VERSION_DIFF_BASELINE=createReportVersionSnapshot(REPORT);
    renderSide();
    toast('Version diff baseline updated');
    e.stopPropagation(); return;
  }
  const retentionPreview=e.target.closest('[data-retention-preview]');
  if(retentionPreview && sideList.contains(retentionPreview)){
    if(!guardAdmin()) return;
    const versions=localReportVersionsForRetention(REPORT);
    const policy=normalizeVersionRetentionPolicy(REPORT);
    const preview=buildVersionCleanupPreview(REPORT,versions,policy);
    appendAiAuditEvent(REPORT,createVersionCleanupAuditEvent({reportData:REPORT,action:'version_cleanup_previewed',versionIds:preview.versions.map(item=>item.versionId),reason:'Preview-only retention review',retentionPolicySnapshot:policy}));
    renderSide();
    toast(`Cleanup preview: ${preview.cleanupCandidates} cleanup candidate(s), ${preview.protectedVersions} protected`);
    e.stopPropagation(); return;
  }
  const retentionPin=e.target.closest('[data-retention-pin]');
  if(retentionPin && sideList.contains(retentionPin)){
    if(!guardAdmin()) return;
    pinVersionForRetention(REPORT,retentionPin.dataset.retentionPin);
    renderSide();
    toast('Version pinned');
    e.stopPropagation(); return;
  }
  const retentionUnpin=e.target.closest('[data-retention-unpin]');
  if(retentionUnpin && sideList.contains(retentionUnpin)){
    if(!guardAdmin()) return;
    unpinVersionForRetention(REPORT,retentionUnpin.dataset.retentionUnpin);
    renderSide();
    toast('Version unpinned');
    e.stopPropagation(); return;
  }
  const openOnboarding=e.target.closest('[data-open-onboarding]');
  if(openOnboarding && sideList.contains(openOnboarding)){
    if(!canCurrentUserRunOnboarding(REPORT)){toast('Only owner can run workspace setup by default.'); e.stopPropagation(); return;}
    openOnboardingWizard('welcome');
    e.stopPropagation(); return;
  }
  const firstReportShow=e.target.closest('[data-first-report-show]');
  if(firstReportShow && sideList.contains(firstReportShow)){
    if(!guardAdmin()) return;
    const flow=normalizeFirstReportFlowState(REPORT);
    flow.enabled=true; flow.dismissed=false; flow.dismissedAt=null; flow.updatedAt=new Date().toISOString();
    renderSide(); toast('First report guide shown'); e.stopPropagation(); return;
  }
  const firstReportAction=e.target.closest('[data-first-report-action]');
  if(firstReportAction && sideList.contains(firstReportAction)){
    performFirstReportAction(firstReportAction.dataset.firstReportAction);
    e.stopPropagation(); return;
  }
  const firstReportUpload=e.target.closest('[data-first-report-upload]');
  if(firstReportUpload && sideList.contains(firstReportUpload)){if(!guardAdmin()) return; openDataModal(); e.stopPropagation(); return;}
  const firstReportPaste=e.target.closest('[data-first-report-paste]');
  if(firstReportPaste && sideList.contains(firstReportPaste)){if(!guardAdmin()) return; openPasteModal(); e.stopPropagation(); return;}
  const firstReportFolder=e.target.closest('[data-first-report-folder]');
  if(firstReportFolder && sideList.contains(firstReportFolder)){if(!guardAdmin()) return; pickAndConnectFolder(); e.stopPropagation(); return;}
  const firstReportSkip=e.target.closest('[data-first-report-skip]');
  if(firstReportSkip && sideList.contains(firstReportSkip)){
    if(!guardAdmin()) return;
    const flow=normalizeFirstReportFlowState(REPORT);
    const stepId=firstReportSkip.dataset.firstReportSkip;
    if(FIRST_REPORT_STEPS.includes(stepId) && !flow.skippedStepIds.includes(stepId)) flow.skippedStepIds.push(stepId);
    flow.currentStepId=getNextRecommendedFirstReportStep(REPORT);
    flow.updatedAt=new Date().toISOString();
    renderSide(); toast('Guide step skipped'); e.stopPropagation(); return;
  }
  const firstReportHide=e.target.closest('[data-first-report-hide]');
  if(firstReportHide && sideList.contains(firstReportHide)){
    if(!guardAdmin()) return;
    const flow=normalizeFirstReportFlowState(REPORT);
    flow.dismissed=true; flow.dismissedAt=new Date().toISOString(); flow.updatedAt=flow.dismissedAt;
    renderSide(); toast('First report guide hidden'); e.stopPropagation(); return;
  }
  const governanceSave=e.target.closest('[data-governance-save]');
  if(governanceSave && sideList.contains(governanceSave)){
    if(!canCurrentUserManageGovernance(REPORT)){toast('Only owner can manage governance settings by default.'); e.stopPropagation(); return;}
    const result=updateGovernanceSettings(REPORT,getGovernanceSettings(REPORT));
    if(!result.ok){toast(result.errors?.[0]||'Governance settings rejected'); e.stopPropagation(); return;}
    renderSide();
    toast('Governance settings saved');
    e.stopPropagation(); return;
  }
  const governanceReset=e.target.closest('[data-governance-reset]');
  if(governanceReset && sideList.contains(governanceReset)){
    if(!canCurrentUserManageGovernance(REPORT)){toast('Only owner can manage governance settings by default.'); e.stopPropagation(); return;}
    if(!confirmI18n('Reset governance settings to safe defaults?')){e.stopPropagation(); return;}
    REPORT.governanceSettings=createDefaultGovernanceSettings();
    normalizeGovernanceSettings(REPORT);
    appendAiAuditEvent(REPORT,createAiAuditEvent(REPORT,{eventType:'governance_settings_reset_to_defaults',provider:'local',providerMode:'disabled',generatedBy:'manual',notes:'Governance settings reset to safe defaults.'}));
    renderSide();
    toast('Governance settings reset');
    e.stopPropagation(); return;
  }
  const qDetail=e.target.closest('[data-aiq-detail]');
  if(qDetail && sideList.contains(qDetail)){
    const item=getAiReviewQueueItemById(REPORT,qDetail.dataset.aiqDetail);
    if(item) openModal('AI suggestion details',`<pre style="white-space:pre-wrap;max-height:50vh;overflow:auto">${esc(JSON.stringify(item,null,2))}</pre>`,'<button class="btn primary" id="closeAiQueueDetails">Close</button>'),$('closeAiQueueDetails').onclick=closeModal;
    e.stopPropagation(); return;
  }
  const qEdit=e.target.closest('[data-aiq-edit]');
  if(qEdit && sideList.contains(qEdit)){
    if(!guardAdmin()) return;
    const item=getAiReviewQueueItemById(REPORT,qEdit.dataset.aiqEdit);
    if(item) openModal('Edit AI suggestion',`<div class="formGrid"><div class="field full"><label>Title</label><input id="aiqTitle" value="${esc(item.title)}"></div><div class="field full"><label>Summary</label><textarea id="aiqSummary" rows="3">${esc(item.summary)}</textarea></div><div class="field full"><label>Text / claim / recommendation</label><textarea id="aiqText" rows="4">${esc(item.payload.claim||item.payload.recommendation||item.payload.text||item.payload.description||'')}</textarea></div><div class="field full"><label>Analyst notes</label><textarea id="aiqNotes" rows="3">${esc(item.analystNotes)}</textarea></div></div>`,'<button class="btn" id="cancelAiqEdit">Cancel</button><button class="btn primary" id="saveAiqEdit">Save</button>'),$('cancelAiqEdit').onclick=closeModal,$('saveAiqEdit').onclick=()=>{const payload={...item.payload}; const text=$('aiqText').value; if(item.suggestionType==='evidence_candidate') payload.claim=text; else if(item.suggestionType==='recommendation') payload.recommendation=text; else if(['executive_summary','section_draft'].includes(item.suggestionType)) payload.text=text; else if(item.suggestionType==='source_coverage_gap') payload.description=text; editAiReviewQueueItem(REPORT,item.id,{title:$('aiqTitle').value,summary:$('aiqSummary').value,analystNotes:$('aiqNotes').value,payload}); refresh(); closeModal(); toast('Suggestion updated');};
    e.stopPropagation(); return;
  }
  const qAccept=e.target.closest('[data-aiq-accept]');
  if(qAccept && sideList.contains(qAccept)){if(!guardAdmin()) return; acceptAiReviewQueueItem(REPORT,qAccept.dataset.aiqAccept); refresh(); toast('Suggestion accepted'); e.stopPropagation(); return;}
  const qReject=e.target.closest('[data-aiq-reject]');
  if(qReject && sideList.contains(qReject)){if(!guardAdmin()) return; const reason=promptI18n('Optional rejection reason','')||''; rejectAiReviewQueueItem(REPORT,qReject.dataset.aiqReject,reason); refresh(); toast('Suggestion rejected'); e.stopPropagation(); return;}
  const qConvert=e.target.closest('[data-aiq-convert]');
  if(qConvert && sideList.contains(qConvert)){if(!guardAdmin()) return; acceptAiReviewQueueItem(REPORT,qConvert.dataset.aiqConvert); const result=convertAcceptedSuggestion(REPORT,qConvert.dataset.aiqConvert); refresh(); toast(result.converted?'Suggestion converted for review':(result.error||'Could not convert suggestion')); e.stopPropagation(); return;}
  const reviewStatusBtn=e.target.closest('[data-review-status]');
  if(reviewStatusBtn && sideList.contains(reviewStatusBtn)){
    if(!guardAdmin()) return;
    const cardId=reviewStatusBtn.dataset.id;
    const notes=sideList.querySelector(`[data-review-notes="${CSS.escape(cardId)}"]`)?.value||'';
    const status=reviewStatusBtn.dataset.reviewStatus;
    let card=null;
    if(status==='approved') card=approveEvidenceCard(REPORT,cardId);
    else if(status==='needs_review') card=markEvidenceNeedsReview(REPORT,cardId);
    else if(status==='rejected') card=rejectEvidenceCard(REPORT,cardId);
    if(card){
      updateEvidenceAnalystNotes(REPORT,cardId,notes);
      if(status==='rejected') updateEvidenceCard(REPORT,cardId,{rejectionReason:notes});
      refresh();
      toast(`Evidence marked ${status.replace(/_/g,' ')}`);
    }
    e.stopPropagation();
    return;
  }
  const reviewSave=e.target.closest('[data-review-save]');
  if(reviewSave && sideList.contains(reviewSave)){
    if(!guardAdmin()) return;
    const cardId=reviewSave.dataset.reviewSave;
    const notes=sideList.querySelector(`[data-review-notes="${CSS.escape(cardId)}"]`)?.value||'';
    updateEvidenceAnalystNotes(REPORT,cardId,notes);
    const card=getEvidenceCardById(REPORT,cardId);
    if(card?.reviewStatus==='rejected') updateEvidenceCard(REPORT,cardId,{rejectionReason:notes});
    refresh();
    toast('Review notes saved');
    e.stopPropagation();
    return;
  }
  const draftBuild=e.target.closest('[data-draft-build]');
  if(draftBuild && sideList.contains(draftBuild)){
    if(!guardAdmin()) return;
    const approved=getApprovedEvidenceCards(REPORT);
    if(!approved.length){toast('Approve evidence cards first, then build a draft report.'); e.stopPropagation(); return;}
    const result=buildRuleBasedReportDraft(REPORT);
    refresh();
    toast(result.blocksCreated?`Built ${result.blocksCreated} draft blocks`:'No draft blocks created');
    e.stopPropagation();
    return;
  }
  const draftClear=e.target.closest('[data-draft-clear]');
  if(draftClear && sideList.contains(draftClear)){
    if(!guardAdmin()) return;
    const removed=clearGeneratedDraftBlocks(REPORT);
    refresh();
    toast(removed?`Cleared ${removed} generated draft blocks`:'No generated draft blocks to clear');
    e.stopPropagation();
    return;
  }
  const sourceRefresh=e.target.closest('[data-source-refresh]');
  if(sourceRefresh && sideList.contains(sourceRefresh)){if(!guardAdmin()) return; collectMaterialsFromCurrentState(REPORT,state.fsRoots); buildSourcesFromMaterials(REPORT); refresh(); toast('Sources refreshed from materials'); e.stopPropagation(); return;}
  const aiPreview=e.target.closest('[data-ai-preview-candidates]');
  if(aiPreview && sideList.contains(aiPreview)){
    if(!guardAdmin()) return;
    const result=await requestEvidenceCandidatePreview({mode:state.aiStatus?.currentMode||'dry_run'});
    if(!result.ok){toast(result.errors?.[0]||'AI preview is unavailable.'); e.stopPropagation(); return;}
    refresh();
    toast(result.output.candidates.length?`Previewed ${result.output.candidates.length} candidate evidence item${result.output.candidates.length===1?'':'s'}`:'No evidence candidates found');
    e.stopPropagation();
    return;
  }
  const aiAdd=e.target.closest('[data-ai-add-candidates]');
  if(aiAdd && sideList.contains(aiAdd)){
    if(!guardAdmin()) return;
    const ids=[...sideList.querySelectorAll('[data-ai-candidate-check]:checked')].map(input=>input.dataset.aiCandidateCheck).filter(Boolean);
    if(!ids.length){toast('Select candidate evidence first.'); e.stopPropagation(); return;}
    const result=addSelectedEvidenceCandidates(REPORT,ids);
    if(result.errors?.length){toast(result.errors[0]); e.stopPropagation(); return;}
    refresh();
    toast(`Added ${result.added} candidate${result.added===1?'':'s'} to Evidence Cards for review`);
    e.stopPropagation();
    return;
  }
  const aiQueueCandidates=e.target.closest('[data-ai-queue-candidates]');
  if(aiQueueCandidates && sideList.contains(aiQueueCandidates)){if(!guardAdmin()) return; const ids=[...sideList.querySelectorAll('[data-ai-candidate-check]:checked')].map(input=>input.dataset.aiCandidateCheck).filter(Boolean); if(!ids.length){toast('Select candidate evidence first.'); e.stopPropagation(); return;} const added=queueSelectedPreviewItems(REPORT,'evidence_candidate',ids); refresh(); toast(`Queued ${added.length} suggestion${added.length===1?'':'s'} for review`); e.stopPropagation(); return;}
  const aiRecommendations=e.target.closest('[data-ai-preview-recommendations]');
  if(aiRecommendations && sideList.contains(aiRecommendations)){
    if(!guardAdmin()) return;
    const result=await requestRecommendationPreview({mode:state.aiStatus?.currentMode||'dry_run'});
    if(!result.ok){toast(result.errors?.[0]||'AI recommendation preview is unavailable.'); e.stopPropagation(); return;}
    refresh();
    toast(result.output.recommendations.length?`Previewed ${result.output.recommendations.length} recommendation${result.output.recommendations.length===1?'':'s'}`:'No recommendations suggested');
    e.stopPropagation();
    return;
  }
  const aiAddRecommendations=e.target.closest('[data-ai-add-recommendations]');
  if(aiAddRecommendations && sideList.contains(aiAddRecommendations)){
    if(!guardAdmin()) return;
    const ids=[...sideList.querySelectorAll('[data-ai-recommendation-check]:checked')].map(input=>input.dataset.aiRecommendationCheck).filter(Boolean);
    if(!ids.length){toast('Select recommendation suggestions first.'); e.stopPropagation(); return;}
    const result=addSelectedRecommendationsToDraft(REPORT,ids);
    if(result.errors?.length){toast(result.errors[0]); e.stopPropagation(); return;}
    refresh();
    toast(`Added ${result.added} recommendation${result.added===1?'':'s'} to draft for review`);
    e.stopPropagation();
    return;
  }
  const aiQueueRecommendations=e.target.closest('[data-ai-queue-recommendations]');
  if(aiQueueRecommendations && sideList.contains(aiQueueRecommendations)){if(!guardAdmin()) return; const ids=[...sideList.querySelectorAll('[data-ai-recommendation-check]:checked')].map(input=>input.dataset.aiRecommendationCheck).filter(Boolean); if(!ids.length){toast('Select recommendation suggestions first.'); e.stopPropagation(); return;} const added=queueSelectedPreviewItems(REPORT,'recommendation',ids); refresh(); toast(`Queued ${added.length} suggestion${added.length===1?'':'s'} for review`); e.stopPropagation(); return;}
  const aiSummary=e.target.closest('[data-ai-preview-summary]');
  if(aiSummary && sideList.contains(aiSummary)){
    if(!guardAdmin()) return;
    const result=await requestExecutiveSummaryPreview({mode:state.aiStatus?.currentMode||'dry_run'});
    if(!result.ok){toast(result.errors?.[0]||'AI executive summary preview is unavailable.'); e.stopPropagation(); return;}
    refresh();
    toast(result.output.summaryBlocks.length?`Previewed ${result.output.summaryBlocks.length} summary block${result.output.summaryBlocks.length===1?'':'s'}`:'No summary blocks suggested');
    e.stopPropagation();
    return;
  }
  const aiAddSummary=e.target.closest('[data-ai-add-summary]');
  if(aiAddSummary && sideList.contains(aiAddSummary)){
    if(!guardAdmin()) return;
    const ids=[...sideList.querySelectorAll('[data-ai-summary-check]:checked')].map(input=>input.dataset.aiSummaryCheck).filter(Boolean);
    if(!ids.length){toast('Select summary blocks first.'); e.stopPropagation(); return;}
    const result=addSelectedSummaryBlocksToDraft(REPORT,ids);
    if(result.errors?.length){toast(result.errors[0]); e.stopPropagation(); return;}
    refresh();
    toast(`Added ${result.added} summary block${result.added===1?'':'s'} to draft for review`);
    e.stopPropagation();
    return;
  }
  const aiQueueSummary=e.target.closest('[data-ai-queue-summary]');
  if(aiQueueSummary && sideList.contains(aiQueueSummary)){if(!guardAdmin()) return; const ids=[...sideList.querySelectorAll('[data-ai-summary-check]:checked')].map(input=>input.dataset.aiSummaryCheck).filter(Boolean); if(!ids.length){toast('Select summary blocks first.'); e.stopPropagation(); return;} const added=queueSelectedPreviewItems(REPORT,'executive_summary',ids); refresh(); toast(`Queued ${added.length} suggestion${added.length===1?'':'s'} for review`); e.stopPropagation(); return;}
  const aiCoverage=e.target.closest('[data-ai-preview-coverage]');
  if(aiCoverage && sideList.contains(aiCoverage)){
    if(!guardAdmin()) return;
    const result=await requestSourceCoveragePreview({mode:state.aiStatus?.currentMode||'dry_run'});
    if(!result.ok){toast(result.errors?.[0]||'AI source coverage preview is unavailable.'); e.stopPropagation(); return;}
    refresh();
    toast(`Coverage preview: ${result.output.overallCoverageStatus} (${result.output.coverageScore}%)`);
    e.stopPropagation();
    return;
  }
  const aiAddGaps=e.target.closest('[data-ai-add-gaps]');
  if(aiAddGaps && sideList.contains(aiAddGaps)){
    if(!guardAdmin()) return;
    const ids=[...sideList.querySelectorAll('[data-ai-gap-check]:checked')].map(input=>input.dataset.aiGapCheck).filter(Boolean);
    if(!ids.length){toast('Select coverage gaps first.'); e.stopPropagation(); return;}
    const result=addSelectedCoverageGapsToSuggestions(REPORT,ids);
    if(result.errors?.length){toast(result.errors[0]); e.stopPropagation(); return;}
    refresh();
    toast(`Added ${result.added} coverage gap${result.added===1?'':'s'} for review`);
    e.stopPropagation();
    return;
  }
  const aiQueueGaps=e.target.closest('[data-ai-queue-gaps]');
  if(aiQueueGaps && sideList.contains(aiQueueGaps)){if(!guardAdmin()) return; const ids=[...sideList.querySelectorAll('[data-ai-gap-check]:checked')].map(input=>input.dataset.aiGapCheck).filter(Boolean); if(!ids.length){toast('Select coverage gaps first.'); e.stopPropagation(); return;} const added=queueSelectedPreviewItems(REPORT,'source_coverage_gap',ids); refresh(); toast(`Queued ${added.length} suggestion${added.length===1?'':'s'} for review`); e.stopPropagation(); return;}
  const aiSectionDraft=e.target.closest('[data-ai-preview-section-draft]');
  if(aiSectionDraft && sideList.contains(aiSectionDraft)){
    if(!guardAdmin()) return;
    const result=await requestSectionDraftPreview({selectedSectionId:state.aiSectionId,mode:state.aiStatus?.currentMode||'dry_run'});
    if(!result.ok){toast(result.errors?.[0]||'AI section draft preview is unavailable.'); e.stopPropagation(); return;}
    refresh();
    toast(result.output.draftBlocks.length?`Previewed ${result.output.draftBlocks.length} section draft block${result.output.draftBlocks.length===1?'':'s'}`:'No section draft blocks suggested');
    e.stopPropagation();
    return;
  }
  const aiAddSectionBlocks=e.target.closest('[data-ai-add-section-blocks]');
  if(aiAddSectionBlocks && sideList.contains(aiAddSectionBlocks)){
    if(!guardAdmin()) return;
    const ids=[...sideList.querySelectorAll('[data-ai-section-block-check]:checked')].map(input=>input.dataset.aiSectionBlockCheck).filter(Boolean);
    if(!ids.length){toast('Select section draft blocks first.'); e.stopPropagation(); return;}
    const result=addSelectedSectionDraftBlocks(REPORT,ids);
    if(result.errors?.length){toast(result.errors[0]); e.stopPropagation(); return;}
    refresh();
    toast(`Added ${result.added} section draft block${result.added===1?'':'s'} for review`);
    e.stopPropagation();
    return;
  }
  const aiQueueSectionBlocks=e.target.closest('[data-ai-queue-section-blocks]');
  if(aiQueueSectionBlocks && sideList.contains(aiQueueSectionBlocks)){if(!guardAdmin()) return; const ids=[...sideList.querySelectorAll('[data-ai-section-block-check]:checked')].map(input=>input.dataset.aiSectionBlockCheck).filter(Boolean); if(!ids.length){toast('Select section draft blocks first.'); e.stopPropagation(); return;} const added=queueSelectedPreviewItems(REPORT,'section_draft',ids); refresh(); toast(`Queued ${added.length} suggestion${added.length===1?'':'s'} for review`); e.stopPropagation(); return;}
  const evidenceAdd=e.target.closest('[data-evidence-add]');
  if(evidenceAdd && sideList.contains(evidenceAdd)){if(!guardAdmin()) return; openEvidenceCardModal(); e.stopPropagation(); return;}
  const evidenceEdit=e.target.closest('[data-evidence-edit]');
  if(evidenceEdit && sideList.contains(evidenceEdit)){if(!guardAdmin()) return; openEvidenceCardModal(evidenceEdit.dataset.evidenceEdit); e.stopPropagation(); return;}
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
function evidenceCardFormHtml(card){
  normalizeReportSchema(REPORT);
  normalizeSourceRegistry(REPORT);
  const sections=REPORT.reportSections||[];
  const sources=REPORT.sourceRegistry?.items||[];
  const sourceIds=new Set(card.sourceIds||[]);
  const missingSourceIds=[...sourceIds].filter(id=>!sources.some(source=>source.id===id));
  const sectionOptions=[
    `<option value="">Unlinked section</option>`,
    ...sections.map(section=>`<option value="${esc(section.id)}" ${card.sectionId===section.id?'selected':''}>${esc(section.title)}</option>`)
  ].join('');
  const sourceOptions=[
    ...sources.map(source=>`<option value="${esc(source.id)}" ${sourceIds.has(source.id)?'selected':''}>${esc(source.title)}</option>`),
    ...missingSourceIds.map(id=>`<option value="${esc(id)}" selected>Missing source: ${esc(id)}</option>`)
  ].join('');
  return `<div class="formGrid">
    <div class="field full"><label>Claim</label><input id="evidenceClaim" value="${esc(card.claim)}" placeholder="Short evidence-backed claim"></div>
    <div class="field full"><label>Summary</label><textarea id="evidenceSummary" rows="3" placeholder="Brief context or supporting detail">${esc(card.summary)}</textarea></div>
    <div class="field"><label>Report section</label><select id="evidenceSection">${sectionOptions}</select></div>
    <div class="field"><label>Evidence type</label><select id="evidenceType">${EVIDENCE_TYPES.map(type=>`<option value="${esc(type)}" ${card.evidenceType===type?'selected':''}>${esc(type.replace(/_/g,' '))}</option>`).join('')}</select></div>
    <div class="field full"><label>Sources</label><select id="evidenceSources" multiple size="6">${sourceOptions||'<option disabled>No sources available yet</option>'}</select><div class="itemMeta">Hold Ctrl or Cmd to select multiple sources.</div></div>
    <div class="field"><label>Review status</label><select id="evidenceReview">${EVIDENCE_REVIEW_STATUS.map(status=>`<option value="${esc(status)}" ${card.reviewStatus===status?'selected':''}>${esc(status)}</option>`).join('')}</select></div>
    <div class="field"><label>Confidence</label><select id="evidenceConfidence">${EVIDENCE_CONFIDENCE_STATUS.map(status=>`<option value="${esc(status)}" ${card.confidenceStatus===status?'selected':''}>${esc(status)}</option>`).join('')}</select></div>
    <div class="field"><label>Credibility</label><select id="evidenceCredibility">${EVIDENCE_CREDIBILITY_STATUS.map(status=>`<option value="${esc(status)}" ${card.credibilityStatus===status?'selected':''}>${esc(status)}</option>`).join('')}</select></div>
    <div class="field"><label>Company / competitor ID</label><input id="evidenceCompany" value="${esc(card.companyId||card.competitorId||'')}" placeholder="Optional"></div>
    <div class="field full"><label>Analyst notes</label><textarea id="evidenceNotes" rows="3" placeholder="Internal notes, caveats, or review comments">${esc(card.analystNotes)}</textarea></div>
  </div>`;
}
function readEvidenceCardForm(existing){
  const sourceIds=[...($('evidenceSources')?.selectedOptions||[])].map(option=>option.value).filter(Boolean);
  const sourceMap=new Map((normalizeSourceRegistry(REPORT).items||[]).map(source=>[source.id,source]));
  const materialIds=[...new Set(sourceIds.map(id=>sourceMap.get(id)?.materialId).filter(Boolean))];
  const companyId=String($('evidenceCompany')?.value||'').trim();
  return createEvidenceCard({
    ...(existing||{}),
    claim:String($('evidenceClaim')?.value||'').trim(),
    summary:String($('evidenceSummary')?.value||'').trim(),
    sourceIds,
    sectionId:String($('evidenceSection')?.value||''),
    materialIds,
    companyId,
    competitorId:companyId,
    evidenceType:String($('evidenceType')?.value||'observation'),
    reviewStatus:String($('evidenceReview')?.value||'draft'),
    confidenceStatus:String($('evidenceConfidence')?.value||'unknown'),
    credibilityStatus:String($('evidenceCredibility')?.value||'unreviewed'),
    analystNotes:String($('evidenceNotes')?.value||'').trim(),
    id:existing?.id||uid('evidence'),
    createdAt:existing?.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
}
function openEvidenceCardModal(cardId){
  const existing=cardId?getEvidenceCardById(REPORT,cardId):null;
  const card=existing?normalizeEvidenceCardItem(existing):createEvidenceCard();
  const deleteButton=existing?`<button class="btn danger" id="deleteEvidenceCard">Delete</button>`:'';
  openModal(existing?'Edit evidence card':'Add evidence card', evidenceCardFormHtml(card), `${deleteButton}<button class="btn" id="cancelEvidenceCard">Cancel</button><button class="btn primary" id="saveEvidenceCard">Save evidence card</button>`);
  $('cancelEvidenceCard').onclick=closeModal;
  $('saveEvidenceCard').onclick=()=>{
    const next=readEvidenceCardForm(existing);
    const registry=normalizeEvidenceCards(REPORT);
    if(existing) updateEvidenceCard(REPORT,existing.id,next);
    else registry.items.push(next);
    registry.updatedAt=new Date().toISOString();
    refresh();
    closeModal();
    toast('Evidence card saved');
  };
  $('deleteEvidenceCard')?.addEventListener('click',()=>{
    if(!existing) return;
    deleteEvidenceCard(REPORT,existing.id);
    refresh();
    closeModal();
    toast('Evidence card deleted');
  });
}
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
  const quality=runReportQualityChecklist(REPORT);
  if(quality.blockers.length){
    showNotice(`Client export blocked: ${quality.blockers[0].message}`,'error');
    toast('Fix export blockers before client export');
    return;
  }
  if(quality.warnings.length) showNotice(`Client export has warnings: ${quality.warnings[0].message}`,'info');
  const titleBase=(REPORT.meta.title||'marketing-report-client').replace(/[^a-z0-9а-яіїєґ_-]+/gi,'-');
  const oldAccess=state.access;
  const oldMetaAccess=REPORT.meta.accessMode;
  const oldData=$('reportData').textContent;
  const oldDataset=state.activeDataset;

  try{
    toast('Готую архів для клієнта...');
    let {report:packedReport, zipEntries}=await buildClientBundleFromFs(exportReportSnapshot());
    packedReport=prepareClientExportReportV2(packedReport);
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
    REPORT.meta.clientExportedAt=new Date().toISOString();
    markFirstReportStepComplete(REPORT,'exportClientReport');
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
async function saveClientPackage(){
  if(!guardAdmin()) return;
  const quality=runReportQualityChecklist(REPORT);
  if(quality.blockers.length){
    showNotice(t('clientPackageBlocked',{message:translateText(quality.blockers[0].message)}),'error');
    toast(t('fixClientPackageBlockers'));
    return;
  }
  if(quality.warnings.length) showNotice(t('clientPackageWarnings',{message:translateText(quality.warnings[0].message)}),'info');
  const titleBase=(REPORT.meta.title||'marketing-report-client-package').replace(/[^a-z0-9Р°-СЏС–С—С”Т‘_-]+/gi,'-');
  const oldAccess=state.access;
  const oldMetaAccess=REPORT.meta.accessMode;
  const oldData=$('reportData').textContent;
  const oldDataset=state.activeDataset;

  try{
    if(typeof JSZip==='undefined') throw new Error(t('jszipClientPackageUnavailable'));
    toast(t('preparingClientPackage'));
    let {report:packedReport, zipEntries}=await buildClientBundleFromFs(exportReportSnapshot());
    packedReport=sanitizeClientExportData(packedReport);
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

    const blob=await buildClientPackageZip(packedReport, html, zipEntries);
    download(`${titleBase}-client-package.zip`, blob, 'application/zip');
    REPORT.meta.clientPackageExportedAt=new Date().toISOString();
    markFirstReportStepComplete(REPORT,'exportClientReport');
    toast(t('clientPackageCreated',{files:zipEntries.length}));
  }catch(e){
    console.error(e);
    toast(e?.message||t('couldNotBuildClientPackage'));
  }finally{
    state.access=oldAccess;
    REPORT.meta.accessMode=oldMetaAccess;
    app.dataset.access=oldAccess;
    $('reportData').textContent=oldData;
    persistNow();
    refresh();
  }
}
async function exportInternalAuditPackage(){
  if(!guardAdmin()) return;
  if(isClientLocked()){toast(t('internalAuditUnavailableClientLocked')); return;}
  if(!confirmI18n(t('internalAuditConfirm'))) return;
  const titleBase=(REPORT.meta.title||'marketing-report-internal-audit').replace(/[^a-z0-9а-яіїєґ_-]+/gi,'-');
  try{
    toast(t('buildingInternalAuditPackage'));
    const blob=await buildInternalAuditPackage(exportReportSnapshot());
    download(`${titleBase}-internal-audit-package.zip`, blob, 'application/zip');
    toast(t('internalAuditPackageExported'));
  }catch(e){
    console.error(e);
    showNotice(t('internalAuditPackageFailed',{message:e?.message||e}),'error');
    toast(e?.message||t('couldNotBuildInternalAuditPackage'));
  }
}
function exportJson(){if(!guardAdmin()) return; const snapshot=persistedReportSnapshot(); download('ci-os-unified-data.json',JSON.stringify(snapshot.ci,null,2),'application/json;charset=utf-8')}
function setupResizers(){
  const layout=$('layout');
  let drag=null;
  let frame=null;
  let lastPointer=null;
  const applyDrag=()=>{
    frame=null;
    if(!drag || !lastPointer) return;
    const r=layout.getBoundingClientRect();
    if(drag==='x'){
      const side=Math.min(520,Math.max(220,r.right-lastPointer.clientX-10));
      document.documentElement.style.setProperty('--side',side+'px');
    }else{
      const top=Math.min(90,Math.max(15,((lastPointer.clientY-r.top)/r.height)*100));
      document.documentElement.style.setProperty('--top',top+'%');
    }
  };
  const queueDrag=e=>{
    lastPointer={clientX:e.clientX,clientY:e.clientY};
    if(!frame) frame=requestAnimationFrame(applyDrag);
  };
  $('splitX').addEventListener('pointerdown',e=>{drag='x'; e.preventDefault(); queueDrag(e);});
  $('splitY').addEventListener('pointerdown',e=>{drag='y'; e.preventDefault(); queueDrag(e);});
  window.addEventListener('pointermove',e=>{if(!drag) return; queueDrag(e);});
  window.addEventListener('pointerup',()=>{
    if(frame){cancelAnimationFrame(frame); applyDrag();}
    drag=null;
    lastPointer=null;
  });
}
async function openMembersModal(){
  if(cloudSync.role!=='owner'){toast('Керування користувачами доступне лише власнику');return;}
  openModal('Користувачі спільного звіту','<div class="empty">Завантаження…</div>','<button class="btn" id="cancelModal">Закрити</button><button class="btn primary" id="saveMember">Додати / оновити</button>');
  $('cancelModal').onclick=closeModal;
  try{
    const payload=await cloudApi('/api/members');
    const rows=(payload.members||[]).map(m=>`<tr><td>${esc(m.email)}</td><td>${esc(m.displayName||'')}</td><td><span class="pill">${esc(m.role)}</span></td></tr>`).join('');
    $('modalBody').innerHTML=translateText(`<div class="formGrid"><div class="field"><label>Email</label><input id="memberEmail" type="email" placeholder="user@example.com"></div><div class="field"><label>Роль</label><select id="memberRole"><option value="editor">editor</option><option value="viewer">viewer</option><option value="owner">owner</option></select></div><div class="field full"><div class="hintBox">Користувач також має бути дозволений у політиці Cloudflare Access. Роль тут визначає права всередині робочого простору.</div></div><div class="field full"><div style="overflow:auto"><table class="previewTable"><thead><tr><th>Email</th><th>Ім'я</th><th>Роль</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Немає користувачів</td></tr>'}</tbody></table></div></div></div>`);
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
    $('modalBody').innerHTML=translateText(`<div class="empty">${esc(e.message||'Не вдалося завантажити користувачів')}</div>`);
    $('saveMember').disabled=true;
  }
}
function toggleEditMode(){
  const currentLang=state.lang==='en'?'en':'uk';
  if(isClientLocked()){toast(t('clientLockedEditUnavailable'));return;}
  if(HOSTED_MODE&&!BROWSER_ONLY_MODE&&cloudSync.ready&&!cloudCanWrite()){toast(t('viewerRoleOnly'));return;}
  if(HOSTED_MODE&&!BROWSER_ONLY_MODE&&!cloudSync.ready){toast(t('sharedStorageRequired'));return;}
  state.lang=currentLang;
  REPORT.meta=REPORT.meta||{};
  REPORT.meta.lang=currentLang;
  state.access=state.access==='viewer'?'admin':'viewer';
  REPORT.meta.accessMode=state.access;
  refresh();
  toast(state.access==='admin'?t('editModeEnabled'):t('viewModeEnabled'));
}
function bind(){
  $('pasteBtn').onclick=()=>openDataModal(); $('uploadFilesBtn').onclick=()=>$('fileInput').click(); $('connectFolderBtn').onclick=()=>pickAndConnectFolder(); $('saveDiskBtn').onclick=()=>{toast('Зберігаю HTML-файл на диск...'); saveProjectHtmlOnly();}; $('saveHtmlBtn').onclick=saveHtml; $('saveClientHtmlBtn').onclick=saveClientHtml; $('saveClientPackageBtn').onclick=saveClientPackage; $('internalAuditPackageBtn').onclick=exportInternalAuditPackage; $('exportJsonBtn').onclick=exportJson; $('membersBtn').onclick=openMembersModal; $('clearReaderBtn').onclick=()=>{state.openTabs=[]; state.activeFile=null; reader.innerHTML=`<div class="empty">${t('emptyReader')}</div>`; renderReaderTabs(); renderSide();}; $('unlockAdminBtn').onclick=toggleEditMode; $('cloudStatus').onclick=()=>{if(BROWSER_ONLY_MODE){toast('Файли й дані залишаються лише у цьому браузері.');return;} if(cloudSync.conflict){toast('Збережіть свою копію локально, потім перезавантажте сторінку.');return;} if(cloudSync.ready&&cloudSync.dirty){saveReportToCloud();return;} if(cloudSync.ready) reloadCloudReport(); else if(HOSTED_MODE) initCloudSync();}; $('langBtn').onclick=()=>setLanguage(state.lang==='uk'?'en':'uk'); $('themeBtn').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark'; app.dataset.theme=state.theme}; $('modalClose').onclick=closeModal; $('appNoticeClose').onclick=hideNotice; $('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();}); document.addEventListener('keydown',handleModalKeydown); $('fileInput').addEventListener('change',e=>{handleFiles(e.target.files); e.target.value='';}); search.addEventListener('input',scheduleSideSearchRender); sideList.addEventListener('click', onSideListClick);
  sideList.addEventListener('change',e=>{const sel=e.target.closest('[data-ai-section-select]'); if(sel&&sideList.contains(sel)){state.aiSectionId=sel.value||''; renderSide();}});
  $('companyNameInput')?.addEventListener('input',e=>{REPORT.meta=REPORT.meta||{}; REPORT.meta.companyName=String(e.target.value||'').trim(); renderReportTitle(); schedulePersist();});
  renderReportTitle();
  analytics.addEventListener('click',e=>{
    const firstReportAction=e.target.closest('[data-first-report-action]');
    if(firstReportAction){performFirstReportAction(firstReportAction.dataset.firstReportAction);return;}
    if(e.target.closest('[data-first-report-upload]')){openDataModal();return;}
    if(e.target.closest('[data-first-report-paste]')){openPasteModal();return;}
    if(e.target.closest('[data-first-report-folder]')){pickAndConnectFolder();return;}
    if(e.target.closest('[data-first-report-hide]')){const flow=normalizeFirstReportFlowState(REPORT); flow.dismissed=true; flow.dismissedAt=new Date().toISOString(); flow.updatedAt=flow.dismissedAt; refresh(); toast('First report guide hidden'); return;}
    const firstReportSkip=e.target.closest('[data-first-report-skip]');
    if(firstReportSkip){const flow=normalizeFirstReportFlowState(REPORT); const stepId=firstReportSkip.dataset.firstReportSkip; if(FIRST_REPORT_STEPS.includes(stepId)&&!flow.skippedStepIds.includes(stepId)) flow.skippedStepIds.push(stepId); flow.currentStepId=getNextRecommendedFirstReportStep(REPORT); flow.updatedAt=new Date().toISOString(); refresh(); toast('Guide step skipped'); return;}
    if(e.target.closest('[data-open-add]')){openDataModal();return;}
    if(e.target.closest('[data-open-demo]')){loadDemoReport();return;}
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
renderClientExportV2();
fetchAiStatus().then(()=>renderSide()).catch(()=>{state.aiStatus=createDefaultAiStatus(); state.aiStatusLoaded=true; renderSide();});
initCloudSync();
setTimeout(maybeOpenOnboardingWizard,900);
})();
