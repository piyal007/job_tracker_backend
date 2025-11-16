require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function connectDB() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("✅ Successfully connected to MongoDB!");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
    }
}

connectDB();

// Routes
app.get('/', (req, res) => {
    res.send('Job Tracker API is running!');
});

// Get all jobs
app.get('/api/jobs', async (req, res) => {
    try {
        const database = client.db('jobTracker');
        const jobs = database.collection('jobs');
        const result = await jobs.find({}).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new job
app.post('/api/jobs', async (req, res) => {
    try {
        const database = client.db('jobTracker');
        const jobs = database.collection('jobs');
        const result = await jobs.insertOne(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a job (upsert - create if doesn't exist)
app.put('/api/jobs/:id', async (req, res) => {
    try {
        const database = client.db('jobTracker');
        const jobs = database.collection('jobs');
        const result = await jobs.updateOne(
            { id: req.params.id },
            { $set: req.body },
            { upsert: true }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk save/sync all jobs
app.post('/api/jobs/sync', async (req, res) => {
    try {
        const database = client.db('jobTracker');
        const jobs = database.collection('jobs');
        const jobsToSync = req.body;

        const operations = jobsToSync.map(job => ({
            updateOne: {
                filter: { id: job.id },
                update: { $set: job },
                upsert: true
            }
        }));

        const result = await jobs.bulkWrite(operations);
        res.json({
            success: true,
            message: `Synced ${result.upsertedCount + result.modifiedCount} jobs`,
            result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a job
app.delete('/api/jobs/:id', async (req, res) => {
    try {
        const database = client.db('jobTracker');
        const jobs = database.collection('jobs');
        const result = await jobs.deleteOne({ id: req.params.id });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== JOB PORTALS ENDPOINTS =====

// Get all portals
app.get('/api/portals', async (req, res) => {
    try {
        const database = client.db('jobTracker');
        const portals = database.collection('portals');
        const result = await portals.find({}).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk save/sync all portals
app.post('/api/portals/sync', async (req, res) => {
    try {
        const database = client.db('jobTracker');
        const portals = database.collection('portals');
        const portalsToSync = req.body;
        
        const operations = portalsToSync.map(portal => ({
            updateOne: {
                filter: { id: portal.id },
                update: { $set: portal },
                upsert: true
            }
        }));
        
        const result = await portals.bulkWrite(operations);
        res.json({ 
            success: true, 
            message: `Synced ${result.upsertedCount + result.modifiedCount} portals`,
            result 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});
