document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    let ganttChart = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        
        select: function(info) {
            const title = prompt("Task Name:");
            if (!title) return;
            const user = prompt("Who is responsible?");
            const color = prompt("Color? (blue, red, green, yellow)", "blue");

            calendar.addEvent({
                id: 'id-' + Date.now(),
                title: `${title} [${user}]`,
                start: info.startStr,
                end: info.endStr,
                allDay: info.allDay,
                extendedProps: { owner: user, colorClass: 'bar-' + color }
            });
            updateDashboard();
            calendar.unselect();
        },
        eventChange: updateDashboard,
        eventRemove: updateDashboard
    });

    calendar.render();

    function updateDashboard() {
        const events = calendar.getEvents();
        renderGantt(events);
        analyzeCongestion(events);
    }

    function renderGantt(events) {
        if (events.length === 0) {
            document.getElementById('gantt').innerHTML = '';
            return;
        }

        const tasks = events.map(ev => ({
            id: ev.id,
            name: ev.title,
            start: ev.start.toISOString().split('T')[0],
            end: (ev.end || ev.start).toISOString().split('T')[0],
            progress: 100,
            custom_class: ev.extendedProps.colorClass || 'bar-blue'
        }));

        ganttChart = new Gantt("#gantt", tasks, {
            view_mode: 'Day',
            column_width: 30
        });
    }

    function analyzeCongestion(events) {
        const statusBar = document.getElementById('status-bar');
        const msg = document.getElementById('congestion-msg');
        
        if (events.length === 0) {
            statusBar.classList.add('hidden');
            return;
        }

        let maxOverlap = 0;
        // Check every event against every other event
        events.forEach(e1 => {
            let overlaps = events.filter(e2 => e1.id !== e2.id && e1.start < (e2.end || e2.start) && (e1.end || e1.start) > e2.start).length;
            maxOverlap = Math.max(maxOverlap, overlaps);
        });

        statusBar.classList.remove('hidden');
        if (maxOverlap > 0) {
            msg.innerHTML = `<span class="congestion-warning">⚠️ CONGESTION:</span> You have multiple overlapping tasks. Resource management required.`;
            statusBar.style.borderColor = "var(--danger)";
        } else {
            msg.innerHTML = `<span class="solo-working">✅ FOCUSED:</span> Only one task is being developed at a time. Ideal for deep work.`;
            statusBar.style.borderColor = "var(--success)";
        }
    }

    // PDF Export function
    document.getElementById('export-pdf').addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const container = document.getElementById('app-container');
        
        const canvas = await html2canvas(container);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        
        pdf.text("Project Report", 10, 10);
        pdf.addImage(imgData, 'PNG', 10, 20, 280, 150);
        pdf.save("project-timeline.pdf");
    });
});