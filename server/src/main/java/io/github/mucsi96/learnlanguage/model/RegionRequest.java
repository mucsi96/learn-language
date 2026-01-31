package io.github.mucsi96.learnlanguage.model;

import lombok.Data;

@Data
public class RegionRequest {
    private int pageNumber;
    private double x;
    private double y;
    private double width;
    private double height;
}
