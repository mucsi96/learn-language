\pset format unaligned
\pset tuples_only on
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
WITH logs AS (
  SELECT * FROM learn_language.model_usage_logs
  WHERE created_at >= timestamp '2026-09-09 00:00:00'
    AND created_at < timestamp '2026-11-19 00:00:00'
), groups AS (
  SELECT operation_type, model_name, model_type, count(*) AS samples,
    min(created_at) AS first_at, max(created_at) AS last_at,
    count(rating) AS rated, count(*) FILTER (WHERE rating IS NULL) AS unrated,
    count(*) FILTER (WHERE rating <= 2) AS low_rated,
    count(*) FILTER (WHERE response_content IS NULL) AS missing_response,
    count(*) FILTER (WHERE response_content = '') AS empty_response,
    count(operation_id) AS linked_operation,
    count(input_tokens) AS input_token_samples, avg(input_tokens) AS mean_input_tokens,
    count(output_tokens) AS output_token_samples, avg(output_tokens) AS mean_output_tokens,
    count(cost_usd) AS cost_samples, sum(cost_usd) AS total_cost_usd,
    avg(cost_usd) AS mean_cost_usd,
    count(processing_time_ms) AS latency_samples,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY processing_time_ms) AS p50_ms,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY processing_time_ms) AS p95_ms
  FROM logs GROUP BY operation_type, model_name, model_type
), ratings AS (
  SELECT operation_type, model_name, rating, count(*) AS samples
  FROM logs GROUP BY operation_type, model_name, rating
)
SELECT json_build_object(
  'window_start', '2026-09-09T00:00:00', 'window_end_exclusive', '2026-11-19T00:00:00',
  'timestamp_type', 'timestamp without time zone; application LocalDateTime',
  'samples', (SELECT count(*) FROM logs),
  'groups', (SELECT json_agg(groups ORDER BY operation_type, model_name) FROM groups),
  'ratings', (SELECT json_agg(ratings ORDER BY operation_type, model_name, rating) FROM ratings));
COMMIT;
