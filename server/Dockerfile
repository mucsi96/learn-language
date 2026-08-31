# Stage 1: Compile a GraalVM native image
FROM ghcr.io/graalvm/native-image-community:21 AS build

WORKDIR /workspace

# Copy build definition and download dependencies (cached separately from source)
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn

# Copy source code and build the native executable
COPY src ./src
RUN ./mvnw -Pnative native:compile -DskipTests -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn

# Collect the executable and the AWT/JNI shared libraries emitted next to it
RUN mkdir /dist && cp target/learnlanguage /dist/ && (cp target/*.so /dist/ 2>/dev/null || true)

# Stage 2: Runtime image
FROM docker.io/library/ubuntu:24.04

VOLUME /tmp

ARG SPRING_PROFILES_ACTIVE=prod

RUN apt-get update && apt-get install -y --no-install-recommends curl ffmpeg fontconfig fonts-dejavu-core libfreetype6 && rm -rf /var/lib/apt/lists/*

COPY --from=build /dist /app

ENV SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}

# Run the application
ENTRYPOINT ["/app/learnlanguage", "-XX:MaximumHeapSizePercent=75", "-Djdk.httpclient.allowRestrictedHeaders=content-length"]
