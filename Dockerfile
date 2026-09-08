# Stage 1: Build Spring Boot app with Maven
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY spring-backend/pom.xml ./spring-backend/
COPY spring-backend/src ./spring-backend/src
RUN cd spring-backend && mvn clean package -DskipTests -Djar.finalName=app

# Stage 2: Lightweight JRE Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/spring-backend/target/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
