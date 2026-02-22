package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiTokenResponse {
    private Integer id;
    private String name;
    private LocalDateTime createdAt;
}
