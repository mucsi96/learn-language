package io.github.mucsi96.learnlanguage.model;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceRectangle implements Serializable {
    private double x;
    private double y;
    private double width;
    private double height;
}
