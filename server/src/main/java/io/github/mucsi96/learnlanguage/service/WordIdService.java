package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class WordIdService {

    private static final Pattern SPLIT_PATTERN = Pattern.compile("\\s?[,/(-]");

    public String generateWordId(String word) {
        return SPLIT_PATTERN.split(word)[0].trim().toLowerCase().replace(" ", "-");
    }
}
