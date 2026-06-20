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
      Object.assign(this, JSON.parse(stored));
    }
    this.ensureTodaysData();
  },

  ensureTodaysData() {
    const today = this.getTodayKey();

    if (!this.schedule[today]) {
      this.schedule[today] = [];
    }

    if (!this.dayIntervals[today]) {
      this.dayIntervals[today] = [];
    }

    if (!this.calorieExpenditure[today]) {
      this.calorieExpenditure[today] = {
        targetExpenditure: Math.round(this.calorieConfig.bmr * this.calorieConfig.activityMultiplier),
        actualConsumed: 0
      };
    }

    if (!this.foodPlan[today]) {
      this.foodPlan[today] = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: []
      };
    }

    // Regenerate habits/meds as open items for today
    this.habits.forEach(habit => {
      if (!this.habitHistory[habit.id]) {
        this.habitHistory[habit.id] = {};
      }
    });

    this.meds.forEach(med => {
      if (!this.habitHistory[med.id]) {
        this.habitHistory[med.id] = {};
      }
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

  addScheduleItem(title, time) {
    const today = this.getTodayKey();
    const item = {
      id: Date.now(),
      title,
      time,
      createdAt: new Date().toISOString()
    };
    this.schedule[today].push(item);
    this.save();
    return item;
  },

  updateScheduleItem(id, title, time) {
    const today = this.getTodayKey();
    const item = this.schedule[today].find(i => i.id === id);
    if (item) {
      item.title = title;
      item.time = time;
      this.save();
    }
  },

  deleteScheduleItem(id) {
    const today = this.getTodayKey();
    this.schedule[today] = this.schedule[today].filter(i => i.id !== id);
    this.save();
  },

  addHabit(name, frequency = 'daily') {
    const habit = {
      id: Date.now(),
      name,
      frequency,
      type: 'habit',
      createdAt: new Date().toISOString()
    };
    this.habits.push(habit);
    this.habitHistory[habit.id] = {};
    this.save();
    return habit;
  },

  addMed(name, time) {
    const med = {
      id: Date.now(),
      name,
      time,
      type: 'med',
      createdAt: new Date().toISOString()
    };
    this.meds.push(med);
    this.habitHistory[med.id] = {};
    this.save();
    return med;
  },

  deleteHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    delete this.habitHistory[id];
    this.save();
  },

  deleteMed(id) {
    this.meds = this.meds.filter(m => m.id !== id);
    delete this.habitHistory[id];
    this.save();
  },

  toggleHabit(id) {
    const today = this.getTodayKey();
    if (!this.habitHistory[id]) {
      this.habitHistory[id] = {};
    }
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
      if (this.habitHistory[id]?.[key]) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  getHabitHistory(id, days = 30) {
    const history = [];
    const date = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const checkDate = new Date(date);
      checkDate.setDate(checkDate.getDate() - i);
      const key = checkDate.toISOString().split('T')[0];
      const done = !!this.habitHistory[id]?.[key];
      history.push({ date: key, done });
    }
    return history;
  },

  addMealItem(mealType, text) {
    const today = this.getTodayKey();
    const item = {
      id: Date.now(),
      text,
      done: false
    };
    this.foodPlan[today][mealType].push(item);
    this.save();
    return item;
  },

  toggleMealItem(mealType, id) {
    const today = this.getTodayKey();
    const item = this.foodPlan[today][mealType].find(i => i.id === id);
    if (item) {
      item.done = !item.done;
      this.save();
    }
  },

  deleteMealItem(mealType, id) {
    const today = this.getTodayKey();
    this.foodPlan[today][mealType] = this.foodPlan[today][mealType].filter(i => i.id !== id);
    this.save();
  },

  addEvent(title, date, time = '') {
    const event = {
      id: Date.now(),
      title,
      date,
      time,
      createdAt: new Date().toISOString()
    };
    this.events.push(event);
    this.save();
    return event;
  },

  updateEvent(id, title, date, time) {
    const event = this.events.find(e => e.id === id);
    if (event) {
      event.title = title;
      event.date = date;
      event.time = time;
      this.save();
    }
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
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today && eventDate <= futureDate;
      })
      .sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });
  },

  exportData() {
    return {
      schedule: this.schedule,
      habits: this.habits,
      meds: this.meds,
      foodPlan: this.foodPlan,
      events: this.events,
      habitHistory: this.habitHistory,
      dayIntervals: this.dayIntervals,
      calorieExpenditure: this.calorieExpenditure,
      lifePage: this.lifePage,
      calorieConfig: this.calorieConfig,
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
  },

  // ========== Micro-Scheduling ==========
  addDayInterval(date, start, end, label) {
    if (!this.dayIntervals[date]) {
      this.dayIntervals[date] = [];
    }
    const interval = {
      id: Date.now(),
      start,
      end,
      label
    };
    this.dayIntervals[date].push(interval);
    this.save();
    return interval;
  },

  updateDayInterval(date, id, start, end, label) {
    if (!this.dayIntervals[date]) return;
    const interval = this.dayIntervals[date].find(i => i.id === id);
    if (interval) {
      interval.start = start;
      interval.end = end;
      interval.label = label;
      this.save();
    }
  },

  deleteDayInterval(date, id) {
    if (!this.dayIntervals[date]) return;
    this.dayIntervals[date] = this.dayIntervals[date].filter(i => i.id !== id);
    this.save();
  },

  getDayIntervals(date) {
    return this.dayIntervals[date] || [];
  },

  // ========== Calorie Tracking ==========
  setCalorieConfig(bmr, activityMultiplier) {
    this.calorieConfig = { bmr, activityMultiplier };
    this.ensureTodaysData(); // Recalculate today's target
    this.save();
  },

  getCalorieStatus(date) {
    if (!this.calorieExpenditure[date]) {
      return { target: 0, consumed: 0, remaining: 0, percentage: 0 };
    }
    const exp = this.calorieExpenditure[date];
    const consumed = exp.actualConsumed || 0;
    const target = exp.targetExpenditure || 0;
    return {
      target,
      consumed,
      remaining: target - consumed,
      percentage: target > 0 ? Math.round((consumed / target) * 100) : 0
    };
  },

  addMealCalories(date, mealType, itemId, calories) {
    const today = this.getTodayKey();
    const updateDate = date || today;

    if (!this.calorieExpenditure[updateDate]) {
      this.calorieExpenditure[updateDate] = {
        targetExpenditure: Math.round(this.calorieConfig.bmr * this.calorieConfig.activityMultiplier),
        actualConsumed: 0
      };
    }

    const meal = this.foodPlan[updateDate]?.[mealType];
    if (meal) {
      const item = meal.find(i => i.id === itemId);
      if (item) {
        const oldCals = item.calories || 0;
        item.calories = calories;
        this.calorieExpenditure[updateDate].actualConsumed += (calories - oldCals);
        this.save();
      }
    }
  },

  // ========== Life Page: Principles ==========
  addPrinciple(text) {
    const principle = {
      id: Date.now(),
      text
    };
    this.lifePage.principles.push(principle);
    this.save();
    return principle;
  },

  updatePrinciple(id, text) {
    const principle = this.lifePage.principles.find(p => p.id === id);
    if (principle) {
      principle.text = text;
      this.save();
    }
  },

  deletePrinciple(id) {
    this.lifePage.principles = this.lifePage.principles.filter(p => p.id !== id);
    this.save();
  },

  // ========== Life Page: Pillars ==========
  addLifePillar(name) {
    const pillar = {
      id: Date.now(),
      name,
      status: 'stable'
    };
    this.lifePage.pillars.push(pillar);
    this.save();
    return pillar;
  },

  updatePillarStatus(id, status) {
    const pillar = this.lifePage.pillars.find(p => p.id === id);
    if (pillar) {
      pillar.status = status;
      this.save();
    }
  },

  deleteLifePillar(id) {
    this.lifePage.pillars = this.lifePage.pillars.filter(p => p.id !== id);
    this.save();
  },

  // ========== Calendar Helpers ==========
  getCalendarIndicators(date) {
    const eventCount = this.events.filter(e => e.date === date).length;
    const habitDone = this.habits.some(h => this.habitHistory[h.id]?.[date]);
    const medDone = this.meds.some(m => this.habitHistory[m.id]?.[date]);
    const mealsLogged = Object.values(this.foodPlan[date] || {})
      .flat()
      .some(meal => meal.done);

    return { eventCount, habitDone, medDone, mealsLogged };
  }
};

// ========== UI State ==========
let currentSection = 'today';
let currentMode = null; // 'addSchedule', 'editSchedule', etc.
let currentEditId = null;

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
  DataStore.init();
  setupEventListeners();
  updateGreeting();
  updateDateDisplay();
  renderSection('today');
});

// ========== Greeting & Date ==========
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
  if (hour >= 18) greeting = 'Good evening';

  const el = document.getElementById('greeting');
  if (el) el.textContent = greeting;
}

function updateDateDisplay() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = new Date().toLocaleDateString('en-US', options);
  const el = document.getElementById('dateDisplay');
  if (el) el.textContent = dateStr;
}

// ========== Section Navigation ==========
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const section = e.target.getAttribute('data-section');
      renderSection(section);
    });
  });

  // Modal
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('itemForm').addEventListener('submit', handleFormSubmit);

  // Today Section
  document.getElementById('addTodayBtn').addEventListener('click', openAddScheduleModal);

  // Habits Section
  document.getElementById('addHabitBtn').addEventListener('click', openAddHabitModal);

  // Food Section
  document.getElementById('addMealBtn').addEventListener('click', openAddMealModal);

  // Upcoming Section
  document.getElementById('addEventBtn').addEventListener('click', openAddEventModal);

  // Settings
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('saveCalorieConfigBtn').addEventListener('click', saveCalorieConfig);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Quick capture
  const quickCaptureInput = document.getElementById('quickCaptureInput');
  quickCaptureInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = quickCaptureInput.value.trim();
      if (text) {
        DataStore.addScheduleItem(text, formatTime(new Date()));
        quickCaptureInput.value = '';
        closeQuickCapture();
        renderTimeline();
      }
    }
    if (e.key === 'Escape') {
      closeQuickCapture();
    }
  });
}

function renderSection(sectionName) {
  currentSection = sectionName;

  // Update nav
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

  // Update sections
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
  });
  document.getElementById(sectionName).classList.add('active');

  // Render content
  switch (sectionName) {
    case 'today':
      renderMicroSchedule();
      break;
    case 'habits':
      renderHabits();
      renderHeatmap();
      break;
    case 'food':
      renderMeals();
      break;
    case 'upcoming':
      renderUpcoming();
      break;
    case 'calendar':
      renderCalendar();
      break;
    case 'life':
      renderLifePage();
      break;
    case 'week':
      renderWeekOverview();
      break;
  }
}

// ========== Today / Micro-Scheduling ==========
function renderMicroSchedule() {
  const today = DataStore.getTodayKey();
  const intervals = DataStore.getDayIntervals(today);
  const container = document.getElementById('timeline');

  // Generate time slots (6am to 11pm, 15-min intervals)
  const startHour = 6;
  const endHour = 24;
  const intervalMinutes = 15;
  const slots = [];

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      slots.push({ hour: h, minute: m, timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` });
    }
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let html = '<div class="micro-schedule">';
  html += '<div class="micro-schedule-times">';

  // Render time column and slots
  slots.forEach((slot, idx) => {
    const slotMinutes = slot.hour * 60 + slot.minute;
    const isNow = Math.abs(slotMinutes - nowMinutes) < 15;
    const isNowColumn = slotMinutes <= nowMinutes && nowMinutes < slotMinutes + 15;

    // Time label (only show every hour)
    if (slot.minute === 0) {
      html += `<div class="micro-time-label">${slot.timeStr}</div>`;
    } else {
      html += `<div class="micro-time-label" style="color: transparent;"></div>`;
    }

    // Slot background
    html += `<div class="micro-slot ${isNow ? 'is-now' : ''} ${isNowColumn ? 'is-now-column' : ''}"
              onclick="openAddIntervalModal('${slot.timeStr}')"
              data-slot-time="${slot.timeStr}"></div>`;
  });

  html += '</div>';

  // Render intervals on top
  if (intervals.length > 0) {
    intervals.forEach(interval => {
      const startMinutes = timeToMinutes(interval.start);
      const endMinutes = timeToMinutes(interval.end);
      const topPercent = ((startMinutes - startHour * 60) / (slots.length * (intervalMinutes / 60))) * 100;
      const heightPercent = ((endMinutes - startMinutes) / (slots.length * (intervalMinutes / 60))) * 100;

      html += `
        <div class="micro-interval"
             style="top: ${topPercent}%; height: ${heightPercent}%;"
             onmousedown="startDragResize(event, ${interval.id})">
          <div class="micro-interval-content">
            <div class="micro-interval-time">${interval.start}–${interval.end}</div>
            <div class="micro-interval-label">${escapeHtml(interval.label)}</div>
          </div>
          <div class="micro-interval-actions">
            <button class="btn btn-secondary btn-small" onclick="openEditIntervalModal(${interval.id}, '${interval.start}', '${interval.end}')">Edit</button>
            <button class="btn btn-danger btn-small" onclick="deleteInterval(${interval.id})">Delete</button>
          </div>
        </div>
      `;
    });
  }

  html += '</div>';
  container.innerHTML = html;

  if (intervals.length === 0 && document.querySelector('.empty-state')) {
    container.innerHTML += `
      <div class="empty-state">
        <p>Click any time slot to add an event, or use the + button above</p>
      </div>
    `;
  }
}

function openAddIntervalModal(time) {
  currentMode = 'addInterval';
  currentEditId = null;

  // Calculate default end time (30 mins later)
  const [hours, mins] = time.split(':').map(Number);
  const endHours = String(Math.min(hours + (mins + 30) / 60 | 0, 23)).padStart(2, '0');
  const endMins = String((mins + 30) % 60).padStart(2, '0');
  const endTime = `${endHours}:${endMins}`;

  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="intervalLabel">Event</label>
      <input type="text" id="intervalLabel" placeholder="e.g. Team standup" maxlength="100" required>
    </div>
    <div class="form-group">
      <label for="intervalStart">Start</label>
      <input type="time" id="intervalStart" value="${time}" required>
    </div>
    <div class="form-group">
      <label for="intervalEnd">End</label>
      <input type="time" id="intervalEnd" value="${endTime}" required>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('intervalLabel').focus(), 100);
}

function openEditIntervalModal(id, start, end) {
  currentMode = 'editInterval';
  currentEditId = id;
  const today = DataStore.getTodayKey();
  const interval = DataStore.getDayIntervals(today).find(i => i.id === id);

  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="intervalLabel">Event</label>
      <input type="text" id="intervalLabel" placeholder="e.g. Team standup" maxlength="100" value="${escapeHtml(interval.label)}" required>
    </div>
    <div class="form-group">
      <label for="intervalStart">Start</label>
      <input type="time" id="intervalStart" value="${start}" required>
    </div>
    <div class="form-group">
      <label for="intervalEnd">End</label>
      <input type="time" id="intervalEnd" value="${end}" required>
    </div>
  `;
  openModal();
}

function deleteInterval(id) {
  if (confirm('Remove this time block?')) {
    const today = DataStore.getTodayKey();
    DataStore.deleteDayInterval(today, id);
    renderMicroSchedule();
  }
}

// Drag-to-resize helper (placeholder — simplified implementation)
let dragState = null;
function startDragResize(e, intervalId) {
  if (e.target.closest('.micro-interval-actions')) return;
  dragState = { intervalId, startY: e.clientY };
}

// Keep old renderTimeline as fallback for simple view
function renderTimeline() {
  renderMicroSchedule();
}

function openAddScheduleModal() {
  currentMode = 'addSchedule';
  currentEditId = null;
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="scheduleTitle">What's happening?</label>
      <input type="text" id="scheduleTitle" placeholder="e.g. Therapy call" maxlength="100" required>
    </div>
    <div class="form-group">
      <label for="scheduleTime">Time</label>
      <input type="time" id="scheduleTime" required>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('scheduleTitle').focus(), 100);
}

function openEditScheduleModal(id) {
  currentMode = 'editSchedule';
  currentEditId = id;
  const today = DataStore.getTodayKey();
  const item = DataStore.schedule[today].find(i => i.id === id);

  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="scheduleTitle">What's happening?</label>
      <input type="text" id="scheduleTitle" placeholder="e.g. Therapy call" maxlength="100" value="${escapeHtml(item.title)}" required>
    </div>
    <div class="form-group">
      <label for="scheduleTime">Time</label>
      <input type="time" id="scheduleTime" value="${item.time}" required>
    </div>
  `;
  openModal();
}

function deleteScheduleItem(id) {
  if (confirm('Remove this item from today?')) {
    DataStore.deleteScheduleItem(id);
    renderTimeline();
  }
}

// ========== Habits & Meds ==========
function renderHabits() {
  const habitsList = document.getElementById('habitsList');
  const allItems = [
    ...DataStore.habits.map(h => ({ ...h, isDone: DataStore.isHabitDone(h.id) })),
    ...DataStore.meds.map(m => ({ ...m, isDone: DataStore.isHabitDone(m.id) }))
  ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (allItems.length === 0) {
    habitsList.innerHTML = `
      <div class="empty-state">
        <p>No habits or meds yet — add one to get started</p>
      </div>
    `;
    return;
  }

  habitsList.innerHTML = allItems.map(item => {
    const streak = DataStore.getHabitStreak(item.id);
    return `
      <div class="habit-item ${item.isDone ? 'done' : ''}">
        <input type="checkbox" class="habit-checkbox" ${item.isDone ? 'checked' : ''} onchange="toggleHabit(${item.id})">
        <div class="habit-info">
          <div class="habit-name">${escapeHtml(item.name)}</div>
          ${item.time ? `<div class="habit-time">${item.time}</div>` : ''}
        </div>
        ${streak > 0 ? `<div class="habit-streak">${streak}🔥</div>` : ''}
        <div class="habit-actions">
          <button class="btn btn-secondary btn-small" onclick="openEditHabitModal(${item.id}, '${item.type}')">Edit</button>
          <button class="btn btn-danger btn-small" onclick="deleteHabitItem(${item.id}, '${item.type}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderHeatmap() {
  // Show heatmap for the first habit/med, or all combined
  const allItems = [...DataStore.habits, ...DataStore.meds];
  if (allItems.length === 0) {
    document.getElementById('heatmapStrip').innerHTML = '<p style="color: #7A7568; font-size: 0.9rem;">Add a habit to see your streak</p>';
    return;
  }

  // Combine all habit/med completions
  const combinedHistory = {};
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    let completed = 0;
    let total = allItems.length;
    allItems.forEach(item => {
      if (DataStore.habitHistory[item.id]?.[key]) {
        completed++;
      }
    });
    combinedHistory[key] = { completed, total };
  }

  const strip = document.getElementById('heatmapStrip');
  strip.innerHTML = Object.entries(combinedHistory).map(([date, data]) => {
    let className = 'heatmap-day';
    if (data.completed === data.total && data.total > 0) {
      className += ' done';
    } else if (data.completed > 0) {
      className += ' partial';
    }
    const dateObj = new Date(date);
    const tooltip = `${dateObj.toLocaleDateString()}: ${data.completed}/${data.total}`;
    return `<div class="heatmap-day ${className}" title="${tooltip}"></div>`;
  }).join('');
}

function toggleHabit(id) {
  DataStore.toggleHabit(id);
  renderHabits();
  renderHeatmap();
  // Satisfying animation
  const items = document.querySelectorAll('.habit-item');
  items.forEach(item => {
    if (item.querySelector('input').checked) {
      item.style.animation = 'none';
      setTimeout(() => {
        item.style.animation = '';
      }, 10);
    }
  });
}

function openAddHabitModal() {
  currentMode = 'addHabit';
  currentEditId = null;
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="habitType">Type</label>
      <select id="habitType" required style="padding: 0.75rem 1rem; border: 1px solid #E4E0D4; border-radius: 12px; font-family: 'Figtree', sans-serif; font-size: 0.95rem; background-color: #FDFCF8;">
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

  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="habitType">Type</label>
      <select id="habitType" required style="padding: 0.75rem 1rem; border: 1px solid #E4E0D4; border-radius: 12px; font-family: 'Figtree', sans-serif; font-size: 0.95rem; background-color: #FDFCF8;">
        <option value="habit" ${type === 'habit' ? 'selected' : ''}>Habit</option>
        <option value="med" ${type === 'med' ? 'selected' : ''}>Medication</option>
      </select>
    </div>
    <div class="form-group">
      <label for="habitName">Name</label>
      <input type="text" id="habitName" placeholder="e.g. Morning meds, Exercise" maxlength="100" value="${escapeHtml(item.name)}" required>
    </div>
    <div class="form-group">
      <label for="habitTime">Time (optional)</label>
      <input type="time" id="habitTime" value="${item.time || ''}">
    </div>
  `;
  openModal();
}

function deleteHabitItem(id, type) {
  if (confirm('Remove this habit? Streak history will be deleted.')) {
    if (type === 'med') {
      DataStore.deleteMed(id);
    } else {
      DataStore.deleteHabit(id);
    }
    renderHabits();
    renderHeatmap();
  }
}

// ========== Food Plan ==========
function renderMeals() {
  const today = DataStore.getTodayKey();
  const meals = DataStore.foodPlan[today];
  const container = document.getElementById('mealsContainer');

  const mealTypes = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snacks', label: 'Snacks' }
  ];

  container.innerHTML = mealTypes.map(meal => `
    <div class="meal-section">
      <div class="meal-label">${meal.label}</div>
      <div class="meal-items">
        ${(meals[meal.key] || []).map(item => `
          <div class="meal-item ${item.done ? 'eaten' : ''}">
            <input type="checkbox" class="meal-checkbox" ${item.done ? 'checked' : ''} onchange="toggleMeal('${meal.key}', ${item.id})">
            <div class="meal-text">${escapeHtml(item.text)}</div>
            <div class="meal-actions">
              <button class="btn btn-danger btn-small" onclick="deleteMeal('${meal.key}', ${item.id})">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="meal-add">
        <input type="text" class="meal-input" placeholder="Add item..." maxlength="100" onkeypress="if(event.key==='Enter') addMealItem('${meal.key}', this)">
      </div>
    </div>
  `).join('');
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

function deleteMeal(mealType, id) {
  DataStore.deleteMealItem(mealType, id);
  renderMeals();
}

// ========== Upcoming ==========
function renderUpcoming() {
  const events = DataStore.getUpcomingEvents();
  const container = document.getElementById('upcomingList');

  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No upcoming events — add one when you have something planned</p>
      </div>
    `;
    return;
  }

  let currentDate = '';
  let html = '';

  events.forEach(event => {
    const eventDate = new Date(event.date);
    const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    if (currentDate !== event.date) {
      currentDate = event.date;
      html += `<div class="upcoming-date"><div class="upcoming-date-label">${dateStr}</div></div>`;
    }

    html += `
      <div class="upcoming-item">
        <div class="upcoming-info">
          ${event.time ? `<div class="upcoming-time">${event.time}</div>` : ''}
          <div class="upcoming-title">${escapeHtml(event.title)}</div>
        </div>
        <div class="upcoming-actions">
          <button class="btn btn-secondary btn-small" onclick="openEditEventModal(${event.id})">Edit</button>
          <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">Delete</button>
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
  const dateStr = tomorrow.toISOString().split('T')[0];

  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="eventTitle">Event</label>
      <input type="text" id="eventTitle" placeholder="e.g. Doctor's appointment" maxlength="100" required>
    </div>
    <div class="form-group">
      <label for="eventDate">Date</label>
      <input type="date" id="eventDate" value="${dateStr}" required>
    </div>
    <div class="form-group">
      <label for="eventTime">Time (optional)</label>
      <input type="time" id="eventTime">
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('eventTitle').focus(), 100);
}

function openEditEventModal(id) {
  currentMode = 'editEvent';
  currentEditId = id;
  const event = DataStore.events.find(e => e.id === id);

  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="eventTitle">Event</label>
      <input type="text" id="eventTitle" placeholder="e.g. Doctor's appointment" maxlength="100" value="${escapeHtml(event.title)}" required>
    </div>
    <div class="form-group">
      <label for="eventDate">Date</label>
      <input type="date" id="eventDate" value="${event.date}" required>
    </div>
    <div class="form-group">
      <label for="eventTime">Time (optional)</label>
      <input type="time" id="eventTime" value="${event.time || ''}">
    </div>
  `;
  openModal();
}

function deleteEvent(id) {
  if (confirm('Remove this event?')) {
    DataStore.deleteEvent(id);
    renderUpcoming();
  }
}

// ========== Week Overview ==========
function renderWeekOverview() {
  const overview = document.getElementById('weekOverview');
  const days = 7;
  let html = '';

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const scheduleItems = (DataStore.schedule[dateKey] || []).length;

    let habitsCompleted = 0;
    let habitsTotal = DataStore.habits.length + DataStore.meds.length;
    [...DataStore.habits, ...DataStore.meds].forEach(item => {
      if (DataStore.habitHistory[item.id]?.[dateKey]) {
        habitsCompleted++;
      }
    });

    const meals = DataStore.foodPlan[dateKey];
    const totalMeals = Object.values(meals).flat().length;
    const eatenMeals = Object.values(meals).flat().filter(m => m.done).length;

    html += `
      <div class="week-day">
        <div class="week-day-header">${dateStr}</div>
        <div class="week-stats">
          <div class="stat">
            <span class="stat-label">Scheduled</span>
            <span class="stat-value">${scheduleItems}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Habits & Meds</span>
            <span class="stat-value">${habitsCompleted}/${habitsTotal}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Meals</span>
            <span class="stat-value">${eatenMeals}/${totalMeals}</span>
          </div>
        </div>
      </div>
    `;
  }

  overview.innerHTML = html;
}

// ========== Calendar View ==========
function renderCalendar() {
  const container = document.getElementById('calendarGrid');
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Month header
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  let html = `<h3 class="calendar-month-header">${monthName}</h3>`;
  html += '<div class="calendar-grid">';

  // Day headers
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(day => {
    html += `<div class="calendar-day-header">${day}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const indicators = DataStore.getCalendarIndicators(dateStr);
    const isToday = day === today.getDate();

    html += `<div class="calendar-day ${isToday ? 'is-today' : ''}">
              <div class="calendar-day-number">${day}</div>
              <div class="calendar-indicators">`;

    // Event dot
    if (indicators.eventCount > 0) {
      html += `<div class="calendar-indicator event-indicator" title="${indicators.eventCount} event(s)"></div>`;
    }

    // Habit/med ring
    if (indicators.habitDone || indicators.medDone) {
      html += `<div class="calendar-indicator habit-indicator" title="Habit completed"></div>`;
    }

    // Meals ring
    if (indicators.mealsLogged) {
      html += `<div class="calendar-indicator meal-indicator" title="Meals logged"></div>`;
    }

    html += `    </div>
            </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

// ========== Life Page (Command Center) ==========
function renderLifePage() {
  const container = document.getElementById('lifeContainer');

  // Calculate dashboard stats
  const today = DataStore.getTodayKey();
  const allItems = [...DataStore.habits, ...DataStore.meds];

  let topStreak = { name: '', count: 0 };
  allItems.forEach(item => {
    const streak = DataStore.getHabitStreak(item.id);
    if (streak > topStreak.count) {
      topStreak = { name: item.name, count: streak };
    }
  });

  // Next event
  const upcoming = DataStore.getUpcomingEvents(1);
  const nextEvent = upcoming.length > 0 ? upcoming[0] : null;

  // Week stats
  let weekHabitsCompleted = 0;
  let weekHabitsTotal = 0;
  let weekMealsLogged = 0;
  let weekMealsTotal = 0;
  let daysWithinCalorieTarget = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];

    allItems.forEach(item => {
      weekHabitsTotal++;
      if (DataStore.habitHistory[item.id]?.[dateKey]) {
        weekHabitsCompleted++;
      }
    });

    const meals = DataStore.foodPlan[dateKey];
    Object.values(meals || {}).flat().forEach(meal => {
      weekMealsTotal++;
      if (meal.done) weekMealsLogged++;
    });

    const calorieStatus = DataStore.getCalorieStatus(dateKey);
    if (calorieStatus.target > 0 && Math.abs(calorieStatus.consumed - calorieStatus.target) < calorieStatus.target * 0.1) {
      daysWithinCalorieTarget++;
    }
  }

  const weekHabitsPercent = weekHabitsTotal > 0 ? Math.round((weekHabitsCompleted / weekHabitsTotal) * 100) : 0;

  html = `<div class="life-container-inner">
            <!-- Column 1: Principles -->
            <div class="life-column principles-column">
              <h3>North Stars</h3>
              <div class="principles-list" id="principlesList">`;

  DataStore.lifePage.principles.forEach(principle => {
    html += `<div class="principle-item">
              <span class="principle-text">${escapeHtml(principle.text)}</span>
              <button class="btn btn-danger btn-small" onclick="deletePrinciple(${principle.id})">×</button>
            </div>`;
  });

  html += `  </div>
              <button class="btn btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="openAddPrincipleModal()">+ Add Principle</button>
            </div>

            <!-- Column 2: Pillars -->
            <div class="life-column pillars-column">
              <h3>Life Pillars</h3>
              <div class="pillars-list" id="pillarsList">`;

  DataStore.lifePage.pillars.forEach(pillar => {
    const statusColor = pillar.status === 'thriving' ? '#4C6B52' : pillar.status === 'needs_attention' ? '#C97B5C' : '#7A7568';
    html += `<div class="pillar-item">
              <div style="flex: 1;">
                <div class="pillar-name">${escapeHtml(pillar.name)}</div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.4rem;">
                  <button class="btn btn-small" style="background: #4C6B52; color: white; flex: 1;" onclick="updatePillarStatus(${pillar.id}, 'thriving')" ${pillar.status === 'thriving' ? 'style="opacity: 1; background: #3d5642;"' : 'style="opacity: 0.5;"'}>Thriving</button>
                  <button class="btn btn-small" style="background: #7A7568; color: white; flex: 1;" onclick="updatePillarStatus(${pillar.id}, 'stable')" ${pillar.status === 'stable' ? 'style="opacity: 1;"' : 'style="opacity: 0.5;"'}>Stable</button>
                  <button class="btn btn-small" style="background: #C97B5C; color: white; flex: 1;" onclick="updatePillarStatus(${pillar.id}, 'needs_attention')" ${pillar.status === 'needs_attention' ? 'style="opacity: 1;"' : 'style="opacity: 0.5;"'}>Needs Help</button>
                </div>
              </div>
              <button class="btn btn-danger btn-small" onclick="deleteLifePillar(${pillar.id})">×</button>
            </div>`;
  });

  html += `  </div>
              <button class="btn btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="openAddPillarModal()">+ Add Pillar</button>
            </div>

            <!-- Column 3: Dashboard -->
            <div class="life-column dashboard-column">
              <h3>Now</h3>
              <div class="dashboard-stats">
                ${topStreak.count > 0 ? `
                  <div class="dashboard-stat">
                    <span class="dashboard-label">Top Streak</span>
                    <span class="dashboard-value">${topStreak.name} • ${topStreak.count}🔥</span>
                  </div>
                ` : ''}
                ${nextEvent ? `
                  <div class="dashboard-stat">
                    <span class="dashboard-label">Next Event</span>
                    <span class="dashboard-value">${nextEvent.time ? nextEvent.time + ' • ' : ''}${escapeHtml(nextEvent.title)}</span>
                  </div>
                ` : ''}
                <div class="dashboard-stat">
                  <span class="dashboard-label">Week: Habits</span>
                  <span class="dashboard-value">${weekHabitsPercent}% complete</span>
                </div>
                <div class="dashboard-stat">
                  <span class="dashboard-label">Week: Meals</span>
                  <span class="dashboard-value">${weekMealsLogged}/${weekMealsTotal} logged</span>
                </div>
                <div class="dashboard-stat">
                  <span class="dashboard-label">Week: Calories</span>
                  <span class="dashboard-value">${daysWithinCalorieTarget}/7 within target</span>
                </div>
              </div>
            </div>
          </div>`;

  container.innerHTML = html;
}

function openAddPrincipleModal() {
  currentMode = 'addPrinciple';
  currentEditId = null;
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="principleText">Principle</label>
      <input type="text" id="principleText" placeholder="e.g. Move daily" maxlength="100" required>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('principleText').focus(), 100);
}

function deletePrinciple(id) {
  DataStore.deletePrinciple(id);
  renderLifePage();
}

function openAddPillarModal() {
  currentMode = 'addPillar';
  currentEditId = null;
  document.getElementById('formFields').innerHTML = `
    <div class="form-group">
      <label for="pillarName">Life Pillar</label>
      <input type="text" id="pillarName" placeholder="e.g. Health, Career" maxlength="50" required>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('pillarName').focus(), 100);
}

function updatePillarStatus(id, status) {
  DataStore.updatePillarStatus(id, status);
  renderLifePage();
}

function deleteLifePillar(id) {
  DataStore.deleteLifePillar(id);
  renderLifePage();
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

  if (currentMode === 'addSchedule') {
    const title = document.getElementById('scheduleTitle').value;
    const time = document.getElementById('scheduleTime').value;
    DataStore.addScheduleItem(title, time);
    renderTimeline();
  } else if (currentMode === 'editSchedule') {
    const title = document.getElementById('scheduleTitle').value;
    const time = document.getElementById('scheduleTime').value;
    DataStore.updateScheduleItem(currentEditId, title, time);
    renderTimeline();
  } else if (currentMode === 'addInterval') {
    const label = document.getElementById('intervalLabel').value;
    const start = document.getElementById('intervalStart').value;
    const end = document.getElementById('intervalEnd').value;
    const today = DataStore.getTodayKey();
    DataStore.addDayInterval(today, start, end, label);
    renderMicroSchedule();
  } else if (currentMode === 'editInterval') {
    const label = document.getElementById('intervalLabel').value;
    const start = document.getElementById('intervalStart').value;
    const end = document.getElementById('intervalEnd').value;
    const today = DataStore.getTodayKey();
    DataStore.updateDayInterval(today, currentEditId, start, end, label);
    renderMicroSchedule();
  } else if (currentMode === 'addHabit') {
    const type = document.getElementById('habitType').value;
    const name = document.getElementById('habitName').value;
    const time = document.getElementById('habitTime').value;
    if (type === 'med') {
      DataStore.addMed(name, time);
    } else {
      DataStore.addHabit(name);
    }
    renderHabits();
    renderHeatmap();
  } else if (currentMode === 'editHabit') {
    const type = document.getElementById('habitType').value;
    const name = document.getElementById('habitName').value;
    const time = document.getElementById('habitTime').value;
    // Delete old, add new
    const items = DataStore.habits.concat(DataStore.meds);
    const oldItem = items.find(i => i.id === currentEditId);
    if (oldItem.type === 'med') {
      DataStore.deleteMed(currentEditId);
    } else {
      DataStore.deleteHabit(currentEditId);
    }
    if (type === 'med') {
      DataStore.addMed(name, time);
    } else {
      DataStore.addHabit(name);
    }
    renderHabits();
    renderHeatmap();
  } else if (currentMode === 'addEvent') {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    DataStore.addEvent(title, date, time);
    renderUpcoming();
  } else if (currentMode === 'editEvent') {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    DataStore.updateEvent(currentEditId, title, date, time);
    renderUpcoming();
  } else if (currentMode === 'addPrinciple') {
    const text = document.getElementById('principleText').value.trim();
    if (text) {
      DataStore.addPrinciple(text);
      renderLifePage();
    }
  } else if (currentMode === 'addPillar') {
    const name = document.getElementById('pillarName').value.trim();
    if (name) {
      DataStore.addLifePillar(name);
      renderLifePage();
    }
  }

  closeModal();
}

// ========== Settings / Export Import ==========
function exportData() {
  const data = DataStore.exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
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
      alert('Data imported successfully!');
      renderSection(currentSection);
    } catch (err) {
      alert('Error importing data. Please check the file format.');
    }
  };
  reader.readAsText(file);

  // Reset input
  document.getElementById('importFile').value = '';
}

function saveCalorieConfig() {
  const bmr = parseInt(document.getElementById('bmrInput').value) || 1800;
  const activityMultiplier = parseFloat(document.getElementById('activityInput').value) || 1.2;
  DataStore.setCalorieConfig(bmr, activityMultiplier);
  alert('Calorie settings saved!');
}

// ========== Keyboard Shortcuts ==========
function handleKeyboardShortcuts(e) {
  // Don't trigger on form inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === 'Escape') closeModal();
    return;
  }

  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    openQuickCapture();
  } else if (e.key.toLowerCase() === 'n') {
    if (currentSection === 'today') openAddIntervalModal(formatTime(new Date()));
    else if (currentSection === 'habits') openAddHabitModal();
    else if (currentSection === 'food') openAddMealModal();
    else if (currentSection === 'upcoming') openAddEventModal();
  } else if (e.key.toLowerCase() === 't') {
    renderSection('today');
  } else if (e.key.toLowerCase() === 'h') {
    renderSection('habits');
  } else if (e.key.toLowerCase() === 'f') {
    renderSection('food');
  } else if (e.key.toLowerCase() === 'u') {
    renderSection('upcoming');
  } else if (e.key.toLowerCase() === 'c') {
    renderSection('calendar');
  } else if (e.key.toLowerCase() === 'l') {
    renderSection('life');
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

function openAddMealModal() {
  currentMode = 'addMeal';
  currentEditId = null;
  document.getElementById('formFields').innerHTML = `
    <p style="color: #7A7568; margin-bottom: 1rem;">Add meal items directly in the Food section for faster entry.</p>
  `;
  closeModal();
  renderSection('food');
}

// ========== Utilities ==========
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal on backdrop click
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') {
    closeModal();
  }
});

// Close quick capture on backdrop click
document.addEventListener('click', (e) => {
  const qc = document.getElementById('quickCapture');
  if (qc.classList.contains('active') && !qc.contains(e.target)) {
    closeQuickCapture();
  }
});
