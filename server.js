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

let currentMovie = null;

app.post('/api/chat', (req, res) => {
  const userMessage = req.body.message.toLowerCase();
  let botResponse = '';
  let movieQuery = null;
  let queryParams = [];
  let movieContext = null;

  // Detectar agradecimiento o despedida
  if (userMessage.includes('muchas gracias') || userMessage.includes('gracias')) {
    currentMovie = null;
    botResponse = 'Me alegro de haber sido de ayuda. ¿Quieres que te hable de otra película navideña?';
    return res.json({ message: botResponse, endConversation: false });
  } else if (userMessage.includes('adios') || userMessage.includes('adiós') || userMessage.includes('hasta luego')) {
    botResponse = '¡Hasta luego! Espero que hayas disfrutado hablando sobre películas navideñas. ¡Vuelve pronto!';
    return res.json({ message: botResponse, endConversation: true });
  }

  if (userMessage.includes('mejor película') || userMessage.includes('top película') || userMessage.includes('mejor pelicula') || userMessage.includes('mejor calificada') 
    || userMessage.includes('mayor calificacion') || userMessage.includes('mayor calificación')) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY calificacion DESC LIMIT 1';
    movieContext = 'mejor';
    botResponse = 'La mejor película navideña según nuestros datos es:';
  } else if (userMessage.includes('recomendar') || userMessage.includes('sugerir') || userMessage.includes('sugiereme') || userMessage.includes('sugiéreme') 
    || userMessage.includes('recomiéndame') || userMessage.includes('recomiendame')) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY RAND() LIMIT 1';
    movieContext = 'recomendación';
    botResponse = 'Te recomiendo ver:';
  } else if (userMessage.includes('peor película') || userMessage.includes('peor calificada') || userMessage.includes('peor pelicula')
    || userMessage.includes('menor calificacion') || userMessage.includes('menor calificación')) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY calificacion ASC LIMIT 1';
    movieContext = 'peor';
    botResponse = 'La película navideña con menor calificación según nuestros datos es:';
  } else if (currentMovie) {
    return handleMovieInfoRequest(userMessage, res);
  } else {
    movieQuery = 'SELECT * FROM peliculas WHERE LOWER(titulo) LIKE ?';
    queryParams.push(`%${userMessage}%`);
    movieContext = 'búsqueda';
    botResponse = 'He encontrado información sobre la película:';
  }

  if (movieQuery) {
    db.query(movieQuery, queryParams, (err, result) => {
      if (err) {
        console.error('Error en la consulta de la base de datos:', err);
        res.status(500).json({ message: 'Lo siento, ha ocurrido un error al buscar la información de la película.' });
        return;
      }
      if (result.length > 0) {
        const movie = result[0];
        currentMovie = movie.titulo;
        botResponse += ` "<b>${movie.titulo}</b>".`;
        
        switch (movieContext) {
          case 'mejor':
            botResponse += ` Esta película tiene la calificación más alta de ${movie.calificacion}.`;
            break;
          case 'recomendación':
            botResponse += ` Es una excelente elección para disfrutar en Navidad.`;
            break;
          case 'peor':
            botResponse += ` Esta película tiene la calificación más baja de ${movie.calificacion}, pero quizás te sorprenda.`;
            break;
          case 'búsqueda':
            botResponse += ` Esta película tiene una calificación de ${movie.calificacion}.`;
            break;
        }
        
        botResponse += ` ¿Qué te gustaría saber sobre esta película? Puedes preguntar sobre el año, director, calificación, género, trama o dónde verla.`;
        
        res.json({ 
          message: botResponse, 
          movie: {
            id: movie.id,
            titulo: movie.titulo,
            anio: movie.anio,
            director: movie.director,
            calificacion: movie.calificacion,
            subgenero: movie.subgenero,
            descripcion: movie.descripcion,
            donde_ver: movie.donde_ver
          },
          movieContext: movieContext
        });
      } else {
        botResponse = 'Lo siento, no pude encontrar información sobre esa película. ¿Quieres que te hable de otra película navideña?';
        res.json({ message: botResponse });
      }
    });
  } else {
    botResponse = generateGenericResponse(userMessage);
    res.json({ message: botResponse });
  }
});

function handleMovieInfoRequest(userMessage, res) {
  let infoType = 'general';
  if (userMessage.includes('año') || userMessage.includes('cuando')) {
    infoType = 'año';
  } else if (userMessage.includes('director')) {
    infoType = 'director';
  } else if (userMessage.includes('calificación') || userMessage.includes('rating')) {
    infoType = 'calificación';
  } else if (userMessage.includes('género') || userMessage.includes('tipo')) {
    infoType = 'género';
  } else if (userMessage.includes('dónde ver') || userMessage.includes('donde ver') || userMessage.includes('plataformas')) {
    infoType = 'donde_ver';
  }

  const query = 'SELECT * FROM peliculas WHERE titulo = ?';
  db.query(query, [currentMovie], (err, result) => {
    if (err) {
      console.error('Error en la consulta de la base de datos:', err);
      res.status(500).json({ message: 'Lo siento, ha ocurrido un error al buscar la información de la película.' });
      return;
    }
    if (result.length > 0) {
      const movie = result[0];
      let response = '';
      switch (infoType) {
        case 'año':
          response = `"<b>${movie.titulo}</b>" se estrenó en el año ${movie.anio}.`;
          break;
        case 'director':
          response = `"<b>${movie.titulo}</b>" fue dirigida por ${movie.director}.`;
          break;
        case 'calificación':
          response = `"<b>${movie.titulo}</b>" tiene una calificación de ${movie.calificacion} sobre 10.`;
          break;
        case 'género':
          response = `"<b>${movie.titulo}</b>" pertenece al subgénero de ${movie.subgenero}.`;
          break;
        case 'trama':
          response = `La trama de "<b>${movie.titulo}</b>" es: ${movie.descripcion}`;
          break;
          case 'donde_ver':
            if (movie.donde_ver) {
              // Convierte la lista de plataformas y enlaces en HTML con hipervínculos
              const plataformas = movie.donde_ver
                .split('\n') // Si los datos están separados por saltos de línea
                .map(plataforma => {
                  const [nombre, url] = plataforma.split(': '); // Divide el nombre y el link
                  return `<a href="${url.trim()}" target="_blank">${nombre.trim()}</a>`; // Formatea como hipervínculo
                })
                .join(', <br>'); // Une las plataformas con comas
              response = `"<b>${movie.titulo}</b>" está disponible en las siguientes plataformas: <br>${plataformas}.`;
            } else {
              response = `"<b>${movie.titulo}</b>" no tiene información sobre dónde verla actualmente.`;
            }
            break;
        default:
          // Divide la información de las plataformas en un array 
          const platforms = movie.donde_ver.split('\n'); 
          
          // Crea una lista formateada con hipervínculos
          const formattedPlatforms = platforms.map((platform) => {
            const [name, url] = platform.split(': '); // Divide entre nombre de la plataforma y el link
            return `<a href="${url}" target="_blank">${name}</a>`;
          }).join(', <br>'); // Separa cada plataforma con un salto de línea
          
          // Genera la respuesta con la lista de plataformas formateadas
          response = `"<b>${movie.titulo}</b>" es una película navideña del año ${movie.anio}, dirigida por ${movie.director}. 
                      Tiene una calificación de ${movie.calificacion} sobre 10 y pertenece al subgénero de ${movie.subgenero}. 
                      Puedes verla en las siguientes plataformas:<br>${formattedPlatforms}. 
                      <br> ¿Qué más te gustaría saber sobre ella?`;
      }
      response += ' <br>¿Quieres saber algo más sobre esta película o prefieres que hablemos de otra?';
      res.json({ message: response, movie: movie, movieContext: 'info' });
    } else {
      res.json({ message: 'Lo siento, no pude encontrar información sobre esa película.' });
    }
  });
}

function generateGenericResponse(message) {
  if (message.includes('hola') || message.includes('saludos')) {
    return '¡Hola! Soy WastiBot, tu asistente para películas navideñas. ¿En qué puedo ayudarte hoy?';
  } else if (message.includes('gracias')) {
    return '¡De nada! Estoy aquí para ayudarte con cualquier pregunta sobre películas navideñas.';
  } else {
    return '¿Puedes ser más específico? Puedo ayudarte con información sobre películas navideñas, recomendaciones, o responder preguntas sobre una película en particular.';
  }
}

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));