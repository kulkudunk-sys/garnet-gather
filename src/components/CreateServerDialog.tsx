import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServerCreated: (server: any) => void;
}

type CreateServerForm = {
  name: string;
  description?: string;
};

export const CreateServerDialog = ({ open, onOpenChange, onServerCreated }: CreateServerDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateServerForm>();

  const onSubmit = async (data: CreateServerForm) => {
    try {
      setLoading(true);
      
      const newServer = await api.createServer({
        name: data.name,
        description: data.description || null
      });
      
      onServerCreated(newServer);
      onOpenChange(false);
      reset();
      
      toast({
        title: "Сервер создан",
        description: `Сервер "${data.name}" успешно создан!`,
      });
    } catch (error) {
      console.error("Ошибка создания сервера:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать сервер. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать сервер</DialogTitle>
          <DialogDescription>
            Создайте новый сервер для общения с друзьями
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название сервера *</Label>
            <Input
              id="name"
              placeholder="Мой крутой сервер"
              {...register('name', { 
                required: 'Название сервера обязательно',
                minLength: { value: 2, message: 'Название должно содержать минимум 2 символа' },
                maxLength: { value: 100, message: 'Название не должно превышать 100 символов' }
              })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание (необязательно)</Label>
            <Textarea
              id="description"
              placeholder="Краткое описание вашего сервера"
              rows={3}
              {...register('description', {
                maxLength: { value: 500, message: 'Описание не должно превышать 500 символов' }
              })}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};