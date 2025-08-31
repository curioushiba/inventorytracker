import { Item, Category } from '@/types/inventory';
import { supabase } from '@/lib/supabase';

export interface Conflict {
  id: string;
  type: 'item' | 'category';
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  conflictDetectedAt: number;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'keep-local' | 'keep-remote' | 'merge' | 'custom';
  mergedValue?: any;
  resolvedBy: string;
  resolvedAt: number;
}

export interface ConflictContext {
  item?: Item;
  category?: Category;
  conflicts: Conflict[];
  relatedChanges: Change[];
}

interface Change {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  source: 'local' | 'remote';
}

export class ConflictResolver {
  private conflicts: Map<string, Conflict> = new Map();
  private resolutions: ConflictResolution[] = [];
  private conflictListeners: Set<(conflicts: Conflict[]) => void> = new Set();

  detectConflicts(
    local: Item | Category,
    remote: Item | Category,
    type: 'item' | 'category'
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const localTimestamp = (local as any).updated_at || Date.now();
    const remoteTimestamp = (remote as any).updated_at || Date.now();

    Object.keys(local).forEach(field => {
      if (field === 'id' || field === 'user_id') return;

      const localValue = (local as any)[field];
      const remoteValue = (remote as any)[field];

      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        const conflict: Conflict = {
          id: `conflict-${type}-${(local as any).id}-${field}-${Date.now()}`,
          type,
          field,
          localValue,
          remoteValue,
          localTimestamp,
          remoteTimestamp,
          conflictDetectedAt: Date.now()
        };

        conflicts.push(conflict);
        this.conflicts.set(conflict.id, conflict);
      }
    });

    if (conflicts.length > 0) {
      this.notifyListeners();
    }

    return conflicts;
  }

  async autoResolve(
    conflicts: Conflict[],
    strategy: 'latest-wins' | 'remote-wins' | 'local-wins' = 'latest-wins'
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      let resolution: 'keep-local' | 'keep-remote' = 'keep-local';

      switch (strategy) {
        case 'latest-wins':
          resolution = conflict.localTimestamp > conflict.remoteTimestamp 
            ? 'keep-local' 
            : 'keep-remote';
          break;
        case 'remote-wins':
          resolution = 'keep-remote';
          break;
        case 'local-wins':
          resolution = 'keep-local';
          break;
      }

      const conflictResolution: ConflictResolution = {
        conflictId: conflict.id,
        resolution,
        resolvedBy: 'auto',
        resolvedAt: Date.now()
      };

      resolutions.push(conflictResolution);
      this.resolutions.push(conflictResolution);
      this.conflicts.delete(conflict.id);
    }

    this.notifyListeners();
    return resolutions;
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'keep-local' | 'keep-remote' | 'merge' | 'custom',
    mergedValue?: any
  ): Promise<ConflictResolution> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const conflictResolution: ConflictResolution = {
      conflictId,
      resolution,
      mergedValue: resolution === 'merge' || resolution === 'custom' ? mergedValue : undefined,
      resolvedBy: 'user',
      resolvedAt: Date.now()
    };

    this.resolutions.push(conflictResolution);
    this.conflicts.delete(conflictId);
    this.notifyListeners();

    return conflictResolution;
  }

  applyResolutions(
    data: Item | Category,
    resolutions: ConflictResolution[],
    conflicts: Conflict[]
  ): Item | Category {
    const resolved = { ...data };

    resolutions.forEach(resolution => {
      const conflict = conflicts.find(c => c.id === resolution.conflictId);
      if (!conflict) return;

      switch (resolution.resolution) {
        case 'keep-local':
          (resolved as any)[conflict.field] = conflict.localValue;
          break;
        case 'keep-remote':
          (resolved as any)[conflict.field] = conflict.remoteValue;
          break;
        case 'merge':
        case 'custom':
          if (resolution.mergedValue !== undefined) {
            (resolved as any)[conflict.field] = resolution.mergedValue;
          }
          break;
      }
    });

    return resolved;
  }

  suggestMerge(conflict: Conflict): any {
    // For numeric values, suggest average
    if (typeof conflict.localValue === 'number' && typeof conflict.remoteValue === 'number') {
      return Math.round((conflict.localValue + conflict.remoteValue) / 2);
    }

    // For strings, suggest concatenation if different
    if (typeof conflict.localValue === 'string' && typeof conflict.remoteValue === 'string') {
      if (conflict.field === 'description' || conflict.field === 'notes') {
        return `${conflict.localValue}\n---\n${conflict.remoteValue}`;
      }
    }

    // For arrays, suggest union
    if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
      return [...new Set([...conflict.localValue, ...conflict.remoteValue])];
    }

    // Default to keeping the latest
    return conflict.localTimestamp > conflict.remoteTimestamp 
      ? conflict.localValue 
      : conflict.remoteValue;
  }

  async getConflictContext(conflict: Conflict): Promise<ConflictContext> {
    const context: ConflictContext = {
      conflicts: [conflict],
      relatedChanges: []
    };

    // Fetch full item/category data
    try {
      if (conflict.type === 'item') {
        const itemId = conflict.id.split('-')[2];
        const { data } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .single();
        
        if (data) {
          context.item = data;
        }
      } else {
        const categoryId = conflict.id.split('-')[2];
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single();
        
        if (data) {
          context.category = data;
        }
      }
    } catch (e) {
      console.error('Failed to fetch conflict context:', e);
    }

    // Get change history
    context.relatedChanges = [
      {
        field: conflict.field,
        oldValue: null,
        newValue: conflict.localValue,
        timestamp: conflict.localTimestamp,
        source: 'local'
      },
      {
        field: conflict.field,
        oldValue: null,
        newValue: conflict.remoteValue,
        timestamp: conflict.remoteTimestamp,
        source: 'remote'
      }
    ];

    return context;
  }

  subscribe(listener: (conflicts: Conflict[]) => void): () => void {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  private notifyListeners(): void {
    const conflicts = Array.from(this.conflicts.values());
    this.conflictListeners.forEach(listener => listener(conflicts));
  }

  getUnresolvedConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }

  getResolutionHistory(): ConflictResolution[] {
    return [...this.resolutions];
  }

  clearConflicts(): void {
    this.conflicts.clear();
    this.notifyListeners();
  }

  exportConflicts(): string {
    return JSON.stringify({
      conflicts: Array.from(this.conflicts.values()),
      resolutions: this.resolutions
    }, null, 2);
  }
}

export const conflictResolver = new ConflictResolver();