package io.github.mucsi96.learnlanguage.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import io.github.mucsi96.learnlanguage.extension.SourceExtensionRegistry;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContentPreparationService {
    private final ContentStore store;
    private final ContentAssetService assets;
    private final ContentTextService text;
    private final SourceExtensionRegistry extensions;

    @Scheduled(fixedDelay = 1000, scheduler = "contentScheduler")
    public void processNext() {
        store.claim().ifPresent(this::prepare);
    }

    private void prepare(ContentItem item) {
        try {
            final Preparation previous = item.preparation() == null
                    ? Preparation.builder().version("2").model(text.model().getModelName()).build() : item.preparation();
            final var model = io.github.mucsi96.learnlanguage.model.ChatModel.fromString(previous.model());
            final Preparation extracted = previous.blocks() != null ? previous : extract(item, previous);
            store.checkpoint(item, extracted, "processing");
            final Preparation isolated = extracted.transcript() != null ? extracted : extracted.toBuilder()
                    .transcript(text.isolate(extracted.blocks(), extensions.require(item.extensionId()).isolationPolicy(),
                            item.descriptor().title(), model)).build();
            store.checkpoint(item, isolated, "processing");
            final Preparation complete = isolated.toBuilder().version("2").words(text.vocabulary(isolated.transcript(), model)).build();
            store.checkpoint(item, complete, "prepared");
        } catch (Exception exception) {
            log.error("Content preparation failed for {}", item.id(), exception);
            store.failed(item, exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage());
        }
    }

    private Preparation extract(ContentItem item, Preparation previous) {
        final var transcript = extensions.require(item.extensionId()).resolveTranscript(item.descriptor());
        return transcript.isolatedText() == null
                ? previous.toBuilder().blocks(text.blocks(assets.cached(transcript.url()), transcript.mediaType())).build()
                : previous.toBuilder().blocks(text.textBlocks(transcript.isolatedText())).transcript(transcript.isolatedText()).build();
    }
}
