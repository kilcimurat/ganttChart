import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDYGjdgo061882gqKZoVhB1FkX5zC68lz8',
  authDomain: 'teamplaning-db607.firebaseapp.com',
  projectId: 'teamplaning-db607',
  storageBucket: 'teamplaning-db607.firebasestorage.app',
  messagingSenderId: '798877496740',
  appId: '1:798877496740:web:20ecd592d84ef641ebfd31',
  measurementId: 'G-TTE56FZC4N'
};

const app = initializeApp(firebaseConfig);
(async () => {
  try {
    if (await isAnalyticsSupported()) {
      getAnalytics(app);
    }
  } catch (error) {
    console.warn('Analytics not available in this environment.', error);
  }
})();

const db = getFirestore(app);
const usersCollection = collection(db, 'users');
const changeLogCollection = collection(db, 'changeLog');

const TOTAL_WEEKS = 52;
const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_WEEK = getISOWeek(now);
const YEAR_RANGE = 10;
const MIN_YEAR = CURRENT_YEAR - YEAR_RANGE;
const MAX_YEAR = CURRENT_YEAR + YEAR_RANGE;

let state = { users: [] };
let changeLogEntries = [];
let activeUserId = null;
let activeYear = clampYear(CURRENT_YEAR);
let modalContext = { userId: null, week: null, year: null };
let unsubscribeUsers = null;
let unsubscribeChangeLog = null;
let sessionLogged = false;
let isClearingLog = false;
let logModalTimer = null;
let deleteUserContext = null;
let isDeletingUser = false;
let deleteModalTimer = null;

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  subscribeToUsers();
  subscribeToChangeLog();
});

function cacheElements() {
  els.memberList = document.getElementById('member-list');
  els.memberInput = document.getElementById('member-name');
  els.addMemberBtn = document.getElementById('add-member');
  els.memberError = document.getElementById('member-error');
  els.viewLogBtn = document.getElementById('view-log-btn');
  els.clearLogBtn = document.getElementById('clear-log-btn');
  els.teamView = document.getElementById('team-view');
  els.plannerView = document.getElementById('planner-view');
  els.logView = document.getElementById('log-view');
  els.backBtn = document.getElementById('back-btn');
  els.backFromLogBtn = document.getElementById('back-from-log');
  els.plannerTitle = document.getElementById('planner-title');
  els.plannerDescription = document.getElementById('planner-description');
  els.weekGrid = document.getElementById('week-grid');
  els.plannerEmpty = document.getElementById('planner-empty');
  els.logList = document.getElementById('log-list');
  els.logEmpty = document.getElementById('log-empty');
  els.modal = document.getElementById('note-modal');
  els.modalTitle = document.getElementById('modal-title');
  els.noteInput = document.getElementById('note-input');
  els.cancelNote = document.getElementById('cancel-note');
  els.saveNote = document.getElementById('save-note');
  els.yearLabel = document.getElementById('year-label');
  els.prevYearBtn = document.getElementById('prev-year');
  els.nextYearBtn = document.getElementById('next-year');
  els.logModal = document.getElementById('log-modal');
  els.logModalStatus = document.getElementById('log-modal-status');
  els.logModalCancel = document.getElementById('log-modal-cancel');
  els.logModalConfirm = document.getElementById('log-modal-confirm');
  els.deleteModal = document.getElementById('delete-user-modal');
  els.deleteModalMessage = document.getElementById('delete-user-message');
  els.deleteModalStatus = document.getElementById('delete-user-status');
  els.deleteModalCancel = document.getElementById('delete-user-cancel');
  els.deleteModalConfirm = document.getElementById('delete-user-confirm');
}

function bindEvents() {
  els.addMemberBtn.addEventListener('click', () => handleAddMember());
  els.memberInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      handleAddMember();
    }
  });

  if (els.viewLogBtn) {
    els.viewLogBtn.addEventListener('click', showLogView);
  }
  if (els.clearLogBtn) {
    els.clearLogBtn.addEventListener('click', openLogModal);
  }
  if (els.backFromLogBtn) {
    els.backFromLogBtn.addEventListener('click', showTeamView);
  }
  if (els.logModalCancel) {
    els.logModalCancel.addEventListener('click', closeLogModal);
  }
  if (els.logModalConfirm) {
    els.logModalConfirm.addEventListener('click', handleClearLogConfirm);
  }
  if (els.logModal) {
    els.logModal.addEventListener('click', (event) => {
      if (event.target === els.logModal && !isClearingLog) {
        closeLogModal();
      }
    });
  }
  if (els.deleteModalCancel) {
    els.deleteModalCancel.addEventListener('click', closeDeleteModal);
  }
  if (els.deleteModalConfirm) {
    els.deleteModalConfirm.addEventListener('click', handleDeleteUserConfirm);
  }
  if (els.deleteModal) {
    els.deleteModal.addEventListener('click', (event) => {
      if (event.target === els.deleteModal && !isDeletingUser) {
        closeDeleteModal();
      }
    });
  }
  els.backBtn.addEventListener('click', showTeamView);
  els.cancelNote.addEventListener('click', closeModal);
  els.saveNote.addEventListener('click', () => handleSaveNote());
  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) {
      closeModal();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (els.modal && !els.modal.classList.contains('hidden')) {
      closeModal();
    }
    if (els.logModal && !els.logModal.classList.contains('hidden') && !isClearingLog) {
      closeLogModal();
    }
    if (els.deleteModal && !els.deleteModal.classList.contains('hidden') && !isDeletingUser) {
      closeDeleteModal();
    }
  });

  if (els.prevYearBtn && els.nextYearBtn) {
    els.prevYearBtn.addEventListener('click', () => handleYearChange(-1));
    els.nextYearBtn.addEventListener('click', () => handleYearChange(1));
  }
}

function subscribeToUsers() {
  if (typeof unsubscribeUsers === 'function') {
    unsubscribeUsers();
  }

  unsubscribeUsers = onSnapshot(
    usersCollection,
    (snapshot) => {
      state.users = snapshot.docs.map((docSnap) => normalizeUserDoc(docSnap.id, docSnap.data()));
      renderTeamList();
      renderWeekGrid();

      if (!sessionLogged) {
        sessionLogged = true;
        recordChange('sessionOpen', {
          userCount: state.users.length,
          noteCount: countNotes(state.users),
          activeYear
        });
      }
    },
    (error) => {
      console.error('Unable to subscribe to users collection', error);
    }
  );
}

function subscribeToChangeLog() {
  if (typeof unsubscribeChangeLog === 'function') {
    unsubscribeChangeLog();
  }

  unsubscribeChangeLog = onSnapshot(
    changeLogCollection,
    (snapshot) => {
      changeLogEntries = snapshot.docs
        .map((docSnap) => normalizeLogDoc(docSnap.id, docSnap.data()))
        .sort((a, b) => b.sortValue - a.sortValue);
      renderChangeLog();
    },
    (error) => {
      console.error('Unable to subscribe to change log collection', error);
    }
  );
}

function normalizeUserDoc(id, data = {}) {
  const planning = Array.isArray(data.planning)
    ? data.planning
        .map((entry) => normalizePlanningEntry(entry))
        .filter(Boolean)
        .sort((a, b) => (a.year - b.year) || (a.week - b.week))
    : [];

  return {
    id,
    name: data.name || 'Unnamed teammate',
    planning
  };
}

async function handleAddMember() {
  clearMemberError();
  const name = els.memberInput.value.trim();
  if (!name) {
    els.memberInput.focus();
    setMemberError('Please enter a name.');
    return;
  }

  const newUserId = createId();
  try {
    await setDoc(doc(usersCollection, newUserId), {
      name,
      planning: []
    });
    els.memberInput.value = '';
    clearMemberError();
    recordChange('addUser', { userId: newUserId, name });
  } catch (error) {
    console.error('Failed to add user', error);
    setMemberError(`Failed to save: ${error?.message || 'An unknown error occurred.'}`);
  }
}

function handleSaveNote() {
  if (!modalContext.userId || !modalContext.week || !modalContext.year) {
    return;
  }
  const note = els.noteInput.value.trim();
  updateWeekNote(modalContext.userId, modalContext.week, modalContext.year, note);
  closeModal();
}

function handleYearChange(direction) {
  const next = clampYear(activeYear + direction);
  if (next === activeYear) {
    return;
  }
  activeYear = next;
  renderWeekGrid();
  recordChange('changeYear', { activeYear });
}

function renderTeamList() {
  if (!state.users.length) {
    els.memberList.innerHTML = '<li class="empty-state">No team members yet. Add your first teammate to begin planning.</li>';
    return;
  }

  els.memberList.innerHTML = '';
  state.users.forEach((user) => {
    const li = document.createElement('li');
    li.className = 'member-item';

    const meta = document.createElement('div');
    meta.className = 'member-meta';

    const name = document.createElement('p');
    name.className = 'member-name';
    name.textContent = user.name;

    const count = document.createElement('span');
    count.className = 'member-count';
    const notedWeeks = user.planning.length;
    count.textContent = notedWeeks ? `${notedWeeks} noted week${notedWeeks > 1 ? 's' : ''}` : 'No notes yet';

    meta.appendChild(name);
    meta.appendChild(count);

    const actions = document.createElement('div');
    actions.className = 'member-actions';

    const planBtn = document.createElement('button');
    planBtn.type = 'button';
    planBtn.textContent = 'Plan Schedule';
    planBtn.addEventListener('click', () => openPlanner(user.id));

    actions.appendChild(planBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-button danger';
    deleteBtn.setAttribute('aria-label', `Delete ${user.name}`);
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', () => openDeleteModal(user));

    li.appendChild(meta);
    li.appendChild(actions);
    li.appendChild(deleteBtn);
    els.memberList.appendChild(li);
  });
}

function openPlanner(userId) {
  const user = getUserById(userId);
  if (!user) {
    return;
  }
  activeUserId = userId;
  hideAllViews();
  els.plannerView.classList.remove('hidden');
  els.plannerTitle.textContent = `Weekly Plan — ${user.name}`;
  renderWeekGrid();
}

function showTeamView() {
  hideAllViews();
  els.teamView.classList.remove('hidden');
  els.plannerTitle.textContent = 'Weekly Plan';
  els.plannerEmpty.classList.remove('hidden');
  activeUserId = null;
}

function showLogView() {
  hideAllViews();
  els.logView.classList.remove('hidden');
  renderChangeLog();
}

function renderWeekGrid() {
  updateYearControls();
  els.weekGrid.innerHTML = '';

  if (!activeUserId) {
    els.plannerEmpty.classList.remove('hidden');
    return;
  }

  const user = getUserById(activeUserId);
  if (!user) {
    els.plannerEmpty.classList.remove('hidden');
    return;
  }

  els.plannerEmpty.classList.add('hidden');

  for (let week = 1; week <= TOTAL_WEEKS; week += 1) {
    const cell = document.createElement('div');
    cell.className = 'week-cell';
    cell.setAttribute('role', 'gridcell');
    cell.dataset.week = String(week);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'week-button';
    button.setAttribute('aria-label', `Week ${week} of ${activeYear}`);

    const title = document.createElement('span');
    title.className = 'week-number';
    title.textContent = `Week ${week}`;

    const status = document.createElement('span');
    status.className = 'week-note-status';

    const noteEntry = findPlanningEntry(user, week, activeYear);
    if (noteEntry) {
      cell.classList.add('has-note');
      status.textContent = truncateNote(noteEntry.note);
      button.title = noteEntry.note;
    } else {
      status.textContent = 'Add note';
      button.title = 'Add note';
    }

    if (activeYear === CURRENT_YEAR && week === CURRENT_WEEK) {
      cell.classList.add('current-week');
      cell.setAttribute('aria-current', 'date');
    }

    button.addEventListener('click', () => openModal(week, noteEntry ? noteEntry.note : ''));

    button.appendChild(title);
    button.appendChild(status);
    cell.appendChild(button);
    els.weekGrid.appendChild(cell);
  }
}

function openModal(weekNumber, existingNote) {
  if (!activeUserId) {
    return;
  }
  modalContext = { userId: activeUserId, week: weekNumber, year: activeYear };
  els.modalTitle.textContent = `Week ${weekNumber} (${activeYear})`;
  els.noteInput.value = existingNote;
  els.modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  els.noteInput.focus();
}

function closeModal() {
  els.modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  modalContext = { userId: null, week: null, year: null };
}

function openLogModal() {
  if (!els.logModal) {
    return;
  }
  clearLogModalTimer();
  setLogModalStatus('');
  isClearingLog = false;
  if (els.logModalConfirm) {
    els.logModalConfirm.disabled = false;
  }
  if (els.logModalCancel) {
    els.logModalCancel.disabled = false;
  }
  els.logModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeLogModal() {
  if (!els.logModal) {
    return;
  }
  clearLogModalTimer();
  els.logModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  isClearingLog = false;
  if (els.logModalConfirm) {
    els.logModalConfirm.disabled = false;
  }
  if (els.logModalCancel) {
    els.logModalCancel.disabled = false;
  }
  setLogModalStatus('');
}

function openDeleteModal(user) {
  if (!user || !els.deleteModal) {
    return;
  }
  deleteUserContext = user;
  clearDeleteModalTimer();
  setDeleteModalStatus('');
  isDeletingUser = false;
  if (els.deleteModalConfirm) {
    els.deleteModalConfirm.disabled = false;
  }
  if (els.deleteModalCancel) {
    els.deleteModalCancel.disabled = false;
  }
  if (els.deleteModalMessage) {
    const noteCount = user.planning.length;
    const noteLabel = noteCount === 1 ? 'note' : 'notes';
    els.deleteModalMessage.textContent = `Delete ${user.name} and ${noteCount} ${noteLabel}? This cannot be undone.`;
  }
  els.deleteModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeDeleteModal() {
  if (!els.deleteModal) {
    return;
  }
  clearDeleteModalTimer();
  els.deleteModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  deleteUserContext = null;
  isDeletingUser = false;
  if (els.deleteModalConfirm) {
    els.deleteModalConfirm.disabled = false;
  }
  if (els.deleteModalCancel) {
    els.deleteModalCancel.disabled = false;
  }
  setDeleteModalStatus('');
}

async function updateWeekNote(userId, weekNumber, year, note) {
  const user = getUserById(userId);
  if (!user) {
    return;
  }

  const planning = Array.isArray(user.planning) ? [...user.planning] : [];
  const index = planning.findIndex((entry) => entry.week === weekNumber && entry.year === year);
  let actionLabel = null;

  if (!note && index !== -1) {
    planning.splice(index, 1);
    actionLabel = 'removeWeekNote';
  } else if (note && index !== -1) {
    planning[index] = { week: weekNumber, year, note };
    actionLabel = 'updateWeekNote';
  } else if (note && index === -1) {
    planning.push({ week: weekNumber, year, note });
    actionLabel = 'addWeekNote';
  }

  planning.sort((a, b) => (a.year - b.year) || (a.week - b.week));

  try {
    await updateDoc(doc(usersCollection, userId), {
      name: user.name,
      planning
    });
    if (actionLabel) {
      recordChange(actionLabel, {
        userId,
        week: weekNumber,
        year,
        notePreview: note ? truncateNote(note) : ''
      });
    }
  } catch (error) {
    console.error('Failed to update week note', error);
  }
}

function getUserById(userId) {
  return state.users.find((user) => user.id === userId) || null;
}

function findPlanningEntry(user, week, year) {
  return user.planning.find((entry) => entry.week === week && entry.year === year) || null;
}

function updateYearControls() {
  if (els.yearLabel) {
    els.yearLabel.textContent = activeYear;
  }
  if (els.prevYearBtn) {
    els.prevYearBtn.disabled = activeYear <= MIN_YEAR;
  }
  if (els.nextYearBtn) {
    els.nextYearBtn.disabled = activeYear >= MAX_YEAR;
  }
}

function hideAllViews() {
  if (els.teamView) {
    els.teamView.classList.add('hidden');
  }
  if (els.plannerView) {
    els.plannerView.classList.add('hidden');
  }
  if (els.logView) {
    els.logView.classList.add('hidden');
  }
}

function clampYear(year) {
  if (typeof year !== 'number' || Number.isNaN(year)) {
    return CURRENT_YEAR;
  }
  return Math.min(Math.max(year, MIN_YEAR), MAX_YEAR);
}

function normalizePlanningEntry(entry) {
  if (!entry) {
    return null;
  }
  const weekNumber = Number(entry.week);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > TOTAL_WEEKS) {
    return null;
  }
  const yearNumber = typeof entry.year === 'number' ? clampYear(entry.year) : clampYear(CURRENT_YEAR);
  return {
    week: weekNumber,
    year: yearNumber,
    note: typeof entry.note === 'string' ? entry.note : ''
  };
}

function countNotes(users = []) {
  return users.reduce((total, user) => total + (Array.isArray(user.planning) ? user.planning.length : 0), 0);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function truncateNote(note) {
  if (note.length <= 26) {
    return note;
  }
  return `${note.slice(0, 24)}…`;
}

function setMemberError(message) {
  if (!els.memberError) {
    return;
  }
  els.memberError.textContent = message;
  els.memberError.classList.remove('hidden');
}

function clearMemberError() {
  if (!els.memberError) {
    return;
  }
  els.memberError.textContent = '';
  els.memberError.classList.add('hidden');
}

async function recordChange(action, meta = {}) {
  try {
    await addDoc(changeLogCollection, {
      action,
      meta,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to record change', error);
  }
}

function normalizeLogDoc(id, data = {}) {
  const serverDate = data.timestamp && typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : null;
  const rawClientDate = data.clientTimestamp ? new Date(data.clientTimestamp) : null;
  const clientDate = rawClientDate instanceof Date && !Number.isNaN(rawClientDate.getTime()) ? rawClientDate : null;
  const effectiveDate = serverDate || clientDate || null;
  const sortValue = effectiveDate ? effectiveDate.getTime() : clientDate ? clientDate.getTime() : 0;

  return {
    id,
    action: data.action || 'unknown',
    meta: typeof data.meta === 'object' && data.meta !== null ? data.meta : {},
    timestamp: effectiveDate,
    sortValue
  };
}

function renderChangeLog() {
  if (!els.logList) {
    return;
  }

  els.logList.innerHTML = '';

  if (!changeLogEntries.length) {
    if (els.logEmpty) {
      els.logEmpty.classList.remove('hidden');
    }
    return;
  }

  if (els.logEmpty) {
    els.logEmpty.classList.add('hidden');
  }

  changeLogEntries.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'log-entry';

    const header = document.createElement('div');
    header.className = 'log-entry-header';

    const action = document.createElement('span');
    action.className = 'log-action';
    action.textContent = entry.action;

    const timestamp = document.createElement('time');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = formatTimestamp(entry.timestamp);

    header.appendChild(action);
    header.appendChild(timestamp);

    const metaBlock = document.createElement('pre');
    metaBlock.className = 'log-meta';
    metaBlock.textContent = formatMeta(entry.meta);

    li.appendChild(header);
    li.appendChild(metaBlock);
    els.logList.appendChild(li);
  });
}

function formatTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 'Pending timestamp';
  }
  return date.toLocaleString();
}

function formatMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return '{}';
  }
  try {
    return JSON.stringify(meta, null, 2);
  } catch (error) {
    return '{}';
  }
}

function setLogModalStatus(message, variant = 'info') {
  if (!els.logModalStatus) {
    return;
  }
  els.logModalStatus.textContent = message;
  els.logModalStatus.classList.remove('hidden', 'success', 'error');
  if (!message) {
    els.logModalStatus.classList.add('hidden');
    return;
  }
  if (variant === 'success') {
    els.logModalStatus.classList.add('success');
  } else if (variant === 'error') {
    els.logModalStatus.classList.add('error');
  }
}

function clearLogModalTimer() {
  if (logModalTimer) {
    clearTimeout(logModalTimer);
    logModalTimer = null;
  }
}

async function handleClearLogConfirm() {
  if (isClearingLog) {
    return;
  }
  isClearingLog = true;
  setLogModalStatus('Clearing change log...');
  if (els.logModalConfirm) {
    els.logModalConfirm.disabled = true;
  }
  if (els.logModalCancel) {
    els.logModalCancel.disabled = true;
  }

  try {
    const snapshot = await getDocs(changeLogCollection);
    if (snapshot.empty) {
      setLogModalStatus('Change log is already empty.');
      isClearingLog = false;
      if (els.logModalConfirm) {
        els.logModalConfirm.disabled = false;
      }
      if (els.logModalCancel) {
        els.logModalCancel.disabled = false;
      }
      return;
    }
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
    setLogModalStatus('Change log cleared.', 'success');
    logModalTimer = setTimeout(() => {
      closeLogModal();
    }, 1200);
  } catch (error) {
    console.error('Failed to clear change log', error);
    setLogModalStatus('Unable to clear change log. Please try again.', 'error');
    isClearingLog = false;
    if (els.logModalConfirm) {
      els.logModalConfirm.disabled = false;
    }
    if (els.logModalCancel) {
      els.logModalCancel.disabled = false;
    }
  }
}

function setDeleteModalStatus(message, variant = 'info') {
  if (!els.deleteModalStatus) {
    return;
  }
  els.deleteModalStatus.textContent = message;
  els.deleteModalStatus.classList.remove('hidden', 'success', 'error');
  if (!message) {
    els.deleteModalStatus.classList.add('hidden');
    return;
  }
  if (variant === 'success') {
    els.deleteModalStatus.classList.add('success');
  } else if (variant === 'error') {
    els.deleteModalStatus.classList.add('error');
  }
}

function clearDeleteModalTimer() {
  if (deleteModalTimer) {
    clearTimeout(deleteModalTimer);
    deleteModalTimer = null;
  }
}

async function handleDeleteUserConfirm() {
  if (!deleteUserContext || isDeletingUser) {
    return;
  }
  isDeletingUser = true;
  setDeleteModalStatus('Deleting teammate...');
  if (els.deleteModalConfirm) {
    els.deleteModalConfirm.disabled = true;
  }
  if (els.deleteModalCancel) {
    els.deleteModalCancel.disabled = true;
  }

  try {
    await deleteDoc(doc(usersCollection, deleteUserContext.id));
    if (activeUserId === deleteUserContext.id) {
      showTeamView();
    }
    recordChange('removeUser', {
      userId: deleteUserContext.id,
      name: deleteUserContext.name,
      removedNotes: deleteUserContext.planning.length
    });
    setDeleteModalStatus('Teammate deleted.', 'success');
    deleteModalTimer = setTimeout(() => {
      closeDeleteModal();
    }, 1100);
  } catch (error) {
    console.error('Failed to remove user', error);
    setDeleteModalStatus('Unable to delete teammate. Please try again.', 'error');
    isDeletingUser = false;
    if (els.deleteModalConfirm) {
      els.deleteModalConfirm.disabled = false;
    }
    if (els.deleteModalCancel) {
      els.deleteModalCancel.disabled = false;
    }
  }
}

function getISOWeek(date) {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
