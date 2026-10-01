package io.github.mucsi96.learnlanguage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
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

    @ParameterizedTest
    @CsvSource({"der,das", "das,der"})
    void rejectsConflictingNounArticlesRegardlessOfExtractionOrder(String firstArticle, String secondArticle) {
        final String transcript = "Der Band ist schwer. Das Band ist lang.";
        final VocabularyWord first = new VocabularyWord("Band", "noun", firstArticle,
                List.of(), List.of("Der Band ist schwer."), List.of("Band"));
        final VocabularyWord second = new VocabularyWord("Band", "noun", secondArticle,
                List.of(), List.of("Das Band ist lang."), List.of("Band"));

        assertThatThrownBy(() -> serviceReturning(first, second).vocabulary(transcript, ChatModel.values()[0]))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Conflicting articles");
    }

    @Test
    void mergesRepeatedNounsWhenTheirArticlesAgree() {
        final VocabularyWord first = new VocabularyWord("Haus", "noun", "das",
                List.of("die Häuser"), List.of("Das Haus ist klein."), List.of("Haus"));
        final VocabularyWord second = new VocabularyWord("Haus", "noun", "das",
                List.of("die Häuser"), List.of("Das Haus ist alt."), List.of("Haus"));
        final var words = serviceReturning(first, second)
                .vocabulary("Das Haus ist klein. Das Haus ist alt.", ChatModel.values()[0]);

        assertThat(words).hasSize(1);
        assertThat(words.getFirst().cardWord()).isEqualTo("das Haus");
        assertThat(words.getFirst().examples()).containsExactly("Das Haus ist klein.", "Das Haus ist alt.");
        assertThat(words.getFirst().forms()).containsExactly("die Häuser");
    }

    private ContentTextService serviceReturning(VocabularyWord... words) {
        final ChatService chat = mock(ChatService.class);
        when(chat.callWithLogging(any(), any(), anyString(), anyString(), eq(VocabularyResult.class)))
                .thenReturn(new VocabularyResult(List.of(words)));
        return new ContentTextService(chat, null);
    }
}
