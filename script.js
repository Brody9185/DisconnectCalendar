document.addEventListener('DOMContentLoaded', function() {
    // --- PERSISTENCE LAYER ---
    let projects = JSON.parse(localStorage.getItem('ST_Projects')) || { "Default": [] };
    let activeProject = localStorage.getItem('ST_ActiveProject') || "Default";
    if (!projects[activeProject]) activeProject = Object.keys(projects)[0];

    let selectedDates = null;
    let currentColor = 'blue';
    let currentEvent = null;

    // --- SELECTORS ---
    const projSelect = document.getElementById('project-selector');
    const taskNameInput = document.getElementById('task-name');
    const taskOwnerInput = document.getElementById('task-owner');
    const addBtn = document.getElementById('add-task-btn');

    // --- CORE SAVE LOGIC ---
    function syncAndSave() {
        // Pull actual data from Calendar instance
        const currentEvents = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            extendedProps: ev.extendedProps
        }));

        projects[activeProject] = currentEvents;
        localStorage.setItem('ST_Projects', JSON.stringify(projects));
        localStorage.setItem('ST_ActiveProject', activeProject);
    }

    // --- CALENDAR SETUP ---
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        selectable: true,
        editable: true,
        events: projects[activeProject],
        select: (info) => {
            selectedDates = info;
            addBtn.disabled = false;
            document.getElementById('date-selection-hint').innerText = "Date selected!";
        },
        eventClick: (info) => {
            currentEvent = info.event;
            document.getElementById('delete-task-btn').classList.remove('hidden');
        },
        eventChange: () => { syncAndSave(); refreshUI(); },
        eventAdd: () => { syncAndSave(); refreshUI(); },
        eventRemove: () => { syncAndSave(); refreshUI(); }
    });
    calendar.render();

    // --- UI REFRESH (Gantt + Congestion) ---
    function refreshUI() {
        const events = calendar.getEvents();
        
        // Refresh Gantt
        document.getElementById('gantt').innerHTML = '';
        if (events.length > 0) {
            const tasks = events.map(ev => ({
                id: ev.id,
                name: ev.title,
                start: ev.startStr,
                end: ev.endStr || ev.startStr,
                progress: 100,
                custom_class: ev.extendedProps.colorClass || 'bar-blue'
            }));
            new Gantt("#gantt", tasks, {
                view_mode: document.getElementById('gantt-view-mode').value,
                on_date_change: (t, s, e) => {
                    const ev = calendar.getEventById(t.id);
                    if (ev) { ev.setDates(s, e); syncAndSave(); }
                }
            });
        }
        
        // Refresh Congestion
        const notice = document.getElementById('congestion-notice');
        notice.className = (events.length > 3) ? "notice notice-warning" : "notice notice-info";
        notice.innerText = (events.length > 3) ? "High volume detected." : "Schedule clear.";
        notice.classList.remove('hidden');
    }

    // --- PROJECT ACTIONS ---
    function updateProjDropdown() {
        projSelect.innerHTML = '';
        Object.keys(projects).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.innerText = p;
            if (p === activeProject) opt.selected = true;
            projSelect.appendChild(opt);
        });
    }

    projSelect.addEventListener('change', (e) => {
        syncAndSave(); // Save current
        activeProject = e.target.value;
        calendar.removeAllEvents();
        calendar.addEvents(projects[activeProject]); // Load new
        refreshUI();
    });

    document.getElementById('new-project').addEventListener('click', () => {
        const n = prompt("New Project Name:");
        if (n && !projects[n]) {
            syncAndSave();
            projects[n] = [];
            activeProject = n;
            calendar.removeAllEvents();
            updateProjDropdown();
            refreshUI();
            syncAndSave();
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return;
        if (confirm("Delete this project?")) {
            delete projects[activeProject];
            activeProject = Object.keys(projects)[0];
            calendar.removeAllEvents();
            calendar.addEvents(projects[activeProject]);
            updateProjDropdown();
            refreshUI();
            syncAndSave();
        }
    });

    // --- COLOR PICKER ---
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            currentColor = sq.dataset.color;
        });
    });

    // --- TASK ACTIONS ---
    addBtn.addEventListener('click', () => {
        const title = `${taskNameInput.value || "Task"} (${taskOwnerInput.value || "User"})`;
        calendar.addEvent({
            id: 'id-' + Date.now(),
            title: title,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            backgroundColor: getColorCode(currentColor),
            extendedProps: { colorClass: 'bar-' + currentColor }
        });
        taskNameInput.value = '';
        addBtn.disabled = true;
    });

    document.getElementById('delete-task-btn').addEventListener('click', () => {
        if (currentEvent) {
            currentEvent.remove();
            document.getElementById('delete-task-btn').classList.add('hidden');
        }
    });

    function getColorCode(name) {
        const map = { blue: '#3b82f6', red: '#ef4444', green: '#10b981', orange: '#f59e0b' };
        return map[name] || '#3b82f6';
    }

    document.getElementById('gantt-view-mode').addEventListener('change', refreshUI);

    // Bootstrap
    updateProjDropdown();
    refreshUI();
});