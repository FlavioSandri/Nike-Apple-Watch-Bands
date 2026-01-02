-- Pulse Database Schema

CREATE DATABASE IF NOT EXISTS pulse_db;
USE pulse_db;

-- Bands table
CREATE TABLE bands (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    color VARCHAR(100),
    material VARCHAR(100),
    stock INT DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_featured (featured),
    INDEX idx_active (active)
);

-- Band features
CREATE TABLE band_features (
    id INT PRIMARY KEY AUTO_INCREMENT,
    band_id INT NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
    INDEX idx_band_id (band_id)
);

-- Band compatibility
CREATE TABLE band_compatibility (
    id INT PRIMARY KEY AUTO_INCREMENT,
    band_id INT NOT NULL,
    compatibility VARCHAR(100) NOT NULL,
    FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
    INDEX idx_band_id (band_id)
);

-- Watches table
CREATE TABLE watches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    sizes JSON,
    colors JSON,
    features JSON,
    image_url VARCHAR(500),
    release_year INT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_active (active)
);

-- Contact submissions
CREATE TABLE contact_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    INDEX idx_created_at (created_at)
);

-- Newsletter subscribers
CREATE TABLE newsletter_subscribers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_active (active)
);

-- Sample data for bands
INSERT INTO bands (name, description, price, color, material, stock, featured) VALUES
('Nike Sport Loop', 'Lightweight, breathable, and adjustable band perfect for athletes', 49.99, 'Midnight Fog', 'Fluoroelastomer', 15, TRUE),
('Nike Sport Band', 'Sweat-resistant and durable band for everyday wear', 49.99, 'Pure Platinum', 'Silicone', 8, TRUE),
('Nike Heritage', 'Classic design with modern materials for a timeless look', 59.99, 'Black/Volt', 'Premium Nylon', 22, TRUE),
('Nike Liquid-Glass Pro', 'Premium band with self-healing liquid-glass technology', 79.99, 'Ocean Blue', 'Liquid-Glass Composite', 5, TRUE),
('Nike Trail Band', 'Designed for extreme conditions with enhanced durability', 64.99, 'Forest Green', 'Reinforced Silicone', 12, FALSE),
('Nike Midnight Collection', 'Elegant design suitable for all occasions', 69.99, 'Midnight Black', 'Premium Leather', 7, FALSE);

-- Sample band features
INSERT INTO band_features (band_id, feature_name) VALUES
(1, 'Sweat-resistant'),
(1, 'Adjustable'),
(1, 'Lightweight'),
(2, 'Sweat-resistant'),
(2, 'Durable'),
(2, 'Comfortable'),
(3, 'Classic design'),
(3, 'Breathable'),
(3, 'Adjustable'),
(4, 'Self-healing'),
(4, 'Waterproof'),
(4, 'Premium finish'),
(5, 'Extreme durability'),
(5, 'Mud-resistant'),
(5, 'Enhanced grip'),
(6, 'Elegant design'),
(6, 'Comfortable'),
(6, 'Formal wear');

-- Sample band compatibility
INSERT INTO band_compatibility (band_id, compatibility) VALUES
(1, 'Series 4+'),
(1, 'All sizes'),
(2, 'Series 3+'),
(2, '41mm/45mm'),
(3, 'All Series'),
(3, 'All sizes'),
(4, 'Series 6+'),
(4, '45mm'),
(5, 'Series 5+'),
(5, 'All sizes'),
(6, 'All Series'),
(6, '41mm/45mm');

-- Sample watches data
INSERT INTO watches (name, description, price, sizes, colors, features, release_year) VALUES
('Apple Watch Series 8', 'Advanced health features and durable design with Always-On Retina display', 399.00, '["41mm", "45mm"]', '["Midnight", "Starlight", "Silver", "Red"]', '["Blood Oxygen", "ECG", "Always-On Retina", "Crash Detection"]', 2022),
('Apple Watch Ultra', 'Built for endurance and adventure with the largest display and longest battery', 799.00, '["49mm"]', '["Titanium"]', '["Dive Computer", "86dB Siren", "Precision Dual-Frequency GPS", "Action Button"]', 2022),
('Apple Watch SE', 'Essential features at a great value with Retina display and fitness tracking', 249.00, '["40mm", "44mm"]', '["Midnight", "Starlight", "Silver"]', '["Retina Display", "Fall Detection", "Fitness Tracking", "Heart Rate"]', 2022);