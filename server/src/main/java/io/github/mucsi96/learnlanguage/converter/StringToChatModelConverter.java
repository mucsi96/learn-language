package io.github.mucsi96.learnlanguage.converter;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

import io.github.mucsi96.learnlanguage.model.ChatModel;

@Component
public class StringToChatModelConverter implements Converter<String, ChatModel> {

  @Override
  public ChatModel convert(String source) {
    return ChatModel.fromString(source);
  }
}
