package io.github.mucsi96.learnlanguage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ContentModels.VocabularyResult;
import io.github.mucsi96.learnlanguage.model.ContentModels.VocabularyWord;

class ContentTextServiceTest {
    @ParameterizedTest
    @CsvSource({"Freund,noun,der,der Freund", "Bank,noun,die,die Bank", "Haus,noun,das,das Haus",
            "sehen,verb,'',sehen", "auf jeden Fall,expression,'',auf jeden Fall"})
    void preservesArticlesForNounCardsAndBareLemmasForMatching(String lemma, String type, String article, String cardWord) {
        final VocabularyWord word = new VocabularyWord(lemma, type, article, List.of(), List.of(lemma), List.of(lemma));
        final var result = serviceReturning(word).vocabulary(lemma, ChatModel.values()[0]);

        assertThat(result).containsExactly(word);
        assertThat(result.getFirst().cardWord()).isEqualTo(cardWord);
        assertThat(ContentTextService.lexicalKey(cardWord)).isEqualTo(ContentTextService.lexicalKey(lemma));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"ein", "dem", "unknown"})
    void rejectsNounsWithoutDefiniteArticlesDuringExtraction(String article) {
        final VocabularyWord word = new VocabularyWord("Haus", "noun", article, List.of(), List.of("Haus"), List.of("Haus"));
        final ContentTextService service = serviceReturning(word);

        assertThatThrownBy(() -> service.vocabulary("Haus", ChatModel.values()[0]))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("definite article");
    }

    private ContentTextService serviceReturning(VocabularyWord word) {
        final ChatService chat = mock(ChatService.class);
        when(chat.callWithLogging(any(), any(), anyString(), anyString(), eq(VocabularyResult.class)))
                .thenReturn(new VocabularyResult(List.of(word)));
        return new ContentTextService(chat, null);
    }
}
