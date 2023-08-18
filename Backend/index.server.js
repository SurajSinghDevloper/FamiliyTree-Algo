const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(bodyParser.json());
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "trial",
  password: "postgres",
  port: 5432,
});

pool.on("connect", () => {
  console.log("Connected to the database");
});

app.post("/api/person", async (req, res) => {
  const { name, gender, mother, father, spouse, children } = req.body;

  try {
    const client = await pool.connect();

    // Insert person
    const personQuery = `
      INSERT INTO people (name, gender)
      VALUES ($1, $2)
      RETURNING id;
    `;
    const personValues = [name, gender];
    const personResult = await client.query(personQuery, personValues);
    const personId = personResult.rows[0].id;

    // Update relationships
    if (mother) {
      const motherQuery = `
        UPDATE people
        SET children = children || $1
        WHERE id = $2;
      `;
      const motherValues = [[personId], mother];
      await client.query(motherQuery, motherValues);
    }

    if (father) {
      const fatherQuery = `
        UPDATE people
        SET children = children || $1
        WHERE id = $2;
      `;
      const fatherValues = [[personId], father];
      await client.query(fatherQuery, fatherValues);
    }

    if (spouse) {
      const spouseQuery = `
        UPDATE people
        SET spouse = $1
        WHERE id = $2;
      `;
      const spouseValues = [personId, spouse];
      await client.query(spouseQuery, spouseValues);
    }

    if (children && children.length > 0) {
      const childrenQuery = `
        UPDATE people
        SET mother = $1
        WHERE id = ANY($2::int[]);
      `;
      const childrenValues = [personId, children];
      await client.query(childrenQuery, childrenValues);
    }

    client.release();

    res.json({ message: "Person added successfully" });
  } catch (error) {
    console.error("Error adding person:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/getAll", async (req, res) => {
  try {
    const client = await pool.connect();

    const query = "SELECT * FROM people";
    const result = await client.query(query);

    const people = result.rows;
    client.release();

    res.json(people);
  } catch (error) {
    console.error("Error fetching all people:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.listen(5000, () => {
  console.log("Server is listening on port 5000");
});
