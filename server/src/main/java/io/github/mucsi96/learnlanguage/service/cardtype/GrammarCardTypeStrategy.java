package io.github.mucsi96.learnlanguage.service.cardtype;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Component
public class GrammarCardTypeStrategy implements CardTypeStrategy {

    private static final Pattern GRAMMAR_GAP_PATTERN = Pattern.compile("\\[([^\\]]+)\\]");

    @Override
    public String getPrimaryText(CardData cardData) {
        return getFirstExample(cardData).map(ExampleData::getDe).orElse(null);
    }

    @Override
    public List<AudioTextItem> getRequiredAudioTexts(CardData cardData) {
        if (cardData == null) {
            return List.of();
        }

        final Optional<ExampleData> example = getFirstExample(cardData);

        return Stream.of(
                example.map(ExampleData::getDe)
                        .filter(this::hasText)
                        .map(this::stripGapBrackets)
                        .map(de -> new AudioTextItem(de, "de", false))
        ).flatMap(Optional::stream).toList();
    }

    private String stripGapBrackets(String sentence) {
        return GRAMMAR_GAP_PATTERN.matcher(sentence).replaceAll("$1");
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
