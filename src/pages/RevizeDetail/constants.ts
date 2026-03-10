// Předvolené texty pro textová pole v záložce Dokumentace
export const PREDVOLENE_TEXTY: Record<string, { label: string; text: string }[]> = {
  popisZarizeni: [
    { label: 'Bytový dům', text: 'Elektrická instalace bytového domu, včetně rozváděčů, rozvodů, zásuvek a osvětlení.' },
    { label: 'Rodinný dům', text: 'Elektrická instalace rodinného domu, silnoproudé rozvody od hlavního rozváděče po koncové obvody.' },
    { label: 'Administrativní budova', text: 'Elektroinstalace administrativní budovy – rozváděče, rozvody, osvětlení, zásuvkové obvody.' },
    { label: 'Provozovna / dílna', text: 'Elektrická instalace provozovny, silové rozvody, motorové vývody, osvětlení.' },
  ],
  rozsahRevize: [
    { label: 'Od elektroměru po obvody', text: 'Elektrická instalace od elektroměrového rozváděče po koncové obvody, včetně rozváděčů, kabelových rozvodů, spínacích a zásuvkových obvodů, osvětlení a uzemnění.' },
    { label: 'Od hlavního rozváděče', text: 'Silnoproudá elektroinstalace objektu v rozsahu od hlavního rozváděče po poslední spotřebič, včetně rozváděčů, kabelových tras, ochranného pospojování a uzemnění.' },
    { label: 'Celá instalace', text: 'Kompletní elektrická instalace objektu – silové i světelné rozvody, rozváděče, kabelové trasy, přípojnice, uzemnění, ochranné pospojování.' },
  ],
  predmetNeni: [
    { label: 'Spotřebiče + hromosvod', text: 'Spotřebiče připojené pohyblivým přívodem, hromosvod, slaboproudé rozvody (EZS, EPS, strukturovaná kabeláž).' },
    { label: 'Spotřebiče + nájemci', text: 'Elektrické spotřebiče, zařízení dodaná nájemci, hromosvodní soustava, telekomunikační rozvody.' },
    { label: 'Jen hromosvod', text: 'Hromosvodní soustava – bude předmětem samostatné revize.' },
  ],
  podklady: [
    { label: 'Projekt + předchozí revize', text: 'Projektová dokumentace skutečného provedení, předchozí revizní zpráva, protokoly o měření, ČSN 33 1500, ČSN 33 2000-6 ed.2.' },
    { label: 'Vnější vlivy + projekt', text: 'Protokol o určení vnějších vlivů, projektová dokumentace, předchozí revizní zpráva.' },
    { label: 'Pouze normy', text: 'ČSN 33 1500, ČSN 33 2000-6 ed.2, ČSN 33 2000-4-41 ed.3, ČSN EN 61439-1,2.' },
  ],
  provedeneUkony: [
    { label: 'Kompletní sada úkonů', text: 'Prohlídka elektrického zařízení, kontrola značení obvodů a jistících prvků, měření izolačního odporu, měření impedance poruchové smyčky, ověření funkce proudových chráničů (RCD), kontrola ochranného pospojování, ověření sledu fází, kontrola stupně ochrany krytem.' },
    { label: 'Základní úkony', text: 'Vizuální prohlídka, měření izolačních odporů, měření impedance smyčky, test funkce proudových chráničů, kontrola ochranných vodičů.' },
  ],
  vyhodnoceniPredchozich: [
    { label: 'Nebyla předložena', text: 'Předchozí revizní zpráva nebyla předložena.' },
    { label: 'Bez závad', text: 'Předchozí revize — bez závad. Závady z předchozí revize byly odstraněny.' },
    { label: 'Výchozí revize', text: 'Jedná se o výchozí revizi – předchozí revize nebyla provedena.' },
    { label: 'Závady odstraněny', text: 'Závady zjištěné předchozí revizí byly odstraněny.' },
  ],
  vysledekOduvodneni: [
    { label: 'Schopno – bez závad', text: 'Při revizi nebyly zjištěny závady bránící bezpečnému provozu elektrického zařízení. Zařízení splňuje požadavky platných norem a předpisů.' },
    { label: 'Neschopno – závady', text: 'Elektrické zařízení vykazuje závady, které brání jeho bezpečnému provozu. Závady jsou uvedeny v soupisu zjištěných závad.' },
    { label: 'Podmíněně schopno', text: 'Elektrické zařízení je podmíněně schopno provozu za předpokladu odstranění zjištěných závad ve stanoveném termínu.' },
  ],
  zaver: [
    { label: 'Schopno provozu', text: 'Na základě provedené revize konstatuji, že revidované elektrické zařízení je z hlediska bezpečnosti schopno provozu.' },
    { label: 'Schopno + údržba', text: 'Revidované zařízení je schopno bezpečného provozu za předpokladu dodržování platných norem a předpisů. Doporučuji provádět pravidelnou údržbu a kontroly dle provozního řádu.' },
    { label: 'Neschopno provozu', text: 'Na základě provedené revize konstatuji, že revidované elektrické zařízení není z hlediska bezpečnosti schopno provozu. Před jeho dalším provozováním je nutné odstranit zjištěné závady.' },
  ],
};
