"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Volume2 } from 'lucide-react';
import { Header } from '../components/Header';

interface Greeting {
  id: string;
  text: string;
  description: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [greetings, setGreetings] = useState<Greeting[]>([
    {
      id: '1',
      text: 'お電話ありがとうございます。AIアシスタントにおつなぎします。',
      description: '標準の挨拶',
      isActive: true,
    },
    {
      id: '2',
      text: 'お待たせいたしました。ご用件をお聞かせください。',
      description: '転送後の挨拶',
      isActive: true,
    },
  ]);

  const [editingGreeting, setEditingGreeting] = useState<Greeting | null>(null);

  const handleSaveGreeting = (greeting: Greeting) => {
    if (editingGreeting) {
      setGreetings(greetings.map(g => 
        g.id === greeting.id ? greeting : g
      ));
    } else {
      setGreetings([...greetings, {
        ...greeting,
        id: Date.now().toString(),
      }]);
    }
    setEditingGreeting(null);
  };

  const handleDeleteGreeting = (id: string) => {
    setGreetings(greetings.filter(g => g.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setGreetings(greetings.map(g =>
      g.id === id ? { ...g, isActive: !g.isActive } : g
    ));
  };

  const playGreeting = async (text: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    } catch (error) {
      console.error('Error playing greeting:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">プリセット挨拶の設定</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>プリセット挨拶の追加</DialogTitle>
              </DialogHeader>
              <GreetingForm
                onSave={handleSaveGreeting}
                initialData={editingGreeting}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {greetings.map((greeting) => (
            <Card key={greeting.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={greeting.isActive}
                      onCheckedChange={() => handleToggleActive(greeting.id)}
                    />
                    <span className="font-medium">{greeting.description}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{greeting.text}</p>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => playGreeting(greeting.text)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingGreeting(greeting)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>プリセット挨拶の編集</DialogTitle>
                      </DialogHeader>
                      <GreetingForm
                        onSave={handleSaveGreeting}
                        initialData={greeting}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteGreeting(greeting.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

function GreetingForm({ 
  onSave,
  initialData = null,
}: { 
  onSave: (greeting: Greeting) => void;
  initialData?: Greeting | null;
}) {
  const [formData, setFormData] = useState<Partial<Greeting>>(
    initialData || {
      text: '',
      description: '',
      isActive: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Greeting);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">説明</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="例: 標準の挨拶"
          required
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">挨拶文</label>
        <Textarea
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          placeholder="例: お電話ありがとうございます。"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <label className="text-sm font-medium">有効にする</label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">
          {initialData ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
}