import { useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Server {
  id: string;
  name: string;
  description?: string;
  member_count: number;
  icon_url?: string;
  is_member: boolean;
}

interface ServerSearchProps {
  onServerJoined?: () => void;
}

export default function ServerSearch({ onServerJoined }: ServerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const results = await api.searchServers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching servers:', error);
      toast({
        title: "Ошибка поиска",
        description: "Не удалось найти серверы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinServer = async (serverId: string) => {
    try {
      setJoining(serverId);
      await api.joinServer(serverId);
      
      // Update the server in results to show as joined
      setSearchResults(prev => 
        prev.map(server => 
          server.id === serverId 
            ? { ...server, is_member: true, member_count: server.member_count + 1 }
            : server
        )
      );
      
      toast({
        title: "Успешно!",
        description: "Вы присоединились к серверу",
      });
      
      onServerJoined?.();
    } catch (error) {
      console.error('Error joining server:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось присоединиться к серверу",
        variant: "destructive",
      });
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Поиск серверов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
          {loading ? 'Поиск...' : 'Найти'}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {searchResults.map((server) => (
            <Card key={server.id} className="transition-colors hover:bg-accent/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {server.icon_url ? (
                      <img 
                        src={server.icon_url} 
                        alt={server.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {server.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-sm">{server.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {server.member_count}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {server.is_member ? (
                    <Badge variant="default">Участник</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoinServer(server.id)}
                      disabled={joining === server.id}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {joining === server.id ? 'Присоединение...' : 'Присоединиться'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              {server.description && (
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    {server.description}
                  </CardDescription>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {searchQuery && !loading && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Серверы не найдены</p>
          <p className="text-xs mt-1">Попробуйте изменить поисковый запрос</p>
        </div>
      )}
    </div>
  );
}