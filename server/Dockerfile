# Stage 1: Compile a GraalVM native image
# The innovation line (25iN) is required: the native-maven-plugin managed by
# Spring Boot needs its reachability-metadata schema support, which the 25.0.x
# maintenance line lacks
FROM ghcr.io/graalvm/native-image-community:25i3 AS build

WORKDIR /workspace

# Copy build definition and download dependencies (cached separately from source)
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn

# Strip Microsoft's jar signatures: AOT-generated classes share packages with
# the signed Azure jars, and native-image refuses mixed signer information
RUN microdnf install -y zip && microdnf clean all \
  && find /root/.m2/repository/com/azure /root/.m2/repository/com/microsoft -name '*.jar' \
       -exec sh -c 'zip -q -d "$1" "META-INF/*.SF" "META-INF/*.RSA" "META-INF/*.DSA" || true' _ {} \;

# Copy source code and build the native executable; the builder heap is pinned
# so the compile phase does not exhaust the CI runner's memory
COPY src ./src
RUN ./mvnw -Pnative native:compile -DskipTests -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn "-Dorg.graalvm.buildtools.native.buildArgs=-J-Xmx12g"

# Collect the executable and the AWT/JNI shared libraries emitted next to it
RUN mkdir /dist && cp target/learnlanguage /dist/ && (cp target/*.so /dist/ 2>/dev/null || true)

# Stage 2: Runtime image
FROM docker.io/library/ubuntu:24.04

VOLUME /tmp

ARG SPRING_PROFILES_ACTIVE=prod

RUN apt-get update && apt-get install -y --no-install-recommends curl ffmpeg fontconfig fonts-dejavu-core libfreetype6 && rm -rf /var/lib/apt/lists/*

COPY --from=build /dist /app

# sun.awt.FontConfiguration requires java.home to point at an existing
# directory with a lib folder; fonts themselves come from system fontconfig
RUN mkdir -p /app/lib

ENV SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}

# Run the application
ENTRYPOINT ["/app/learnlanguage", "-XX:MaximumHeapSizePercent=75", "-Djdk.httpclient.allowRestrictedHeaders=content-length", "-Djava.home=/app", "-Djava.awt.headless=true"]
