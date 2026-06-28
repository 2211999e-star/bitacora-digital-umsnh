/**
 * documentos.js
 * Gestión local de documentos y digitalización (sin depender de Storage externo).
 */

import { state, downloadCSV, showToast, escapeHtml } from './utils.js?v=1.5.4';
import { LOCAL_STORAGE_PREFIX } from './config.js?v=1.5.4';

const DOCS_KEY = `${LOCAL_STORAGE_PREFIX}documents_v1`;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const DOC_DRAFT_KEY = `${LOCAL_STORAGE_PREFIX}document_form_draft_v1`;

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function readDocs() {
  try {
    const rows = JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function saveDocs(rows) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(rows || []));
}

function formatSize(bytes = 0) {
  const n = Number(bytes || 0);
  if (n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeCategory(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return 'general';
  return v;
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    try {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ''));
      fr.onerror = reject;
      fr.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });
}

function getFormData() {
  const id = document.getElementById('doc-id')?.value || '';
  const title = (document.getElementById('doc-title')?.value || '').trim();
  const category = normalizeCategory(document.getElementById('doc-category')?.value || 'general');
  const tags = (document.getElementById('doc-tags')?.value || '').trim();
  const notes = (document.getElementById('doc-notes')?.value || '').trim();
  const sourceUrl = (document.getElementById('doc-source-url')?.value || '').trim();
  const digitalText = (document.getElementById('doc-digital-text')?.value || '').trim();
  const fileInput = document.getElementById('doc-file');
  const file = fileInput?.files?.[0] || null;

  return {
    id,
    title,
    category,
    tags,
    notes,
    sourceUrl,
    digitalText,
    file,
  };
}

function clearFileInput() {
  const fileInput = document.getElementById('doc-file');
  if (fileInput) fileInput.value = '';
}

function setFormMode(editing = false) {
  const titleEl = document.getElementById('documents-form-title');
  const submitText = document.getElementById('doc-submit-text');
  const resetBtn = document.getElementById('doc-reset-btn');

  if (titleEl) titleEl.textContent = editing ? 'Editar documento' : 'Nuevo documento / digitalización';
  if (submitText) submitText.textContent = editing ? 'Actualizar documento' : 'Guardar documento';
  if (resetBtn) resetBtn.textContent = editing ? 'Cancelar edición' : 'Limpiar formulario';
}

function saveDocumentDraft() {
  const form = document.getElementById('form-document');
  if (!form) return;

  const values = {};
  Array.from(form.elements || []).forEach((el) => {
    if (!el?.name || el.disabled) return;
    if (el.type === 'file') return;
    if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
    values[el.name] = el.value;
  });

  localStorage.setItem(DOC_DRAFT_KEY, JSON.stringify({ values, savedAt: Date.now() }));
}

function restoreDocumentDraft() {
  const form = document.getElementById('form-document');
  if (!form || form.dataset.draftRestored === 'true') return;
  form.dataset.draftRestored = 'true';

  const raw = localStorage.getItem(DOC_DRAFT_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    const values = parsed?.values && typeof parsed.values === 'object' ? parsed.values : null;
    if (!values) return;

    Object.entries(values).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field && typeof field.value !== 'undefined') field.value = String(value ?? '');
    });

    showToast({ type: 'success', title: 'Borrador recuperado', message: 'Se restauro tu captura de documento.' });
  } catch {
    localStorage.removeItem(DOC_DRAFT_KEY);
  }
}

function clearDocumentDraft() {
  localStorage.removeItem(DOC_DRAFT_KEY);
}

function wireDocumentDraft() {
  const form = document.getElementById('form-document');
  if (!form || form.dataset.draftWired === 'true') return;
  form.dataset.draftWired = 'true';

  restoreDocumentDraft();

  let timer = null;
  const scheduleSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(saveDocumentDraft, 250);
  };

  form.addEventListener('input', scheduleSave);
  form.addEventListener('change', scheduleSave);
}

function renderDocuments(list = state.documentsData || []) {
  const grid = document.getElementById('documents-grid');
  const count = document.getElementById('documents-count');
  if (count) count.textContent = String(list.length);
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
        <div class="mx-auto max-w-md">
          <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-500 dark:text-gray-300"></i>
          </div>
          <p class="font-semibold">Sin documentos registrados</p>
          <p class="text-sm mt-1">Sube un archivo o captura texto digitalizado para empezar.</p>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((d) => {
      const hasFile = Boolean(d?.fileDataUrl);
      const hasDigital = Boolean(d?.digitalText);
      const sourceType = hasFile ? 'archivo' : hasDigital ? 'digital' : 'referencia';
      const badgeClass =
        sourceType === 'archivo'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : sourceType === 'digital'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';

      return `
        <article class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">${escapeHtml(d.title || 'Documento')}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml((d.category || 'general').toUpperCase())} · ${escapeHtml(d.createdAt || '')}</p>
            </div>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">${sourceType}</span>
          </div>

          <div class="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            ${d.tags ? `<p><b>Etiquetas:</b> ${escapeHtml(d.tags)}</p>` : ''}
            ${d.fileName ? `<p><b>Archivo:</b> ${escapeHtml(d.fileName)} (${escapeHtml(formatSize(d.fileSize))})</p>` : ''}
            ${d.sourceUrl ? `<p class="truncate"><b>Origen:</b> ${escapeHtml(d.sourceUrl)}</p>` : ''}
            ${d.notes ? `<p class="line-clamp-2"><b>Notas:</b> ${escapeHtml(d.notes)}</p>` : ''}
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onclick="openDocument('${d.id}')" class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700">
              <i class="fas fa-eye mr-1"></i> Abrir
            </button>
            <button type="button" onclick="downloadDocument('${d.id}')" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              <i class="fas fa-download mr-1"></i> Descargar
            </button>
            <button type="button" onclick="editDocument('${d.id}')" class="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <i class="fas fa-pen mr-1"></i> Editar
            </button>
            <button type="button" onclick="deleteDocument('${d.id}')" class="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30">
              <i class="fas fa-trash mr-1"></i> Eliminar
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function filteredDocuments() {
  const q = (document.getElementById('search-documents')?.value || '').trim().toLowerCase();
  const categoryRaw = (document.getElementById('filter-doc-category')?.value || '').trim();
  const category = normalizeCategory(categoryRaw);

  return (state.documentsData || []).filter((d) => {
    const categoryOk = !categoryRaw ? true : normalizeCategory(d.category) === category;
    if (!categoryOk) return false;

    if (!q) return true;
    const haystack = [d.title, d.tags, d.notes, d.sourceUrl, d.digitalText, d.fileName, d.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function loadDocuments() {
  wireDocumentDraft();
  const rows = readDocs().sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  state.documentsData = rows;
  filterDocuments();
}

export function filterDocuments() {
  renderDocuments(filteredDocuments());
}

export function clearDocumentsFilters() {
  const q = document.getElementById('search-documents');
  const cat = document.getElementById('filter-doc-category');
  if (q) q.value = '';
  if (cat) cat.value = '';
  filterDocuments();
}

export function clearDocumentForm() {
  document.getElementById('form-document')?.reset();
  const id = document.getElementById('doc-id');
  if (id) id.value = '';
  clearFileInput();
  clearDocumentDraft();
  setFormMode(false);
}

export async function handleDocumentSubmit(_ctx, e) {
  e.preventDefault();

  const data = getFormData();
  if (!data.title) {
    Swal.fire({ icon: 'warning', title: 'Título requerido', text: 'Indica un título para el documento.' });
    return;
  }

  if (!data.file && !data.digitalText && !data.sourceUrl) {
    Swal.fire({ icon: 'warning', title: 'Contenido requerido', text: 'Sube un archivo, pega texto digitalizado o agrega una URL de origen.' });
    return;
  }

  if (data.sourceUrl && !/^https?:\/\//i.test(data.sourceUrl)) {
    Swal.fire({ icon: 'warning', title: 'URL inválida', text: 'La URL debe iniciar con http:// o https://.' });
    return;
  }

  const rows = readDocs();
  const existing = data.id ? rows.find((r) => r.id === data.id) : null;

  let fileDataUrl = existing?.fileDataUrl || null;
  let fileName = existing?.fileName || null;
  let fileType = existing?.fileType || null;
  let fileSize = existing?.fileSize || null;

  if (data.file) {
    if (data.file.size > MAX_FILE_SIZE) {
      Swal.fire({ icon: 'warning', title: 'Archivo muy grande', text: 'El tamaño máximo permitido es 8 MB.' });
      return;
    }
    fileDataUrl = await toDataUrl(data.file);
    fileName = data.file.name;
    fileType = data.file.type || 'application/octet-stream';
    fileSize = data.file.size || 0;
  }

  const now = new Date();
  const payload = {
    id: existing?.id || uid(),
    title: data.title,
    category: data.category,
    tags: data.tags,
    notes: data.notes,
    sourceUrl: data.sourceUrl || null,
    digitalText: data.digitalText || null,
    fileDataUrl,
    fileName,
    fileType,
    fileSize,
    createdBy: state.currentUser?.full_name || state.currentUser?.email || 'Usuario',
    createdAt: existing?.createdAt || now.toLocaleString('es-MX'),
    updatedAt: now.toISOString(),
  };

  const next = existing ? rows.map((r) => (r.id === existing.id ? payload : r)) : [payload, ...rows];
  saveDocs(next);

  loadDocuments();
  clearDocumentForm();
  clearDocumentDraft();
  showToast({
    type: 'success',
    title: existing ? 'Documento actualizado' : 'Documento guardado',
    message: existing ? 'Los cambios se guardaron correctamente.' : 'Se agregó el documento al repositorio.',
  });
}

export function editDocument(id) {
  const doc = (state.documentsData || []).find((d) => d.id === id);
  if (!doc) return;

  const set = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.value = val || '';
  };

  set('doc-id', doc.id);
  set('doc-title', doc.title);
  set('doc-category', doc.category || 'general');
  set('doc-tags', doc.tags);
  set('doc-notes', doc.notes);
  set('doc-source-url', doc.sourceUrl);
  set('doc-digital-text', doc.digitalText);

  clearFileInput();
  setFormMode(true);
  document.getElementById('doc-title')?.focus?.();
}

export async function deleteDocument(id) {
  const doc = (state.documentsData || []).find((d) => d.id === id);
  if (!doc) return;

  const result = await Swal.fire({
    icon: 'warning',
    title: '¿Eliminar documento?',
    text: `Se eliminará "${doc.title}" del repositorio local.`,
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
  });

  if (!result.isConfirmed) return;

  const next = readDocs().filter((d) => d.id !== id);
  saveDocs(next);
  loadDocuments();
  showToast({ type: 'success', title: 'Documento eliminado' });
}

export function openDocument(id) {
  const doc = (state.documentsData || []).find((d) => d.id === id);
  if (!doc) return;

  if (doc.fileDataUrl) {
    window.open(doc.fileDataUrl, '_blank', 'noopener');
    return;
  }

  if (doc.sourceUrl) {
    window.open(doc.sourceUrl, '_blank', 'noopener');
    return;
  }

  if (doc.digitalText) {
    Swal.fire({
      title: doc.title,
      html: `<div style="text-align:left;max-height:320px;overflow:auto;white-space:pre-wrap;">${escapeHtml(doc.digitalText)}</div>`,
      width: 760,
      confirmButtonText: 'Cerrar',
    });
    return;
  }

  Swal.fire({ icon: 'info', title: 'Sin vista previa', text: 'Este registro no contiene un archivo o texto visualizable.' });
}

export function downloadDocument(id) {
  const doc = (state.documentsData || []).find((d) => d.id === id);
  if (!doc) return;

  if (doc.fileDataUrl) {
    const a = document.createElement('a');
    a.href = doc.fileDataUrl;
    a.download = doc.fileName || `${doc.title || 'documento'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  const textPayload = doc.digitalText || doc.notes || doc.sourceUrl || 'Documento sin contenido binario.';
  const blob = new Blob([textPayload], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(doc.title || 'documento').replace(/[^a-zA-Z0-9-_]+/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportDocumentsCSV() {
  try {
    const rows = filteredDocuments();
    const out = [[
      'Titulo',
      'Categoria',
      'Etiquetas',
      'Archivo',
      'Tamano',
      'URL',
      'Digitalizado',
      'Notas',
      'Creado por',
      'Fecha',
    ]];

    rows.forEach((d) => {
      out.push([
        d.title || '',
        d.category || '',
        d.tags || '',
        d.fileName || '',
        formatSize(d.fileSize || 0),
        d.sourceUrl || '',
        d.digitalText ? 'si' : 'no',
        d.notes || '',
        d.createdBy || '',
        d.createdAt || '',
      ]);
    });

    downloadCSV(`documentos_${new Date().toISOString().slice(0, 10)}`, out);
    showToast({ type: 'success', title: 'CSV de documentos generado', message: `Registros: ${rows.length}` });
  } catch {
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo exportar el CSV de documentos.' });
  }
}
