package io.github.mucsi96.learnlanguage.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;
import lombok.NoArgsConstructor;

@Data
@SuperBuilder
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class CardSourceData extends CardData {
    private String sourceId;
    private int pageNumber;
}
