package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Data;

@Data
public class ExtractionRegionCreateRequest {
    private List<Region> regions;

    @Data
    public static class Region {
        private int pageNumber;
        private double x;
        private double y;
        private double width;
        private double height;
    }
}
