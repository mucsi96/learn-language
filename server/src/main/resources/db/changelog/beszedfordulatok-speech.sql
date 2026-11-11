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
          AND (type NOT IN ('SIMPLE', 'SPEECH')
            OR (type = 'SIMPLE' AND (
                jsonb_typeof(data->'frontText') IS DISTINCT FROM 'string'
                OR jsonb_typeof(data->'backText') IS DISTINCT FROM 'string'
                OR cardinality(string_to_array(data->>'frontText', E'\n\n')) <> 3
                OR cardinality(string_to_array(data->>'backText', E'\n\n')) NOT IN (2, 3)
                OR split_part(data->>'frontText', E'\n\n', 3) NOT LIKE '**Példa:** %'
                OR btrim(substr(split_part(data->>'frontText', E'\n\n', 3), 12)) = ''
                OR btrim(split_part(data->>'backText', E'\n\n', 2)) = ''
                OR length(split_part(data->>'backText', E'\n\n', 2))
                    < length(replace(split_part(data->>'backText', E'\n\n', 1), '**', ''))
                OR (data->'examples' IS NOT NULL AND data->'examples' NOT IN ('null'::jsonb, '[]'::jsonb))
            )))
    ) THEN
        RAISE EXCEPTION 'Cannot convert beszedfordulatok: expected simple cards with a longer bilingual example or speech cards';
    END IF;

    UPDATE learn_language.cards
    SET type = 'SPEECH',
        data = jsonb_set(data, '{examples}',
            jsonb_build_array(jsonb_build_object(
                'de', split_part(data->>'backText', E'\n\n', 2),
                'hu', substr(split_part(data->>'frontText', E'\n\n', 3), 12),
                'isSelected', true
            )))
    WHERE source_id = 'beszedfordulatok' AND type = 'SIMPLE';

    UPDATE learn_language.sources
    SET card_types = 'SPEECH'
    WHERE id = 'beszedfordulatok';

    REFRESH MATERIALIZED VIEW learn_language.card_view;
END $$;
