package io.github.mucsi96.learnlanguage.service.cardtype;

import java.util.List;

import org.springframework.stereotype.Component;

import io.github.mucsi96.learnlanguage.model.CardData;

@Component
public class SimpleCardTypeStrategy implements CardTypeStrategy {

    @Override
    public String getPrimaryText(CardData cardData) {
        return cardData.getFrontText();
    }

    @Override
    public List<AudioTextItem> getRequiredAudioTexts(CardData cardData) {
        return List.of();
    }
}
