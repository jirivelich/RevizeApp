# Analýza projektu RevizeApp

## 1. Cíl dokumentu
Tento soubor shrnuje první profesionální analýzu projektu a rozdělení do oblastí pro další práci. Slouží jako výstup pro návrat k priorizovaným úkolům a další hlubší analýzu.

---

## 2. Struktura projektu

### Frontend
- Hlavní aplikace je v adresáři src
- Zde jsou položeny hlavní stránky, komponenty, služby a kontexty
- Klíčové vstupní body:
  - src/App.tsx
  - src/components/Layout.tsx
  - src/pages
  - src/services
  - src/hooks

### Backend
- Backend je v adresáři server
- Zajišťuje autentizaci, API, integrace a práci s daty
- Klíčové vstupní body:
  - server/server.ts
  - server/database.ts
  - server/auth.ts
  - server/ai.ts
  - server/googleCalendar.ts

### Offline / synchronizace
- Projekt má zvláštní vrstvu pro práci offline a synchronizaci dat
- Relevantní soubory:
  - src/services/database.ts
  - src/hooks/useOfflineQueue.ts

### Exporty a tisk
- Projekt obsahuje speciální podsystémy pro tisk, exporty a reporty
- Relevantní adresáře:
  - src/pages/ReportPrint
  - src/pages/HromosvodPrint
  - src/pages/StrojniZarizeniPrint

---

## 3. Co funguje dobře

### Silné stránky
- Projekt má jasně rozdělené hlavní moduly
- Je zde přehledná navigace a logické oddělení funkcí
- Vznikl moderní vizuální styl a konzistentní design systém
- Aplikace má základ pro responzivní UI a offline režim
- Existují testy a základní UI komponenty

### Pozitivní signál
V kódu je patrná snaha o:
- oddělené služby pro API a databázi
- použití React Query pro práci s daty
- vlastní design proměnné a komponenty
- rozdělení funkcionality do oblastí

---

## 4. Hlavní slabiny a rizika

### 4.1 Nejednotná architektura datových operací
Největší problém je v kombinaci více přístupů k datům:
- src/services/api.ts
- src/services/database.ts
- src/hooks/useQueries.ts

Toto vytváří riziko:
- nejednotného chování mezi API a cache
- problémů při offline režimu
- složitějšího rozšiřování funkcí
- vyšší obtížnosti testování

### 4.2 Autorizace je rozptýlená
Autorizace je řešena v několika místech:
- src/components/ProtectedRoute.tsx
- src/services/api.ts
- src/services/database.ts

Dopad:
- přihlašovací logika není plně konzistentní
- chování při chybě a při ztrátě sítě je kusé
- riziko nejasných stavů pro uživatele

### 4.3 Detail revize je příliš komplexní
Součásti:
- src/pages/RevizeDetailPage.tsx
- src/pages/RevizeDetail

Tato vrstva obsahuje mnoho funkcionalit najednou:
- formulářová data
- UI prvky
- AI funkce
- exporty
- práce s tabulkami a sekcemi

Dopad:
- obtížné udržování
- vyšší riziko chyb při změnách
- nepřehledné rozšiřování

### 4.4 Exporty a tisk jsou zranitelné
Adresáře:
- src/pages/ReportPrint
- src/pages/HromosvodPrint
- src/pages/StrojniZarizeniPrint

Tyto části jsou velmi specializované a závislé na konkrétním formátu dat. Jsou náchylné k problémům při:
- změně dat
- změně layoutu
- různých prohlížečích
- exportu do Wordu/PDF

### 4.5 UX a funkčnost tlačítek není zcela jednotná
V aplikaci se stále objevují:
- alert/confirm prvky
- různé způsoby potvrzení akcí
- moc funkcionality v jednom prostoru
- ne vždy konzistentní feedback po akci

Dopad:
- aplikace funguje, ale není vždy komfortní
- uživatel se může ztratit v pracovním toku

---

## 5. Navaznosti mezi moduly

### Revize ↔ rozvaděče ↔ okruhy ↔ závady
Toto je hlavní funkcionalita systému. Revize obsahuje rozvaděče, rozvaděče obsahují okruhy a závady jsou s těmito objekty propojené.

### Revize ↔ nastavení ↔ historie technika
Nastavení a historie technika jsou propojeny s revizí, protože se do ní často načítají údaje o revizním technikovi.

### Revize ↔ exporty / tisk
Revize jsou zdrojem dat pro reporty, exporty a dokumentaci.

### Revize ↔ plánování / zakázky
Plánování a zakázky mají vztah k revizím a jsou důležitou součástí workflow.

### Frontend ↔ backend ↔ offline cache
Toto je centrální integrace projektu. Zde je nejvíce potřeba kontrolovat závislosti a stabilitu.

---

## 6. Design a UX

### Co je dobré
- moderní vizuální styl
- konzistentní barevná paleta
- přehledná sidebar
- responzivní rozložení
- decentní použití glassmorphism a moderních prvků

### Co je slabé
- některé části působí příliš „feature-heavy“ a ne dost „clean workflow“
- detail revize je příliš zatížený
- formuláře a modální okna nejsou vždy konzistentní
- potvrzovací dialogy jsou někdy příliš surové

### Závěr pro design
Design má dobrý základ, ale potřebuje:
- sjednocení pracovního toku
- méně chaosu v detailu revize
- lepší kontextové rozhraní pro často používané akce
- méně „surových“ potvrzení a více polished UX

---

## 7. Tlačítka a funkčnost

### Tlačítka, která vypadají dobře
- hlavní tlačítka v src/components/ui/Button.tsx jsou konzistentní
- navigační tlačítka v src/components/Sidebar.tsx jsou přehledná
- modální okna v src/components/ui/Modal.tsx fungují jako stabilní základ

### Tlačítka a akce, které jsou rizikové
- detail revize má mnoho akcí ve stejném prostoru
- mazání a duplikace revizí jsou spojeny s potvrzeními
- některé akce spouští exporty bez dostatečného feedbacku

### Praktický závěr
Funkčnost tlačítek je většinou správná, ale jejich UX a kontext nejsou dostatečně jednotné.

---

## 8. Doporučené rozdělení pro další analýzu

### 1. Architektura dat a state management
- API služby
- React Query
- offline cache
- synchronizace

### 2. Autorizace a session management
- přihlášení
- token
- ochrana stránek
- chování při ztrátě sítě

### 3. Revizní workflow
- vytváření revizí
- editace detailu
- propojení sekcí
- práce s rozvaděči, okruhy a závadami

### 4. Exporty a tisk
- PDF/Word
- report print
- hromosvod print
- strojní print

### 5. UI/UX a komponenty
- tlačítka
- modální okna
- sidebar
- responzivita
- formuláře

### 6. Backend a integrace
- API endpointy
- databázová vrstva
- AI funkce
- Google Calendar

### 7. Testovatelnost a kvalita
- testy
- chybové stavy
- edge cases
- robustnost při online/offline

---

## 9. Nejvyšší priorita problémů

### Priorita 1
- sjednotit práci s daty mezi API, cache a React Query
- zjednodušit detail revize
- omezit nečisté závislosti mezi moduly

### Priorita 2
- zlepšit autorizaci a přesměrování
- sjednotit chování při offline režimu
- přepsat nejproblematičtější části exportů

### Priorita 3
- vylepšit UX tlačítek a potvrzení
- redukovat množství funkcí v jednom detailu
- zlepšit přehlednost workflow

---

## 10. Druhá fáze analýzy – konkrétní zjištění

### 10.1 Co nejčastěji nefunguje nebo je nejrizikovější
- Datová vrstva je největší slabinou projektu. Dochází k rozporům mezi API, lokální databází a cache.
- Autorizace a přesměrování nejsou plně konzistentní, zejména při chybě, ztrátě sítě a přechodu mezi stavy.
- Detail revize je příliš zatížený funkcemi a je obtížné ho rozšiřovat bez vedlejších chyb.
- Exporty a tisk jsou náchylné k problému při změně struktury dat nebo layoutu.
- Offline workflow má správný základ, ale chybí jednotný a snadno testovatelný tok synchronizace.

### 10.2 Navaznosti, které je potřeba pravidelně kontrolovat
- Revize → rozvaděče → okruhy → závady
- Revize → nastavení → historie technika
- Revize → exporty a tisk
- Frontend → backend → offline cache

### 10.3 Design a UX z pohledu druhé fáze
- Design má dobrý základ, ale pracovní tok v některých částech působí chaoticky.
- Tlačítka a akce nejsou vždy v jasném kontextu a chybí jednotný pattern pro potvrzení.
- Detail revize je místem, kde se nejvíc projevuje „feature-heavy“ přístup a ztráta přehlednosti.
- Pro uživatele je potřeba více jasného feedbacku po akci, zejména u mazání, exportu a změny stavu.

### 10.4 Priorita oprav v druhé fázi
1. Sjednotit datovou vrstvu a přístup k datům.
2. Zjednodušit detail revize na menší logické bloky.
3. Opravit auth, session a chování při offline režimu.
4. Zlepšit UX tlačítek, potvrzení a přehlednost workflow.
5. Refaktorovat exporty a tisk tak, aby byly méně závislé na přesné struktuře dat.

### 10.5 Praktický závěr druhé fáze
Projekt je funkční, ale jeho hlavní problém už není „nefunguje vůbec“, nýbrž to, že je rozdělený do příliš propojených částí. Pro další rozvoj je potřeba přejít od ad hoc změn k jasnějšímu architektonickému a UX modelu.

---

## 11. Třetí fáze analýzy – revizní modul a datová vrstva

### 11.1 Cíl třetí fáze
Třetí fáze se zaměřuje na dvě klíčové oblasti, které jsou největším zdrojem rizika:
- revizní modul jako nejkomplexnější část workflow,
- datová vrstva jako místo, kde se nejčastěji propojují frontend, backend a offline režim.

### 11.2 Revizní modul – co rozebrat detailně
- rozložení funkčnosti v detailu revize,
- vztahy mezi revizí, rozvaděči, okruhy a závadami,
- stavové přechody a ukládání dat,
- tlačítka a akce v jednom modulu,
- kde je největší zátěž pro uživatele a kde se nejčastěji vyskytují problémy.

### 11.3 Datová vrstva – co rozebrat detailně
- rozdíl mezi API, lokální databází a cache,
- tok dat při načítání, ukládání a synchronizaci,
- kde dochází k nejednotnosti mezi online a offline režimem,
- jak jsou propojeny služby v src/services a hooks,
- které operace by měly být sjednoceny do jednoho jasného modelu.

### 11.4 Očekávaný výstup třetí fáze
Po dokončení třetí fáze by měl vzniknout:
- přehled problémů v revizním modulu,
- přehled problémů v datové vrstvě,
- seznam konkrétních slabin a jejich pravděpodobných příčin,
- návrh priorit pro refaktor nebo opravy.

---

## 12. Akční plán na další kroky

### 12.1 Cíl akčního plánu
Převést zjištění z analýzy do konkrétních kroků, které lze implementovat postupně bez ztráty stability aplikace.

### 12.1a Stav implementace k dnešnímu dni
- [x] Mapování datových toků — zjištěno, kde se data načítají, ukládají a synchronizují; identifikovány rozporové body v datové vrstvě.
- [x] Definice jediné datové cesty — vytvořen společný HTTP helper a refaktorována hlavní služba pro práci s daty.
- [ ] Oprava autorizace a stavů — zatím neimplementováno.
- [ ] Rozdělení monolitického detailu revize — zatím neimplementováno.
- [ ] Standardizace potvrzovacích dialogů — zatím neimplementováno.

### 12.2 Priorita 0 – stabilizace základů
Cílem je odstranit největší zdroj rizika: nejednotný přístup k datům a stavům.

1. Mapování datových toků
- [x] zjistit, kde se data načítají, ukládají a synchronizují,
- [x] porovnat chování v frontendových službách a v offline vrstvě,
- [x] identifikovat přesně, kde dochází k rozporům mezi API, cache a lokální databází.

2. Definice jediné datové cesty
- [x] vybrat jeden hlavní model pro práci s revizními daty,
- [x] sjednotit načítání a ukládání přes jednu vrstvu,
- [x] omezit přímé závislosti mezi jednotlivými moduly.

3. Oprava autorizace a stavů
- sjednotit přístup k tokenu a session chování,
- vyřešit konzistentní chování při chybě, ztrátě sítě a přesměrování,
- doplnit jasné loading, error a empty stavy.

### 12.3 Priorita 1 – refaktor revizního modulu
Cílem je zjednodušit detail revize a snížit náročnost údržby.

1. Rozdělení monolitického detailu revize
- rozdělit stránku na menší logické bloky: přehled, rozvaděče, okruhy, závady, akce,
- přesunout část logiky do samostatných komponent,
- oddělit UI od obchodní logiky.

2. Zajištění jasného workflow
- sjednotit způsob ukládání změn,
- zavést přehledný stav pro jednotlivé akce,
- zjednodušit tlačítka a jejich kontext.

3. Oprava kritických akcí
- mazání, duplikace, export a změna stavu mají být potvrzovány jednotně,
- každá hlavní akce musí mít jasný feedback.

### 12.4 Priorita 2 – sjednocení UX a interakcí
Cílem je zlepšit komfort práce a snižovat nejasnosti.

1. Standardizace potvrzovacích dialogů
- používat jeden konzistentní pattern pro potvrzení akcí,
- vyhnout se zbytečným alertům a nejednoznačným potvrzením.

2. Vylepšení feedbacku po akcích
- loading, success a error stavy pro všechny důležité akce,
- jasnější indikace, co se právě děje.

3. Přehlednější navigace a kontext
- přesunout často používané akce do jasně definovaných míst,
- zlepšit přehlednost v detailu revize a v hlavní navigaci.

### 12.5 Priorita 3 – exporty a tisk
Cílem je zredukovat riziko při změně struktury dat nebo layoutu.

1. Oddělení logiky exportu od UI
- přesunout exportní logiku do samostatných služeb,
- oddělit formátování dat od komponent prezentace.

2. Zajištění stability exportů
- připravit testy pro hlavní typy exportů,
- vyřešit fallback chování při chybě vstupních dat.

3. Zjednodušení práce s šablonami
- přesně definovat, jaká data export potřebuje,
- vyhnout se přímo závislým transformacím na konkrétním rozložení komponent.

### 12.6 Doporučený sled prací
1. Datová vrstva a autorizace
2. Revizní modul
3. UX a potvrzovací workflow
4. Exporty a tisk
5. Testy a stabilita

### 12.7 Kriterium úspěchu
Akční plán je považován za úspěšný, pokud:
- je jasně sjednocen přístup k datům,
- detail revize je lépe strukturovaný a snáze udržitelný,
- uživatel dostává jasný feedback po akcích,
- kritické cesty fungují stabilněji i při chybě nebo offline režimu.

---

## 13. Závěr
Projekt má dobrý základ, ale je patrné, že se vyvíjel po částech a některé vrstvy nejsou dostatečně sjednocené. Hlavní slabiny nejsou v tom, že by aplikace nefungovala, ale v tom, že je rozptýlená, má silně propojené oblasti a její správu a rozvoj ztěžuje nejednotný přístup k datům a stavu.
