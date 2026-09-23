declare function acquireVsCodeApi(): any;

(function() {
    const vscode = acquireVsCodeApi();
    
    let allEvents: any[] = [];
    let pendingEvents: any[] = [];

    const container = document.getElementById('timeline-container')!;
    const emptyState = document.getElementById('empty-state')!;
    const emptySearchState = document.getElementById('empty-search-state')!;
    const filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const clearSearchBtn = document.getElementById('clear-search-btn') as HTMLButtonElement;
    const searchResultsCount = document.getElementById('search-results-count') as HTMLSpanElement;
    const newEventsBanner = document.getElementById('new-events-banner') as HTMLDivElement;
    const newEventsText = document.getElementById('new-events-text') as HTMLSpanElement;

    // Initialize UI
    vscode.postMessage({ command: 'request_events', limit: 100, offset: 0, clear: true });

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'render_events':
                if (message.clear) {
                    allEvents = [];
                    pendingEvents = [];
                    container.innerHTML = '';
                    hideNewEventsBanner();
                }
                allEvents.push(...message.events);
                renderEvents(message.events, message.clear);
                updateEmptyState(true); // true means it was a bulk render (search or init)
                break;
            case 'new_event_arrived':
                handleLiveEvent(message.event);
                break;
            case 'render_context':
                renderContext(message.targetId, message.events);
                break;
        }
    });

    filterSelect.addEventListener('change', triggerSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') triggerSearch();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        triggerSearch();
    });

    newEventsBanner.addEventListener('click', () => {
        // Render pending events
        pendingEvents.forEach(e => {
            allEvents.unshift(e); // keep track
            renderSingleEvent(e, false);
        });
        pendingEvents = [];
        hideNewEventsBanner();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateEmptyState(false);
    });

    function triggerSearch() {
        const filterType = filterSelect.value;
        const query = searchInput.value;
        
        if (query) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }

        if (query) {
            vscode.postMessage({ command: 'search', query });
        } else {
            vscode.postMessage({ command: 'request_events', limit: 100, offset: 0, filterType, clear: true });
        }
    }

    function handleLiveEvent(e: any) {
        // If user is searching or filtering, live events might be confusing to append if they don't match.
        // For simplicity, if there's an active query/filter, we skip live rendering, or we can check if it matches.
        // The requirements say "append the new event naturally". Let's assume we append if no search is active.
        if (searchInput.value || (filterSelect.value !== 'all' && filterSelect.value !== e.type)) {
            return;
        }

        const isAtTop = window.scrollY <= 80;
        if (isAtTop) {
            allEvents.unshift(e);
            renderSingleEvent(e, false);
            updateEmptyState(false);
        } else {
            pendingEvents.push(e);
            showNewEventsBanner();
        }
    }

    function showNewEventsBanner() {
        newEventsText.innerText = `${pendingEvents.length} new event${pendingEvents.length > 1 ? 's' : ''}`;
        newEventsBanner.classList.remove('hidden');
    }

    function hideNewEventsBanner() {
        newEventsBanner.classList.add('hidden');
    }

    function updateEmptyState(isBulkRender: boolean) {
        const hasSearchOrFilter = searchInput.value !== '' || filterSelect.value !== 'all';
        
        if (isBulkRender && hasSearchOrFilter) {
            searchResultsCount.innerText = `${allEvents.length} event${allEvents.length === 1 ? '' : 's'}`;
            searchResultsCount.classList.remove('hidden');
        } else {
            searchResultsCount.classList.add('hidden');
        }

        if (allEvents.length === 0) {
            container.classList.add('hidden');
            if (hasSearchOrFilter) {
                emptySearchState.classList.remove('hidden');
                emptyState.classList.add('hidden');
            } else {
                emptyState.classList.remove('hidden');
                emptySearchState.classList.add('hidden');
            }
        } else {
            container.classList.remove('hidden');
            emptyState.classList.add('hidden');
            emptySearchState.classList.add('hidden');
        }
    }

    function renderEvents(eventsToRender: any[], clear: boolean) {
        if (clear) {
            container.innerHTML = '';
        }
        eventsToRender.forEach(e => renderSingleEvent(e, true));
    }

    function getDetailsHtml(e: any): string {
        const m = e.metadata;
        const d = [];
        if (e.type === 'terminal') {
            if (m.category) d.push(`<div><strong>Category:</strong> ${m.category}</div>`);
            if (m.executionType) d.push(`<div><strong>Type:</strong> ${m.executionType}</div>`);
            if (m.shell) d.push(`<div><strong>Shell:</strong> ${m.shell}</div>`);
            if (m.cwd) d.push(`<div><strong>Cwd:</strong> ${m.cwd}</div>`);
            if (m.exitCode !== undefined) d.push(`<div><strong>Exit Code:</strong> ${m.exitCode}</div>`);
            if (m.durationMs) d.push(`<div><strong>Duration:</strong> ${(m.durationMs/1000).toFixed(1)}s</div>`);
        } else if (e.type === 'file') {
            if (m.relativePath) d.push(`<div><strong>Path:</strong> ${m.relativePath}</div>`);
            if (m.oldRelativePath) d.push(`<div><strong>Old Path:</strong> ${m.oldRelativePath}</div>`);
        } else if (e.type === 'git') {
            const curr = m.current;
            const prev = m.previous;
            if (curr) {
                if (curr.branch) d.push(`<div><strong>Branch:</strong> ${curr.branch} ${prev?.branch && prev.branch !== curr.branch ? `(was ${prev.branch})` : ''}</div>`);
                if (curr.head) d.push(`<div><strong>HEAD:</strong> ${curr.head} ${prev?.head && prev.head !== curr.head ? `(was ${prev.head})` : ''}</div>`);
                d.push(`<div><strong>State:</strong> ${curr.isDirty ? 'Dirty' : 'Clean'} (${curr.changedFileCount} files)</div>`);
            }
        }
        return d.join('');
    }

    function renderSingleEvent(e: any, append: boolean) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.dataset.id = e.id;

        const time = new Date(e.timestamp).toLocaleTimeString();
        
        let title = '';
        let resultHtml = '';
        const detailsHtml = getDetailsHtml(e);
        let isFailed = false;

        if (e.type === 'terminal') {
            title = 'Terminal';
            const success = e.metadata.success;
            const exitCode = e.metadata.exitCode !== undefined ? e.metadata.exitCode : 'Unknown';
            const duration = e.metadata.durationMs ? (e.metadata.durationMs / 1000).toFixed(1) + 's' : '';
            
            isFailed = success === false || (exitCode !== 0 && exitCode !== 'Unknown');

            resultHtml = !isFailed ? 
                `<div class="event-result success">✓ Completed ${duration ? '· ' + duration : ''}</div>` : 
                `<div class="event-result error">❌ Exit code ${exitCode} ${duration ? '· ' + duration : ''}</div>`;
            
        } else if (e.type === 'file') {
            title = 'File';
            const action = e.metadata.action;
            const icon = action === 'modified' ? '✏️' : action === 'created' ? '✨' : action === 'deleted' ? '🗑️' : '🔄';
            resultHtml = `<div class="event-result">${icon} ${action}</div>`;
        } else if (e.type === 'git') {
            title = 'Git';
            const action = e.metadata.action;
            resultHtml = `<div class="event-result">🌿 ${action.replace('_', ' ')}</div>`;
        }

        if (isFailed) {
            card.classList.add('failed-event');
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
            if ((evt.target as HTMLElement).tagName === 'BUTTON') return;
            // Also ignore clicks inside the context container so we don't collapse the main card
            if ((evt.target as HTMLElement).closest('.context-container')) return;
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
            let status = '';
            if (e.type === 'terminal') {
                const exitCode = e.metadata.exitCode !== undefined ? e.metadata.exitCode : '?';
                status = e.metadata.success ? ' ✓' : ` ❌ (Code ${exitCode})`;
            }

            const item = document.createElement('div');
            item.className = 'context-event' + (e.id === targetId ? ' target-event' : '');
            
            item.innerHTML = `
                <div class="context-time">${time}</div>
                <div class="context-desc">${escapeHtml(desc)}${status}</div>
            `;
            
            // On click, expand details inline within the context item
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'context-event-details hidden';
            detailsDiv.style.width = '100%';
            detailsDiv.style.marginTop = '6px';
            detailsDiv.style.paddingTop = '6px';
            detailsDiv.style.borderTop = '1px dashed var(--vscode-panel-border)';
            detailsDiv.style.fontSize = '11px';
            detailsDiv.innerHTML = getDetailsHtml(e);
            
            item.appendChild(detailsDiv);
            
            // Make it flow cleanly by wrapping desc and details in a column
            const rightCol = document.createElement('div');
            rightCol.style.display = 'flex';
            rightCol.style.flexDirection = 'column';
            rightCol.style.width = '100%';
            
            const descDiv = item.querySelector('.context-desc')!;
            item.removeChild(descDiv);
            item.removeChild(detailsDiv);
            
            rightCol.appendChild(descDiv);
            rightCol.appendChild(detailsDiv);
            item.appendChild(rightCol);

            item.addEventListener('click', (evt) => {
                evt.stopPropagation();
                if (detailsDiv.classList.contains('hidden')) {
                    detailsDiv.classList.remove('hidden');
                } else {
                    detailsDiv.classList.add('hidden');
                }
            });

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
