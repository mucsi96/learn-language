SELECT jsonb_build_object(
  'columns', (
    SELECT jsonb_agg(jsonb_build_array(c.relname, a.attname,
      pg_catalog.format_type(a.atttypid, a.atttypmod), a.attnotnull, a.attidentity,
      pg_get_expr(d.adbin, d.adrelid))
      ORDER BY c.relname, a.attnum)
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'learn_language' AND c.relkind IN ('r', 'm')
      AND c.relname NOT IN ('databasechangelog', 'databasechangeloglock', 'seaql_migrations')
      AND a.attnum > 0 AND NOT a.attisdropped
  ),
  'constraints', (
    SELECT jsonb_agg(jsonb_build_array(c.relname, con.conname, pg_get_constraintdef(con.oid))
      ORDER BY c.relname, con.conname)
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'learn_language'
      AND c.relname NOT IN ('databasechangelog', 'databasechangeloglock', 'seaql_migrations')
  ),
  'indexes', (
    SELECT jsonb_agg(jsonb_build_array(tablename, indexname, indexdef) ORDER BY tablename, indexname)
    FROM pg_catalog.pg_indexes WHERE schemaname = 'learn_language'
      AND tablename NOT IN ('databasechangelog', 'databasechangeloglock', 'seaql_migrations')
  ),
  'views', (
    SELECT jsonb_agg(matviewname ORDER BY matviewname)
    FROM pg_catalog.pg_matviews WHERE schemaname = 'learn_language'
  ),
  'sequences', (
    SELECT jsonb_agg(jsonb_build_array(sequencename, data_type::text, start_value, min_value,
      max_value, increment_by, cycle, cache_size) ORDER BY sequencename)
    FROM pg_catalog.pg_sequences WHERE schemaname = 'learn_language'
  )
)::text AS signature
