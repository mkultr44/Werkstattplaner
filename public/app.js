
const coerceBool = (v) => {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'on' || s === 'yes' || s === 'y';
};
const STATUS_SEQUENCE = ['pending', 'arrived', 'done'];
const STATUS_LABELS = {
  pending: 'Auto nicht da',
  arrived: 'Auto da',
  done: 'Auto fertig',
};

const CATEGORY_CONFIG = {
  routine: {
    title: 'Routinearbeiten',
    description: 'Reifenwechsel, Ölwechsel, Inspektionen',
  },
  inspection: {
    title: 'TÜV / AU',
    description: 'Dienstag bis Freitag verfügbar',
  },
  major: {
    title: 'Werkstattaufträge',
    description: 'Reparaturen, umfangreiche Arbeiten',
  },
};

const CATEGORY_ORDER = Object.keys(CATEGORY_CONFIG);
const SERVICE_FLAGS = [
  { key: 'huAu', label: 'HU / AU' },
  { key: 'carCare', label: 'Wagenpflege' },
  { key: 'storage', label: 'Einlagerung' },
  { key: 'rentalCar', label: 'Mietwagen' },
];

const TEXT_BLOCK_CATEGORIES = [
  {
    id: 'climate',
    label: 'Heizung / Klimaanlage',
    blocks: [
      { text: 'Klimaservice', aw: 10 },
      { text: 'Klimaanlage desinfizieren', aw: 6 },
      { text: 'Pollenfilter erneuern', aw: 3 },
    ],
  },
  {
    id: 'inspection',
    label: 'HU / AU',
    blocks: [
      { text: 'TÜV / AU', aw: 5 },
      { text: 'HU / AU Vorbereitung', aw: 4 },
      { text: 'Abgasuntersuchung dokumentieren', aw: 3 },
    ],
  },
  {
    id: 'wheels',
    label: 'Räder / Reifen',
    blocks: [
      { text: 'Radwechsel 4x', aw: 5 },
      { text: 'Reifen erneuern 1 Stück', aw: 5 },
      { text: 'Reifen erneuern 4 Stück', aw: 12 },
      { text: 'Reifen wechseln mit wuchten 4x', aw: 12 },
    ],
  },
  {
    id: 'carCare',
    label: 'Wagenpflege',
    blocks: [
      { text: 'Motorwäsche', aw: 10 },
      { text: 'Wagenpflege innen + außen', aw: 10 },
      { text: 'Aufbereitung Lack & Innenraum', aw: 12 },
    ],
  },
  {
    id: 'maintenance',
    label: 'Wartung',
    blocks: [
      { text: 'Ölwechsel mit Filter', aw: 5 },
      { text: 'Urlaubscheck', aw: 5 },
      { text: 'Wintercheck', aw: 5 },
      { text: 'Bremsflüssigkeit wechseln', aw: 4 },
    ],
  },
];

const dayView = document.getElementById('day-view');
const weekView = document.getElementById('week-view');
const selectedDateLabel = document.getElementById('selected-date-label');
const jobModal = document.getElementById('job-modal');
const clipboardModal = document.getElementById('clipboard-modal');
const jobForm = document.getElementById('job-form');
const clipboardForm = document.getElementById('clipboard-form');
const fileInput = document.getElementById('job-files');
const filePreview = document.getElementById('file-preview');
const modalTitle = document.getElementById('modal-title');
const deleteJobButton = document.getElementById('delete-job-btn');
const clipboardList = document.getElementById('clipboard-list');
const timeSelect = document.getElementById('job-time');
const textBlockModal = document.getElementById('text-block-modal');
const textBlockButton = document.getElementById('text-blocks-btn');
const textBlockSearchInput = document.getElementById('text-block-search');
const textBlockCategorySelect = document.getElementById('text-block-category');
const textBlockList = document.getElementById('text-block-list');

const state = {
  jobsByDay: new Map(),
  jobsById: new Map(),
  clipboard: [],
};

let currentDate = new Date();
let editingJobId = null;
let editingJobSnapshot = null;
let activeView = 'day';

const api = {
  listJobs: () => apiRequest('/api/jobs'),
  createJob: (formData) =>
    apiRequest('/api/jobs', {
      method: 'POST',
      body: formData,
    }),
  updateJob: (id, formData) =>
    apiRequest(`/api/jobs/${id}`, {
      method: 'PUT',
      body: formData,
    }),
  updateJobStatus: (id, status) =>
    apiRequest(`/api/jobs/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }),
  deleteJob: (id) =>
    apiRequest(`/api/jobs/${id}`, {
      method: 'DELETE',
    }),
  listClipboard: () => apiRequest('/api/clipboard'),
  createClipboard: (payload) =>
    apiRequest('/api/clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteClipboard: (id) =>
    apiRequest(`/api/clipboard/${id}`, {
      method: 'DELETE',
    }),
};

bindUI();
registerServiceWorker();
bootstrap();

async function bootstrap() {
  try {
    await Promise.all([loadJobsFromServer(), loadClipboardFromServer()]);
    render();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Die Werkstattdaten konnten nicht geladen werden.');
  }
}

function bindUI() {
  
// ensure checkboxes reflect job flags
(function(job){
  try{
    const storageInput = document.querySelector('form#job-form input[name="storage"]');
    if (storageInput) storageInput.checked = !!(job?.storage || job?.storage === 1 || job?.storage === '1' || job?.storage === true);
    const rentalInput = document.querySelector('form#job-form input[name="rentalCar"]');
    if (rentalInput) rentalInput.checked = !!(job?.rentalCar || job?.rentalCar === 1 || job?.rentalCar === '1' || job?.rentalCar === true);
  }catch(e){}
})(window.currentJob||{});
populateTimeOptions();
  initializeTextBlocks();
  document.getElementById('day-view-btn').addEventListener('click', showDayView);
  document.getElementById('week-view-btn').addEventListener('click', showWeekView);
  document.getElementById('prev-day').addEventListener('click', () => changeDay(-1));
  document.getElementById('next-day').addEventListener('click', () => changeDay(1));
  document.getElementById('today-btn').addEventListener('click', () => {
    currentDate = new Date();
    render();
  });
  document
    .getElementById('new-job-btn')
    .addEventListener('click', () => openJobModal({ date: formatDateInput(currentDate) }));
  document
    .getElementById('add-clipboard-item')
    .addEventListener('click', () => openClipboardModal());

  if (textBlockButton) {
    textBlockButton.addEventListener('click', openTextBlockModal);
  }

  if (textBlockSearchInput) {
    textBlockSearchInput.addEventListener('input', renderTextBlockItems);
  }

  if (textBlockCategorySelect) {
    textBlockCategorySelect.addEventListener('change', renderTextBlockItems);
  }

  jobForm.addEventListener('submit', handleJobSubmit);
  clipboardForm.addEventListener('submit', handleClipboardSubmit);
  fileInput.addEventListener('change', handleFileInput);
  deleteJobButton.addEventListener('click', handleDeleteJob);

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', closeModals);
  });

  document.querySelectorAll('[data-close-text-block]').forEach((button) => {
    button.addEventListener('click', () => closeTextBlockModal());
  });

  [jobModal, clipboardModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModals();
    });
  });

  if (textBlockModal) {
    textBlockModal.addEventListener('click', (event) => {
      if (event.target === textBlockModal) closeTextBlockModal();
    });
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => console.error('Service Worker Registrierung fehlgeschlagen:', error));
  });
}

function initializeTextBlocks() {
  if (!textBlockCategorySelect) return;

  textBlockCategorySelect.innerHTML = '';
  TEXT_BLOCK_CATEGORIES.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.label;
    textBlockCategorySelect.appendChild(option);
  });

  renderTextBlockItems();
}

function renderTextBlockItems() {
  if (!textBlockList) return;

  const searchTerm = textBlockSearchInput?.value.trim().toLowerCase() || '';
  const selectedCategoryId = textBlockCategorySelect?.value;

  const categoriesToSearch = searchTerm
    ? TEXT_BLOCK_CATEGORIES
    : TEXT_BLOCK_CATEGORIES.filter((category) =>
        !selectedCategoryId ? true : category.id === selectedCategoryId,
      );

  const matches = [];

  categoriesToSearch.forEach((category) => {
    category.blocks
      .filter((block) => {
        if (!searchTerm) return true;
        return block.text.toLowerCase().includes(searchTerm);
      })
      .forEach((block) => {
        matches.push({ block, category });
      });
  });

  textBlockList.innerHTML = '';
  textBlockList.classList.toggle('has-results', matches.length > 0);
  textBlockList.scrollTop = 0;

  if (matches.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'text-block-empty';
    emptyState.textContent = 'Keine Textbausteine gefunden.';
    textBlockList.appendChild(emptyState);
    return;
  }

  const header = document.createElement('div');
  header.className = 'text-block-header';

  const headerText = document.createElement('span');
  headerText.textContent = 'Text';
  header.appendChild(headerText);

  const headerAw = document.createElement('span');
  headerAw.textContent = 'AW';
  header.appendChild(headerAw);

  textBlockList.appendChild(header);

  matches.forEach(({ block, category }) => {
    const itemButton = document.createElement('button');
    itemButton.type = 'button';
    itemButton.className = 'text-block-row';

    const textCell = document.createElement('div');
    textCell.className = 'text-block-cell text-block-cell-text';

    const title = document.createElement('span');
    title.className = 'text-block-title';
    title.textContent = block.text;
    textCell.appendChild(title);

    if (searchTerm) {
      const categoryLabel = document.createElement('span');
      categoryLabel.className = 'text-block-item-category';
      categoryLabel.textContent = category.label;
      textCell.appendChild(categoryLabel);
    }

    itemButton.appendChild(textCell);

    const awCell = document.createElement('span');
    awCell.className = 'text-block-cell text-block-cell-aw';
    awCell.textContent = block.aw ? block.aw : '—';
    itemButton.appendChild(awCell);

    itemButton.addEventListener('click', () => handleTextBlockSelection(block));
    textBlockList.appendChild(itemButton);
  });
}

function handleTextBlockSelection(block) {
  insertTextBlockIntoNotes(block);
  if (textBlockSearchInput) {
    textBlockSearchInput.focus();
    textBlockSearchInput.select();
  }
}

function insertTextBlockIntoNotes(block) {
  if (!jobForm || !jobForm.elements?.notes) return;

  const notesField = jobForm.elements.notes;
  const insertion = block.aw ? `${block.text} (AW ${block.aw})` : block.text;
  const start = typeof notesField.selectionStart === 'number' ? notesField.selectionStart : notesField.value.length;
  const end = typeof notesField.selectionEnd === 'number' ? notesField.selectionEnd : start;
  const before = notesField.value.slice(0, start);
  const after = notesField.value.slice(end);
  const needsLeadingNewline = before && !before.endsWith('\n') ? '\n' : '';
  const needsTrailingNewline = after && !after.startsWith('\n') ? `\n${after}` : after;

  notesField.value = `${before}${needsLeadingNewline}${insertion}${needsTrailingNewline}`;

  const cursor = (before + needsLeadingNewline + insertion).length;
  notesField.setSelectionRange(cursor, cursor);
}

function openTextBlockModal() {
  if (!textBlockModal) return;
  if (textBlockSearchInput) {
    textBlockSearchInput.value = '';
  }

  renderTextBlockItems();
  toggleModal(textBlockModal, true);

  if (textBlockSearchInput) {
    textBlockSearchInput.focus();
  }
}

function closeTextBlockModal(options = {}) {
  if (!textBlockModal) return;
  toggleModal(textBlockModal, false);

  if (options.restoreFocus === false) {
    return;
  }

  if (jobForm?.elements?.notes) {
    jobForm.elements.notes.focus();
  }
}

function populateTimeOptions() {
  if (!timeSelect) return;
  timeSelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Ganztägig';
  timeSelect.appendChild(defaultOption);

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = `${value} Uhr`;
      timeSelect.appendChild(option);
    }
  }
}

function render() {
  renderHeader();
  renderDayView();
  renderWeekView();
  renderClipboard();
}

function renderHeader() {
  const prevButton = document.getElementById('prev-day');
  const nextButton = document.getElementById('next-day');

  if (activeView === 'week') {
    const startOfWeek = getMonday(currentDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startText = startOfWeek.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const endText = endOfWeek.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    selectedDateLabel.textContent = `Woche ${startText} – ${endText}`;
    prevButton.setAttribute('aria-label', 'Vorherige Woche');
    nextButton.setAttribute('aria-label', 'Nächste Woche');
  } else {
    selectedDateLabel.textContent = currentDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    prevButton.setAttribute('aria-label', 'Vorheriger Tag');
    nextButton.setAttribute('aria-label', 'Nächster Tag');
  }
}

function renderDayView() {
  const dayColumns = document.createElement('div');
  dayColumns.className = 'day-columns';

  CATEGORY_ORDER.forEach((category) => {
    const config = CATEGORY_CONFIG[category];
    const column = document.createElement('section');
    column.className = 'day-column';
    const available = isCategoryAvailable(category, currentDate);
    if (!available) column.classList.add('disabled');

    const header = document.createElement('header');
    const title = document.createElement('div');
    title.innerHTML = `<h2>${config.title}</h2><small>${config.description}</small>`;

    const addButton = document.createElement('button');
    addButton.className = 'ghost-button add-job';
    addButton.type = 'button';
    addButton.textContent = 'Auftrag hinzufügen';
    addButton.disabled = !available;
    addButton.addEventListener('click', () =>
      openJobModal({ date: formatDateInput(currentDate), category }),
    );

    header.appendChild(title);
    header.appendChild(addButton);

    const jobList = document.createElement('div');
    jobList.className = 'job-list';
    const jobs = getJobsForDay(currentDate, category);

    if (!jobs.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Noch keine Aufträge angelegt.';
      jobList.appendChild(empty);
    } else {
      jobs.forEach((job) => jobList.appendChild(createJobCard(job)));
    }

    column.appendChild(header);
    column.appendChild(jobList);
    dayColumns.appendChild(column);
  });

  dayView.innerHTML = '';
  dayView.appendChild(dayColumns);
}

function renderWeekView() {
  const startOfWeek = getMonday(currentDate);
  const layout = document.createElement('div');
  layout.className = 'week-layout';

  CATEGORY_ORDER.forEach((category) => {
    const config = CATEGORY_CONFIG[category];
    const categorySection = document.createElement('section');
    categorySection.className = 'week-category';

    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = config.title;
    const description = document.createElement('small');
    description.textContent = config.description;
    header.appendChild(title);
    header.appendChild(description);
    categorySection.appendChild(header);

    const dayList = document.createElement('div');
    dayList.className = 'week-day-list';

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const available = isCategoryAvailable(category, day);

      const dayBlock = document.createElement('article');
      dayBlock.className = 'week-day-block';
      if (!available) dayBlock.classList.add('disabled');

      const dayHeader = document.createElement('div');
      dayHeader.className = 'week-day-header';

      const dayName = document.createElement('span');
      dayName.className = 'weekday-name';
      dayName.textContent = day.toLocaleDateString('de-DE', { weekday: 'short' });

      const dayLabel = document.createElement('span');
      dayLabel.className = 'weekday-date';
      dayLabel.textContent = day.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
      });

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'week-add-button';
      addButton.textContent = '+';
      addButton.setAttribute(
        'aria-label',
        `Auftrag für ${day.toLocaleDateString('de-DE')} hinzufügen`,
      );
      addButton.disabled = !available;
      addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        openJobModal({ date: formatDateInput(day), category });
      });

      dayHeader.appendChild(dayName);
      dayHeader.appendChild(dayLabel);
      dayHeader.appendChild(addButton);

      const jobs = getJobsForDay(day, category);
      const jobContainer = document.createElement('div');
      jobContainer.className = 'week-job-list';

      if (!jobs.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = available ? 'Keine Aufträge' : 'Nicht verfügbar';
        jobContainer.appendChild(empty);
      } else {
        jobs.forEach((job) => jobContainer.appendChild(createWeekJobCard(job)));
      }

      dayBlock.appendChild(dayHeader);
      dayBlock.appendChild(jobContainer);
      dayList.appendChild(dayBlock);
    }

    categorySection.appendChild(dayList);
    layout.appendChild(categorySection);
  });

  weekView.innerHTML = '';
  weekView.appendChild(layout);
}

function createWeekJobCard(job) {
  const card = document.createElement('article');
  card.className = 'week-job-card';

  const header = document.createElement('div');
  header.className = 'week-job-card-header';

  const title = document.createElement('h4');
  title.textContent = job.title;

  const time = document.createElement('span');
  time.className = 'week-job-time';
  time.textContent = job.time ? `${job.time} Uhr` : 'Ganztägig';

  header.appendChild(title);
  header.appendChild(time);
  card.appendChild(header);

  const customer = document.createElement('p');
  customer.className = 'week-job-line';
  customer.textContent = job.customer || '–';
  card.appendChild(customer);

  const vehicleInfo = [job.vehicle, job.license].filter(Boolean).join(' • ');
  if (vehicleInfo) {
    const vehicle = document.createElement('p');
    vehicle.className = 'week-job-line muted';
    vehicle.textContent = vehicleInfo;
    card.appendChild(vehicle);
  }

  if (job.notes) {
    const notes = document.createElement('p');
    notes.className = 'week-job-notes';
    notes.textContent = job.notes.length > 140 ? `${job.notes.slice(0, 140)}…` : job.notes;
    card.appendChild(notes);
  }

  const flags = document.createElement('div');
  flags.className = 'week-job-flags';
  SERVICE_FLAGS.forEach((flag) => {
    if (job[flag.key]) {
      const badge = document.createElement('span');
      badge.className = 'week-flag';
      badge.textContent = flag.label;
      flags.appendChild(badge);
    }
  });
  if (flags.children.length) {
    card.appendChild(flags);
  }

  card.tabIndex = 0;
  card.addEventListener('click', () => openJobModal(job));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openJobModal(job);
    }
  });

  return card;
}

function renderClipboard() {
  clipboardList.innerHTML = '';
  if (!state.clipboard.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Hier können Sie Aufgaben oder Notizen ablegen.';
    clipboardList.appendChild(empty);
    return;
  }

  const items = [...state.clipboard].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'clipboard-card';

    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = item.title;

    const removeButton = document.createElement('button');
    removeButton.className = 'icon-button';
    removeButton.type = 'button';
    removeButton.textContent = '✕';
    removeButton.addEventListener('click', async () => {
      try {
        await api.deleteClipboard(item.id);
        state.clipboard = state.clipboard.filter((note) => note.id !== item.id);
        renderClipboard();
      } catch (error) {
        console.error(error);
        alert(error.message || 'Notiz konnte nicht entfernt werden.');
      }
    });

    header.appendChild(title);
    header.appendChild(removeButton);

    const body = document.createElement('p');
    body.textContent = item.notes;

    card.appendChild(header);
    card.appendChild(body);
    clipboardList.appendChild(card);
  });
}

function createJobCard(job) {
  const template = document.getElementById('job-card-template');
  const element = template.content.firstElementChild.cloneNode(true);
  element.dataset.jobId = job.id;

  const jobTitle = element.querySelector('.job-title');
  jobTitle.textContent = job.title;

  const jobTime = element.querySelector('.job-time');
  jobTime.textContent = job.time ? `${job.time} Uhr` : 'Ganztägig';

  const jobMeta = element.querySelector('.job-meta');
  jobMeta.innerHTML = '';
  const categoryChip = createMetaChip(CATEGORY_CONFIG[job.category]?.title || '');
  const statusChip = createMetaChip(STATUS_LABELS[job.status], 'status');
  statusChip.style.setProperty('--status-color', statusColor(job.status));
  jobMeta.appendChild(categoryChip);
  jobMeta.appendChild(statusChip);

  element.querySelector('.job-customer').textContent = job.customer || '–';
  element.querySelector('.job-contact').textContent = job.contact || '–';
  element.querySelector('.job-vehicle').textContent = job.vehicle || '–';
  element.querySelector('.job-license').textContent = job.license || '–';

  const notesBlock = element.querySelector('.job-notes-block');
  if (job.notes) {
    notesBlock.classList.remove('hidden');
    element.querySelector('.job-notes').textContent = job.notes;
  } else {
    notesBlock.classList.add('hidden');
  }

  const attachmentsBlock = element.querySelector('.job-attachments');
  const attachmentList = element.querySelector('.job-attachment-list');
  attachmentList.innerHTML = '';
  if (job.attachments?.length) {
    attachmentsBlock.classList.remove('hidden');
    job.attachments.forEach((attachment) => {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = attachment.name;
      attachmentList.appendChild(link);
    });
    attachmentList.addEventListener('click', (event) => event.stopPropagation());
  } else {
    attachmentsBlock.classList.add('hidden');
  }

  const serviceContainer = element.querySelector('.job-services');
  renderServiceFlags(serviceContainer, job);

  const statusToggle = element.querySelector('.status-toggle');
  statusToggle.dataset.status = job.status;
  statusToggle.title = STATUS_LABELS[job.status];
  statusToggle.setAttribute('aria-label', STATUS_LABELS[job.status]);
  statusToggle.style.background = statusColor(job.status);
  statusToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    cycleJobStatus(job);
  });
  statusToggle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      cycleJobStatus(job);
    }
  });

  element.tabIndex = 0;
  element.addEventListener('click', (event) => {
    if (event.target.closest('.flag-checkbox')) {
      return;
    }
    openJobModal(job);
  });
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openJobModal(job);
    }
  });

  return element;
}

function createMetaChip(label, type) {
  const chip = document.createElement('span');
  chip.className = 'meta-chip';
  if (type) {
    chip.classList.add(`meta-chip-${type}`);
  }
  chip.textContent = label;
  return chip;
}

function renderServiceFlags(container, job) {
  container.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Zusatzleistungen';
  container.appendChild(label);

  const list = document.createElement('div');
  list.className = 'service-checkboxes';

  SERVICE_FLAGS.forEach((flag) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'flag-checkbox';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(job[flag.key]);
    input.setAttribute('aria-label', flag.label);
    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('change', (event) =>
      handleServiceFlagToggle(job, flag.key, event.target),
    );

    const text = document.createElement('span');
    text.textContent = flag.label;

    wrapper.appendChild(input);
    wrapper.appendChild(text);
    list.appendChild(wrapper);
  });

  container.appendChild(list);
}

async function handleServiceFlagToggle(job, flagKey, input) {
  const checked = input.checked;
  try {
    const updated = await updateJobPartial(job.id, { [flagKey]: checked });
    if (updated) {
      upsertJob(updated);
      render();
    }
  } catch (error) {
    console.error(error);
    alert(error.message || 'Änderung konnte nicht gespeichert werden.');
    input.checked = !checked;
  }
}

async function updateJobPartial(jobId, overrides = {}) {
  const current = findJob(jobId);
  if (!current) return null;

  const next = { ...current, ...overrides };
  const formData = new FormData();
  formData.set('date', next.date);
  formData.set('time', next.time || '');
  formData.set('category', next.category);
  formData.set('title', next.title);
  formData.set('customer', next.customer || '');
  formData.set('contact', next.contact || '');
  formData.set('vehicle', next.vehicle || '');
  formData.set('license', next.license || '');
  formData.set('notes', next.notes || '');
  formData.set('huAu', next.huAu ? '1' : '0');
  formData.set('carCare', next.carCare ? '1' : '0');
  formData.set('storage', next.storage ? '1' : '0');
  formData.set('rentalCar', next.rentalCar ? '1' : '0');
  formData.set('replaceAttachments', 'false');
  formData.set('status', next.status);

  return api.updateJob(jobId, formData);
}

async function cycleJobStatus(job) {
  const currentIndex = STATUS_SEQUENCE.indexOf(job.status);
  const nextStatus = STATUS_SEQUENCE[(currentIndex + 1) % STATUS_SEQUENCE.length];
  try {
    const updated = await api.updateJobStatus(job.id, nextStatus);
    upsertJob(updated);
    render();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Status konnte nicht aktualisiert werden.');
  }
}

async function handleJobSubmit(event) {
  event.preventDefault();
  const formData = new FormData(jobForm);

  const payload = {
    date: formData.get('date') || formatDateInput(currentDate),
    time: formData.get('time')?.trim() || '',
    category: formData.get('category') || 'routine',
    title: formData.get('title')?.trim() || '',
    customer: formData.get('customer')?.trim() || '',
    contact: formData.get('contact')?.trim() || '',
    vehicle: formData.get('vehicle')?.trim() || '',
    license: formData.get('license')?.trim() || '',
    notes: formData.get('notes')?.trim() || '',
    huAu: formData.get('huAu') === '1',
    carCare: formData.get('carCare') === '1',
    storage: coerceBool(formData.get('storage')),
    rentalCar: coerceBool(formData.get('rentalCar')),
  };

  if (!payload.title) {
    alert('Bitte geben Sie eine Kurzbeschreibung für den Auftrag an.');
    return;
  }

  if (!isCategoryAvailable(payload.category, new Date(payload.date))) {
    alert('Dieser Bereich ist am ausgewählten Tag nicht verfügbar.');
    return;
  }

  const clipboardRequested = formData.get('clipboard');

  formData.set('date', payload.date);
  formData.set('time', payload.time);
  formData.set('category', payload.category);
  formData.set('title', payload.title);
  formData.set('customer', payload.customer);
  formData.set('contact', payload.contact);
  formData.set('vehicle', payload.vehicle);
  formData.set('license', payload.license);
  formData.set('notes', payload.notes);
  formData.set('huAu', payload.huAu ? '1' : '0');
  formData.set('carCare', payload.carCare ? '1' : '0');
  formData.set('storage', coerceBool(payload.storage) ? '1' : '0');
  formData.set('rentalCar', coerceBool(payload.rentalCar) ? '1' : '0');
  formData.delete('clipboard');

  const replaceAttachments = Boolean(editingJobId && fileInput.files.length);
  formData.append('replaceAttachments', replaceAttachments ? 'true' : 'false');

  if (editingJobId) {
    formData.append('status', editingJobSnapshot?.status || 'pending');
  }

  try {
    let job;
    if (editingJobId) {
      job = await api.updateJob(editingJobId, formData);
    } else {
      job = await api.createJob(formData);
    }

    upsertJob(job);

    if (clipboardRequested) {
      const clipboardItem = await api.createClipboard({
        title: job.title,
        notes: `${job.customer || 'Kunde'} • ${new Date(job.date).toLocaleDateString('de-DE')}`,
      });
      state.clipboard.push(clipboardItem);
    }

    closeModals();
    render();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Auftrag konnte nicht gespeichert werden.');
  }
}

async function handleClipboardSubmit(event) {
  event.preventDefault();
  const formData = new FormData(clipboardForm);
  const payload = {
    title: formData.get('title')?.trim() || 'Neue Notiz',
    notes: formData.get('notes')?.trim() || '',
  };

  try {
    const item = await api.createClipboard(payload);
    state.clipboard.push(item);
    closeModals();
    renderClipboard();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Notiz konnte nicht gespeichert werden.');
  }
}

function handleFileInput() {
  renderAttachmentPreview();
}

function renderAttachmentPreview() {
  filePreview.innerHTML = '';
  const existing = editingJobSnapshot?.attachments || [];
  const hasNewFiles = fileInput.files.length > 0;

  if (existing.length) {
    const currentBlock = document.createElement('div');
    currentBlock.className = 'attachment-list';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = 'Aktuelle Dateien';
    currentBlock.appendChild(label);

    existing.forEach((attachment) => {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = attachment.name;
      currentBlock.appendChild(link);
    });

    filePreview.appendChild(currentBlock);

    if (hasNewFiles) {
      const hint = document.createElement('p');
      hint.className = 'help-text';
      hint.textContent = 'Neue Dateien ersetzen die bestehenden Anhänge.';
      filePreview.appendChild(hint);
    }
  }

  if (!hasNewFiles) return;

  const files = Array.from(fileInput.files);
  const listLabel = document.createElement('span');
  listLabel.className = 'label';
  listLabel.textContent = 'Ausgewählte Dateien';
  filePreview.appendChild(listLabel);

  files.forEach((file, index) => {
    const chip = document.createElement('span');
    chip.className = 'file-chip';
    chip.textContent = file.name;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.addEventListener('click', () => removeFile(index));
    chip.appendChild(remove);
    filePreview.appendChild(chip);
  });
}

function removeFile(index) {
  const dt = new DataTransfer();
  Array.from(fileInput.files).forEach((file, idx) => {
    if (idx !== index) dt.items.add(file);
  });
  fileInput.files = dt.files;
  renderAttachmentPreview();
}

function openJobModal(job = {}) {
  jobForm.reset();
  editingJobId = job.id ?? null;
  editingJobSnapshot = job.id ? structuredCloneSafe(findJob(job.id)) : null;
  const data = editingJobSnapshot || job;

  modalTitle.textContent = editingJobId ? 'Auftrag bearbeiten' : 'Auftrag anlegen';

  jobForm.elements.date.value = data.date || formatDateInput(currentDate);
  const timeField = jobForm.elements.time;
  Array.from(timeField.querySelectorAll('option[data-custom="true"]')).forEach((option) =>
    option.remove(),
  );
  if (data.time && !Array.from(timeField.options).some((option) => option.value === data.time)) {
    const customOption = new Option(`${data.time} Uhr`, data.time, true, true);
    customOption.dataset.custom = 'true';
    timeField.appendChild(customOption);
  }
  timeField.value = data.time || '';
  jobForm.elements.category.value = data.category || 'routine';
  jobForm.elements.title.value = data.title || '';
  jobForm.elements.customer.value = data.customer || '';
  jobForm.elements.contact.value = data.contact || '';
  jobForm.elements.vehicle.value = data.vehicle || '';
  jobForm.elements.license.value = data.license || '';
  jobForm.elements.notes.value = data.notes || '';
  jobForm.elements.huAu.checked = Boolean(data.huAu);
  jobForm.elements.carCare.checked = Boolean(data.carCare);
  jobForm.elements.storage.checked = Boolean(data.storage);
  jobForm.elements.rentalCar.checked = Boolean(data.rentalCar);
  jobForm.elements.clipboard.checked = false;

  fileInput.value = '';
  renderAttachmentPreview();

  toggleModal(jobModal, true);
  jobForm.elements.title.focus();
  deleteJobButton.classList.toggle('hidden', !editingJobId);
}

function openClipboardModal() {
  clipboardForm.reset();
  toggleModal(clipboardModal, true);
}

async function deleteJob(jobId) {
  await api.deleteJob(jobId);
  removeJobFromState(jobId);
}

async function handleDeleteJob() {
  if (!editingJobId) return;
  if (!confirm('Auftrag wirklich löschen?')) {
    return;
  }

  try {
    await deleteJob(editingJobId);
    closeModals();
    render();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Auftrag konnte nicht gelöscht werden.');
  }
}

function closeModals() {
  editingJobId = null;
  editingJobSnapshot = null;
  jobForm.reset();
  fileInput.value = '';
  filePreview.innerHTML = '';
  clipboardForm.reset();
  deleteJobButton.classList.add('hidden');
  toggleModal(jobModal, false);
  toggleModal(clipboardModal, false);
  closeTextBlockModal({ restoreFocus: false });
}

function toggleModal(modal, open) {
  if (!modal) return;
  if (open) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}

function changeDay(offset) {
  const multiplier = activeView === 'week' ? 7 : 1;
  currentDate.setDate(currentDate.getDate() + offset * multiplier);
  render();
}

function showDayView() {
  document.getElementById('day-view-btn').classList.add('active');
  document.getElementById('week-view-btn').classList.remove('active');
  dayView.classList.remove('hidden');
  weekView.classList.add('hidden');
  activeView = 'day';
  renderHeader();
}

function showWeekView() {
  document.getElementById('week-view-btn').classList.add('active');
  document.getElementById('day-view-btn').classList.remove('active');
  weekView.classList.remove('hidden');
  dayView.classList.add('hidden');
  activeView = 'week';
  renderHeader();
}

function statusColor(status) {
  switch (status) {
    case 'arrived':
      return 'var(--warning)';
    case 'done':
      return 'var(--success)';
    default:
      return 'var(--danger)';
  }
}

function isCategoryAvailable(category, date) {
  if (category !== 'inspection') return true;
  const weekday = date.getDay();
  return weekday >= 2 && weekday <= 5;
}

function getJobsForDay(date, category) {
  const dayKey = formatDateKey(date);
  const bucket = state.jobsByDay.get(dayKey);
  if (!bucket) return [];
  const jobs = bucket[category] || [];
  return [...jobs].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

function upsertJob(job) {
  const existing = state.jobsById.get(job.id);
  if (existing) {
    const originalBucket = state.jobsByDay.get(existing.date);
    if (originalBucket && originalBucket[existing.category]) {
      originalBucket[existing.category] = originalBucket[existing.category].filter(
        (item) => item.id !== job.id,
      );
    }
  }

  if (!state.jobsByDay.has(job.date)) {
    state.jobsByDay.set(job.date, {
      routine: [],
      inspection: [],
      major: [],
    });
  }

  const bucket = state.jobsByDay.get(job.date);
  bucket[job.category].push(job);
  state.jobsById.set(job.id, job);
}

function removeJobFromState(jobId) {
  const job = state.jobsById.get(jobId);
  if (!job) return;

  const bucket = state.jobsByDay.get(job.date);
  if (bucket && bucket[job.category]) {
    bucket[job.category] = bucket[job.category].filter((item) => item.id !== jobId);
    if (!bucket.routine.length && !bucket.inspection.length && !bucket.major.length) {
      state.jobsByDay.delete(job.date);
    }
  }

  state.jobsById.delete(jobId);
}

function findJob(jobId) {
  return state.jobsById.get(jobId) || null;
}

function formatDateKey(date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone.toISOString().split('T')[0];
}

function formatDateInput(date) {
  return formatDateKey(date);
}

function getMonday(date) {
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(date.getDate() - day + 1);
  return monday;
}

async function loadJobsFromServer() {
  const jobs = await api.listJobs();
  state.jobsByDay.clear();
  state.jobsById.clear();
  jobs.forEach((job) => upsertJob(job));
}

async function loadClipboardFromServer() {
  state.clipboard = await api.listClipboard();
}

async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const message = await extractErrorMessage(response);
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    return null;
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('Netzwerkfehler – bitte prüfen Sie die Serververbindung.');
    }
    throw error;
  }
}

async function extractErrorMessage(response) {
  try {
    const data = await response.json();
    if (data && typeof data.error === 'string') {
      return data.error;
    }
  } catch (error) {
    // ignore JSON parse errors
  }
  return 'Es ist ein unbekannter Fehler aufgetreten.';
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
