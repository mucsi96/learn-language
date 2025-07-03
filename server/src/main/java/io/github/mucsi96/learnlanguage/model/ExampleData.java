package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

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

  @JsonInclude(Include.NON_DEFAULT)
  private Boolean isSelected;

  private List<ExampleImageData> images;
}
