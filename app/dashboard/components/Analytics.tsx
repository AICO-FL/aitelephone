"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const dummyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  calls: Math.floor(Math.random() * 20),
  avgDuration: Math.floor(Math.random() * 300),
  successRate: 85 + Math.random() * 15,
}));

export function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">分析</h2>
        <Select defaultValue="today">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="期間を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">過去7日間</SelectItem>
            <SelectItem value="month">過去30日間</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          title="総通話数"
          value="1,234"
          change="+12.3%"
          trend="up"
        />
        <MetricCard
          title="平均通話時間"
          value="4分23秒"
          change="-5.2%"
          trend="down"
        />
        <MetricCard
          title="成功率"
          value="94.5%"
          change="+2.1%"
          trend="up"
        />
      </div>

      <Card className="p-6">
        <Tabs defaultValue="calls">
          <TabsList>
            <TabsTrigger value="calls">通話数推移</TabsTrigger>
            <TabsTrigger value="duration">通話時間推移</TabsTrigger>
            <TabsTrigger value="success">成功率推移</TabsTrigger>
          </TabsList>

          <div className="h-[400px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dummyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Tabs>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">頻出キーワード</h3>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>キーワード {i + 1}</span>
                <span className="text-muted-foreground">{100 - i * 15}回</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">エラー分析</h3>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>エラータイプ {i + 1}</span>
                <span className="text-muted-foreground">{5 - i}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  change, 
  trend 
}: { 
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{value}</div>
          <div className={`text-sm ${
            trend === 'up' ? 'text-green-500' : 'text-red-500'
          }`}>
            {change}
          </div>
        </div>
      </div>
    </Card>
  );
}