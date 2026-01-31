package io.github.mucsi96.learnlanguage.service.cardtype;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Component
public class SpeechCardTypeStrategy implements CardTypeStrategy {

    @Override
    public String getPrimaryText(CardData cardData) {
        return getFirstExample(cardData).map(ExampleData::getDe).orElse(null);
    }

    @Override
    public List<AudioTextItem> getRequiredAudioTexts(Card card) {
        if (card == null || card.getData() == null) {
            return List.of();
        }

        final Optional<ExampleData> example = getFirstExample(card.getData());

        return Stream.of(
                example.map(ExampleData::getDe)
                        .filter(this::hasText)
                        .map(de -> new AudioTextItem(de, "de")),
                example.map(ExampleData::getHu)
                        .filter(this::hasText)
                        .map(hu -> new AudioTextItem(hu, "hu"))
        ).flatMap(Optional::stream).toList();
    }

    private Optional<ExampleData> getFirstExample(CardData cardData) {
        return Optional.ofNullable(cardData)
                .map(CardData::getExamples)
                .filter(examples -> !examples.isEmpty())
                .map(examples -> examples.get(0));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
