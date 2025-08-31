import { Item, Category } from '@/types/inventory';

interface UserAction {
  type: 'view' | 'edit' | 'add' | 'delete';
  resource: 'item' | 'category' | 'report';
  resourceId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface UserPattern {
  mostAccessedItems: string[];
  peakUsageTimes: { hour: number; probability: number }[];
  categoryPreferences: { categoryId: string; frequency: number }[];
  actionSequences: ActionSequence[];
  predictedNextActions: PredictedAction[];
}

interface ActionSequence {
  actions: UserAction[];
  frequency: number;
  lastOccurred: number;
}

export interface PredictedAction {
  action: UserAction;
  probability: number;
  timeWindow: { start: number; end: number };
}

export class UserPatternAnalyzer {
  private actionHistory: UserAction[] = [];
  private patterns: UserPattern | null = null;
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly PATTERN_THRESHOLD = 0.3;

  constructor() {
    this.loadHistoryFromStorage();
    this.analyzePatterns();
  }

  trackAction(action: UserAction): void {
    this.actionHistory.push({
      ...action,
      timestamp: Date.now()
    });

    if (this.actionHistory.length > this.MAX_HISTORY_SIZE) {
      this.actionHistory = this.actionHistory.slice(-this.MAX_HISTORY_SIZE);
    }

    this.saveHistoryToStorage();
    this.analyzePatterns();
  }

  private analyzePatterns(): void {
    if (this.actionHistory.length < 10) return;

    const patterns: UserPattern = {
      mostAccessedItems: this.findMostAccessedItems(),
      peakUsageTimes: this.analyzePeakTimes(),
      categoryPreferences: this.analyzeCategoryPreferences(),
      actionSequences: this.findActionSequences(),
      predictedNextActions: this.predictNextActions()
    };

    this.patterns = patterns;
    this.notifyPrefetchManager(patterns);
  }

  private findMostAccessedItems(): string[] {
    const itemAccess = new Map<string, number>();
    
    this.actionHistory
      .filter(a => a.resource === 'item' && a.resourceId)
      .forEach(action => {
        const count = itemAccess.get(action.resourceId!) || 0;
        itemAccess.set(action.resourceId!, count + 1);
      });

    return Array.from(itemAccess.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);
  }

  private analyzePeakTimes(): { hour: number; probability: number }[] {
    const hourlyUsage = new Array(24).fill(0);
    
    this.actionHistory.forEach(action => {
      const hour = new Date(action.timestamp).getHours();
      hourlyUsage[hour]++;
    });

    const total = this.actionHistory.length;
    return hourlyUsage.map((count, hour) => ({
      hour,
      probability: count / total
    })).filter(t => t.probability > 0.05);
  }

  private analyzeCategoryPreferences(): { categoryId: string; frequency: number }[] {
    const categoryAccess = new Map<string, number>();
    
    this.actionHistory
      .filter(a => a.metadata?.categoryId)
      .forEach(action => {
        const categoryId = action.metadata!.categoryId;
        const count = categoryAccess.get(categoryId) || 0;
        categoryAccess.set(categoryId, count + 1);
      });

    return Array.from(categoryAccess.entries())
      .map(([categoryId, count]) => ({
        categoryId,
        frequency: count / this.actionHistory.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private findActionSequences(): ActionSequence[] {
    const sequences = new Map<string, ActionSequence>();
    const windowSize = 3;

    for (let i = 0; i <= this.actionHistory.length - windowSize; i++) {
      const sequence = this.actionHistory.slice(i, i + windowSize);
      const key = this.sequenceToKey(sequence);
      
      if (sequences.has(key)) {
        const existing = sequences.get(key)!;
        existing.frequency++;
        existing.lastOccurred = sequence[sequence.length - 1].timestamp;
      } else {
        sequences.set(key, {
          actions: sequence,
          frequency: 1,
          lastOccurred: sequence[sequence.length - 1].timestamp
        });
      }
    }

    return Array.from(sequences.values())
      .filter(s => s.frequency > 2)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private predictNextActions(): PredictedAction[] {
    const predictions: PredictedAction[] = [];
    const currentHour = new Date().getHours();
    const recentActions = this.actionHistory.slice(-5);

    const peakTime = this.analyzePeakTimes()
      .find(t => Math.abs(t.hour - currentHour) <= 1);
    
    if (peakTime && peakTime.probability > this.PATTERN_THRESHOLD) {
      this.findMostAccessedItems().slice(0, 5).forEach(itemId => {
        predictions.push({
          action: {
            type: 'view',
            resource: 'item',
            resourceId: itemId,
            timestamp: Date.now()
          },
          probability: peakTime.probability,
          timeWindow: {
            start: Date.now(),
            end: Date.now() + 3600000
          }
        });
      });
    }

    const matchingSequences = this.findMatchingSequences(recentActions);
    matchingSequences.forEach(sequence => {
      if (sequence.frequency > 5) {
        const nextAction = sequence.actions[sequence.actions.length - 1];
        predictions.push({
          action: nextAction,
          probability: sequence.frequency / this.actionHistory.length,
          timeWindow: {
            start: Date.now(),
            end: Date.now() + 300000
          }
        });
      }
    });

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  private sequenceToKey(actions: UserAction[]): string {
    return actions.map(a => `${a.type}:${a.resource}`).join('->');
  }

  private findMatchingSequences(recentActions: UserAction[]): ActionSequence[] {
    if (recentActions.length < 2) return [];
    
    const recentKey = this.sequenceToKey(recentActions.slice(-2));
    return this.findActionSequences()
      .filter(seq => this.sequenceToKey(seq.actions.slice(0, 2)) === recentKey);
  }

  private notifyPrefetchManager(patterns: UserPattern): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('patterns-updated', {
        detail: patterns
      }));
    }
  }

  private loadHistoryFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem('user-action-history');
    if (stored) {
      try {
        this.actionHistory = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load action history:', e);
      }
    }
  }

  private saveHistoryToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('user-action-history', JSON.stringify(this.actionHistory));
    } catch (e) {
      console.error('Failed to save action history:', e);
    }
  }

  getPatterns(): UserPattern | null {
    return this.patterns;
  }

  getPredictions(): PredictedAction[] {
    return this.patterns?.predictedNextActions || [];
  }

  clearHistory(): void {
    this.actionHistory = [];
    this.patterns = null;
    this.saveHistoryToStorage();
  }
}

export const patternAnalyzer = new UserPatternAnalyzer();