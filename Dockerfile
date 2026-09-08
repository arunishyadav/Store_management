# Stage 1: Build JAR inside Docker
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY . .
RUN if [ -d "spring-backend" ]; then cd spring-backend; fi && mvn clean package -DskipTests

# Stage 2: Lightweight JRE Runner
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/**/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
