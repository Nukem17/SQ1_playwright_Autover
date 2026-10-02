-- Eenmalige uitbreiding: bestaande adressen en overige gebruikersgegevens blijven behouden.
ALTER TABLE autoverzekering_scenarios ADD COLUMN aanbodProductId TEXT NOT NULL DEFAULT '20566';
ALTER TABLE autoverzekering_scenarios ADD COLUMN geboortedatumPartner TEXT;
ALTER TABLE autoverzekering_scenarios ADD COLUMN verwachteUitkomst TEXT NOT NULL DEFAULT 'winkelwagen';
ALTER TABLE autoverzekering_scenarios ADD COLUMN geselecteerdeExtras TEXT NOT NULL DEFAULT '[]';
UPDATE autoverzekering_scenarios SET
  gezin='alleenstaande_zonder_kinderen', bestuurder='Ikzelf', schadevrij='0', kilometrage='7500',
  dekking='wa', dekkingTitel='WA', dekkingWinkelwagen='WA', aanbodProductId='72', extraDekkingen='[]'
WHERE id='testgebruiker-anna';
UPDATE autoverzekering_scenarios SET
  gezin='gezin_zonder_kinderen', bestuurder='Partner', geboortedatumPartner='1988-04-12', kilometrage='10000',
  geselecteerdeExtras='["Schade Voor Inzittenden Basis"]'
WHERE id='testgebruiker-bram';
UPDATE autoverzekering_scenarios SET
  gezin='alleenstaande_met_kinderen', bestuurder='Ikzelf', kilometrage='25000',
  dekking='vc', dekkingTitel='All-risk', dekkingWinkelwagen='All Risk',
  geselecteerdeExtras='["Rechtsbijstand Motorrijtuigen Basis"]'
WHERE id='testgebruiker-celine';
UPDATE autoverzekering_scenarios SET
  gezin='gezin_met_kinderen', bestuurder='Kind-inwonend', verwachteUitkomst='bestuurder-geblokkeerd'
WHERE id='testgebruiker-daan';
UPDATE autoverzekering_scenarios SET
  gezin='gezin_met_kinderen', bestuurder='Partner', geboortedatumPartner='1999-02-08', kilometrage='35000',
  dekking='vc', dekkingTitel='All-risk', dekkingWinkelwagen='All Risk',
  geselecteerdeExtras='["Schade Voor Inzittenden Basis","Rechtsbijstand Motorrijtuigen Basis"]'
WHERE id='testgebruiker-emma';
PRAGMA user_version = 1;
