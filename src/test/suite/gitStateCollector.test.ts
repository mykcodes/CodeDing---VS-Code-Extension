import * as assert from 'assert';
import { GitStateCollector } from '../../events/git/gitStateCollector';
import { EventBus } from '../../core/eventBus';
import { SessionManager } from '../../core/sessionManager';
import { GitEvent } from '../../core/types';

suite('GitStateCollector Test Suite', () => {
    let eventBus: EventBus;
    let sessionManager: SessionManager;
    let collector: GitStateCollector;
    let emittedEvents: GitEvent[] = [];

    setup(() => {
        eventBus = new EventBus();
        sessionManager = new SessionManager(eventBus);
        collector = new GitStateCollector(eventBus, sessionManager);
        emittedEvents = [];

        eventBus.onDidReceiveEvent(e => {
            if (e.type === 'git') {
                emittedEvents.push(e as GitEvent);
            }
        });
    });

    teardown(() => {
        collector.dispose();
        sessionManager.dispose();
        eventBus.dispose();
    });

    test('computeSnapshot accurately counts dirty state', () => {
        const computeSnapshot = (collector as any).computeSnapshot.bind(collector);

        const cleanState = {
            HEAD: { name: 'main', commit: 'abc1234' },
            workingTreeChanges: [],
            indexChanges: [],
            mergeChanges: [],
            untrackedChanges: []
        };
        const snap1 = computeSnapshot(cleanState);
        assert.strictEqual(snap1.branch, 'main');
        assert.strictEqual(snap1.head, 'abc1234');
        assert.strictEqual(snap1.isDirty, false);
        assert.strictEqual(snap1.changedFileCount, 0);

        const dirtyState = {
            HEAD: { name: 'main', commit: 'abc1234' },
            workingTreeChanges: [{ uri: { fsPath: '/src/a.ts' } }],
            indexChanges: [{ uri: { fsPath: '/src/b.ts' } }, { uri: { fsPath: '/src/c.ts' } }],
            mergeChanges: [],
            untrackedChanges: [{ uri: { fsPath: '/src/a.ts' } }] // duplicate a.ts
        };
        const snap2 = computeSnapshot(dirtyState);
        assert.strictEqual(snap2.isDirty, true);
        assert.strictEqual(snap2.changedFileCount, 3); // 3 unique files
    });

    test('handleStateChange emits only on transition', () => {
        const handleStateChange = (collector as any).handleStateChange.bind(collector);
        const repoSnapshots = (collector as any).repoSnapshots as Map<any, any>;

        const mockRepo = {
            state: {
                HEAD: { name: 'main', commit: 'abc1234' },
                workingTreeChanges: [] as any[],
                indexChanges: [] as any[],
                mergeChanges: [] as any[],
                untrackedChanges: [] as any[]
            }
        };

        // Pretend we registered it and got baseline
        repoSnapshots.set(mockRepo, {
            branch: 'main',
            head: 'abc1234',
            isDirty: false,
            changedFileCount: 0
        });

        // 1. Same state -> no event
        handleStateChange(mockRepo);
        assert.strictEqual(emittedEvents.length, 0);

        // 2. Change branch -> emits event
        mockRepo.state.HEAD.name = 'feature/auth';
        handleStateChange(mockRepo);
        assert.strictEqual(emittedEvents.length, 1);
        assert.strictEqual(emittedEvents[0].metadata.current.branch, 'feature/auth');

        // 3. Make dirty -> emits event
        mockRepo.state.workingTreeChanges.push({ uri: { fsPath: '/src/new.ts' } });
        handleStateChange(mockRepo);
        assert.strictEqual(emittedEvents.length, 2);
        assert.strictEqual(emittedEvents[1].metadata.current.isDirty, true);
        assert.strictEqual(emittedEvents[1].metadata.current.changedFileCount, 1);

        // 4. Same dirty state -> no event
        handleStateChange(mockRepo);
        assert.strictEqual(emittedEvents.length, 2);
    });
});
