const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// stripe
const stripe = require("stripe")(
     "sk_test_51OUmsmSEK2ICB9oRGqj4zhhrt1sLjzIGwqatSu0XJrUxNWg44isBWWUbOvcN3ZTXXz7VziAaDvoCMMVYIaORVP4q00ggq7G05K"
);

app.get("/", (req, res) => {
     res.send("Hello World");
});

// MongoDB Configuration
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGO_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
     serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
     },
});

async function run() {
     try {
          // Connect the client to the server
          await client.connect();
          console.log("Connected to MongoDB!");

          // Create a collection of documents
          const artWorks = client.db("ArtWorks").collection("arts");

          // upload an artwork into the database
          app.post("/upload-arts", async (req, res) => {
               try {
                    const data = req.body;
                    const result = await artWorks.insertOne(data);
                    res.send(result); // Send the inserted document back to the client
               } catch (error) {
                    console.error("Error inserting artwork:", error);
                    res.status(500).json({ error: "Failed to insert artwork" });
               }
          });

          // Get all artworks from the database
          app.get("/all-arts", async (req, res) => {
               try {
                    const result = await artWorks.find().toArray();
                    res.json(result);
               } catch (error) {
                    console.error("Error fetching all artworks:", error);
                    res.status(500).json({ error: "Failed to fetch artworks" });
               }
          });

          // Getting a single item
          app.get("/art/:id", async (req, res) => {
               try {
                    const id = req.params.id; // Extract the id parameter from the URL
                    const filter = { _id: new ObjectId(id) }; // Convert id to ObjectId
                    const artwork = await artWorks.findOne(filter); // Query MongoDB with the filter
                    if (artwork) {
                         res.json(artwork); // Send the artwork as JSON response
                    } else {
                         res.status(404).json({ error: "Artwork not found" });
                    }
               } catch (error) {
                    console.error("Error fetching artwork:", error);
                    res.status(500).json({ error: "Failed to fetch artwork" });
               }
          });

          // Update an artwork
          app.patch("/art/:id", async (req, res) => {
               try {
                    const id = req.params.id;
                    const updateArtData = req.body;
                    const filter = { _id: new ObjectId(id) };
                    const updatedDoc = {
                         $set: {
                              ...updateArtData,
                         },
                    };
                    const options = { upsert: true };
                    const result = await artWorks.updateOne(filter, updatedDoc, options);
                    res.json(result);
               } catch (error) {
                    console.error("Error updating artwork:", error);
                    res.status(500).json({ error: "Failed to update artwork" });
               }
          });

          // Delete an artwork
          app.delete("/art/:id", async (req, res) => {
               try {
                    const id = req.params.id;
                    const filter = { _id: new ObjectId(id) };
                    const result = await artWorks.deleteOne(filter);
                    res.json(result);
               } catch (error) {
                    console.error("Error deleting artwork:", error);
                    res.status(500).json({ error: "Failed to delete artwork" });
               }
          });

          // Get artworks by category

          app.get("/all-arts/:category", async (req, res) => {
               try {
                    const db = client.db("ArtWorks"); // Replace with your database name
                    const artWorks = db.collection("arts"); // Replace with your collection name

                    const category = req.params.category; // Remove .toLowerCase()

                    const artworks = await artWorks.find({ categories: category }).toArray();

                    if (!artworks || artworks.length === 0) {
                         return res.status(404).json({ error: `No artworks found in category: ${category}` });
                    }

                    res.json(artworks);
               } catch (error) {
                    console.error("Error fetching artworks by category:", error);
                    res.status(500).json({ error: "Failed to fetch artworks" });
               }
          });

          app.post("/payment", async (req, res) => {
               const { products } = req.body;

               const lineItems = products.map((product) => ({
                    price_data: {
                         currency: "usd",
                         product_data: {
                              name: product.title,
                              images: [product.image],
                         },
                         unit_amount: Math.round(product.price * 100),
                    },
                    quantity: 1,
               }));

               const session = await stripe.checkout.sessions.create({
                    payment_method_types: ["card"],
                    line_items: lineItems,
                    mode: "payment",
                    success_url: "http://localhost:5173/shop",
                    cancel_url: "http://localhost:5173/about",
               });

               res.json({ id: session.id });
          });

          // Send a ping to confirm a successful connection
          await client.db("admin").command({ ping: 1 });
          console.log("Pinged your deployment. You successfully connected to MongoDB!");
     } finally {
          // Ensure that the client will close when you finish/error
          // await client.close();
     }
}

run().catch(console.error);

// Start the Express server
app.listen(port, () => {
     console.log(`Example app listening on port ${port}`);
});
