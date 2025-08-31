'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, Cloud, HardDrive, Merge } from 'lucide-react';
import { type Conflict, type ConflictResolution } from '@/lib/offline/conflict-resolver';
import { formatDistanceToNow } from 'date-fns';

interface ConflictModalProps {
  conflicts: Conflict[];
  open: boolean;
  onClose: () => void;
  onResolve: (resolutions: ConflictResolution[]) => void;
  autoResolveStrategy?: 'latest-wins' | 'remote-wins' | 'local-wins';
}

export function ConflictModal({
  conflicts,
  open,
  onClose,
  onResolve,
  autoResolveStrategy = 'latest-wins'
}: ConflictModalProps) {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [selectedStrategy, setSelectedStrategy] = useState<'manual' | 'auto'>('manual');

  const handleResolutionChange = (conflictId: string, resolution: 'keep-local' | 'keep-remote' | 'merge') => {
    setResolutions(prev => {
      const newMap = new Map(prev);
      newMap.set(conflictId, {
        conflictId,
        resolution,
        resolvedBy: 'user',
        resolvedAt: Date.now()
      });
      return newMap;
    });
  };

  const handleResolveAll = () => {
    if (selectedStrategy === 'auto') {
      const autoResolutions: ConflictResolution[] = conflicts.map(conflict => {
        let resolution: 'keep-local' | 'keep-remote' = 'keep-local';
        
        switch (autoResolveStrategy) {
          case 'latest-wins':
            resolution = conflict.localTimestamp > conflict.remoteTimestamp ? 'keep-local' : 'keep-remote';
            break;
          case 'remote-wins':
            resolution = 'keep-remote';
            break;
          case 'local-wins':
            resolution = 'keep-local';
            break;
        }

        return {
          conflictId: conflict.id,
          resolution,
          resolvedBy: 'auto',
          resolvedAt: Date.now()
        };
      });
      
      onResolve(autoResolutions);
    } else {
      const manualResolutions = Array.from(resolutions.values());
      if (manualResolutions.length === conflicts.length) {
        onResolve(manualResolutions);
      }
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Empty';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getFieldLabel = (field: string): string => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Sync Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} found during synchronization.
            Choose how to resolve each conflict.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedStrategy} onValueChange={(v) => setSelectedStrategy(v as 'manual' | 'auto')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Resolution</TabsTrigger>
            <TabsTrigger value="auto">Auto Resolution</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {conflicts.map((conflict, index) => (
                  <div key={conflict.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {index + 1}. {getFieldLabel(conflict.field)}
                      </h4>
                      <Badge variant="outline">
                        {conflict.type === 'item' ? 'Item' : 'Category'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <HardDrive className="h-4 w-4" />
                          <span>Local Version</span>
                          <span className="text-xs">
                            ({formatDistanceToNow(conflict.localTimestamp, { addSuffix: true })})
                          </span>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                          <pre className="text-sm whitespace-pre-wrap break-all">
                            {formatValue(conflict.localValue)}
                          </pre>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Cloud className="h-4 w-4" />
                          <span>Remote Version</span>
                          <span className="text-xs">
                            ({formatDistanceToNow(conflict.remoteTimestamp, { addSuffix: true })})
                          </span>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
                          <pre className="text-sm whitespace-pre-wrap break-all">
                            {formatValue(conflict.remoteValue)}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <RadioGroup
                      value={resolutions.get(conflict.id)?.resolution || ''}
                      onValueChange={(value) => handleResolutionChange(conflict.id, value as any)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="keep-local" id={`${conflict.id}-local`} />
                        <Label htmlFor={`${conflict.id}-local`} className="cursor-pointer">
                          Keep local version
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="keep-remote" id={`${conflict.id}-remote`} />
                        <Label htmlFor={`${conflict.id}-remote`} className="cursor-pointer">
                          Keep remote version
                        </Label>
                      </div>
                      {typeof conflict.localValue === 'number' && typeof conflict.remoteValue === 'number' && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="merge" id={`${conflict.id}-merge`} />
                          <Label htmlFor={`${conflict.id}-merge`} className="cursor-pointer">
                            Merge (Average: {Math.round((conflict.localValue + conflict.remoteValue) / 2)})
                          </Label>
                        </div>
                      )}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="auto" className="mt-4 space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Auto-resolution will apply the selected strategy to all conflicts at once.
                You can review the changes after synchronization.
              </AlertDescription>
            </Alert>

            <RadioGroup value={autoResolveStrategy} disabled>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="latest-wins" id="latest-wins" />
                  <Label htmlFor="latest-wins">
                    <div>
                      <p className="font-medium">Latest Wins</p>
                      <p className="text-sm text-muted-foreground">
                        Keep the most recently modified version
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="remote-wins" id="remote-wins" />
                  <Label htmlFor="remote-wins">
                    <div>
                      <p className="font-medium">Remote Wins</p>
                      <p className="text-sm text-muted-foreground">
                        Always keep the server version
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="local-wins" id="local-wins" />
                  <Label htmlFor="local-wins">
                    <div>
                      <p className="font-medium">Local Wins</p>
                      <p className="text-sm text-muted-foreground">
                        Always keep your local version
                      </p>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Strategy:</strong> {autoResolveStrategy.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This will resolve {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} automatically.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleResolveAll}
            disabled={selectedStrategy === 'manual' && resolutions.size !== conflicts.length}
          >
            <Merge className="h-4 w-4 mr-2" />
            Resolve Conflicts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}