# learn-language
Tools for language learning

## Port Mapping

All host-bound ports use the 70-79 range to avoid conflicts.

| Port | Service | Context |
|------|---------|---------|
| 3070 | Mock OpenAI API | Test pod |
| 3071 | Mock Google AI API | Test pod |
| 3072 | Mock ElevenLabs API | Test pod |
| 3073 | Mock Anthropic API | Test pod |
| 4270 | Angular dev server | Local dev |
| 5470 | PostgreSQL | Test pod |
| 5471 | PostgreSQL | Dev pod |
| 8073 | Spring Boot server | Local dev |
| 8074 | Spring Boot server | Test pod (internal, behind Traefik) |
| 8079 | Mock OAuth2 provider | Test pod |
| 8170 | Traefik HTTP | Test pod |
| 8171 | Traefik dashboard | Test pod |
| 8172 | Spring Boot actuator | Test pod / Local dev |
