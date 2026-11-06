import type { ZavadaKatalog } from '../types';

/**
 * Závadovník – revize elektrických instalací nízkého napětí dle ČSN 33 2000.
 * Podklad pro revizní techniky, nenahrazuje text normy (hodnoty označené
 * „ověřit s normou“ je nutné zkontrolovat v aktuálním znění).
 * Kontrolní body 1–101 podle zdrojové tabulky.
 */
type Z = ZavadaKatalog['zavaznost'];
type Radek = [popis: string, pozadavek: string, zavaznost?: Z];

interface Sekce {
  kategorie: string;
  norma: string;
  clanek?: string;
  vychozi: Z;
  radky: Radek[];
}

const SEKCE: Sekce[] = [
  {
    kategorie: 'Dokumentace a všeobecné údaje',
    norma: 'ČSN 33 2000-6 ed.2 / ČSN 33 1500 Z1-Z4',
    vychozi: 'C3',
    radky: [
      ['Existuje projektová dokumentace / schéma odpovídající skutečnému stavu instalace', 'Dokumentace k dispozici a odpovídá provedení'],
      ['K dispozici zpráva o výchozí revizi, popř. předchozí periodická revizní zpráva', 'Zpráva dohledatelná, bez neodstraněných závad kat. C', 'C2'],
      ['Určen a zaznamenán druh sítě (TN-C, TN-S, TN-C-S, TT, IT)', 'Skutečné zapojení odpovídá uvedenému druhu sítě'],
      ['Zaznamenán rozsah revize a případná omezení prohlídky/zkoušek', 'Uvedeno v revizní zprávě dle ČSN 33 1500 Z1-Z4', 'C2'],
      ['Stanoveny vnější vlivy prostředí (klasifikace AA-AG, BA-BD, CA-CB...)', 'Klasifikace odpovídá skutečnému prostředí instalace'],
      ['Určena odpovědná osoba za provoz elektrického zařízení', 'Osoba jmenována dle ČSN EN 50110-1'],
      ['Doporučena lhůta příští revize odpovídající prostředí a druhu objektu', 'Lhůta stanovena (byty/RD, prostory s nebezpečím výbuchu, staveniště apod.)'],
    ],
  },
  {
    kategorie: 'Vizuální kontrola (prohlídka)',
    norma: 'ČSN 33 2000-6 ed.2',
    clanek: 'čl. 6.4.3',
    vychozi: 'C2',
    radky: [
      ['Volba průřezu a typu vodičů/kabelů neodpovídá projektu a zatížení', 'Dle ČSN 33 2000-5-52, bez viditelného podhodnocení'],
      ['Barevné značení vodičů (N – modrý, PE – zelenožlutý) nedodrženo', 'Jednotné značení v celé instalaci'],
      ['Spoje, svorkovnice a šroubové spoje nejsou řádně dotaženy / stopy přehřátí', 'Žádné zčernalé/zdeformované svorky, zápach, koroze', 'C1'],
      ['Volba a nastavení ochranných a spínacích přístrojů neodpovídá projektu', 'Jmenovité hodnoty a charakteristiky dle dokumentace'],
      ['Instalace není rozdělena na samostatné obvody (osvětlení, zásuvky, spotřebiče)', 'Dle ČSN 33 2000-5-51 a projektu, bez svévolného slučování obvodů'],
      ['Rozváděče a obvody nejsou přístupné, trvale a čitelně označené', 'Popisky jističů/chráničů odpovídají skutečným obvodům', 'C3'],
      ['Volba zařízení a způsobu ochrany neodpovídá vnějším vlivům (vlhko, prach, mech. poškození)', 'Krytí IP a materiálové provedení odpovídající prostředí'],
      ['Jednopólové spínací přístroje nejsou zapojeny pouze ve fázovém vodiči', 'Spínání v N vodiči samostatným prvkem nepřípustné'],
      ['U rozváděčů chybí schémata, popisové štítky, výstražné tabulky', 'Minimálně základní schéma a identifikace napájené části', 'C3'],
      ['Vedení není mechanicky chráněno v ohrožených místech (zóny uložení v příčkách, prostupy)', 'Dle ČSN 33 2000-5-52, chráničky, dostatečná krycí vrstva'],
      ['Poškozená, zestárlá nebo hlodavci narušená izolace vodičů a kabelů', 'Bez mechanického/tepelného poškození plášťů a izolace', 'C1'],
      ['Hlavní a doplňkové ochranné pospojování není provedeno nebo přístupné', 'Viditelné propojení a svorky k dispozici pro kontrolu/měření'],
    ],
  },
  {
    kategorie: 'Ochrana před úrazem elektrickým proudem',
    norma: 'ČSN 33 2000-4-41 ed.3 + Z1, Z2',
    vychozi: 'C1',
    radky: [
      ['Základní ochrana – odkryté živé části, přístupné bez demontáže nástrojem', 'Žádné odkryté živé části v dosahu osob BA1'],
      ['Ochrana při poruše není zajištěna samočinným odpojením od zdroje', 'Funkční ochranný vodič + jisticí/chránicí prvek v obvodu'],
      ['Nedodrženy max. doby odpojení (tab. 41.1)', 'TN síť: 0,4 s (koncové obvody ≤32 A), 5 s (ostatní/rozvodné); TT síť: 0,2 s / 1 s při Uo=230 V – ověřit v aktuálním znění normy'],
      ['Podmínka Zs × Ia ≤ Uo není splněna pro chráněný obvod', 'Potvrzeno měřením impedance smyčky (viz oddíl 10)'],
      ['Chybí doplňková ochrana proudovým chráničem (RCD) IΔn ≤ 30 mA u zásuvek do 32 A pro laiky', 'Všechny běžně používané zásuvky v bytových a podobných prostorách'],
      ['Chybí doplňková ochrana RCD 30 mA u mobilních zařízení venku a ve vlhkých prostorách', 'Zahradní zásuvky, venkovní rozvody, dílny apod.'],
      ['Typ RCD neodpovídá charakteru zátěže (AC/A/F/B dle výskytu stejnosměrných složek)', 'Zejména u FV měničů, tepelných čerpadel, nabíječek EV – min. typ A, dle potřeby F/B', 'C2'],
      ['Hlavní i doplňkové ochranné pospojování není funkční a měřitelně propojeno', 'Nízký odpor spoje, kontinuita ověřena'],
      ['SELV/PELV obvody nejsou řádně oddělené od ostatních obvodů, nesprávné zdroje', 'Bez společných vodičů s obvody vyšších napětí'],
      ['Použita zakázaná/omezená ochranná opatření (ochrana polohou, nevodivým okolím) v běžných prostorách', 'Pouze v prostorách s omezeným přístupem BA5, nikoliv v bytech'],
    ],
  },
  {
    kategorie: 'Ochrana před nadproudem',
    norma: 'ČSN 33 2000-4-43 ed.3',
    vychozi: 'C2',
    radky: [
      ['Jmenovitý/nastavený proud jisticího přístroje nesplňuje IB ≤ In ≤ Iz', 'IB = výpočtový proud, Iz = dovolené zatížení vodiče'],
      ['Není splněna podmínka I2 ≤ 1,45 × Iz (pro vodiče PVC, jinak dle výrobce kabelu)', 'I2 = proud zajišťující automatické působení jisticího přístroje'],
      ['Vypínací schopnost (Icn/Icu) jisticích přístrojů je nižší než předpokládaný zkratový proud', 'Doloženo výpočtem/tabulkou výrobce rozváděče', 'C1'],
      ['Není zajištěna selektivita jištění mezi stupni (hlavní jistič – podružné jističe)', 'Při poruše vypadne jen nejblíže postižený obvod', 'C3'],
      ['Jisticí přístroj není umístěn na začátku obvodu, popř. v místě změny průřezu/vnějších vlivů', 'Výjimky dle ČSN 33 2000-4-43 zdokumentovány'],
      ['Charakteristika jističe (B/C/D) neodpovídá druhu zátěže (rázové proudy motorů apod.)', 'Bez zbytečného falešného vybavování ani podhodnocení', 'C3'],
    ],
  },
  {
    kategorie: 'Ochrana před přepětím',
    norma: 'ČSN 33 2000-4-443 ed.3 / 4-444',
    vychozi: 'C2',
    radky: [
      ['Neposouzena nutnost instalace přepěťových ochran (SPD) dle rizika objektu', 'Zejména u objektů s hromosvodem, FVE, venkovním přívodem'],
      ['Neinstalovány SPD odpovídajícího typu/třídy (T1/T2/T3) na vstupu a u citlivých zařízení', 'Umístění a kombinace dle projektu a pokynů výrobce'],
      ['Zapojení a jištění SPD neodpovídá návodu výrobce, stavová indikace SPD signalizuje poruchu', 'SPD nevybavený / bez signalizace poruchy'],
      ['Chybí opatření proti elektromagnetickému rušení (oddělení silových a datových vedení)', 'Dle ČSN 33 2000-4-444, zejména u citlivých/datových rozvodů', 'C3'],
    ],
  },
  {
    kategorie: 'Výběr a stavba vedení',
    norma: 'ČSN 33 2000-5-52 ed.3',
    vychozi: 'C2',
    radky: [
      ['Způsob uložení vedení nezohledněn v dimenzování (referenční způsob uložení, součinitele)', 'Součinitele pro seskupení, teplotu okolí, uložení v izolaci apod. zohledněny'],
      ['Dovolené zatížení (Iz) neodpovídá skutečnému způsobu uložení a seskupení více okruhů', 'Použity korekční součinitele dle počtu okruhů/kabelů vedle sebe'],
      ['Chybí mechanická ochrana vedení uloženého v konstrukcích (zóny uložení v podlaze/zdi)', 'Vodorovné/svislé zóny dle ČSN 33 2000-5-52, chráničky v nechráněných trasách'],
      ['Kabelové trasy nejsou řádně upevněny, dilatace a mechanické namáhání neošetřeny', 'Bez průvěsu, napětí v kabelu nebo poškození úchytů', 'C3'],
      ['Spoje a odbočky nejsou provedeny v krabicích/svorkovnicích nebo nejsou přístupné pro revizi', 'Žádné nekrytované spoje v dutinách konstrukcí'],
    ],
  },
  {
    kategorie: 'Uzemnění a ochranné vodiče',
    norma: 'ČSN 33 2000-5-54 ed.3',
    vychozi: 'C2',
    radky: [
      ['Průřez ochranného vodiče PE neodpovídá tabulce dle průřezu fázového vodiče S', 'S≤16 mm²: Sp=S; 16<S≤35 mm²: Sp=16 mm²; S>35 mm²: Sp=S/2 (stejný materiál) – ověřit s normou'],
      ['Nedodržen minimální průřez samostatného ochranného vodiče', 'Orientačně 2,5 mm² Cu (mechanicky chráněný) / 4 mm² Cu (nechráněný) – ověřit s normou'],
      ['Spojitost ochranných vodičů a hlavního pospojování není ověřena / přerušení', 'Bez přerušení, koroze na spojích', 'C1'],
      ['Barevné označení PE (zelenožlutá) a N (modrá) není jednotně dodrženo', 'V celé instalaci včetně rozváděčů'],
      ['Uzemňovací soustava (zemnič) není v dobrém technickém stavu, zkušební svorky nepřístupné', 'Vizuálně bez koroze, přerušení, uvolnění spojů'],
      ['Hodnota zemního odporu uzemnění nevyhovuje požadavku na ochranu (dle typu sítě)', 'U TT sítě orientačně Ra × Ia ≤ 50 V (resp. hodnota dle použité ochrany) – ověřit výpočtem', 'C1'],
      ['Hlavní ochranná přípojnice (HOP) neobsahuje všechny požadované vodivé části', 'Vodovod, plyn (přes izolační vložku), konstrukce, zemnící páska, stínění apod.'],
    ],
  },
  {
    kategorie: 'Spínací, řídicí přístroje a rozváděče',
    norma: 'ČSN 33 2000-5-51 ed.3 / 5-53 ed.3',
    vychozi: 'C2',
    radky: [
      ['Rozváděč neodpovídá požadavkům ČSN EN 61439 nebo nemá výrobní štítek', 'Jmenovité hodnoty, výrobce, rok výroby dohledatelné'],
      ['Vícepólové přístroje nespínají všechny póly mechanicky spojeně', 'Platí pro 2P/3P/4P přístroje v obvodech s více fázemi'],
      ['V nulovém (středním) vodiči je samostatný spínací prvek, kde to není přípustné', 'Samostatné odpojení N bez odpojení fází zásadně nepřípustné', 'C1'],
      ['Nastavení ochran (tepelné/zkratové spouště) neprovedeno osobou BA4/BA5', 'Hodnoty odpovídají projektu, zaplombováno/zdokumentováno'],
      ['Hlavní vypínač/odpojovač není přístupný, funkční a správně značený', 'Rychlé a bezpečné odpojení celé instalace možné'],
      ['Krytí rozváděče (IP) neodpovídá prostředí instalace', 'Např. venkovní/vlhké prostory min. IP44/IP54 dle umístění'],
      ['Rozváděč nemá EU prohlášení o shodě nebo není označen jménem výrobce sestavy', 'Dle ČSN EN IEC 61439-1 ed.3 – soulad štítku se skutečným výrobcem sestavy', 'C3'],
      ['Chybí dokumentace návrhového i kusového (routinního) ověření rozváděče', 'Kusové ověření doloženo pro konkrétní kus, nejen obecný typový protokol', 'C3'],
      ['Záměny komponent (jistič, přípojnice, svorkovnice) oproti návrhu nejsou doloženy jako povolené', 'Záměna bez souhlasu původního výrobce = ztráta krytí návrhovým ověřením'],
      ['Dodatečné úpravy rozváděče v provozu (přidaný obvod, zásuvka, měnič) neposouzeny z hlediska oteplení a zkratové odolnosti', 'Posouzení zdokumentováno, nejen vizuální přidání komponenty'],
    ],
  },
  {
    kategorie: 'Osvětlovací soustavy',
    norma: 'ČSN 33 2000-5-559 ed.2',
    vychozi: 'C2',
    radky: [
      ['Svítidla neodpovídají vnějším vlivům prostředí (krytí IP, teplotní třída)', 'Zejména koupelny, venkovní prostory, sklady hořlavin'],
      ['Nedodrženy bezpečné vzdálenosti svítidel od hořlavých materiálů', 'Dle údajů výrobce svítidla', 'C1'],
      ['Nouzové osvětlení (je-li vyžadováno) není funkční nebo samostatně jištěno', 'Únikové cesty, shromažďovací prostory dle PBŘ'],
    ],
  },
  {
    kategorie: 'Zkoušení a měření při revizi',
    norma: 'ČSN 33 2000-6 ed.2',
    clanek: 'čl. 6.4.4',
    vychozi: 'C2',
    radky: [
      ['Spojitost ochranných a pospojovacích vodičů neověřena nebo nevyhovuje (odpor, obě polarity)', 'Nízký, stabilní odpor bez výkyvů při měření', 'C1'],
      ['Izolační odpor instalace mezi živými vodiči a PE/zemí nevyhovuje', '≥0,5 MΩ při 250 V (SELV/PELV); ≥1,0 MΩ při 500 V (do 500 V); ≥1,0 MΩ při 1000 V (500-1000 V) – ověřit s normou', 'C1'],
      ['Impedance smyčky poruchového proudu Zs nezměřena nebo nevyhovuje požadavku tab. 41.1', 'Zs ≤ 2×Uo/(3×Ia); naměřenou hodnotu násobit součinitelem cca 1,2 (teplota/přesnost přístroje)', 'C1'],
      ['Proudový chránič testován pouze tlačítkem TEST, ne přístrojem vlnovým tvarem odpovídajícím jeho typu', 'Tlačítko TEST ověří jen mechaniku vypínání, neměří vybavovací proud/čas ani nezjistí ztrátu citlivosti na DC – nutné měření dle ČSN EN IEC 61557-6 ed.3'],
      ['Vybavovací proud chrániče mimo meze normy dle typu vlny', 'Sinusový: 0,5–1,0×IΔn; pulzující DC: cca 0,35–1,4×IΔn dle fázového úhlu; hladký DC (typ B): 0,5–2,0×IΔn – ověřit s normou/přístrojem', 'C1'],
      ['Vybavovací čas chrániče mimo meze normy', 'Obecný typ: ≤300 ms při IΔn, ≤40 ms při 5×IΔn; typ S (selektivní): 130–500 ms při IΔn', 'C1'],
      ['Typ chrániče (AC/A/F/B) neodpovídá skutečné zátěži / není ověřen z dokumentace spotřebiče', 'Zejména střídače FVE, tepelná čerpadla (1f obvykle F, 3f obvykle B), nabíječky EV, frekvenční měniče – nespoléhat jen na písmeno na štítku'],
      ['Chránič typu A zapojen za chráničem typu B (zaslepení DC)', 'Topologie ochrany posouzena jako celek, ne jednotlivý přístroj izolovaně'],
      ['U nabíjecího bodu EV neověřena funkce DC reziduální ochrany (RDC-DD) zkouškou', 'Adaptérem simulujícím vozidlo vpustit hladký DC lehce nad 6 mA – wallbox musí odpojit přívod (ČSN 33 2000-7-722 ed.3, IEC 62955)'],
      ['Zemní odpor uzemňovací soustavy neměřen nebo nevyhovuje', 'Hodnota odpovídá výpočtu/požadavku ochrany pro daný typ sítě', 'C1'],
      ['Zkouška polarity – záměna L/N/PE na zásuvkách, svítidlech, spotřebičích', 'Bez záměny fáze a nulového/ochranného vodiče', 'C1'],
      ['Neověřen sled fází u třífázových rozvodů a zařízení citlivých na směr otáčení', 'Zejména motory, výtahy, klimatizace'],
      ['Funkční zkouška spínacích, blokovacích a signalizačních zařízení nevyhovuje', 'Ovládací a bezpečnostní prvky reagují dle návrhu'],
      ['Úbytek napětí na vedení překračuje meze doporučené normou', 'Orientačně do 3 % (osvětlení) / 5 % (ostatní spotřebiče) od napájecího bodu – ověřit s normou', 'C3'],
    ],
  },
  {
    kategorie: 'Koupelny a sprchy',
    norma: 'ČSN 33 2000-7-701 ed.3',
    vychozi: 'C1',
    radky: [
      ['Nedodrženy rozměry a rozsah zón 0, 1 a 2', 'Zóna 1: nad vanou do 225 cm, u sprchy 120 cm od pevné sprchové hlavice; zóna 2: navazující pásmo šířky 60 cm', 'C2'],
      ['V zóně 0 je jiné zařízení než určené výrobcem do vany/vaničky s krytím min. IPX7', 'Žádné jiné elektrické zařízení'],
      ['V zóně 1 je zásuvka 230 V nebo zařízení jiné než SELV / s krytím pod IPX4', 'Platí i pro vestavné osvětlení apod.'],
      ['V zóně 2 je zásuvka 230 V nebo obvod jiný než SELV/PELV s krytím min. IPX4', 'Výjimka: holicí zásuvka přes oddělovací transformátor'],
      ['Běžná zásuvka 230 V je blíže než 60 cm od okraje vany/sprchového prostoru', 'Nad umyvadlem min. 120 cm nad podlahou, nebo min. 20 cm od boku umývací plochy', 'C2'],
      ['Obvod v koupelně není chráněn proudovým chráničem IΔn ≤ 30 mA', 'Bez výjimky i pro vyhrazený okruh bojleru/pračky (zpřísněno od 6/2025)'],
      ['Pračka, bojler, sušička apod. nejsou na samostatném obvodu s vlastním jištěním', 'Doporučeno i samostatné RCD pro každý spotřebič', 'C3'],
      ['Chybí doplňkové ochranné pospojování všech dostupných neživých a cizích vodivých částí', 'Potrubí, vana, konstrukce, zásuvka PE – propojeno a funkční', 'C2'],
    ],
  },
  {
    kategorie: 'Sauny',
    norma: 'ČSN 33 2000-7-703 ed.2',
    vychozi: 'C1',
    radky: [
      ['V prostoru sauny jsou instalovány zásuvky', 'Platí pro celou vytápěnou kabinu'],
      ['Spínací a řídicí přístroje (mimo ovládání kamen) jsou v prostoru sauny', 'Spínače, jističe v předsíni / u rozváděče', 'C2'],
      ['Kabeláž v zóně kolem kamen není odolná vysoké teplotě (izolace min. 170 °C) / má kovové opláštění', 'Ověřit dle aktuálního značení zón v platném znění normy'],
      ['Zařízení v dosahu kamen s krytím nižším než IP24', 'Vč. svítidel a čidel', 'C2'],
      ['Chybí nebo nefunguje teplotní omezovač/pojistka kamen', 'Odpojí přívod při překročení dovolené teploty (orientačně cca 140 °C) – ověřit dle typu kamen'],
      ['Svítidla a ostatní zařízení nejsou odolná vlhku a vysoké teplotě dle pokynů výrobce', 'Vč. ovládacích prvků a čidel vlhkosti', 'C2'],
    ],
  },
  {
    kategorie: 'Povinnosti revizního technika',
    norma: 'Praxe / judikatura (ne přímo ČSN)',
    vychozi: 'C3',
    radky: [
      ['Instalace nebyla před vypracováním zprávy fyzicky prohlédnuta revizním technikem', 'Nikdy nepopisovat zařízení jen podle projektu nebo tvrzení zákazníka'],
      ['Datum prohlídky, datum vydání zprávy a skutečný stav instalace si neodpovídají', 'Zejména u nedokončených instalací / tlaku na termín (kolaudace, prodej, licence)'],
      ['Rozsah revize není přesně vymezen v nadpisu i závěru zprávy, u částečné revize nejsou vyjmenovány vyloučené části a důvod', 'Vágní rozsah prezentovaný jako úplná revize je rizikový'],
      ['Naměřené hodnoty nejsou zapsány v tabulce s identifikací přístroje a jeho kalibrace', 'Měřící přístroje mají platnou kalibraci/ověření'],
      ['Chybí fotodokumentace rozváděčů, uzemnění a štítků s časovým razítkem', 'Důkazní materiál pro případ pozdějšího sporu'],
      ['Zpráva vydána na nedokončenou nebo nepřístupnou instalaci pod tlakem termínu', 'Netýká se jen FVE – platí obecně'],
      ['Míra obezřetnosti neodpovídá účelu zprávy (kolaudace, připojení, prodej, pojištění)', 'Zpráva použitá k úřednímu řízení vyžaduje vyšší obezřetnost'],
      ['Technik nemá platné oprávnění/osvědčení (§6 apod.) nebo profesní pojistku odpovídající rozsahu zakázek', 'Oprávnění lze úřadem práce/inspekcí omezit nebo odebrat'],
      ['Zpráva, naměřené hodnoty a fotodokumentace nejsou archivovány po dobu odpovídající možné odpovědnosti', 'Podklady musí obstát i při zpětné kontrole po letech'],
    ],
  },
];

/** Kontrolní body závadovníku převedené na položky katalogu závad (č. 1–101). */
export function getZavadovnikZavady(): Omit<ZavadaKatalog, 'id' | 'createdAt' | 'updatedAt'>[] {
  let cislo = 0;
  return SEKCE.flatMap((s) =>
    s.radky.map(([popis, pozadavek, zavaznost]) => {
      cislo += 1;
      return {
        popis,
        zavaznost: zavaznost ?? s.vychozi,
        norma: s.norma,
        clanek: s.clanek ?? `závadovník, bod ${cislo}`,
        zneniClanku: `Požadavek / limitní hodnota: ${pozadavek}`,
        kategorie: s.kategorie,
      };
    })
  );
}
