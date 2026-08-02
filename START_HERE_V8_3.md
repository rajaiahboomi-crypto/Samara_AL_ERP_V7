# Samara Care ERP V8.3 – Universal Room & Bed Dropdowns

## What changed

- Room Number and Bed Number are dropdown-only in Patient Admission and Edit Patient.
- Room Number and Bed Code remain editable only inside **Operations → Rooms & Beds** for Admin and Manager.
- The Bed dropdown is filtered by the selected Room.
- Occupied, Reserved and Maintenance beds are displayed but cannot be selected for another patient.
- Renaming an occupied Room/Bed asks for confirmation and updates the patient's displayed allocation throughout the system.
- Duplicate Room/Bed combinations remain blocked.

## Upgrade

1. Upload all package files to the existing GitHub repository root.
2. Commit the changes and wait for GitHub Pages deployment.
3. Open the app and press **Ctrl + Shift + R**.
4. Test Rooms & Beds, Admission, and Edit Patient.

No new Supabase SQL is required. This version uses the existing `room_beds` master table.
