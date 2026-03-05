document.addEventListener('DOMContentLoaded', function() {
    // 1. DATA STORAGE
    let projects = JSON.parse(localStorage.getItem('SyncTrack_V5')) || { "Default": [] };
    let activeProject = localStorage.getItem('ActiveProj_V5') || "Default";
    
    let selectedDates = null;
    let selectedColor = 'blue';
    let currentEvent = null;

    // 2. MASTER SAVE
    function commitToStorage() {
        // Explicitly map all events from the calendar
        const data = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            className: ev.classNames,
            extendedProps: { 
                ganttClass: ev.extendedProps.ganttClass || 'bar-blue' 
            }
        }));
        
        projects[activeProject] = data;
        localStorage.setItem('SyncTrack_V5', JSON.stringify(projects));
        localStorage.setItem('ActiveProj_V5', activeProject);
    }

    // 3. CALENDAR
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next', center: 'title', right: '' },
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
        eventAdd: () => { commitToStorage(); renderGantt(); },
        eventChange: () => { commitToStorage(); renderGantt(); },
        eventRemove: () => { commitToStorage(); renderGantt(); }
    });
    calendar.render();

    // 4. GANTT RENDER
    function renderGantt() {
        const wrapper = document.getElementById('gantt-wrapper');
        wrapper.innerHTML = '<svg id="gantt"></svg>'; // Reset the SVG container
        
        const events = calendar.getEvents();
        if (events.length === 0) return;

        const tasks = events.map(ev => ({
            id: ev.id,
            name: ev.title,
            start: ev.startStr,
            end: ev.endStr || ev.startStr,
            progress: 100,
            custom_class: ev.extendedProps.ganttClass 
        }));

        new Gantt("#gantt", tasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            on_date_change: (t, s, e) => {
                const ce = calendar.getEventById(t.id);
                if (ce) { ce.setDates(s, e); commitToStorage(); }
            }
        });
    }

    // 5. PROJECT SWITCHING (Reliable Sync)
    function switchProject(name) {
        commitToStorage(); // Save current work
        
        activeProject = name;
        calendar.removeAllEvents();
        
        // Retrieve and add events for the new project
        const newEvents = projects[activeProject] || [];
        newEvents.forEach(e => calendar.addEvent(e));
        
        renderGantt();
        localStorage.setItem('ActiveProj_V5', activeProject);
    }

    function syncDropdown() {
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
        switchProject(e.target.value);
    });

    document.getElementById('new-project').addEventListener('click', () => {
        const n = prompt("Project Name:");
        if (n && !projects[n]) {
            projects[n] = [];
            syncDropdown();
            switchProject(n);
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return;
        if (confirm("Delete current?")) {
            delete projects[activeProject];
            activeProject = Object.keys(projects)[0];
            syncDropdown();
            switchProject(activeProject);
        }
    });

    // 6. COLORS & TASKS
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.getAttribute('data-color');
        });
    });

    document.getElementById('add-task-btn').addEventListener('click', () => {
        const name = document.getElementById('task-name').value || "Task";
        const owner = document.getElementById('task-owner').value || "User";
        
        calendar.addEvent({
            id: 'id-' + Date.now(),
            title: `${name} (${owner})`,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            className: 'bg-' + selectedColor,
            extendedProps: { ganttClass: 'bar-' + selectedColor }
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

    // Startup
    syncDropdown();
    renderGantt();
});