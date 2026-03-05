document.addEventListener('DOMContentLoaded', function() {
    // 1. STATE MANAGEMENT
    let projects = JSON.parse(localStorage.getItem('SyncTrack_V4')) || { "Default": [] };
    let activeProject = localStorage.getItem('SyncTrack_ActiveProj_V4') || "Default";
    
    let selectedDates = null;
    let selectedColor = 'blue';
    let currentEvent = null;

    // 2. STABLE SAVE ENGINE
    function saveState() {
        const calendarEvents = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            className: ev.classNames, // Save the color class
            extendedProps: ev.extendedProps
        }));
        
        projects[activeProject] = calendarEvents;
        localStorage.setItem('SyncTrack_V4', JSON.stringify(projects));
        localStorage.setItem('SyncTrack_ActiveProj_V4', activeProject);
    }

    // 3. CALENDAR SETUP (More compact)
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        dayMaxEvents: true,
        events: projects[activeProject],
        select: (info) => {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
        },
        eventClick: (info) => {
            currentEvent = info.event;
            document.getElementById('delete-task-btn').classList.remove('hidden');
        },
        eventAdd: () => { saveState(); renderGantt(); },
        eventChange: () => { saveState(); renderGantt(); },
        eventRemove: () => { saveState(); renderGantt(); }
    });
    calendar.render();

    // 4. GANTT RENDERING
    function renderGantt() {
        const svg = document.getElementById('gantt');
        svg.innerHTML = ''; 
        
        const events = calendar.getEvents();
        if (events.length === 0) return;

        const tasks = events.map(ev => ({
            id: ev.id,
            name: ev.title,
            start: ev.startStr,
            end: ev.endStr || ev.startStr,
            progress: 100,
            custom_class: ev.extendedProps.ganttClass // Ensure this matches bar-color in CSS
        }));

        new Gantt("#gantt", tasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            on_date_change: (task, start, end) => {
                const calEv = calendar.getEventById(task.id);
                if (calEv) {
                    calEv.setDates(start, end);
                    saveState();
                }
            }
        });
    }

    // 5. PROJECT SWITCHING (ASYNCHRONOUS FIX)
    async function switchProject(newName) {
        saveState(); // Save the one we are leaving
        activeProject = newName;
        
        calendar.removeAllEvents();
        
        // Minor delay to allow FullCalendar to clear internal state
        await new Promise(r => setTimeout(r, 50)); 
        
        const nextEvents = projects[activeProject] || [];
        calendar.addEvents(nextEvents);
        
        renderGantt();
        saveState(); // Confirming state
    }

    function initDropdown() {
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
        const name = prompt("Project Name:");
        if (name && !projects[name]) {
            projects[name] = [];
            initDropdown();
            switchProject(name);
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return;
        if (confirm("Delete this project?")) {
            delete projects[activeProject];
            activeProject = Object.keys(projects)[0];
            initDropdown();
            switchProject(activeProject);
        }
    });

    // 6. COLOR & TASK ACTIONS
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.getAttribute('data-color');
        });
    });

    document.getElementById('add-task-btn').addEventListener('click', () => {
        const name = document.getElementById('task-name').value || "Task";
        const owner = document.getElementById('task-owner').value || "TBD";
        
        calendar.addEvent({
            id: 'ev-' + Date.now(),
            title: `${name} (${owner})`,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            className: 'bg-' + selectedColor, // Visual class for calendar
            extendedProps: { ganttClass: 'bar-' + selectedColor } // Property for Gantt
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
    initDropdown();
    renderGantt();
});