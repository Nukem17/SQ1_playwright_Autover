-- Afzonderlijke regressiegegevens in dezelfde lokale database.
-- Verwachtingen zijn de afgesproken eisen; ontbrekende metadata uit de crawl
-- wordt niet als gewenste waarde overgenomen. Bestaande data blijft behouden.
CREATE TABLE regressie_paginas (
 id TEXT PRIMARY KEY,
 onderdeel TEXT NOT NULL,
 naam TEXT NOT NULL,
 pad TEXT NOT NULL,
 verwachteTitel TEXT NOT NULL,
 verwachteHoofdtitel TEXT NOT NULL,
 verwachteStatus INTEGER NOT NULL DEFAULT 200,
 bron TEXT NOT NULL
) STRICT;
CREATE TABLE regressie_scenarios (
 id TEXT PRIMARY KEY,
 onderdeel TEXT NOT NULL,
 naam TEXT NOT NULL,
 type TEXT NOT NULL,
 bronPaginaId TEXT NOT NULL REFERENCES regressie_paginas(id),
 doelPaginaId TEXT REFERENCES regressie_paginas(id),
 instellingen TEXT NOT NULL DEFAULT '{}'
) STRICT;
INSERT INTO regressie_paginas VALUES ('schade-start','Schade melden','Schade melden','/schade-melden/','Schade melden - Lancyr','Schade melden','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[9],"issues":["missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-eenzijdig','Schade melden','Eenzijdige schade','/schade-melden/eenzijdig-schade-melden/','Eenzijdig schade melden - Lancyr','Eenzijdig schade melden','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[153,235],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-tweezijdig','Schade melden','Tweezijdige schade','/schade-melden/tweezijdig-schade-melden/','Tweezijdig schade melden - Lancyr','Tweezijdig schade melden','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[158,240],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-ruit','Schade melden','Ruitschade','/schade-melden/ruitschade/','Ruitschade - Lancyr','Ruitschade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[157,239],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-herstel','Schade melden','Herstelnetwerk auto','/schade-melden/herstelnetwerk-auto/','Herstelnetwerk auto - Lancyr','Herstelnetwerk auto','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[155,237],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-reis','Schade melden','Hulp bij reisschade','/schade-melden/hulp-bij-schade-reis/','Hulp bij schade reis - Lancyr','Hulp bij schade reis','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[156,238],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-faq','Schade melden','Veelgestelde vragen','/schade-melden/faq/','Veel gestelde vragen: schade - Lancyr','Veel gestelde vragen: schade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[154,236],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-faq-p2','Schade melden','FAQ: query-11-page=2','/schade-melden/faq/?query-11-page=2','Veel gestelde vragen: schade - Lancyr','Veel gestelde vragen: schade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[272,294],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-faq-cst','Schade melden','FAQ: cst','/schade-melden/faq/?cst','Veel gestelde vragen: schade - Lancyr','Veel gestelde vragen: schade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[316,331],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-faq-p1','Schade melden','FAQ: query-11-page=1','/schade-melden/faq/?query-11-page=1','Veel gestelde vragen: schade - Lancyr','Veel gestelde vragen: schade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[317,332],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-faq-cst-p2','Schade melden','FAQ: cst&query-11-page=2','/schade-melden/faq/?cst&query-11-page=2','Veel gestelde vragen: schade - Lancyr','Veel gestelde vragen: schade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[339,344],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-faq-p2-cst','Schade melden','FAQ: query-11-page=2&cst','/schade-melden/faq/?query-11-page=2&cst','Veel gestelde vragen: schade - Lancyr','Veel gestelde vragen: schade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[340,345],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-faq-cst-p1','Schade melden','FAQ: cst&query-11-page=1','/schade-melden/faq/?cst&query-11-page=1','Veel gestelde vragen: schade - Lancyr','Veel gestelde vragen: schade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[348,352],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_paginas VALUES ('schade-faq-p1-cst','Schade melden','FAQ: query-11-page=1&cst','/schade-melden/faq/?query-11-page=1&cst','Veel gestelde vragen: schade - Lancyr','Veel gestelde vragen: schade','200','{"bestand":"moz_lancyr_crawl_issues_09302026.csv","regels":[349,353],"issues":["missing description","missing h1"]}');
INSERT INTO regressie_scenarios VALUES ('SCH-NAV-eenzijdig','Schade melden','Eenzijdige schade openen vanaf Schade melden','navigatie','schade-start','schade-eenzijdig','{}');
INSERT INTO regressie_scenarios VALUES ('SCH-NAV-tweezijdig','Schade melden','Tweezijdige schade openen vanaf Schade melden','navigatie','schade-start','schade-tweezijdig','{}');
INSERT INTO regressie_scenarios VALUES ('SCH-NAV-ruit','Schade melden','Ruitschade openen vanaf Schade melden','navigatie','schade-start','schade-ruit','{}');
INSERT INTO regressie_scenarios VALUES ('SCH-NAV-herstel','Schade melden','Herstelnetwerk auto openen vanaf Schade melden','navigatie','schade-start','schade-herstel','{}');
INSERT INTO regressie_scenarios VALUES ('SCH-NAV-reis','Schade melden','Hulp bij reisschade openen vanaf Schade melden','navigatie','schade-start','schade-reis','{}');
INSERT INTO regressie_scenarios VALUES ('SCH-NAV-faq','Schade melden','Veelgestelde vragen openen vanaf Schade melden','navigatie','schade-start','schade-faq','{}');
INSERT INTO regressie_scenarios VALUES ('SCH-FAQ-ANTWOORD','Schade melden','Een FAQ-antwoord openen en terugkeren','faq-antwoord','schade-faq',NULL,'{"doelPad":"/faq/heeft-lancyr-een-lijst-met-aangesloten-herstellers/","verwachteHoofdtitel":"Heeft Lancyr een lijst met aangesloten herstellers?","antwoordTekst":"Je meldt eerst je schade"}');
INSERT INTO regressie_scenarios VALUES ('SCH-FAQ-PAGINERING','Schade melden','FAQ pagina 1, pagina 2 en terug','paginering','schade-faq','schade-faq-p2','{}');
INSERT INTO regressie_scenarios VALUES ('SCH-URL-faq-p2','Schade melden','FAQ-variant query-11-page=2','url-variant','schade-faq-p2','schade-faq-p2','{"verwachtePagina":2}');
INSERT INTO regressie_scenarios VALUES ('SCH-URL-faq-cst','Schade melden','FAQ-variant cst','url-variant','schade-faq','schade-faq-cst','{"verwachtePagina":1}');
INSERT INTO regressie_scenarios VALUES ('SCH-URL-faq-p1','Schade melden','FAQ-variant query-11-page=1','url-variant','schade-faq','schade-faq-p1','{"verwachtePagina":1}');
INSERT INTO regressie_scenarios VALUES ('SCH-URL-faq-cst-p2','Schade melden','FAQ-variant cst&query-11-page=2','url-variant','schade-faq-p2','schade-faq-cst-p2','{"verwachtePagina":2}');
INSERT INTO regressie_scenarios VALUES ('SCH-URL-faq-p2-cst','Schade melden','FAQ-variant query-11-page=2&cst','url-variant','schade-faq-p2','schade-faq-p2-cst','{"verwachtePagina":2}');
INSERT INTO regressie_scenarios VALUES ('SCH-URL-faq-cst-p1','Schade melden','FAQ-variant cst&query-11-page=1','url-variant','schade-faq','schade-faq-cst-p1','{"verwachtePagina":1}');
INSERT INTO regressie_scenarios VALUES ('SCH-URL-faq-p1-cst','Schade melden','FAQ-variant query-11-page=1&cst','url-variant','schade-faq','schade-faq-p1-cst','{"verwachtePagina":1}');
INSERT INTO regressie_scenarios VALUES ('SCH-EXTERN-eenzijdig','Schade melden','Verwijzing naar schadeformulier: eenzijdig','extern-link','schade-eenzijdig',NULL,'{"doelUrl":"https://app.finconnect.nl/iframe/zKYReEdJzQ1we3VDo25CHfYFumhmgoD8l731PmQM51F6yksLG3cIKJ5adQoqkbty/zMGbkax7N3PedaRlBjFHjpMiwoHrDEdp","linkTekst":"Je kan je schade ook online indienen."}');
INSERT INTO regressie_scenarios VALUES ('SCH-EXTERN-tweezijdig','Schade melden','Verwijzing naar schadeformulier: tweezijdig','extern-link','schade-tweezijdig',NULL,'{"doelUrl":"https://app.finconnect.nl/iframe/zKYReEdJzQ1we3VDo25CHfYFumhmgoD8l731PmQM51F6yksLG3cIKJ5adQoqkbty/zMGbkax7N3PedaRlBjFHjpMiwoHrDEdp","linkTekst":"Dien je schadeformulier in"}');
INSERT INTO regressie_scenarios VALUES ('SCH-FAQ-UITKLAPPEN','Schade melden','FAQ-antwoord open- en dichtklappen','faq-uitklappen','schade-faq',NULL,'{"doelPad":"/faq/heeft-lancyr-een-lijst-met-aangesloten-herstellers/","verwachteHoofdtitel":"Heeft Lancyr een lijst met aangesloten herstellers?","antwoordTekst":"Je meldt eerst je schade","melding":"SCH-FAQ-UITKLAPPEN: opnieuw klikken sluit het antwoord niet; vastgesteld bij browserinspectie"}');
PRAGMA user_version = 2;
