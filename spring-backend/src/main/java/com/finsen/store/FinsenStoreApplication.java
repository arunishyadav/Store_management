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
		System.setProperty("spring.datasource.hikari.maximum-pool-size", "5");
		System.setProperty("spring.datasource.hikari.idle-timeout", "30000");
		System.setProperty("spring.datasource.hikari.max-lifetime", "60000");
		System.setProperty("spring.jpa.hibernate.ddl-auto", "update");

		SpringApplication.run(FinsenStoreApplication.class, args);
	}

	// Keep-Alive Self Ping every 4 minutes to prevent Render free container from sleeping
	@Scheduled(fixedRate = 240000)
	public void keepAlivePing() {
		try {
			java.net.URL url = new java.net.URL("https://finsenstore.com/");
			java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
			conn.setRequestMethod("GET");
			conn.setConnectTimeout(4000);
			conn.getResponseCode();
		} catch (Exception ignored) {}
	}

}
