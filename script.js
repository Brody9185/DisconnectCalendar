document.addEventListener('DOMContentLoaded', function() {
    // 1. Load Data Structure
    let projects = JSON.parse(localStorage.getItem('syncTrack_projects')) || { "Default": [] };
    let currentProjectName = localStorage.getItem('syncTrack_currentProject') || "Default";
    
    let selectedDates = null;
    let selectedColor = 'blue';
    let currentSelectedEvent = null;

    // 2. Project Manager Functions
    function initProjectDropdown() {
        const selector = document.getElementById('project-selector');
        selector.innerHTML = '';
        Object.keys(projects).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.innerText = name;
            if (name === currentProjectName) opt.selected = true;
            selector.appendChild(opt);
        });
    }

    function saveAllToLocalStorage() {
        // Sync the ACTIVE calendar events into the projects object before saving
        projects[currentProjectName] = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            extendedProps: ev.extendedProps
        }));
        
        localStorage.setItem('syncTrack_projects', JSON.stringify(projects));
        localStorage.setItem('syncTrack_currentProject', currentProjectName);
    }

    // 3. Calendar Setup
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        height: 'auto',
        selectable: true,
        editable: true,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridYear' },
        events: projects[currentProjectName], // Only load current project
        select: (info) => {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
            document.getElementById('date-selection-hint').innerText = `Selected: ${info.startStr}`;
        },
        eventClick: (info) => {
            currentSelectedEvent = info.event;
            document.getElementById('delete-task-btn').classList.remove('hidden');
            document.getElementById('task-name').value = info.event.title;
        },
        eventChange: () => { saveAllToLocalStorage(); updateUI(); },
        eventAdd: () => { saveAllToLocalStorage(); updateUI(); },
        eventRemove: () => { saveAllToLocalStorage(); updateUI(); }
    });
    calendar.render();

    // 4. Update UI (Gantt & Congestion)
    function updateUI() {
        // Only pull events currently in the calendar (the active project)
        const activeEvents = calendar.getEvents().filter(ev => ev.display !== 'none');
        
        renderGantt(activeEvents);
        checkCongestion(activeEvents);
    }

    function renderGantt(events) {
        const ganttContainer = document.getElementById('gantt');
        if (events.length === 0) { ganttContainer.innerHTML = ''; return; }

        const tasks = events.map(ev => ({
            id: ev.id,
            name: ev.title,
            start: ev.startStr,
            end: ev.endStr || ev.startStr,
            progress: 100,
            custom_class: ev.extendedProps.colorClass
        }));

        new Gantt("#gantt", tasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            on_date_change: (task, start, end) => {
                const calEv = calendar.getEventById(task.id);
                if (calEv) calEv.setDates(start, end);
            }
        });
    }

    // 5. Project Switching
    document.getElementById('project-selector').addEventListener('change', (e) => {
        saveAllToLocalStorage(); // Save existing project first
        currentProjectName = e.target.value;
        
        calendar.removeAllEvents();
        calendar.addEvents(projects[currentProjectName]); // Load new project events
        updateUI();
    });

    document.getElementById('new-project').addEventListener('click', () => {
        const name = prompt("Project Name:");
        if (name && !projects[name]) {
            saveAllToLocalStorage();
            projects[name] = [];
            currentProjectName = name;
            calendar.removeAllEvents();
            initProjectDropdown();
            saveAllToLocalStorage();
            updateUI();
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return alert("Min 1 project required.");
        if (confirm(`Delete "${currentProjectName}"?`)) {
            delete projects[currentProjectName];
            currentProjectName = Object.keys(projects)[0];
            calendar.removeAllEvents();
            calendar.addEvents(projects[currentProjectName]);
            initProjectDropdown();
            saveAllToLocalStorage();
            updateUI();
        }
    });

    // 6. UI Interaction
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.dataset.color;
        });
    });

    document.getElementById('add-task-btn').addEventListener('click', () => {
        calendar.addEvent({
            id: 'id-' + Date.now(),
            title: `${document.getElementById('task-name').value || "Task"} (${document.getElementById('task-owner').value || "TBD"})`,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            extendedProps: { colorClass: 'bar-' + selectedColor }
        });
        document.getElementById('task-name').value = '';
        document.getElementById('add-task-btn').disabled = true;
    });

    document.getElementById('delete-task-btn').addEventListener('click', () => {
        if (currentSelectedEvent && confirm("Delete task?")) {
            currentSelectedEvent.remove();
            document.getElementById('delete-task-btn').classList.add('hidden');
        }
    });

    function checkCongestion(events) {
        const notice = document.getElementById('congestion-notice');
        let congestion = false;
        events.forEach(e1 => {
            const start = new Date(e1.start), end = new Date(e1.end || e1.start);
            if ((end - start) / 86400000 >= 4) {
                const overlaps = events.filter(e2 => e1.id !== e2.id && start < (e2.end || e2.start) && end > e2.start).length;
                if (overlaps >= 2) congestion = true;
            }
        });
        notice.className = congestion ? "notice notice-warning" : "notice notice-info";
        notice.innerHTML = congestion ? "<strong>Heads Up:</strong> 3+ overlapping tasks (4+ days long)." : "<strong>Status:</strong> Clear.";
        notice.classList.remove('hidden');
    }

    document.getElementById('search-filter').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        calendar.getEvents().forEach(ev => ev.setProp('display', ev.title.toLowerCase().includes(term) ? 'auto' : 'none'));
        updateUI();
    });

    document.getElementById('gantt-view-mode').addEventListener('change', updateUI);
    
    // Initial Run
    initProjectDropdown();
    updateUI();
});