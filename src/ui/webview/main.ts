declare function acquireVsCodeApi(): any;

(function() {
    const vscode = acquireVsCodeApi();
    
    let allEvents: any[] = [];
    const container = document.getElementById('timeline-container')!;
    const emptyState = document.getElementById('empty-state')!;
    const filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
    const searchInput = document.getElementById('search-input') as HTMLInputElement;

    // Initialize UI
    vscode.postMessage({ command: 'request_events', limit: 100, offset: 0, clear: true });

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'render_events':
                if (message.clear) {
                    allEvents = [];
                    container.innerHTML = '';
                }
                allEvents.push(...message.events);
                renderEvents(message.events, message.clear);
                updateEmptyState();
                break;
            case 'new_event_arrived':
                allEvents.push(message.event);
                renderSingleEvent(message.event, false); // append to top or bottom depending on sort
                updateEmptyState();
                break;
            case 'render_context':
                renderContext(message.targetId, message.events);
                break;
        }
    });

    filterSelect.addEventListener('change', () => {
        const filterType = filterSelect.value;
        const query = searchInput.value;
        if (query) {
            vscode.postMessage({ command: 'search', query });
        } else {
            vscode.postMessage({ command: 'request_events', limit: 100, offset: 0, filterType, clear: true });
        }
    });

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value;
            vscode.postMessage({ command: 'search', query });
        }
    });

    function updateEmptyState() {
        if (allEvents.length === 0) {
            emptyState.classList.remove('hidden');
            container.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            container.classList.remove('hidden');
        }
    }

    function renderEvents(eventsToRender: any[], clear: boolean) {
        if (clear) {
            container.innerHTML = '';
        }
        eventsToRender.forEach(e => renderSingleEvent(e, true));
    }

    function renderSingleEvent(e: any, append: boolean) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.dataset.id = e.id;

        const time = new Date(e.timestamp).toLocaleTimeString();
        
        let title = '';
        let resultHtml = '';
        let detailsHtml = '';

        if (e.type === 'terminal') {
            title = 'Terminal';
            const success = e.metadata.success;
            const exitCode = e.metadata.exitCode !== undefined ? e.metadata.exitCode : 'Unknown';
            const duration = e.metadata.durationMs ? (e.metadata.durationMs / 1000).toFixed(1) + 's' : '';
            
            resultHtml = success ? 
                `<div class="event-result success">✓ Completed ${duration ? '· ' + duration : ''}</div>` : 
                `<div class="event-result error">❌ Exit code ${exitCode} ${duration ? '· ' + duration : ''}</div>`;

            detailsHtml = `
                <div><strong>Category:</strong> ${e.metadata.category}</div>
                <div><strong>Type:</strong> ${e.metadata.executionType}</div>
                <div><strong>Shell:</strong> ${e.metadata.shell}</div>
                <div><strong>Cwd:</strong> ${e.metadata.cwd}</div>
            `;
        } else if (e.type === 'file') {
            title = 'File';
            const action = e.metadata.action;
            const icon = action === 'modified' ? '✏️' : action === 'created' ? '✨' : action === 'deleted' ? '🗑️' : '🔄';
            
            resultHtml = `<div class="event-result">${icon} ${action}</div>`;
            detailsHtml = `
                <div><strong>Path:</strong> ${e.metadata.relativePath}</div>
                ${e.metadata.oldRelativePath ? `<div><strong>Old Path:</strong> ${e.metadata.oldRelativePath}</div>` : ''}
            `;
        } else if (e.type === 'git') {
            title = 'Git';
            const action = e.metadata.action;
            const curr = e.metadata.current;
            resultHtml = `<div class="event-result">🌿 ${action.replace('_', ' ')}</div>`;
            
            detailsHtml = `
                <div><strong>Branch:</strong> ${curr.branch || 'Unknown'}</div>
                <div><strong>HEAD:</strong> ${curr.head || 'Unknown'}</div>
                <div><strong>State:</strong> ${curr.isDirty ? 'Dirty' : 'Clean'} (${curr.changedFileCount} files)</div>
            `;
        }

        const displayPathOrCommand = e.type === 'terminal' ? e.metadata.command : e.type === 'file' ? e.metadata.relativePath : (e.metadata.current?.branch || 'Repository');

        card.innerHTML = `
            <div class="event-header">
                <span>${time} · ${title}</span>
            </div>
            <div class="event-body">
                <span class="event-command">${escapeHtml(displayPathOrCommand)}</span>
                ${resultHtml}
            </div>
            <div class="details-panel hidden" id="details-${e.id}">
                ${detailsHtml}
                <div>
                    <button class="context-btn" data-id="${e.id}">What Happened Before This?</button>
                    <button class="report-btn" data-id="${e.id}">Create Debug Report</button>
                </div>
                <div class="context-container hidden" id="context-${e.id}"></div>
            </div>
        `;

        card.addEventListener('click', (evt) => {
            if ((evt.target as HTMLElement).tagName === 'BUTTON') return; // let buttons handle their own clicks
            toggleDetails(e.id);
        });

        const contextBtn = card.querySelector('.context-btn');
        if (contextBtn) {
            contextBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'get_context', eventId: e.id });
            });
        }

        const reportBtn = card.querySelector('.report-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'generate_report', eventId: e.id });
            });
        }

        if (append) {
            container.appendChild(card);
        } else {
            container.insertBefore(card, container.firstChild);
        }
    }

    function toggleDetails(id: string) {
        const details = document.getElementById(`details-${id}`);
        if (!details) return;
        
        if (details.classList.contains('hidden')) {
            details.classList.remove('hidden');
        } else {
            details.classList.add('hidden');
        }
    }

    function renderContext(targetId: string, events: any[]) {
        const contextContainer = document.getElementById(`context-${targetId}`);
        if (!contextContainer) return;

        contextContainer.innerHTML = '<h4>Contextual Timeline</h4>';
        
        events.forEach(e => {
            const time = new Date(e.timestamp).toLocaleTimeString();
            const desc = e.type === 'terminal' ? e.metadata.command : e.type === 'file' ? e.metadata.relativePath : 'Git state change';
            const item = document.createElement('div');
            item.style.fontSize = '12px';
            item.style.marginBottom = '4px';
            item.style.color = e.id === targetId ? 'var(--vscode-testing-iconPassed)' : 'inherit';
            item.innerText = `${time}  ${desc}`;
            contextContainer.appendChild(item);
        });

        contextContainer.classList.remove('hidden');
    }

    function escapeHtml(unsafe: string): string {
        return (unsafe || '').replace(/[&<"']/g, function(m) {
            switch (m) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '"': return '&quot;';
                case "'": return '&#039;';
                default: return m;
            }
        });
    }
})();
