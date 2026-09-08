# Stage 1: Build JAR inside Docker
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY spring-backend/pom.xml ./spring-backend/
COPY spring-backend/src ./spring-backend/src
RUN cd spring-backend && mvn clean package -DskipTests

# Stage 2: Lightweight JRE Runner
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/spring-backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
