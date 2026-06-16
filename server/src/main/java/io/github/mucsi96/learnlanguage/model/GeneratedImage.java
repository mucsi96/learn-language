package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class GeneratedImage {
  byte[] data;
  String description;
}
