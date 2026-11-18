/** Cenové nabídky – API a React Query hooky (pouze online). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl, getAuthHeaders, handleResponse } from './httpClient';
import type { Nabidka, NabidkaStav } from '../types';

export const nabidkyKeys = {
  all: ['nabidky'] as const,
  detail: (id: number) => ['nabidky', 'detail', id] as const,
};

const json = (method: string, body?: unknown): RequestInit => ({
  method, headers: getAuthHeaders(), body: body === undefined ? undefined : JSON.stringify(body),
});

export const nabidkyService = {
  getAll: async (): Promise<Nabidka[]> => handleResponse(await fetch(buildApiUrl('/nabidky'), { headers: getAuthHeaders() })),
  getById: async (id: number): Promise<Nabidka> => handleResponse(await fetch(buildApiUrl(`/nabidky/${id}`), { headers: getAuthHeaders() })),
  create: async (data: Partial<Nabidka>): Promise<number> =>
    (await handleResponse<{ id: number }>(await fetch(buildApiUrl('/nabidky'), json('POST', data)))).id,
  update: async (id: number, data: Partial<Nabidka>): Promise<void> => {
    await handleResponse(await fetch(buildApiUrl(`/nabidky/${id}`), json('PUT', data)));
  },
  remove: async (id: number): Promise<void> => {
    await handleResponse(await fetch(buildApiUrl(`/nabidky/${id}`), json('DELETE')));
  },
  zmenStav: async (id: number, stav: NabidkaStav): Promise<void> => {
    await handleResponse(await fetch(buildApiUrl(`/nabidky/${id}/stav`), json('POST', { stav })));
  },
  /** Vytvoří z nabídky koncept faktury, vrátí id faktury. */
  vytvorFakturu: async (id: number): Promise<number> =>
    (await handleResponse<{ fakturaId: number }>(await fetch(buildApiUrl(`/nabidky/${id}/faktura`), json('POST')))).fakturaId,
};

export const useNabidky = () => useQuery({ queryKey: nabidkyKeys.all, queryFn: nabidkyService.getAll });

export const useNabidka = (id: number | undefined) => useQuery({
  queryKey: nabidkyKeys.detail(id!), queryFn: () => nabidkyService.getById(id!), enabled: !!id,
});

function useNabidkaMutace<A, R>(fn: (a: A) => Promise<R>, alsoFaktury = false) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nabidkyKeys.all });
      if (alsoFaktury) qc.invalidateQueries({ queryKey: ['faktury'] });
    },
  });
}

export const useCreateNabidka = () => useNabidkaMutace((d: Partial<Nabidka>) => nabidkyService.create(d));
export const useUpdateNabidka = () => useNabidkaMutace(({ id, data }: { id: number; data: Partial<Nabidka> }) => nabidkyService.update(id, data));
export const useDeleteNabidka = () => useNabidkaMutace((id: number) => nabidkyService.remove(id));
export const useZmenStavNabidky = () => useNabidkaMutace(({ id, stav }: { id: number; stav: NabidkaStav }) => nabidkyService.zmenStav(id, stav));
export const useNabidkaNaFakturu = () => useNabidkaMutace((id: number) => nabidkyService.vytvorFakturu(id), true);

export const NABIDKA_STAV_LABEL: Record<NabidkaStav, string> = {
  koncept: 'Koncept', odeslana: 'Odeslaná', prijata: 'Přijatá', odmitnuta: 'Odmítnutá',
};
export const NABIDKA_STAV_VARIANT: Record<NabidkaStav, 'neutral' | 'info' | 'success' | 'danger'> = {
  koncept: 'neutral', odeslana: 'info', prijata: 'success', odmitnuta: 'danger',
};
