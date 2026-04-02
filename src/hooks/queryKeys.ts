/**
 * Centrální definice query klíčů pro React Query.
 * Každý klíč je factory funkce – umožňuje hierarchickou invalidaci.
 *
 * Příklad:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.revize.all })
 *   → invaliduje i queryKeys.revize.detail(id)
 */
export const queryKeys = {
  revize: {
    all: ['revize'] as const,
    detail: (id: number) => ['revize', id] as const,
  },
  rozvadece: {
    byRevize: (revizeId: number) => ['rozvadece', 'byRevize', revizeId] as const,
  },
  okruhy: {
    byRozvadec: (rozvadecId: number) => ['okruhy', 'byRozvadec', rozvadecId] as const,
  },
  chranic: {
    byRozvadec: (rozvadecId: number) => ['chranic', 'byRozvadec', rozvadecId] as const,
  },
  zavady: {
    byRevize: (revizeId: number) => ['zavady', 'byRevize', revizeId] as const,
  },
  mistnosti: {
    byRevize: (revizeId: number) => ['mistnosti', 'byRevize', revizeId] as const,
  },
  zarizeni: {
    byMistnost: (mistnostId: number) => ['zarizeni', 'byMistnost', mistnostId] as const,
  },
  pristroje: {
    all: ['pristroje'] as const,
    byRevize: (revizeId: number) => ['pristroje', 'byRevize', revizeId] as const,
  },
  kalibrace: {
    byPristroj: (pristrojId: number) => ['kalibrace', 'byPristroj', pristrojId] as const,
  },
  firmy: {
    all: ['firmy'] as const,
  },
  zakaznici: {
    all: ['zakaznici'] as const,
  },
  zakazky: {
    all: ['zakazky'] as const,
  },
  nastaveni: {
    all: ['nastaveni'] as const,
  },
  predvoleneTexty: {
    all: ['predvoleneTexty'] as const,
  },
  zavadyKatalog: {
    all: ['zavadyKatalog'] as const,
    kategorie: ['zavadyKatalog', 'kategorie'] as const,
  },
  databaseStats: {
    all: ['databaseStats'] as const,
  },
} as const;
