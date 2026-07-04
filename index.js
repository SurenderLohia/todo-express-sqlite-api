require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Sequelize, Model, DataTypes } = require('sequelize');

const app = express();
// Enable CORS for all routes and origins
app.use(cors());
const port = process.env.PORT || 3000; // Updated to respect Vercel's runtime environment variable

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
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

// Sync models with database
sequelize.sync();

// Middleware for parsing request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// CRUD routes for Todo model
app.get('/todos', async (req, res) => {
  const whereClause = {};

  if(req.query.is_completed !== undefined) {
    whereClause.is_completed = req.query.is_completed === 'true';
  }

  
  const todos = await Todo.findAll({where: whereClause});
  const resObject = {
    list: todos,
    summary: {
      all: await Todo.count(),
      completed: await Todo.count({ where: { is_completed: true } }),
      pending: await Todo.count({ where: { is_completed: false } })
    }
  }
  res.json(resObject);
});

app.get('/todos/:id', async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);
  if (todo) {
    res.json(todo);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
});

app.post('/todos', async (req, res) => {
  const { text, is_completed } = req.body;
  const todo = await Todo.create({ text, is_completed });
  res.json(todo);
});

app.put('/todos/:id', async (req, res) => {
  const { text, is_completed } = req.body;
  const todo = await Todo.findByPk(req.params.id);
  if (todo) {
    if(text !== undefined) {
      todo.text = text;
    }
    if(is_completed !== undefined) {
      todo.is_completed = is_completed;
    }
    
    await todo.save();
    res.json(todo);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
});

app.delete('/todos/:id', async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);
  if (todo) {
    await todo.destroy();
    res.json({ message: 'Todo deleted' });
  } else {
    res.status(404).json({ error: 'Todo not found' });
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