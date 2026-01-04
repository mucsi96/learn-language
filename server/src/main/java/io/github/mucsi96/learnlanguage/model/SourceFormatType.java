package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum SourceFormatType {
    WORD_LIST_WITH_EXAMPLES("wordListWithExamples", "Word list with examples"),
    WORD_LIST_WITH_FORMS_AND_EXAMPLES("wordListWithFormsAndExamples", "Word list with forms and examples"),
    FLOWING_TEXT("flowingText", "Flowing text");

    private final String code;
    private final String displayName;

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static SourceFormatType fromString(String code) {
        for (SourceFormatType type : values()) {
            if (type.code.equalsIgnoreCase(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown source format type: " + code);
    }
}
