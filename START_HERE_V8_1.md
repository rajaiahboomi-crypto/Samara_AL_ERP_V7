# Samara Care ERP V8.1 — Rooms & Beds Master

## 1. Run the database upgrade

In **Supabase → SQL Editor → New query**, run:

`supabase/sql/17_v8_1_rooms_beds_master.sql`

The script creates the editable Room & Bed Master, imports existing patient allocations and seeds the initial 25-bed layout only when no rooms exist.

## 2. Upload the application

Replace the files in your current GitHub Pages repository with this package and commit them.

After deployment, press **Ctrl + Shift + R**.

## 3. Test

Open **OPERATIONS → Rooms & Beds**.

Admin and Manager can:

- add or edit Room/Bed records;
- set room type, floor, wing and daily rate;
- mark a bed Available, Reserved or under Maintenance;
- assign or transfer active patients;
- see occupied patients and special-nurse alerts;
- assign patients waiting for a bed.

Other authorised roles have view-only access.
