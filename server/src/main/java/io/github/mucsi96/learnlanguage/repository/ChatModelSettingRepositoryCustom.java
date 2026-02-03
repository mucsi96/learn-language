package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.model.OperationType;

public interface ChatModelSettingRepositoryCustom {
    void clearPrimaryByOperationType(OperationType operationType);

    void enableByOperationType(OperationType operationType);
}
