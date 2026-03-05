document.addEventListener('DOMContentLoaded', function() {
    // 1. DATA INITIALIZATION
    let projects = JSON.parse(localStorage.getItem('SyncTrack_Data')) || { "Default": [] };
    let activeProject = localStorage.getItem('SyncTrack_ActiveProj') || "Default";
    
    let selectedDates = null;
    let selectedColor = 'blue';
    let currentEvent = null;

    // 2. SAVE ENGINE
    function forceSave() {
        const allEvents = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            className: ev.classNames, // Keeps the color class
            extendedProps: ev.extendedProps
        }));
        projects[activeProject] = allEvents;
        localStorage.setItem('SyncTrack_Data', JSON.stringify(projects));
        localStorage.setItem('SyncTrack_ActiveProj', activeProject);
        console.log("Saved", activeProject);
    }

    // 3. CALENDAR INIT
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        events: projects[activeProject],
        select: (info) => {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
        },
        eventClick: (info) => {
            currentEvent = info.event;
            document.getElementById('delete-task-btn').classList.remove('hidden');
        },
        // Auto-save on any change
        eventAdd: () => { forceSave(); renderGantt(); },
        eventChange: () => { forceSave(); renderGantt(); },
        eventRemove: () => { forceSave(); renderGantt(); }
    });
    calendar.render();

    // 4. GANTT RENDERER
    function renderGantt() {
        const container = document.getElementById('gantt');
        container.innerHTML = ''; // Full wipe
        
        const events = calendar.getEvents();
        if (events.length === 0) return;

        const tasks = events.map(ev => ({
            id: ev.id,
            name: ev.title,
            start: ev.startStr,
            end: ev.endStr || ev.startStr,
            progress: 100,
            custom_class: ev.extendedProps.ganttClass || 'bar-blue'
        }));

        new Gantt("#gantt", tasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            on_date_change: (task, start, end) => {
                const calEv = calendar.getEventById(task.id);
                if (calEv) {
                    calEv.setDates(start, end);
                    forceSave();
                }
            }
        });
    }

    // 5. PROJECT SWITCHING
    function refreshDropdown() {
        const sel = document.getElementById('project-selector');
        sel.innerHTML = '';
        Object.keys(projects).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.innerText = p;
            if (p === activeProject) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    document.getElementById('project-selector').addEventListener('change', (e) => {
        forceSave(); // Save old project
        activeProject = e.target.value;
        
        calendar.removeAllEvents();
        calendar.addEvents(projects[activeProject]); // Load new project
        renderGantt();
    });

    document.getElementById('new-project').addEventListener('click', () => {
        const name = prompt("Project Name:");
        if (name && !projects[name]) {
            forceSave();
            projects[name] = [];
            activeProject = name;
            calendar.removeAllEvents();
            refreshDropdown();
            renderGantt();
            forceSave();
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return;
        if (confirm("Delete current project?")) {
            delete projects[activeProject];
            activeProject = Object.keys(projects)[0];
            calendar.removeAllEvents();
            calendar.addEvents(projects[activeProject]);
            refreshDropdown();
            renderGantt();
            forceSave();
        }
    });

    // 6. COLOR PICKER
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.getAttribute('data-color');
        });
    });

    // 7. ADD TASK
    document.getElementById('add-task-btn').addEventListener('click', () => {
        const name = document.getElementById('task-name').value || "Task";
        const user = document.getElementById('task-owner').value || "TBD";
        
        calendar.addEvent({
            id: 'ev-' + Date.now(),
            title: `${name} (${user})`,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            className: 'bg-' + selectedColor, // Forces Calendar color
            extendedProps: { ganttClass: 'bar-' + selectedColor } // Forces Gantt color
        });
        
        document.getElementById('task-name').value = '';
        document.getElementById('add-task-btn').disabled = true;
    });

    document.getElementById('delete-task-btn').addEventListener('click', () => {
        if (currentEvent) {
            currentEvent.remove();
            document.getElementById('delete-task-btn').classList.add('hidden');
        }
    });

    document.getElementById('gantt-view-mode').addEventListener('change', renderGantt);

    // Bootstrap
    refreshDropdown();
    renderGantt();
});