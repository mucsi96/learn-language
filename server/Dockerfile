# Stage 1: Build server with Maven
FROM maven:3-eclipse-temurin-21 AS build

WORKDIR /workspace

# Copy POM and source code
COPY pom.xml ./
COPY src ./src

# Build the application
RUN mvn package -DskipTests -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn

# Extract dependencies for layer caching
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# Stage 2: Runtime image
FROM bellsoft/liberica-openjre-alpine-musl:25

VOLUME /tmp

ARG DEPENDENCY=/workspace/target/dependency
ARG SPRING_PROFILES_ACTIVE=prod

# Install PostgreSQL client and curl for health checks
RUN apk add postgresql16-client curl

# Copy application layers
COPY --from=build ${DEPENDENCY}/BOOT-INF/lib /app/lib
COPY --from=build ${DEPENDENCY}/META-INF /app/META-INF
COPY --from=build ${DEPENDENCY}/BOOT-INF/classes /app

# Set environment variables
ENV SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}

# Expose application port and actuator port
EXPOSE 8080 8082

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8082/actuator/health/readiness || exit 1

# Run the application
ENTRYPOINT ["java", "-cp", "app:app/lib/*", "io.github.mucsi96.learnlanguage.LearnLanguageApplication"]
