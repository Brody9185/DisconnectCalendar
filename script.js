document.addEventListener('DOMContentLoaded', function() {
    let projects = JSON.parse(localStorage.getItem('SyncTrack_V14')) || { "Default": [] };
    let activeProject = localStorage.getItem('ActiveProj_V14') || "Default";
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
        // Save calendar state back to the active project in memory
        projects[activeProject] = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            className: ev.classNames,
            extendedProps: ev.extendedProps
        }));

        localStorage.setItem('SyncTrack_V14', JSON.stringify(projects));
        localStorage.setItem('ActiveProj_V14', activeProject);
        renderGantt();
    }

    function renderGantt() {
        const wrapper = document.getElementById('gantt-wrapper');
        wrapper.innerHTML = '<svg id="gantt"></svg>';
        
        // COLLECT ALL EVENTS FROM ALL PROJECTS
        let allTasks = [];
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

        // Dynamic Height Fix: Increases height for every event added
        const svg = document.getElementById('gantt');
        const calculatedHeight = 100 + (allTasks.length * 45);
        svg.setAttribute('height', calculatedHeight);

        new Gantt("#gantt", allTasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            column_width: 45,
            padding: 120,
            bar_height: 25,
            on_date_change: (task, start, end) => {
                // If dragged, update the source project
                Object.keys(projects).forEach(p => {
                    let t = projects[p].find(x => x.id === task.id);
                    if (t) {
                        t.start = start.toISOString();
                        t.end = end.toISOString();
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
            className: 'bg-' + selectedColor,
            extendedProps: { ganttClass: 'bar-' + selectedColor }
        });

        document.getElementById('task-name').value = '';
        document.getElementById('task-owner').value = '';
        document.getElementById('add-task-btn').disabled = true;
        syncData();
    });

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
        localStorage.setItem('ActiveProj_V14', activeProject);
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
        if (confirm("Delete project?")) {
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