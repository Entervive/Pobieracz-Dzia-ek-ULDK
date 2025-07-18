# Pobieracz Działek ULDK

Aplikacja webowa do pobierania geometrii działek geodezyjnych w formacie DXF z serwisu ULDK (Usługi Lokalizacji Działek Katastralnych) Głównego Urzędu Geodezji i Kartografii.

<div align="center">

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.0+-06B6D4?logo=tailwindcss)

[🚀 Demo na żywo](https://uldk.entervive.pl/) · [🐛 Zgłoś błąd](https://github.com/Entervive/Pobieracz-Dzia-ek-ULDK/issues)

</div>

## 📋 Funkcje

- **Wyszukiwanie działek** - na dwa sposoby:
  - Bezpośrednie wprowadzenie identyfikatora TERYT
  - Konstruktor identyfikatora TERYT z rozwijanych list
- **Pobieranie pojedynczych działek** - geometria w formacie DXF
- **Pobieranie działek sąsiednich** - automatyczne wykrycie i pobranie działek graniczących
- **Wizualizacja działek** - integracja z mapą Geoportalu
- **Ograniczenia czasowe** - ochrona przed nadmiernym obciążeniem serwisu
- **Responsywny interfejs** - dostosowany do urządzeń mobilnych

---

## 🚀 Technologie

- **React** + **TypeScript** - framework frontendowy
- **Tailwind CSS** - stylizacja
- **Lucide React** - ikony
- **Vite** - bundler i serwer deweloperski

## 🚀 Szybki start

```bash
# Jeden wiersz do uruchomienia 🚀
git clone https://github.com/Entervive/Pobieracz-Dzia-ek-ULDK.git && cd Pobieracz-Dzia-ek-ULDK && npm install && npm run dev
```

<details>
<summary>📦 Szczegółowa instalacja</summary>

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/Entervive/Pobieracz-Dzia-ek-ULDK.git

# 2. Przejdź do katalogu
cd Pobieracz-Dzia-ek-ULDK

# 3. Zainstaluj zależności
npm install

# 4. Uruchom serwer deweloperski
npm run dev
```

</details>

### 📋 Wymagania systemowe

![Node.js](https://img.shields.io/badge/Node.js-18.0+-339933?logo=node.js)
![npm](https://img.shields.io/badge/npm-9.0+-CB3837?logo=npm)
![Modern Browser](https://img.shields.io/badge/Browser-Modern-orange)

<table>
<tr>
<td><strong>Node.js</strong></td>
<td>18.0 lub nowszy</td>
</tr>
<tr>
<td><strong>npm</strong></td>
<td>9.0 lub nowszy</td>
</tr>
<tr>
<td><strong>Przeglądarka</strong></td>
<td>Chrome 90+, Firefox 88+, Safari 14+</td>
</tr>
<tr>
<td><strong>Pamięć RAM</strong></td>
<td>Minimum 1GB</td>
</tr>
</table>

## 🔧 Skrypty npm

| Komenda           | Opis                          |
| ----------------- | ----------------------------- |
| `npm run dev`     | Uruchamia serwer deweloperski |
| `npm run build`   | Tworzy build produkcyjny      |
| `npm run preview` | Podgląd buildu                |

## 📖 Użycie

### Wyszukiwanie po ID

1. Wprowadź identyfikator TERYT działki (np. `141201_1.0001.6509`)
2. Kliknij "Pokaż" aby zobaczyć działkę na mapie
3. Kliknij "Pobierz" aby pobrać plik DXF

### Konstruktor TERYT

1. Wybierz kolejno: województwo, powiat, gminę
2. Wprowadź numer obrębu (4 cyfry)
3. Wprowadź numer działki
4. Identyfikator zostanie automatycznie skonstruowany

### Pobieranie działek sąsiednich

1. Wprowadź identyfikator działki centralnej
2. Kliknij "Sąsiednie" aby pobrać wszystkie graniczące działki w jednym pliku DXF

## 🏗️ Architektura projektu

```
src/
├── 📁 components/           # Komponenty UI
│   └── 📄 Footer.tsx       # Stopka z informacjami
├── 📁 data/                # Dane statyczne
│   └── 📄 teryt.ts         # Struktura TERYT
├── 📁 pages/               # Strony aplikacji
│   ├── 📄 PrivacyPolicy.tsx
│   └── 📄 TermsOfService.tsx
├── 📁 utils/               # Narzędzia pomocnicze
│   ├── 📄 dxfWriter.ts     # Generator DXF
│   └── 📄 geoConverter.ts  # Parser geometrii
├── 📁 types/               # Definicje typów
│   └── 📄 index.ts
├── 📄 App.tsx              # Główny komponent
├── 📄 main.tsx             # Punkt wejścia
└── 📄 index.css            # Style globalne
```

## 🔌 API

Aplikacja korzysta z publicznego API ULDK:

- `GetParcelById` - pobieranie geometrii działki po ID
- `GetParcelByXY` - wyszukiwanie działki po współrzędnych

## ⚠️ Ograniczenia i wymagania

<table>
<tr>
<td>

### 🚦 Rate Limiting

![Limit](https://img.shields.io/badge/Limit-1%2F60s-red)

- **Częstotliwość:** 1 zapytanie/60s
- **Ochrona:** Automatyczny cooldown
- **Powód:** Ochrona serwisu ULDK

</td>
<td>

### 📊 Obsługiwane formaty

![DXF](https://img.shields.io/badge/DXF-✅-brightgreen)
![Point](https://img.shields.io/badge/Point-✅-brightgreen)
![Polygon](https://img.shields.io/badge/Polygon-✅-brightgreen)

- **Geometria:** Point, Polygon
- **Eksport:** DXF
- **Współrzędne:** EPSG:2180

</td>
</tr>
</table>

### ⚖️ Zastrzeżenia prawne

> ⚠️ > **Pliki DXF mają charakter informacyjny** i nie mogą być podstawą do celów prawnych bez weryfikacji przez uprawnionego geodetę.

> ⚠️ > **Dokładność danych** zależy od aktualności baz danych GUGiK. Zawsze weryfikuj dane w urzędzie.

<details>
<summary>📋 Pełna lista ograniczeń</summary>

- ❌ Brak obsługi geometrii LineString
- ❌ Brak eksportu do innych formatów (SHP, KML)
- ❌ Brak API dla użytkowników zewnętrznych
- ❌ Brak cache'owania wyników
- ⚠️ Zależność od dostępności serwisu ULDK
- ⚠️ Ograniczona liczba zapytań równoczesnych

</details>

## 📄 Licencja

Projekt stworzony przez **Entervive "Aleksander Staszków"** dla spółki **Geomal usługi geodezyjne**.

## 🔗 Źródła danych

- **ULDK** - Główny Urząd Geodezji i Kartografii
- **Geoportal** - wizualizacja działek
- **Dane TERYT** - publiczne rejestry terytorialne

## 📞 Kontakt

W przypadku pytań technicznych lub prawnych, skontaktuj się ze mną aleksander.staszkow@entervive.pl.

## 📊 Statystyki

<div align="center">
 
![GitHub Stars](https://img.shields.io/github/stars/Entervive/Pobieracz-Dzia-ek-ULDK?style=social)
![GitHub Forks](https://img.shields.io/github/forks/Entervive/Pobieracz-Dzia-ek-ULDK?style=social)
![GitHub Issues](https://img.shields.io/github/issues/Entervive/Pobieracz-Dzia-ek-ULDK)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/Entervive/Pobieracz-Dzia-ek-ULDK)
![GitHub Last Commit](https://img.shields.io/github/last-commit/Entervive/Pobieracz-Dzia-ek-ULDK)
![GitHub Code Size](https://img.shields.io/github/languages/code-size/Entervive/Pobieracz-Dzia-ek-ULDK)

</div>

---

**Zastrzeżenie**: Aplikacja wykorzystuje publiczne dane GUGiK. Wygenerowane pliki DXF mają charakter informacyjny i nie mogą być podstawą do celów prawnych bez weryfikacji przez uprawnionego geodetę.
