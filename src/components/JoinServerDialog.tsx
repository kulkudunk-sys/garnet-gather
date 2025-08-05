import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import ServerSearch from './ServerSearch';

interface JoinServerDialogProps {
  onServerJoined?: () => void;
}

export default function JoinServerDialog({ onServerJoined }: JoinServerDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const { toast } = useToast();

  const handleServerJoined = () => {
    onServerJoined?.();
    setOpen(false);
  };

  const handleJoinByInvite = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите код приглашения",
        variant: "destructive",
      });
      return;
    }

    try {
      setJoining(true);
      
      // Извлекаем код из ссылки если это полная ссылка
      let code = inviteCode.trim();
      if (code.includes('/')) {
        code = code.split('/').pop() || '';
      }
      
      await api.joinServerByInvite(code);
      
      toast({
        title: "Успешно!",
        description: "Вы присоединились к серверу",
      });
      
      setInviteCode('');
      handleServerJoined();
    } catch (error) {
      console.error('Error joining by invite:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось присоединиться к серверу",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="w-12 h-12 rounded-2xl bg-discord-channel-bg hover:bg-discord-server-hover hover:rounded-xl transition-all duration-200 text-discord-channel-text hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-6 w-6" />
      </Button>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Присоединиться к серверу</DialogTitle>
          <DialogDescription>
            Найдите сервер или присоединитесь по ссылке приглашения
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Поиск
            </TabsTrigger>
            <TabsTrigger value="invite">
              <Link className="h-4 w-4 mr-2" />
              По ссылке
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <ServerSearch onServerJoined={handleServerJoined} />
          </TabsContent>
          
          <TabsContent value="invite" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Ссылка приглашения или код</Label>
                <Input
                  id="invite-code"
                  placeholder="https://discord.gg/ABC123 или ABC123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !joining && handleJoinByInvite()}
                />
              </div>
              
              <Button 
                onClick={handleJoinByInvite} 
                disabled={joining || !inviteCode.trim()}
                className="w-full"
              >
                {joining ? 'Присоединение...' : 'Присоединиться к серверу'}
              </Button>
              
              <div className="text-xs text-muted-foreground">
                <p>Примеры ссылок приглашения:</p>
                <p>• https://discord.gg/ABC123</p>
                <p>• discord.gg/ABC123</p>
                <p>• ABC123</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}