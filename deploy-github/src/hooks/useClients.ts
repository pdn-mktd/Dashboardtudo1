import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, products(*), client_addons(*, products(*))')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Client[];
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'products' | 'client_addons'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recent-clients'] });
      toast({ title: 'Cliente cadastrado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao cadastrar cliente', variant: 'destructive' });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...client }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(client)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recent-clients'] });
      toast({ title: 'Cliente atualizado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recent-clients'] });
      toast({ title: 'Cliente excluído com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir cliente', variant: 'destructive' });
    },
  });
};