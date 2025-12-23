import { Layout } from '@/components/layout/Layout';
import { useUsers, usePromoteToAdmin, useDemoteToUser, useCurrentUserRole } from '@/hooks/useUsers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldOff, Users as UsersIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const Users = () => {
  const { data: users, isLoading } = useUsers();
  const { data: currentUserRole } = useCurrentUserRole();
  const promoteToAdmin = usePromoteToAdmin();
  const demoteToUser = useDemoteToUser();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const isAdmin = currentUserRole === 'admin';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e permissões do sistema
            </p>
          </div>
        </div>

        {!isAdmin && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            Você não tem permissão para gerenciar usuários. Apenas administradores podem acessar esta funcionalidade.
          </div>
        )}

        {isAdmin && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID do Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">
                        {user.id.substring(0, 8)}...
                        {user.id === currentUserId && (
                          <Badge variant="outline" className="ml-2">Você</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.id !== currentUserId && (
                          user.role === 'admin' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => demoteToUser.mutate(user.id)}
                              disabled={demoteToUser.isPending}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remover Admin
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => promoteToAdmin.mutate(user.id)}
                              disabled={promoteToAdmin.isPending}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Promover a Admin
                            </Button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Nota sobre permissões:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Administradores podem ver e gerenciar clientes, despesas e produtos</li>
            <li>Usuários comuns não têm acesso aos dados do sistema</li>
            <li>Você não pode remover sua própria função de administrador</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Users;
