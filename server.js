/* --------------------------
#  DECLARACION DE CONSTANTES
----------------------------- */
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
  let conversationEnded = false;

  // Detectar saludos, agradecimiento o despedida
  if (conversationEnded) {
    if (
      userMessage.includes('hola') ||
      userMessage.includes('saludos') ||
      userMessage.includes('holi') ||
      userMessage.includes('ola') ||
      userMessage.includes('holiwis')
    ) {
      conversationEnded = false; 
      botResponse = '¡Hola! Soy WastiBot, tu asistente para películas navideñas. ¿En qué puedo ayudarte hoy?';
    } else {
      botResponse = '¿Sigues ahí? :o ¿Quieres saber sobre alguna otra película?';
    }
    return res.json({ message: botResponse, endConversation: false });
  }
  
  if (
    userMessage.includes('hola') ||
    userMessage.includes('saludos') ||
    userMessage.includes('holi') ||
    userMessage.includes('ola') ||
    userMessage.includes('holiwis')
  ) {
    botResponse = '¡Hola de nuevo! ¿Te puedo ayudar con algo más sobre películas navideñas?';
    return res.json({ message: botResponse, endConversation: false });
  }

  if (userMessage.includes('muchas gracias') || userMessage.includes('gracias')) {
    currentMovie = null;
    botResponse = 'Me alegro de haber sido de ayuda. ¿Quieres que te hable de otra película navideña?';
    return res.json({ message: botResponse, endConversation: false });
  } else if (userMessage.includes('adios') || userMessage.includes('adiós') || userMessage.includes('hasta luego')) { 
    conversationEnded = true;
    botResponse = '¡Hasta luego! Espero que hayas disfrutado nuestra conversación sobre películas navideñas. <br>¡Vuelve pronto! ヾ(￣▽￣)';
    return res.json({ message: botResponse, endConversation: true });
  }

  // Si el usuario quiere hablar de otra película
  if (userMessage.includes('de otra') || userMessage.includes('otra película') || userMessage.includes('otra pelicula') || userMessage.includes('segunda opción') || userMessage.includes('segunda opcion') || userMessage.includes('la 2') || userMessage.includes('la segunda')  || userMessage.includes('la dos') || userMessage.includes('cambiemos') || userMessage.includes('cambia')) {
    currentMovie = null; 
    botResponse = 'Claro, cambiemos de tema. ¿Quieres que te recomiende una película o tienes alguna en mente?';
    return res.json({ message: botResponse, endConversation: false });
  } 

  // Iniciar para recomendar película
  if (userMessage.includes('mejor película') || userMessage.includes('top película') || userMessage.includes('mejor pelicula') || userMessage.includes('mejor calificada') || userMessage.includes('top pelicula')
    || userMessage.includes('mayor calificacion') || userMessage.includes('mayor calificación') || userMessage.includes('mayor rating') || userMessage.includes('top 1') || userMessage.includes('top uno')) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY calificacion DESC LIMIT 1';
    movieContext = 'mejor';
    botResponse = 'La mejor película navideña según nuestros datos es:';
  } else if (userMessage.includes('recomendar') || userMessage.includes('sugerir') || userMessage.includes('sugieres') || userMessage.includes('sugiereme') || userMessage.includes('sugiéreme') 
    || userMessage.includes('recomiéndame') || userMessage.includes('recomiendame') || userMessage.includes('recomiendas') || userMessage.includes('puedo ver') || userMessage.includes('dime otra') 
    || userMessage.includes('dime una') || userMessage.includes('dime 1') || userMessage.includes('dime otra') || userMessage.includes('sugiere')) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY RAND() LIMIT 1';
    movieContext = 'recomendación';
    botResponse = 'Te recomiendo ver:';
  } else if (userMessage.includes('peor película') || userMessage.includes('top película') || userMessage.includes('peor calificada') || userMessage.includes('peor pelicula')
    || userMessage.includes('menor calificacion') || userMessage.includes('menor calificación') || userMessage.includes('menor rating') || userMessage.includes('más baja') || userMessage.includes('más bajo')
    || userMessage.includes('mas baja') || userMessage.includes('mas bajo')) {
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
        
        botResponse += ` <br> ¿Qué te gustaría saber sobre esta película? Puedes preguntar sobre el año, director, calificación, género, trama o dónde verla.`;
        
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
  if (userMessage.includes('año') || userMessage.includes('cuando') || userMessage.includes('cuándo')) {
    infoType = 'año';
  } else if (userMessage.includes('director') || userMessage.includes('dirigió') || userMessage.includes('dirigio')) {
    infoType = 'director';
  } else if (userMessage.includes('calificación') || userMessage.includes('calificacion') || userMessage.includes('rating')) {
    infoType = 'calificación';
  } else if (userMessage.includes('género') || userMessage.includes('genero') || userMessage.includes('tipo')) {
    infoType = 'género';
  } else if (userMessage.includes('dónde ver') || userMessage.includes('donde ver') || userMessage.includes('plataformas') || userMessage.includes('plataforma') || userMessage.includes('streaming') || userMessage.includes('donde la puedo ver') || userMessage.includes('dónde la puedo ver') || userMessage.includes('donde puedo verla') || userMessage.includes('dónde puedo verla')) {
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
              response = `"<b>${movie.titulo}</b>" está disponible en las siguientes plataformas: <br>${formatPlatforms( movie.donde_ver )}.`;
            } else {
              response = `"<b>${movie.titulo}</b>" no tiene información sobre dónde verla actualmente.`;
            }
            break;
        default:
          response = `"<b>${movie.titulo}</b>" es una película navideña del año ${movie.anio}, dirigida por ${movie.director}. 
                      Tiene una calificación de ${movie.calificacion} sobre 10 y pertenece al subgénero de ${movie.subgenero}. 
                      Puedes verla en las siguientes plataformas:<br>${formatPlatforms( movie.donde_ver )}. 
                      <br> ¿Qué más te gustaría saber sobre ella?`;
      }
      response += ' <br>¿Quieres saber algo más sobre esta película o prefieres que hablemos de otra?';
      res.json({ message: response, movie: movie, movieContext: 'info' });
    } else {
      res.json({ message: 'Lo siento, no pude encontrar información sobre esa película.' });
    }
  });
}

// Función para formatear plataformas y agregarlas como links
function formatPlatforms(donde_ver) {
  return donde_ver
    .split("\n")
    .map((platform) => {
      const [name, url] = platform.split(": ");
      return `<a href="${url}" target="_blank">${name}</a>`;
    })
    .join(", <br>");
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