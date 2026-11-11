--liquibase formatted sql
--changeset mucsi96:65-beszedfordulatok-speech splitStatements:false
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM learn_language.sources
        WHERE id = 'beszedfordulatok' AND source_type = 'WORD_TRIAGE'
    ) OR EXISTS (
        SELECT 1 FROM learn_language.cards
        WHERE source_id = 'beszedfordulatok'
          AND (type NOT IN ('VOCABULARY', 'SPEECH')
            OR (type = 'VOCABULARY' AND (
                jsonb_typeof(data->'word') IS DISTINCT FROM 'string'
                OR btrim(data->>'word') = ''
                OR (data->'examples' IS NOT NULL AND data->'examples' <> 'null'::jsonb
                    AND jsonb_typeof(data->'examples') <> 'array')
            )))
    ) THEN
        RAISE EXCEPTION 'Cannot convert beszedfordulatok: expected vocabulary phrases or speech cards';
    END IF;

    UPDATE learn_language.cards
    SET type = 'SPEECH',
        data = jsonb_set(data, '{examples}',
            jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
                'de', data->>'word',
                'hu', data->'translation'->>'hu',
                'en', data->'translation'->>'en',
                'ch', data->'translation'->>'ch',
                'isSelected', true
            ))) || CASE
                WHEN jsonb_typeof(data->'examples') = 'array' THEN (
                    SELECT COALESCE(jsonb_agg(example || '{"isSelected":false}'::jsonb ORDER BY position), '[]'::jsonb)
                    FROM jsonb_array_elements(data->'examples') WITH ORDINALITY AS items(example, position)
                )
                ELSE '[]'::jsonb
            END)
    WHERE source_id = 'beszedfordulatok' AND type = 'VOCABULARY';

    UPDATE learn_language.sources
    SET card_types = 'SPEECH'
    WHERE id = 'beszedfordulatok';

    REFRESH MATERIALIZED VIEW learn_language.card_view;
END $$;
