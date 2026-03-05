document.addEventListener('DOMContentLoaded', function() {
    let currentProject = localStorage.getItem('syncTrack_currentProject') || "Default";
    let projects = JSON.parse(localStorage.getItem('syncTrack_projects')) || { "Default": [] };
    
    let selectedDates = null;
    let selectedColor = 'blue';
    let currentSelectedEvent = null;
    let ganttInstance = null;

    // --- PROJECT ENGINE ---
    function initProjectList() {
        const selector = document.getElementById('project-selector');
        selector.innerHTML = '';
        Object.keys(projects).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.innerText = name;
            if (name === currentProject) opt.selected = true;
            selector.appendChild(opt);
        });
    }

    function saveAll() {
        projects[currentProject] = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            extendedProps: ev.extendedProps
        }));
        localStorage.setItem('syncTrack_projects', JSON.stringify(projects));
        localStorage.setItem('syncTrack_currentProject', currentProject);
    }

    document.getElementById('project-selector').addEventListener('change', (e) => {
        saveAll();
        currentProject = e.target.value;
        calendar.removeAllEvents();
        calendar.addEvents(projects[currentProject]);
        updateUI();
    });

    document.getElementById('new-project').addEventListener('click', () => {
        const name = prompt("Project Name:");
        if (name && !projects[name]) {
            saveAll();
            projects[name] = [];
            currentProject = name;
            calendar.removeAllEvents();
            initProjectList();
            saveAll();
            updateUI();
        }
    });

    document.getElementById('rename-project').addEventListener('click', () => {
        const newName = prompt("Rename to:", currentProject);
        if (newName && !projects[newName]) {
            projects[newName] = projects[currentProject];
            delete projects[currentProject];
            currentProject = newName;
            initProjectList();
            saveAll();
        }
    });

    document.getElementById('delete-project').addEventListener('click', () => {
        if (Object.keys(projects).length <= 1) return alert("You need at least one project.");
        if (confirm(`Delete "${currentProject}"?`)) {
            delete projects[currentProject];
            currentProject = Object.keys(projects)[0];
            calendar.removeAllEvents();
            calendar.addEvents(projects[currentProject]);
            initProjectList();
            saveAll();
            updateUI();
        }
    });

    // --- CALENDAR & UI ---
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridYear' },
        events: projects[currentProject],
        select: (info) => {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
            document.getElementById('date-selection-hint').innerText = `Range: ${info.startStr} to ${info.endStr}`;
        },
        eventClick: (info) => {
            currentSelectedEvent = info.event;
            document.getElementById('delete-task-btn').classList.remove('hidden');
            document.getElementById('task-name').value = info.event.title;
        },
        eventChange: () => { saveAll(); updateUI(); },
        eventAdd: () => { saveAll(); updateUI(); },
        eventRemove: () => { saveAll(); updateUI(); }
    });
    calendar.render();
    initProjectList();

    // --- TASK ACTIONS ---
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
        resetSidebar();
    });

    document.getElementById('delete-task-btn').addEventListener('click', () => {
        if (currentSelectedEvent && confirm("Delete task?")) {
            currentSelectedEvent.remove();
            resetSidebar();
        }
    });

    function updateUI() {
        const events = calendar.getEvents().filter(ev => ev.display !== 'none');
        renderGantt(events);
        checkCongestion(calendar.getEvents());
    }

    function renderGantt(events) {
        if (events.length === 0) { document.getElementById('gantt').innerHTML = ''; return; }
        const tasks = events.map(ev => ({
            id: ev.id,
            name: ev.title,
            start: ev.startStr,
            end: ev.endStr || ev.startStr,
            progress: 100,
            custom_class: ev.extendedProps.colorClass
        }));
        ganttInstance = new Gantt("#gantt", tasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            on_date_change: (task, start, end) => {
                const calEv = calendar.getEventById(task.id);
                if (calEv) calEv.setDates(start, end);
            }
        });
    }

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
        notice.classList.remove('hidden');
        notice.className = congestion ? "notice notice-warning" : "notice notice-info";
        notice.innerHTML = congestion ? "<strong>Heads Up:</strong> 3+ overlapping long tasks." : "<strong>Status:</strong> Balanced.";
    }

    function resetSidebar() {
        document.getElementById('task-name').value = '';
        document.getElementById('add-task-btn').disabled = true;
        document.getElementById('delete-task-btn').classList.add('hidden');
        currentSelectedEvent = null;
    }

    // --- UTILS ---
    document.getElementById('search-filter').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        calendar.getEvents().forEach(ev => ev.setProp('display', ev.title.toLowerCase().includes(term) ? 'auto' : 'none'));
        updateUI();
    });

    document.getElementById('download-data').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(projects)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'synctrack_all_projects.json';
        a.click();
    });

    document.getElementById('upload-data').addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            projects = JSON.parse(event.target.result);
            currentProject = Object.keys(projects)[0];
            calendar.removeAllEvents();
            calendar.addEvents(projects[currentProject]);
            initProjectList();
            saveAll();
            updateUI();
        };
        reader.readAsText(e.target.files[0]);
    });

    document.getElementById('gantt-view-mode').addEventListener('change', updateUI);
    document.getElementById('export-pdf').addEventListener('click', async () => {
        const canvas = await html2canvas(document.getElementById('main-layout'));
        const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 20, 280, 150);
        pdf.save(`${currentProject}_Report.pdf`);
    });

    updateUI();
});