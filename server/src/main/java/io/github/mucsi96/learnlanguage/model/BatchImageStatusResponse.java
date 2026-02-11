package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchImageStatusResponse {
  private String status;

  @JsonInclude(Include.NON_NULL)
  private List<BatchImageResultItem> results;
}
