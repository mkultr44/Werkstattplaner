
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
const TRASH_RETENTION_DAYS = 30;


// === NRW Holidays Utilities ===
function easterDate(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = Math.floor(year / 100);
  const H = (C - Math.floor(C / 4) - Math.floor((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - Math.floor(H / 28) * (1 - Math.floor(29 / (H + 1)) * Math.floor((21 - G) / 11));
  const J = (year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400)) % 7;
  const L = I - J;
  const month = 3 + Math.floor((L + 40) / 44);
  const day = L + 28 - 31 * Math.floor(month / 4);
  return new Date(year, month - 1, day);
}
function getNRWHolidays(year) {
  const e = easterDate(year);
  const add = (d, days) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return {
    'Neujahrstag': new Date(year, 0, 1),
    'Karfreitag': add(e, -2),
    'Ostermontag': add(e, 1),
    'Tag der Arbeit': new Date(year, 4, 1),
    'Christi Himmelfahrt': add(e, 39),
    'Pfingstmontag': add(e, 50),
    'Fronleichnam': add(e, 60),
    'Tag der Deutschen Einheit': new Date(year, 9, 3),
    'Allerheiligen': new Date(year, 10, 1),
    '1. Weihnachtstag': new Date(year, 11, 25),
    '2. Weihnachtstag': new Date(year, 11, 26),
  };
}
function getHolidayForDate(date) {
  const holidays = getNRWHolidays(date.getFullYear());
  for (const [name, d] of Object.entries(holidays)) {
    if (d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()) {
      return name;
    }
  }
  return null;
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

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
const selectedDateLabel = document.getElementById('selected-date-label');
const calendarToggle = document.getElementById('calendar-toggle');
const calendarPopover = document.getElementById('calendar-popover');
const jobModal = document.getElementById('job-modal');
const clipboardModal = document.getElementById('clipboard-modal');
const trashModal = document.getElementById('trash-modal');
const jobForm = document.getElementById('job-form');
const clipboardForm = document.getElementById('clipboard-form');
const fileInput = document.getElementById('job-files');
const filePreview = document.getElementById('file-preview');
const modalTitle = document.getElementById('modal-title');
const deleteJobButton = document.getElementById('delete-job-btn');
const clipboardList = document.getElementById('clipboard-list');
const timeSelect = document.getElementById('job-time');
const clipboardTimeSelect = document.getElementById('clipboard-time');
const trashButton = document.getElementById('trash-button');
const trashCountBadge = document.getElementById('trash-count-badge');
const trashList = document.getElementById('trash-list');
const textBlockModal = document.getElementById('text-block-modal');
const textBlockButton = document.getElementById('text-blocks-btn');
const textBlockSearchInput = document.getElementById('text-block-search');
const textBlockCategorySelect = document.getElementById('text-block-category');
const textBlockList = document.getElementById('text-block-list');

const state = {
  jobsByDay: new Map(),
  jobsById: new Map(),
  clipboard: [],
  trash: [],
};

let currentDate = new Date();
let editingJobId = null;
let editingJobSnapshot = null;
let calendarPopoverDate = new Date(currentDate);
let calendarOpen = false;

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
  listTrash: () => apiRequest('/api/trash'),
  restoreTrash: (type, id) =>
    apiRequest(`/api/trash/${type}/${id}/restore`, {
      method: 'POST',
    }),
};

bindUI();
registerServiceWorker();
bootstrap();

async function bootstrap() {
  try {
    await Promise.all([loadJobsFromServer(), loadClipboardFromServer(), loadTrashFromServer()]);
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
  populateTimeOptions(timeSelect);
  populateTimeOptions(clipboardTimeSelect);
  initializeTextBlocks();
  document.getElementById('prev-day').addEventListener('click', () => changeDay(-1));
  document.getElementById('next-day').addEventListener('click', () => changeDay(1));
  const todayButton = document.getElementById('today-btn');
  if (todayButton) {
    todayButton.addEventListener('click', () => {
      const today = new Date();
      currentDate = today;
      calendarPopoverDate = new Date(currentDate);
      closeCalendarPopover();
      render();
    });
  }
  document
    .getElementById('new-job-btn')
    .addEventListener('click', () => openJobModal({ date: formatDateInput(currentDate) }));
  document
    .getElementById('add-clipboard-item')
    .addEventListener('click', () => openClipboardModal());

  if (calendarToggle) {
    calendarToggle.addEventListener('click', toggleCalendarPopover);
  }

  if (calendarPopover) {
    calendarPopover.addEventListener('click', (event) => event.stopPropagation());
  }

  document.addEventListener('click', handleCalendarDismiss);
  document.addEventListener('keydown', handleCalendarKeydown);

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

  
  // Prevent closing the job modal on outside click
  if (jobModal) {
    jobModal.addEventListener('click', (event) => {
      if (event.target === jobModal) event.stopPropagation();
    });
  }

  if (clipboardModal) {
    clipboardModal.addEventListener('click', (event) => {
      if (event.target === clipboardModal) closeModals();
    });
  }

  if (textBlockModal) {
    textBlockModal.addEventListener('click', (event) => {
      if (event.target === textBlockModal) closeTextBlockModal();
    });
  }

  if (trashButton) {
    trashButton.addEventListener('click', openTrashModal);
  }

  document.querySelectorAll('[data-close-trash]').forEach((button) => {
    button.addEventListener('click', closeTrashModal);
  });

  if (trashModal) {
    trashModal.addEventListener('click', (event) => {
      if (event.target === trashModal) {
        closeTrashModal();
      }
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

function populateTimeOptions(selectElement) {
  if (!selectElement) return;
  selectElement.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Ganztägig';
  selectElement.appendChild(defaultOption);

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = `${value} Uhr`;
      selectElement.appendChild(option);
    }
  }
}

function render() {
  renderHeader();
  renderDayView();
  renderClipboard();
  renderTrashButton();
  if (trashModal && !trashModal.classList.contains('hidden')) {
    renderTrashModal();
  }
  if (calendarOpen) {
    renderCalendarPopover();
  }
}

function renderHeader() {
  const prevButton = document.getElementById('prev-day');
  const nextButton = document.getElementById('next-day');

  selectedDateLabel.textContent = currentDate.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  // Show NRW holiday name under the date if applicable
  const holidayName = getHolidayForDate(currentDate);
  const holidayLabel = document.getElementById('selected-date-holiday');
  if (holidayLabel) {
    if (holidayName) {
      holidayLabel.textContent = holidayName + ' (Feiertag)';
      holidayLabel.classList.remove('hidden');
    } else {
      holidayLabel.textContent = '';
      holidayLabel.classList.add('hidden');
    }
  }

  prevButton.setAttribute('aria-label', 'Vorheriger Tag');
  nextButton.setAttribute('aria-label', 'Nächster Tag');

  if (calendarToggle) {
    calendarToggle.setAttribute('aria-label', 'Datum auswählen');
    calendarToggle.setAttribute('aria-expanded', String(calendarOpen));
  }

  if (calendarPopover) {
    calendarPopover.setAttribute('aria-hidden', calendarOpen ? 'false' : 'true');
  }
}

function toggleCalendarPopover(event) {
  if (!calendarPopover) return;
  event.preventDefault();
  event.stopPropagation();

  if (calendarOpen) {
    closeCalendarPopover();
  } else {
    openCalendarPopover();
  }
}

function openCalendarPopover() {
  if (!calendarPopover) return;
  calendarPopoverDate = new Date(currentDate);
  calendarPopoverDate.setHours(0, 0, 0, 0);
  calendarOpen = true;
  calendarPopover.classList.remove('hidden');
  calendarPopover.setAttribute('aria-hidden', 'false');
  if (calendarToggle) {
    calendarToggle.setAttribute('aria-expanded', 'true');
  }
  renderCalendarPopover();
}

function closeCalendarPopover() {
  if (!calendarPopover) return;
  if (!calendarOpen) return;
  calendarOpen = false;
  calendarPopover.classList.add('hidden');
  calendarPopover.setAttribute('aria-hidden', 'true');
  if (calendarToggle) {
    calendarToggle.setAttribute('aria-expanded', 'false');
  }
}

function handleCalendarDismiss(event) {
  if (!calendarOpen) return;
  if (
    (calendarPopover && calendarPopover.contains(event.target)) ||
    (calendarToggle && calendarToggle.contains(event.target))
  ) {
    return;
  }
  closeCalendarPopover();
}

function handleCalendarKeydown(event) {
  if (event.key === 'Escape' && calendarOpen) {
    closeCalendarPopover();
  }
}

function renderCalendarPopover() {
  if (!calendarPopover) return;
  calendarPopover.innerHTML = '';
  if (!calendarOpen) {
    calendarPopover.classList.add('hidden');
    return;
  }

  calendarPopover.appendChild(createDayPicker());
}

function createDayPicker() {
  const container = document.createElement('div');
  container.className = 'day-picker';

  const viewDate = new Date(calendarPopoverDate);
  viewDate.setHours(0, 0, 0, 0);
  viewDate.setDate(1);

  const header = document.createElement('div');
  header.className = 'day-picker-header';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.textContent = '‹';
  prev.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    calendarPopoverDate.setDate(1);
    calendarPopoverDate.setMonth(calendarPopoverDate.getMonth() - 1);
    renderCalendarPopover();
  });

  const title = document.createElement('h4');
  title.textContent = viewDate.toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });

  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = '›';
  next.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    calendarPopoverDate.setDate(1);
    calendarPopoverDate.setMonth(calendarPopoverDate.getMonth() + 1);
    renderCalendarPopover();
  });

  header.appendChild(prev);
  header.appendChild(title);
  header.appendChild(next);

  const weekdays = document.createElement('div');
  weekdays.className = 'day-picker-weekdays';
  const kwLabel = document.createElement('span');
  kwLabel.className = 'kw-label';
  kwLabel.textContent = 'KW';
  weekdays.appendChild(kwLabel);

  WEEKDAY_LABELS.forEach((label) => {
    const span = document.createElement('span');
    span.textContent = label;
    weekdays.appendChild(span);
  });

  const grid = document.createElement('div');
  grid.className = 'day-picker-grid';

  const monthStart = getMonday(viewDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(currentDate);
  selected.setHours(0, 0, 0, 0);

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const weekStart = new Date(monthStart);
    weekStart.setDate(monthStart.getDate() + weekIndex * 7);

    const weekCell = document.createElement('span');
    weekCell.className = 'kw-cell';
    weekCell.textContent = String(getISOWeek(weekStart));
    grid.appendChild(weekCell);

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(weekStart.getDate() + dayIndex);

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(cellDate.getDate());

      if (cellDate.getMonth() !== viewDate.getMonth()) {
        button.classList.add('other-month');
      }
      if (isSameDate(cellDate, today)) {
        button.classList.add('today');
      }
      if (isSameDate(cellDate, selected)) {
        button.classList.add('selected');
      }

      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        currentDate = new Date(cellDate);
        calendarPopoverDate = new Date(currentDate);
        closeCalendarPopover();
        render();
      });

      grid.appendChild(button);
    }
  }

  container.appendChild(header);
  container.appendChild(weekdays);
  container.appendChild(grid);
  return container;
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

function renderClipboard() {
  clipboardList.innerHTML = '';
  if (!state.clipboard.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Hier können Sie Termine vorbereiten und später übernehmen.';
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
        await loadTrashFromServer();
        renderTrashButton();
        if (trashModal && !trashModal.classList.contains('hidden')) {
          renderTrashModal();
        }
      } catch (error) {
        console.error(error);
        alert(error.message || 'Notiz konnte nicht entfernt werden.');
      }
    });

    header.appendChild(title);
    header.appendChild(removeButton);

    card.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'clipboard-meta';
    const dateLabel = formatClipboardDateLabel(item.date);
    if (dateLabel) {
      meta.appendChild(createMetaChip(dateLabel));
    }

    const timeLabel = item.time ? `${item.time} Uhr` : 'Ganztägig';
    meta.appendChild(createMetaChip(timeLabel));

    const categoryLabel = CATEGORY_CONFIG[item.category]?.title || item.category;
    meta.appendChild(createMetaChip(categoryLabel));
    card.appendChild(meta);

    const details = document.createElement('dl');
    details.className = 'clipboard-details';
    appendClipboardDetail(details, 'Kunde', item.customer || '—');
    if (item.contact) {
      appendClipboardDetail(details, 'Kontakt', item.contact);
    }
    appendClipboardDetail(details, 'Fahrzeug', item.vehicle || '—');
    appendClipboardDetail(details, 'Kennzeichen', item.license || '—');
    card.appendChild(details);

    const selectedFlags = SERVICE_FLAGS.filter((flag) => coerceBool(item[flag.key]));
    if (selectedFlags.length) {
      const flagList = document.createElement('div');
      flagList.className = 'clipboard-flags';
      selectedFlags.forEach((flag) => {
        const chip = document.createElement('span');
        chip.className = 'clipboard-flag-chip';
        chip.textContent = flag.label;
        flagList.appendChild(chip);
      });
      card.appendChild(flagList);
    }

    if (item.notes) {
      const notes = document.createElement('p');
      notes.className = 'clipboard-notes';
      notes.textContent = item.notes;
      card.appendChild(notes);
    }

    clipboardList.appendChild(card);
  });
}

function renderTrashButton() {
  if (!trashButton || !trashCountBadge) return;
  const count = state.trash.length;
  trashCountBadge.textContent = String(count);
  trashCountBadge.classList.toggle('hidden', count === 0);
}

function renderTrashModal() {
  if (!trashList) return;
  trashList.innerHTML = '';

  if (!state.trash.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Der Papierkorb ist leer.';
    trashList.appendChild(empty);
    return;
  }

  state.trash.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'trash-card';

    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.className = 'trash-card-title';
    title.textContent = item.title;
    const typeLabel = document.createElement('span');
    typeLabel.className = 'meta-chip';
    typeLabel.textContent = item.type === 'job' ? 'Werkstattauftrag' : 'Clipboard-Eintrag';
    header.appendChild(title);
    header.appendChild(typeLabel);
    card.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'trash-card-meta';
    const dateLabel = formatClipboardDateLabel(item.date);
    if (dateLabel) {
      meta.appendChild(createMetaChip(dateLabel));
    }
    const timeLabel = item.time ? `${item.time} Uhr` : 'Ganztägig';
    meta.appendChild(createMetaChip(timeLabel));
    const categoryLabel = CATEGORY_CONFIG[item.category]?.title || item.category;
    meta.appendChild(createMetaChip(categoryLabel));
    card.appendChild(meta);

    const details = document.createElement('dl');
    details.className = 'trash-card-details';
    appendClipboardDetail(details, 'Kunde', item.customer || '—');
    appendClipboardDetail(details, 'Kontakt', item.contact || '—');
    appendClipboardDetail(details, 'Fahrzeug', item.vehicle || '—');
    appendClipboardDetail(details, 'Kennzeichen', item.license || '—');
    card.appendChild(details);

    if (item.notes) {
      const noteBlock = document.createElement('p');
      noteBlock.className = 'clipboard-notes';
      noteBlock.textContent = item.notes;
      card.appendChild(noteBlock);
    }

    const footer = document.createElement('footer');
    const remaining = document.createElement('span');
    remaining.className = 'danger-text';
    const days = item.daysRemaining ?? TRASH_RETENTION_DAYS;
    remaining.textContent =
      days === 1
        ? 'Löscht sich in 1 Tag endgültig'
        : `Löscht sich in ${days} Tagen endgültig`;
    footer.appendChild(remaining);

    const restoreButton = document.createElement('button');
    restoreButton.className = 'primary-button';
    restoreButton.type = 'button';
    restoreButton.textContent = 'Wiederherstellen';
    restoreButton.addEventListener('click', () => handleTrashRestore(item, restoreButton));

    footer.appendChild(restoreButton);
    card.appendChild(footer);

    trashList.appendChild(card);
  });
}

function formatClipboardDateLabel(value) {
  if (!value) return '';
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return value;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function appendClipboardDetail(container, label, value) {
  if (!container) return;
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value || '—';
  container.appendChild(dt);
  container.appendChild(dd);
}

function buildJobPayloadFromFormData(formData, options = {}) {
  const fallbackDate = options.defaultDate || formatDateInput(currentDate);
  const getText = (value) => (typeof value === 'string' ? value.trim() : '');
  const categoryValue = getText(formData.get('category')) || 'routine';

  return {
    date: getText(formData.get('date')) || fallbackDate,
    time: getText(formData.get('time')),
    category: categoryValue,
    title: getText(formData.get('title')),
    customer: getText(formData.get('customer')),
    contact: getText(formData.get('contact')),
    vehicle: getText(formData.get('vehicle')),
    license: getText(formData.get('license')),
    notes: getText(formData.get('notes')),
    huAu: formData.get('huAu') === '1',
    carCare: formData.get('carCare') === '1',
    storage: coerceBool(formData.get('storage')),
    rentalCar: coerceBool(formData.get('rentalCar')),
  };
}

function createJobCard(job) {
  const template = document.getElementById('job-card-template');
  const element = template.content.firstElementChild.cloneNode(true);
  element.dataset.jobId = job.id;

  const jobTitle = element.querySelector('.job-title');
  jobTitle.textContent = job.title;

  const jobTimeChip = element.querySelector('.job-time-chip');
  jobTimeChip.textContent = job.time ? `${job.time} Uhr` : 'Ganztägig';

  const jobMeta = element.querySelector('.job-meta');
  jobMeta.innerHTML = '';
  const categoryChip = createMetaChip(CATEGORY_CONFIG[job.category]?.title || '');
  const statusChip = createMetaChip(STATUS_LABELS[job.status], 'status');
  statusChip.style.setProperty('--status-color', statusColor(job.status));
  jobMeta.appendChild(categoryChip);
  jobMeta.appendChild(statusChip);

  const customerValue = job.customer || '–';
  element.querySelectorAll('.job-customer').forEach((node) => {
    node.textContent = customerValue;
  });

  const vehicleValue = job.vehicle || '–';
  element.querySelectorAll('.job-vehicle').forEach((node) => {
    node.textContent = vehicleValue;
  });

  const contactValue = job.contact || '–';
  element.querySelectorAll('.job-contact').forEach((node) => {
    node.textContent = contactValue;
  });

  const licenseValue = job.license || '–';
  element.querySelectorAll('.job-license').forEach((node) => {
    node.textContent = licenseValue;
  });

  const subline = element.querySelector('.job-subline');
  const sublineBullet = element.querySelector('.job-subline-bullet');
  if (subline) {
    const hasCustomer = Boolean(job.customer);
    const hasVehicle = Boolean(job.vehicle);
    subline.classList.toggle('hidden', !hasCustomer && !hasVehicle);
    if (sublineBullet) {
      sublineBullet.classList.toggle('hidden', !(hasCustomer && hasVehicle));
    }
  }

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
  element.addEventListener('click', () => {
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
  if (!container) return;

  container.innerHTML = '';

  const selectedFlags = SERVICE_FLAGS.filter((flag) =>
    coerceBool(job[flag.key]),
  );

  if (!selectedFlags.length) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Zusatzleistungen';
  container.appendChild(label);

  const list = document.createElement('ul');
  list.className = 'job-service-list';

  selectedFlags.forEach((flag) => {
    const item = document.createElement('li');
    item.className = 'job-service-item';

    const icon = document.createElement('span');
    icon.className = 'job-service-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '✔';

    const text = document.createElement('span');
    text.textContent = flag.label;

    item.appendChild(icon);
    item.appendChild(text);
    list.appendChild(item);
  });

  container.appendChild(list);
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

  const payload = buildJobPayloadFromFormData(formData);

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
        date: job.date,
        time: job.time,
        category: job.category,
        title: job.title,
        customer: job.customer,
        contact: job.contact,
        vehicle: job.vehicle,
        license: job.license,
        notes: job.notes,
        huAu: job.huAu,
        carCare: job.carCare,
        storage: job.storage,
        rentalCar: job.rentalCar,
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
  const payload = buildJobPayloadFromFormData(formData);

  if (!payload.title) {
    alert('Bitte geben Sie eine Kurzbeschreibung an.');
    return;
  }

  if (!payload.customer) {
    alert('Bitte geben Sie einen Kundennamen an.');
    return;
  }

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

async function handleTrashRestore(item, button) {
  if (!item) return;
  if (button) {
    button.disabled = true;
  }
  try {
    await api.restoreTrash(item.type, item.id);
    await loadTrashFromServer();
    if (item.type === 'job') {
      await loadJobsFromServer();
    } else {
      await loadClipboardFromServer();
    }
    render();
    renderTrashModal();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Eintrag konnte nicht wiederhergestellt werden.');
  } finally {
    if (button) {
      button.disabled = false;
    }
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

function openClipboardModal(preset = {}) {
  if (!clipboardForm) return;
  clipboardForm.reset();
  const dateField = clipboardForm.elements.date;
  const categoryField = clipboardForm.elements.category;
  const timeField = clipboardForm.elements.time;

  if (dateField) {
    dateField.value = preset.date || formatDateInput(currentDate);
  }
  if (categoryField) {
    categoryField.value = preset.category || 'routine';
  }
  if (timeField && preset.time) {
    timeField.value = preset.time;
  }

  toggleModal(clipboardModal, true);
  clipboardForm.elements?.title?.focus();
}

function openTrashModal() {
  if (!trashModal) return;
  renderTrashModal();
  toggleModal(trashModal, true);
}

function closeTrashModal() {
  if (!trashModal) return;
  toggleModal(trashModal, false);
}

async function deleteJob(jobId) {
  await api.deleteJob(jobId);
  removeJobFromState(jobId);
  await loadTrashFromServer();
  renderTrashButton();
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
  if (clipboardForm) {
    clipboardForm.reset();
  }
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
  const target = new Date(currentDate);
  target.setDate(target.getDate() + offset);
  currentDate = target;
  calendarPopoverDate = new Date(currentDate);
  render();
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
  // Block all categories on NRW holidays
  if (getHolidayForDate(date)) return false;

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

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getISOWeek(date) {
  const temp = new Date(date);
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 4 - (temp.getDay() || 7));
  const yearStart = new Date(temp.getFullYear(), 0, 1);
  const diff = temp - yearStart;
  return Math.ceil(((diff / 86400000) + 1) / 7);
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

async function loadTrashFromServer() {
  state.trash = await api.listTrash();
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

      const holidayName = getHolidayForDate(cellDate);
      const weekday = cellDate.getDay();
      if (weekday === 0) {
        button.classList.add('sunday');
        button.setAttribute('title', (holidayName ? holidayName + ' & Sonntag' : 'Sonntag'));
      } else if (weekday === 6) {
        button.classList.add('weekend');
      }

      if (holidayName) {
        button.classList.add('holiday');
        button.setAttribute('title', holidayName);
      }



// === Clipboard Job Integration ===
async function handleClipboardSubmit(event) {
  event.preventDefault();
  const form = event.target.closest('form');
  const data = Object.fromEntries(new FormData(form).entries());
  data.category = 'clipboard';
  if (!data.title || data.title.trim() === '') {
    alert('Bitte einen Titel eingeben.');
    return;
  }
  try {
    await api.createJob(data);
    renderClipboard();
    form.reset();
  } catch (err) {
    console.error('Fehler beim Anlegen des Clipboard-Eintrags:', err);
  }
}

async function renderClipboard() {
  const container = document.getElementById('clipboard-list');
  if (!container) return;
  container.innerHTML = '';
  try {
    const jobs = await api.getJobs();
    const clips = jobs.filter(j => j.category === 'clipboard');
    if (clips.length === 0) {
      container.innerHTML = '<div class="empty">Keine Clipboard-Einträge vorhanden.</div>';
      return;
    }
    clips.forEach(job => {
      const el = document.createElement('div');
      el.className = 'clipboard-item';
      el.innerHTML = `
        <div class="title">${job.title}</div>
        <div class="meta">${job.customer || ''} ${job.vehicle || ''}</div>
        <div class="actions">
          <button class="delete-btn" data-id="${job.id}">✕</button>
        </div>`;
      el.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!confirm('Eintrag löschen?')) return;
        await api.deleteJob(job.id);
        renderClipboard();
      });
      container.appendChild(el);
    });
  } catch (err) {
    console.error('Fehler beim Laden der Clipboard-Einträge:', err);
  }
}

document.querySelectorAll('[data-action="clipboard-submit"]').forEach(btn => {
  btn.addEventListener('click', handleClipboardSubmit);
});

document.addEventListener('DOMContentLoaded', renderClipboard);
