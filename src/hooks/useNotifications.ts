import { useMemo } from 'react';
import type { AppNotification, NotificationSeverity } from '../types';
import { useZakazky, useRevize, usePristroje, useNastaveni } from './useQueries';
import { getReportDeadline } from '../pages/Planovani/utils';

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr: string | undefined | null): number {
  if (!dateStr) return Infinity;
  const t = today();
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

function severity(days: number): NotificationSeverity {
  if (days < 0) return 'critical';
  if (days <= 3) return 'warning';
  return 'info';
}

export function useNotifications() {
  const { data: zakazky = [], isLoading: lZ } = useZakazky();
  const { data: revize = [], isLoading: lR } = useRevize();
  const { data: pristroje = [], isLoading: lP } = usePristroje();
  const { data: nastaveni, isLoading: lN } = useNastaveni();

  const isLoading = lZ || lR || lP || lN;

  const notifications = useMemo<AppNotification[]>(() => {
    const thresholdZakazka = nastaveni?.upozorneniZakazkaDni ?? 7;
    const thresholdRevize = nastaveni?.upozorneniRevizeDni ?? 14;
    const thresholdKalibrace = nastaveni?.upozorneniKalibraceDni ?? 30;
    const thresholdZprava = nastaveni?.upozorneniZpravaDni ?? 3;
    const thresholdTechnik = nastaveni?.upozorneniTechnikDni ?? 60;

    const items: AppNotification[] = [];

    // 1. Plánované zakázky – datum nastávající do N dní (pouze pokud nejsou dokončené)
    for (const z of zakazky) {
      if (z.stav !== 'plánováno') continue;
      // Pokud je zakázka dokončená, přeskočit (pro jistotu, i když by neměla být v tomto stavu)
      if (z.stav === 'dokončeno') continue;
      const days = daysUntil(z.datumPlanovany);
      if (days <= thresholdZakazka) {
        const d = new Date(z.datumPlanovany);
        const label = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
        items.push({
          id: `zakazka-${z.id}`,
          type: 'zakazka_upcoming',
          severity: severity(days),
          title: z.nazev,
          description: days < 0
            ? `Zakázka měla proběhnout ${label}`
            : days === 0
              ? 'Zakázka je naplánovaná na dnes'
              : `Zakázka naplánovaná na ${label}`,
          daysUntil: days,
          link: '/planovani',
        });
      }
    }

    // 2. Rozpracované revize – starší než N dní
    for (const r of revize) {
      if (r.stav !== 'rozpracováno') continue;
      const age = -daysUntil(r.datum); // age = počet dní zpět od zahájení
      if (age >= thresholdRevize) {
        const d = new Date(r.datum);
        const label = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
        const sev: NotificationSeverity = age >= thresholdRevize * 2 ? 'critical' : 'warning';
        items.push({
          id: `revize-${r.id}`,
          type: 'revize_overdue',
          severity: sev,
          title: r.nazev || `Revize č. ${r.cisloRevize || r.id}`,
          description: `Rozpracovaná revize ze dne ${label} (${age} dní)`,
          daysUntil: -age,
          link: `/revize/${r.id}`,
        });
      }
    }

    // 3. Deadline odevzdání zprávy po zakázce (pouze pokud není dokončeno a není nastaveno datum odevzdání)
    for (const z of zakazky) {
      // Pokud je zakázka dokončená a má nastavené datum odevzdání, neupozorňovat
      if (z.stav === 'dokončeno' && z.datumOdevzdaniZpravy) continue;
      // Explicitně nastavené datum odevzdání
      if (z.datumOdevzdaniZpravy) {
        const days = daysUntil(z.datumOdevzdaniZpravy);
        if (days <= thresholdZprava) {
          const d = new Date(z.datumOdevzdaniZpravy);
          const label = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
          items.push({
            id: `zprava-${z.id}`,
            type: 'report_deadline',
            severity: severity(days),
            title: `Zpráva: ${z.nazev}`,
            description: days < 0
              ? `Deadline odevzdání zprávy byl ${label}`
              : `Odevzdat zprávu do ${label}`,
            daysUntil: days,
            link: '/planovani',
          });
        }
        continue;
      }
      // Vypočítaný deadline (dokončeno bez nastaveného datumu)
      if (z.stav === 'dokončeno') {
        const deadline = getReportDeadline(z);
        if (deadline) {
          const days = daysUntil(deadline);
          if (days <= thresholdZprava) {
            const d = new Date(deadline);
            const label = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
            items.push({
              id: `zprava-auto-${z.id}`,
              type: 'report_deadline',
              severity: severity(days),
              title: `Zpráva: ${z.nazev}`,
              description: days < 0
                ? `Deadline odevzdání zprávy byl ${label}`,
                : `Odevzdat zprávu do ${label}`,
              daysUntil: days,
              link: '/planovani',
            });
          }
        }
      }
    }

    // 4. Expirace kalibrace přístrojů
    for (const p of pristroje) {
      if (!p.platnostKalibrace) continue;
      const days = daysUntil(p.platnostKalibrace);
      if (days <= thresholdKalibrace) {
        const d = new Date(p.platnostKalibrace);
        const label = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
        items.push({
          id: `kalibrace-${p.id}`,
          type: 'kalibrace_expiring',
          severity: severity(days),
          title: p.nazev || p.typPristroje || `Přístroj ${p.id}`,
          description: days < 0
            ? `Kalibrace vypršela ${label}`
            : `Platnost kalibrace do ${label}`,
          daysUntil: days,
          link: '/pristroje',
        });
      }
    }

    // 5. Expirace oprávnění/osvědčení technika
    const platnosti: { label: string; dateStr: string | undefined }[] = [
      { label: 'Oprávnění technika', dateStr: nastaveni?.reviznniTechnikPlatnostOpravneni },
      { label: 'Osvědčení technika', dateStr: nastaveni?.reviznniTechnikPlatnostOsvedceni },
    ];
    for (const { label, dateStr } of platnosti) {
      if (!dateStr) continue;
      const days = daysUntil(dateStr);
      if (days <= thresholdTechnik) {
        const d = new Date(dateStr);
        const dateLabel = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
        items.push({
          id: `technik-${label}`,
          type: 'technik_expiry',
          severity: severity(days),
          title: label,
          description: days < 0
            ? `Platnost vypršela ${dateLabel}`
            : `Platnost vyprší ${dateLabel}`,
          daysUntil: days,
          link: '/nastaveni',
        });
      }
    }

    // Řazení: critical → warning → info, v rámci skupiny od nejbližšího (nejmenší daysUntil)
    const severityOrder: Record<NotificationSeverity, number> = { critical: 0, warning: 1, info: 2 };
    items.sort((a, b) => {
      const sd = severityOrder[a.severity] - severityOrder[b.severity];
      if (sd !== 0) return sd;
      return a.daysUntil - b.daysUntil;
    });

    return items;
  }, [zakazky, revize, pristroje, nastaveni]);

  return { notifications, count: notifications.length, isLoading };
}
