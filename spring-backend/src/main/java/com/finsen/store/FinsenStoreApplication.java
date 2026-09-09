package com.finsen.store;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinsenStoreApplication {

	public static void main(String[] args) {
		String renderPort = System.getenv("PORT");
		if (renderPort != null && !renderPort.isEmpty()) {
			System.setProperty("server.port", renderPort);
		} else {
			System.setProperty("server.port", "8080");
		}

		// STRICT NEON 24/7 FREE POSTGRESQL DATABASE BINDING
		String neonUrl = "jdbc:postgresql://ep-silent-flower-a5s0z84j.us-east-2.aws.neon.tech/neondb?sslmode=require";
		String neonUser = "neondb_owner";
		String neonPass = "npg_x7LQRX9gW8vJ";

		System.setProperty("spring.datasource.url", neonUrl);
		System.setProperty("spring.datasource.username", neonUser);
		System.setProperty("spring.datasource.password", neonPass);
		System.setProperty("spring.datasource.driver-class-name", "org.postgresql.Driver");

		// Hibernate Dialect Properties
		System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
		System.setProperty("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
		System.setProperty("spring.jpa.properties.hibernate.temp.use_jdbc_metadata_defaults", "false");

		// HikariCP Resilience
		System.setProperty("spring.datasource.hikari.initialization-fail-timeout", "-1");
		System.setProperty("spring.datasource.hikari.connection-timeout", "60000");
		System.setProperty("spring.datasource.hikari.maximum-pool-size", "10");

		System.setProperty("spring.jpa.hibernate.ddl-auto", "update");

		SpringApplication.run(FinsenStoreApplication.class, args);
	}

}
