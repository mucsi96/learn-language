package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatModelSettingResponse {
    private Integer id;
    private String modelName;
    private OperationType operationType;
    private Boolean isEnabled;
    private Boolean isPrimary;
}
