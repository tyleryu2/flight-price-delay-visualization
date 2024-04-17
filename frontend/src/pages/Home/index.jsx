import React from "react";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

const Home = () => {
  const flights = [{ label: "Chicago ORD" }, { label: "San Francisco SFO" }];

  const card = (
    <React.Fragment>
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          SFO - ORD
        </Typography>
        <Typography variant="body2" color="text.secondary">
          flight data random bs whatever you want here tbh
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small">See Details</Button>
      </CardActions>
    </React.Fragment>
  );

  return (
    <div>
      <Container sx={{ mt: 8 }}>
        <Grid container spacing={2}>
          <Grid xs={8}>
            <Stack spacing={2}>
              <Card variant="outlined">{card}</Card>
              <Card variant="outlined">{card}</Card>
              <Card variant="outlined">{card}</Card>
            </Stack>
          </Grid>
          <Grid xs={4}>
            <Stack spacing={2} sx={{ ml: 8 }}>
              <Typography gutterBottom variant="h6" component="div">
                Filter by Airport
              </Typography>
              <Autocomplete
                disablePortal
                id="combo-box-demo"
                options={flights}
                renderInput={(params) => (
                  <TextField {...params} label="Departing" />
                )}
              />
              <Autocomplete
                disablePortal
                id="combo-box-demo"
                options={flights}
                renderInput={(params) => (
                  <TextField {...params} label="Arriving" />
                )}
              />
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

export default Home;
