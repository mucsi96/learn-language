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
public class ApiTokenCreateResponse {
    private Integer id;
    private String name;
    private String token;
    private LocalDateTime createdAt;
}
