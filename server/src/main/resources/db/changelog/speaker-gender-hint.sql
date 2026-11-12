UPDATE learn_language.cards
SET data = jsonb_set(data, '{examples}', (
  SELECT jsonb_agg(
    CASE WHEN jsonb_exists(example, 'voiceGenderHint')
      THEN (example - 'voiceGenderHint') ||
        CASE WHEN jsonb_exists(example, 'speakerGenderHint') THEN '{}'::jsonb
          ELSE jsonb_build_object('speakerGenderHint', example->'voiceGenderHint') END
      ELSE example END ORDER BY position)
  FROM jsonb_array_elements(data->'examples') WITH ORDINALITY AS examples(example, position)
))
WHERE jsonb_typeof(data->'examples') = 'array'
  AND jsonb_path_exists(data, '$.examples[*].voiceGenderHint');
