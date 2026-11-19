# 🏙️ Rotterdam 3D Open World

Kompletní prototyp otevřené 3D hry odehrávající se v **Rotterdamu** v reálném měřítku. Projekt stahuje autentické 3D modely přímo z oficiálního otevřeného portálu města Rotterdam (**3drotterdam.nl** / Cesium 3D Tiles) a implementuje kompletní fyzikální engine pro:
1. 🏃 **Pohyb po městě pěšky** (postava s kolizemi, procedurální animací chůze/běhu/skoku a kamerou)
2. 🚗 **Řízení auta** (4kolová fyzika odpružení *Cannon-es RaycastVehicle*, akcelerace, drift s ruční brzdou, řazení a tachometr)
3. 🚤 **Plavbu motorovou lodí po řece a kanálech** (hydrodynamický vztlak dle Archimédova zákona, vlnový model, kormidlo, tah motoru a pěnová stopa)

---

## 📸 Funkce a herní mechaniky

### 1. Reálné 3D modely z 3Drotterdam.nl
- **Erasmusbrug (Erasmusův most)**: Oficiální 3D model dominanty Rotterdamu o výšce pylonu 139 m a rozpětí přes 500 m, včetně nájezdových ramp a vozovky pro auta i chodce.
- **Mrakodrapy a nábřeží**:
  - *Wilhelminapier & De Rotterdam* (mrakodrap od Rema Koolhaase)
  - *Boompjes & ústí Leuvehaven* (severní nábřeží s promenádou)
  - *Rijnhaven* (jižní doky a marina)
  - *Veerhaven* (historický přístav na západě)
  - *Noordereiland* (ostrov uprostřed řeky Nieuwe Maas)
- **Automatizovaný stahovač**: Skript [`scripts/download_rotterdam.py`](file:///home/runner/work/zdravim-rad-bych-vyrobil-vlastni-open/zdravim-rad-bych-vyrobil-vlastni-open/scripts/download_rotterdam.py), který extrahuje GLB modely z formátu `.b3dm`, odstraňuje globální elipsoidní zakřivení Země (ECEF) a normalizuje je do lokálních metrických herních souřadnic se svislou osou Y.

### 2. Fyzika pohybu po městě (Pěšky)
- Třetí osoba s orbitální kamerou (otáčení myší, přibližování kolečkem).
- Reálné kolize těla s vozovkou, mostovkou, zábradlím a budovami.
- Procedurální animace končetin (chůze, sprint, výskok, dýchání při stání).
- Detekce blízkosti vozidel s interaktivní výzvou k nasednutí.

### 3. Fyzika řízení auta (Rotterdam GT)
- 4kolové nezávislé zavěšení kol s pružinami, tlumiči a odskokem (`CANNON.RaycastVehicle`).
- Pohon zadních kol s automatickým výpočtem otáček motoru (RPM) a rychlostních stupňů (D / R).
- Citlivost řízení závislá na rychlosti (rychlá odezva při nízké rychlosti, stabilita při 140+ km/h).
- Ruční brzda (`Mezerník`) umožňující powerslide a kontrolované drifty na nábřeží a mostě.
- Funkční reflektory a brzdová světla, která se rozsvěcují při brzdění.
- Klávesa `[R]` pro narovnání auta, pokud se převrátí.

### 4. Fyzika plavby lodí po kanálu (Rotterdam Wave)
- **Hydrodynamický vztlak (Archimédův zákon)**: 6 vztlakových bodů po obvodu a kýlu trupu měří hloubku ponoru v reálném čase.
- **Dynamický vlnový model**: Matematická syntéza vln s proměnnou amplitudou a frekvencí – loď se realisticky pohupuje a naklání v souladu s viditelnou hladinou vody.
- **Kýlový odpor**: Vysoký boční odpor proti skluzu ve vodě, plynulý dopředný skluz.
- **Kormidlo a tah motoru**: Vektorový tah přívěsného motoru, který se fyzicky natáčí při zatáčení.
- **Pěnová stopa**: Částicový systém generující vodní pěnu a tříšť za lodním šroubem v závislosti na rychlosti (v uzlech).
- Molo a přístavní můstek u paty mostu Erasmusbrug pro snadné nastupování a vystupování.

### 5. Herní rozhraní (HUD v češtině)
- **Minimapa / Radar**: V reálném čase zobrazuje řeku Nieuwe Maas, Erasmusův most, polohu hráče, auta i lodi a kompas (N).
- **Palubní deska vozidla**: Digitální tachometr (km/h u auta, uzly u lodi), ukazatel plynu, otáčkoměr a zařazený stupeň.
- **Přepínání denní doby**: Tlačítko `☀️ Den / 🌅 Západ slunce / 🌙 Noc` s dynamickými stíny a městským osvětlením.
- **Nápověda k ovládání**: Klávesa `[H]` nebo tlačítko v pravém horním rohu.

---

## 🎮 Ovládání

| Akce | Režim | Klávesy |
| :--- | :--- | :--- |
| **Pohyb / Jízda / Plavba** | Všechny | `W` `A` `S` `D` nebo Šipky |
| **Sprint** | Pěšky | `Levý Shift` |
| **Výskok** | Pěšky | `Mezerník` |
| **Pohled kamery** | Pěšky | `Držení myši + tažení` |
| **Zoom kamery** | Pěšky | `Kolečko myši` |
| **Ruční brzda (Drift)** | Auto | `Mezerník` |
| **Narovnat auto** | Auto | `R` |
| **Nasednout / Vystoupit** | Kontextové | `E` nebo `F` |
| **Změna denní doby** | Herní | Tlačítko vpravo nahoře |
| **Restart / Respawn** | Herní | Tlačítko `🔄 Restart` |
| **Zobrazit nápovědu** | Herní | `H` nebo `F1` |

---

## 🚀 Jak hru spustit

### Požadavky
- [Node.js](https://nodejs.org/) v18+ a npm
- Moderní webový prohlížeč s podporou WebGL

### 1. Instalace závislostí
```bash
npm install
```

### 2. Spuštění vývojářského serveru
```bash
npm run dev
```
Otevřete v prohlížeči adresu `http://localhost:3000`.

### 3. Sestavení pro produkci
```bash
npm run build
npm run preview
```

### 4. (Volitelné) Stažení a aktualizace 3D modelů z 3drotterdam.nl
Hra již obsahuje předem stažené a zkonvertované modely v adresáři `public/models/`. Pokud chcete modely znovu stáhnout nebo rozšířit o další dlaždice, spusťte:
```bash
npm run download-models
```

---

## 📁 Struktura projektu

```text
├── index.html                   # Vstupní HTML stránka s načítací obrazovkou
├── package.json                 # Závislosti (Three.js, Cannon-es, Vite)
├── vite.config.js               # Konfigurace bundleru Vite
├── public/
│   └── models/
│       ├── erasmusbrug.glb             # 3D model Erasmusbrug (most)
│       ├── rotterdam_wilhelminapier.glb # De Rotterdam & Wilhelminapier
│       ├── rotterdam_boompjes.glb      # Boompjes & severní nábřeží
│       ├── rotterdam_rijnhaven.glb     # Doky a marina Rijnhaven
│       ├── rotterdam_veerhaven.glb     # Západní přístav Veerhaven
│       ├── rotterdam_noordereiland.glb # Ostrov Noordereiland
│       └── rotterdam_manifest.json     # Metadatový manifest modelů a souřadnic
├── scripts/
│   └── download_rotterdam.py    # Python skript pro stahování z 3drotterdam.nl
└── src/
    ├── main.js                  # Hlavní smyčka hry a přepínání herních režimů
    ├── physics.js               # Cannon-es fyzikální svět, materiály a kolizní skupiny
    ├── city.js                  # Načítání 3D modelů Rotterdamu, silnice a mola
    ├── water.js                 # Vlnový model řeky Nieuwe Maas a částicová pěna
    ├── player.js                # Třetí osoba, postava, procedurální animace a kamera
    ├── car.js                   # RaycastVehicle fyzika auta (Rotterdam GT)
    ├── boat.js                  # Hydrodynamická simulace lodi (Rotterdam Wave)
    ├── minimap.js               # 2D Canvas radar a kompas
    ├── textures.js              # Procedurální textury (asfalt, dlažba, normálová mapa vody)
    └── ui.js                    # Uživatelské rozhraní, tachometr a nápověda v češtině
```

---

## 🌍 Datové zdroje
- Otevřená data 3D Rotterdam: [3drotterdam.nl](https://3drotterdam.nl) (Gemeente Rotterdam & partners)
- Formáty: Cesium 3D Tiles (`.b3dm`) zkonvertované do standardního binárního glTF (`.glb`)
