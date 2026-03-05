document.addEventListener('DOMContentLoaded', function() {
    // Incrementing version to clear any broken local storage structures
    const STORAGE_KEY = 'SyncTrack_V15';
    const PROJ_KEY = 'ActiveProj_V15';

    let projects = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { "Default": [] };
    let activeProject = localStorage.getItem(PROJ_KEY) || "Default";
    let selectedDates = null;
    let selectedColor = 'blue';

    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next', center: 'title', right: '' },
        selectable: true,
        editable: true,
        events: projects[activeProject] || [],
        select: (info) => {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
        },
        eventClick: (info) => {
            if(confirm("Delete task?")) {
                info.event.remove();
                syncData();
            }
        },
        eventDrop: () => syncData(),
        eventResize: () => syncData()
    });
    calendar.render();

    function syncData() {
        // Capture specific calendar events for active project
        projects[activeProject] = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            className: ev.classNames,
            extendedProps: ev.extendedProps
        }));

        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        localStorage.setItem(PROJ_KEY, activeProject);
        renderGantt();
    }

    function renderGantt() {
        const wrapper = document.getElementById('gantt-wrapper');
        // IMPORTANT: Clear the wrapper completely to force a fresh render
        wrapper.innerHTML = '<svg id="gantt"></svg>';
        
        let allTasks = [];
        // Loop through EVERY project and collect EVERY task
        Object.keys(projects).forEach(projName => {
            projects[projName].forEach(task => {
                allTasks.push({
                    id: task.id,
                    name: `[${projName}] ${task.title}`,
                    start: task.start,
                    end: task.end || task.start,
                    progress: 100,
                    custom_class: task.extendedProps.ganttClass || 'bar-blue'
                });
            });
        });

        if (allTasks.length === 0) return;

        // Force the SVG height to be large enough for all tasks (50px per task)
        const svg = document.getElementById('gantt');
        svg.setAttribute('height', (allTasks.length * 50) + 100);

        new Gantt("#gantt", allTasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            column_width: 50,
            padding: 120,
            bar_height: 30,
            on_date_change: (task, start, end) => {
                // Update the task across the data structure
                Object.keys(projects).forEach(p => {
                    let match = projects[p].find(t => t.id === task.id);
                    if (match) {
                        match.start = start.toISOString();
                        match.end = end.toISOString();
                        if (p === activeProject) {
                            calendar.getEventById(task.id).setDates(start, end);
                        }
                    }
                });
                syncData();
            }
        });
    }

    document.getElementById('add-task-btn').addEventListener('click', () => {
        const name = document.getElementById('task-name').value || "Project";
        const contributors = document.getElementById('task-owner').value.trim();
        const displayTitle = contributors ? `${name} (${contributors})` : name;
        
        calendar.addEvent({
            id: 'id-' + Date.now(),
            title: displayTitle,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            className: ['bg-' + selectedColor],
            extendedProps: { ganttClass: 'bar-' + selectedColor }
        });

        document.getElementById('task-name').value = '';
        document.getElementById('task-owner').value = '';
        document.getElementById('add-task-btn').disabled = true;
        syncData();
    });

    // Handle Color Squares
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.dataset.color;
        });
    });

    function switchProject(name) {
        activeProject = name;
        calendar.removeAllEvents();
        (projects[activeProject] || []).forEach(e => calendar.addEvent(e));
        localStorage.setItem(PROJ_KEY, activeProject);
        renderGantt();
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

    document.getElementById('project-selector').addEventListener('change', (e) => switchProject(e.target.value));
    document.getElementById('new-project').addEventListener('click', () => {
        const n = prompt("New Project Name:");
        if (n && !projects[n]) { projects[n] = []; initDropdown(); switchProject(n); }
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

    document.getElementById('gantt-view-mode').addEventListener('change', renderGantt);

    initDropdown();
    renderGantt();
});