"use client";

import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Mic, AlertCircle } from 'lucide-react';

interface ActiveCall {
  id: string;
  startTime: Date;
  duration: number;
  metrics: {
    latency: number;
    packetLoss: number;
    audioQuality: number;
  };
}

export function CallMonitor() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);

  useEffect(() => {
    const fetchActiveCalls = async () => {
      const response = await fetch('/api/calls/active');
      const data = await response.json();
      setActiveCalls(data);
    };

    fetchActiveCalls();
    const interval = setInterval(fetchActiveCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">アクティブな通話</h2>
        <Badge variant="secondary">
          {activeCalls.length} 件の通話
        </Badge>
      </div>

      <ScrollArea className="h-[600px] rounded-md border p-4">
        <div className="space-y-4">
          {activeCalls.map((call) => (
            <Card key={call.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">通話 ID: {call.id}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    開始時間: {new Date(call.startTime).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    経過時間: {Math.floor(call.duration / 60)}分 {call.duration % 60}秒
                  </div>
                </div>

                <div className="flex gap-4">
                  <MetricBadge
                    value={call.metrics.latency}
                    threshold={300}
                    label="遅延"
                    unit="ms"
                  />
                  <MetricBadge
                    value={call.metrics.packetLoss}
                    threshold={5}
                    label="パケットロス"
                    unit="%"
                  />
                  <MetricBadge
                    value={call.metrics.audioQuality}
                    threshold={70}
                    label="音質"
                    unit=""
                    inverse
                  />
                </div>
              </div>
            </Card>
          ))}

          {activeCalls.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Phone className="h-8 w-8 mb-2" />
              <p>アクティブな通話はありません</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MetricBadge({ 
  value, 
  threshold, 
  label, 
  unit,
  inverse = false 
}: { 
  value: number;
  threshold: number;
  label: string;
  unit: string;
  inverse?: boolean;
}) {
  const isWarning = inverse 
    ? value < threshold 
    : value > threshold;

  return (
    <div className="text-center">
      <div className="text-sm font-medium mb-1">{label}</div>
      <Badge variant={isWarning ? "destructive" : "secondary"}>
        {value}{unit}
      </Badge>
    </div>
  );
}