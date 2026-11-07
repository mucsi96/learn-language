package io.github.mucsi96.learnlanguage.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContentPreparationService {
    private final ContentStore store;
    private final ContentTextService text;
    private final AudioCollectionService collections;

    @Scheduled(fixedDelay = 1000, scheduler = "contentScheduler")
    public void processNext() {
        store.claim().ifPresent(this::prepare);
    }

    private void prepare(ContentItem item) {
        try {
            final Preparation previous = item.preparation() == null
                    ? Preparation.builder().version("3").model(text.model().getModelName()).build() : item.preparation();
            final var model = io.github.mucsi96.learnlanguage.model.ChatModel.fromString(previous.model());
            final Preparation isolated = previous.transcript() != null ? previous : previous.toBuilder()
                    .transcript(collections.resolveTranscript(item.descriptor())).build();
            store.checkpoint(item, isolated, "processing");
            final Preparation complete = isolated.toBuilder().version("3").words(text.vocabulary(isolated.transcript(), model)).build();
            store.checkpoint(item, complete, "prepared");
        } catch (Exception exception) {
            log.error("Content preparation failed for {}", item.id(), exception);
            store.failed(item, exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage());
        }
    }

}
