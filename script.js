document.addEventListener('DOMContentLoaded', function() {
    let selectedDates = null;
    let selectedColor = 'blue';
    let ganttInstance = null;

    // 1. Setup Color Picker Logic
    document.querySelectorAll('.color-sq').forEach(sq => {
        sq.addEventListener('click', () => {
            document.querySelectorAll('.color-sq').forEach(s => s.classList.remove('active'));
            sq.classList.add('active');
            selectedColor = sq.dataset.color;
        });
    });

    // 2. Initialize Calendar
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        selectable: true,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridYear' },
        select: function(info) {
            selectedDates = info;
            document.getElementById('add-task-btn').disabled = false;
            document.getElementById('date-selection-hint').innerText = `Selected: ${info.startStr} to ${info.endStr}`;
        }
    });
    calendar.render();

    // 3. Add Task Logic
    document.getElementById('add-task-btn').addEventListener('click', () => {
        const name = document.getElementById('task-name').value || "New Task";
        const owner = document.getElementById('task-owner').value || "TBD";

        calendar.addEvent({
            id: 'id-' + Date.now(),
            title: `${name} (${owner})`,
            start: selectedDates.startStr,
            end: selectedDates.endStr,
            extendedProps: { colorClass: 'bar-' + selectedColor, durationDays: (selectedDates.end - selectedDates.start) / 86400000 }
        });

        updateUI();
        // Reset Sidebar
        document.getElementById('task-name').value = '';
        document.getElementById('add-task-btn').disabled = true;
    });

    function updateUI() {
        const events = calendar.getEvents();
        renderGantt(events);
        checkCongestion(events);
    }

    function renderGantt(events) {
        if (events.length === 0) return;
        const viewMode = document.getElementById('gantt-view-mode').value;

        const tasks = events.map(ev => ({
            id: ev.id,
            name: ev.title,
            start: ev.startStr,
            end: ev.endStr || ev.startStr,
            progress: 100,
            custom_class: ev.extendedProps.colorClass
        }));

        ganttInstance = new Gantt("#gantt", tasks, {
            view_mode: viewMode,
            on_date_change: (task, start, end) => {
                const calEv = calendar.getEventById(task.id);
                calEv.setDates(start, end);
                checkCongestion(calendar.getEvents());
            }
        });
    }

    // 4. Multi-month/year toggle
    document.getElementById('gantt-view-mode').addEventListener('change', () => updateUI());

    // 5. Advanced Congestion Logic: 3+ tasks AND 4+ days long
    function checkCongestion(events) {
        const notice = document.getElementById('congestion-notice');
        let congestionPoints = 0;

        events.forEach(e1 => {
            const e1Start = new Date(e1.start);
            const e1End = new Date(e1.end || e1.start);
            const duration = (e1End - e1Start) / (1000 * 60 * 60 * 24);

            if (duration >= 4) {
                let overlaps = events.filter(e2 => 
                    e1.id !== e2.id && e1Start < (e2.end || e2.start) && e1End > e2.start
                ).length;
                
                if (overlaps >= 2) congestionPoints++; // e1 + 2 others = 3 tasks
            }
        });

        if (congestionPoints > 0) {
            notice.innerHTML = "<strong>Heads Up:</strong> You have 3+ long-term tasks overlapping. Check resource capacity.";
            notice.className = "notice notice-warning";
        } else {
            notice.innerHTML = "<strong>Schedule Clear:</strong> No major task collisions detected.";
            notice.className = "notice notice-info";
        }
        notice.classList.remove('hidden');
    }

    // PDF Export
    document.getElementById('export-pdf').addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(document.body);
        const pdf = new jsPDF('l', 'mm', 'a4');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
        pdf.save("report.pdf");
    });
});