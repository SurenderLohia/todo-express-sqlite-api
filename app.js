const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Sequelize, Model, DataTypes } = require('sequelize');

const app = express();
// Enable CORS for all routes and origins
app.use(cors());
const port = 3000;

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
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

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Sync models with database
sequelize.sync();

// Middleware for parsing request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// CRUD routes for Todo model
app.get('/todos', async (req, res) => {
  const todos = await Todo.findAll();
  res.json(todos);
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
    if(todo.text) {
      todo.text = text;
    }
    if(todo.is_completed = is_completed !== undefined) {
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});