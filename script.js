document.addEventListener('DOMContentLoaded', function() {
    const STORAGE_KEY = 'SyncTrack_V16';
    const PROJ_KEY = 'ActiveProj_V16';

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
        }
    });
    calendar.render();

    function syncData() {
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
        wrapper.innerHTML = '<svg id="gantt"></svg>';
        
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

        // Tighter dynamic height calculation
        const svg = document.getElementById('gantt');
        svg.setAttribute('height', (allTasks.length * 40) + 80);

        new Gantt("#gantt", allTasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            column_width: 40,
            // REDUCED SPACING HERE
            padding: 15, 
            bar_height: 20,
            bar_corner_radius: 2,
            on_date_change: (task, start, end) => {
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

    // Project selection logic
    document.getElementById('project-selector').addEventListener('change', (e) => {
        activeProject = e.target.value;
        calendar.removeAllEvents();
        (projects[activeProject] || []).forEach(e => calendar.addEvent(e));
        syncData();
    });

    // Initialize color picker
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.dataset.color;
        });
    });

    renderGantt();
});