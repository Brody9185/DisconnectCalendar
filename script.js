document.addEventListener('DOMContentLoaded', function() {
    let projects = JSON.parse(localStorage.getItem('SyncTrack_V7')) || { "Default": [] };
    let activeProject = localStorage.getItem('ActiveProj_V7') || "Default";
    let selectedDates = null;
    let selectedColor = 'blue';

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
        const currentData = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            className: ev.classNames,
            extendedProps: ev.extendedProps
        }));

        projects[activeProject] = currentData;
        localStorage.setItem('SyncTrack_V7', JSON.stringify(projects));
        localStorage.setItem('ActiveProj_V7', activeProject);
        renderGantt(currentData);
    }

    function renderGantt(data) {
        const wrapper = document.getElementById('gantt-wrapper');
        wrapper.innerHTML = '<svg id="gantt"></svg>';
        
        if (!data || data.length === 0) return;

        const tasks = data.map(d => ({
            id: d.id,
            name: d.title,
            start: d.start,
            end: d.end || d.start,
            progress: 100,
            custom_class: d.extendedProps.ganttClass || 'bar-blue'
        }));

        new Gantt("#gantt", tasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            column_width: 30,
            padding: 60, // Shows extra dates/months around the tasks
            on_date_change: (task, start, end) => {
                const ev = calendar.getEventById(task.id);
                if (ev) {
                    ev.setDates(start.toISOString(), end.toISOString());
                    syncData();
                }
            }
        });
    }

    function switchProject(name) {
        activeProject = name;
        calendar.removeAllEvents();
        const data = projects[activeProject] || [];
        data.forEach(e => calendar.addEvent(e));
        renderGantt(data);
        localStorage.setItem('ActiveProj_V7', activeProject);
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
        syncData();
    });

    document.getElementById('project-selector').addEventListener('change', (e) => switchProject(e.target.value));
    
    document.getElementById('new-project').addEventListener('click', () => {
        const n = prompt("New Project Name:");
        if (n && !projects[n]) {
            projects[n] = [];
            initDropdown();
            switchProject(n);
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return;
        if (confirm("Delete current project?")) {
            delete projects[activeProject];
            activeProject = Object.keys(projects)[0];
            initDropdown();
            switchProject(activeProject);
        }
    });

    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.dataset.color;
        });
    });

    document.getElementById('gantt-view-mode').addEventListener('change', () => renderGantt(projects[activeProject]));

    initDropdown();
    renderGantt(projects[activeProject]);
});