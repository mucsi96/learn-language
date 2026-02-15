package io.github.mucsi96.learnlanguage.service.cardtype;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Component
public class VocabularyCardTypeStrategy implements CardTypeStrategy {

    @Override
    public String getPrimaryText(CardData cardData) {
        return cardData != null ? cardData.getWord() : null;
    }

    @Override
    public List<AudioTextItem> getRequiredAudioTexts(CardData cardData) {
        if (cardData == null) {
            return List.of();
        }

        final Optional<ExampleData> selectedExample = findSelectedExample(cardData);

        return Stream.of(
                Optional.ofNullable(cardData.getWord())
                        .filter(this::hasText)
                        .map(word -> new AudioTextItem(word, "de")),
                Optional.ofNullable(cardData.getTranslation())
                        .map(t -> t.get("hu"))
                        .filter(this::hasText)
                        .map(hu -> new AudioTextItem(hu, "hu")),
                selectedExample
                        .map(ExampleData::getDe)
                        .filter(this::hasText)
                        .map(de -> new AudioTextItem(de, "de")),
                selectedExample
                        .map(ExampleData::getHu)
                        .filter(this::hasText)
                        .map(hu -> new AudioTextItem(hu, "hu"))
        ).flatMap(Optional::stream).toList();
    }

    private Optional<ExampleData> findSelectedExample(CardData cardData) {
        if (cardData.getExamples() == null) {
            return Optional.empty();
        }

        return cardData.getExamples().stream()
                .filter(example -> Boolean.TRUE.equals(example.getIsSelected()))
                .findFirst();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
