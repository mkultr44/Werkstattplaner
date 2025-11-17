#!/bin/bash
DB="werkstatt.db"

echo "📅 Importiere OCR-Termine (Datum +1 Tag korrigiert) in $DB..."
sqlite3 "$DB" <<'SQL'
BEGIN TRANSACTION;

-- Montag, 10.11.2025
INSERT INTO jobs (id,date,time,category,title,customer,contact,vehicle,license,notes,
hu_au,car_care,storage,rental_car,status,created_at,updated_at)
VALUES
(NULL,date('2025-11-10','-1 day'),'08:00','routine','Radwechsel 4x','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-10','-1 day'),'10:00','major','Rio Tür ausbeulen (BM Eckardt)','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-10','-1 day'),'10:00','routine','Radwechsel 4x + Wagenpflege innen + außen (BM IG 6666)','','','','','',0,1,0,0,'pending',datetime('now'),datetime('now'));

-- Dienstag, 11.11.2025
INSERT INTO jobs (id,date,time,category,title,customer,contact,vehicle,license,notes,
hu_au,car_care,storage,rental_car,status,created_at,updated_at)
VALUES
(NULL,date('2025-11-11','-1 day'),'00:00','inspection','Schweller Scheinwerfer TÜV Nachuntersuchung','','','','','',1,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-11','-1 day'),'14:30','routine','Jahresinspektion Dienstag Abend 250 Euro','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-11','-1 day'),'08:00','routine','Radwechsel 4x','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now'));

-- Mittwoch, 12.11.2025
INSERT INTO jobs (id,date,time,category,title,customer,contact,vehicle,license,notes,
hu_au,car_care,storage,rental_car,status,created_at,updated_at)
VALUES
(NULL,date('2025-11-12','-1 day'),'00:00','inspection','TÜV/AU Auto kommt Dienstag Abend (Kleudgen)','','','','','',1,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-12','-1 day'),'08:00','routine','Wagenpflege innen + außen','','','','','',0,1,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-12','-1 day'),'12:30','routine','Reifen wechseln mit wuchten 4x','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now'));

-- Donnerstag, 13.11.2025
INSERT INTO jobs (id,date,time,category,title,customer,contact,vehicle,license,notes,
hu_au,car_care,storage,rental_car,status,created_at,updated_at)
VALUES
(NULL,date('2025-11-13','-1 day'),'08:15','routine','Radwechsel 4x Winterreifen (BM Langen)','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-13','-1 day'),'08:00','routine','TÜV Nachuntersuchung vorn Bremsen komplett (bm)','','','','','',1,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-13','-1 day'),'00:00','inspection','Ölwechsel + drittes Bremslicht prüfen oben (Gaby Birkholz)','','','','','',1,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-13','-1 day'),'08:00','routine','Radwechsel 4x (BM YR 183)','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now'));

-- Freitag, 14.11.2025
INSERT INTO jobs (id,date,time,category,title,customer,contact,vehicle,license,notes,
hu_au,car_care,storage,rental_car,status,created_at,updated_at)
VALUES
(NULL,date('2025-11-14','-1 day'),'10:00','routine','Radwechsel 4x (BM UH 5756)','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-14','-1 day'),'13:30','routine','Radwechsel 4x (BM PJ 3019)','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now'));

-- Montag, 17.11.2025
INSERT INTO jobs (id,date,time,category,title,customer,contact,vehicle,license,notes,
hu_au,car_care,storage,rental_car,status,created_at,updated_at)
VALUES
(NULL,date('2025-11-17','-1 day'),'00:00','routine','Reifenwechsel mit Wuchten (Bauer)','','','','','',0,0,0,0,'pending',datetime('now'),datetime('now')),
(NULL,date('2025-11-17','-1 day'),'09:00','routine','Waschen (Bergerhausen)','','','','','',0,1,0,0,'pending',datetime('now'),datetime('now'));

COMMIT;
SQL

echo "✅ Import abgeschlossen – alle OCR-Termine (mit +1 Tag) korrekt eingetragen."
