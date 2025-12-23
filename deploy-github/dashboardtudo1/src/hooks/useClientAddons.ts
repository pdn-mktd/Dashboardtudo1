import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClientAddon } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export const useClientAddons = (clientId?: string) => {
  return useQuery({
    queryKey: ['client-addons', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_addons')
        .select('*, products(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientAddon[];
    },
    enabled: !!clientId,
  });
};

export const useAllClientAddons = () => {
  return useQuery({
    queryKey: ['all-client-addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_addons')
        .select('*, products(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientAddon[];
    },
  });
};

export const useCreateClientAddon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (addon: { 
      client_id: string; 
      product_id: string; 
      quantity: number; 
      start_date: string;
    }) => {
      const { data, error } = await supabase
        .from('client_addons')
        .insert(addon)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-addons'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-addons'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Adicional adicionado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar adicional', variant: 'destructive' });
    },
  });
};

export const useCancelClientAddon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, end_date }: { id: string; end_date: string }) => {
      const { data, error } = await supabase
        .from('client_addons')
        .update({ status: 'cancelled', end_date })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-addons'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-addons'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Adicional cancelado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao cancelar adicional', variant: 'destructive' });
    },
  });
};

export const useReactivateClientAddon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('client_addons')
        .update({ status: 'active', end_date: null })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-addons'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-addons'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Adicional reativado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao reativar adicional', variant: 'destructive' });
    },
  });
};

export const useDeleteClientAddon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_addons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-addons'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-addons'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Adicional excluído com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir adicional', variant: 'destructive' });
    },
  });
};