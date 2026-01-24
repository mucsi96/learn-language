package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegionCoordinates {
    private int pageNumber;
    private double x;
    private double y;
    private double width;
    private double height;
}
