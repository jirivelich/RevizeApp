/**
 * Custom React Query hooks pro všechny datové entity.
 *
 * Výhody oproti manuálním useState+useEffect:
 * - automatické cachování & sdílení dat mezi stránkami
 * - automatické loading / error stavy
 * - invalidace cache po mutacích (create/update/delete)
 * - retry při selhání
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  revizeService,
  rozvadecService,
  okruhService,
  mistnostService,
  zarizeniService,
  zavadaService,
  firmaService,
  zakazkaService,
  pristrojService,
  revizePristrojService,
  nastaveniService,
  zavadaKatalogService,
  predvolenyTextService,
  zakazniciService,
  backupService,
} from '../services/database';
import { queryKeys } from './queryKeys';
import type {
  Revize, Rozvadec, Okruh, Mistnost, Zavada,
  MericiPristroj, Firma, Zakazka, Nastaveni,
  ZavadaKatalog, PredvolenyText, Zakaznik,
} from '../types';

/* ═══════════════════════════════════════════
   REVIZE
   ═══════════════════════════════════════════ */

export function useRevize() {
  return useQuery({
    queryKey: queryKeys.revize.all,
    queryFn: () => revizeService.getAll(),
  });
}

export function useRevizeDetail(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.revize.detail(id!),
    queryFn: () => revizeService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateRevize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Revize>) => revizeService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.revize.all });
    },
  });
}

export function useUpdateRevize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Revize> }) =>
      revizeService.update(id, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.revize.all });
      qc.invalidateQueries({ queryKey: queryKeys.revize.detail(variables.id) });
    },
  });
}

export function useDeleteRevize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => revizeService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.revize.all });
    },
  });
}

/* ═══════════════════════════════════════════
   ROZVÁDĚČE
   ═══════════════════════════════════════════ */

export function useRozvadeceByRevize(revizeId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.rozvadece.byRevize(revizeId!),
    queryFn: () => rozvadecService.getByRevize(revizeId!),
    enabled: !!revizeId,
  });
}

export function useCreateRozvadec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Rozvadec>) => rozvadecService.create(data),
    onSuccess: (_res, vars) => {
      if (vars.revizeId) {
        qc.invalidateQueries({ queryKey: queryKeys.rozvadece.byRevize(vars.revizeId) });
      }
    },
  });
}

export function useUpdateRozvadec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Rozvadec> }) =>
      rozvadecService.update(id, data),
    onSuccess: (_res, vars) => {
      if (vars.data.revizeId) {
        qc.invalidateQueries({ queryKey: queryKeys.rozvadece.byRevize(vars.data.revizeId) });
      }
    },
  });
}

export function useDeleteRozvadec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revizeId }: { id: number; revizeId: number }) =>
      rozvadecService.delete(id),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.rozvadece.byRevize(vars.revizeId) });
    },
  });
}

/* ═══════════════════════════════════════════
   OKRUHY
   ═══════════════════════════════════════════ */

export function useOkruhyByRozvadec(rozvadecId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.okruhy.byRozvadec(rozvadecId!),
    queryFn: () => okruhService.getByRozvadec(rozvadecId!),
    enabled: !!rozvadecId,
  });
}

export function useCreateOkruh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Okruh>) => okruhService.create(data),
    onSuccess: (_res, vars) => {
      if (vars.rozvadecId) {
        qc.invalidateQueries({ queryKey: queryKeys.okruhy.byRozvadec(vars.rozvadecId) });
      }
    },
  });
}

export function useUpdateOkruh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Okruh> }) =>
      okruhService.update(id, data),
    onSuccess: (_res, vars) => {
      if (vars.data.rozvadecId) {
        qc.invalidateQueries({ queryKey: queryKeys.okruhy.byRozvadec(vars.data.rozvadecId) });
      }
    },
  });
}

export function useDeleteOkruh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rozvadecId }: { id: number; rozvadecId: number }) =>
      okruhService.delete(id),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.okruhy.byRozvadec(vars.rozvadecId) });
    },
  });
}

/* ═══════════════════════════════════════════
   ZÁVADY
   ═══════════════════════════════════════════ */

export function useZavadyByRevize(revizeId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.zavady.byRevize(revizeId!),
    queryFn: () => zavadaService.getByRevize(revizeId!),
    enabled: !!revizeId,
  });
}

export function useCreateZavada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Zavada>) => zavadaService.create(data),
    onSuccess: (_res, vars) => {
      if (vars.revizeId) {
        qc.invalidateQueries({ queryKey: queryKeys.zavady.byRevize(vars.revizeId) });
      }
    },
  });
}

export function useUpdateZavada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Zavada> }) =>
      zavadaService.update(id, data),
    onSuccess: (_res, vars) => {
      if (vars.data.revizeId) {
        qc.invalidateQueries({ queryKey: queryKeys.zavady.byRevize(vars.data.revizeId) });
      }
    },
  });
}

export function useDeleteZavada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revizeId }: { id: number; revizeId: number }) =>
      zavadaService.delete(id),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.zavady.byRevize(vars.revizeId) });
    },
  });
}

/* ═══════════════════════════════════════════
   MÍSTNOSTI
   ═══════════════════════════════════════════ */

export function useMistnostiByRevize(revizeId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.mistnosti.byRevize(revizeId!),
    queryFn: () => mistnostService.getByRevize(revizeId!),
    enabled: !!revizeId,
  });
}

export function useCreateMistnost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Mistnost>) => mistnostService.create(data),
    onSuccess: (_res, vars) => {
      if (vars.revizeId) {
        qc.invalidateQueries({ queryKey: queryKeys.mistnosti.byRevize(vars.revizeId) });
      }
    },
  });
}

export function useUpdateMistnost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Mistnost> }) =>
      mistnostService.update(id, data),
    onSuccess: (_res, vars) => {
      if (vars.data.revizeId) {
        qc.invalidateQueries({ queryKey: queryKeys.mistnosti.byRevize(vars.data.revizeId) });
      }
    },
  });
}

export function useDeleteMistnost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revizeId }: { id: number; revizeId: number }) =>
      mistnostService.delete(id),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.mistnosti.byRevize(vars.revizeId) });
    },
  });
}

/* ═══════════════════════════════════════════
   ZAŘÍZENÍ
   ═══════════════════════════════════════════ */

export function useZarizeniByMistnost(mistnostId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.zarizeni.byMistnost(mistnostId!),
    queryFn: () => zarizeniService.getByMistnost(mistnostId!),
    enabled: !!mistnostId,
  });
}

export function useCreateZarizeni() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof zarizeniService.create>[0]) =>
      zarizeniService.create(data),
    onSuccess: (_res, vars) => {
      if (vars.mistnostId) {
        qc.invalidateQueries({ queryKey: queryKeys.zarizeni.byMistnost(vars.mistnostId) });
      }
    },
  });
}

export function useDeleteZarizeni() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mistnostId }: { id: number; mistnostId: number }) =>
      zarizeniService.delete(id),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.zarizeni.byMistnost(vars.mistnostId) });
    },
  });
}

/* ═══════════════════════════════════════════
   PŘÍSTROJE
   ═══════════════════════════════════════════ */

export function usePristroje() {
  return useQuery({
    queryKey: queryKeys.pristroje.all,
    queryFn: () => pristrojService.getAll(),
  });
}

export function usePristrojeByRevize(revizeId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.pristroje.byRevize(revizeId!),
    queryFn: () => revizePristrojService.getByRevize(revizeId!),
    enabled: !!revizeId,
  });
}

export function useCreatePristroj() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MericiPristroj>) => pristrojService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pristroje.all });
    },
  });
}

export function useUpdatePristroj() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MericiPristroj> }) =>
      pristrojService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pristroje.all });
    },
  });
}

export function useDeletePristroj() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pristrojService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pristroje.all });
    },
  });
}

export function useAddPristrojToRevize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ revizeId, pristrojId }: { revizeId: number; pristrojId: number }) =>
      revizePristrojService.addToRevize(revizeId, pristrojId),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.pristroje.byRevize(vars.revizeId) });
    },
  });
}

export function useRemovePristrojFromRevize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ revizeId, pristrojId }: { revizeId: number; pristrojId: number }) =>
      revizePristrojService.removeFromRevize(revizeId, pristrojId),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.pristroje.byRevize(vars.revizeId) });
    },
  });
}

/* ═══════════════════════════════════════════
   FIRMY
   ═══════════════════════════════════════════ */

export function useFirmy() {
  return useQuery({
    queryKey: queryKeys.firmy.all,
    queryFn: () => firmaService.getAll(),
    staleTime: 60 * 1000, // firmy se mění zřídka
  });
}

export function useCreateFirma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Firma>) => firmaService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.firmy.all });
    },
  });
}

export function useUpdateFirma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Firma> }) =>
      firmaService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.firmy.all });
    },
  });
}

export function useDeleteFirma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => firmaService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.firmy.all });
    },
  });
}

/* ═══════════════════════════════════════════
   ZÁKAZNÍCI
   ═══════════════════════════════════════════ */

export function useZakaznici() {
  return useQuery({
    queryKey: queryKeys.zakaznici.all,
    queryFn: () => zakazniciService.getAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateZakaznik() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Zakaznik>) => zakazniciService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zakaznici.all });
    },
  });
}

export function useUpdateZakaznik() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Zakaznik> }) =>
      zakazniciService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zakaznici.all });
    },
  });
}

export function useDeleteZakaznik() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => zakazniciService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zakaznici.all });
    },
  });
}

/* ═══════════════════════════════════════════
   ZAKÁZKY
   ═══════════════════════════════════════════ */

export function useZakazky() {
  return useQuery({
    queryKey: queryKeys.zakazky.all,
    queryFn: () => zakazkaService.getAll(),
  });
}

export function useCreateZakazka() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Zakazka>) => zakazkaService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zakazky.all });
    },
  });
}

export function useUpdateZakazka() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Zakazka> }) =>
      zakazkaService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zakazky.all });
    },
  });
}

export function useDeleteZakazka() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => zakazkaService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zakazky.all });
    },
  });
}

/* ═══════════════════════════════════════════
   NASTAVENÍ
   ═══════════════════════════════════════════ */

export function useNastaveni() {
  return useQuery({
    queryKey: queryKeys.nastaveni.all,
    queryFn: () => nastaveniService.get(),
    staleTime: 2 * 60 * 1000, // nastavení se mění zřídka
  });
}

export function useSaveNastaveni() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Nastaveni) => nastaveniService.save(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.nastaveni.all });
    },
  });
}

/* ═══════════════════════════════════════════
   PŘEDVOLENÉ TEXTY
   ═══════════════════════════════════════════ */

export function usePredvoleneTexty() {
  return useQuery({
    queryKey: queryKeys.predvoleneTexty.all,
    queryFn: () => predvolenyTextService.getAll(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreatePredvolenyText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PredvolenyText>) => predvolenyTextService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.predvoleneTexty.all });
    },
  });
}

export function useUpdatePredvolenyText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PredvolenyText> }) =>
      predvolenyTextService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.predvoleneTexty.all });
    },
  });
}

export function useDeletePredvolenyText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => predvolenyTextService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.predvoleneTexty.all });
    },
  });
}

/* ═══════════════════════════════════════════
   KATALOG ZÁVAD
   ═══════════════════════════════════════════ */

export function useZavadyKatalog() {
  return useQuery({
    queryKey: queryKeys.zavadyKatalog.all,
    queryFn: () => zavadaKatalogService.getAll(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useZavadyKategorie() {
  return useQuery({
    queryKey: queryKeys.zavadyKatalog.kategorie,
    queryFn: () => zavadaKatalogService.getKategorie(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateZavadaKatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ZavadaKatalog>) => zavadaKatalogService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.all });
      qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.kategorie });
    },
  });
}

export function useUpdateZavadaKatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ZavadaKatalog> }) =>
      zavadaKatalogService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.all });
      qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.kategorie });
    },
  });
}

export function useDeleteZavadaKatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => zavadaKatalogService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.all });
      qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.kategorie });
    },
  });
}

/* ═══════════════════════════════════════════
   DATABASE STATS & BACKUP
   ═══════════════════════════════════════════ */

export function useDatabaseStats() {
  return useQuery({
    queryKey: queryKeys.databaseStats.all,
    queryFn: () => backupService.getDatabaseStats(),
    staleTime: 60 * 1000,
  });
}

export function useExportDatabase() {
  return useMutation({
    mutationFn: () => backupService.exportDatabase(),
  });
}

export function useImportDatabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, mode }: { data: unknown; mode: 'replace' | 'merge' }) =>
      backupService.importDatabase(data, mode),
    onSuccess: () => {
      // Import mění vše – invalidovat celou cache
      qc.invalidateQueries();
    },
  });
}

export function useCleanOldData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (months: number) => backupService.cleanOldData(months),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
