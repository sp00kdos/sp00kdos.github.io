// ============================================================
// LifeOS — Editorial Personal Planner
// Vanilla JS. No build step. No framework.
// ============================================================

// ========== Theme Engine ==========
const ThemeEngine = {
  currentTheme: 'parchment',

  init() {
    const saved = localStorage.getItem('lifeos-theme');
    if (saved) {
      this.setTheme(saved, false);
    } else {
      this.setTheme('parchment', false);
    }
    this.setupListeners();
    this.applySeasonalAmbient();
  },

  setTheme(theme, persist = true) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    if (persist) {
      localStorage.setItem('lifeos-theme', theme);
    }
    this.applySeasonalAmbient();
  },

  setupListeners() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTheme(btn.dataset.theme);
      });
    });
  },

  applySeasonalAmbient() {
    const month = new Date().getMonth(); // 0-11
    const blobs = document.querySelectorAll('.ambient-blob');
    if (blobs.length < 3) return;

    // Subtle seasonal color shifts for the ambient blobs
    const seasonalColors = {
      spring: ['#7BA38F', '#D4A574', '#C97B5C'],  // Mar-May
      summer: ['#4C6B52', '#D9A441', '#7BA38F'],   // Jun-Aug
      autumn: ['#C97B5C', '#D9A441', '#8B6F47'],   // Sep-Nov
      winter: ['#5A6E78', '#7A7568', '#4C6B52']    // Dec-Feb
    };

    let colors;
    if (month >= 2 && month <= 4) colors = seasonalColors.spring;
    else if (month >= 5 && month <= 7) colors = seasonalColors.summer;
    else if (month >= 8 && month <= 10) colors = seasonalColors.autumn;
    else colors = seasonalColors.winter;

    // Only override if using parchment theme (keep others pure)
    if (this.currentTheme === 'parchment') {
      blobs[0].style.background = colors[0];
      blobs[1].style.background = colors[1];
      blobs[2].style.background = colors[2];
    } else {
      // Reset to CSS defaults
      blobs[0].style.background = '';
      blobs[1].style.background = '';
      blobs[2].style.background = '';
    }
  }
};

// ========== Custom Confirm Dialog ==========
const ConfirmDialog = {
  resolve: null,

  init() {
    document.getElementById('confirmYes').addEventListener('click', () => {
      this.resolve(true);
      this.close();
    });
    document.getElementById('confirmNo').addEventListener('click', () => {
      this.resolve(false);
      this.close();
    });
    // Close on backdrop click
    document.getElementById('confirmDialog').addEventListener('click', (e) => {
      if (e.target.id === 'confirmDialog') {
        this.resolve(false);
        this.close();
      }
    });
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.resolve(false);
        this.close();
      }
    });
  },

  isOpen() {
    return document.getElementById('confirmDialog').classList.contains('active');
  },

  open(title, message) {
    return new Promise(resolve => {
      this.resolve = resolve;
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = message;
      document.getElementById('confirmDialog').classList.add('active');
    });
  },

  close() {
    document.getElementById('confirmDialog').classList.remove('active');
  }
};

// ========== Data Structure ==========
const DataStore = {
  schedule: {},
  habits: [],
  meds: [],
  foodPlan: {},
  events: [],
  habitHistory: {},
  dayIntervals: {},
  calorieExpenditure: {},
  lifePage: {
    principles: [],
    pillars: []
  },
  calorieConfig: {
    bmr: 1800,
    activityMultiplier: 1.2
  },

  init() {
    const stored = localStorage.getItem('lifeos-data');
    if (stored) {
      try {
        Object.assign(this, JSON.parse(stored));
      } catch (e) {
        console.warn('Corrupted data reset');
      }
    }
    this.ensureTodaysData();
  },

  ensureTodaysData() {
    const today = this.getTodayKey();

    if (!this.schedule[today]) this.schedule[today] = [];
    if (!this.dayIntervals[today]) this.dayIntervals[today] = [];

    if (!this.calorieExpenditure[today]) {
      this.calorieExpenditure[today] = {
        targetExpenditure: Math.round(this.calorieConfig.bmr * this.calorieConfig.activityMultiplier),
        actualConsumed: 0
      };
    }

    if (!this.foodPlan[today]) {
      this.foodPlan[today] = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    }

    // Ensure habit history entries exist
    [...this.habits, ...this.meds].forEach(item => {
      if (!this.habitHistory[item.id]) this.habitHistory[item.id] = {};
    });

    this.save();
  },

  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  },

  save() {
    localStorage.setItem('lifeos-data', JSON.stringify({
      schedule: this.schedule,
      habits: this.habits,
      meds: this.meds,
      foodPlan: this.foodPlan,
      events: this.events,
      habitHistory: this.habitHistory,
      dayIntervals: this.dayIntervals,
      calorieExpenditure: this.calorieExpenditure,
      lifePage: this.lifePage,
      calorieConfig: this.calorieConfig
    }));
  },

  // --- Schedule ---
  addScheduleItem(title, time) {
    const today = this.getTodayKey();
    const item = { id: Date.now(), title, time, createdAt: new Date().toISOString() };
    this.schedule[today].push(item);
    this.save();
    return item;
  },

  updateScheduleItem(id, title, time) {
    const today = this.getTodayKey();
    const item = this.schedule[today].find(i => i.id === id);
    if (item) { item.title = title; item.time = time; this.save(); }
  },

  deleteScheduleItem(id) {
    const today = this.getTodayKey();
    this.schedule[today] = this.schedule[today].filter(i => i.id !== id);
    this.save();
  },

  // --- Habits ---
  addHabit(name, frequency = 'daily') {
    const habit = { id: Date.now(), name, frequency, type: 'habit', createdAt: new Date().toISOString() };
    this.habits.push(habit);
    this.habitHistory[habit.id] = {};
    this.save();
    return habit;
  },

  updateHabit(id, name) {
    const habit = this.habits.find(h => h.id === id);
    if (habit) { habit.name = name; this.save(); }
  },

  deleteHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    delete this.habitHistory[id];
    this.save();
  },

  // --- Meds ---
  addMed(name, time) {
    const med = { id: Date.now(), name, time, type: 'med', createdAt: new Date().toISOString() };
    this.meds.push(med);
    this.habitHistory[med.id] = {};
    this.save();
    return med;
  },

  updateMed(id, name, time) {
    const med = this.meds.find(m => m.id === id);
    if (med) { med.name = name; med.time = time; this.save(); }
  },

  deleteMed(id) {
    this.meds = this.meds.filter(m => m.id !== id);
    delete this.habitHistory[id];
    this.save();
  },

  // --- Habit/Med Toggling ---
  toggleHabit(id) {
    const today = this.getTodayKey();
    if (!this.habitHistory[id]) this.habitHistory[id] = {};
    if (this.habitHistory[id][today]) {
      delete this.habitHistory[id][today];
    } else {
      this.habitHistory[id][today] = true;
    }
    this.save();
  },

  isHabitDone(id) {
    const today = this.getTodayKey();
    return !!this.habitHistory[id]?.[today];
  },

  getHabitStreak(id) {
    let streak = 0;
    let date = new Date();
    while (true) {
      const key = date.toISOString().split('T')[0];
      if (this.habitHistory[id]?.[key]) { streak++; date.setDate(date.getDate() - 1); }
      else break;
    }
    return streak;
  },

  getHabitHistory(id, days = 30) {
    const history = [];
    const date = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      history.push({ date: key, done: !!this.habitHistory[id]?.[key] });
    }
    return history;
  },

  // --- Food Plan ---
  addMealItem(mealType, text) {
    const today = this.getTodayKey();
    const item = { id: Date.now(), text, done: false };
    this.foodPlan[today][mealType].push(item);
    this.save();
    return item;
  },

  toggleMealItem(mealType, id) {
    const today = this.getTodayKey();
    const item = this.foodPlan[today][mealType].find(i => i.id === id);
    if (item) { item.done = !item.done; this.save(); }
  },

  deleteMealItem(mealType, id) {
    const today = this.getTodayKey();
    this.foodPlan[today][mealType] = this.foodPlan[today][mealType].filter(i => i.id !== id);
    this.save();
  },

  // --- Events ---
  addEvent(title, date, time = '') {
    const event = { id: Date.now(), title, date, time, createdAt: new Date().toISOString() };
    this.events.push(event);
    this.save();
    return event;
  },

  updateEvent(id, title, date, time) {
    const event = this.events.find(e => e.id === id);
    if (event) { event.title = title; event.date = date; event.time = time; this.save(); }
  },

  deleteEvent(id) {
    this.events = this.events.filter(e => e.id !== id);
    this.save();
  },

  getUpcomingEvents(daysAhead = 14) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return this.events
      .filter(e => {
        const ed = new Date(e.date); ed.setHours(0, 0, 0, 0);
        return ed >= today && ed <= futureDate;
      })
      .sort((a, b) => {
        const dc = new Date(a.date) - new Date(b.date);
        return dc !== 0 ? dc : (a.time || '').localeCompare(b.time || '');
      });
  },

  // --- Micro-Scheduling ---
  addDayInterval(date, start, end, label) {
    if (!this.dayIntervals[date]) this.dayIntervals[date] = [];
    const interval = { id: Date.now(), start, end, label };
    this.dayIntervals[date].push(interval);
    this.save();
    return interval;
  },

  updateDayInterval(date, id, start, end, label) {
    if (!this.dayIntervals[date]) return;
    const interval = this.dayIntervals[date].find(i => i.id === id);
    if (interval) { interval.start = start; interval.end = end; interval.label = label; this.save(); }
  },

  deleteDayInterval(date, id) {
    if (!this.dayIntervals[date]) return;
    this.dayIntervals[date] = this.dayIntervals[date].filter(i => i.id !== id);
    this.save();
  },

  getDayIntervals(date) {
    return this.dayIntervals[date] || [];
  },

  // --- Calorie Tracking ---
  setCalorieConfig(bmr, activityMultiplier) {
    this.calorieConfig = { bmr, activityMultiplier };
    this.ensureTodaysData();
    this.save();
  },

  getCalorieStatus(date) {
    if (!this.calorieExpenditure[date]) return { target: 0, consumed: 0, remaining: 0, percentage: 0 };
    const exp = this.calorieExpenditure[date];
    const consumed = exp.actualConsumed || 0;
    const target = exp.targetExpenditure || 0;
    return {
      target, consumed,
      remaining: target - consumed,
      percentage: target > 0 ? Math.round((consumed / target) * 100) : 0
    };
  },

  // --- Life Page: Principles ---
  addPrinciple(text) {
    const principle = { id: Date.now(), text };
    this.lifePage.principles.push(principle);
    this.save();
    return principle;
  },

  updatePrinciple(id, text) {
    const p = this.lifePage.principles.find(p => p.id === id);
    if (p) { p.text = text; this.save(); }
  },

  deletePrinciple(id) {
    this.lifePage.principles = this.lifePage.principles.filter(p => p.id !== id);
    this.save();
  },

  // --- Life Page: Pillars ---
  addLifePillar(name) {
    const pillar = { id: Date.now(), name, status: 'stable' };
    this.lifePage.pillars.push(pillar);
    this.save();
    return pillar;
  },

  updatePillarStatus(id, status) {
    const pillar = this.lifePage.pillars.find(p => p.id === id);
    if (pillar) { pillar.status = status; this.save(); }
  },

  deleteLifePillar(id) {
    this.lifePage.pillars = this.lifePage.pillars.filter(p => p.id !== id);
    this.save();
  },

  // --- Calendar Helpers ---
  getCalendarIndicators(date) {
    const eventCount = this.events.filter(e => e.date === date).length;
    const habitDone = this.habits.some(h => this.habitHistory[h.id]?.[date]);
    const medDone = this.meds.some(m => this.habitHistory[m.id]?.[date]);
    const mealsLogged = Object.values(this.foodPlan[date] || {}).flat().some(m => m.done);
    return { eventCount, habitDone, medDone, mealsLogged };
  },

  // --- Export / Import ---
  exportData() {
    return {
      schedule: this.schedule, habits: this.habits, meds: this.meds,
      foodPlan: this.foodPlan, events: this.events, habitHistory: this.habitHistory,
      dayIntervals: this.dayIntervals, calorieExpenditure: this.calorieExpenditure,
      lifePage: this.lifePage, calorieConfig: this.calorieConfig,
      exportedAt: new Date().toISOString()
    };
  },

  importData(data) {
    if (data.schedule) this.schedule = data.schedule;
    if (data.habits) this.habits = data.habits;
    if (data.meds) this.meds = data.meds;
    if (data.foodPlan) this.foodPlan = data.foodPlan;
    if (data.events) this.events = data.events;
    if (data.habitHistory) this.habitHistory = data.habitHistory;
    if (data.dayIntervals) this.dayIntervals = data.dayIntervals;
    if (data.calorieExpenditure) this.calorieExpenditure = data.calorieExpenditure;
    if (data.lifePage) this.lifePage = data.lifePage;
    if (data.calorieConfig) this.calorieConfig = data.calorieConfig;
    this.save();
  }
};

// ========== UI State ==========
let currentSection = 'today';
let currentMode = null;
let currentEditId = null;
let nowIndicatorInterval = null;

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
  DataStore.init();
  ThemeEngine.init();
  ConfirmDialog.init();
  setupEventListeners();
  updateGreeting();
  updateDateDisplay();
  startNowIndicator();
  renderSection('today');
});

// ========== Greeting & Date ==========
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  if (hour >= 17 && hour < 21) greeting = 'Good evening';
  if (hour >= 21 || hour < 5) greeting = 'Good night';

  const el = document.getElementById('greeting');
  if (el) el.textContent = greeting;
}

function updateDateDisplay() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const el = document.getElementById('dateDisplay');
  if (el) el.textContent = new Date().toLocaleDateString('en-US', options);
}

// ========== Now Indicator ==========
function startNowIndicator() {
  updateNowIndicator();
  if (nowIndicatorInterval) clearInterval(nowIndicatorInterval);
  nowIndicatorInterval = setInterval(updateNowIndicator, 60000);
}

function updateNowIndicator() {
  const today = DataStore.getTodayKey();
  const intervals = DataStore.getDayIntervals(today);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const indicator = document.getElementById('nowIndicator');
  const nowText = document.getElementById('nowText');
  if (!indicator || !nowText) return;

  // Find current interval
  let current = null;
  for (const iv of intervals) {
    const s = timeToMinutes(iv.start);
    const e = timeToMinutes(iv.end);
    if (nowMin >= s && nowMin < e) { current = iv; break; }
  }

  if (current) {
    nowText.textContent = current.label;
    indicator.style.display = 'flex';
  } else {
    // Check if there's anything upcoming today
    const upcoming = intervals
      .filter(iv => timeToMinutes(iv.start) > nowMin)
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    if (upcoming.length > 0) {
      nowText.textContent = `Next: ${upcoming[0].label} at ${upcoming[0].start}`;
      indicator.style.display = 'flex';
    } else {
      indicator.style.display = 'none';
    }
  }
}

// ========== Event Listeners ==========
function setupEventListeners() {
  // Top nav
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.getAttribute('data-section');
      if (section) renderSection(section);
    });
  });

  // Bottom nav
  document.querySelectorAll('.bottom-nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.getAttribute('data-section');
      if (section) renderSection(section);
    });
  });

  // Modal
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('itemForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });

  // Today
  document.getElementById('addTodayBtn').addEventListener('click', () => openAddIntervalModal(formatTime(new Date())));

  // Habits
  document.getElementById('addHabitBtn').addEventListener('click', openAddHabitModal);

  // Upcoming
  document.getElementById('addEventBtn').addEventListener('click', openAddEventModal);

  // Settings
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('saveCalorieConfigBtn').addEventListener('click', saveCalorieConfig);

  // Quick capture
  const qcInput = document.getElementById('quickCaptureInput');
  qcInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = qcInput.value.trim();
      if (text) {
        DataStore.addScheduleItem(text, formatTime(new Date()));
        qcInput.value = '';
        closeQuickCapture();
        if (currentSection === 'today') renderMicroSchedule();
      }
    }
    if (e.key === 'Escape') closeQuickCapture();
  });

  // Quick capture backdrop
  document.getElementById('quickCapture').addEventListener('click', (e) => {
    if (e.target.id === 'quickCapture') closeQuickCapture();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ========== Section Navigation ==========
function renderSection(sectionName) {
  currentSection = sectionName;

  // Update top nav
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-section') === sectionName);
  });

  // Update bottom nav
  document.querySelectorAll('.bottom-nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-section') === sectionName);
  });

  // Update sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionName);
  if (target) target.classList.add('active');

  switch (sectionName) {
    case 'today':     renderMicroSchedule(); break;
    case 'habits':    renderHabits(); renderHeatmap(); break;
    case 'food':      renderMeals(); break;
    case 'upcoming':  renderUpcoming(); break;
    case 'calendar':  renderCalendar(); break;
    case 'life':      renderLifePage(); break;
    case 'week':      renderWeekOverview(); break;
    case 'settings':  renderSettings(); break;
  }
}

// ========== Today / Micro-Scheduling ==========
function renderMicroSchedule() {
  const today = DataStore.getTodayKey();
  const intervals = DataStore.getDayIntervals(today);
  const container = document.getElementById('timeline');
  if (!container) return;

  const startHour = 6;
  const endHour = 24;
  const intervalMinutes = 15;
  const totalSlots = ((endHour - startHour) * 60) / intervalMinutes;
  const slotHeight = 48; // px per slot
  const totalHeight = totalSlots * slotHeight;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPercent = Math.max(0, Math.min(100, ((nowMinutes - startHour * 60) / (totalSlots * intervalMinutes)) * 100));

  let html = `<div class="micro-schedule" style="height:${totalHeight}px;">`;

  // Time labels column
  html += '<div class="micro-times">';
  for (let h = startHour; h < endHour; h++) {
    const label = h <= 12 ? `${h}am` : `${h - 12}pm`;
    html += `<div class="micro-time-label" style="top:${((h - startHour) * 60 / intervalMinutes) * slotHeight}px;">${h === 12 ? '12pm' : label}</div>`;
  }
  html += '</div>';

  // Slots column
  html += '<div class="micro-slots">';
  for (let i = 0; i < totalSlots; i++) {
    const slotMin = startHour * 60 + i * intervalMinutes;
    const h = Math.floor(slotMin / 60);
    const m = slotMin % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const isHourMark = m === 0;
    html += `<div class="micro-slot ${isHourMark ? 'hour-mark' : ''}" style="height:${slotHeight}px;" onclick="openAddIntervalModal('${timeStr}')" title="${timeStr}"></div>`;
  }
  html += '</div>';

  // Now line
  html += `<div class="now-line" style="top:${nowPercent}%;" id="nowLine">
             <div class="now-line-dot"></div>
             <div class="now-line-tail"></div>
           </div>`;

  // Intervals
  intervals.forEach(iv => {
    const sMin = timeToMinutes(iv.start);
    const eMin = timeToMinutes(iv.end);
    if (sMin < startHour * 60 || eMin > endHour * 60) return;
    const topPx = ((sMin - startHour * 60) / intervalMinutes) * slotHeight;
    const heightPx = Math.max(((eMin - sMin) / intervalMinutes) * slotHeight, 28);

    html += `<div class="micro-interval" style="top:${topPx}px;height:${heightPx}px;" data-id="${iv.id}">
               <div class="micro-interval-inner">
                 <span class="micro-interval-label">${escapeHtml(iv.label)}</span>
                 <span class="micro-interval-range">${iv.start}–${iv.end}</span>
               </div>
               <div class="micro-interval-actions">
                 <button class="btn-ghost" onclick="openEditIntervalModal(${iv.id})" aria-label="Edit">Edit</button>
                 <button class="btn-ghost" onclick="deleteInterval(${iv.id})" aria-label="Delete">×</button>
               </div>
             </div>`;
  });

  html += '</div>'; // .micro-schedule

  // Empty state
  if (intervals.length === 0) {
    html += `<div class="empty-state">
               <p>Nothing planned yet — click any time block or press <kbd>N</kbd> to add your first thing for today</p>
             </div>`;
  }

  container.innerHTML = html;
  updateNowIndicator();
}

function openAddIntervalModal(time) {
  currentMode = 'addInterval';
  currentEditId = null;

  const [hours, mins] = time.split(':').map(Number);
  const endTotal = hours * 60 + mins + 60;
  const endH = String(Math.min(Math.floor(endTotal / 60), 23)).padStart(2, '0');
  const endM = String(endTotal % 60).padStart(2, '0');

  document.getElementById('modalTitle').textContent = 'Add to today';
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="intervalLabel">What's happening?</label>
      <input type="text" id="intervalLabel" placeholder="e.g. Therapy call, Deep work" maxlength="100" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="intervalStart">Start</label>
        <input type="time" id="intervalStart" value="${time}" required>
      </div>
      <div class="form-group">
        <label for="intervalEnd">End</label>
        <input type="time" id="intervalEnd" value="${endH}:${endM}" required>
      </div>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('intervalLabel').focus(), 100);
}

function openEditIntervalModal(id) {
  currentMode = 'editInterval';
  currentEditId = id;
  const today = DataStore.getTodayKey();
  const interval = DataStore.getDayIntervals(today).find(i => i.id === id);
  if (!interval) return;

  document.getElementById('modalTitle').textContent = 'Edit time block';
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="intervalLabel">What's happening?</label>
      <input type="text" id="intervalLabel" placeholder="e.g. Therapy call" maxlength="100" value="${escapeHtml(interval.label)}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="intervalStart">Start</label>
        <input type="time" id="intervalStart" value="${interval.start}" required>
      </div>
      <div class="form-group">
        <label for="intervalEnd">End</label>
        <input type="time" id="intervalEnd" value="${interval.end}" required>
      </div>
    </div>
  `;
  openModal();
}

async function deleteInterval(id) {
  const confirmed = await ConfirmDialog.open('Remove this time block?', 'This will remove it from today\'s schedule.');
  if (confirmed) {
    const today = DataStore.getTodayKey();
    DataStore.deleteDayInterval(today, id);
    renderMicroSchedule();
  }
}

// ========== Habits & Meds ==========
function renderHabits() {
  const container = document.getElementById('habitsList');
  if (!container) return;

  const allItems = [
    ...DataStore.habits.map(h => ({ ...h, isDone: DataStore.isHabitDone(h.id) })),
    ...DataStore.meds.map(m => ({ ...m, isDone: DataStore.isHabitDone(m.id) }))
  ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (allItems.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No habits or meds yet — add one to start building your rhythm</p></div>`;
    return;
  }

  container.innerHTML = allItems.map(item => {
    const streak = DataStore.getHabitStreak(item.id);
    const typeLabel = item.type === 'med' ? 'Medication' : 'Habit';
    return `
      <div class="habit-item ${item.isDone ? 'done' : ''}" data-id="${item.id}">
        <input type="checkbox" class="habit-checkbox" ${item.isDone ? 'checked' : ''} onchange="toggleHabit(${item.id})" aria-label="Mark ${escapeHtml(item.name)} as ${item.isDone ? 'not done' : 'done'}">
        <div class="habit-info">
          <div class="habit-name">${escapeHtml(item.name)}</div>
          <div class="habit-meta">
            ${item.time ? `<span class="habit-time">${item.time}</span>` : ''}
            <span class="habit-type-tag">${typeLabel}</span>
          </div>
        </div>
        ${streak > 0 ? `<div class="habit-streak" title="${streak} day streak">${streak} day${streak > 1 ? 's' : ''} 🔥</div>` : ''}
        <div class="habit-actions">
          <button class="btn-ghost" onclick="openEditHabitModal(${item.id}, '${item.type}')" aria-label="Edit">Edit</button>
          <button class="btn-ghost" onclick="deleteHabitItem(${item.id}, '${item.type}')" aria-label="Delete">×</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderHeatmap() {
  const allItems = [...DataStore.habits, ...DataStore.meds];
  const strip = document.getElementById('heatmapStrip');
  if (!strip) return;

  if (allItems.length === 0) {
    strip.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Add a habit to see your consistency</p>';
    return;
  }

  const days = 30;
  let html = '';
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    let completed = 0;
    allItems.forEach(item => { if (DataStore.habitHistory[item.id]?.[key]) completed++; });

    let cls = 'heatmap-day';
    if (completed === allItems.length && allItems.length > 0) cls += ' done';
    else if (completed > 0) cls += ' partial';

    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    html += `<div class="${cls}" title="${dateLabel}: ${completed}/${allItems.length}"></div>`;
  }
  strip.innerHTML = html;
}

function toggleHabit(id) {
  DataStore.toggleHabit(id);
  renderHabits();
  renderHeatmap();
}

function openAddHabitModal() {
  currentMode = 'addHabit';
  currentEditId = null;
  document.getElementById('modalTitle').textContent = 'Add habit or medication';
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="habitType">Type</label>
      <select id="habitType">
        <option value="habit">Habit</option>
        <option value="med">Medication</option>
      </select>
    </div>
    <div class="form-group">
      <label for="habitName">Name</label>
      <input type="text" id="habitName" placeholder="e.g. Morning meds, Exercise" maxlength="100" required>
    </div>
    <div class="form-group">
      <label for="habitTime">Time (optional)</label>
      <input type="time" id="habitTime">
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('habitName').focus(), 100);
}

function openEditHabitModal(id, type) {
  currentMode = 'editHabit';
  currentEditId = id;
  const items = type === 'med' ? DataStore.meds : DataStore.habits;
  const item = items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('modalTitle').textContent = 'Edit';
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="habitType">Type</label>
      <select id="habitType">
        <option value="habit" ${type === 'habit' ? 'selected' : ''}>Habit</option>
        <option value="med" ${type === 'med' ? 'selected' : ''}>Medication</option>
      </select>
    </div>
    <div class="form-group">
      <label for="habitName">Name</label>
      <input type="text" id="habitName" placeholder="e.g. Morning meds" maxlength="100" value="${escapeHtml(item.name)}" required>
    </div>
    <div class="form-group">
      <label for="habitTime">Time (optional)</label>
      <input type="time" id="habitTime" value="${item.time || ''}">
    </div>
  `;
  openModal();
}

async function deleteHabitItem(id, type) {
  const confirmed = await ConfirmDialog.open('Remove this ' + (type === 'med' ? 'medication' : 'habit') + '?', 'Your streak history for this item will be lost.');
  if (confirmed) {
    if (type === 'med') DataStore.deleteMed(id);
    else DataStore.deleteHabit(id);
    renderHabits();
    renderHeatmap();
  }
}

// ========== Food Plan ==========
function renderMeals() {
  const container = document.getElementById('mealsContainer');
  if (!container) return;

  const today = DataStore.getTodayKey();
  const meals = DataStore.foodPlan[today];
  const mealTypes = [
    { key: 'breakfast', label: 'Breakfast', icon: 'sunrise' },
    { key: 'lunch', label: 'Lunch', icon: 'sun' },
    { key: 'dinner', label: 'Dinner', icon: 'moon' },
    { key: 'snacks', label: 'Snacks', icon: 'leaf' }
  ];

  container.innerHTML = mealTypes.map(meal => `
    <div class="meal-card">
      <div class="meal-card-header">
        <div class="meal-card-icon ${meal.key}">
          ${getMealIcon(meal.icon)}
        </div>
        <span class="meal-label">${meal.label}</span>
      </div>
      <div class="meal-items">
        ${(meals[meal.key] || []).map(item => `
          <div class="meal-item ${item.done ? 'eaten' : ''}">
            <input type="checkbox" class="meal-checkbox" ${item.done ? 'checked' : ''} onchange="toggleMeal('${meal.key}', ${item.id})" aria-label="Mark ${escapeHtml(item.text)} as ${item.done ? 'not eaten' : 'eaten'}">
            <span class="meal-text">${escapeHtml(item.text)}</span>
            <button class="meal-delete" onclick="deleteMeal('${meal.key}', ${item.id})" aria-label="Delete">×</button>
          </div>
        `).join('')}
      </div>
      <div class="meal-add-row">
        <input type="text" class="meal-input" placeholder="Add something..." maxlength="100"
               onkeydown="if(event.key==='Enter'){addMealItem('${meal.key}',this);}">
      </div>
    </div>
  `).join('');
}

function getMealIcon(name) {
  const icons = {
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/><path d="M12 8a4 4 0 0 1 4 4"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.77 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>'
  };
  return icons[name] || icons.leaf;
}

function addMealItem(mealType, input) {
  const text = input.value.trim();
  if (text) {
    DataStore.addMealItem(mealType, text);
    input.value = '';
    renderMeals();
  }
}

function toggleMeal(mealType, id) {
  DataStore.toggleMealItem(mealType, id);
  renderMeals();
}

async function deleteMeal(mealType, id) {
  const confirmed = await ConfirmDialog.open('Remove this item?', '');
  if (confirmed) {
    DataStore.deleteMealItem(mealType, id);
    renderMeals();
  }
}

// ========== Upcoming ==========
function renderUpcoming() {
  const container = document.getElementById('upcomingList');
  if (!container) return;

  const events = DataStore.getUpcomingEvents();

  if (events.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Nothing on the horizon — add an event when something comes up</p></div>`;
    return;
  }

  let html = '';
  let currentDate = '';

  events.forEach(event => {
    const eventDate = new Date(event.date + 'T00:00:00');
    const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    if (currentDate !== event.date) {
      currentDate = event.date;
      html += `<div class="upcoming-date-group"><div class="upcoming-date-label">${dateStr}</div></div>`;
    }

    html += `
      <div class="upcoming-item">
        <div class="upcoming-info">
          ${event.time ? `<div class="upcoming-time">${event.time}</div>` : ''}
          <div class="upcoming-title">${escapeHtml(event.title)}</div>
        </div>
        <div class="upcoming-actions">
          <button class="btn-ghost" onclick="openEditEventModal(${event.id})" aria-label="Edit">Edit</button>
          <button class="btn-ghost" onclick="deleteEvent(${event.id})" aria-label="Delete">×</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function openAddEventModal() {
  currentMode = 'addEvent';
  currentEditId = null;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  document.getElementById('modalTitle').textContent = 'Add event';
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="eventTitle">What's happening?</label>
      <input type="text" id="eventTitle" placeholder="e.g. Doctor's appointment" maxlength="100" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="eventDate">Date</label>
        <input type="date" id="eventDate" value="${tomorrow.toISOString().split('T')[0]}" required>
      </div>
      <div class="form-group">
        <label for="eventTime">Time (optional)</label>
        <input type="time" id="eventTime">
      </div>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('eventTitle').focus(), 100);
}

function openEditEventModal(id) {
  currentMode = 'editEvent';
  currentEditId = id;
  const event = DataStore.events.find(e => e.id === id);
  if (!event) return;

  document.getElementById('modalTitle').textContent = 'Edit event';
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="eventTitle">What's happening?</label>
      <input type="text" id="eventTitle" placeholder="e.g. Doctor's appointment" maxlength="100" value="${escapeHtml(event.title)}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="eventDate">Date</label>
        <input type="date" id="eventDate" value="${event.date}" required>
      </div>
      <div class="form-group">
        <label for="eventTime">Time (optional)</label>
        <input type="time" id="eventTime" value="${event.time || ''}">
      </div>
    </div>
  `;
  openModal();
}

async function deleteEvent(id) {
  const confirmed = await ConfirmDialog.open('Remove this event?', '');
  if (confirmed) {
    DataStore.deleteEvent(id);
    renderUpcoming();
  }
}

// ========== Week Overview ==========
function renderWeekOverview() {
  const container = document.getElementById('weekOverview');
  if (!container) return;

  let html = '';
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    const isToday = i === 0;
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    const intervals = DataStore.getDayIntervals(dateKey);

    let habitsCompleted = 0;
    const habitsTotal = DataStore.habits.length + DataStore.meds.length;
    [...DataStore.habits, ...DataStore.meds].forEach(item => {
      if (DataStore.habitHistory[item.id]?.[dateKey]) habitsCompleted++;
    });

    const meals = DataStore.foodPlan[dateKey];
    const totalMeals = Object.values(meals || {}).flat().length;
    const eatenMeals = Object.values(meals || {}).flat().filter(m => m.done).length;

    const calStatus = DataStore.getCalorieStatus(dateKey);

    html += `
      <div class="week-day ${isToday ? 'today-card' : ''}">
        <div class="week-day-header">${isToday ? 'Today' : dayName}</div>
        <div class="week-day-date">${dateStr}</div>
        <div class="week-stats">
          <div class="stat">
            <span class="stat-label">Time blocks</span>
            <span class="stat-value">${intervals.length}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Habits & Meds</span>
            <span class="stat-value">${habitsCompleted}/${habitsTotal}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Meals</span>
            <span class="stat-value">${eatenMeals}/${totalMeals}</span>
          </div>
          ${calStatus.target > 0 ? `
          <div class="stat">
            <span class="stat-label">Calories</span>
            <span class="stat-value">${calStatus.consumed}/${calStatus.target}</span>
          </div>` : ''}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// ========== Calendar View ==========
function renderCalendar() {
  const container = document.getElementById('calendarGrid');
  if (!container) return;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let html = `<h3 class="calendar-month-header">${monthName}</h3><div class="calendar-grid">`;

  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
    html += `<div class="calendar-day-header">${d}</div>`;
  });

  for (let i = 0; i < startingDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const indicators = DataStore.getCalendarIndicators(dateStr);
    const isToday = day === today.getDate();

    html += `<div class="calendar-day ${isToday ? 'is-today' : ''}">
               <div class="calendar-day-number">${day}</div>
               <div class="calendar-indicators">`;
    if (indicators.eventCount > 0) html += `<div class="calendar-indicator event" title="${indicators.eventCount} event(s)"></div>`;
    if (indicators.habitDone || indicators.medDone) html += `<div class="calendar-indicator habit" title="Habit/med completed"></div>`;
    if (indicators.mealsLogged) html += `<div class="calendar-indicator meal" title="Meals logged"></div>`;
    html += `</div></div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

// ========== Life Page ==========
function renderLifePage() {
  const container = document.getElementById('lifeContainer');
  if (!container) return;

  const allItems = [...DataStore.habits, ...DataStore.meds];

  let topStreak = { name: '', count: 0 };
  allItems.forEach(item => {
    const streak = DataStore.getHabitStreak(item.id);
    if (streak > topStreak.count) topStreak = { name: item.name, count: streak };
  });

  const upcoming = DataStore.getUpcomingEvents(1);
  const nextEvent = upcoming.length > 0 ? upcoming[0] : null;

  let weekHabitsCompleted = 0, weekHabitsTotal = 0;
  let weekMealsLogged = 0, weekMealsTotal = 0;
  let daysWithinCalorieTarget = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dk = d.toISOString().split('T')[0];

    allItems.forEach(item => {
      weekHabitsTotal++;
      if (DataStore.habitHistory[item.id]?.[dk]) weekHabitsCompleted++;
    });

    Object.values(DataStore.foodPlan[dk] || {}).flat().forEach(meal => {
      weekMealsTotal++;
      if (meal.done) weekMealsLogged++;
    });

    const cs = DataStore.getCalorieStatus(dk);
    if (cs.target > 0 && Math.abs(cs.consumed - cs.target) < cs.target * 0.1) daysWithinCalorieTarget++;
  }

  const weekHabitsPercent = weekHabitsTotal > 0 ? Math.round((weekHabitsCompleted / weekHabitsTotal) * 100) : 0;

  let html = '<div class="life-grid">';

  // Column 1: Principles
  html += `<div class="life-column"><h3>North Stars</h3><div class="principles-list">`;
  DataStore.lifePage.principles.forEach(p => {
    html += `<div class="principle-item">
               <span class="principle-text">${escapeHtml(p.text)}</span>
               <button class="btn-ghost" onclick="deletePrinciple(${p.id})" aria-label="Delete">×</button>
             </div>`;
  });
  html += `</div><button class="btn btn-secondary" style="width:100%;margin-top:1rem;" onclick="openAddPrincipleModal()">+ Add principle</button></div>`;

  // Column 2: Pillars
  html += `<div class="life-column"><h3>Life Pillars</h3><div class="pillars-list">`;
  DataStore.lifePage.pillars.forEach(pillar => {
    html += `<div class="pillar-item">
               <div class="pillar-header">
                 <span class="pillar-name">${escapeHtml(pillar.name)}</span>
                 <button class="btn-ghost" onclick="deleteLifePillar(${pillar.id})" aria-label="Delete">×</button>
               </div>
               <div class="pillar-status-btns">
                 <button class="pillar-status-btn thriving ${pillar.status === 'thriving' ? 'active' : ''}" onclick="updatePillarStatus(${pillar.id},'thriving')">Thriving</button>
                 <button class="pillar-status-btn stable ${pillar.status === 'stable' ? 'active' : ''}" onclick="updatePillarStatus(${pillar.id},'stable')">Stable</button>
                 <button class="pillar-status-btn needs-attention ${pillar.status === 'needs_attention' ? 'active' : ''}" onclick="updatePillarStatus(${pillar.id},'needs_attention')">Needs help</button>
               </div>
             </div>`;
  });
  html += `</div><button class="btn btn-secondary" style="width:100%;margin-top:1rem;" onclick="openAddPillarModal()">+ Add pillar</button></div>`;

  // Column 3: Dashboard
  html += `<div class="life-column"><h3>Now</h3><div class="dashboard-stats">`;
  if (topStreak.count > 0) {
    html += `<div class="dashboard-stat"><span class="dashboard-label">Top streak</span><span class="dashboard-value">${escapeHtml(topStreak.name)} · ${topStreak.count}🔥</span></div>`;
  }
  if (nextEvent) {
    html += `<div class="dashboard-stat"><span class="dashboard-label">Next up</span><span class="dashboard-value">${nextEvent.time ? nextEvent.time + ' · ' : ''}${escapeHtml(nextEvent.title)}</span></div>`;
  }
  html += `<div class="dashboard-stat"><span class="dashboard-label">Week: habits</span><span class="dashboard-value">${weekHabitsPercent}% complete</span></div>`;
  html += `<div class="dashboard-stat"><span class="dashboard-label">Week: meals</span><span class="dashboard-value">${weekMealsLogged}/${weekMealsTotal} logged</span></div>`;
  html += `<div class="dashboard-stat"><span class="dashboard-label">Week: calories</span><span class="dashboard-value">${daysWithinCalorieTarget}/7 within target</span></div>`;
  html += `</div></div>`;

  html += '</div>';
  container.innerHTML = html;
}

function openAddPrincipleModal() {
  currentMode = 'addPrinciple';
  currentEditId = null;
  document.getElementById('modalTitle').textContent = 'Add a principle';
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="principleText">Your guiding principle</label>
      <input type="text" id="principleText" placeholder="e.g. Move daily, Be kind to yourself" maxlength="100" required>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('principleText').focus(), 100);
}

async function deletePrinciple(id) {
  const confirmed = await ConfirmDialog.open('Remove this principle?', '');
  if (confirmed) { DataStore.deletePrinciple(id); renderLifePage(); }
}

function openAddPillarModal() {
  currentMode = 'addPillar';
  currentEditId = null;
  document.getElementById('modalTitle').textContent = 'Add a life pillar';
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="pillarName">Pillar name</label>
      <input type="text" id="pillarName" placeholder="e.g. Health, Career, Relationships" maxlength="50" required>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('pillarName').focus(), 100);
}

function updatePillarStatus(id, status) {
  DataStore.updatePillarStatus(id, status);
  renderLifePage();
}

async function deleteLifePillar(id) {
  const confirmed = await ConfirmDialog.open('Remove this pillar?', '');
  if (confirmed) { DataStore.deleteLifePillar(id); renderLifePage(); }
}

// ========== Settings ==========
function renderSettings() {
  const bmrInput = document.getElementById('bmrInput');
  const activityInput = document.getElementById('activityInput');
  if (bmrInput) bmrInput.value = DataStore.calorieConfig.bmr || 1800;
  if (activityInput) activityInput.value = DataStore.calorieConfig.activityMultiplier || 1.2;
}

// ========== Modal ==========
function openModal() {
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  currentMode = null;
  currentEditId = null;
}

function handleFormSubmit(e) {
  e.preventDefault();

  switch (currentMode) {
    case 'addInterval': {
      const label = document.getElementById('intervalLabel').value.trim();
      const start = document.getElementById('intervalStart').value;
      const end = document.getElementById('intervalEnd').value;
      if (label && start && end) {
        DataStore.addDayInterval(DataStore.getTodayKey(), start, end, label);
        renderMicroSchedule();
      }
      break;
    }
    case 'editInterval': {
      const label = document.getElementById('intervalLabel').value.trim();
      const start = document.getElementById('intervalStart').value;
      const end = document.getElementById('intervalEnd').value;
      if (label && start && end) {
        DataStore.updateDayInterval(DataStore.getTodayKey(), currentEditId, start, end, label);
        renderMicroSchedule();
      }
      break;
    }
    case 'addHabit': {
      const type = document.getElementById('habitType').value;
      const name = document.getElementById('habitName').value.trim();
      const time = document.getElementById('habitTime').value;
      if (name) {
        if (type === 'med') DataStore.addMed(name, time);
        else DataStore.addHabit(name);
        renderHabits();
        renderHeatmap();
      }
      break;
    }
    case 'editHabit': {
      const type = document.getElementById('habitType').value;
      const name = document.getElementById('habitName').value.trim();
      const time = document.getElementById('habitTime').value;
      if (name) {
        const oldItems = DataStore.habits.concat(DataStore.meds);
        const oldItem = oldItems.find(i => i.id === currentEditId);
        if (oldItem) {
          if (oldItem.type === 'med') DataStore.deleteMed(currentEditId);
          else DataStore.deleteHabit(currentEditId);
        }
        if (type === 'med') DataStore.addMed(name, time);
        else DataStore.addHabit(name);
        renderHabits();
        renderHeatmap();
      }
      break;
    }
    case 'addEvent': {
      const title = document.getElementById('eventTitle').value.trim();
      const date = document.getElementById('eventDate').value;
      const time = document.getElementById('eventTime').value;
      if (title && date) {
        DataStore.addEvent(title, date, time);
        renderUpcoming();
      }
      break;
    }
    case 'editEvent': {
      const title = document.getElementById('eventTitle').value.trim();
      const date = document.getElementById('eventDate').value;
      const time = document.getElementById('eventTime').value;
      if (title && date) {
        DataStore.updateEvent(currentEditId, title, date, time);
        renderUpcoming();
      }
      break;
    }
    case 'addPrinciple': {
      const text = document.getElementById('principleText').value.trim();
      if (text) { DataStore.addPrinciple(text); renderLifePage(); }
      break;
    }
    case 'addPillar': {
      const name = document.getElementById('pillarName').value.trim();
      if (name) { DataStore.addLifePillar(name); renderLifePage(); }
      break;
    }
  }

  closeModal();
}

// ========== Export / Import ==========
function exportData() {
  const data = DataStore.exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifeos-archive-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      DataStore.importData(data);
      renderSection(currentSection);
    } catch (err) {
      alert('Couldn\'t read that file. Please check the format.');
    }
  };
  reader.readAsText(file);
  document.getElementById('importFile').value = '';
}

function saveCalorieConfig() {
  const bmr = parseInt(document.getElementById('bmrInput').value) || 1800;
  const activityMultiplier = parseFloat(document.getElementById('activityInput').value) || 1.2;
  DataStore.setCalorieConfig(bmr, activityMultiplier);
  const btn = document.getElementById('saveCalorieConfigBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Saved ✓';
  setTimeout(() => { btn.textContent = originalText; }, 2000);
}

// ========== Keyboard Shortcuts ==========
function handleKeyboardShortcuts(e) {
  const tag = e.target.tagName;
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  if (isInput) {
    if (e.key === 'Escape') closeModal();
    return;
  }

  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    openQuickCapture();
    return;
  }

  switch (e.key.toLowerCase()) {
    case 'n':
      if (currentSection === 'today') openAddIntervalModal(formatTime(new Date()));
      else if (currentSection === 'habits') openAddHabitModal();
      else if (currentSection === 'upcoming') openAddEventModal();
      break;
    case 't': renderSection('today'); break;
    case 'h': renderSection('habits'); break;
    case 'f': renderSection('food'); break;
    case 'u': renderSection('upcoming'); break;
    case 'c': renderSection('calendar'); break;
    case 'l': renderSection('life'); break;
    case 'w': renderSection('week'); break;
    case 's': renderSection('settings'); break;
  }
}

function openQuickCapture() {
  const qc = document.getElementById('quickCapture');
  qc.classList.add('active');
  document.getElementById('quickCaptureInput').focus();
}

function closeQuickCapture() {
  document.getElementById('quickCapture').classList.remove('active');
}

// ========== Utilities ==========
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
