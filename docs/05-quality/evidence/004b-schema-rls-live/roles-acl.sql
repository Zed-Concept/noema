-- roles-acl.sql — Unit C fix cycle 1 (REVIEW-011 finding 1): measure the
-- exact staging role/ACL/RLS posture the unit's privileged-role prose
-- reasons about, instead of inferring it from vendor sources.
--
-- READ-ONLY by construction: one SELECT over pg_catalog and
-- information_schema. No write, no DDL, and no read of any data table.
-- Nothing in the output can contain a credential, token, project ref, or
-- URL.
--
-- OWNER-EXECUTED (ruling 10 credential class): run this file's single
-- statement in the noema-staging dashboard SQL editor and paste the full
-- result grid back verbatim (every row, all four columns). It is committed
-- untouched as roles-acl.txt, wrapped in a run-state annotation.
--
-- Sections (ord):
--   0 run-context    — the role/database the SQL-editor session executes as
--   1 role-attribute — pg_roles.rolsuper / rolbypassrls for the four roles
--                      the premise names, plus an existence-coverage row
--   2 effective-priv — has_table_privilege(role, table, privilege) for the
--                      three v1 tables × SELECT/INSERT/UPDATE/DELETE
--                      (role inheritance included by definition)
--   3 acl-entry      — every raw ACL entry on the three tables (aclexplode;
--                      grantee 0 rendered as PUBLIC; a null relacl expanded
--                      to the built-in owner default)
--   4 public-grants  — information_schema.role_table_grants rows whose
--                      grantee is PUBLIC, counted per table (0 = none)
--   5 rls-flag       — pg_class.relrowsecurity / relforcerowsecurity
with params as (
  select
    array['postgres', 'service_role', 'authenticated', 'anon']::name[] as roles,
    array['public.profiles', 'public.captures', 'public.transcripts']::text[] as tables
),
run_context as (
  select
    0 as ord,
    'run-context' as section,
    'sql-editor session' as item,
    format(
      'current_user=%s session_user=%s current_database=%s',
      current_user, session_user, current_database()
    ) as detail
),
role_attrs as (
  select
    1 as ord,
    'role-attribute' as section,
    r.rolname::text as item,
    format('rolsuper=%s rolbypassrls=%s', r.rolsuper, r.rolbypassrls) as detail
  from pg_roles r, params p
  where r.rolname = any (p.roles)
),
role_coverage as (
  select
    1 as ord,
    'role-attribute' as section,
    'zz-coverage' as item,
    format('%s of 4 named roles exist in pg_roles', count(*)) as detail
  from pg_roles r, params p
  where r.rolname = any (p.roles)
),
effective as (
  select
    2 as ord,
    'effective-priv' as section,
    format('%s on %s', r.rolname, t.tbl) as item,
    format(
      'select=%s insert=%s update=%s delete=%s',
      has_table_privilege(r.rolname, t.tbl, 'SELECT'),
      has_table_privilege(r.rolname, t.tbl, 'INSERT'),
      has_table_privilege(r.rolname, t.tbl, 'UPDATE'),
      has_table_privilege(r.rolname, t.tbl, 'DELETE')
    ) as detail
  from params p
  cross join lateral unnest(p.roles) as r(rolname)
  cross join lateral unnest(p.tables) as t(tbl)
  -- guard: has_table_privilege errors on a nonexistent role; a missing role
  -- surfaces via the coverage row above instead of aborting the probe
  where exists (select 1 from pg_roles pr where pr.rolname = r.rolname)
),
acl_entries as (
  select
    3 as ord,
    'acl-entry' as section,
    format('%s.%s', n.nspname, c.relname) as item,
    format(
      'grantee=%s privilege=%s grantable=%s grantor=%s',
      coalesce(pg_get_userbyid(nullif(a.grantee, 0)), 'PUBLIC'),
      a.privilege_type,
      a.is_grantable,
      pg_get_userbyid(a.grantor)
    ) as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  where n.nspname = 'public'
    and c.relname in ('profiles', 'captures', 'transcripts')
),
public_grants as (
  select
    4 as ord,
    'public-grants' as section,
    t.tbl as item,
    format(
      'information_schema.role_table_grants rows with grantee PUBLIC: %s',
      count(g.privilege_type)
    ) as detail
  from params p
  cross join lateral unnest(p.tables) as t(tbl)
  left join information_schema.role_table_grants g
    on g.table_schema = 'public'
    and format('public.%s', g.table_name) = t.tbl
    and g.grantee = 'PUBLIC'
  group by t.tbl
),
rls_flags as (
  select
    5 as ord,
    'rls-flag' as section,
    format('%s.%s', n.nspname, c.relname) as item,
    format(
      'relrowsecurity=%s relforcerowsecurity=%s',
      c.relrowsecurity, c.relforcerowsecurity
    ) as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('profiles', 'captures', 'transcripts')
)
select ord, section, item, detail
from (
  select * from run_context
  union all select * from role_attrs
  union all select * from role_coverage
  union all select * from effective
  union all select * from acl_entries
  union all select * from public_grants
  union all select * from rls_flags
) all_rows
order by ord, item, detail;
