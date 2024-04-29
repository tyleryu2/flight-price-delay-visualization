var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var path = require('path');
var connection = mysql.createConnection({
                host: '35.184.72.84',
                user: 'root',
                password: 'wilty-079',
                database: 'flight_delay'
}); 

connection.connect;


var app = express();

// set up ejs view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
 
// app.use(express.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + '../public'));

// ADDED
var session = require('express-session');
const { getRandomValues } = require('crypto');

app.use(session({
  secret: 'super_secret_key', // should normally be a secure, random string
  resave: false,
  saveUninitialized: true,
  cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000 // session expiration time (in milliseconds)
  }
}))

app.get('/airport', function(req, res) {
  const airport = req.query.myAirport;
  var sql = `
    SELECT origin_airport AS airport, num_outgoing, num_incoming
    FROM
      (SELECT origin_airport, COUNT(origin_airport) AS num_outgoing
      FROM Flights f
      WHERE origin_airport = '${airport}'
      GROUP BY origin_airport) as outgoing
    JOIN
      (SELECT dest_airport, COUNT(dest_airport) AS num_incoming
      FROM Flights f
      WHERE dest_airport = '${airport}'
      GROUP BY dest_airport) as incoming
    ON origin_airport = dest_airport
    ORDER BY num_outgoing DESC, num_incoming DESC;`;

  connection.query(sql, function(err, results) {
    if (err) {
      console.error('Error fetching airport data:', err);
      res.status(500).send({message: 'Error fetching airport data', error: err});
      return;
    }
    res.json(results);
  });
});



/* GET home page, respond by rendering index.ejs */
app.get('/', async (req, res) => {
  // res.render('index', { title: 'Mark Attendance' });
  try {

    var sqlQuery = `
      SELECT origin_airport, dest_airport
      FROM Routes WHERE origin_city = 'NONE';
    `;
    
    const routesData = await dbQuery(sqlQuery);
    res.render('index', {
      title: 'Filter Routes',
      routesData: routesData
    });
  
    

  } catch (err) {
    console.error('Error fetching data:', err);
    // Send a 500 error response if the query fails
    res.status(500).send({ message: 'Error fetching data', error: err });
  }

});

app.post('/filter', async (req, res) => {
  try {
    var origin = req.body.origin;
    var dest = req.body.dest;
    var originType = req.body.originType;
    var destType = req.body.destType;

    var airline = req.body.airline;
    var airlineSize = req.body.airlineSize;

    var minPrice = req.body.minPrice;
    var maxPrice = req.body.maxPrice;
    var minDelay = req.body.minDelay;
    var maxDelay = req.body.maxDelay;
    var delayType = req.body.delayType;

    var inputs = [origin, dest, airline, airlineSize, minPrice, maxPrice, minDelay, maxDelay];
    console.log(inputs);

    var origin2 = (origin != '') ? `r.origin_${originType} = '${origin}'` : '';
    var dest2 = (dest != '') ? `r.dest_${destType} = '${dest}'` : '';

    var joinAirlinesFlights = (airline != '' || airlineSize != '') ? 'JOIN Flights f ON r.origin_airport = f.origin_airport AND r.dest_airport = f.dest_airport JOIN Airlines a ON f.airline_code = a.airline_code' : '';
    var airline2 = (airline != '') ? `f.airline_code = '${airline}'` : '';
    var airlineSize2 = (airlineSize != '') ?  `f.annualPassengers = ${airlineSize}` : '';

    var minPrice2 = (minPrice != '') ?  `r.avg_price >= ${minPrice}` : '';
    var maxPrice2 = (maxPrice != '') ?  `r.avg_price <= ${maxPrice}` : '';
    var minDelay2 = (minDelay != '') ?  `r.${delayType} >= ${minDelay}` : '';
    var maxDelay2 = (maxDelay != '') ?  `r.${delayType} <= ${maxDelay}` : '';

    var inputs2 = [origin2, dest2, airline2, airlineSize2, minPrice2, maxPrice2, minDelay2, maxDelay2];

    var whereList = [];
    for (var i = 0; i < inputs2.length; i++) {
      if (inputs[i] != '') { whereList.push(inputs2[i]); }
    }
    var whereClause = (whereList.length != 0) ? 'WHERE ' + whereList.join(' AND ') : '';
    // console.log(whereClause);

    var sqlQuery = `
      SELECT *
      FROM Routes r ${joinAirlinesFlights}
      ${whereClause};
    `;

    console.log(sqlQuery);

    if (origin != '' || dest != '' || airline != '' || airlineSize != '' || minPrice != '' || maxPrice != '' || minDelay != '' || maxDelay != '') {
      const routesData = await dbQuery(sqlQuery);
      // res.render('index', {
      //   title: 'Mark Attendance',
      //   routesData: routesData
      // });
      res.json({
        success: true,
        data: routesData
      })
    }

  } catch (err) {
    console.error('Error fetching data:', err);
    // Send a 500 error response if the query fails
    res.status(500).send({ message: 'Error fetching data', error: err });
  }

});

function dbQuery(query) {
  return new Promise((resolve, reject) => {
    connection.query(query, function(err, results) {
      if (err) {
        console.error('Error fetching airport data:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  })
};

app.get('/success', function(req, res) {
  res.send({'message': 'Attendance marked successfully!'});
});

app.post('/login', async (req, res) => {  
  console.log('Request body:', req.body);
  var username = req.body.username;
  var password = req.body.password;
  var action = req.body.action;

  console.log('username: '.concat(username));

  var userQuery = `
    SELECT *
    FROM Users
    WHERE username = '${username}';
  `;

  console.log(userQuery);

  const userData = await dbQuery(userQuery);
  const userExists = userData.length > 0;
  console.log(userData);


  if (action == 'login') {
    if (userExists) {
      if (password == userData[0].passcode) {
        // add user to session and close modal
        console.log('password correct')
        req.session.user = {
          username: username,
        }
        console.log('Current user:', username);
        res.json({ success: true });
      
      } else {
        // show popup on login page that password was incorrect
        res.json({ success: false, message: 'Incorrect password. Please try again.'})
      }
    } else {
      // show popup on login page that user does not exist
      res.json({ success: false, message: 'Username does not exist. Please sign up or login with a different username.' })
    }
  } else if (action == 'signup') {
    if (userExists) {
      // show popup on login page that user already exists
      res.json({ success: false, message: 'Username already exists. Please choose a different username. '})
    } else {
      // insert new row into Users database, add user to session, and close modal
      var newUserQuery = `
        INSERT INTO Users
        VALUES('${username}', '${password}');
      `;

      await dbQuery(newUserQuery);
      console.log('successfully added new user');
      req.session.user = {
        username: username,
      }
      console.log('Current user:', username);
      res.json({ success: true, message: 'Successfully added new user. Please close out of the login window. '})

    }
  }
});

app.post('/logout', (req, res) => {
  console.log('Current user:', req.session.user);
  if (req.session && req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send('Failed to log out');
      }
      res.json({ success: true });
    });
  } else {
    res.json({ success: false });
  }
  
});


app.post('/favorite_routes', async (req, res) => {
  if (req.session && req.session.user) {
    var username = req.session.user.username;
    var sqlQuery = `
      SELECT r.origin_airport, r.dest_airport, r.avg_price, r.avg_arr_delay
      FROM Favorites f JOIN Routes r ON f.origin_airport = r.origin_airport AND f.dest_airport = r.dest_airport
      WHERE username = '${username}';
    `;
    console.log(sqlQuery);
    var data = await dbQuery(sqlQuery);
    console.log(data);

    res.json({ success: true, data: data });

  } else {
    res.json({ success: false });
  }
});

app.post('/change_favorite_routes', async (req, res) => {
  if (req.session && req.session.user) {
    var origin = req.body.origin;
    var dest = req.body.dest;
    var username = req.session.user.username;
    var action = req.body.action;

    console.log(req.body);

    var routeQuery = `
      SELECT *
      FROM Routes
      WHERE origin_airport = '${origin}' AND dest_airport = '${dest}';
    `;

    console.log(routeQuery);

    const routeData = await dbQuery(routeQuery);
    const routeExists = routeData.length > 0;
    console.log(routeData);

    var userQuery = `
      SELECT *
      FROM Favorites
      WHERE origin_airport = '${origin}' AND dest_airport = '${dest}' AND username = '${username}';
    `;
    const userData = await dbQuery(userQuery);
    const alreadyFav = userData.length > 0;

    if (action == 'add-route') {
      if (routeExists) {
        if (alreadyFav) {
          res.json({ success: false, message: 'This route is already favorited.' });
        } else {
          var addQuery = `
            INSERT INTO Favorites
            VALUES('${origin}', '${dest}', '${username}');
          `;

          console.log(addQuery);

          await dbQuery(addQuery);
          res.json({ success: true, message: 'Route successfully favorited! Click Show Routes button to refresh.' })
        }
      } else {
        res.json({ success: false, message: 'This route cannot be favorited because it does not exist. Add a flight to create this route.'})
      }
    } else if (action == 'delete-route') {
      if (!alreadyFav) {
        res.json({ success: false, message: 'This route cannot be removed because it is not currently favorited.'})
      } else {
        var deleteQuery = `
          DELETE FROM Favorites
          WHERE origin_airport = '${origin}' AND dest_airport = '${dest}' AND username = '${username}'; 
        `;
        await dbQuery(deleteQuery);
        res.json({ success: true, message: 'Route successfully removed from favorites. Click Show Routes button to refresh.'})
      }
    }
  } else {
    res.json({ success: false, message: 'Not logged in. Login to favorite a route.'})
  } 
  
});

airport_locations = 
  {'FLL': ['Fort Lauderdale', 'FL'],
  'MSP': ['Minneapolis', 'MN'],
  'DEN': ['Denver', 'CO'],
  'DAL': ['Dallas', 'TX'],
  'HSV': ['Huntsville', 'AL'],
  'IAH': ['Houston', 'TX'],
  'ATL': ['Atlanta', 'GA'],
  'MDW': ['Chicago', 'IL'],
  'GRR': ['Grand Rapids', 'MI'],
  'DFW': ['Dallas/Fort Worth', 'TX'],
  'ORD': ['Chicago', 'IL'],
  'LAS': ['Las Vegas', 'NV'],
  'AUS': ['Austin', 'TX'],
  'IND': ['Indianapolis', 'IN'],
  'MHT': ['Manchester', 'NH'],
  'BOS': ['Boston', 'MA'],
  'MSY': ['New Orleans', 'LA'],
  'CMH': ['Columbus', 'OH'],
  'LGA': ['New York', 'NY'],
  'CLT': ['Charlotte', 'NC'],
  'BNA': ['Nashville', 'TN'],
  'DTW': ['Detroit', 'MI'],
  'PHX': ['Phoenix', 'AZ'],
  'MCI': ['Kansas City', 'MO'],
  'EWR': ['Newark', 'NJ'],
  'LAX': ['Los Angeles', 'CA'],
  'HPN': ['White Plains', 'NY'],
  'JFK': ['New York', 'NY'],
  'ASE': ['Aspen', 'CO'],
  'BUF': ['Buffalo', 'NY'],
  'SLC': ['Salt Lake City', 'UT'],
  'SFO': ['San Francisco', 'CA'],
  'PDX': ['Portland', 'OR'],
  'SNA': ['Santa Ana', 'CA'],
  'HRL': ['Harlingen/San Benito', 'TX'],
  'BOI': ['Boise', 'ID'],
  'BDL': ['Hartford', 'CT'],
  'MIA': ['Miami', 'FL'],
  'BHM': ['Birmingham', 'AL'],
  'ELP': ['El Paso', 'TX'],
  'TPA': ['Tampa', 'FL'],
  'GSP': ['Greer', 'SC'],
  'LGB': ['Long Beach', 'CA'],
  'PIT': ['Pittsburgh', 'PA'],
  'PHL': ['Philadelphia', 'PA'],
  'PVD': ['Providence', 'RI'],
  'CID': ['Cedar Rapids/Iowa City', 'IA'],
  'CLE': ['Cleveland', 'OH'],
  'BUR': ['Burbank', 'CA'],
  'HOU': ['Houston', 'TX'],
  'MYR': ['Myrtle Beach', 'SC'],
  'RDM': ['Bend/Redmond', 'OR'],
  'CVG': ['Cincinnati', 'OH'],
  'MKE': ['Milwaukee', 'WI'],
  'MCO': ['Orlando', 'FL'],
  'BTR': ['Baton Rouge', 'LA'],
  'ECP': ['Panama City', 'FL'],
  'SEA': ['Seattle', 'WA'],
  'STL': ['St. Louis', 'MO'],
  'SAN': ['San Diego', 'CA'],
  'JAX': ['Jacksonville', 'FL'],
  'ABQ': ['Albuquerque', 'NM'],
  'ALB': ['Albany', 'NY'],
  'SAT': ['San Antonio', 'TX'],
  'SMF': ['Sacramento', 'CA'],
  'ISP': ['Islip', 'NY'],
  'PSP': ['Palm Springs', 'CA'],
  'BWI': ['Baltimore', 'MD'],
  'ACY': ['Atlantic City', 'NJ'],
  'OAK': ['Oakland', 'CA'],
  'BZN': ['Bozeman', 'MT'],
  'ORF': ['Norfolk', 'VA'],
  'BGR': ['Bangor', 'ME'],
  'CHS': ['Charleston', 'SC'],
  'PWM': ['Portland', 'ME'],
  'DSM': ['Des Moines', 'IA'],
  'LAN': ['Lansing', 'MI'],
  'ONT': ['Ontario', 'CA'],
  'COS': ['Colorado Springs', 'CO'],
  'SJC': ['San Jose', 'CA'],
  'OKC': ['Oklahoma City', 'OK'],
  'CRP': ['Corpus Christi', 'TX'],
  'RDU': ['Raleigh/Durham', 'NC'],
  'FWA': ['Fort Wayne', 'IN'],
  'RSW': ['Fort Myers', 'FL'],
  'ACV': ['Arcata/Eureka', 'CA'],
  'CAE': ['Columbia', 'SC'],
  'DCA': ['Washington', 'DC'],
  'AZA': ['Phoenix', 'AZ'],
  'MSN': ['Madison', 'WI'],
  'CAK': ['Akron', 'OH'],
  'SDF': ['Louisville', 'KY'],
  'GSO': ['Greensboro/High Point', 'NC'],
  'EYW': ['Key West', 'FL'],
  'AVL': ['Asheville', 'NC'],
  'SWF': ['Newburgh/Poughkeepsie', 'NY'],
  'AMA': ['Amarillo', 'TX'],
  'ROC': ['Rochester', 'NY'],
  'XNA': ['Fayetteville', 'AR'],
  'FAT': ['Fresno', 'CA'],
  'ABE': ['Allentown/Bethlehem/Easton', 'PA'],
  'BLI': ['Bellingham', 'WA'],
  'RNO': ['Reno', 'NV'],
  'CHO': ['Charlottesville', 'VA'],
  'MEM': ['Memphis', 'TN'],
  'VPS': ['Valparaiso', 'FL'],
  'MFR': ['Medford', 'OR'],
  'IDA': ['Idaho Falls', 'ID'],
  'TYS': ['Knoxville', 'TN'],
  'FAR': ['Fargo', 'ND'],
  'EGE': ['Eagle', 'CO'],
  'EUG': ['Eugene', 'OR'],
  'MDT': ['Harrisburg', 'PA'],
  'PIE': ['St. Petersburg', 'FL'],
  'DAY': ['Dayton', 'OH'],
  'OMA': ['Omaha', 'NE'],
  'BIS': ['Bismarck/Mandan', 'ND'],
  'USA': ['Concord', 'NC'],
  'ACK': ['Nantucket', 'MA'],
  'PSC': ['Pasco/Kennewick/Richland', 'WA'],
  'LEX': ['Lexington', 'KY'],
  'LBE': ['Latrobe', 'PA'],
  'SYR': ['Syracuse', 'NY'],
  'TLH': ['Tallahassee', 'FL'],
  'BTV': ['Burlington', 'VT'],
  'PHF': ['Newport News/Williamsburg', 'VA'],
  'SBN': ['South Bend', 'IN'],
  'IAD': ['Washington', 'DC'],
  'MGM': ['Montgomery', 'AL'],
  'SRQ': ['Sarasota/Bradenton', 'FL'],
  'JAC': ['Jackson', 'WY'],
  'LCK': ['Columbus', 'OH'],
  'HHH': ['Hilton Head', 'SC'],
  'SAV': ['Savannah', 'GA'],
  'GFK': ['Grand Forks', 'ND'],
  'PAE': ['Everett', 'WA'],
  'SGF': ['Springfield', 'MO'],
  'MOT': ['Minot', 'ND'],
  'FCA': ['Kalispell', 'MT'],
  'MVY': ["Martha's Vineyard", 'MA'],
  'TUL': ['Tulsa', 'OK'],
  'JAN': ['Jackson/Vicksburg', 'MS'],
  'LIT': ['Little Rock', 'AR'],
  'MSO': ['Missoula', 'MT'],
  'PNS': ['Pensacola', 'FL'],
  'BLV': ['Belleville', 'IL'],
  'BIL': ['Billings', 'MT'],
  'ATW': ['Appleton', 'WI'],
  'FSD': ['Sioux Falls', 'SD'],
  'PIA': ['Peoria', 'IL'],
  'BMI': ['Bloomington/Normal', 'IL'],
  'HTS': ['Ashland', 'WV'],
  'FNT': ['Flint', 'MI'],
  'RIC': ['Richmond', 'VA'],
  'CHA': ['Chattanooga', 'TN'],
  'MLB': ['Melbourne', 'FL'],
  'DAB': ['Daytona Beach', 'FL'],
  'AGS': ['Augusta', 'GA'],
  'GEG': ['Spokane', 'WA'],
  'TUS': ['Tucson', 'AZ'],
  'MFE': ['Mission/McAllen/Edinburg', 'TX'],
  'STS': ['Santa Rosa', 'CA'],
  'PBI': ['West Palm Beach/Palm Beach', 'FL'],
  'LNK': ['Lincoln', 'NE'],
  'ICT': ['Wichita', 'KS'],
  'MAF': ['Midland/Odessa', 'TX'],
  'RFD': ['Rockford', 'IL'],
  'LBB': ['Lubbock', 'TX'],
  'PVU': ['Provo', 'UT'],
  'SBA': ['Santa Barbara', 'CA'],
  'SPI': ['Springfield', 'IL'],
  'MRY': ['Monterey', 'CA'],
  'SHV': ['Shreveport', 'LA'],
  'ILM': ['Wilmington', 'NC'],
  'PBG': ['Plattsburgh', 'NY'],
  'GPT': ['Gulfport/Biloxi', 'MS'],
  'TVC': ['Traverse City', 'MI'],
  'ORH': ['Worcester', 'MA'],
  'MTJ': ['Montrose/Delta', 'CO'],
  'PGD': ['Punta Gorda', 'FL'],
  'HDN': ['Hayden', 'CO'],
  'EVV': ['Evansville', 'IN'],
  'ROA': ['Roanoke', 'VA'],
  'MBS': ['Saginaw/Bay City/Midland', 'MI'],
  'TOL': ['Toledo', 'OH'],
  'TTN': ['Trenton', 'NJ'],
  'RAP': ['Rapid City', 'SD'],
  'IAG': ['Niagara Falls', 'NY'],
  'SFB': ['Sanford', 'FL'],
  'STC': ['St. Cloud', 'MN']}

app.post('/add_flight', async (req, res) => {
  var flight_date = req.body.flight_date;
  var flight_number = req.body.flight_number;
  var airline_code = req.body.airline_code;
  
  var origin_airport = req.body.origin_airport;
  var origin_city = airport_locations[origin_airport][0];
  var origin_state = airport_locations[origin_airport][1];

  var dest_airport = req.body.dest_airport;
  var dest_city = airport_locations[dest_airport][0];
  var dest_state = airport_locations[dest_airport][1];

  var price = req.body.price;
  var dep_delay = req.body.dep_delay;
  var arr_delay = req.body.arr_delay;
  var carrier_delay = req.body.carrier_delay;
  var weather_delay = req.body.weather_delay;
  var nas_delay = req.body.nas_delay;
  var security_delay = req.body.security_delay;
  var late_aircraft_delay = req.body.late_aircraft_delay;
  try {
    var flightQuery = `
      INSERT INTO Flights
      VALUES('${flight_date}', ${flight_number}, '${airline_code}', '${origin_airport}', '${dest_airport}', '${origin_city}', '${origin_state}', '${dest_city}', '${dest_state}', ${price}, ${dep_delay}, ${arr_delay}, ${carrier_delay}, ${weather_delay}, ${nas_delay}, ${security_delay}, ${late_aircraft_delay});
    `;
    console.log(flightQuery);
    await dbQuery(flightQuery);

      res.json({ success: true, message: 'Flight successfully added. Route averages are being updated.'})

  } catch (err) {
    if (err.code == 'ER_DUP_ENTRY') {
      res.json({ success: false, message: 'Unable to add flight. The flight identifiers are not unique and already exist in the database.' });
        
    } else if (err.code == 'ER_NO_REFERENCED_ROW_2') {
      var addRouteQuery = `
        INSERT INTO Routes
        VALUES('${origin_airport}', '${dest_airport}', '${origin_city}', '${origin_state}', '${dest_city}', '${dest_state}', ${price}, ${dep_delay}, ${arr_delay}, ${carrier_delay}, ${weather_delay}, ${nas_delay}, ${security_delay}, ${late_aircraft_delay})
      `;

      await dbQuery(addRouteQuery);
      await dbQuery(flightQuery);
      res.json({ success: true, message: `Flight successfully added. ${origin_airport} to ${dest_airport} was a new route, so this route was also added.` })

    } else {
      console.log(err)
      res.json({ success: false, message: 'Unable to add flight. Please try again.' });
    }
    console.log(err.code);
  }
});

app.post('/delete_flight', async (req, res) => {
  var flight_date = req.body.flight_date;
  var flight_number = req.body.flight_number;
  var airline_code = req.body.airline_code;

  var flightExistsQuery = `
    SELECT *
    FROM Flights
    WHERE flight_date = '${flight_date}' AND flight_number = ${flight_number} AND airline_code = '${airline_code}';
  `;

  const flightData = await dbQuery(flightExistsQuery);
  const flightExists = flightData.length > 0;

  console.log(flightData);

  console.log(req.body);

  if (flightExists) {
    var flightQuery = `
      DELETE FROM Flights
      WHERE flight_date = '${flight_date}' AND flight_number = ${flight_number} AND airline_code = '${airline_code}';
    `;
    console.log(flightQuery);
    await dbQuery(flightQuery);

    var origin_airport = flightData[0].origin_airport;
    var dest_airport = flightData[0].dest_airport;

    var routeQuery = `
      SELECT *
      FROM Flights
      WHERE origin_airport = '${origin_airport}' AND dest_airport = '${dest_airport}';
    `;

    var routeData = await dbQuery(routeQuery);
    var flightHasRoute = routeData.length > 0

    if (!flightHasRoute) {
      var favoriteQuery = `
        DELETE FROM Favorites
        WHERE origin_airport = '${origin_airport}' AND dest_airport = '${dest_airport}';
      `;

      var routeQuery = `
        DELETE FROM Routes
        WHERE origin_airport = '${origin_airport}' AND dest_airport = '${dest_airport}';
      `;

      await dbQuery(favoriteQuery);
      await dbQuery(routeQuery);

      res.json({ success: true, message: `Flight successfully deleted. This was the last flight with the route ${origin_airport} to ${dest_airport}, so this route was also deleted.` })
    } else {
      res.json({ success: true, message: 'Flight successfully deleted. Route averages are being updated.'})
    }
  } else {
    res.json({ success: false, message: 'Unable to delete flight because this flight does not exist.' })
  }
});

app.get('/flight_metrics', async (req, res) => {
  
  res.render('metrics.ejs');
})

app.post('/airport_traffic', async (req, res) => {
  // indexes:
    // CREATE INDEX f_origin_airport_idx ON Flights(origin_airport);
    // CREATE INDEX f_dest_airport_idx ON Flights(dest_airport);

  // pre index: ~30 sec
  // post index: ~2-2.5 sec

  
  // var query = `
  //   SELECT origin_airport AS airport, num_outgoing, num_incoming
  //   FROM
  //   (SELECT origin_airport, COUNT(origin_airport) AS num_outgoing
  //   FROM Flights f
  //   GROUP BY origin_airport) as outgoing

  //   JOIN

  //   (SELECT dest_airport, COUNT(dest_airport) AS num_incoming
  //   FROM Flights f
  //   GROUP BY dest_airport) as incoming

  //   ON origin_airport = dest_airport

  //   ORDER BY num_outgoing DESC, num_incoming DESC
  // `;
  var query = `CALL AirportMetric();`


  // index: CREATE INDEX f_origin_airport_idx ON Flights(origin_airport)
      // pre index: 14.1-14.4 SECONDS
      // post index: 1-1.5 second!

  // var query = `
  //   SELECT origin_airport, COUNT(origin_airport)
  //   FROM Flights f
  //   GROUP BY origin_airport
  // `;

  console.log('Starting query...');
  console.time('queryExecutionTime');
  var num_in_out_flights = await dbQuery(query);

  console.timeEnd('queryExecutionTime');

  res.json({ success: true, data: num_in_out_flights });
});

app.post('/airline_timeliness', async (req, res) => {
  // indexes:
    // CREATE INDEX f_airline_code_idx ON Flights(airline_code); (don't add bc this is already primary key)

  // pre index: very slow (> 9 min)
  // post index: ~2-2.5 sec


  var query = [
    `START TRANSACTION;`,
    `CREATE VIEW Early_flights AS
        SELECT airline_code, COUNT(airline_code) AS num_early
        FROM Flights
        WHERE arr_delay <= 0
        GROUP BY airline_code;`,
    `CREATE VIEW Late_flights AS
        SELECT airline_code, COUNT(airline_code) AS num_late
        FROM Flights
        WHERE arr_delay > 0
        GROUP BY airline_code;`,
    `SELECT e.airline_code, num_early, num_late, (num_early / (num_early + num_late)) AS prop_early
     FROM Early_flights e JOIN Late_flights l ON e.airline_code = l.airline_code
     ORDER BY num_early DESC;`,
    `DROP VIEW Early_flights;`,
    `DROP VIEW Late_flights;`,
    `COMMIT;`
  ]

  console.log('Starting query...');
  console.time('queryExecutionTime');
  var airline_stats = Array(7);
  for (var i = 0; i < query.length; i++) {
    airline_stats[i] = await dbQuery(query[i]);
  }
  console.timeEnd('queryExecutionTime');

  

  // index: CREATE INDEX f_origin_airport_idx ON Flights(origin_airport)
      // pre index: 14.1-14.4 SECONDS
      // post index: 1-1.5 second!

  // var query = `
  //   SELECT origin_airport, COUNT(origin_airport)
  //   FROM Flights f
  //   GROUP BY origin_airport
  // `;

  // console.log('Starting query...');
  // console.time('queryExecutionTime');
  // var airline_stats = await dbQuery(query);

  // console.timeEnd('queryExecutionTime');

  res.json({ success: true, data: airline_stats });
});





app.listen(80, function () {
    console.log('Node app is running on port 80');
});
