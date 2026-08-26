package com.finsen.store;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinsenStoreApplication {

	public static void main(String[] args) {
		System.setProperty("SPRING_DATASOURCE_URL", "jdbc:h2:file:./data/finsen_db;DB_CLOSE_ON_EXIT=FALSE;AUTO_RECONNECT=TRUE");
		System.setProperty("spring.datasource.url", "jdbc:h2:file:./data/finsen_db;DB_CLOSE_ON_EXIT=FALSE;AUTO_RECONNECT=TRUE");
		System.setProperty("spring.datasource.username", "sa");
		System.setProperty("spring.datasource.password", "");
		System.setProperty("spring.datasource.driver-class-name", "org.h2.Driver");
		System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.H2Dialect");
		System.setProperty("spring.jpa.hibernate.ddl-auto", "update");

		SpringApplication.run(FinsenStoreApplication.class, args);
	}

}
