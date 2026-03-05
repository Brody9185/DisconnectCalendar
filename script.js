document.addEventListener('DOMContentLoaded', function() {
    let selectedDates = null;
    let selectedColor = 'blue';
    let ganttInstance = null;

    // 1. Color Picker
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.dataset.color;
        });
    });

    // 2. Calendar Init
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridYear' },
        select: function(info) {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
            document.getElementById('date-selection-hint').innerText = `Range: ${info.startStr} to ${info.endStr}`;
        },
        eventChange: () => updateUI(),
        eventRemove: () => updateUI()
    });
    calendar.render();

    // 3. Add Task
    document.getElementById('add-task-btn').addEventListener('click', () => {
        const name = document.getElementById('task-name').value || "New Task";
        const owner = document.getElementById('task-owner').value || "Team";

        calendar.addEvent({
            id: 'id-' + Date.now(),
            title: `${name} (${owner})`,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            extendedProps: { owner: owner, colorClass: 'bar-' + selectedColor }
        });

        updateUI();
        document.getElementById('task-name').value = '';
        document.getElementById('add-task-btn').disabled = true;
    });

    function updateUI() {
        const events = calendar.getEvents();
        renderGantt(events);
        checkCongestion(events);
    }

    function renderGantt(events) {
        const filteredEvents = events.filter(ev => ev.display !== 'none');
        if (filteredEvents.length === 0) {
            document.getElementById('gantt').innerHTML = '';
            return;
        }

        const tasks = filteredEvents.map(ev => ({
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

    // 4. Congestion Logic (3+ tasks, 4+ days duration)
    function checkCongestion(events) {
        const notice = document.getElementById('congestion-notice');
        let congestionFound = false;

        events.forEach(e1 => {
            const start = new Date(e1.start);
            const end = new Date(e1.end || e1.start);
            const duration = (end - start) / (1000 * 60 * 60 * 24);

            if (duration >= 4) {
                const overlaps = events.filter(e2 => 
                    e1.id !== e2.id && start < (e2.end || e2.start) && end > e2.start
                ).length;
                if (overlaps >= 2) congestionFound = true;
            }
        });

        notice.classList.remove('hidden');
        if (congestionFound) {
            notice.innerHTML = "<strong>Heads Up:</strong> High congestion (3+ overlapping long-term tasks).";
            notice.className = "notice notice-warning";
        } else {
            notice.innerHTML = "<strong>Focused:</strong> Workload is well-distributed.";
            notice.className = "notice notice-info";
        }
    }

    // 5. Filter Logic
    document.getElementById('search-filter').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        calendar.getEvents().forEach(ev => {
            ev.setProp('display', ev.title.toLowerCase().includes(term) ? 'auto' : 'none');
        });
        updateUI();
    });

    document.getElementById('gantt-view-mode').addEventListener('change', () => updateUI());

    // 6. PDF Export
    document.getElementById('export-pdf').addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(document.getElementById('main-layout'));
        const pdf = new jsPDF('l', 'mm', 'a4');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 20, 280, 150);
        pdf.save("SyncTrack_Report.pdf");
    });
});