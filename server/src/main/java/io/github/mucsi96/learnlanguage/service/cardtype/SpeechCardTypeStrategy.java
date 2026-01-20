package io.github.mucsi96.learnlanguage.service.cardtype;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.CardData;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
        final List<AudioTextItem> texts = new ArrayList<>();

        if (hasText(cardData.getSentence())) {
            texts.add(new AudioTextItem(cardData.getSentence(), "de"));
        }

        final Map<String, String> translation = cardData.getTranslation();
        if (translation != null) {
            final String hungarianTranslation = translation.get("hu");
            if (hasText(hungarianTranslation)) {
                texts.add(new AudioTextItem(hungarianTranslation, "hu"));
            }
        }

        return texts;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
