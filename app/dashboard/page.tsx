"use client";

import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallMonitor } from './components/CallMonitor';
import { CallHistory } from './components/CallHistory';
import { Analytics } from './components/Analytics';
import { Header } from './components/Header';
import { Phone, History, BarChart2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-6">
        <Tabs defaultValue="monitor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>通話モニター</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>通話履歴</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              <span>分析</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-4">
            <CallMonitor />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <CallHistory />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Analytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}