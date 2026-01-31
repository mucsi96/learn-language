package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Data;

@Data
public class RegionExtractionRequest {
    private List<RegionRequest> regions;
    private ChatModel model;
}
