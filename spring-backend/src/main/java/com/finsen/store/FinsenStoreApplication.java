package com.finsen.store;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinsenStoreApplication {

	public static void main(String[] args) {
		System.setProperty("server.port", "8080");

		String neonUrl = System.getenv("SPRING_DATASOURCE_URL");
		if (neonUrl == null || neonUrl.isEmpty()) {
			neonUrl = "jdbc:postgresql://ep-silent-flower-a5s0z84j.us-east-2.aws.neon.tech/neondb?sslmode=require";
		}
		String neonUser = System.getenv("SPRING_DATASOURCE_USERNAME");
		if (neonUser == null || neonUser.isEmpty()) {
			neonUser = "neondb_owner";
		}
		String neonPass = System.getenv("SPRING_DATASOURCE_PASSWORD");
		if (neonPass == null || neonPass.isEmpty()) {
			neonPass = "npg_x7LQRX9gW8vJ";
		}

		System.setProperty("spring.datasource.url", neonUrl);
		System.setProperty("spring.datasource.username", neonUser);
		System.setProperty("spring.datasource.password", neonPass);

		if (neonUrl.startsWith("jdbc:mysql:")) {
			System.setProperty("spring.datasource.driver-class-name", "com.mysql.cj.jdbc.Driver");
			System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.MySQLDialect");
			System.setProperty("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
		} else {
			System.setProperty("spring.datasource.driver-class-name", "org.postgresql.Driver");
			System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
			System.setProperty("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
		}

		System.setProperty("spring.jpa.properties.hibernate.temp.use_jdbc_metadata_defaults", "false");

		// HikariCP Resilience
		System.setProperty("spring.datasource.hikari.initialization-fail-timeout", "-1");
		System.setProperty("spring.datasource.hikari.connection-timeout", "60000");
		System.setProperty("spring.datasource.hikari.maximum-pool-size", "5");
		System.setProperty("spring.datasource.hikari.minimum-idle", "1");

		System.setProperty("spring.jpa.hibernate.ddl-auto", "update");

		SpringApplication.run(FinsenStoreApplication.class, args);
	}

}
