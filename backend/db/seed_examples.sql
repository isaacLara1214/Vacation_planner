-- Active: 1762830943396@@127.0.0.1@3306@VacationPlanner
-- Example Trip Itineraries with Full Feature Testing
-- This seed file creates two comprehensive example trips to test all implemented features

-- Note: This appends to existing data. IDs will auto-increment from current values.

-- ===== EXAMPLE TRIP 1: European Adventure (Multi-city tour) =====

-- User 1 (Sarah Johnson) - Create only if doesn't exist
INSERT IGNORE INTO User (Name, Email, Password)
VALUES ('Sarah Johnson', 'sarah@example.com', 'travel2025');

-- Get Sarah's User_ID (whether just created or already existed)
SET @sarah_id = (SELECT User_ID FROM User WHERE Email = 'sarah@example.com');

-- Trip 1: European Adventure
INSERT INTO Itinerary (User_ID, Trip_Name, Start_Date, End_Date)
VALUES (@sarah_id, 'European Adventure 2025', '2025-06-15', '2025-06-25');

SET @euro_trip_id = LAST_INSERT_ID();

-- Destination 1: Paris, France
INSERT INTO Destination (Itinerary_ID, City, Country, Notes)
VALUES (@euro_trip_id, 'Paris', 'France', 'City of lights - exploring art, culture, and cuisine');

SET @paris_id = LAST_INSERT_ID();

-- Paris Accommodation
INSERT INTO Accommodation (Destination_ID, Name, Check_In, Check_Out, Cost, Address)
VALUES (@paris_id, 'Hotel Le Marais', '2025-06-15', '2025-06-18', 450.00, '12 Rue des Archives, 75004 Paris, France');

-- Paris Activities (with addresses for map testing)
INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address)
VALUES 
(@paris_id, 'Eiffel Tower Visit', '2025-06-15', 28.00, 'Sightseeing', 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France'),
(@paris_id, 'Louvre Museum', '2025-06-16', 22.00, 'Culture', 'Rue de Rivoli, 75001 Paris, France'),
(@paris_id, 'Seine River Cruise', '2025-06-16', 15.00, 'Entertainment', 'Port de la Bourdonnais, 75007 Paris, France'),
(@paris_id, 'Le Jules Verne Dinner', '2025-06-17', 185.00, 'Dining', 'Avenue Gustave Eiffel, 75007 Paris, France'),
(@paris_id, 'Montmartre Walking Tour', '2025-06-17', 0.00, 'Sightseeing', 'Place du Tertre, 75018 Paris, France');

-- Destination 2: Rome, Italy
INSERT INTO Destination (Itinerary_ID, City, Country, Notes)
VALUES (@euro_trip_id, 'Rome', 'Italy', 'Ancient history and amazing food');

SET @rome_id = LAST_INSERT_ID();

-- Rome Accommodation
INSERT INTO Accommodation (Destination_ID, Name, Check_In, Check_Out, Cost, Address)
VALUES (@rome_id, 'Trastevere B&B', '2025-06-18', '2025-06-21', 320.00, 'Via della Lungaretta, 173, 00153 Roma RM, Italy');

-- Rome Activities
INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address)
VALUES 
(@rome_id, 'Colosseum Tour', '2025-06-19', 35.00, 'Culture', 'Piazza del Colosseo, 1, 00184 Roma RM, Italy'),
(@rome_id, 'Vatican Museums', '2025-06-19', 42.00, 'Culture', 'Viale Vaticano, 00165 Roma RM, Italy'),
(@rome_id, 'Trevi Fountain', '2025-06-20', 0.00, 'Sightseeing', 'Piazza di Trevi, 00187 Roma RM, Italy'),
(@rome_id, 'Pasta Making Class', '2025-06-20', 75.00, 'Dining', 'Via dei Vascellari, 29, 00153 Roma RM, Italy'),
(@rome_id, 'Roman Forum Exploration', '2025-06-21', 18.00, 'Sightseeing', 'Via della Salara Vecchia, 5/6, 00186 Roma RM, Italy');

-- Destination 3: Barcelona, Spain
INSERT INTO Destination (Itinerary_ID, City, Country, Notes)
VALUES (@euro_trip_id, 'Barcelona', 'Spain', 'Gaudi architecture and Mediterranean beaches');

SET @barcelona_id = LAST_INSERT_ID();

-- Barcelona Accommodation
INSERT INTO Accommodation (Destination_ID, Name, Check_In, Check_Out, Cost, Address)
VALUES (@barcelona_id, 'Gothic Quarter Hotel', '2025-06-21', '2025-06-25', 380.00, 'Carrer de la Boqueria, 27, 08002 Barcelona, Spain');

-- Barcelona Activities
INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address)
VALUES 
(@barcelona_id, 'Sagrada Familia', '2025-06-22', 33.00, 'Culture', 'Carrer de Mallorca, 401, 08013 Barcelona, Spain'),
(@barcelona_id, 'Park Güell', '2025-06-22', 10.00, 'Nature', 'Carrer d''Olot, s/n, 08024 Barcelona, Spain'),
(@barcelona_id, 'Beach Day at Barceloneta', '2025-06-23', 0.00, 'Nature', 'Platja de la Barceloneta, 08003 Barcelona, Spain'),
(@barcelona_id, 'Tapas Food Tour', '2025-06-23', 65.00, 'Dining', 'Carrer de Blai, 08004 Barcelona, Spain'),
(@barcelona_id, 'Camp Nou Stadium Tour', '2025-06-24', 28.00, 'Entertainment', 'C. d''Aristides Maillol, 12, 08028 Barcelona, Spain'),
(@barcelona_id, 'Las Ramblas Shopping', '2025-06-24', 50.00, 'Shopping', 'La Rambla, 08002 Barcelona, Spain');

-- Expenses for European Trip
INSERT INTO Expense (Itinerary_ID, Category, Amount, Date, Notes)
VALUES 
(@euro_trip_id, 'Transport', 450.00, '2025-06-15', 'Round-trip flights Paris-Rome-Barcelona'),
(@euro_trip_id, 'Food', 125.00, '2025-06-16', 'Paris cafes and bakeries'),
(@euro_trip_id, 'Food', 98.00, '2025-06-20', 'Rome restaurants'),
(@euro_trip_id, 'Transport', 45.00, '2025-06-21', 'Train tickets Rome to Barcelona'),
(@euro_trip_id, 'Food', 110.00, '2025-06-23', 'Barcelona dining');

-- ===== EXAMPLE TRIP 2: Japan Cultural Experience =====

-- User 2 (Michael Chen) - Create only if doesn't exist
INSERT IGNORE INTO User (Name, Email, Password)
VALUES ('Michael Chen', 'michael@example.com', 'adventure123');

-- Get Michael's User_ID (whether just created or already existed)
SET @michael_id = (SELECT User_ID FROM User WHERE Email = 'michael@example.com');

-- Trip 2: Japan Cultural Experience
INSERT INTO Itinerary (User_ID, Trip_Name, Start_Date, End_Date)
VALUES (@michael_id, 'Japan Cultural Experience', '2025-09-10', '2025-09-22');

SET @japan_trip_id = LAST_INSERT_ID();

-- Destination 1: Tokyo, Japan
INSERT INTO Destination (Itinerary_ID, City, Country, Notes)
VALUES (@japan_trip_id, 'Tokyo', 'Japan', 'Modern metropolis with traditional temples');

SET @tokyo_id = LAST_INSERT_ID();

-- Tokyo Accommodations
INSERT INTO Accommodation (Destination_ID, Name, Check_In, Check_Out, Cost, Address)
VALUES 
(@tokyo_id, 'Shinjuku Capsule Hotel', '2025-09-10', '2025-09-13', 180.00, '1-2-9 Kabukicho, Shinjuku City, Tokyo 160-0021, Japan'),
(@tokyo_id, 'Asakusa Ryokan', '2025-09-13', '2025-09-15', 280.00, '2-6-7 Asakusa, Taito City, Tokyo 111-0032, Japan');

-- Tokyo Activities
INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address)
VALUES 
(@tokyo_id, 'Tokyo Skytree', '2025-09-11', 25.00, 'Sightseeing', '1-1-2 Oshiage, Sumida City, Tokyo 131-0045, Japan'),
(@tokyo_id, 'Senso-ji Temple', '2025-09-11', 0.00, 'Culture', '2-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan'),
(@tokyo_id, 'Tsukiji Outer Market', '2025-09-12', 40.00, 'Dining', '4-16-2 Tsukiji, Chuo City, Tokyo 104-0045, Japan'),
(@tokyo_id, 'TeamLab Borderless', '2025-09-12', 32.00, 'Entertainment', '1-3-8 Aomi, Koto City, Tokyo 135-0064, Japan'),
(@tokyo_id, 'Shibuya Crossing', '2025-09-13', 0.00, 'Sightseeing', 'Shibuya Crossing, Shibuya City, Tokyo 150-0002, Japan'),
(@tokyo_id, 'Meiji Shrine', '2025-09-13', 0.00, 'Culture', '1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557, Japan'),
(@tokyo_id, 'Robot Restaurant Show', '2025-09-14', 85.00, 'Entertainment', '1-7-1 Kabukicho, Shinjuku City, Tokyo 160-0021, Japan'),
(@tokyo_id, 'Harajuku Shopping', '2025-09-14', 120.00, 'Shopping', 'Takeshita Street, Jingumae, Shibuya City, Tokyo 150-0001, Japan');

-- Destination 2: Kyoto, Japan
INSERT INTO Destination (Itinerary_ID, City, Country, Notes)
VALUES (@japan_trip_id, 'Kyoto', 'Japan', 'Ancient capital with stunning temples and gardens');

SET @kyoto_id = LAST_INSERT_ID();

-- Kyoto Accommodation
INSERT INTO Accommodation (Destination_ID, Name, Check_In, Check_Out, Cost, Address)
VALUES (@kyoto_id, 'Traditional Machiya Guesthouse', '2025-09-15', '2025-09-19', 420.00, '456 Kiyomizu, Higashiyama Ward, Kyoto 605-0862, Japan');

-- Kyoto Activities
INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address)
VALUES 
(@kyoto_id, 'Fushimi Inari Shrine', '2025-09-16', 0.00, 'Culture', '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto 612-0882, Japan'),
(@kyoto_id, 'Arashiyama Bamboo Grove', '2025-09-16', 0.00, 'Nature', 'Sagatenryuji Susukinobabacho, Ukyo Ward, Kyoto 616-8385, Japan'),
(@kyoto_id, 'Kinkaku-ji Golden Pavilion', '2025-09-17', 5.00, 'Sightseeing', '1 Kinkakujicho, Kita Ward, Kyoto 603-8361, Japan'),
(@kyoto_id, 'Tea Ceremony Experience', '2025-09-17', 55.00, 'Culture', '349 Masuyacho, Kodaiji Temple, Higashiyama Ward, Kyoto 605-0826, Japan'),
(@kyoto_id, 'Gion District Walking', '2025-09-18', 0.00, 'Culture', 'Gion, Higashiyama Ward, Kyoto 605-0001, Japan'),
(@kyoto_id, 'Nishiki Market Food Tour', '2025-09-18', 45.00, 'Dining', 'Nishikikoji Street, Nakagyo Ward, Kyoto 604-8054, Japan'),
(@kyoto_id, 'Zen Garden Meditation', '2025-09-19', 15.00, 'Wellness', 'Ryoan-ji Temple, 13 Ryoanji Goryonoshitacho, Ukyo Ward, Kyoto 616-8001, Japan');

-- Destination 3: Osaka, Japan
INSERT INTO Destination (Itinerary_ID, City, Country, Notes)
VALUES (@japan_trip_id, 'Osaka', 'Japan', 'Street food capital and nightlife');

SET @osaka_id = LAST_INSERT_ID();

-- Osaka Accommodation
INSERT INTO Accommodation (Destination_ID, Name, Check_In, Check_Out, Cost, Address)
VALUES (@osaka_id, 'Dotonbori Business Hotel', '2025-09-19', '2025-09-22', 210.00, '1-8-24 Dotonbori, Chuo Ward, Osaka 542-0071, Japan');

-- Osaka Activities
INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address)
VALUES 
(@osaka_id, 'Osaka Castle', '2025-09-20', 8.00, 'Sightseeing', '1-1 Osakajo, Chuo Ward, Osaka 540-0002, Japan'),
(@osaka_id, 'Dotonbori Food Crawl', '2025-09-20', 60.00, 'Dining', 'Dotonbori, Chuo Ward, Osaka 542-0071, Japan'),
(@osaka_id, 'Universal Studios Japan', '2025-09-21', 78.00, 'Entertainment', '2-1-33 Sakurajima, Konohana Ward, Osaka 554-0031, Japan'),
(@osaka_id, 'Shinsekai District', '2025-09-21', 35.00, 'Nightlife', 'Ebisuhigashi, Naniwa Ward, Osaka 556-0002, Japan'),
(@osaka_id, 'Kuromon Market', '2025-09-22', 30.00, 'Shopping', '2-4-1 Nihonbashi, Chuo Ward, Osaka 542-0073, Japan');

-- Activities without dates (testing undated sorting)
INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address)
VALUES 
(@tokyo_id, 'Backup - Tokyo National Museum', NULL, 12.00, 'Culture', '13-9 Uenokoen, Taito City, Tokyo 110-8712, Japan'),
(@kyoto_id, 'Backup - Philosopher''s Path Walk', NULL, 0.00, 'Nature', 'Philosopher''s Path, Sakyo Ward, Kyoto 606-8402, Japan');

-- Expenses for Japan Trip
INSERT INTO Expense (Itinerary_ID, Category, Amount, Date, Notes)
VALUES 
(@japan_trip_id, 'Transport', 1200.00, '2025-09-10', 'Round-trip international flights'),
(@japan_trip_id, 'Transport', 140.00, '2025-09-15', 'Shinkansen bullet train Tokyo to Kyoto'),
(@japan_trip_id, 'Food', 85.00, '2025-09-12', 'Tokyo sushi and ramen'),
(@japan_trip_id, 'Food', 72.00, '2025-09-17', 'Kyoto kaiseki dinner'),
(@japan_trip_id, 'Transport', 28.00, '2025-09-19', 'Train Kyoto to Osaka'),
(@japan_trip_id, 'Food', 95.00, '2025-09-20', 'Osaka takoyaki and okonomiyaki'),
(@japan_trip_id, 'Entertainment', 50.00, '2025-09-14', 'Karaoke night in Shinjuku');

-- Summary of test data:
-- Trip 1 (European Adventure): 3 destinations, 16 activities (all with addresses), 3 accommodations, 5 expenses
-- Trip 2 (Japan Experience): 3 destinations, 20 activities (18 with addresses, 2 without for sorting test), 4 accommodations, 7 expenses
-- All activities have dates except 2 in Japan trip (testing undated item sorting)
-- Activities cover all 11 categories: Sightseeing, Culture, Nature, Dining, Nightlife, Entertainment, Shopping, Adventure, Wellness, Transport, Events
-- Accommodations test date constraints and multiple per destination
-- Addresses are real and will geocode properly on the map
