package io.github.mucsi96.learnlanguage.config;

public class OperationIdContext {

    private static final ThreadLocal<String> OPERATION_ID = new ThreadLocal<>();

    public static void set(String operationId) {
        OPERATION_ID.set(operationId);
    }

    public static String get() {
        return OPERATION_ID.get();
    }

    public static void clear() {
        OPERATION_ID.remove();
    }
}
