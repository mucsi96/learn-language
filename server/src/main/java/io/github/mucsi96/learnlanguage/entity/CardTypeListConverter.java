package io.github.mucsi96.learnlanguage.entity;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import io.github.mucsi96.learnlanguage.model.CardType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class CardTypeListConverter implements AttributeConverter<List<CardType>, String> {

  @Override
  public String convertToDatabaseColumn(List<CardType> attribute) {
    return attribute == null || attribute.isEmpty()
        ? null
        : attribute.stream().map(Enum::name).collect(Collectors.joining(","));
  }

  @Override
  public List<CardType> convertToEntityAttribute(String dbData) {
    return dbData == null || dbData.isBlank()
        ? List.of()
        : Arrays.stream(dbData.split(",")).map(CardType::valueOf).toList();
  }
}
