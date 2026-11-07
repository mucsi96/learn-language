UPDATE learn_language.sources
SET collection_path = 'stories/' || collection_path
WHERE source_type = 'AUDIO_COLLECTION'
  AND collection_path ~ '^deutsch-lernen-durch-hoeren-(a1-a2|a2-b1|b1-b2|b2-c1|c1-c2)/$';

UPDATE learn_language.content_items
SET collection_path = 'stories/' || collection_path
WHERE collection_path ~ '^deutsch-lernen-durch-hoeren-(a1-a2|a2-b1|b1-b2|b2-c1|c1-c2)/$';

UPDATE learn_language.content_items
SET descriptor = jsonb_set(descriptor, '{audioUrl}', to_jsonb('stories/' || (descriptor->>'audioUrl')))
WHERE descriptor->>'audioUrl' ~ '^deutsch-lernen-durch-hoeren-(a1-a2|a2-b1|b1-b2|b2-c1|c1-c2)/';

UPDATE learn_language.content_items
SET descriptor = jsonb_set(descriptor, '{transcriptUrl}', to_jsonb('stories/' || (descriptor->>'transcriptUrl')))
WHERE descriptor->>'transcriptUrl' ~ '^deutsch-lernen-durch-hoeren-(a1-a2|a2-b1|b1-b2|b2-c1|c1-c2)/';

UPDATE learn_language.collection_discovery
SET collection_path = 'stories/' || collection_path
WHERE collection_path ~ '^deutsch-lernen-durch-hoeren-(a1-a2|a2-b1|b1-b2|b2-c1|c1-c2)/$';
