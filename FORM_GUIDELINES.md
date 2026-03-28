# Formulářové vzory – RevizeAppWeb

Tento dokument popisuje konzistentní pravidla pro tvorbu formulářů v aplikaci.

---

## 1. UI komponenty

Všechny formuláře používají sdílené komponenty z `src/components/ui/`:

| Komponenta | Popis | Klíčové props |
|---|---|---|
| `Input` | Textový / číselný vstup | `label`, `error`, `type`, `required`, `placeholder` |
| `Select` | Výběr z možností | `label`, `error`, `options: {value, label}[]` |
| `Button` | Akční tlačítko | `variant` (`primary`/`secondary`/`success`/`danger`/`warning`), `size` (`sm`/`md`/`lg`) |
| `Modal` | Modální okno | `isOpen`, `onClose`, `title`, `footer`, `size` (`sm`/`md`/`lg`/`xl`/`full`) |
| `Card` | Kartový kontejner | `className` |

**Nikdy nepoužívej** surové `<input>`, `<select>` nebo `<button>` – vždy importuj z `../../components/ui`.

---

## 2. Vizuální styl (Tailwind)

### Barevná paleta
- **Labely:** `text-sm font-medium text-slate-700`
- **Bordery inputů:** `border-slate-300`
- **Focus ring:** `focus:ring-1 focus:ring-slate-400 focus:border-slate-400`
- **Chybový stav:** `border-red-500` + `text-sm text-red-500`
- **Sekční hlavičky (taby):** `bg-slate-800 text-white`
- **Primární tlačítka:** `bg-slate-800 hover:bg-slate-900 text-white`

### Rozložení (layout)
- **Formulář wrapper:** `<form className="space-y-4">`
- **Dvojice polí vedle sebe:** `<div className="grid grid-cols-2 gap-4">`
- **Trojice polí:** `<div className="grid grid-cols-3 gap-4">`
- **Čtveřice polí:** `<div className="grid grid-cols-4 gap-4">`
- **Jeden input na celou šířku:** žádný grid wrapper

### Responsive
- Ideálně přidat breakpointy: `grid-cols-1 md:grid-cols-2` místo pouhého `grid-cols-2`
- Tlačítka mají `min-h-[44px]` pro touch-friendly klikání

---

## 3. State management

### Lokální state (useState)
Formuláře používají `useState` s objektovým stavem:

```tsx
const [formData, setFormData] = useState({
  nazev: '',
  adresa: '',
  typ: 'pravidelná',
  // ...
});
```

### Aktualizace polí
```tsx
// Textové pole
onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}

// Číselné pole (s nullable)
onChange={(e) => setFormData({
  ...formData,
  plocha: e.target.value ? parseFloat(e.target.value) : undefined
})}

// Select s přetypováním
onChange={(e) => setFormData({
  ...formData,
  typRevize: e.target.value as 'pravidelná' | 'výchozí' | 'mimořádná'
})}
```

### Reset formuláře
Vytvořit funkci `resetForm()` nebo `emptyFormData` konstantu:
```tsx
const emptyFormData = { nazev: '', adresa: '', ... };
const resetForm = () => setFormData(emptyFormData);
```

---

## 4. Vzor: Modální CRUD formulář

Pro přidání/editaci entity v modálním okně:

```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => { setIsModalOpen(false); resetForm(); }}
  title={editing ? 'Upravit položku' : 'Přidat položku'}
  size="lg"
  footer={
    <>
      <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>
        Zrušit
      </Button>
      <Button onClick={handleSubmit}>
        {editing ? 'Uložit' : 'Vytvořit'}
      </Button>
    </>
  }
>
  <form onSubmit={handleSubmit} className="space-y-4">
    <Input
      label="Název"
      value={formData.nazev}
      onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
      placeholder="např. ..."
      required
    />
    <div className="grid grid-cols-2 gap-4">
      <Input label="Pole A" value={formData.poleA} onChange={...} />
      <Input label="Pole B" value={formData.poleB} onChange={...} />
    </div>
  </form>
</Modal>
```

### Pravidla modálního formuláře
1. **Footer** vždy obsahuje Zrušit (secondary) + Hlavní akce (primary)
2. **`onClose`** musí volat `resetForm()`
3. **`handleSubmit`** musí volat `e.preventDefault()`
4. **Povinná pole** mají atribut `required`
5. **Editace** – detekuje se přes `editing?.id` a mění title + submit logiku

---

## 5. Vzor: Inline formulář (tab)

Pro formuláře přímo na stránce (ne v modálu):

```tsx
<div className="px-4 py-2">
  <div className="flex justify-end gap-1 mb-1">
    <AIAutofillButton field="poleX" formData={formData} entityType="revize"
      onApply={(vals) => setFormData({ ...formData, ...vals })} />
    <PredvolenyTextBtn field="poleX" value={formData.poleX || ''}
      onChange={(val) => setFormData({ ...formData, poleX: val })}
      vlastniTexty={vlastniTexty} />
  </div>
  <textarea
    className="w-full px-2 py-1.5 rounded text-sm border border-slate-300
               focus:ring-2 focus:ring-blue-500 focus:outline-none"
    rows={3}
    value={formData.poleX || ''}
    onChange={(e) => setFormData({ ...formData, poleX: e.target.value })}
  />
</div>
```

### Pravidla inline formuláře
- Nad textarea mohou být helper tlačítka (AI, předvolené texty)
- `textarea` se používá pro delší textová pole (poznámky, rozsah revize)
- Data se uloží přes rodičovský `handleSave()` (tlačítko na stránce)

---

## 6. Vzor: StrojniZarizeniTab – komplex. protokol

Pro složitější formuláře s tabulkami a sekcemi:

```tsx
{/* Sekční hlavička */}
<div className="bg-slate-800 text-white px-3 py-2 rounded-t font-semibold text-sm">
  Název sekce
</div>

{/* Obsah sekce */}
<div className="border border-slate-300 border-t-0 rounded-b p-3 space-y-3">
  <div className="grid grid-cols-2 gap-4">
    <Input label="..." value={...} onChange={...} />
    <Select label="..." value={...} onChange={...} options={...} />
  </div>
</div>
```

### Dynamické tabulkové řádky
```tsx
{rows.map((row, i) => (
  <tr key={i}>
    <td><input className="w-full border rounded px-1 py-0.5 text-sm"
         value={row.nazev} onChange={(e) => updateRow(i, 'nazev', e.target.value)} /></td>
    {/* ... */}
    <td className="text-center">
      <button onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700">✕</button>
    </td>
  </tr>
))}
<button onClick={addRow} className="text-blue-600 hover:text-blue-800 text-sm">
  + Přidat řádek
</button>
```

---

## 7. Mutace (ukládání dat)

Data se ukládají přes React Query mutace z `src/hooks/useQueries.ts`:

```tsx
// Vytvoření
createEntity.mutate(
  { ...formData, revizeId },
  { onSuccess: () => { setIsModalOpen(false); resetForm(); } }
);

// Úprava
updateEntity.mutate(
  { id: editing.id, data: formData },
  { onSuccess: () => { setIsModalOpen(false); resetForm(); } }
);

// Smazání (s potvrzením)
if (window.confirm('Opravdu smazat?')) {
  deleteEntity.mutate(id);
}
```

---

## 8. Validace (TODO – doporučeno zlepšit)

Aktuální stav:
- Pouze HTML5 `required` atribut
- `window.confirm()` pro destruktivní akce
- Žádná validace formátu (IČO, email, telefon)

Doporučené zlepšení:
- Zavést **zod** + **react-hook-form**
- Nahradit `window.confirm()` custom potvrzovacím modálem
- Přidat formátové validace (IČO = 8 číslic, email regex)

---

## 9. Checklist pro nový formulář

- [ ] Importuj komponenty z `../../components/ui`
- [ ] Vytvoř `formData` state s výchozími hodnotami
- [ ] Vytvoř `resetForm()` funkci
- [ ] Obal formulář do `<form onSubmit={...} className="space-y-4">`
- [ ] Použij `grid grid-cols-2 gap-4` pro dvojice polí
- [ ] Povinná pole mají `required`
- [ ] Modal má footer s Zrušit + Hlavní akce
- [ ] `onClose` a `onSuccess` volají `resetForm()`
- [ ] Mutace přes `useQueries.ts` hooky
- [ ] Sekční hlavičky: `bg-slate-800 text-white`
