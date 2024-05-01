-------------TRIGGER-------------

DELIMITER //
CREATE TRIGGER UpdateAvgAfterInsert
    AFTER INSERT ON Flights
    FOR EACH ROW
    
BEGIN
	DECLARE num_flights INT;
	DECLARE sum_price DECIMAL(10, 6);
	DECLARE sum_dep_delay INT;
	DECLARE sum_arr_delay INT;
	DECLARE sum_carrier_delay INT;
	DECLARE sum_weather_delay INT;
	DECLARE sum_nas_delay INT;
	DECLARE sum_security_delay INT;
	DECLARE sum_late_aircraft_delay INT;

    SELECT COUNT(*), SUM(price), SUM(dep_delay), SUM(arr_delay), SUM(carrier_delay), SUM(weather_delay), SUM(nas_delay), SUM(security_delay), SUM(late_aircraft_delay)
    INTO num_flights, sum_price, sum_dep_delay, sum_arr_delay, sum_carrier_delay, sum_weather_delay, sum_nas_delay, sum_security_delay, sum_late_aircraft_delay
    FROM Flights
    WHERE origin_airport = NEW.origin_airport AND dest_airport = NEW.dest_airport;

    UPDATE Routes
    SET avg_price = (sum_price / num_flights),
        avg_dep_delay = (sum_dep_delay / num_flights),
        avg_arr_delay = (sum_arr_delay / num_flights),
        avg_carrier_delay = (sum_carrier_delay / num_flights),
        avg_weather_delay = (sum_weather_delay / num_flights),
        avg_nas_delay = (sum_nas_delay / num_flights),
        avg_security_delay = (sum_security_delay / num_flights),
        avg_late_aircraft_delay = (sum_late_aircraft_delay / num_flights)
    WHERE origin_airport = NEW.origin_airport AND dest_airport = NEW.dest_airport;
    
END
//
DELIMITER ;


DELIMITER //
CREATE TRIGGER UpdateAvgAfterDelete
    AFTER DELETE ON Flights
    FOR EACH ROW
    
BEGIN
	DECLARE num_flights INT;
	DECLARE sum_price DECIMAL(10, 6);
	DECLARE sum_dep_delay INT;
	DECLARE sum_arr_delay INT;
	DECLARE sum_carrier_delay INT;
	DECLARE sum_weather_delay INT;
	DECLARE sum_nas_delay INT;
	DECLARE sum_security_delay INT;
	DECLARE sum_late_aircraft_delay INT;

    SELECT COUNT(*), SUM(price), SUM(dep_delay), SUM(arr_delay), SUM(carrier_delay), SUM(weather_delay), SUM(nas_delay), SUM(security_delay), SUM(late_aircraft_delay)
    INTO num_flights, sum_price, sum_dep_delay, sum_arr_delay, sum_carrier_delay, sum_weather_delay, sum_nas_delay, sum_security_delay, sum_late_aircraft_delay
    FROM Flights
    WHERE origin_airport = OLD.origin_airport AND dest_airport = OLD.dest_airport;

	IF num_flights != 0 THEN
		UPDATE Routes
		SET avg_price = (sum_price / num_flights),
			avg_dep_delay = (sum_dep_delay / num_flights),
			avg_arr_delay = (sum_arr_delay / num_flights),
			avg_carrier_delay = (sum_carrier_delay / num_flights),
			avg_weather_delay = (sum_weather_delay / num_flights),
			avg_nas_delay = (sum_nas_delay / num_flights),
			avg_security_delay = (sum_security_delay / num_flights),
			avg_late_aircraft_delay = (sum_late_aircraft_delay / num_flights)
		WHERE origin_airport = OLD.origin_airport AND dest_airport = OLD.dest_airport;
	END IF;
    
END
//
DELIMITER ;



-------------STORED PROCEDURE-------------

DELIMITER //
CREATE PROCEDURE AirportMetric ()
BEGIN
	DROP VIEW IF EXISTS Num_in_out_flights;
	DROP VIEW IF EXISTS Origin_dest_delay;

	CREATE VIEW Num_in_out_flights AS
		SELECT origin_airport AS airport, num_outgoing, num_incoming
		FROM
			(SELECT origin_airport, COUNT(origin_airport) AS num_outgoing
			FROM Flights f
			GROUP BY origin_airport) as Outgoing
				JOIN
			(SELECT dest_airport, COUNT(dest_airport) AS num_incoming
			FROM Flights f
			GROUP BY dest_airport) as Incoming
		ON origin_airport = dest_airport

		ORDER BY num_outgoing DESC, num_incoming DESC;
	
   	 CREATE VIEW Origin_dest_delay AS
		SELECT origin_airport as airport, origin_avg_delay, dest_avg_delay
		FROM
			(SELECT origin_airport, AVG(avg_arr_delay) AS origin_avg_delay
			FROM Routes
			GROUP BY origin_airport) AS Outgoing
				JOIN
			(SELECT dest_airport, AVG(avg_arr_delay) AS dest_avg_delay
			FROM Routes
			GROUP BY dest_airport) AS Incoming
		ON origin_airport = dest_airport;
	
    SELECT a.airport, num_outgoing, num_incoming, origin_avg_delay, dest_avg_delay
    FROM Num_in_out_flights a JOIN Origin_dest_delay b on a.airport = b.airport;
    
    DROP VIEW IF EXISTS Num_in_out_flights;
    DROP VIEW IF EXISTS Origin_dest_delay;

END;
//
DELIMITER ;



-------------TRANSACTION-------------

START TRANSACTION;
   DROP VIEW IF EXISTS Early_flights;
   DROP VIEW IF EXISTS Late_flights;
	DROP VIEW IF EXISTS Airport_ranks;
   CREATE VIEW Early_flights AS
       SELECT airline_code, COUNT(airline_code) AS num_early
       FROM Flights
       WHERE arr_delay <= 0
       GROUP BY airline_code;
   CREATE VIEW Late_flights AS
       SELECT airline_code, COUNT(airline_code) AS num_late
       FROM Flights
       WHERE arr_delay > 0
       GROUP BY airline_code;
   SELECT a.airline, e.airline_code, num_early, num_late, (num_early / (num_early + num_late)) AS prop_early
     FROM Early_flights e JOIN Late_flights l ON e.airline_code = l.airline_code JOIN Airlines a on a.airline_code = l.airline_code
     ORDER BY num_early DESC;
   CREATE VIEW Airport_ranks AS
     SELECT f.airline_code, f.origin_airport, COUNT(*) AS num_flights,
         RANK() OVER (PARTITION BY f.airline_code ORDER BY COUNT(*) DESC) AS airport_rank
     FROM Flights f
     GROUP BY f.airline_code, f.origin_airport;
   SELECT f.airline_code, f.origin_airport, f.num_flights
     FROM (
       SELECT f.airline_code, f.origin_airport, COUNT(*) AS num_flights,
         RANK() OVER (PARTITION BY f.airline_code ORDER BY COUNT(*) DESC) AS airport_rank
       FROM Flights f
       GROUP BY f.airline_code, f.origin_airport
     ) f
     WHERE f.airport_rank <= 5
     ORDER BY airline_code, f.num_flights DESC;
   COMMIT;