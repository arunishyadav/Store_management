package com.finsen.store.util;

import com.finsen.store.entity.*;
import com.finsen.store.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

import org.springframework.beans.factory.annotation.Autowired;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final MaterialRepository materialRepository;
    private final StockEntryRepository stockEntryRepository;
    private final SupportContactRepository supportContactRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DatabaseSeeder(UserRepository userRepository, LocationRepository locationRepository, MaterialRepository materialRepository, StockEntryRepository stockEntryRepository, SupportContactRepository supportContactRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.locationRepository = locationRepository;
        this.materialRepository = materialRepository;
        this.stockEntryRepository = stockEntryRepository;
        this.supportContactRepository = supportContactRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (locationRepository.count() == 0) {
            // Add Locations (28 States of India)
            String[] indianStates = {
                "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
                "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
                "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
                "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
            };
            
            Location hyd = null;
            Location ap = null;
            for (String stateName : indianStates) {
                Location loc = locationRepository.save(new Location(null, stateName, stateName.substring(0, Math.min(3, stateName.length())).toUpperCase(), stateName + " Site", true));
                if (stateName.equals("Telangana")) hyd = loc; // For fallback dummy data
                if (stateName.equals("Andhra Pradesh")) ap = loc;
            }
            if (hyd == null) hyd = locationRepository.findAll().get(0);
            if (ap == null) ap = hyd;

            // Add Admin User
            userRepository.save(new User(null, "admin", "admin@finsen.com", passwordEncoder.encode("admin123"), "admin123", "Super Admin", Role.SUPER_ADMIN, null, true));
            userRepository.save(new User(null, "storeadmin", "store@finsen.com", passwordEncoder.encode("store123"), "store123", "Store Incharge", Role.STORE_INCHARGE, hyd, true));

            // Add users from user's sketch
            userRepository.save(new User(null, "@finsen-admin", "admin@finsen.com", passwordEncoder.encode("7Finsenxyz#"), "7Finsenxyz#", "Finsen Admin", Role.SUPER_ADMIN, null, true));
            userRepository.save(new User(null, "@finsen-user", "user@finsen.com", passwordEncoder.encode("7Userzyx#"), "7Userzyx#", "Finsen User", Role.USER, hyd, true));

            // Add specific users for Andhra Pradesh
            userRepository.save(new User(null, "arunish@123", "arunish@finsen.com", passwordEncoder.encode("arunish@123"), "arunish@123", "Arunish Yadav", Role.USER, ap, true));
            userRepository.save(new User(null, "arunish@321", "arunish321@finsen.com", passwordEncoder.encode("arunish@321"), "arunish@321", "Arunish Supervisor", Role.STORE_INCHARGE, ap, true));

            // Seed Dummy Data for ALL locations so the user can see it anywhere
            for (Location loc : locationRepository.findAll()) {
                // Add Materials
                Material acc = materialRepository.save(new Material(null, "MAT01_" + loc.getCode(), "Lose Accessories", "Hardware", "Nos", 5.0, loc, true));
                Material parts = materialRepository.save(new Material(null, "MAT02_" + loc.getCode(), "Loose S S Parts", "Hardware", "Nos", 5.0, loc, true));
                Material flange = materialRepository.save(new Material(null, "MAT03_" + loc.getCode(), "M.S. Flange", "Hardware", "Nos", 10.0, loc, true));
                Material cement = materialRepository.save(new Material(null, "MAT04_" + loc.getCode(), "CEMENT", "Civil", "Bags", 100.0, loc, true));
                Material nojal = materialRepository.save(new Material(null, "MAT05_" + loc.getCode(), "Nojal", "Hardware", "Nos", 10.0, loc, true));
                Material goggles = materialRepository.save(new Material(null, "MAT06_" + loc.getCode(), "Goggles", "Safety", "Nos", 5.0, loc, true));
                Material fencing = materialRepository.save(new Material(null, "MAT07_" + loc.getCode(), "fencing wire", "Hardware", "Kg", 10.0, loc, true));
                Material unknown = materialRepository.save(new Material(null, "MAT08_" + loc.getCode(), "UNKNOWN", "Hardware", "Nos", 1.0, loc, true));

                // Add Stock Entries
                stockEntryRepository.save(new StockEntry(null, "LR NO : 1086497228", acc, 1.0, LocalDate.now(), LocalTime.now().withNano(0), "YES", 0.0, null, "NA", "NA", 1.0, "NA", "NA", "NA", "Raju", loc));
                stockEntryRepository.save(new StockEntry(null, "LR No: 1100794662", parts, 4.0, LocalDate.now(), LocalTime.now().withNano(0), "YES", 0.0, null, "NA", "NA", 4.0, "NA", "NA", "NA", "Raju", loc));
                stockEntryRepository.save(new StockEntry(null, "LR No: 1100794960", flange, 30.0, LocalDate.now(), LocalTime.now().withNano(0), "YES", 4.0, LocalDate.now(), "vijay kumar", "Arunish", 26.0, "NA", "NA", "NA", "Raju", loc));
                stockEntryRepository.save(new StockEntry(null, "GR NO: 8946", cement, 720.0, LocalDate.now(), LocalTime.now().withNano(0), "YES", 0.0, null, "NA", "NA", 720.0, "NA", "NA", "NA", "Shyam", loc));
                stockEntryRepository.save(new StockEntry(null, "GR NO: 4257", cement, 630.0, LocalDate.now(), LocalTime.now().withNano(0), "YES", 0.0, null, "NA", "NA", 630.0, "NA", "NA", "NA", "Shyam", loc));
                
                stockEntryRepository.save(new StockEntry(null, "NA", nojal, null, null, null, "YES", 4.0, LocalDate.now(), "vijay kumar", "Arunish", null, "550 mm", "2 inch", "NA", "Mukesh", loc));
                stockEntryRepository.save(new StockEntry(null, "NA", nojal, null, null, null, "YES", 5.0, LocalDate.now(), "vijay kumar", "Arunish", null, "551 mm", "1 inch", "NA", "Mukesh", loc));
                stockEntryRepository.save(new StockEntry(null, "NA", nojal, null, null, null, "YES", 3.0, LocalDate.now(), "vijay kumar", "Arunish", null, "552 mm", "2 inch_rtd", "NA", "Mukesh", loc));
                stockEntryRepository.save(new StockEntry(null, "NA", nojal, null, null, null, "YES", 7.0, LocalDate.now(), "vijay kumar", "Arunish", null, "553 mm", "10 inch", "NA", "Mukesh", loc));
                stockEntryRepository.save(new StockEntry(null, "NA", nojal, null, null, null, "YES", 6.0, LocalDate.now(), "vijay kumar", "Arunish", null, "554 mm", "6 inch", "NA", "Mukesh", loc));
                stockEntryRepository.save(new StockEntry(null, "NA", nojal, null, null, null, "YES", 2.0, LocalDate.now(), "vijay kumar", "Arunish", null, "555 mm", "4 inch", "NA", "Mukesh", loc));
                stockEntryRepository.save(new StockEntry(null, "NA", goggles, null, null, null, "YES", 7.0, LocalDate.now(), "Tulshi kumar", "Arunish", null, "NA", "NA", "NA", "Mukesh", loc));
                stockEntryRepository.save(new StockEntry(null, "621", unknown, 1.0, LocalDate.now(), LocalTime.now(), "YES", 0.0, null, "NA", "NA", 1.0, "NA", "NA", "2kg", "Suresh", loc));
                stockEntryRepository.save(new StockEntry(null, "73130010", fencing, 1.0, LocalDate.now(), LocalTime.now(), "NO", 1.0, LocalDate.now(), "vijay kumar", "Arunish", 0.0, "NA", "NA", "27.660kg", "Suresh", loc));
            }
            
            System.out.println("Excel Dummy Data Seeded Successfully!");
        }

        // Always ensure Support Contacts exist
        if (supportContactRepository.count() == 0) {
            supportContactRepository.save(new SupportContact(null, "IT Engineer", "Arunish Yadav", "7858937433", "arunishyadav121@gmail.com"));
            supportContactRepository.save(new SupportContact(null, "Account Head", "Sachin Sir", "9630493830", ""));
            System.out.println("Support Contacts Seeded Successfully!");
        }
    }
}
