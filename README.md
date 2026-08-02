# Samara Care ERP V7.3 — Persistent Employee Photo

See `START_HERE_V7_3.md` for deployment instructions.

# Samara Care ERP V6.1

Unified trial release with Login ID based authentication for legacy and newly created employee accounts.

Run `supabase/sql/13_login_id_authentication.sql`, redeploy `admin-users`, and upload the application files to GitHub Pages.

## V6.5 stable authentication foundation

Run `supabase/sql/14_v6_2_stable_auth_foundation.sql` and redeploy `supabase/functions/admin-users/index.ts` before testing employee account repair.
