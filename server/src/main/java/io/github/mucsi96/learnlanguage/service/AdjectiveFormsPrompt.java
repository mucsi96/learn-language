package io.github.mucsi96.learnlanguage.service;

final class AdjectiveFormsPrompt {
    static final String RULE = """

            For adjectives, forms MUST contain the Komparativ and Superlativ, in that order, without
            repeating the positive/base form. Use the uninflected comparative and "am" + superlative:
            schnell -> ["schneller", "am schnellsten"], groß -> ["größer", "am größten"],
            gut -> ["besser", "am besten"], hoch -> ["höher", "am höchsten"].
            Generate these degrees even when the source text does not supply them. Handle umlauts,
            irregular forms and spelling changes linguistically, not by blindly adding suffixes.
            For genuinely non-gradable adjectives in the supplied sense (e.g. schwanger), return
            an empty forms list; never invent comparison forms. Other word types follow their own rules.
            """;

    private AdjectiveFormsPrompt() {
    }
}
