import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClientPause } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export const useClientPauses = (clientId: string) => {
  return useQuery({
    queryKey: ['client-pauses', clientId],
    queryFn: async () => {
      // @ts-ignore - client_pauses table exists but types may not be generated
      const { data, error } = await supabase
        .from('client_pauses')
        .select('*')
        .eq('client_id', clientId)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as ClientPause[];
    },
    enabled: !!clientId,
  });
};

export const usePauseClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      clientId, 
      startDate, 
      endDate, 
      reason 
    }: { 
      clientId: string; 
      startDate: string; 
      endDate?: string; 
      reason?: string;
    }) => {
      // 1. Create pause record
      // @ts-ignore - client_pauses table exists but types may not be generated
      const { error: pauseError } = await supabase
        .from('client_pauses')
        .insert({
          client_id: clientId,
          start_date: startDate,
          end_date: endDate || null,
          reason: reason || null,
        });
      
      if (pauseError) throw pauseError;

      // 2. Update client status to 'paused'
      const { error: clientError } = await supabase
        .from('clients')
        .update({ status: 'paused' })
        .eq('id', clientId);
      
      if (clientError) throw clientError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-pauses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recent-clients'] });
      toast({ title: 'Assinatura pausada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao pausar assinatura', variant: 'destructive' });
    },
  });
};

export const useReactivateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      clientId, 
      reactivationDate,
      updateBillingCycle
    }: { 
      clientId: string; 
      reactivationDate: string;
      updateBillingCycle?: boolean;
    }) => {
      // 1. Close the active pause (set end_date)
      // @ts-ignore - client_pauses table exists but types may not be generated
      const { data: activePauses } = await supabase
        .from('client_pauses')
        .select('*')
        .eq('client_id', clientId)
        .is('end_date', null)
        .order('start_date', { ascending: false })
        .limit(1);
      
      if (activePauses && activePauses.length > 0) {
        // @ts-ignore
        const { error: updatePauseError } = await supabase
          .from('client_pauses')
          .update({ end_date: reactivationDate })
          .eq('id', activePauses[0].id);
        
        if (updatePauseError) throw updatePauseError;
      }

      // 2. Update client status back to 'active' (and optionally restart billing cycle)
      const updateData: { status: 'active'; start_date?: string } = { status: 'active' };
      if (updateBillingCycle) {
        updateData.start_date = reactivationDate;
      }

      const { error: clientError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);
      
      if (clientError) throw clientError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-pauses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recent-clients'] });
      toast({ title: 'Assinatura reativada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao reativar assinatura', variant: 'destructive' });
    },
  });
};
