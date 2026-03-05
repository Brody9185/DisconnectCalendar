document.addEventListener('DOMContentLoaded', function() {
    // 1. Initial Data Load
    let projects = JSON.parse(localStorage.getItem('syncTrack_projects')) || { "Default": [] };
    let currentProjectName = localStorage.getItem('syncTrack_currentProject') || "Default";
    if (!projects[currentProjectName]) currentProjectName = Object.keys(projects)[0];

    let selectedDates = null;
    let selectedColor = 'blue'; // Global color state
    let currentSelectedEvent = null;

    // 2. The Master Save Function
    function saveAll() {
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

    // 3. UI Update Function (Updates Gantt & Congestion)
    function updateUI() {
        const activeEvents = calendar.getEvents();
        
        // Clear Gantt
        document.getElementById('gantt').innerHTML = '';
        
        if (activeEvents.length > 0) {
            const tasks = activeEvents.map(ev => ({
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
                        saveAll();
                    }
                }
            });
        }
        checkCongestion(activeEvents);
    }

    // 4. Calendar Setup
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        height: 'auto',
        selectable: true,
        editable: true,
        events: projects[currentProjectName],
        select: (info) => {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
        },
        eventClick: (info) => {
            currentSelectedEvent = info.event;
            document.getElementById('delete-task-btn').classList.remove('hidden');
        },
        eventChange: () => { saveAll(); updateUI(); },
        eventAdd: () => { saveAll(); updateUI(); },
        eventRemove: () => { saveAll(); updateUI(); }
    });
    calendar.render();

    // 5. Project Actions
    function initDropdown() {
        const sel = document.getElementById('project-selector');
        sel.innerHTML = '';
        Object.keys(projects).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.innerText = p;
            opt.selected = (p === currentProjectName);
            sel.appendChild(opt);
        });
    }

    document.getElementById('project-selector').addEventListener('change', (e) => {
        saveAll(); // Save current before swap
        currentProjectName = e.target.value;
        calendar.removeAllEvents();
        calendar.addEvents(projects[currentProjectName]);
        updateUI();
    });

    document.getElementById('new-project').addEventListener('click', () => {
        const name = prompt("Project Name:");
        if (name && !projects[name]) {
            saveAll();
            projects[name] = [];
            currentProjectName = name;
            calendar.removeAllEvents();
            initDropdown();
            updateUI();
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return alert("Keep at least one project.");
        if (confirm(`Delete ${currentProjectName}?`)) {
            delete projects[currentProjectName];
            currentProjectName = Object.keys(projects)[0];
            calendar.removeAllEvents();
            calendar.addEvents(projects[currentProjectName]);
            initDropdown();
            saveAll();
            updateUI();
        }
    });

    // 6. Color Picker Logic
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.getAttribute('data-color'); // Update global variable
        });
    });

    // 7. Task Actions
    document.getElementById('add-task-btn').addEventListener('click', () => {
        if (!selectedDates) return;
        calendar.addEvent({
            id: 'id-' + Date.now(),
            title: `${document.getElementById('task-name').value || "Task"} (${document.getElementById('task-owner').value || "TBD"})`,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            extendedProps: { colorClass: 'bar-' + selectedColor } // Uses the clicked color
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
        notice.innerHTML = congestion ? "Overlap detected." : "Schedule clear.";
        notice.classList.remove('hidden');
    }

    document.getElementById('gantt-view-mode').addEventListener('change', updateUI);

    // Initial Start
    initDropdown();
    updateUI();
});