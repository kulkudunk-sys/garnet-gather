import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Copy, Link, Trash2, Users, Clock, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Invite {
  id: string;
  code: string;
  created_at: string;
  expires_at?: string;
  max_uses?: number;
  used_count: number;
  is_active: boolean;
  profiles: {
    username: string;
    display_name?: string;
  };
}

interface ServerInviteManagerProps {
  serverId: string;
  serverName: string;
}

export default function ServerInviteManager({ serverId, serverName }: ServerInviteManagerProps) {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<string>('7');
  const { toast } = useToast();

  const loadInvites = async () => {
    try {
      setLoading(true);
      const invitesData = await api.getServerInvites(serverId);
      setInvites(invitesData);
    } catch (error) {
      console.error('Error loading invites:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить приглашения",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadInvites();
    }
  }, [open]);

  const handleCreateInvite = async () => {
    try {
      setCreating(true);
      
      let expiresAt = null;
      if (expiresIn !== 'never') {
        const days = parseInt(expiresIn);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const options: any = {};
      if (maxUses) {
        options.maxUses = parseInt(maxUses);
      }
      if (expiresAt) {
        options.expiresAt = expiresAt;
      }

      await api.createServerInvite(serverId, options);
      
      toast({
        title: "Успешно!",
        description: "Приглашение создано",
      });
      
      setMaxUses('');
      setExpiresIn('7');
      loadInvites();
    } catch (error) {
      console.error('Error creating invite:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать приглашение",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyInvite = (code: string) => {
    const inviteUrl = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Скопировано!",
      description: "Ссылка приглашения скопирована в буфер обмена",
    });
  };

  const handleDeactivateInvite = async (inviteId: string) => {
    try {
      await api.deactivateInvite(inviteId);
      toast({
        title: "Успешно!",
        description: "Приглашение отключено",
      });
      loadInvites();
    } catch (error) {
      console.error('Error deactivating invite:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отключить приглашение",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxUsesReached = (invite: Invite) => {
    if (!invite.max_uses) return false;
    return invite.used_count >= invite.max_uses;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="h-4 w-4 mr-2" />
          Приглашения
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Приглашения на сервер "{serverName}"</DialogTitle>
          <DialogDescription>
            Создавайте и управляйте приглашениями для вашего сервера
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Форма создания приглашения */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Создать приглашение</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires">Срок действия</Label>
                  <Select value={expiresIn} onValueChange={setExpiresIn}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 день</SelectItem>
                      <SelectItem value="7">7 дней</SelectItem>
                      <SelectItem value="30">30 дней</SelectItem>
                      <SelectItem value="never">Никогда</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-uses">Макс. использований</Label>
                  <Input
                    id="max-uses"
                    type="number"
                    placeholder="Без ограничений"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleCreateInvite} 
                disabled={creating}
                className="w-full"
              >
                {creating ? 'Создание...' : 'Создать приглашение'}
              </Button>
            </CardContent>
          </Card>

          {/* Список приглашений */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Активные приглашения</h3>
            
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Загрузка приглашений...
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Приглашения не найдены</p>
                <p className="text-xs">Создайте первое приглашение выше</p>
              </div>
            ) : (
              invites.map((invite) => {
                const expired = isExpired(invite.expires_at);
                const maxReached = isMaxUsesReached(invite);
                const inactive = !invite.is_active || expired || maxReached;

                return (
                  <Card key={invite.id} className={inactive ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {invite.code}
                            </code>
                            
                            {inactive ? (
                              <Badge variant="secondary">
                                {!invite.is_active ? 'Отключено' : expired ? 'Истекло' : 'Исчерпано'}
                              </Badge>
                            ) : (
                              <Badge variant="default">Активно</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>
                                {invite.used_count}
                                {invite.max_uses ? `/${invite.max_uses}` : ''}
                              </span>
                            </div>
                            
                            {invite.expires_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>до {formatDate(invite.expires_at)}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span>{invite.profiles.display_name || invite.profiles.username}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyInvite(invite.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          
                          {invite.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivateInvite(invite.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}