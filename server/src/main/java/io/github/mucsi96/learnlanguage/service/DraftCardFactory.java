package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DraftCardFactory {

    private final CardService cardService;
    private final WordIdService wordIdService;

    @Transactional
    public void createVocabularyDraftCard(Source source, int sourcePageNumber, String word,
            String targetLanguage, String translation, List<String> forms, String germanExample) {
        final String cardId = wordIdService.generateWordId(word, translation);

        if (cardService.getCardById(cardId).isPresent()) {
            return;
        }

        cardService.saveCard(Card.builder()
                .id(cardId)
                .source(source)
                .sourcePageNumber(sourcePageNumber)
                .type(CardType.VOCABULARY)
                .data(CardData.builder()
                        .word(word)
                        .translation(Map.of(targetLanguage, translation))
                        .forms(forms)
                        .examples(List.of(ExampleData.builder()
                                .de(germanExample)
                                .build()))
                        .build())
                .readiness(CardReadiness.DRAFT)
                .state("NEW")
                .due(LocalDateTime.now())
                .stability(0f)
                .difficulty(0f)
                .elapsedDays(0f)
                .scheduledDays(0f)
                .learningSteps(0)
                .reps(0)
                .lapses(0)
                .build());
    }
}
