# Database changes

The development PostgreSQL database remains hosted on Supabase. `migrations/` will contain reviewed, timestamped SQL files for tables, constraints, indexes, and access policies.

No migration has been created or applied by this scaffold. Inspect the existing remote schema and agree on a baseline before adding SQL. Never modify an applied shared migration; add a new one. Use synthetic test records. Coordinate remote changes with the team.

The Python backend serves application requests; migrations define database structure. Supabase Auth remains the planned officer identity provider. Public check-in must not grant anonymous roster access.
