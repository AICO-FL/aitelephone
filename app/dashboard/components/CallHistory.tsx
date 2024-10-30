"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar, Download } from 'lucide-react';

interface CallRecord {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: string;
  conversations: Array<{
    timestamp: Date;
    userInput: string;
    aiResponse: string;
  }>;
}

export function CallHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">通話履歴</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="通話を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            期間を選択
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>通話ID</TableHead>
              <TableHead>開始時間</TableHead>
              <TableHead>終了時間</TableHead>
              <TableHead>通話時間</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>詳細</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* 通話履歴データをマッピング */}
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">CALL-{i + 1}</TableCell>
                <TableCell>{new Date().toLocaleString()}</TableCell>
                <TableCell>{new Date().toLocaleString()}</TableCell>
                <TableCell>5分30秒</TableCell>
                <TableCell>
                  <Badge variant="secondary">完了</Badge>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        詳細を表示
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>通話詳細</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[500px] mt-4">
                        <div className="space-y-4">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="space-y-2">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{new Date().toLocaleTimeString()}</span>
                              </div>
                              <Card className="p-4">
                                <div className="space-y-4">
                                  <div>
                                    <div className="font-medium mb-1">ユーザー</div>
                                    <div className="text-sm">
                                      サービスについて質問があります。
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium mb-1">AI応答</div>
                                    <div className="text-sm">
                                      承知いたしました。どのようなご質問でしょうか？
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}