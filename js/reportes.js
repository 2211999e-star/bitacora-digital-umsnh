/**
 * reportes.js
 * Controles de reportes (firma/logos/rango fechas) + exportación PDF.
 */

import { state, showLoader, hideLoader, formatDate, getStatusText, getPriorityText } from './utils.js';
import { LOCAL_STORAGE_PREFIX } from './config.js';

export function initializeReportControls() {
  const urlToDataUrl = (url) =>
    new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = reject;
        img.src = url;
      } catch (e) {
        reject(e);
      }
    });

  const nameInput = document.getElementById('report-signer-name');
  const roleInput = document.getElementById('report-signer-role');
  const fileInput = document.getElementById('report-signer-file');
  const preview = document.getElementById('report-signer-preview');
  const clearBtn = document.getElementById('report-signer-clear-btn');
  const dateStart = document.getElementById('report-date-start');
  const dateEnd = document.getElementById('report-date-end');

  const orgUnitInput = document.getElementById('report-org-unit');
  const facultyInput = document.getElementById('report-faculty');

  const logoUmichInput = document.getElementById('report-logo-umich-file');
  const logoUmichPreview = document.getElementById('report-logo-umich-preview');
  const logoUmichClearBtn = document.getElementById('report-logo-umich-clear-btn');
  const logoFacultyInput = document.getElementById('report-logo-faculty-file');
  const logoFacultyPreview = document.getElementById('report-logo-faculty-preview');
  const logoFacultyClearBtn = document.getElementById('report-logo-faculty-clear-btn');

  if (!nameInput || !roleInput || !fileInput || !preview || !clearBtn) return;
  const alreadyInitialized = nameInput.dataset.initialized === 'true';

  const signerNameKey = `${LOCAL_STORAGE_PREFIX}reportSignerName`;
  const signerRoleKey = `${LOCAL_STORAGE_PREFIX}reportSignerRole`;
  const signatureKey = `${LOCAL_STORAGE_PREFIX}signatureImage`;
  const logoUmichKey = `${LOCAL_STORAGE_PREFIX}reportLogoUmich`;
  const logoFacultyKey = `${LOCAL_STORAGE_PREFIX}reportLogoFaculty`;
  const orgUnitKey = `${LOCAL_STORAGE_PREFIX}reportOrgUnit`;
  const facultyKey = `${LOCAL_STORAGE_PREFIX}reportFaculty`;
  const reportStartKey = `${LOCAL_STORAGE_PREFIX}reportDateStart`;
  const reportEndKey = `${LOCAL_STORAGE_PREFIX}reportDateEnd`;

  // Defaults
  const storedName = localStorage.getItem(signerNameKey);
  const storedRole = localStorage.getItem(signerRoleKey);
  nameInput.value = storedName || (state.currentUser?.full_name || nameInput.value || 'Ivan Fernandez Mandujano');
  roleInput.value = storedRole || (roleInput.value || 'Comisión de Servicios Informáticos');

  if (orgUnitInput) orgUnitInput.value = localStorage.getItem(orgUnitKey) || orgUnitInput.value || 'Universidad Michoacana de San Nicolás de Hidalgo';
  if (facultyInput) facultyInput.value = localStorage.getItem(facultyKey) || facultyInput.value || '';

  // Sincroniza valores hacia la pantalla de Configuración (si existe)
  const cfgOrg = document.getElementById('cfg-report-org-unit');
  const cfgFac = document.getElementById('cfg-report-faculty');
  const cfgName = document.getElementById('cfg-report-signer-name');
  const cfgRole = document.getElementById('cfg-report-signer-role');
  if (cfgOrg && orgUnitInput) cfgOrg.value = orgUnitInput.value;
  if (cfgFac && facultyInput) cfgFac.value = facultyInput.value;
  if (cfgName) cfgName.value = nameInput.value;
  if (cfgRole) cfgRole.value = roleInput.value;

  // Rango de fechas (persistente)
  if (dateStart && dateEnd) {
    const savedStart = localStorage.getItem(reportStartKey);
    const savedEnd = localStorage.getItem(reportEndKey);
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    dateStart.value = savedStart || dateStart.value || firstDay;
    dateEnd.value = savedEnd || dateEnd.value || today;
  }

  const savedSig = localStorage.getItem(signatureKey);
  if (savedSig) {
    preview.src = savedSig;
    preview.classList.remove('hidden');
    clearBtn.classList.remove('hidden');
  }

  const savedUmichLogo = localStorage.getItem(logoUmichKey);
  if (savedUmichLogo && logoUmichPreview && logoUmichClearBtn) {
    logoUmichPreview.src = savedUmichLogo;
    logoUmichPreview.classList.remove('hidden');
    logoUmichClearBtn.classList.remove('hidden');
  }
  if (!savedUmichLogo && logoUmichPreview && logoUmichClearBtn) {
    // Logo incluido en el proyecto (assets/logo-umich.png)
    urlToDataUrl('./assets/logo-umich.png')
      .then((dataUrl) => {
        localStorage.setItem(logoUmichKey, String(dataUrl));
        logoUmichPreview.src = String(dataUrl);
        logoUmichPreview.classList.remove('hidden');
        logoUmichClearBtn.classList.remove('hidden');
      })
      .catch(() => {});
  }

  const savedFacultyLogo = localStorage.getItem(logoFacultyKey);
  if (savedFacultyLogo && logoFacultyPreview && logoFacultyClearBtn) {
    logoFacultyPreview.src = savedFacultyLogo;
    logoFacultyPreview.classList.remove('hidden');
    logoFacultyClearBtn.classList.remove('hidden');
  }
  if (!savedFacultyLogo && logoFacultyPreview && logoFacultyClearBtn) {
    // Logo incluido en el proyecto (assets/logo-faculty.png)
    urlToDataUrl('./assets/logo-faculty.png')
      .then((dataUrl) => {
        localStorage.setItem(logoFacultyKey, String(dataUrl));
        logoFacultyPreview.src = String(dataUrl);
        logoFacultyPreview.classList.remove('hidden');
        logoFacultyClearBtn.classList.remove('hidden');
      })
      .catch(() => {});
  }

  if (alreadyInitialized) return;
  nameInput.dataset.initialized = 'true';

  nameInput.addEventListener('input', () => {
    localStorage.setItem(signerNameKey, nameInput.value);
    const cfg = document.getElementById('cfg-report-signer-name');
    if (cfg) cfg.value = nameInput.value;
  });
  roleInput.addEventListener('input', () => {
    localStorage.setItem(signerRoleKey, roleInput.value);
    const cfg = document.getElementById('cfg-report-signer-role');
    if (cfg) cfg.value = roleInput.value;
  });
  if (orgUnitInput)
    orgUnitInput.addEventListener('input', () => {
      localStorage.setItem(orgUnitKey, orgUnitInput.value);
      const cfg = document.getElementById('cfg-report-org-unit');
      if (cfg) cfg.value = orgUnitInput.value;
    });
  if (facultyInput)
    facultyInput.addEventListener('input', () => {
      localStorage.setItem(facultyKey, facultyInput.value);
      const cfg = document.getElementById('cfg-report-faculty');
      if (cfg) cfg.value = facultyInput.value;
    });
  if (dateStart) dateStart.addEventListener('change', () => localStorage.setItem(reportStartKey, dateStart.value));
  if (dateEnd) dateEnd.addEventListener('change', () => localStorage.setItem(reportEndKey, dateEnd.value));

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const isOk = file.type === 'image/png' || file.type === 'image/jpeg';
    if (!isOk) {
      Swal.fire({ icon: 'error', title: 'Formato inválido', text: 'Para el PDF usa PNG o JPG.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      try {
        localStorage.setItem(signatureKey, String(dataUrl));
      } catch {
        Swal.fire({ icon: 'error', title: 'Sin espacio', text: 'No se pudo guardar la firma en el navegador.' });
        return;
      }
      preview.src = String(dataUrl);
      preview.classList.remove('hidden');
      clearBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  const bindLogoInput = (inputEl, previewEl, clearEl, storageKey) => {
    if (!inputEl || !previewEl || !clearEl) return;
    inputEl.addEventListener('change', async () => {
      const file = inputEl.files?.[0];
      if (!file) return;
      const isOk = file.type === 'image/png' || file.type === 'image/jpeg';
      if (!isOk) {
        Swal.fire({ icon: 'error', title: 'Formato inválido', text: 'Para el PDF usa PNG o JPG.' });
        inputEl.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        try {
          localStorage.setItem(storageKey, String(dataUrl));
        } catch {
          Swal.fire({ icon: 'error', title: 'Sin espacio', text: 'No se pudo guardar el logo en el navegador.' });
          return;
        }
        previewEl.src = String(dataUrl);
        previewEl.classList.remove('hidden');
        clearEl.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  };

  bindLogoInput(logoUmichInput, logoUmichPreview, logoUmichClearBtn, logoUmichKey);
  bindLogoInput(logoFacultyInput, logoFacultyPreview, logoFacultyClearBtn, logoFacultyKey);
}

export function clearSignature() {
  const signatureKey = `${LOCAL_STORAGE_PREFIX}signatureImage`;
  localStorage.removeItem(signatureKey);
  const preview = document.getElementById('report-signer-preview');
  const clearBtn = document.getElementById('report-signer-clear-btn');
  const fileInput = document.getElementById('report-signer-file');
  if (preview) preview.classList.add('hidden');
  if (clearBtn) clearBtn.classList.add('hidden');
  if (fileInput) fileInput.value = '';
}

export function clearReportLogo(which) {
  const key = which === 'umich' ? `${LOCAL_STORAGE_PREFIX}reportLogoUmich` : `${LOCAL_STORAGE_PREFIX}reportLogoFaculty`;
  localStorage.removeItem(key);

  const preview = document.getElementById(which === 'umich' ? 'report-logo-umich-preview' : 'report-logo-faculty-preview');
  const clearBtn = document.getElementById(which === 'umich' ? 'report-logo-umich-clear-btn' : 'report-logo-faculty-clear-btn');
  const fileInput = document.getElementById(which === 'umich' ? 'report-logo-umich-file' : 'report-logo-faculty-file');

  if (preview) preview.classList.add('hidden');
  if (clearBtn) clearBtn.classList.add('hidden');
  if (fileInput) fileInput.value = '';
}

export async function exportPDF(_ctx, type, options = {}) {
  try {
    showLoader();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const signerName = (document.getElementById('report-signer-name')?.value || '').trim() || 'Ivan Fernandez Mandujano';
    const signerRole = (document.getElementById('report-signer-role')?.value || '').trim();
    const orgUnit = (document.getElementById('report-org-unit')?.value || localStorage.getItem(`${LOCAL_STORAGE_PREFIX}reportOrgUnit`) || '').trim();
    const faculty = (document.getElementById('report-faculty')?.value || localStorage.getItem(`${LOCAL_STORAGE_PREFIX}reportFaculty`) || '').trim();
    const signatureImage = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}signatureImage`);
    const logoUmich = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}reportLogoUmich`);
    const logoFaculty = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}reportLogoFaculty`);

    const headerBottomY = 44;
    const reportFolio = `REP-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 13)}`;
    const folioUsed = options.folio || reportFolio;

    // Metadatos del PDF (más “oficial”)
    try {
      const titleMeta = (options.title || '').trim() || (type === 'events' ? 'Reporte de Eventos' : 'Reporte de Incidencias');
      doc.setProperties({
        title: `${titleMeta} (${folioUsed})`,
        subject: 'Bitácora Digital',
        author: signerName || 'Bitácora Digital',
        creator: 'Bitácora Digital',
        keywords: 'bitácora, incidencias, eventos, mantenimiento, UMSNH',
      });
    } catch {
      // noop
    }

    const parseMetaFromObservations = (text = '') => {
      const raw = String(text || '');
      const line = raw.split('\n').find((l) => l.trim().startsWith('__meta__='));
      if (!line) return {};
      try {
        return JSON.parse(line.trim().slice('__meta__='.length)) || {};
      } catch {
        return {};
      }
    };

    const addHeader = () => {
      doc.setTextColor(0, 0, 0);

      // Logos (opcional)
      const logoH = 14;
      const logoY = 8;
      const leftX = 15;
      const rightX = pageWidth - 15 - 18;

      if (logoUmich) {
        try {
          const format = logoUmich.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(logoUmich, format, leftX, logoY, 18, logoH);
        } catch {
          // noop
        }
      }
      if (logoFaculty) {
        try {
          const format = logoFaculty.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(logoFaculty, format, rightX, logoY, 18, logoH);
        } catch {
          // noop
        }
      }

      // Encabezado institucional (centrado, configurable)
      // Nota: orgUnit/faculty se editan desde Reportes → Configuración del PDF
      const main = orgUnit || 'Universidad Michoacana de San Nicolás de Hidalgo';
      const y1 = 14;
      const y2 = 19;
      const y3 = 24;

      doc.setFontSize(11);
      doc.text(main, pageWidth / 2, y1, { align: 'center' });

      doc.setFontSize(10);
      if (faculty) {
        doc.text(faculty, pageWidth / 2, y2, { align: 'center' });
        doc.text('Comisión de Servicios Informáticos', pageWidth / 2, y3, { align: 'center' });
      } else {
        doc.text('Comisión de Servicios Informáticos', pageWidth / 2, y2 + 3, { align: 'center' });
      }

      doc.setTextColor(90);
      doc.text(`Folio: ${folioUsed}  ·  Generado: ${formatDate(new Date())}`, pageWidth / 2, 43, { align: 'center' });
      doc.setTextColor(0);
      doc.setDrawColor(220);
      doc.line(15, headerBottomY, pageWidth - 15, headerBottomY);
    };

    const addFooter = (pageNumber) => {
      const pageNum = pageNumber || doc.getCurrentPageInfo().pageNumber;
      doc.setDrawColor(230);
      doc.line(15, pageHeight - 14, pageWidth - 15, pageHeight - 14);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('Bitácora Digital', 15, pageHeight - 8);
      doc.text(`Emitido: ${formatDate(new Date())}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.text(`Página ${pageNum}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
      doc.setTextColor(0);
    };

    if (type === 'activities') {
      const start = document.getElementById('report-date-start')?.value;
      const end = document.getElementById('report-date-end')?.value;
      const serviceTypeFilter = (options.serviceType || '').trim();
      const reportTitle = (options.title || '').trim() || (serviceTypeFilter ? `Reporte de ${serviceTypeFilter}` : 'Reporte de Incidencias');

      const inRange = (d) => {
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      };

      const base = Array.isArray(options.rows) ? options.rows : start || end ? state.activitiesData.filter((a) => inRange(a.date)) : [...state.activitiesData];

      const rows = serviceTypeFilter && !Array.isArray(options.rows) ? base.filter((a) => (a.service_type || '') === serviceTypeFilter) : base;

      addHeader();

      doc.setFontSize(12);
      const titleY = headerBottomY + 10;
      const metaY = titleY + 6;
      const tableStartY = metaY + 6;

      doc.text(reportTitle, 15, titleY);
      doc.setFontSize(9);
      const metaLine =
        Array.isArray(options.rows) && rows[0]
          ? `Recibido: ${formatDate(rows[0].received_date || rows[0].date)}${rows[0].delivery_date ? `  |  Entrega: ${formatDate(rows[0].delivery_date)}` : ''}${
              rows[0].priority ? `  |  Prioridad: ${getPriorityText(rows[0].priority)}` : ''
            }`
          : `Periodo: ${(start || '—')} a ${(end || '—')}  |  Total: ${rows.length}${serviceTypeFilter ? `  |  Filtro: ${serviceTypeFilter}` : ''}`;
      doc.text(metaLine, 15, metaY);

      const tableData = rows.map((a) => {
        const meta = parseMetaFromObservations(a.observations || '');
        const folio = meta.folio || '—';
        const edificio = meta.edificio || a.coordination || '—';
        const carrera = meta.carrera || a.department || '—';
        const salon = meta.salon || '—';
        const turno = meta.turno || '—';
        const tipo = meta.tipo || a.service_type || '—';
        const desc = (a.description || '').trim();
        return [
          folio,
          formatDate(a.date),
          edificio,
          carrera,
          salon,
          turno,
          tipo,
          desc.length > 60 ? `${desc.slice(0, 60)}…` : desc,
          getPriorityText(a.priority),
          getStatusText(a.task_status),
        ];
      });

      doc.autoTable({
        startY: tableStartY,
        head: [[
          'Folio',
          'Fecha',
          'Edificio',
          'Carrera',
          'Salón',
          'Turno',
          'Tipo',
          'Descripción',
          'Prioridad',
          'Estado',
        ]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 10, right: 10, top: headerBottomY + 8 },
        didDrawPage: () => {
          addHeader();
          const pageNum = doc.getCurrentPageInfo().pageNumber;
          addFooter(pageNum);
        },
      });

      // Estadísticas + firma
      let y = (doc.lastAutoTable?.finalY || 55) + 10;
      if (y > pageHeight - 70) {
        doc.addPage();
        addHeader();
        addFooter();
        y = headerBottomY + 10;
      }

      const stats = {
        total: rows.length,
        pendientes: rows.filter((a) => a.task_status === 'pendiente').length,
        enProceso: rows.filter((a) => a.task_status === 'en_proceso').length,
        completadas: rows.filter((a) => a.task_status === 'completado').length,
        canceladas: rows.filter((a) => a.task_status === 'cancelado').length,
      };

      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.text('Estadísticas:', 15, y);
      doc.setFontSize(9);
      doc.text(`Total: ${stats.total}`, 25, y + 8);
      doc.text(`Pendientes: ${stats.pendientes}`, 25, y + 14);
      doc.text(`En Proceso: ${stats.enProceso}`, 25, y + 20);
      doc.text(`Completadas: ${stats.completadas}`, 25, y + 26);
      doc.text(`Canceladas: ${stats.canceladas}`, 25, y + 32);

      const sigY = y + 46;
      doc.setFontSize(11);
      doc.text('FIRMA:', 15, sigY);
      doc.setDrawColor(0);
      doc.line(15, sigY + 18, 95, sigY + 18);

      if (signatureImage) {
        try {
          const format = signatureImage.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(signatureImage, format, 15, sigY + 3, 60, 14);
        } catch {
          // noop
        }
      }

      doc.setFontSize(10);
      doc.text(signerName, 15, sigY + 26);
      if (signerRole) {
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text(signerRole, 15, sigY + 32);
      }
    }

    if (type === 'events') {
      const start = document.getElementById('report-date-start')?.value;
      const end = document.getElementById('report-date-end')?.value;

      const inRange = (d) => {
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      };

      const rows = start || end ? state.eventsData.filter((e) => inRange(e.event_date)) : [...state.eventsData];

      addHeader();
      doc.setFontSize(12);
      const titleY = headerBottomY + 10;
      const metaY = titleY + 6;
      const tableStartY = metaY + 6;

      doc.text('Reporte de Eventos', 15, titleY);
      doc.setFontSize(9);
      doc.text(`Periodo: ${(start || '—')} a ${(end || '—')}  |  Total: ${rows.length}`, 15, metaY);

      const tableData = rows.map((e) => [
        formatDate(e.event_date),
        e.event_time || '-',
        e.title || '-',
        e.location || '-',
        getStatusText(e.status),
        e.assigned_to || '-',
      ]);

      doc.autoTable({
        startY: tableStartY,
        head: [[
          'Fecha',
          'Hora',
          'Evento',
          'Ubicación',
          'Estado',
          'Asignado',
        ]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 10, right: 10, top: headerBottomY + 8 },
        didDrawPage: () => {
          addHeader();
          const pageNum = doc.getCurrentPageInfo().pageNumber;
          addFooter(pageNum);
        },
      });

      let y = (doc.lastAutoTable?.finalY || 55) + 10;
      if (y > pageHeight - 70) {
        doc.addPage();
        addHeader();
        addFooter();
        y = headerBottomY + 10;
      }

      const stats = {
        total: rows.length,
        pendientes: rows.filter((e) => e.status === 'pendiente').length,
        enProceso: rows.filter((e) => e.status === 'en_proceso').length,
        completados: rows.filter((e) => e.status === 'completado').length,
        cancelados: rows.filter((e) => e.status === 'cancelado').length,
      };

      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.text('Estadísticas:', 15, y);
      doc.setFontSize(9);
      doc.text(`Total: ${stats.total}`, 25, y + 8);
      doc.text(`Pendientes: ${stats.pendientes}`, 25, y + 14);
      doc.text(`En Proceso: ${stats.enProceso}`, 25, y + 20);
      doc.text(`Completados: ${stats.completados}`, 25, y + 26);
      doc.text(`Cancelados: ${stats.cancelados}`, 25, y + 32);

      const sigY = y + 46;
      doc.setFontSize(11);
      doc.text('FIRMA:', 15, sigY);
      doc.setDrawColor(0);
      doc.line(15, sigY + 18, 95, sigY + 18);

      if (signatureImage) {
        try {
          const format = signatureImage.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(signatureImage, format, 15, sigY + 3, 60, 14);
        } catch {
          // noop
        }
      }

      doc.setFontSize(10);
      doc.text(signerName, 15, sigY + 26);
      if (signerRole) {
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text(signerRole, 15, sigY + 32);
      }
    }

    const prefix = (options.filenamePrefix || '').trim() || (type === 'events' ? 'reporte_eventos' : `reporte_${type}`);

    // Registrar generación en DB (si hay Supabase real)
    try {
      const supabase = _ctx?.supabase;
      if (supabase && !supabase.__local && state.currentUser?.id) {
        const filters = {
          type,
          date_start: document.getElementById('report-date-start')?.value || null,
          date_end: document.getElementById('report-date-end')?.value || null,
          serviceType: options.serviceType || null,
          title: options.title || null,
        };
        await supabase.from('reports_log').insert({
          user_id: state.currentUser.id,
          folio: folioUsed,
          report_type: String(type),
          filters,
        });
      }
    } catch {
      // noop (no bloquear exportación)
    }

    doc.save(`${prefix}_${folioUsed}_${new Date().toISOString().split('T')[0]}.pdf`);

    Swal.fire({ icon: 'success', title: 'PDF Generado', text: 'El reporte ha sido descargado', timer: 2000, showConfirmButton: false });
  } catch (error) {
    console.error('Error generating PDF:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF' });
  } finally {
    hideLoader();
  }
}

export function exportMaintenanceReport(ctx, kind) {
  const normalized = String(kind || '').toLowerCase();
  if (normalized === 'preventivo') {
    return exportPDF(ctx, 'activities', {
      serviceType: 'Mantenimiento preventivo',
      title: 'Reporte de Mantenimiento preventivo',
      filenamePrefix: 'reporte_mantenimiento_preventivo',
    });
  }
  if (normalized === 'correctivo') {
    return exportPDF(ctx, 'activities', {
      serviceType: 'Mantenimiento correctivo',
      title: 'Reporte de Mantenimiento correctivo',
      filenamePrefix: 'reporte_mantenimiento_correctivo',
    });
  }

  return exportPDF(ctx, 'activities');
}
