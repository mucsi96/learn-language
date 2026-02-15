package io.github.mucsi96.learnlanguage.service.cardtype;

import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.CardData;

import java.util.List;

public interface CardTypeStrategy {

    String getPrimaryText(CardData cardData);

    List<AudioTextItem> getRequiredAudioTexts(CardData cardData);

    record AudioTextItem(String text, String language) {}

    default boolean isMissingAudio(CardData cardData) {
        if (cardData == null) {
            return false;
        }

        final List<AudioData> audioList = cardData.getAudio() != null ? cardData.getAudio() : List.of();
        final List<AudioTextItem> requiredTexts = getRequiredAudioTexts(cardData);

        return requiredTexts.stream()
                .filter(item -> hasText(item.text()))
                .anyMatch(item -> !hasAudioForText(audioList, item.text()));
    }

    private boolean hasAudioForText(List<AudioData> audioList, String text) {
        if (!hasText(text)) {
            return false;
        }

        return audioList.stream()
                .filter(audio -> audio != null && hasText(audio.getText()))
                .anyMatch(audio -> text.equals(audio.getText()));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
