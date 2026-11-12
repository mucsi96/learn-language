package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySessionCardResponse {
    private CardResponse card;
    private Integer learningPartnerId;
    private String turnName;
    private String studyMode;
    private List<QueueCard> queue;

    public record QueueCard(String id, String state) {}
}
