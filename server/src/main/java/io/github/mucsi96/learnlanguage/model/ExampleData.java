package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExampleData {
  private String de;
  private String en;
  private String hu;
  private String ch;
  private Boolean isSelected;
  private String imageUrl;
}
