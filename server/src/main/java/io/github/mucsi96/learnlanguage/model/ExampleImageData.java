package io.github.mucsi96.learnlanguage.model;

import java.io.Serializable;

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
public class ExampleImageData implements Serializable {
  private String id;

  @JsonInclude(Include.NON_DEFAULT)
  private Boolean isFavorite;

  @JsonInclude(Include.NON_NULL)
  private String model;
}
