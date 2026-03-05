document.addEventListener('DOMContentLoaded', function() {
    // --- STATE INITIALIZATION ---
    let projects = JSON.parse(localStorage.getItem('syncTrack_projects')) || { "Default": [] };
    let currentProjectName = localStorage.getItem('syncTrack_currentProject') || "Default";
    
    // Safety check for deleted projects
    if (!projects[currentProjectName]) currentProjectName = Object.keys(projects)[0];

    let selectedDates = null;
    let selectedColor = 'blue'; // Defaults to blue
    let currentSelectedEvent = null;

    // --- DATA HANDLING ---
    function saveCurrentProjectState() {
        const events = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            extendedProps: ev.extendedProps
        }));
        
        projects[currentProjectName] = events;
        localStorage.setItem('syncTrack_projects', JSON.stringify(projects));
        localStorage.setItem('syncTrack_currentProject', currentProjectName);
    }

    // --- CALENDAR INIT ---
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        height: 'auto',
        selectable: true,
        editable: true,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        events: projects[currentProjectName], 
        select: (info) => {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
        },
        eventClick: (info) => {
            currentSelectedEvent = info.event;
            document.getElementById('delete-task-btn').classList.remove('hidden');
        },
        eventChange: () => { saveCurrentProjectState(); updateUI(); },
        eventAdd: () => { saveCurrentProjectState(); updateUI(); },
        eventRemove: () => { saveCurrentProjectState(); updateUI(); }
    });
    calendar.render();

    // --- PROJECT UI ---
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

    document.getElementById('project-selector').addEventListener('change', (e) => {
        saveCurrentProjectState(); // Save old project before leaving
        currentProjectName = e.target.value;
        
        calendar.removeAllEvents();
        calendar.addEvents(projects[currentProjectName]); // Load new project
        updateUI(); // Force Gantt to refresh with new project data
    });

    document.getElementById('new-project').addEventListener('click', () => {
        const name = prompt("Project Name:");
        if (name && !projects[name]) {
            saveCurrentProjectState();
            projects[name] = [];
            currentProjectName = name;
            calendar.removeAllEvents();
            initProjectDropdown();
            saveCurrentProjectState();
            updateUI();
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return alert("Must have 1 project.");
        if (confirm(`Delete "${currentProjectName}"?`)) {
            delete projects[currentProjectName];
            currentProjectName = Object.keys(projects)[0];
            calendar.removeAllEvents();
            calendar.addEvents(projects[currentProjectName]);
            initProjectDropdown();
            saveCurrentProjectState();
            updateUI();
        }
    });

    // --- COLOR PICKER FIX ---
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.getAttribute('data-color');
        });
    });

    // --- CORE LOGIC ---
    function updateUI() {
        const activeEvents = calendar.getEvents();
        renderGantt(activeEvents);
        checkCongestion(activeEvents);
    }

    function renderGantt(events) {
        const container = document.getElementById('gantt');
        container.innerHTML = ''; // Clear old chart
        if (events.length === 0) return;

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
            on_date_change: (task, start, end) => {
                const calEv = calendar.getEventById(task.id);
                if (calEv) {
                    calEv.setDates(start, end);
                    saveCurrentProjectState();
                }
            }
        });
    }

    document.getElementById('add-task-btn').addEventListener('click', () => {
        if (!selectedDates) return;
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
        if (currentSelectedEvent) {
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
        notice.innerHTML = congestion ? "<strong>Heads Up:</strong> Overlap detected." : "<strong>Status:</strong> Balanced.";
        notice.classList.remove('hidden');
    }

    document.getElementById('gantt-view-mode').addEventListener('change', updateUI);

    // Initial setup
    initProjectDropdown();
    updateUI();
});