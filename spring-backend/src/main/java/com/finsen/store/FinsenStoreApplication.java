package com.finsen.store;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinsenStoreApplication {

	public static void main(String[] args) {
		String dbUrl = System.getenv("SPRING_DATASOURCE_URL");
		if (dbUrl == null || dbUrl.isEmpty()) {
			dbUrl = System.getenv("DATABASE_URL");
		}
		if (dbUrl == null || dbUrl.isEmpty()) {
			dbUrl = System.getenv("DB_URL");
		}

		String dbUser = System.getenv("SPRING_DATASOURCE_USERNAME");
		if (dbUser == null || dbUser.isEmpty()) {
			dbUser = System.getenv("DB_USER");
		}

		String dbPass = System.getenv("SPRING_DATASOURCE_PASSWORD");
		if (dbPass == null || dbPass.isEmpty()) {
			dbPass = System.getenv("DB_PASS");
		}

		if (dbUrl != null && !dbUrl.isEmpty()) {
			if (dbUrl.startsWith("postgres://")) {
				dbUrl = dbUrl.replace("postgres://", "jdbc:postgresql://");
			}
			if (!dbUrl.startsWith("jdbc:")) {
				dbUrl = "jdbc:" + dbUrl;
			}
			System.setProperty("spring.datasource.url", dbUrl);
			if (dbUser != null && !dbUser.isEmpty()) {
				System.setProperty("spring.datasource.username", dbUser);
			}
			if (dbPass != null && !dbPass.isEmpty()) {
				System.setProperty("spring.datasource.password", dbPass);
			}
		} else {
			System.setProperty("spring.datasource.url", "jdbc:postgresql://ep-silent-flower-a5s0z84j.us-east-2.aws.neon.tech/neondb?sslmode=require");
			System.setProperty("spring.datasource.username", "neondb_owner");
			System.setProperty("spring.datasource.password", "npg_x7LQRX9gW8vJ");
		}

		System.setProperty("spring.datasource.driver-class-name", "org.postgresql.Driver");
		System.setProperty("spring.datasource.hikari.initialization-fail-timeout", "-1");
		System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
		System.setProperty("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
		System.setProperty("spring.jpa.hibernate.ddl-auto", "update");

		SpringApplication.run(FinsenStoreApplication.class, args);
	}

}
