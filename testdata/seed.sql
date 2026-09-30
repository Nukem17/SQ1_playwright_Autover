-- Startgegevens voor de lokale proef; de tests lezen uitsluitend uit SQLite.
CREATE TABLE autoverzekering_scenarios (
  id TEXT PRIMARY KEY,
  kenteken TEXT NOT NULL,
  verwachtVoertuig TEXT NOT NULL,
  postcode TEXT NOT NULL,
  huisnummer TEXT NOT NULL,
  straat TEXT NOT NULL,
  plaats TEXT NOT NULL,
  geboortedatum TEXT NOT NULL,
  ondernemer TEXT NOT NULL,
  gezin TEXT NOT NULL,
  privacy TEXT NOT NULL,
  bestuurder TEXT NOT NULL,
  schadevrij TEXT NOT NULL,
  kilometrage TEXT NOT NULL,
  ingangsMaand INTEGER NOT NULL,
  ingangsDag INTEGER NOT NULL,
  dekking TEXT NOT NULL,
  dekkingTitel TEXT NOT NULL,
  dekkingWinkelwagen TEXT NOT NULL,
  extraDekkingen TEXT NOT NULL
) STRICT;
INSERT INTO autoverzekering_scenarios VALUES (
  'standaard', '88-LSV-7', 'Toyota Prius', '1102NN', '224', 'Haardstee',
  'Amsterdam', '2004-04-14', 'Ja', 'alleenstaande_zonder_kinderen', 'Ja',
  'Ikzelf', '6', '20000', 9, 20, 'bc', 'WA +', 'WA+',
  '["Schade Voor Inzittenden Basis","Rechtsbijstand Motorrijtuigen Basis"]'
);
