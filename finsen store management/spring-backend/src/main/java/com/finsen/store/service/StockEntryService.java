package com.finsen.store.service;

import com.finsen.store.entity.Location;
import com.finsen.store.entity.Material;
import com.finsen.store.entity.StockEntry;
import com.finsen.store.repository.LocationRepository;
import com.finsen.store.repository.MaterialRepository;
import com.finsen.store.repository.StockEntryRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import com.finsen.store.entity.User;

@Service
public class StockEntryService {

    private final StockEntryRepository stockEntryRepository;
    private final MaterialRepository materialRepository;
    private final LocationRepository locationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;

    @Autowired
    public StockEntryService(StockEntryRepository stockEntryRepository, MaterialRepository materialRepository, LocationRepository locationRepository, SimpMessagingTemplate messagingTemplate, EmailService emailService) {
        this.stockEntryRepository = stockEntryRepository;
        this.materialRepository = materialRepository;
        this.locationRepository = locationRepository;
        this.messagingTemplate = messagingTemplate;
        this.emailService = emailService;
    }

    public List<StockEntry> getEntriesByLocation(UUID locationId) {
        return stockEntryRepository.findByLocationIdOrderByArrivalDateDesc(locationId);
    }

    @Transactional
    public StockEntry createOrUpdateEntry(StockEntry entry) {
        // Validate associations
        Material material = materialRepository.findById(entry.getMaterial().getId())
                .orElseThrow(() -> new RuntimeException("Material not found"));
        Location location = locationRepository.findById(entry.getLocation().getId())
                .orElseThrow(() -> new RuntimeException("Location not found"));
        
        entry.setMaterial(material);
        entry.setLocation(location);
        
        boolean isUpdate = entry.getId() != null;
        
        // Let @PrePersist/@PreUpdate auto-calculate totals
        StockEntry savedEntry = stockEntryRepository.save(entry);
        
        // Notify via WebSocket
        messagingTemplate.convertAndSend("/topic/location/" + location.getId(), "STOCK_UPDATED");
        
        if (isUpdate) {
            try {
                User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                String dataDetails = "Entry ID: " + savedEntry.getId() + "\nBill No: " + savedEntry.getBillNumber() + "\nQuantity: " + savedEntry.getArrivalQuantity();
                emailService.sendAuditEmail(currentUser, "UPDATED", dataDetails, location.getName());
            } catch(Exception e) {
                // Ignore if no auth context (e.g. during seeding)
            }
        }
        
        return savedEntry;
    }

    @Transactional
    public void deleteEntry(UUID id) {
        stockEntryRepository.findById(id).ifPresent(entry -> {
            UUID locationId = entry.getLocation().getId();
            String locationName = entry.getLocation().getName();
            String dataDetails = "Deleted Entry Bill No: " + entry.getBillNumber() + "\nMaterial: " + entry.getMaterial().getName();
            
            stockEntryRepository.delete(entry);
            messagingTemplate.convertAndSend("/topic/location/" + locationId, "STOCK_UPDATED");
            
            try {
                User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                emailService.sendAuditEmail(currentUser, "DELETED", dataDetails, locationName);
            } catch(Exception e) {}
        });
    }
}
