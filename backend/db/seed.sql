-- Active: 1762830943396@@127.0.0.1@3306@VacationPlanner
INSERT INTO User (Name, Email, Password)
VALUES ('Test User', 'test@example.com', 'password123');

INSERT INTO `Itinerary`(`User_ID`, `Trip_Name`, `Start_Date`, `End_Date`)
VALUES (1, 'Trip to Japan', '2025-12-01', '2025-12-10');

INSERT INTO Destination (Itinerary_ID, City, Country, Notes)
VALUES (1, 'Tokyo', 'Japan', 'First stop on the trip.');

INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address)
VALUES (1, 'Visit Tokyo Tower', '2025-12-02', 20.00, 'Sightseeing', '4 Chome-2-8 Shibakoen, Minato City, Tokyo 105-0011, Japan');

INSERT INTO Accommodation (Destination_ID, Name, Check_In, Check_Out, Cost, Address)
VALUES (1, 'Shinjuku Hotel', '2025-12-01', '2025-12-05', 150.00, '1 Chome-1-1 Nishi-Shinjuku, Shinjuku City, Tokyo 160-0023, Japan');

INSERT INTO Expense (Itinerary_ID, Category, Amount, Date, Notes)
VALUES (1, 'Food', 50.00, '2025-12-02', 'Ramen lunch');
