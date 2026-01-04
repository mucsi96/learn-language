package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum SourceFormatType {
    WORD_LIST_WITH_EXAMPLES("wordListWithExamples"),
    WORD_LIST_WITH_FORMS_AND_EXAMPLES("wordListWithFormsAndExamples"),
    FLOWING_TEXT("flowingText");

    private final String typeName;

    @JsonValue
    public String getTypeName() {
        return typeName;
    }

    @JsonCreator
    public static SourceFormatType fromString(String typeName) {
        for (SourceFormatType type : values()) {
            if (type.typeName.equalsIgnoreCase(typeName)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown source format type: " + typeName);
    }
}
