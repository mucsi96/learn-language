package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceGroupRequest {
    @NotBlank
    @Size(max = 50)
    @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$")
    private String id;

    @NotBlank
    private String name;
}
