-- Active: 1762830943396@@127.0.0.1@3306@VacationPlanner
CREATE DATABASE VacationPlanner;

CREATE TABLE User(
    User_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100),
    Email VARCHAR(100) UNIQUE,
    Password VARCHAR(100)
);

CREATE TABLE Itinerary(
    Itinerary_ID INT PRIMARY KEY AUTO_INCREMENT,
    User_ID INT,
    Trip_Name VARCHAR(100),
    Start_Date DATE,
    End_Date DATE,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID)
);

CREATE TABLE Destination(
    Destination_ID INT PRIMARY KEY AUTO_INCREMENT,
    Itinerary_ID INT,
    City VARCHAR(100),
    Country VARCHAR(100),
    Notes TEXT,
    FOREIGN KEY (Itinerary_ID) REFERENCES Itinerary(Itinerary_ID)
);

CREATE TABLE Activity(
    Activity_ID INT PRIMARY KEY AUTO_INCREMENT,
    Destination_ID INT,
    Name VARCHAR(100),
    Date DATE,
    Cost DECIMAL(10,2),
    Category VARCHAR(50),
    Address VARCHAR(100),
    FOREIGN KEY (Destination_ID) REFERENCES Destination(Destination_ID)
);

CREATE TABLE Accommodation(
    Accommodation_ID INT PRIMARY KEY AUTO_INCREMENT,
    Destination_ID INT,
    Name VARCHAR(100),
    Check_In DATE,
    Check_Out DATE,
    Cost DECIMAL(10,2),
    Address VARCHAR(100),
    FOREIGN KEY (Destination_ID) REFERENCES Destination(Destination_ID)
);

CREATE TABLE Expense(
    Expense_ID INT PRIMARY KEY AUTO_INCREMENT,
    Itinerary_ID INT,
    Category VARCHAR(50),
    Amount DECIMAL(10,2),
    Date DATE,
    Notes TEXT,
    FOREIGN KEY (Itinerary_ID) REFERENCES Itinerary(Itinerary_ID)
);
