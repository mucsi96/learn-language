package io.github.mucsi96.learnlanguage.converter;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

import io.github.mucsi96.learnlanguage.model.OperationType;

@Component
public class StringToOperationTypeConverter implements Converter<String, OperationType> {

  @Override
  public OperationType convert(String source) {
    return OperationType.fromString(source);
  }
}
