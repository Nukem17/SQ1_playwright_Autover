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

-- Vijf fictieve gebruikers met openbare OBA-adressen in Amsterdam.
-- Geen werkelijke woonadressen van deze personen; niet in de live funnel gevalideerd.
-- Bron: https://oba.nl/nl/locaties en OBA-locatiegegevens.
INSERT INTO autoverzekering_scenarios VALUES
  ('testgebruiker-anna', '88-LSV-7', 'Toyota Prius', '1011DL', '143', 'Oosterdokskade',
   'Amsterdam', '1992-03-18', 'Nee', 'alleenstaande_zonder_kinderen', 'Ja',
   'Ikzelf', '8', '20000', 9, 20, 'bc', 'WA +', 'WA+',
   '["Schade Voor Inzittenden Basis","Rechtsbijstand Motorrijtuigen Basis"]'),
  ('testgebruiker-bram', '88-LSV-7', 'Toyota Prius', '1071TT', '430', 'Roelof Hartplein',
   'Amsterdam', '1985-07-09', 'Ja', 'alleenstaande_zonder_kinderen', 'Ja',
   'Ikzelf', '12', '20000', 9, 20, 'bc', 'WA +', 'WA+',
   '["Schade Voor Inzittenden Basis","Rechtsbijstand Motorrijtuigen Basis"]'),
  ('testgebruiker-celine', '88-LSV-7', 'Toyota Prius', '1094HW', '2', 'Javaplein',
   'Amsterdam', '1998-11-24', 'Nee', 'alleenstaande_zonder_kinderen', 'Ja',
   'Ikzelf', '4', '20000', 9, 20, 'bc', 'WA +', 'WA+',
   '["Schade Voor Inzittenden Basis","Rechtsbijstand Motorrijtuigen Basis"]'),
  ('testgebruiker-daan', '88-LSV-7', 'Toyota Prius', '1068EL', '16', 'Osdorpplein',
   'Amsterdam', '1976-01-30', 'Ja', 'alleenstaande_zonder_kinderen', 'Ja',
   'Ikzelf', '20', '20000', 9, 20, 'bc', 'WA +', 'WA+',
   '["Schade Voor Inzittenden Basis","Rechtsbijstand Motorrijtuigen Basis"]'),
  ('testgebruiker-emma', '88-LSV-7', 'Toyota Prius', '1024NB', '302', 'Waterlandplein',
   'Amsterdam', '2001-06-12', 'Nee', 'alleenstaande_zonder_kinderen', 'Ja',
   'Ikzelf', '2', '20000', 9, 20, 'bc', 'WA +', 'WA+',
   '["Schade Voor Inzittenden Basis","Rechtsbijstand Motorrijtuigen Basis"]');
