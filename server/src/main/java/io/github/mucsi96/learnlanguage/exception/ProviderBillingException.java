package io.github.mucsi96.learnlanguage.exception;

import java.util.stream.Stream;
import java.util.Optional;
import io.github.mucsi96.learnlanguage.model.ModelProvider;
import lombok.Getter;

@Getter
public class ProviderBillingException extends RuntimeException {
    private final ModelProvider provider;

    public ProviderBillingException(ModelProvider provider, Throwable cause) {
        super(provider.getBillingMessage(), cause);
        this.provider = provider;
    }

    public static Optional<ProviderBillingException> findCause(Throwable error) {
        return Stream.iterate(error, cause -> cause != null, Throwable::getCause)
            .filter(ProviderBillingException.class::isInstance)
            .map(ProviderBillingException.class::cast)
            .findFirst();
    }
}
