const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'peliculas_navidad'
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Conectado a la base de datos MySQL');
});

app.get('/api/movies', (req, res) => {
  const query = 'SELECT * FROM peliculas ORDER BY calificacion DESC LIMIT 10';
  db.query(query, (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

app.post('/api/chat', (req, res) => {
  const userMessage = req.body.message.toLowerCase();
  let botResponse = '';

  // Lógica simple del chatbot
  if (userMessage.includes('mejor película') || userMessage.includes('top película') || userMessage.includes('mejor pelicula')) {
    const query = 'SELECT titulo FROM peliculas ORDER BY calificacion DESC LIMIT 1';
    db.query(query, (err, result) => {
      if (err) throw err;
      botResponse = `La mejor película navideña según nuestras calificaciones es: ${result[0].titulo}`;
      res.json({ message: botResponse });
    });
  } else if (userMessage.includes('recomendar') || userMessage.includes('sugerir')) {
    const query = 'SELECT titulo FROM peliculas ORDER BY RAND() LIMIT 1';
    db.query(query, (err, result) => {
      if (err) throw err;
      botResponse = `Te recomiendo ver: ${result[0].titulo}. ¡Es una excelente película navideña!`;
      res.json({ message: botResponse });
    });
  } else {
    botResponse = 'Lo siento, no entiendo tu pregunta. ¿Puedes ser más específico sobre qué quieres saber de las películas navideñas?';
    res.json({ message: botResponse });
  }
});

// Ruta para la página principal
app.get('/', (req, res) => {
    res.send('Bienvenido al servidor de WastiBot');
  });

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));