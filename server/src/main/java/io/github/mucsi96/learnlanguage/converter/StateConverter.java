package io.github.mucsi96.learnlanguage.converter;

import io.github.mucsi96.learnlanguage.entity.State;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class StateConverter implements AttributeConverter<State, Integer> {

    @Override
    public Integer convertToDatabaseColumn(State state) {
        return state != null ? state.getValue() : null;
    }

    @Override
    public State convertToEntityAttribute(Integer value) {
        if (value == null) {
            return null;
        }
        for (State state : State.values()) {
            if (state.getValue() == value) {
                return state;
            }
        }
        throw new IllegalArgumentException("Unknown value for State: " + value);
    }
}
