package io.github.mucsi96.learnlanguage.model;

/**
 * Defines the readiness state of a card in the study system.
 * This indicates whether a card is ready for review, currently in review, or has been reviewed.
 */
public class CardReadiness {
    public static final String IN_REVIEW = "IN_REVIEW";
    public static final String REVIEWED = "REVIEWED";
    public static final String READY = "READY";
    public static final String KNOWN = "KNOWN";

    // Private constructor to prevent instantiation
    private CardReadiness() {
        throw new UnsupportedOperationException("Utility class");
    }
}
