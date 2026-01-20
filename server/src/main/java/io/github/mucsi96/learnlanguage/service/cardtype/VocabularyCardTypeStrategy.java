package io.github.mucsi96.learnlanguage.service.cardtype;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

@Component
public class VocabularyCardTypeStrategy implements CardTypeStrategy {

    @Override
    public String getPrimaryText(CardData cardData) {
        return cardData != null ? cardData.getWord() : null;
    }

    @Override
    public List<AudioTextItem> getRequiredAudioTexts(Card card) {
        if (card == null || card.getData() == null) {
            return List.of();
        }

        final CardData cardData = card.getData();
        final List<AudioTextItem> texts = new ArrayList<>();

        if (hasText(cardData.getWord())) {
            texts.add(new AudioTextItem(cardData.getWord(), "de"));
        }

        final Map<String, String> translation = cardData.getTranslation();
        if (translation != null) {
            final String hungarianTranslation = translation.get("hu");
            if (hasText(hungarianTranslation)) {
                texts.add(new AudioTextItem(hungarianTranslation, "hu"));
            }
        }

        final Optional<ExampleData> selectedExample = findSelectedExample(cardData);
        if (selectedExample.isPresent()) {
            final ExampleData example = selectedExample.get();

            if (hasText(example.getDe())) {
                texts.add(new AudioTextItem(example.getDe(), "de"));
            }

            if (hasText(example.getHu())) {
                texts.add(new AudioTextItem(example.getHu(), "hu"));
            }
        }

        return texts;
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
