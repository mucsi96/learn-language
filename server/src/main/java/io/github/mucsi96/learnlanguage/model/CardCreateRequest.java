package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardCreateRequest {
  private String id;
  private String sourceId;
  private int pageNumber;
  private String word;
  private String type;
  private Map<String, String> translation;
  private List<String> forms;
  private List<ExampleData> examples;

  // FSRS attributes
  private String state;

  @JsonProperty("learning_steps")
  private Integer step;

  private Float stability;
  private Float difficulty;

  @JsonProperty("elapsed_days")
  private Float elapsedDays;

  @JsonProperty("scheduled_days")
  private Float scheduledDays;

  private Integer reps;
  private Integer lapses;
  private LocalDateTime due;
  private LocalDateTime lastReview;
}
