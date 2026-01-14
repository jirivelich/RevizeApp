import Dexie, { type EntityTable } from 'dexie';
import type { Revize, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, Zakazka, Nastaveni, Sablona, MericiPristroj, RevizePristroj, Firma, ZavadaKatalog } from '../types';

// Definice databáze
const db = new Dexie('RevizeAppDB') as Dexie & {
  revize: EntityTable<Revize, 'id'>;
  rozvadece: EntityTable<Rozvadec, 'id'>;
  okruhy: EntityTable<Okruh, 'id'>;
  zavady: EntityTable<Zavada, 'id'>;
  mistnosti: EntityTable<Mistnost, 'id'>;
  zarizeni: EntityTable<Zarizeni, 'id'>;
  zakazky: EntityTable<Zakazka, 'id'>;
  nastaveni: EntityTable<Nastaveni, 'id'>;
  sablony: EntityTable<Sablona, 'id'>;
  mericiPristroje: EntityTable<MericiPristroj, 'id'>;
  revizePristroje: EntityTable<RevizePristroj, 'id'>;
  firmy: EntityTable<Firma, 'id'>;
  zavadyKatalog: EntityTable<ZavadaKatalog, 'id'>;
};

db.version(5).stores({
  revize: '++id, cisloRevize, datum, stav, typRevize',
  rozvadece: '++id, revizeId, nazev, oznaceni',
  okruhy: '++id, rozvadecId, cislo',
  zavady: '++id, revizeId, rozvadecId, mistnostId, stav, zavaznost',
  mistnosti: '++id, revizeId, nazev',
  zarizeni: '++id, mistnostId, nazev, typ, stav',
  zakazky: '++id, datumPlanovany, stav, priorita',
  nastaveni: '++id',
  sablony: '++id, nazev, jeVychozi',
  mericiPristroje: '++id, nazev, vyrobniCislo, typPristroje, platnostKalibrace',
  revizePristroje: '++id, revizeId, pristrojId',
  firmy: '++id, nazev, ico',
  zavadyKatalog: '++id, zavaznost, kategorie, norma'
});

export { db };

// ==================== REVIZE ====================
export const revizeService = {
  async getAll(): Promise<Revize[]> {
    return await db.revize.toArray();
  },

  async getById(id: number): Promise<Revize | undefined> {
    return await db.revize.get(id);
  },

  async create(revize: Omit<Revize, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await db.revize.add({
      ...revize,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Revize);
    return result as number;
  },

  async update(id: number, revize: Partial<Revize>): Promise<number> {
    return await db.revize.update(id, {
      ...revize,
      updatedAt: new Date()
    });
  },

  async delete(id: number): Promise<void> {
    // Smazat související záznamy
    await db.rozvadece.where('revizeId').equals(id).delete();
    await db.zavady.where('revizeId').equals(id).delete();
    await db.mistnosti.where('revizeId').equals(id).delete();
    await db.revize.delete(id);
  }
};

// ==================== ROZVADĚČE ====================
export const rozvadecService = {
  async getByRevize(revizeId: number): Promise<Rozvadec[]> {
    return await db.rozvadece.where('revizeId').equals(revizeId).toArray();
  },

  async getById(id: number): Promise<Rozvadec | undefined> {
    return await db.rozvadece.get(id);
  },

  async create(rozvadec: Omit<Rozvadec, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await db.rozvadece.add({
      ...rozvadec,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Rozvadec);
    return result as number;
  },

  async update(id: number, rozvadec: Partial<Rozvadec>): Promise<number> {
    return await db.rozvadece.update(id, {
      ...rozvadec,
      updatedAt: new Date()
    });
  },

  async delete(id: number): Promise<void> {
    await db.okruhy.where('rozvadecId').equals(id).delete();
    await db.rozvadece.delete(id);
  }
};

// ==================== OKRUHY ====================
export const okruhService = {
  async getByRozvadec(rozvadecId: number): Promise<Okruh[]> {
    return await db.okruhy.where('rozvadecId').equals(rozvadecId).toArray();
  },

  async create(okruh: Omit<Okruh, 'id'>): Promise<number> {
    const result = await db.okruhy.add(okruh as Okruh);
    return result as number;
  },

  async update(id: number, okruh: Partial<Okruh>): Promise<number> {
    return await db.okruhy.update(id, okruh);
  },

  async delete(id: number): Promise<void> {
    await db.okruhy.delete(id);
  }
};

// ==================== ZÁVADY ====================
export const zavadaService = {
  async getByRevize(revizeId: number): Promise<Zavada[]> {
    return await db.zavady.where('revizeId').equals(revizeId).toArray();
  },

  async getAll(): Promise<Zavada[]> {
    return await db.zavady.toArray();
  },

  async create(zavada: Omit<Zavada, 'id'>): Promise<number> {
    const result = await db.zavady.add(zavada as Zavada);
    return result as number;
  },

  async update(id: number, zavada: Partial<Zavada>): Promise<number> {
    return await db.zavady.update(id, zavada);
  },

  async delete(id: number): Promise<void> {
    await db.zavady.delete(id);
  }
};

// ==================== MÍSTNOSTI ====================
export const mistnostService = {
  async getByRevize(revizeId: number): Promise<Mistnost[]> {
    return await db.mistnosti.where('revizeId').equals(revizeId).toArray();
  },

  async getById(id: number): Promise<Mistnost | undefined> {
    return await db.mistnosti.get(id);
  },

  async create(mistnost: Omit<Mistnost, 'id'>): Promise<number> {
    const result = await db.mistnosti.add(mistnost as Mistnost);
    return result as number;
  },

  async update(id: number, mistnost: Partial<Mistnost>): Promise<number> {
    return await db.mistnosti.update(id, mistnost);
  },

  async delete(id: number): Promise<void> {
    // Smazat i všechna zařízení v místnosti
    await db.zarizeni.where('mistnostId').equals(id).delete();
    await db.mistnosti.delete(id);
  }
};

// ==================== ZAKÁZKY ====================
export const zakazkaService = {
  async getAll(): Promise<Zakazka[]> {
    return await db.zakazky.toArray();
  },

  async getById(id: number): Promise<Zakazka | undefined> {
    return await db.zakazky.get(id);
  },

  async create(zakazka: Omit<Zakazka, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await db.zakazky.add({
      ...zakazka,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Zakazka);
    return result as number;
  },

  async update(id: number, zakazka: Partial<Zakazka>): Promise<number> {
    return await db.zakazky.update(id, {
      ...zakazka,
      updatedAt: new Date()
    });
  },

  async delete(id: number): Promise<void> {
    await db.zakazky.delete(id);
  }
};

// ==================== NASTAVENÍ ====================
export const nastaveniService = {
  async get(): Promise<Nastaveni | undefined> {
    const all = await db.nastaveni.toArray();
    return all[0];
  },

  async save(nastaveni: Omit<Nastaveni, 'id'>): Promise<void> {
    const existing = await this.get();
    if (existing && existing.id) {
      await db.nastaveni.update(existing.id, nastaveni);
    } else {
      await db.nastaveni.add(nastaveni as Nastaveni);
    }
  }
};

// ==================== ŠABLONY ====================
export const sablonaService = {
  async getAll(): Promise<Sablona[]> {
    return await db.sablony.toArray();
  },

  async getById(id: number): Promise<Sablona | undefined> {
    return await db.sablony.get(id);
  },

  async getVychozi(): Promise<Sablona | undefined> {
    return await db.sablony.where('jeVychozi').equals(1).first();
  },

  async create(sablona: Omit<Sablona, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    // Pokud je nová šablona výchozí, zrušit výchozí u ostatních
    if (sablona.jeVychozi) {
      await db.sablony.where('jeVychozi').equals(1).modify({ jeVychozi: false });
    }
    const result = await db.sablony.add({
      ...sablona,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Sablona);
    return result as number;
  },

  async update(id: number, sablona: Partial<Sablona>): Promise<number> {
    // Pokud je šablona nastavena jako výchozí, zrušit výchozí u ostatních
    if (sablona.jeVychozi) {
      await db.sablony.where('jeVychozi').equals(1).modify({ jeVychozi: false });
    }
    return await db.sablony.update(id, {
      ...sablona,
      updatedAt: new Date()
    });
  },

  async delete(id: number): Promise<void> {
    await db.sablony.delete(id);
  },

  getDefaultSablona(): Omit<Sablona, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      nazev: 'Výchozí šablona',
      popis: 'Základní šablona pro revizní zprávu',
      jeVychozi: true,
      zahlaviZobrazitLogo: true,
      zahlaviZobrazitFirmu: true,
      zahlaviZobrazitTechnika: true,
      zahlaviCustomText: '',
      // Úvodní strana
      uvodniStranaZobrazit: true,
      uvodniStranaZobrazitObjekt: true,
      uvodniStranaZobrazitTechnika: true,
      uvodniStranaZobrazitFirmu: true,
      uvodniStranaZobrazitVyhodnoceni: true,
      uvodniStranaZobrazitPodpisy: true,
      uvodniStranaNadpis: 'ZPRAVA O REVIZI ELEKTRICKE INSTALACE',
      uvodniStranaNadpisFontSize: 18,
      uvodniStranaNadpisRamecek: true,
      uvodniStranaRamecekUdaje: true,
      uvodniStranaRamecekObjekt: true,
      uvodniStranaRamecekVyhodnoceni: true,
      sekce: [
        { id: 'zakladni-udaje', nazev: 'Základní údaje', enabled: true, poradi: 1 },
        { id: 'objekt', nazev: 'Údaje o objektu', enabled: true, poradi: 2 },
        { id: 'rozvadece', nazev: 'Rozvaděče a okruhy', enabled: true, poradi: 3 },
        { id: 'mereni', nazev: 'Výsledky měření', enabled: true, poradi: 4 },
        { id: 'mistnosti', nazev: 'Místnosti a zařízení', enabled: true, poradi: 5 },
        { id: 'zaver', nazev: 'Závěr revize', enabled: true, poradi: 6 },
        { id: 'podpisy', nazev: 'Podpisy', enabled: true, poradi: 7 },
        { id: 'zavady', nazev: 'Závady (příloha)', enabled: true, poradi: 8 },
      ],
      sloupceOkruhu: [
        { id: 'cislo', nazev: 'Č.', enabled: true, poradi: 1 },
        { id: 'jistic', nazev: 'Jistič', enabled: true, poradi: 2 },
        { id: 'nazev', nazev: 'Název', enabled: true, poradi: 3 },
        { id: 'vodic', nazev: 'Vodič', enabled: true, poradi: 4 },
        { id: 'izolacniOdpor', nazev: 'Iz. odpor', enabled: true, poradi: 5 },
        { id: 'impedanceSmycky', nazev: 'Imp. smyčky', enabled: true, poradi: 6 },
        { id: 'proudovyChranicMa', nazev: 'Pr. chrán.', enabled: false, poradi: 7 },
        { id: 'casOdpojeni', nazev: 'Čas odp.', enabled: false, poradi: 8 },
      ],
      zapatiZobrazitCisloStranky: true,
      zapatiZobrazitDatum: true,
      zapatiCustomText: '',
      barvaPrimary: '#1e40af',
      barvaSecondary: '#64748b',
      fontFamily: 'Arial',
      fontSize: 10,
    };
  }
};

// ==================== EXPORT/IMPORT ====================
export const exportService = {
  async exportAll(): Promise<string> {
    const data = {
      revize: await db.revize.toArray(),
      rozvadece: await db.rozvadece.toArray(),
      okruhy: await db.okruhy.toArray(),
      zavady: await db.zavady.toArray(),
      mistnosti: await db.mistnosti.toArray(),
      zakazky: await db.zakazky.toArray(),
      nastaveni: await db.nastaveni.toArray(),
      mericiPristroje: await db.mericiPristroje.toArray(),
      revizePristroje: await db.revizePristroje.toArray(),
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },

  async importAll(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    
    await db.transaction('rw', 
      [db.revize, db.rozvadece, db.okruhy, db.zavady, db.mistnosti, db.zakazky, db.nastaveni, db.mericiPristroje, db.revizePristroje], 
      async () => {
        // Vymazat existující data
        await db.revize.clear();
        await db.rozvadece.clear();
        await db.okruhy.clear();
        await db.zavady.clear();
        await db.mistnosti.clear();
        await db.zakazky.clear();
        await db.nastaveni.clear();
        await db.mericiPristroje.clear();
        await db.revizePristroje.clear();

        // Importovat nová data
        if (data.revize) await db.revize.bulkAdd(data.revize);
        if (data.rozvadece) await db.rozvadece.bulkAdd(data.rozvadece);
        if (data.okruhy) await db.okruhy.bulkAdd(data.okruhy);
        if (data.zavady) await db.zavady.bulkAdd(data.zavady);
        if (data.mistnosti) await db.mistnosti.bulkAdd(data.mistnosti);
        if (data.zakazky) await db.zakazky.bulkAdd(data.zakazky);
        if (data.nastaveni) await db.nastaveni.bulkAdd(data.nastaveni);
        if (data.mericiPristroje) await db.mericiPristroje.bulkAdd(data.mericiPristroje);
        if (data.revizePristroje) await db.revizePristroje.bulkAdd(data.revizePristroje);
      }
    );
  }
};

// ==================== MĚŘÍCÍ PŘÍSTROJE ====================
export const pristrojService = {
  async getAll(): Promise<MericiPristroj[]> {
    return await db.mericiPristroje.toArray();
  },

  async getById(id: number): Promise<MericiPristroj | undefined> {
    return await db.mericiPristroje.get(id);
  },

  async getExpiring(days: number = 30): Promise<MericiPristroj[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    return await db.mericiPristroje
      .filter(p => new Date(p.platnostKalibrace) <= futureDate)
      .toArray();
  },

  async create(pristroj: Omit<MericiPristroj, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await db.mericiPristroje.add({
      ...pristroj,
      createdAt: new Date(),
      updatedAt: new Date()
    } as MericiPristroj);
    return result as number;
  },

  async update(id: number, pristroj: Partial<MericiPristroj>): Promise<number> {
    return await db.mericiPristroje.update(id, {
      ...pristroj,
      updatedAt: new Date()
    });
  },

  async delete(id: number): Promise<void> {
    // Smazat vazby na revize
    await db.revizePristroje.where('pristrojId').equals(id).delete();
    await db.mericiPristroje.delete(id);
  }
};

// ==================== REVIZE-PŘÍSTROJE VAZBA ====================
export const revizePristrojService = {
  async getByRevize(revizeId: number): Promise<MericiPristroj[]> {
    const vazby = await db.revizePristroje.where('revizeId').equals(revizeId).toArray();
    const pristroje: MericiPristroj[] = [];
    for (const vazba of vazby) {
      const pristroj = await db.mericiPristroje.get(vazba.pristrojId);
      if (pristroj) pristroje.push(pristroj);
    }
    return pristroje;
  },

  async addToRevize(revizeId: number, pristrojId: number): Promise<number> {
    // Zkontrolovat, zda vazba již neexistuje
    const existing = await db.revizePristroje
      .where({ revizeId, pristrojId })
      .first();
    if (existing) return existing.id!;
    
    const result = await db.revizePristroje.add({ revizeId, pristrojId } as RevizePristroj);
    return result as number;
  },

  async removeFromRevize(revizeId: number, pristrojId: number): Promise<void> {
    await db.revizePristroje
      .where({ revizeId, pristrojId })
      .delete();
  }
};

// ==================== ZAŘÍZENÍ ====================
export const zarizeniService = {
  async getAll(): Promise<Zarizeni[]> {
    return await db.zarizeni.toArray();
  },

  async getByMistnost(mistnostId: number): Promise<Zarizeni[]> {
    return await db.zarizeni.where('mistnostId').equals(mistnostId).toArray();
  },

  async getById(id: number): Promise<Zarizeni | undefined> {
    return await db.zarizeni.get(id);
  },

  async create(zarizeni: Omit<Zarizeni, 'id'>): Promise<number> {
    const result = await db.zarizeni.add(zarizeni as Zarizeni);
    return result as number;
  },

  async update(id: number, zarizeni: Partial<Zarizeni>): Promise<number> {
    return await db.zarizeni.update(id, zarizeni);
  },

  async delete(id: number): Promise<void> {
    await db.zarizeni.delete(id);
  },

  async deleteByMistnost(mistnostId: number): Promise<void> {
    await db.zarizeni.where('mistnostId').equals(mistnostId).delete();
  }
};

// ==================== FIRMY ====================
export const firmaService = {
  async getAll(): Promise<Firma[]> {
    return await db.firmy.toArray();
  },

  async getById(id: number): Promise<Firma | undefined> {
    return await db.firmy.get(id);
  },

  async create(firma: Omit<Firma, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await db.firmy.add({
      ...firma,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Firma);
    return result as number;
  },

  async update(id: number, firma: Partial<Firma>): Promise<number> {
    return await db.firmy.update(id, {
      ...firma,
      updatedAt: new Date()
    });
  },

  async delete(id: number): Promise<void> {
    await db.firmy.delete(id);
  }
};

// ==================== KATALOG ZÁVAD ====================
export const zavadaKatalogService = {
  async getAll(): Promise<ZavadaKatalog[]> {
    return await db.zavadyKatalog.toArray();
  },

  async getById(id: number): Promise<ZavadaKatalog | undefined> {
    return await db.zavadyKatalog.get(id);
  },

  async getByKategorie(kategorie: string): Promise<ZavadaKatalog[]> {
    return await db.zavadyKatalog.where('kategorie').equals(kategorie).toArray();
  },

  async getByZavaznost(zavaznost: string): Promise<ZavadaKatalog[]> {
    return await db.zavadyKatalog.where('zavaznost').equals(zavaznost).toArray();
  },

  async create(zavada: Omit<ZavadaKatalog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await db.zavadyKatalog.add({
      ...zavada,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ZavadaKatalog);
    return result as number;
  },

  async update(id: number, zavada: Partial<ZavadaKatalog>): Promise<number> {
    return await db.zavadyKatalog.update(id, {
      ...zavada,
      updatedAt: new Date()
    });
  },

  async delete(id: number): Promise<void> {
    await db.zavadyKatalog.delete(id);
  },

  // Získání unikátních kategorií
  async getKategorie(): Promise<string[]> {
    const zavady = await db.zavadyKatalog.toArray();
    const kategorie = [...new Set(zavady.map(z => z.kategorie).filter(Boolean))];
    return kategorie as string[];
  },

  // Výchozí závady pro inicializaci databáze
  getDefaultZavady(): Omit<ZavadaKatalog, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        popis: 'Chybí revizní zpráva předchozí revize',
        zavaznost: 'C2',
        norma: 'ČSN 33 1500',
        clanek: 'čl. 3.2',
        zneniClanku: 'Provozovatel elektrického zařízení je povinen uchovávat revizní zprávy po celou dobu provozu zařízení.',
        kategorie: 'Dokumentace'
      },
      {
        popis: 'Rozvaděč není označen výstražnými tabulkami',
        zavaznost: 'C2',
        norma: 'ČSN EN 61439-1',
        clanek: 'čl. 6.5',
        zneniClanku: 'Rozvaděče musí být opatřeny výstražnými a informačními štítky.',
        kategorie: 'Rozvaděče'
      },
      {
        popis: 'Překročena lhůta periodické revize',
        zavaznost: 'C1',
        norma: 'ČSN 33 1500',
        clanek: 'čl. 4',
        zneniClanku: 'Lhůty periodických revizí nesmí být překročeny.',
        kategorie: 'Dokumentace'
      },
      {
        popis: 'Poškozená izolace vodičů',
        zavaznost: 'C1',
        norma: 'ČSN 33 2000-5-52',
        clanek: 'čl. 522',
        zneniClanku: 'Vodiče musí být chráněny proti mechanickému poškození.',
        kategorie: 'Vedení'
      },
      {
        popis: 'Nedostatečná ochrana před nebezpečným dotykem',
        zavaznost: 'C1',
        norma: 'ČSN 33 2000-4-41',
        clanek: 'čl. 411',
        zneniClanku: 'Ochrana automatickým odpojením od zdroje musí být zajištěna.',
        kategorie: 'Ochrana'
      },
      {
        popis: 'Chybějící nebo poškozené kryty rozvaděče',
        zavaznost: 'C1',
        norma: 'ČSN EN 61439-1',
        clanek: 'čl. 8.4',
        zneniClanku: 'Stupeň ochrany krytem musí odpovídat prostředí.',
        kategorie: 'Rozvaděče'
      },
      {
        popis: 'Nevyhovující impedance smyčky',
        zavaznost: 'C1',
        norma: 'ČSN 33 2000-6',
        clanek: 'čl. 6.4.3.7',
        zneniClanku: 'Impedance poruchové smyčky musí zajistit odpojení v předepsaném čase.',
        kategorie: 'Měření'
      },
      {
        popis: 'Chybějící pospojování',
        zavaznost: 'C2',
        norma: 'ČSN 33 2000-5-54',
        clanek: 'čl. 544.1',
        zneniClanku: 'Ochranné pospojování musí být provedeno v souladu s normou.',
        kategorie: 'Uzemnění'
      },
      {
        popis: 'Nevhodné prostředí pro daný stupeň krytí',
        zavaznost: 'C2',
        norma: 'ČSN 33 2000-5-51',
        clanek: 'čl. 512.2',
        zneniClanku: 'Elektrická zařízení musí odpovídat vnějším vlivům prostředí.',
        kategorie: 'Prostředí'
      },
      {
        popis: 'Chybějící označení obvodů v rozvaděči',
        zavaznost: 'C3',
        norma: 'ČSN 33 2000-5-51',
        clanek: 'čl. 514.5',
        zneniClanku: 'Obvody musí být řádně označeny pro identifikaci.',
        kategorie: 'Rozvaděče'
      }
    ];
  }
};
// ==================== BACKUP & RESTORE ====================
interface DatabaseBackup {
  version: string;
  timestamp: string;
  revize: Revize[];
  rozvadece: Rozvadec[];
  okruhy: Okruh[];
  zavady: Zavada[];
  mistnosti: Mistnost[];
  zarizeni: Zarizeni[];
  zakazky: Zakazka[];
  nastaveni: Nastaveni[];
  sablony: Sablona[];
  mericiPristroje: MericiPristroj[];
  revizePristroje: RevizePristroj[];
  firmy: Firma[];
  zavadyKatalog: ZavadaKatalog[];
}

export const backupService = {
  /**
   * Exportuje všechna data z databáze do JSON souboru
   */
  async exportDatabase(): Promise<string> {
    const backup: DatabaseBackup = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      revize: await db.revize.toArray(),
      rozvadece: await db.rozvadece.toArray(),
      okruhy: await db.okruhy.toArray(),
      zavady: await db.zavady.toArray(),
      mistnosti: await db.mistnosti.toArray(),
      zarizeni: await db.zarizeni.toArray(),
      zakazky: await db.zakazky.toArray(),
      nastaveni: await db.nastaveni.toArray(),
      sablony: await db.sablony.toArray(),
      mericiPristroje: await db.mericiPristroje.toArray(),
      revizePristroje: await db.revizePristroje.toArray(),
      firmy: await db.firmy.toArray(),
      zavadyKatalog: await db.zavadyKatalog.toArray(),
    };
    
    return JSON.stringify(backup, null, 2);
  },

  /**
   * Importuje data ze JSON backup souboru
   */
  async importDatabase(jsonData: string, mergeMode: 'replace' | 'merge' = 'replace'): Promise<void> {
    try {
      const backup: DatabaseBackup = JSON.parse(jsonData);
      
      if (mergeMode === 'replace') {
        // Smazat všechna stávající data
        await db.revize.clear();
        await db.rozvadece.clear();
        await db.okruhy.clear();
        await db.zavady.clear();
        await db.mistnosti.clear();
        await db.zarizeni.clear();
        await db.zakazky.clear();
        await db.nastaveni.clear();
        await db.sablony.clear();
        await db.mericiPristroje.clear();
        await db.revizePristroje.clear();
        await db.firmy.clear();
        await db.zavadyKatalog.clear();
      }
      
      // Importovat data
      if (backup.revize.length > 0) await db.revize.bulkAdd(backup.revize);
      if (backup.rozvadece.length > 0) await db.rozvadece.bulkAdd(backup.rozvadece);
      if (backup.okruhy.length > 0) await db.okruhy.bulkAdd(backup.okruhy);
      if (backup.zavady.length > 0) await db.zavady.bulkAdd(backup.zavady);
      if (backup.mistnosti.length > 0) await db.mistnosti.bulkAdd(backup.mistnosti);
      if (backup.zarizeni.length > 0) await db.zarizeni.bulkAdd(backup.zarizeni);
      if (backup.zakazky.length > 0) await db.zakazky.bulkAdd(backup.zakazky);
      if (backup.nastaveni.length > 0) await db.nastaveni.bulkAdd(backup.nastaveni);
      if (backup.sablony.length > 0) await db.sablony.bulkAdd(backup.sablony);
      if (backup.mericiPristroje.length > 0) await db.mericiPristroje.bulkAdd(backup.mericiPristroje);
      if (backup.revizePristroje.length > 0) await db.revizePristroje.bulkAdd(backup.revizePristroje);
      if (backup.firmy.length > 0) await db.firmy.bulkAdd(backup.firmy);
      if (backup.zavadyKatalog.length > 0) await db.zavadyKatalog.bulkAdd(backup.zavadyKatalog);
    } catch (error) {
      throw new Error(`Chyba při importu databáze: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
    }
  },

  /**
   * Vrací statistiku obsahu databáze
   */
  async getDatabaseStats(): Promise<Record<string, number>> {
    return {
      revize: await db.revize.count(),
      rozvadece: await db.rozvadece.count(),
      okruhy: await db.okruhy.count(),
      zavady: await db.zavady.count(),
      mistnosti: await db.mistnosti.count(),
      zarizeni: await db.zarizeni.count(),
      zakazky: await db.zakazky.count(),
      nastaveni: await db.nastaveni.count(),
      sablony: await db.sablony.count(),
      mericiPristroje: await db.mericiPristroje.count(),
      revizePristroje: await db.revizePristroje.count(),
      firmy: await db.firmy.count(),
      zavadyKatalog: await db.zavadyKatalog.count(),
    };
  },

  /**
   * Čistí databázi od starých dat (starších než X dní)
   */
  async cleanOldData(daysOld: number = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Smazat staré završené revize
    const oldRevize = await db.revize
      .where('updatedAt')
      .below(cutoffDate)
      .filter(r => r.stav === 'schváleno')
      .toArray();
    
    if (oldRevize.length > 0) {
      for (const revize of oldRevize) {
        if (revize.id) {
          await revizeService.delete(revize.id);
        }
      }
    }
  },

  /**
   * Vrací aktuální velikost databáze (přibližně v MB)
   */
  async getDatabaseSize(): Promise<string> {
    let totalSize = 0;
    const stats = await this.getDatabaseStats();
    
    // Zhruba 1KB na záznam + Base64 obrázky
    for (const [table, count] of Object.entries(stats)) {
      if (table === 'zavady') {
        totalSize += count * 5; // Závady s fotkami - ~5KB
      } else if (table === 'nastaveni') {
        totalSize += count * 2; // Nastavení s logem - ~2MB max
      } else {
        totalSize += count * 1; // Ostatní ~1KB
      }
    }
    
    return (totalSize / 1024).toFixed(2);
  }
};