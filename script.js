document.addEventListener('DOMContentLoaded', function() {
    const STORAGE_KEY = 'SyncTrack_V17';
    const PROJ_KEY = 'ActiveProj_V17';

    let projects = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { "Default": [] };
    let activeProject = localStorage.getItem(PROJ_KEY) || "Default";
    let selectedDates = null;
    let selectedColor = '#3b82f6'; // Using Hex directly

    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        selectable: true,
        events: projects[activeProject] || [],
        select: (info) => {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
        }
    });
    calendar.render();

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
                    custom_class: 'task-' + task.id // Unique class per task
                });
            });
        });

        if (allTasks.length === 0) return;

        const gantt = new Gantt("#gantt", allTasks, {
            view_mode: document.getElementById('gantt-view-mode').value,
            column_width: 40,
            padding: 10, // Minimum padding for tight spacing
            bar_height: 20, // Small bars for tight spacing
            on_date_change: (task, start, end) => {
                updateTaskDates(task.id, start, end);
            }
        });

        applyManualColors();
    }

    // This function forces the SVG to take the colors from our data
    function applyManualColors() {
        Object.keys(projects).forEach(projName => {
            projects[projName].forEach(task => {
                const color = task.extendedProps.hexColor;
                const bars = document.querySelectorAll(`.task-${task.id} .bar`);
                bars.forEach(bar => {
                    bar.style.fill = color;
                    bar.style.setProperty('fill', color, 'important');
                });
            });
        });
    }

    function updateTaskDates(id, start, end) {
        Object.keys(projects).forEach(p => {
            let t = projects[p].find(x => x.id === id);
            if (t) {
                t.start = start.toISOString();
                t.end = end.toISOString();
            }
        });
        saveAndRefresh();
    }

    document.getElementById('add-task-btn').addEventListener('click', () => {
        const name = document.getElementById('task-name').value || "Project";
        const owner = document.getElementById('task-owner').value;
        const title = owner ? `${name} (${owner})` : name;
        
        const newTask = {
            id: 'id-' + Date.now(),
            title: title,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            extendedProps: { 
                hexColor: selectedColor 
            }
        };

        projects[activeProject].push(newTask);
        saveAndRefresh();
        
        document.getElementById('task-name').value = '';
        document.getElementById('task-owner').value = '';
    });

    function saveAndRefresh() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        localStorage.setItem(PROJ_KEY, activeProject);
        calendar.removeAllEvents();
        calendar.addEventSource(projects[activeProject]);
        renderGantt();
    }

    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', (e) => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = window.getComputedStyle(e.target).backgroundColor;
        });
    });

    renderGantt();
});