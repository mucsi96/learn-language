package io.github.mucsi96.learnlanguage.converter;

import io.github.mucsi96.learnlanguage.entity.Rating;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RatingConverter implements AttributeConverter<Rating, Integer> {

    @Override
    public Integer convertToDatabaseColumn(Rating rating) {
        return rating != null ? rating.getValue() : null;
    }

    @Override
    public Rating convertToEntityAttribute(Integer value) {
        if (value == null) {
            return null;
        }
        for (Rating rating : Rating.values()) {
            if (rating.getValue() == value) {
                return rating;
            }
        }
        throw new IllegalArgumentException("Unknown value for Rating: " + value);
    }
}
