package com.finsen.store;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinsenStoreApplication {

	public static void main(String[] args) {
		System.setProperty("spring.datasource.url", "jdbc:postgresql://ep-silent-flower-a5s0z84j.us-east-2.aws.neon.tech/neondb?sslmode=require");
		System.setProperty("spring.datasource.username", "neondb_owner");
		System.setProperty("spring.datasource.password", "npg_x7LQRX9gW8vJ");
		System.setProperty("spring.datasource.driver-class-name", "org.postgresql.Driver");
		System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
		System.setProperty("spring.jpa.hibernate.ddl-auto", "update");

		SpringApplication.run(FinsenStoreApplication.class, args);
	}

}
