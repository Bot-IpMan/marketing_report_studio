const HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

const DEFAULT_AI_SERVER_ENABLED = false;
const DEFAULT_AI_PROVIDER = 'dry_run';
const DEFAULT_AI_MODEL = 'gpt-5.5-mini';
const MAX_AI_PREVIEW_PAYLOAD_BYTES = 512 * 1024;
const MAX_AI_SOURCES = 12;
const MAX_AI_MATERIALS = 12;
const MAX_AI_SECTIONS = 12;
const MAX_TEXT_CHARS_PER_SOURCE = 1200;
const ALLOWED_TASK_TYPES = ['extract_evidence_candidates', 'suggest_recommendations', 'improve_executive_summary', 'check_source_coverage', 'suggest_report_sections'];
const EVIDENCE_TYPES = ['fact','metric','quote','observation','comparison','risk','opportunity','recommendation_input'];

const AI_OUTPUT_SCHEMAS = {
  evidence_candidate_schema: {
    name: 'evidence_candidate_schema',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['taskType', 'candidates', 'warnings', 'createdAt'],
      properties: {
        taskType: { type: 'string', enum: ['extract_evidence_candidates'] },
        createdAt: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } },
        candidates: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'claim', 'summary', 'sourceIds', 'materialIds', 'suggestedSectionId', 'evidenceType', 'confidenceStatus', 'credibilityStatus', 'reviewStatus', 'warnings'],
            properties: {
              id: { type: 'string' },
              claim: { type: 'string' },
              summary: { type: 'string' },
              sourceIds: { type: 'array', items: { type: 'string' } },
              materialIds: { type: 'array', items: { type: 'string' } },
              suggestedSectionId: { type: 'string' },
              evidenceType: { type: 'string', enum: EVIDENCE_TYPES },
              confidenceStatus: { type: 'string', enum: ['low', 'medium'] },
              credibilityStatus: { type: 'string', enum: ['unreviewed', 'trusted', 'needs_review', 'weak'] },
              reviewStatus: { type: 'string', enum: ['draft', 'needs_review'] },
              warnings: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  recommendation_suggestion_schema: {
    name: 'recommendation_suggestion_schema',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['taskType', 'recommendations', 'warnings', 'createdAt'],
      properties: {
        taskType: { type: 'string', enum: ['suggest_recommendations'] },
        createdAt: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'title', 'recommendation', 'rationale', 'priority', 'suggestedSectionId', 'evidenceCardIds', 'sourceIds', 'confidenceStatus', 'reviewStatus', 'risks', 'expectedImpact', 'effortLevel', 'warnings'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              recommendation: { type: 'string' },
              rationale: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              suggestedSectionId: { type: 'string' },
              evidenceCardIds: { type: 'array', items: { type: 'string' } },
              sourceIds: { type: 'array', items: { type: 'string' } },
              confidenceStatus: { type: 'string', enum: ['low', 'medium', 'high'] },
              reviewStatus: { type: 'string', enum: ['draft', 'needs_review'] },
              risks: { type: 'array', items: { type: 'string' } },
              expectedImpact: { type: 'string' },
              effortLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
              warnings: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  executive_summary_schema: {
    name: 'executive_summary_schema',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['taskType', 'summaryTitle', 'summaryBlocks', 'keyTakeaways', 'warnings', 'createdAt'],
      properties: {
        taskType: { type: 'string', enum: ['improve_executive_summary'] },
        summaryTitle: { type: 'string' },
        createdAt: { type: 'string' },
        keyTakeaways: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        summaryBlocks: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'heading', 'text', 'importance', 'suggestedSectionId', 'evidenceCardIds', 'sourceIds', 'recommendationIds', 'confidenceStatus', 'reviewStatus', 'warnings'],
            properties: {
              id: { type: 'string' },
              heading: { type: 'string' },
              text: { type: 'string' },
              importance: { type: 'string', enum: ['low', 'medium', 'high'] },
              suggestedSectionId: { type: 'string' },
              evidenceCardIds: { type: 'array', items: { type: 'string' } },
              sourceIds: { type: 'array', items: { type: 'string' } },
              recommendationIds: { type: 'array', items: { type: 'string' } },
              confidenceStatus: { type: 'string', enum: ['low', 'medium', 'high'] },
              reviewStatus: { type: 'string', enum: ['draft', 'needs_review'] },
              warnings: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  source_coverage_schema: {
    name: 'source_coverage_schema',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['taskType', 'overallCoverageStatus', 'coverageScore', 'sectionCoverage', 'coverageGaps', 'weakSources', 'suggestedNextSources', 'warnings', 'createdAt'],
      properties: {
        taskType: { type: 'string', enum: ['check_source_coverage'] },
        overallCoverageStatus: { type: 'string', enum: ['weak', 'partial', 'strong'] },
        coverageScore: { type: 'number', minimum: 0, maximum: 100 },
        createdAt: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } },
        sectionCoverage: { type: 'array', items: { type: 'object' } },
        coverageGaps: { type: 'array', items: { type: 'object' } },
        weakSources: { type: 'array', items: { type: 'object' } },
        suggestedNextSources: { type: 'array', items: { type: 'object' } },
      },
    },
  },
  section_draft_schema: {
    name: 'section_draft_schema',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['taskType', 'sectionId', 'sectionTitle', 'draftBlocks', 'coverageWarnings', 'missingInputs', 'warnings', 'createdAt'],
      properties: {
        taskType: { type: 'string', enum: ['suggest_report_sections'] },
        sectionId: { type: 'string' },
        sectionTitle: { type: 'string' },
        createdAt: { type: 'string' },
        coverageWarnings: { type: 'array', items: { type: 'string' } },
        missingInputs: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        draftBlocks: { type: 'array', items: { type: 'object' } },
      },
    },
  },
};

export async function onRequest(context = {}) {
  return apiDisabled();
}

function handleAiStatus(env) {
  const provider = getAiProvider(env);
  return json({
    ok: true,
    aiEnabled: isAiServerEnabled(env),
    provider: provider.name,
    providerConfigured: isOpenAiProviderConfigured(env),
    availableTasks: ALLOWED_TASK_TYPES,
    dryRunAvailable: true,
    currentMode: isAiServerEnabled(env) ? provider.name : 'dry_run',
  });
}

async function handleAiPreview(request, env) {
  if (request.method !== 'POST') return aiResponse({ ok: false, errorCode: 'invalid_payload', errors: ['Use POST for AI preview.'] }, 405, { Allow: 'POST' });
  const size = Number(request.headers.get('content-length') || 0);
  if (size > MAX_AI_PREVIEW_PAYLOAD_BYTES) return aiResponse({ ok: false, errorCode: 'invalid_payload', errors: ['AI preview payload is too large.'] }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return aiResponse({ ok: false, errorCode: 'invalid_payload', errors: ['AI preview requires a JSON body.'] }, 400);
  }

  const taskType = String(body?.taskType || '');
  const reportData = body?.reportData && typeof body.reportData === 'object' ? body.reportData : {};
  const user = sanitizeUser(body?.user);
  const permission = assertAiExecutionAllowed({ env, user, reportData, taskType, body });
  if (!permission.ok) {
    return aiResponse({
      ok: false,
      aiEnabled: isAiServerEnabled(env),
      provider: getAiProvider(env).name,
      taskType,
      errorCode: permission.code,
      errors: permission.errors,
    }, permission.status);
  }

  const sanitizedInput = sanitizeAiTaskInput(reportData, body?.options || {});
  const provider = getAiProvider(env);
  const result = await runAiTaskWithProvider(provider, taskType, sanitizedInput, body?.options || {});
  return aiResponse(result, result.ok ? 200 : 502);
}

function getAiProvider(env) {
  if (isAiServerEnabled(env) && preferredProvider(env) === 'openai' && isOpenAiProviderConfigured(env)) return createOpenAiProvider(env);
  return createDryRunAiProvider();
}

function createDryRunAiProvider() {
  return {
    name: 'dry_run',
    configured: true,
    async run(taskType, input, options) {
      let output;
      if (taskType === 'extract_evidence_candidates') output = runAiEvidenceCandidateDryRun(input.reportData, options);
      else if (taskType === 'suggest_recommendations') output = runAiRecommendationDryRun(input.reportData, options);
      else if (taskType === 'improve_executive_summary') output = runAiExecutiveSummaryDryRun(input.reportData, options);
      else if (taskType === 'check_source_coverage') output = runAiSourceCoverageDryRun(input.reportData, options);
      else if (taskType === 'suggest_report_sections') output = runAiSectionDraftDryRun(input.reportData, options);
      else return { ok: false, errorCode: 'invalid_task', errors: ['Unsupported AI task.'] };
      const validation = validateOpenAiStructuredOutput(taskType, output, input.reportData);
      if (!validation.ok) return { ok: false, aiEnabled: false, provider: 'dry_run', taskType, suggestions: [], warnings: output.warnings || [], errors: validation.errors, errorCode: 'invalid_structured_output' };
      return convertOpenAiOutputToSuggestions(taskType, output, { provider: 'dry_run', aiEnabled: false });
    },
  };
}

function createOpenAiProvider(env) {
  return {
    name: 'openai',
    configured: isOpenAiProviderConfigured(env),
    async run(taskType, input, options) {
      const schema = schemaForTask(taskType);
      const requestBody = buildOpenAiRequestForTask(taskType, input, schema, env, options);
      const response = await callOpenAiResponsesApi(env, requestBody);
      const output = parseOpenAiStructuredOutput(response);
      const validation = validateOpenAiStructuredOutput(taskType, output, input.reportData);
      if (!validation.ok) return { ok: false, aiEnabled: true, provider: 'openai', taskType, suggestions: [], warnings: [], errors: validation.errors, errorCode: 'invalid_structured_output' };
      return convertOpenAiOutputToSuggestions(taskType, output, { provider: 'openai', aiEnabled: true });
    },
  };
}

async function runAiTaskWithProvider(provider, taskType, input, options = {}) {
  try {
    return await provider.run(taskType, input, sanitizeAiOptions(options));
  } catch {
    return { ok: false, aiEnabled: provider.name === 'openai', provider: provider.name, taskType, suggestions: [], warnings: [], errors: ['AI provider failed.'], errorCode: 'provider_error' };
  }
}

function isOpenAiProviderConfigured(env) {
  return Boolean(String(env?.OPENAI_API_KEY || '').trim());
}

function assertAiExecutionAllowed({ env, user, reportData, taskType, body }) {
  if (!ALLOWED_TASK_TYPES.includes(taskType)) return { ok: false, status: 400, code: 'invalid_task', errors: ['Unsupported AI task type.'] };
  if (containsPromptField(body)) return { ok: false, status: 400, code: 'invalid_payload', errors: ['Browser-provided prompts are not accepted.'] };
  if (reportData?.meta?.clientLocked === true) return { ok: false, status: 403, code: 'forbidden', errors: ['Client-locked reports cannot run AI tasks.'] };
  if (!['owner', 'editor', 'admin'].includes(user.role)) return { ok: false, status: 403, code: 'forbidden', errors: ['Viewer role cannot run AI tasks.'] };
  if (!isAiServerEnabled(env)) return { ok: true, dryRunOnly: true };
  if (preferredProvider(env) === 'openai' && !isOpenAiProviderConfigured(env)) return { ok: false, status: 503, code: 'missing_config', errors: ['OpenAI provider is not configured.'] };
  return { ok: true };
}

function buildOpenAiRequestForTask(taskType, sanitizedInput, schema, env, options = {}) {
  return {
    model: String(env?.OPENAI_MODEL || DEFAULT_AI_MODEL),
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: serverInstructionForTask(taskType) }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: JSON.stringify(sanitizedInput) }],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: schema.name,
        schema: schema.schema,
        strict: true,
      },
    },
    max_output_tokens: Math.max(256, Math.min(Number(options.maxOutputTokens) || 2000, 4000)),
  };
}

async function callOpenAiResponsesApi(env, requestBody) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) throw new Error('OpenAI Responses API request failed.');
  return response.json();
}

function parseOpenAiStructuredOutput(response) {
  const direct = response?.output_parsed || response?.output?.[0]?.content?.find((item) => item.parsed)?.parsed;
  if (direct && typeof direct === 'object') return direct;
  const text = response?.output_text || response?.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI response did not include structured output.');
  return JSON.parse(text);
}

function validateOpenAiStructuredOutput(taskType, output, reportData) {
  if (taskType === 'extract_evidence_candidates') return validateEvidenceCandidateOutput(output, reportData);
  if (taskType === 'suggest_recommendations') return validateRecommendationSuggestionOutput(output, reportData);
  if (taskType === 'improve_executive_summary') return validateExecutiveSummaryOutput(output, reportData);
  if (taskType === 'check_source_coverage') return validateSourceCoverageOutput(output, reportData);
  if (taskType === 'suggest_report_sections') return validateSectionDraftOutput(output, reportData);
  return { ok: false, errors: ['Unsupported AI output schema.'] };
}

function convertOpenAiOutputToSuggestions(taskType, output, meta = {}) {
  if (taskType === 'check_source_coverage') {
    return {
      ok: true,
      aiEnabled: Boolean(meta.aiEnabled),
      provider: meta.provider || 'dry_run',
      taskType,
      suggestions: (output.coverageGaps || []).map((gap) => ({
        id: gap.id,
        type: 'source_coverage_gap',
        status: 'needs_review',
        gap,
      })),
      warnings: output.warnings || [],
      errors: [],
    };
  }
  if (taskType === 'suggest_report_sections') {
    return {
      ok: true,
      aiEnabled: Boolean(meta.aiEnabled),
      provider: meta.provider || 'dry_run',
      taskType,
      suggestions: (output.draftBlocks || []).map((block) => ({
        id: block.id,
        type: 'section_draft_block',
        status: 'needs_review',
        block,
      })),
      warnings: [...(output.warnings || []), ...(output.coverageWarnings || []), ...(output.missingInputs || [])],
      errors: [],
    };
  }
  if (taskType === 'improve_executive_summary') {
    return {
      ok: true,
      aiEnabled: Boolean(meta.aiEnabled),
      provider: meta.provider || 'dry_run',
      taskType,
      suggestions: (output.summaryBlocks || []).map((summaryBlock) => ({
        id: summaryBlock.id,
        type: 'executive_summary_block',
        status: 'needs_review',
        summaryBlock,
      })),
      warnings: output.warnings || [],
      errors: [],
    };
  }
  if (taskType === 'suggest_recommendations') {
    return {
      ok: true,
      aiEnabled: Boolean(meta.aiEnabled),
      provider: meta.provider || 'dry_run',
      taskType,
      suggestions: (output.recommendations || []).map((recommendation) => ({
        id: recommendation.id,
        type: 'recommendation_suggestion',
        status: 'needs_review',
        recommendation,
      })),
      warnings: output.warnings || [],
      errors: [],
    };
  }
  if (taskType !== 'extract_evidence_candidates') return { ok: false, aiEnabled: Boolean(meta.aiEnabled), provider: meta.provider || 'unknown', taskType, suggestions: [], warnings: [], errors: ['Unsupported AI task.'], errorCode: 'invalid_task' };
  return {
    ok: true,
    aiEnabled: Boolean(meta.aiEnabled),
    provider: meta.provider || 'dry_run',
    taskType,
    suggestions: (output.candidates || []).map((candidate) => ({
      id: candidate.id,
      type: 'evidence_candidate',
      status: 'needs_review',
      candidate,
    })),
    warnings: output.warnings || [],
    errors: [],
  };
}

function sanitizeAiTaskInput(reportData, options = {}) {
  const selectedSources = new Set(arrayOption(options.selectedSourceIds));
  const selectedMaterials = new Set(arrayOption(options.selectedMaterialIds));
  const selectedSections = new Set(arrayOption(options.selectedSectionIds));
  const sections = (Array.isArray(reportData.reportSections) ? reportData.reportSections : [])
    .filter((section) => !selectedSections.size || selectedSections.has(section.id))
    .slice(0, MAX_AI_SECTIONS)
    .map((section) => ({
      id: String(section.id || ''),
      title: String(section.title || ''),
      type: String(section.type || ''),
      blocks: Array.isArray(section.blocks)
        ? section.blocks
          .filter((block) => ['needs_review', 'approved'].includes(String(block.status || '')))
          .slice(0, 8)
          .map((block) => ({
            id: String(block.id || ''),
            title: String(block.title || ''),
            text: trimText(block.text, MAX_TEXT_CHARS_PER_SOURCE),
            type: String(block.type || ''),
            sectionId: String(block.sectionId || section.id || ''),
            evidenceCardIds: Array.isArray(block.evidenceCardIds) ? block.evidenceCardIds.map(String).slice(0, MAX_AI_SOURCES) : [],
            sourceIds: Array.isArray(block.sourceIds) ? block.sourceIds.map(String).slice(0, MAX_AI_SOURCES) : [],
            status: String(block.status || ''),
            generatedBy: String(block.generatedBy || ''),
          }))
        : [],
    }));
  const materials = ((((reportData.materialsInventory || {}).items) || [])
    .filter((item) => !selectedMaterials.size || selectedMaterials.has(item.id))
    .slice(0, MAX_AI_MATERIALS)
    .map((item) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      type: String(item.type || ''),
      sourceKind: String(item.sourceKind || ''),
      mimeType: String(item.mimeType || ''),
      extension: String(item.extension || ''),
      status: String(item.status || ''),
    })));
  const sources = ((((reportData.sourceRegistry || {}).items) || [])
    .filter((source) => !selectedSources.size || selectedSources.has(source.id))
    .slice(0, MAX_AI_SOURCES)
    .map((source) => ({
      id: String(source.id || ''),
      materialId: String(source.materialId || ''),
      title: String(source.title || ''),
      sourceType: String(source.sourceType || ''),
      sourceKind: String(source.sourceKind || ''),
      mimeType: String(source.mimeType || ''),
      extension: String(source.extension || ''),
      fileName: String(source.fileName || ''),
      url: String(source.url || ''),
      linkedSectionIds: Array.isArray(source.linkedSectionIds) ? source.linkedSectionIds.map(String).slice(0, MAX_AI_SECTIONS) : [],
      extractedTextStatus: String(source.extractedTextStatus || ''),
      evidenceStatus: String(source.evidenceStatus || ''),
      credibilityStatus: String(source.credibilityStatus || ''),
      notes: trimText(source.notes, MAX_TEXT_CHARS_PER_SOURCE),
    })));
  const evidenceCards = ((((reportData.evidenceCards || {}).items) || [])
    .filter((card) => String(card.reviewStatus || '') === 'approved')
    .slice(0, MAX_AI_SOURCES)
    .map((card) => ({
      id: String(card.id || ''),
      claim: String(card.claim || ''),
      summary: String(card.summary || ''),
      sectionId: String(card.sectionId || ''),
      sourceIds: Array.isArray(card.sourceIds) ? card.sourceIds.map(String).slice(0, MAX_AI_SOURCES) : [],
      evidenceType: String(card.evidenceType || ''),
      confidenceStatus: String(card.confidenceStatus || ''),
      credibilityStatus: String(card.credibilityStatus || ''),
      reviewStatus: String(card.reviewStatus || ''),
    })));
  return {
    reportData: {
      meta: { clientLocked: reportData?.meta?.clientLocked === true },
      reportSections: sections,
      materialsInventory: { items: materials },
      sourceRegistry: { items: sources },
      evidenceCards: { items: evidenceCards },
    },
    options: sanitizeAiOptions(options),
  };
}

function sanitizeAiOptions(options = {}) {
  const selectedSectionId = String(options.selectedSectionId || '');
  return {
    maxCandidates: Math.max(1, Math.min(Number(options.maxCandidates) || 8, 12)),
    selectedSectionId,
    selectedSourceIds: arrayOption(options.selectedSourceIds),
    selectedMaterialIds: arrayOption(options.selectedMaterialIds),
    selectedSectionIds: selectedSectionId ? [selectedSectionId] : arrayOption(options.selectedSectionIds),
  };
}

function runAiEvidenceCandidateDryRun(reportData, options = {}) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const now = new Date().toISOString();
  const warnings = [];
  const sections = Array.isArray(report.reportSections) ? report.reportSections : [];
  const materials = new Map((((report.materialsInventory || {}).items) || []).map((item) => [String(item.id || ''), item]));
  const sources = ((((report.sourceRegistry || {}).items) || [])
    .filter((source) => String(source.evidenceStatus || '') !== 'ignored')
    .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))));

  if (!sources.length) {
    warnings.push('No usable sources or materials are available for dry-run evidence preview.');
    return { taskType: 'extract_evidence_candidates', candidates: [], warnings, createdAt: now };
  }

  const max = Math.max(1, Math.min(Number(options.maxCandidates) || 8, 12));
  const candidates = sources.slice(0, max).map((source, index) => {
    const material = materials.get(String(source.materialId || ''));
    const suggestedSectionId = suggestedSectionForSource(source, sections);
    const sectionTitle = (sections.find((section) => section.id === suggestedSectionId) || {}).title || 'Sources and Evidence';
    const title = source.title || source.fileName || `Source ${index + 1}`;
    const sourceWarnings = [];
    if (!material) sourceWarnings.push('No matching material metadata was found.');
    if (['pending', 'failed'].includes(String(source.extractedTextStatus || ''))) sourceWarnings.push('No extracted text is available; this preview uses metadata only.');
    if (String(source.credibilityStatus || 'unreviewed') === 'unreviewed') sourceWarnings.push('Source credibility is unreviewed.');
    const hasText = String(source.extractedTextStatus || '') === 'available' || String(source.notes || '').trim();
    return {
      id: `candidate:${source.id}`,
      claim: `Review "${title}" as candidate evidence for ${sectionTitle}.`,
      summary: `Dry-run preview based only on existing ${hasText ? 'source notes or extracted text status' : 'source/material metadata'}. Verify the source before approval.`,
      sourceIds: source.id ? [source.id] : [],
      materialIds: material?.id ? [material.id] : (source.materialId ? [source.materialId] : []),
      suggestedSectionId,
      evidenceType: ['spreadsheet', 'dataset'].includes(String(source.sourceType || '')) ? 'metric' : 'observation',
      confidenceStatus: hasText ? 'medium' : 'low',
      credibilityStatus: source.credibilityStatus || 'unreviewed',
      reviewStatus: 'needs_review',
      warnings: sourceWarnings,
    };
  });

  if (candidates.some((candidate) => candidate.confidenceStatus === 'low')) warnings.push('Some candidates are low confidence because source text was not available.');
  return { taskType: 'extract_evidence_candidates', candidates, warnings, createdAt: now };
}

function validateEvidenceCandidateOutput(output, reportData) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const sourceIds = new Set(((((report.sourceRegistry || {}).items) || [])).map((source) => source.id));
  const sectionIds = new Set((Array.isArray(report.reportSections) ? report.reportSections : []).map((section) => section.id));
  const errors = [];
  if (!output || typeof output !== 'object') errors.push('Candidate output must be an object.');
  if (output?.taskType !== 'extract_evidence_candidates') errors.push('Candidate output taskType must be extract_evidence_candidates.');
  if (!Array.isArray(output?.candidates)) errors.push('Candidate output must include candidates array.');
  (output?.candidates || []).forEach((candidate, index) => {
    const label = `Candidate ${index + 1}`;
    if (!String(candidate.claim || candidate.summary || '').trim()) errors.push(`${label} needs a claim or summary.`);
    if (!['draft', 'needs_review'].includes(String(candidate.reviewStatus || ''))) errors.push(`${label} cannot be auto-approved.`);
    if (!EVIDENCE_TYPES.includes(String(candidate.evidenceType || ''))) errors.push(`${label} has an unsupported evidence type.`);
    for (const sourceId of candidate.sourceIds || []) if (!sourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
    const sectionId = String(candidate.suggestedSectionId || candidate.sectionId || '');
    if (sectionId && !sectionIds.has(sectionId)) errors.push(`${label} references unknown section ${sectionId}.`);
  });
  return { ok: errors.length === 0, errors };
}

function runAiRecommendationDryRun(reportData, options = {}) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const now = new Date().toISOString();
  const warnings = [];
  const sections = Array.isArray(report.reportSections) ? report.reportSections : [];
  const sectionIds = new Set(sections.map((section) => section.id));
  const approved = ((((report.evidenceCards || {}).items) || [])
    .filter((card) => String(card.reviewStatus || '') === 'approved')
    .filter((card) => ['risk', 'opportunity', 'comparison', 'recommendation_input'].includes(String(card.evidenceType || '')) || ['recommendations', 'risksOpportunities', 'executiveSummary', 'competitiveLandscape'].includes(String(card.sectionId || '')))
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''))));

  if (!approved.length) {
    warnings.push('Approve evidence cards before requesting recommendations.');
    return { taskType: 'suggest_recommendations', recommendations: [], warnings, createdAt: now };
  }

  const max = Math.max(1, Math.min(Number(options.maxRecommendations || options.maxCandidates) || 6, 10));
  const targetSection = sectionIds.has('recommendations') ? 'recommendations' : (sections[0]?.id || '');
  const recommendations = approved.slice(0, max).map((card, index) => {
    const kind = String(card.evidenceType || 'observation');
    const title = kind === 'risk' ? 'Reduce identified market risk' : kind === 'opportunity' ? 'Prioritize validated market opportunity' : kind === 'comparison' ? 'Act on competitive comparison' : 'Turn evidence into a client recommendation';
    const evidenceText = String(card.claim || card.summary || `Approved evidence ${index + 1}`).trim();
    return {
      id: `recommendation:${card.id}`,
      title,
      recommendation: `Review and convert this approved evidence into an action plan: ${evidenceText}`,
      rationale: `Dry-run suggestion derived from approved evidence card "${card.id}".`,
      priority: kind === 'risk' || kind === 'opportunity' ? 'high' : 'medium',
      suggestedSectionId: targetSection,
      evidenceCardIds: card.id ? [card.id] : [],
      sourceIds: Array.isArray(card.sourceIds) ? card.sourceIds.map(String).filter(Boolean) : [],
      confidenceStatus: card.confidenceStatus === 'high' ? 'high' : 'medium',
      reviewStatus: 'needs_review',
      risks: kind === 'risk' ? [evidenceText] : [],
      expectedImpact: kind === 'opportunity' ? 'Potential growth or positioning upside after analyst validation.' : 'Improved client decision quality after analyst validation.',
      effortLevel: kind === 'comparison' ? 'medium' : 'low',
      warnings: [],
    };
  });

  return { taskType: 'suggest_recommendations', recommendations, warnings, createdAt: now };
}

function validateRecommendationSuggestionOutput(output, reportData) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const evidenceIds = new Set(((((report.evidenceCards || {}).items) || [])).filter((card) => String(card.reviewStatus || '') === 'approved').map((card) => card.id));
  const sourceIds = new Set(((((report.sourceRegistry || {}).items) || [])).map((source) => source.id));
  const sectionIds = new Set((Array.isArray(report.reportSections) ? report.reportSections : []).map((section) => section.id));
  const errors = [];
  if (!output || typeof output !== 'object') errors.push('Recommendation output must be an object.');
  if (output?.taskType !== 'suggest_recommendations') errors.push('Recommendation output taskType must be suggest_recommendations.');
  if (!Array.isArray(output?.recommendations)) errors.push('Recommendation output must include recommendations array.');
  (output?.recommendations || []).forEach((item, index) => {
    const label = `Recommendation ${index + 1}`;
    if (!String(item.title || item.recommendation || '').trim()) errors.push(`${label} needs a title or recommendation.`);
    if (!['draft', 'needs_review'].includes(String(item.reviewStatus || ''))) errors.push(`${label} cannot be auto-approved.`);
    if (!['low', 'medium', 'high'].includes(String(item.priority || ''))) errors.push(`${label} has an unsupported priority.`);
    if (!['low', 'medium', 'high'].includes(String(item.effortLevel || ''))) errors.push(`${label} has an unsupported effort level.`);
    if (!['low', 'medium', 'high'].includes(String(item.confidenceStatus || ''))) errors.push(`${label} has an unsupported confidence status.`);
    for (const evidenceId of item.evidenceCardIds || []) if (!evidenceIds.has(evidenceId)) errors.push(`${label} references non-approved or unknown evidence ${evidenceId}.`);
    for (const sourceId of item.sourceIds || []) if (!sourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
    const sectionId = String(item.suggestedSectionId || '');
    if (sectionId && !sectionIds.has(sectionId)) errors.push(`${label} references unknown section ${sectionId}.`);
  });
  return { ok: errors.length === 0, errors };
}

function reviewedDraftBlocks(reportData) {
  return (Array.isArray(reportData.reportSections) ? reportData.reportSections : [])
    .flatMap((section) => (Array.isArray(section.blocks) ? section.blocks : []).map((block) => ({ ...block, sectionId: block.sectionId || section.id })))
    .filter((block) => ['needs_review', 'approved'].includes(String(block.status || '')))
    .filter((block) => ['recommendation_note', 'risk_note', 'opportunity_note', 'comparison_note', 'paragraph'].includes(String(block.type || '')));
}

function runAiExecutiveSummaryDryRun(reportData, options = {}) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const now = new Date().toISOString();
  const warnings = [];
  const sections = Array.isArray(report.reportSections) ? report.reportSections : [];
  const sectionIds = new Set(sections.map((section) => section.id));
  const approved = ((((report.evidenceCards || {}).items) || [])
    .filter((card) => String(card.reviewStatus || '') === 'approved')
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''))));
  const drafts = reviewedDraftBlocks(report)
    .filter((block) => ['recommendations', 'risksOpportunities', 'executiveSummary', 'competitiveLandscape', 'competitors', 'pricing', 'features'].includes(String(block.sectionId || '')))
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

  if (!approved.length) {
    warnings.push('Approve evidence cards before requesting executive summary.');
    return { taskType: 'improve_executive_summary', summaryTitle: 'Executive Summary Preview', summaryBlocks: [], keyTakeaways: [], warnings, createdAt: now };
  }

  const max = Math.max(1, Math.min(Number(options.maxSummaryBlocks || options.maxCandidates) || 5, 8));
  const targetSection = sectionIds.has('executiveSummary') ? 'executiveSummary' : (sections[0]?.id || '');
  const evidenceBlocks = approved.slice(0, max).map((card, index) => {
    const text = String(card.claim || card.summary || `Approved evidence ${index + 1}`).trim();
    return {
      id: `summary:${card.id}`,
      heading: index === 0 ? 'Key finding' : 'Supporting finding',
      text,
      importance: card.confidenceStatus === 'high' ? 'high' : 'medium',
      suggestedSectionId: targetSection,
      evidenceCardIds: card.id ? [card.id] : [],
      sourceIds: Array.isArray(card.sourceIds) ? card.sourceIds.map(String).filter(Boolean) : [],
      recommendationIds: [],
      confidenceStatus: card.confidenceStatus === 'high' ? 'high' : 'medium',
      reviewStatus: 'needs_review',
      generatedBy: 'ai_dry_run',
      warnings: [],
    };
  });
  const draftBlocks = drafts.slice(0, Math.max(0, max - evidenceBlocks.length)).map((block) => ({
    id: `summary:${block.id}`,
    heading: block.title || 'Reviewed recommendation',
    text: String(block.text || '').trim(),
    importance: 'medium',
    suggestedSectionId: targetSection,
    evidenceCardIds: Array.isArray(block.evidenceCardIds) ? block.evidenceCardIds.map(String).filter(Boolean) : [],
    sourceIds: Array.isArray(block.sourceIds) ? block.sourceIds.map(String).filter(Boolean) : [],
    recommendationIds: block.id ? [block.id] : [],
    confidenceStatus: 'medium',
    reviewStatus: 'needs_review',
    generatedBy: 'ai_dry_run',
    warnings: ['Reviewed draft block is non-final until approved by an analyst.'],
  }));
  const summaryBlocks = [...evidenceBlocks, ...draftBlocks].filter((block) => block.text);
  const keyTakeaways = summaryBlocks.slice(0, 3).map((block) => block.text);
  return { taskType: 'improve_executive_summary', summaryTitle: 'Executive Summary Preview', summaryBlocks, keyTakeaways, warnings, createdAt: now };
}

function validateExecutiveSummaryOutput(output, reportData) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const approvedIds = new Set(((((report.evidenceCards || {}).items) || [])).filter((card) => String(card.reviewStatus || '') === 'approved').map((card) => card.id));
  const sourceIds = new Set(((((report.sourceRegistry || {}).items) || [])).map((source) => source.id));
  const sectionIds = new Set((Array.isArray(report.reportSections) ? report.reportSections : []).map((section) => section.id));
  const draftIds = new Set(reviewedDraftBlocks(report).map((block) => block.id));
  const errors = [];
  if (!output || typeof output !== 'object') errors.push('Executive summary output must be an object.');
  if (output?.taskType !== 'improve_executive_summary') errors.push('Executive summary output taskType must be improve_executive_summary.');
  if (!Array.isArray(output?.summaryBlocks)) errors.push('Executive summary output must include summaryBlocks array.');
  (output?.summaryBlocks || []).forEach((block, index) => {
    const label = `Summary block ${index + 1}`;
    if (!String(block.heading || block.text || '').trim()) errors.push(`${label} needs a heading or text.`);
    if (!['draft', 'needs_review'].includes(String(block.reviewStatus || ''))) errors.push(`${label} cannot be auto-approved.`);
    if (!['low', 'medium', 'high'].includes(String(block.importance || ''))) errors.push(`${label} has an unsupported importance.`);
    if (!['low', 'medium', 'high'].includes(String(block.confidenceStatus || ''))) errors.push(`${label} has an unsupported confidence status.`);
    for (const evidenceId of block.evidenceCardIds || []) if (!approvedIds.has(evidenceId)) errors.push(`${label} references non-approved or unknown evidence ${evidenceId}.`);
    for (const sourceId of block.sourceIds || []) if (!sourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
    for (const recommendationId of block.recommendationIds || []) if (!draftIds.has(recommendationId)) errors.push(`${label} references unknown recommendation draft ${recommendationId}.`);
    const sectionId = String(block.suggestedSectionId || '');
    if (sectionId && !sectionIds.has(sectionId)) errors.push(`${label} references unknown section ${sectionId}.`);
  });
  return { ok: errors.length === 0, errors };
}

function runAiSourceCoverageDryRun(reportData) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const now = new Date().toISOString();
  const sections = Array.isArray(report.reportSections) ? report.reportSections : [];
  const sources = (((report.sourceRegistry || {}).items) || []);
  const evidence = (((report.evidenceCards || {}).items) || []);
  const warnings = [];
  const gaps = [];
  const weakSources = sources
    .filter((source) => ['weak', 'unreviewed', 'needs_review'].includes(String(source.credibilityStatus || 'unreviewed')))
    .map((source) => ({
      sourceId: source.id,
      title: source.title || source.fileName || 'Untitled source',
      credibilityStatus: source.credibilityStatus || 'unreviewed',
      evidenceStatus: source.evidenceStatus || 'unused',
      linkedSectionIds: Array.isArray(source.linkedSectionIds) ? source.linkedSectionIds : [],
      issue: 'Source credibility needs analyst review.',
      suggestedFix: 'Review this source before relying on it in client-facing findings.',
    }));
  if (!sources.length) warnings.push('No sources are available for coverage analysis.');
  if (!evidence.length) warnings.push('No evidence cards are available for coverage analysis.');

  const sourceIds = new Set(sources.map((source) => source.id));
  const approved = evidence.filter((card) => card.reviewStatus === 'approved');
  const rejected = evidence.filter((card) => card.reviewStatus === 'rejected');
  const sectionCoverage = sections.map((section) => {
    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
    const sectionEvidence = evidence.filter((card) => card.sectionId === section.id || blocks.some((block) => (block.evidenceCardIds || []).includes(card.id)));
    const approvedEvidence = sectionEvidence.filter((card) => card.reviewStatus === 'approved');
    const sectionSourceIds = new Set([
      ...approvedEvidence.flatMap((card) => card.sourceIds || []),
      ...blocks.flatMap((block) => block.sourceIds || []),
      ...sources.filter((source) => (source.linkedSectionIds || []).includes(section.id)).map((source) => source.id),
    ].filter(Boolean));
    const weakCount = [...sectionSourceIds].filter((id) => weakSources.some((source) => source.sourceId === id)).length;
    const missing = approvedEvidence.filter((card) => !(card.sourceIds || []).length);
    const rejectedInBlocks = rejected.filter((card) => blocks.some((block) => (block.evidenceCardIds || []).includes(card.id)));
    let blockerCount = missing.length + rejectedInBlocks.length;
    let warningCount = weakCount;
    let status = 'no_content';
    if (sectionEvidence.length || blocks.length) {
      if (!sectionSourceIds.size) status = 'no_sources';
      else if (blockerCount) status = 'weak';
      else if (weakCount || approvedEvidence.length === 0) status = 'partial';
      else status = 'strong';
    }
    if ((sectionEvidence.length || blocks.length) && !sectionSourceIds.size) {
      const severity = approvedEvidence.length ? 'blocker' : 'warning';
      if (severity === 'blocker') blockerCount += 1;
      else warningCount += 1;
      gaps.push({
        id: `coverage:${section.id}:no_sources`,
        severity,
        sectionId: section.id,
        title: 'Section has content without linked sources',
        description: `${section.title || section.id} has content or evidence but no linked source coverage.`,
        evidenceCardIds: sectionEvidence.map((card) => card.id).filter(Boolean),
        sourceIds: [],
        suggestedFix: 'Link approved evidence to trusted sources before export.',
        reviewStatus: 'needs_review',
      });
    }
    for (const card of missing) {
      gaps.push({
        id: `coverage:${card.id}:missing_source`,
        severity: 'blocker',
        sectionId: section.id,
        title: 'Approved evidence lacks sources',
        description: `Approved evidence "${card.claim || card.summary || card.id}" has no linked sources.`,
        evidenceCardIds: [card.id],
        sourceIds: [],
        suggestedFix: 'Attach at least one reviewed source to this evidence card.',
        reviewStatus: 'needs_review',
      });
    }
    for (const card of rejectedInBlocks) {
      gaps.push({
        id: `coverage:${card.id}:rejected_in_block`,
        severity: 'blocker',
        sectionId: section.id,
        title: 'Rejected evidence is referenced by draft content',
        description: `Rejected evidence "${card.claim || card.summary || card.id}" is referenced by a draft block.`,
        evidenceCardIds: [card.id],
        sourceIds: card.sourceIds || [],
        suggestedFix: 'Remove the rejected evidence reference or replace it with approved evidence.',
        reviewStatus: 'needs_review',
      });
    }
    return {
      sectionId: section.id,
      sectionTitle: section.title || section.id,
      status,
      evidenceCount: sectionEvidence.length,
      approvedEvidenceCount: approvedEvidence.length,
      sourceCount: [...sectionSourceIds].filter((id) => sourceIds.has(id)).length,
      weakSourceCount: weakCount,
      missingSourceCount: missing.length,
      blockerCount,
      warningCount,
      notes: status === 'strong' ? 'Approved evidence and source coverage are present.' : 'Review source coverage before export.',
    };
  });
  const suggestedNextSources = sectionCoverage
    .filter((item) => ['no_sources', 'weak', 'partial'].includes(item.status))
    .slice(0, 8)
    .map((item) => ({
      id: `next-source:${item.sectionId}`,
      sectionId: item.sectionId,
      sourceType: 'document',
      reason: `Improve source coverage for ${item.sectionTitle}.`,
      suggestedSearchQuery: `${item.sectionTitle} supporting evidence`,
      priority: item.blockerCount ? 'high' : 'medium',
    }));
  const strongCount = sectionCoverage.filter((item) => item.status === 'strong').length;
  const coverageScore = sources.length ? Math.round((strongCount / Math.max(1, sectionCoverage.length)) * 100) : 0;
  const overallCoverageStatus = coverageScore >= 75 ? 'strong' : coverageScore >= 35 ? 'partial' : 'weak';
  if (weakSources.length) warnings.push(`${weakSources.length} source(s) need credibility review.`);
  return { taskType: 'check_source_coverage', overallCoverageStatus, coverageScore, sectionCoverage, coverageGaps: gaps, weakSources, suggestedNextSources, warnings, createdAt: now };
}

function validateSourceCoverageOutput(output, reportData) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const sectionIds = new Set((Array.isArray(report.reportSections) ? report.reportSections : []).map((section) => section.id));
  const sourceIds = new Set(((((report.sourceRegistry || {}).items) || [])).map((source) => source.id));
  const evidenceIds = new Set(((((report.evidenceCards || {}).items) || [])).map((card) => card.id));
  const errors = [];
  if (!output || typeof output !== 'object') errors.push('Source coverage output must be an object.');
  if (output?.taskType !== 'check_source_coverage') errors.push('Source coverage output taskType must be check_source_coverage.');
  if (!['weak', 'partial', 'strong'].includes(String(output?.overallCoverageStatus || ''))) errors.push('Unsupported overall coverage status.');
  const score = Number(output?.coverageScore);
  if (!Number.isFinite(score) || score < 0 || score > 100) errors.push('Coverage score must be 0-100.');
  for (const item of output?.sectionCoverage || []) {
    if (item.sectionId && !sectionIds.has(item.sectionId)) errors.push(`Unknown section coverage section ${item.sectionId}.`);
    if (!['no_content', 'no_sources', 'weak', 'partial', 'strong'].includes(String(item.status || ''))) errors.push(`Unsupported section coverage status for ${item.sectionId}.`);
  }
  for (const gap of output?.coverageGaps || []) {
    if (!['blocker', 'warning', 'info'].includes(String(gap.severity || ''))) errors.push(`Unsupported gap severity for ${gap.id}.`);
    if (!['draft', 'needs_review'].includes(String(gap.reviewStatus || ''))) errors.push(`Unsupported gap review status for ${gap.id}.`);
    if (gap.sectionId && !sectionIds.has(gap.sectionId)) errors.push(`Unknown gap section ${gap.sectionId}.`);
    for (const evidenceId of gap.evidenceCardIds || []) if (!evidenceIds.has(evidenceId)) errors.push(`Gap ${gap.id} references unknown evidence ${evidenceId}.`);
    for (const sourceId of gap.sourceIds || []) if (!sourceIds.has(sourceId)) errors.push(`Gap ${gap.id} references unknown source ${sourceId}.`);
  }
  for (const source of output?.weakSources || []) if (source.sourceId && !sourceIds.has(source.sourceId)) errors.push(`Unknown weak source ${source.sourceId}.`);
  for (const item of output?.suggestedNextSources || []) {
    if (item.sectionId && !sectionIds.has(item.sectionId)) errors.push(`Unknown next-source section ${item.sectionId}.`);
    if (!['low', 'medium', 'high'].includes(String(item.priority || ''))) errors.push(`Unsupported next-source priority for ${item.id}.`);
  }
  return { ok: errors.length === 0, errors };
}

function runAiSectionDraftDryRun(reportData, options = {}) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const now = new Date().toISOString();
  const sectionId = String(options.selectedSectionId || (options.selectedSectionIds || [])[0] || '');
  const sections = Array.isArray(report.reportSections) ? report.reportSections : [];
  const section = sections.find((item) => item.id === sectionId);
  const warnings = [];
  const coverageWarnings = [];
  const missingInputs = [];
  if (!section) {
    warnings.push('Select a valid report section before requesting a section draft.');
    return { taskType: 'suggest_report_sections', sectionId, sectionTitle: '', draftBlocks: [], coverageWarnings, missingInputs, warnings, createdAt: now };
  }
  const sources = (((report.sourceRegistry || {}).items) || []);
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const approved = ((((report.evidenceCards || {}).items) || [])
    .filter((card) => card.reviewStatus === 'approved')
    .filter((card) => card.sectionId === sectionId || ['recommendations', 'risksOpportunities'].includes(sectionId) && ['risk', 'opportunity', 'recommendation_input'].includes(card.evidenceType))
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''))));
  if (!approved.length) {
    missingInputs.push('Approve evidence linked to this section before requesting a section draft.');
    return { taskType: 'suggest_report_sections', sectionId, sectionTitle: section.title || sectionId, draftBlocks: [], coverageWarnings, missingInputs, warnings, createdAt: now };
  }
  const weakSources = new Set(sources.filter((source) => ['weak', 'unreviewed', 'needs_review'].includes(String(source.credibilityStatus || 'unreviewed'))).map((source) => source.id));
  const blockType = blockTypeForSection(sectionId);
  const draftBlocks = approved.slice(0, Math.max(1, Math.min(Number(options.maxDraftBlocks || options.maxCandidates) || 5, 8))).map((card, index) => {
    const sourceIds = Array.isArray(card.sourceIds) ? card.sourceIds.filter((id) => sourceMap.has(id)) : [];
    if (!sourceIds.length) coverageWarnings.push(`Evidence ${card.id} has no linked source for ${section.title || sectionId}.`);
    if (sourceIds.some((id) => weakSources.has(id))) coverageWarnings.push(`Evidence ${card.id} uses weak or unreviewed sources.`);
    return {
      id: `section-draft:${sectionId}:${card.id}`,
      type: blockType,
      title: index === 0 ? `${section.title || sectionId} draft point` : 'Supporting draft point',
      text: String(card.claim || card.summary || '').trim(),
      sectionId,
      evidenceCardIds: card.id ? [card.id] : [],
      sourceIds,
      confidenceStatus: sourceIds.length ? (sourceIds.some((id) => weakSources.has(id)) ? 'medium' : 'high') : 'low',
      reviewStatus: 'needs_review',
      generatedBy: 'ai_dry_run',
      analystNotes: 'Dry-run section draft based on approved evidence. Review before export.',
      warnings: sourceIds.length ? [] : ['Missing linked source for this draft block.'],
    };
  }).filter((block) => block.text);
  return { taskType: 'suggest_report_sections', sectionId, sectionTitle: section.title || sectionId, draftBlocks, coverageWarnings: [...new Set(coverageWarnings)], missingInputs, warnings, createdAt: now };
}

function blockTypeForSection(sectionId) {
  if (sectionId === 'pricing') return 'metric';
  if (sectionId === 'competitiveLandscape' || sectionId === 'competitors' || sectionId === 'features') return 'comparison_note';
  if (sectionId === 'risksOpportunities') return 'risk_note';
  if (sectionId === 'recommendations') return 'recommendation_note';
  return 'paragraph';
}

function validateSectionDraftOutput(output, reportData) {
  const report = reportData && typeof reportData === 'object' ? reportData : {};
  const sectionIds = new Set((Array.isArray(report.reportSections) ? report.reportSections : []).map((section) => section.id));
  const sourceIds = new Set(((((report.sourceRegistry || {}).items) || [])).map((source) => source.id));
  const approvedIds = new Set(((((report.evidenceCards || {}).items) || []).filter((card) => card.reviewStatus === 'approved')).map((card) => card.id));
  const errors = [];
  if (!output || typeof output !== 'object') errors.push('Section draft output must be an object.');
  if (output?.taskType !== 'suggest_report_sections') errors.push('Section draft output taskType must be suggest_report_sections.');
  if (!output?.sectionId || !sectionIds.has(output.sectionId)) errors.push('Section draft output must include a valid sectionId.');
  if (!Array.isArray(output?.draftBlocks)) errors.push('Section draft output must include draftBlocks array.');
  for (const block of output?.draftBlocks || []) {
    if (!['paragraph', 'bullet_list', 'metric', 'comparison_note', 'risk_note', 'opportunity_note', 'recommendation_note'].includes(String(block.type || ''))) errors.push(`Unsupported draft block type for ${block.id}.`);
    if (!String(block.text || '').trim()) errors.push(`Draft block ${block.id} needs text.`);
    if (block.sectionId !== output.sectionId) errors.push(`Draft block ${block.id} must target the selected section.`);
    if (!['draft', 'needs_review'].includes(String(block.reviewStatus || ''))) errors.push(`Draft block ${block.id} cannot be auto-approved.`);
    if (!['low', 'medium', 'high'].includes(String(block.confidenceStatus || ''))) errors.push(`Draft block ${block.id} has invalid confidence.`);
    for (const evidenceId of block.evidenceCardIds || []) if (!approvedIds.has(evidenceId)) errors.push(`Draft block ${block.id} references non-approved evidence ${evidenceId}.`);
    for (const sourceId of block.sourceIds || []) if (!sourceIds.has(sourceId)) errors.push(`Draft block ${block.id} references unknown source ${sourceId}.`);
  }
  return { ok: errors.length === 0, errors };
}

function suggestedSectionForSource(source, sections) {
  const valid = new Set((sections || []).map((section) => section.id));
  const linked = (source.linkedSectionIds || []).find((id) => valid.has(id));
  if (linked) return linked;
  const text = `${source.title || ''} ${source.fileName || ''} ${source.extension || ''}`.toLowerCase();
  const pairs = [
    ['pricing', /price|pricing|tier|plan|cost|csv|xlsx|spreadsheet/],
    ['features', /feature|capability|comparison/],
    ['messaging', /message|position|copy|website|landing/],
    ['channels', /seo|channel|content|social|campaign/],
    ['competitors', /competitor|market|landscape/],
  ];
  for (const [id, pattern] of pairs) if (valid.has(id) && pattern.test(text)) return id;
  return valid.has('sourcesEvidence') ? 'sourcesEvidence' : ((sections || [])[0] || {}).id || '';
}

function schemaForTask(taskType) {
  if (taskType === 'extract_evidence_candidates') return AI_OUTPUT_SCHEMAS.evidence_candidate_schema;
  if (taskType === 'suggest_recommendations') return AI_OUTPUT_SCHEMAS.recommendation_suggestion_schema;
  if (taskType === 'improve_executive_summary') return AI_OUTPUT_SCHEMAS.executive_summary_schema;
  if (taskType === 'check_source_coverage') return AI_OUTPUT_SCHEMAS.source_coverage_schema;
  if (taskType === 'suggest_report_sections') return AI_OUTPUT_SCHEMAS.section_draft_schema;
  throw new Error('Unsupported AI task schema.');
}

function serverInstructionForTask(taskType) {
  if (taskType === 'extract_evidence_candidates') {
    return 'Extract candidate evidence only from the provided sanitized report data. Do not invent facts. Return JSON matching the schema. Every candidate must remain draft or needs_review.';
  }
  if (taskType === 'suggest_recommendations') {
    return 'Suggest recommendation drafts only from approved evidence and linked sources in the sanitized report data. Do not use rejected or unreviewed evidence. Return JSON matching the schema. Every recommendation must remain draft or needs_review.';
  }
  if (taskType === 'improve_executive_summary') {
    return 'Suggest executive summary draft blocks only from approved evidence, reviewed draft blocks, and linked sources in the sanitized report data. Do not invent facts. Return JSON matching the schema. Every summary block must remain draft or needs_review.';
  }
  if (taskType === 'check_source_coverage') {
    return 'Analyze source coverage only from sanitized report sections, source registry, evidence cards, and draft blocks. Do not invent sources. Return JSON matching the schema. Every gap must remain draft or needs_review.';
  }
  if (taskType === 'suggest_report_sections') {
    return 'Suggest draft blocks only for the selected report section using approved evidence and linked known sources. Do not invent facts. Return JSON matching the schema. Every block must remain draft or needs_review.';
  }
  return 'Return JSON matching the provided schema.';
}

function isAiServerEnabled(env) {
  const value = env?.AI_SERVER_ENABLED;
  if (value === true) return true;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return DEFAULT_AI_SERVER_ENABLED;
}

function preferredProvider(env) {
  const provider = String(env?.AI_PROVIDER || DEFAULT_AI_PROVIDER).toLowerCase();
  return provider === 'openai' ? 'openai' : 'dry_run';
}

function sanitizeUser(user) {
  const role = String(user?.role || 'viewer').toLowerCase();
  return { role: ['owner', 'editor', 'admin', 'viewer'].includes(role) ? role : 'viewer' };
}

function containsPromptField(value) {
  if (!value || typeof value !== 'object') return false;
  for (const key of Object.keys(value)) {
    if (/prompt|system|developer/i.test(key)) return true;
    if (containsPromptField(value[key])) return true;
  }
  return false;
}

function arrayOption(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 50) : [];
}

function trimText(value, max) {
  return String(value || '').slice(0, max);
}

function apiDisabled() {
  return json({
    error: {
      code: 'API_DISABLED',
      message: 'This deployment stores data only in the user browser.',
    },
  }, 404);
}

function aiResponse(result, status = 200, extraHeaders = {}) {
  return json({
    ok: Boolean(result.ok),
    aiEnabled: Boolean(result.aiEnabled),
    provider: result.provider || DEFAULT_AI_PROVIDER,
    taskType: result.taskType || '',
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    errors: Array.isArray(result.errors) ? result.errors : [],
    errorCode: result.errorCode || '',
  }, status, extraHeaders);
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extraHeaders } });
}
