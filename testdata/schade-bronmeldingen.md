# Bronmeldingen Schade melden

Bron: [Moz-CSV](../moz_lancyr_crawl_issues_09302026.csv). Selectie: **27 meldingen, 14 URL’s**. Regelnummers tellen de kopregel mee.

| Pagina | CSV-regels | Meldingen |
| --- | --- | --- |
| `/schade-melden/` | 9 | missing h1 |
| `/schade-melden/eenzijdig-schade-melden/` | 153, 235 | missing description, missing h1 |
| `/schade-melden/tweezijdig-schade-melden/` | 158, 240 | missing description, missing h1 |
| `/schade-melden/ruitschade/` | 157, 239 | missing description, missing h1 |
| `/schade-melden/herstelnetwerk-auto/` | 155, 237 | missing description, missing h1 |
| `/schade-melden/hulp-bij-schade-reis/` | 156, 238 | missing description, missing h1 |
| `/schade-melden/faq/` | 154, 236 | missing description, missing h1 |
| `/schade-melden/faq/?query-11-page=2` | 272, 294 | missing description, missing h1 |
| `/schade-melden/faq/?cst` | 316, 331 | missing description, missing h1 |
| `/schade-melden/faq/?query-11-page=1` | 317, 332 | missing description, missing h1 |
| `/schade-melden/faq/?cst&query-11-page=2` | 339, 344 | missing description, missing h1 |
| `/schade-melden/faq/?query-11-page=2&cst` | 340, 345 | missing description, missing h1 |
| `/schade-melden/faq/?cst&query-11-page=1` | 348, 352 | missing description, missing h1 |
| `/schade-melden/faq/?query-11-page=1&cst` | 349, 353 | missing description, missing h1 |

De CSV is historische broninformatie. De tests lezen pagina’s en verwachtingen uit SQLite, niet rechtstreeks uit dit bestand. Elke URL krijgt onafhankelijke controles voor bereikbaarheid, titel, H1 en description.

`/faq/...`-antwoordartikelen vallen buiten deze metadata-selectie. De FAQ-doorkliktest controleert wel één antwoord. De dichtklapcontrole komt uit aanvullende browserinspectie. Zie [de regressiesuite](../README-schade-regressie.md).
