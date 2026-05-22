package io.github.mucsi96.learnlanguage.model;

import lombok.Data;

@Data
public class PendingPhotoConsumeRequest {
  private ChatModel model;
  private Integer cardCount;
}
