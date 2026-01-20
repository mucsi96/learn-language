package io.github.mucsi96.learnlanguage.service.cardtype;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.CardData;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Component
public class SpeechCardTypeStrategy implements CardTypeStrategy {

    @Override
    public String getPrimaryText(CardData cardData) {
        return cardData != null ? cardData.getSentence() : null;
    }

    @Override
    public List<AudioTextItem> getRequiredAudioTexts(Card card) {
        if (card == null || card.getData() == null) {
            return List.of();
        }

        final CardData cardData = card.getData();

        return Stream.of(
                Optional.ofNullable(cardData.getSentence())
                        .filter(this::hasText)
                        .map(sentence -> new AudioTextItem(sentence, "de")),
                Optional.ofNullable(cardData.getTranslation())
                        .map(t -> t.get("hu"))
                        .filter(this::hasText)
                        .map(hu -> new AudioTextItem(hu, "hu"))
        ).flatMap(Optional::stream).toList();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
