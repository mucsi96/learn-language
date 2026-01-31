package io.github.mucsi96.learnlanguage.service.cardtype;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.CardType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CardTypeStrategyFactory {

    private final VocabularyCardTypeStrategy vocabularyCardTypeStrategy;
    private final SpeechCardTypeStrategy speechCardTypeStrategy;
    private final GrammarCardTypeStrategy grammarCardTypeStrategy;

    public CardTypeStrategy getStrategy(Card card) {
        if (card == null || card.getSource() == null) {
            return vocabularyCardTypeStrategy;
        }

        return getStrategy(card.getSource().getCardType());
    }

    public CardTypeStrategy getStrategy(CardType cardType) {
        if (cardType == null) {
            return vocabularyCardTypeStrategy;
        }

        return switch (cardType) {
            case VOCABULARY -> vocabularyCardTypeStrategy;
            case SPEECH -> speechCardTypeStrategy;
            case GRAMMAR -> grammarCardTypeStrategy;
        };
    }
}
