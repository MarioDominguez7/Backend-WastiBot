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
  let movieQuery = null;

  if (userMessage.includes('mejor película') || userMessage.includes('top película') || userMessage.includes('mejor pelicula') || userMessage.includes('mejor calificada') 
    || userMessage.includes('mayor calificacion') || userMessage.includes('mayor calificación')) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY calificacion DESC LIMIT 1';
    botResponse = 'La mejor película navideña según nuestros datos es:';
  } else if (userMessage.includes('recomendar') || userMessage.includes('sugerir') || userMessage.includes('sugiereme') || userMessage.includes('sugiéreme') 
    || userMessage.includes('recomiéndame') || userMessage.includes('recomiendame')) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY RAND() LIMIT 1';
    botResponse = 'Te recomiendo ver:';
  } else if (userMessage.includes('peor película') || userMessage.includes('peor calificada') || userMessage.includes('peor pelicula')
    || userMessage.includes('menor calificacion') || userMessage.includes('menor calificación')) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY calificacion ASC LIMIT 1';
    botResponse = 'La película navideña con menor calificación según nuestros datos es:';
  } else {
    movieQuery = 'SELECT * FROM peliculas WHERE LOWER(titulo) LIKE ?';
    botResponse = 'He encontrado información sobre la película:';
  }

  if (movieQuery) {
    db.query(movieQuery, [`%${userMessage}%`], (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        botResponse += ` "${result[0].titulo}".`;
        res.json({ message: botResponse, movie: result[0] });
      } else {
        botResponse = 'Lo siento, no pude encontrar información sobre esa película.';
        res.json({ message: botResponse });
      }
    });
  } else {
    botResponse = 'Lo siento, no entiendo tu pregunta. ¿Puedes ser más específico sobre qué quieres saber de las películas navideñas?';
    res.json({ message: botResponse });
  }
});

app.get('/', (req, res) => {
  res.send('Bienvenido al servidor de WastiBot');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));