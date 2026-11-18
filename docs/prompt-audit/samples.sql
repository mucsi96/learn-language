\pset format unaligned
\pset tuples_only on
BEGIN READ ONLY;
WITH ranked AS (
  SELECT *, row_number() OVER (PARTITION BY operation_type, model_name ORDER BY id) AS first_n,
    row_number() OVER (PARTITION BY operation_type, model_name ORDER BY id DESC) AS last_n
  FROM learn_language.model_usage_logs
  WHERE model_type = 'CHAT' AND created_at >= timestamp '2026-09-09 00:00:00'
    AND created_at < timestamp '2026-11-19 00:00:00'
)
SELECT json_build_object('id', id, 'operation', operation_type, 'model', model_name,
  'operation_id', operation_id, 'rating', rating, 'response', response_content)
FROM ranked WHERE first_n = 1 OR last_n = 1 OR rating <= 2
ORDER BY operation_type, model_name, id;
COMMIT;
