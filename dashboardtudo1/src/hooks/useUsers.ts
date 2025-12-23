import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'user';
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Fetch all users from auth.users via a custom RPC or by querying user_roles
      // Since we can't query auth.users directly, we'll get users who have roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');
      
      if (rolesError) throw rolesError;

      // Get user emails from auth - we need to use a workaround
      // We'll create an edge function or use the admin API
      // For now, we'll show user_id and role
      const users: UserWithRole[] = roles.map(r => ({
        id: r.user_id,
        email: r.user_id, // Will be replaced with actual email
        created_at: r.created_at,
        role: r.role as 'admin' | 'user',
      }));

      return users;
    },
  });
};

export const usePromoteToAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Check if user already has admin role
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRole) {
        throw new Error('Usuário já é administrador');
      }

      // Update role to admin
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Usuário promovido a administrador');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao promover usuário');
    },
  });
};

export const useDemoteToUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'user' })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Usuário rebaixado para usuário comum');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao rebaixar usuário');
    },
  });
};

export const useCurrentUserRole = () => {
  return useQuery({
    queryKey: ['current-user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role || 'user';
    },
  });
};
