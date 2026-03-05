document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    let ganttChart = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        height: 'auto',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        
        // Handle New Event Creation
        select: function(info) {
            let title = prompt('Event Title:');
            if (title) {
                calendar.addEvent({
                    id: 'id-' + Date.now(),
                    title: title,
                    start: info.startStr,
                    end: info.endStr,
                    allDay: info.allDay
                });
                renderGantt();
            }
            calendar.unselect();
        },

        // Handle Drag/Drop or Resize
        eventChange: function() {
            renderGantt();
        }
    });

    calendar.render();

    function renderGantt() {
        const events = calendar.getEvents();
        
        // If no events, clear the SVG
        if (events.length === 0) {
            document.getElementById('gantt').innerHTML = '';
            return;
        }

        // Format data for Frappe Gantt
        const tasks = events.map(ev => {
            return {
                id: ev.id,
                name: ev.title,
                // Frappe Gantt needs YYYY-MM-DD format
                start: ev.start.toISOString().split('T')[0],
                end: ev.end ? ev.end.toISOString().split('T')[0] : ev.start.toISOString().split('T')[0],
                progress: 50
            };
        });

        // Initialize or Refresh Gantt
        ganttChart = new Gantt("#gantt", tasks, {
            view_modes: ['Day', 'Week', 'Month'],
            view_mode: 'Day',
            column_width: 30,
            on_click: task => console.log(task),
        });
    }
});
