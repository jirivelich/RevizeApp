Prompt pro redesign RevizeAppWeb - Electric Professional Koncept
Použij tento prompt pro Claude Sonnet k aplikaci nového designu:

ÚKOL: Aplikuj nový design system "Electric Professional" do RevizeAppWeb
Kontext
Pracuji na React/TypeScript PWA aplikaci RevizeAppWeb pro správu elektrických revizí. Potřebuji aplikovat nový designový koncept "Electric Professional" do existujících komponent.
Nový Design System - Electric Professional
Barevná paleta (Light mode)
typescript// Primary Colors
--electric-blue: #0052CC;
--electric-blue-dark: #003D99;
--electric-blue-light: #0065FF;
--electric-glow: rgba(0, 82, 204, 0.15);

// Accent Colors
--amber: #FF8F00;
--amber-dark: #E67E00;
--amber-light: #FFA726;
--amber-glow: rgba(255, 143, 0, 0.12);

// Neutrals (Cool Gray)
--gray-950: #0A0E14;
--gray-900: #151B26;
--gray-800: #1F2937;
--gray-700: #374151;
--gray-600: #4B5563;
--gray-500: #6B7280;
--gray-400: #9CA3AF;
--gray-300: #D1D5DB;
--gray-200: #E5E7EB;
--gray-100: #F3F4F6;
--gray-50: #F9FAFB;

// Semantic Colors
--success: #00B341;
--success-bg: rgba(0, 179, 65, 0.1);
--warning: #FF8F00;
--warning-bg: rgba(255, 143, 0, 0.12);
--error: #E53E3E;
--error-bg: rgba(229, 62, 62, 0.1);
--info: #0052CC;
--info-bg: rgba(0, 82, 204, 0.15);

// Surfaces
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;
--surface: #FFFFFF;

// Borders
--border-subtle: #E5E7EB;
--border-default: #D1D5DB;
--border-strong: #9CA3AF;

// Text
--text-primary: #151B26;
--text-secondary: #4B5563;
--text-tertiary: #6B7280;
--text-inverse: #FFFFFF;

// Shadows
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-electric: 0 4px 20px rgba(0, 82, 204, 0.2);
--shadow-amber: 0 4px 20px rgba(255, 143, 0, 0.2);
Dark Mode
typescript--electric-blue: #2B88FF;
--electric-blue-dark: #1E6FE6;
--electric-blue-light: #4D9FFF;
--electric-glow: rgba(43, 136, 255, 0.2);

--amber: #FFB74D;
--amber-dark: #FFA726;

--bg-primary: #0A0E14;
--bg-secondary: #151B26;
--bg-tertiary: #1F2937;
--surface: #151B26;

--border-subtle: rgba(255, 255, 255, 0.06);
--border-default: rgba(255, 255, 255, 0.1);
--border-strong: rgba(255, 255, 255, 0.15);

--text-primary: #F3F4F6;
--text-secondary: #9CA3AF;
--text-tertiary: #6B7280;
Typografie
typescript--font-display: 'Archivo', sans-serif;  // nebo 'Inter', 'Plus Jakarta Sans'
--font-mono: 'JetBrains Mono', monospace;
Border Radius
typescript--radius-sm: 0.375rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;
Design Principy

Electric Blue jako primární akce

Hlavní CTA tlačítka, odkazy, focus stavy
Indikátory aktivního stavu


Amber pro varování a důležité akce

Tlačítko "Označit závadu"
Warning stavy
Urgent akce


Sémantické barvy pro stavy revizí

Success (zelená): Vyhovuje
Warning (amber): Zjištěny závady
Error (červená): Nevyhovuje
Info (modrá): Probíhá kontrola


Shadows a elevation

Použij shadow-electric pro primary akce
shadow-amber pro warning akce
shadow-md pro základní karty
shadow-lg pro modaly a důležité elementy



Co potřebuji změnit
Soubor: [ZDE VLOŽ CESTU K SOUBORU]
Konkrétní úkol: [VYBER JEDNU Z MOŽNOSTÍ NÍŽE]
Možnost A: Kompletní theme soubor
Přepiš můj současný themes.ts soubor s novým Electric Professional designem. Zachovej strukturu (dark/light themes), ale aplikuj všechny nové barvy a hodnoty.
Možnost B: Konkrétní komponenta
Upravit komponentu [NÁZEV KOMPONENTY] - aplikuj nové barvy, shadows, border-radius podle design systému výše.
Zajisti:

Správné použití CSS proměnných
Hover/active/focus stavy
Dark mode support
Semantic použití barev (primary/warning/success/error)

Možnost C: CSS/Tailwind konfigurace
Vytvořit Tailwind config nebo CSS variables soubor s novým designem.

INSTRUKCE PRO CLAUDE

Zachovej strukturu kódu - pouze měň hodnoty barev, shadows, fonts
Aplikuj všechny stavy - hover, active, focus, disabled
Dark mode - zajisti, že funguje korektně s oběma tématy
TypeScript typy - zachovej nebo uprav podle potřeby
Komentáře - přidej komentáře k semantic použití barev


Příklady použití
Tlačítka
tsx// Primary action
className="bg-[var(--electric-blue)] hover:bg-[var(--electric-blue-dark)] 
           text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-electric)]"

// Warning action  
className="bg-[var(--amber)] hover:bg-[var(--amber-dark)] 
           text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-amber)]"

// Secondary
className="bg-transparent border-[1.5px] border-[var(--border-strong)] 
           text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
Status Badges
tsx// Success
className="bg-[var(--success-bg)] text-[var(--success)]"

// Warning
className="bg-[var(--warning-bg)] text-[var(--amber-dark)]"

// Error
className="bg-[var(--error-bg)] text-[var(--error)]"

// Info
className="bg-[var(--info-bg)] text-[var(--electric-blue)]"
Cards
tsxclassName="bg-[var(--surface)] border border-[var(--border-default)] 
           rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]
           hover:shadow-[var(--shadow-lg)] hover:border-[var(--electric-blue)]"

OUTPUT FORMÁT
Poskytni:

Kompletní upravený kód souboru
Seznam změn - co bylo upraveno
Použití - jak aplikovat změny do projektu
Testing checklist - co ověřit po aplikaci