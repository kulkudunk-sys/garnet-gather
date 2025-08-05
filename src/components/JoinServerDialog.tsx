import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import ServerSearch from './ServerSearch';

interface JoinServerDialogProps {
  onServerJoined?: () => void;
}

export default function JoinServerDialog({ onServerJoined }: JoinServerDialogProps) {
  const [open, setOpen] = useState(false);

  const handleServerJoined = () => {
    onServerJoined?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-12 h-12 rounded-2xl bg-discord-channel-bg hover:bg-discord-server-hover hover:rounded-xl transition-all duration-200 text-discord-channel-text hover:text-foreground"
        >
          <Search className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Найти сервер</DialogTitle>
          <DialogDescription>
            Найдите и присоединитесь к существующим серверам
          </DialogDescription>
        </DialogHeader>
        <ServerSearch onServerJoined={handleServerJoined} />
      </DialogContent>
    </Dialog>
  );
}