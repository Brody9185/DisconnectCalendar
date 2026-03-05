document.addEventListener('DOMContentLoaded', function() {
    let projects = JSON.parse(localStorage.getItem('syncTrack_projects')) || { "Default": [] };
    let currentProjectName = localStorage.getItem('syncTrack_currentProject') || "Default";
    
    // Safety check: ensure current project exists in the projects object
    if (!projects[currentProjectName]) currentProjectName = Object.keys(projects)[0];

    let selectedDates = null;
    let selectedColor = 'blue';
    let currentSelectedEvent = null;

    function saveAllToLocalStorage() {
        // 1. Snapshot the CURRENT calendar events into the active project key
        const activeEvents = calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            extendedProps: ev.extendedProps
        }));
        
        projects[currentProjectName] = activeEvents;
        
        // 2. Commit the entire projects object to LocalStorage
        localStorage.setItem('syncTrack_projects', JSON.stringify(projects));
        localStorage.setItem('syncTrack_currentProject', currentProjectName);
        console.log(`Saved project: ${currentProjectName}`);
    }

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
        eventChange: () => { saveAllToLocalStorage(); updateUI(); },
        eventAdd: () => { saveAllToLocalStorage(); updateUI(); },
        eventRemove: () => { saveAllToLocalStorage(); updateUI(); }
    });
    calendar.render();

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
        saveAllToLocalStorage(); // Save progress of the project we're leaving
        currentProjectName = e.target.value;
        
        calendar.removeAllEvents();
        calendar.addEvents(projects[currentProjectName]); // Load the new one
        updateUI();
    });

    document.getElementById('new-project').addEventListener('click', () => {
        const name = prompt("Project Name:");
        if (name && !projects[name]) {
            saveAllToLocalStorage();
            projects[name] = [];
            currentProjectName = name;
            calendar.removeAllEvents();
            initProjectDropdown();
            saveAllToLocalStorage();
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
            saveAllToLocalStorage();
            updateUI();
        }
    });

    function updateUI() {
        const activeEvents = calendar.getEvents();
        renderGantt(activeEvents);
        checkCongestion(activeEvents);
    }

    function renderGantt(events) {
        document.getElementById('gantt').innerHTML = '';
        if (events.length === 0) return;

        const tasks = events.map(ev => ({
            id: ev.id,
            name: ev.title,
            start: ev.startStr,
            end: ev.endStr || ev.startStr,
            progress: 100,
            custom_class: ev.extendedProps.colorClass
        }));

        new Gantt("#gantt", tasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            on_date_change: (task, start, end) => {
                const calEv = calendar.getEventById(task.id);
                if (calEv) {
                    calEv.setDates(start, end);
                    saveAllToLocalStorage(); // Ensure drag-and-drop saves immediately
                }
            }
        });
    }

    document.getElementById('add-task-btn').addEventListener('click', () => {
        calendar.addEvent({
            id: 'id-' + Date.now(),
            title: `${document.getElementById('task-name').value || "Task"} (${document.getElementById('task-owner').value || "TBD"})`,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            extendedProps: { colorClass: 'bar-' + selectedColor }
        });
        document.getElementById('task-name').value = '';
    });

    document.getElementById('delete-task-btn').addEventListener('click', () => {
        if (currentSelectedEvent) {
            currentSelectedEvent.remove();
            document.getElementById('delete-task-btn').classList.add('hidden');
        }
    });

    // Ensure state is saved when closing the tab
    window.addEventListener('beforeunload', saveAllToLocalStorage);

    initProjectDropdown();
    updateUI();
});