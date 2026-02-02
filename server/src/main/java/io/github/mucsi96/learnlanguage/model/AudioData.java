package io.github.mucsi96.learnlanguage.model;

import java.io.Serializable;

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
public class AudioData implements Serializable {
    private String id;
    private String text;
    private String language;
    private String voice;
    private String model;

    @JsonInclude(Include.NON_DEFAULT)
    private Boolean selected;
}
