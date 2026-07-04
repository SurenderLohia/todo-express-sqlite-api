require('dotenv').config();
console.log("Database URL loaded:", process.env.DATABASE_URL ? "Yes ✅" : "No ❌");

const express = require('express');
const cors = require('cors');
const { Sequelize, Model, DataTypes } = require('sequelize');
const pg = require('pg');

const app = express();

// 1. Enable CORS for all routes immediately
const allowedOrigins = ['http://localhost:3000', 'https://todo-webclient.vercel.app'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true 
}));

// 2. Built-in body parsing middleware (safe for Vercel serverless functions)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const port = process.env.PORT || 3000;

// Initialize Sequelize connection pool optimized for serverless architecture
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    connectTimeout: 10000 
  },
  pool: {
    max: 1,        
    min: 0,
    idle: 0,
    evict: 10000,
    acquire: 20000
  }
});

// Define Todo model
class Todo extends Model {}
Todo.init({
  text: DataTypes.STRING,
  is_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
}, { sequelize, modelName: 'todo' });

// --- NOTE: sequelize.sync() was removed from global scope to prevent Vercel boot crashes ---

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// CRUD routes for Todo model
app.get('/todos', async (req, res) => {
  try {
    const whereClause = {};

    if(req.query.is_completed !== undefined) {
      whereClause.is_completed = req.query.is_completed === 'true';
    }

    // Fetch the list from the DB
    const todos = await Todo.findAll({ where: whereClause });
    
    // Efficiently compute summary statistics from the fetched rows to avoid extra DB queries
    const allCount = await Todo.count();
    const completedCount = await Todo.count({ where: { is_completed: true } });
    
    const resObject = {
      list: todos,
      summary: {
        all: allCount,
        completed: completedCount,
        pending: allCount - completedCount
      }
    };
    res.json(resObject);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/todos/:id', async (req, res) => {
  try {
    const todo = await Todo.findByPk(req.params.id);
    if (todo) {
      res.json(todo);
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/todos', async (req, res) => {
  try {
    const { text, is_completed } = req.body;
    const todo = await Todo.create({ text, is_completed });
    res.json(todo);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/todos/:id', async (req, res) => {
  try {
    const { text, is_completed } = req.body;
    const todo = await Todo.findByPk(req.params.id);
    if (todo) {
      if(text !== undefined) todo.text = text;
      if(is_completed !== undefined) todo.is_completed = is_completed;
      
      await todo.save();
      res.json(todo);
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/todos/:id', async (req, res) => {
  try {
    const todo = await Todo.findByPk(req.params.id);
    if (todo) {
      await todo.destroy();
      res.json({ message: 'Todo deleted' });
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// CRITICAL FOR VERCEL: Only start the server listening if NOT running on Vercel
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

// CRITICAL FOR VERCEL: Export the app instance
module.exports = app;