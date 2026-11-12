package io.github.mucsi96.learnlanguage.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ImageDescriptionsResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;

class ImageServiceTest {

  private final ChatService chatService = mock(ChatService.class);
  private final ChatModelSettingService settings = mock(ChatModelSettingService.class);
  private final ChatModel model = ChatModel.GPT_5_6_SOL;
  private final ImageService service = new ImageService(mock(OpenAIImageService.class),
      mock(GoogleImageService.class), mock(IdeogramImageService.class), chatService, settings);

  @Test
  void plansAllScenesInOneCallUsingTheExplicitContext() {
    final var descriptions = List.of("A family boarding a steam train.", "A driver preparing a steam locomotive.");
    respondWith(descriptions);

    final var result = service.describeScenes("abfahren", "A steam train at sunset", 2, null);

    assertEquals(descriptions, result.descriptions());
    verify(chatService).callWithLogging(eq(model), eq(OperationType.IMAGE_DESCRIPTION), anyString(),
        eq("Count: 2\nInput:\nA steam train at sunset"), eq(ImageDescriptionsResponse.class));
  }

  @Test
  void usesTheOriginalInputWhenContextIsBlank() {
    respondWith(List.of("A family boarding a train."));

    service.describeScenes("abfahren", " ", 1, null);

    verify(chatService).callWithLogging(eq(model), eq(OperationType.IMAGE_DESCRIPTION), anyString(),
        eq("Count: 1\nInput:\nabfahren"), eq(ImageDescriptionsResponse.class));
  }

  @ParameterizedTest
  @MethodSource("invalidDescriptions")
  void rejectsIncompleteOrRepeatedSceneBatches(List<String> descriptions) {
    respondWith(descriptions);

    assertThrows(IllegalStateException.class, () -> service.describeScenes("abfahren", null, 2, null));
  }

  private static Stream<List<String>> invalidDescriptions() {
    return Stream.of(null, List.of(), List.of("One scene"), List.of("One", "Two", "Three"),
        List.of("One scene", " "), Arrays.asList("One scene", null),
        List.of("One scene", "One scene"), List.of("One scene", " ONE SCENE "));
  }

  private void respondWith(List<String> descriptions) {
    when(settings.getPrimaryModel(OperationType.IMAGE_DESCRIPTION)).thenReturn(model);
    when(chatService.callWithLogging(eq(model), eq(OperationType.IMAGE_DESCRIPTION), anyString(),
        anyString(), eq(ImageDescriptionsResponse.class)))
        .thenReturn(new ImageDescriptionsResponse(descriptions));
  }

  @ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"male", "female"})
  void preservesSpeakerContextAlongsideCustomSceneInstructions(String gender) {
    respondWith(List.of("A parent in a garden."));

    service.describeScenes("Ich bin Mutter.", "A sunny garden", 1, gender);

    verify(chatService).callWithLogging(eq(model), eq(OperationType.IMAGE_DESCRIPTION),
        contains("not other people mentioned or the grammatical gender of nouns"),
        eq("Count: 1\nInput:\nA sunny garden\nExample sentence:\nIch bin Mutter.\nSpeaker gender hint: " + gender),
        eq(ImageDescriptionsResponse.class));
  }
}
