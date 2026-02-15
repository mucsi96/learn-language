package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.CardView;
import io.github.mucsi96.learnlanguage.entity.Source;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CardResponse {

    private String id;
    private CardSourceResponse source;
    private Integer sourcePageNumber;
    private CardData data;
    private String readiness;
    private LocalDateTime due;
    private Float stability;
    private Float difficulty;
    private Float elapsedDays;
    private Float scheduledDays;
    private Integer learningSteps;
    private Integer reps;
    private Integer lapses;
    private String state;
    private LocalDateTime lastReview;

    public static CardResponse from(Card card) {
        final Source source = card.getSource();
        return CardResponse.builder()
                .id(card.getId())
                .source(CardSourceResponse.builder()
                        .id(source.getId())
                        .name(source.getName())
                        .sourceType(source.getSourceType())
                        .startPage(source.getStartPage())
                        .bookmarkedPage(source.getBookmarkedPage())
                        .languageLevel(source.getLanguageLevel())
                        .cardType(source.getCardType())
                        .formatType(source.getFormatType())
                        .build())
                .sourcePageNumber(card.getSourcePageNumber())
                .data(card.getData())
                .readiness(card.getReadiness())
                .due(card.getDue())
                .stability(card.getStability())
                .difficulty(card.getDifficulty())
                .elapsedDays(card.getElapsedDays())
                .scheduledDays(card.getScheduledDays())
                .learningSteps(card.getLearningSteps())
                .reps(card.getReps())
                .lapses(card.getLapses())
                .state(card.getState())
                .lastReview(card.getLastReview())
                .build();
    }

    public static CardResponse from(CardView view) {
        return CardResponse.builder()
                .id(view.getId())
                .source(CardSourceResponse.builder()
                        .id(view.getSourceId())
                        .name(view.getSourceName())
                        .sourceType(view.getSourceType())
                        .startPage(view.getSourceStartPage())
                        .bookmarkedPage(view.getSourceBookmarkedPage())
                        .languageLevel(view.getLanguageLevel())
                        .cardType(view.getCardType())
                        .formatType(view.getFormatType())
                        .build())
                .sourcePageNumber(view.getSourcePageNumber())
                .data(view.getData())
                .readiness(view.getReadiness())
                .due(view.getDue())
                .stability(view.getStability())
                .difficulty(view.getDifficulty())
                .elapsedDays(view.getElapsedDays())
                .scheduledDays(view.getScheduledDays())
                .learningSteps(view.getLearningSteps())
                .reps(view.getReps())
                .lapses(view.getLapses())
                .state(view.getState())
                .lastReview(view.getLastReview())
                .build();
    }

    @Data
    @Builder
    public static class CardSourceResponse {
        private String id;
        private String name;
        private SourceType sourceType;
        private Integer startPage;
        private Integer bookmarkedPage;
        private LanguageLevel languageLevel;
        private CardType cardType;
        private SourceFormatType formatType;
    }
}
