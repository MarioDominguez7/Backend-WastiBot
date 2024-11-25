/*--------------------------------------------------------------
# Constantes
--------------------------------------------------------------*/
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

/*--------------------------------------------------------------
# Conexión a bd
--------------------------------------------------------------*/
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

/*--------------------------------------------------------------
# Declaración de palabras clave
--------------------------------------------------------------*/
const keywordMap = {
  greetings: ['hola', 'saludos', 'holi', 'ola', 'holiwis'],
  thanks: ['gracias', 'muchas gracias'],
  farewell: ['adios', 'adiós', 'hasta luego', 'ya no', 'nos vemos', 'ahí te ves','ahi te ves', 'eso es todo'],
  changeMovie: ['otra película', 'segunda opción', 'cambiemos', 'cambia', 'de otra', 'otra pelicula', 'la 2', 'segunda opcion', 'la segunda', 'la dos', 'cambiemos', 'cambia'],
  bestMovie: ['mejor película','top película', 'mejor pelicula', 'mayor calificacion', 'mejor calificada','top pelicula', 'mayor calificacion','mayor calificación','mejor calificacion','mejor calificación','mayor rating', 'top 1','top uno', 'alta calificada','alta calificación','alta calificacion', 'mayor puntuación','mayor puntuacion', 'mayor puntaje', 'alto puntaje','más alta','más alto','mas alta','mas alto', 'la mejor'],
  worstMovie: ['peor película','peor pelicula','peor calificada', 'menor calificacion', 'menor calificación','menor rating','más baja','más bajo','mas baja','mas bajo', 'menor puntaje', 'menor puntuación','menor puntuacion', 'bajo puntuaje', 'la peor'],
  recommend: ['recomendar', 'sugerir','sugieres','sugiereme', 'sugiéreme','recomiéndame','recomiendame','recomiendas','cuál puedo ver', 'cual puedo ver','dime otra', 'dime una', 'dime 1','sugiere', 'dime sobre otra','cuéntame sobre una', 'cuentame sobre una', 'cuéntame sobre otra', 'cuentame sobre otra'],
  listMovies: ['cuáles', 'cuales ', 'qué opciones hay', 'que opciones hay','muestra todas', 'todas', 'películas conoces', 'peliculas conoces'],
  year: ['año','cuando','cuándo'],
  director: ['director','dirigió','dirigio', 'principal encargado', 'principal encargada'],
  rating: ['calificación','calificacion','rating'],
  gender: ['género','genero','tipo'],
  description: ['trama','qué trata','que trata','qué se trata','que se trata','descripción','descríbemela', 'descríbela','describemela', 'describela', 'plot'],
  plataforms: ['dónde ver', 'donde ver', 'plataformas','plataforma','streaming','donde la puedo ver','dónde la puedo ver', 'donde puedo verla','dónde puedo verla','donde la veo','dónde la veo'],
};

/*--------------------------------------------------------------
# Middleware para manejar solicitudes
--------------------------------------------------------------*/
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
      matchKeywords(userMessage, keywordMap.greetings)
    ) {
      conversationEnded = false; 
      botResponse = '¡Hola! Soy WastiBot, tu asistente para películas navideñas. ¿En qué puedo ayudarte hoy?';
    } 
    return res.json({ message: botResponse, endConversation: false });
  }
  if (
    matchKeywords(userMessage, keywordMap.greetings)
  ) {
    botResponse = '¡Hola de nuevo! ¿Te puedo ayudar con algo más sobre películas navideñas?';
    return res.json({ message: botResponse, endConversation: false });
  }
  if (matchKeywords(userMessage, keywordMap.thanks)) {
    currentMovie = null;
    botResponse = 'Me alegro de haber sido de ayuda. ¿Quieres que te hable de otra película navideña?';
    return res.json({ message: botResponse, endConversation: false });
  } else if (matchKeywords(userMessage, keywordMap.farewell)) { 
    conversationEnded = true;
    botResponse = 'Ok ¡Hasta luego! Espero que hayas disfrutado nuestra conversación sobre películas navideñas. <br>¡Vuelve pronto! ヾ(￣▽￣)';
    return res.json({ message: botResponse, endConversation: true });
  }

  // Cambiar de película
  if (matchKeywords(userMessage, keywordMap.changeMovie)) {
    currentMovie = null; 
    botResponse = 'Claro, cambiemos de tema. ¿Quieres que te recomiende una película o tienes alguna en mente?';
    return res.json({ message: botResponse, endConversation: false });
  } 

  // Recomendar película
  if (matchKeywords(userMessage, keywordMap.bestMovie)) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY calificacion DESC LIMIT 1';
    movieContext = 'mejor';
    botResponse = 'La mejor película navideña según nuestros datos es:';
  } else if (matchKeywords(userMessage, keywordMap.recommend)) {
    movieQuery = 'SELECT * FROM peliculas ORDER BY RAND() LIMIT 1';
    movieContext = 'recomendación';
    botResponse = 'Te recomiendo ver:';
  } else if (matchKeywords(userMessage, keywordMap.worstMovie)) {
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

/*--------------------------------------------------------------
# Manejador de Contextos
--------------------------------------------------------------*/
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
            botResponse += ` Esta película tiene la calificación más alta de <b>${movie.calificacion}</b>, la mejor opción para ver según la crítica :o.`;
            break;
          case 'recomendación':
            botResponse += ` Es una excelente elección para disfrutar en Navidad que seguro te gustará :D.`;
            break;
          case 'peor':
            botResponse += ` Esta película tiene la calificación más baja de <b>${movie.calificacion}</b>, pero quizás te sorprenda c:`;
            break;
          case 'búsqueda':
            botResponse += ` He encontrado información de la película "<b>${movie.titulo}"</b>.`;
            break;
        }
        
        botResponse += ` <br> ¿Qué te gustaría saber sobre esta película? Puedes preguntar sobre el <u>año</u>, <u>director</u>, <u>calificación</u>, <u>género</u>, <u>trama</u> o <u>dónde verla</u> ;)`;
        
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
        botResponse = 'Lo siento, no pude encontrar información sobre esa película :c ¿Quieres que te hable de otra película navideña?';
        res.json({ message: botResponse });
      }
    });
  } else {
    res.json({ message: '¿Puedes ser más específico? Puedo ayudarte con recomendaciones o detalles sobre películas navideñas.'});
  }
});

/*--------------------------------------------------------------
# Manejador de los detalles a mostrar de la película
--------------------------------------------------------------*/
function handleMovieInfoRequest(userMessage, res) {
  let infoType = 'general';
  if (matchKeywords(userMessage, keywordMap.year)) {
    infoType = 'año';
  } else if (matchKeywords(userMessage, keywordMap.director)) {
    infoType = 'director';
  } else if (matchKeywords(userMessage, keywordMap.rating)) {
    infoType = 'calificación';
  } else if (matchKeywords(userMessage, keywordMap.gender)) {
    infoType = 'género';
  } else if (matchKeywords(userMessage, keywordMap.description)) {
    infoType = 'trama';
  } else if (matchKeywords(userMessage, keywordMap.plataforms)) {
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
          response = `"<b>${movie.titulo}</b>" se estrenó en el año <b>${movie.anio}</b>.`;
          break;
        case 'director':
          response = `"<b>${movie.titulo}</b>" fue dirigida por <b>${movie.director}</b>.`;
          break;
        case 'calificación':
          response = `"<b>${movie.titulo}</b>" tiene una calificación de <b>${movie.calificacion}</b> sobre 10.`;
          break;
        case 'género':
          response = `"<b>${movie.titulo}</b>" pertenece al subgénero de <b>${movie.subgenero}</b>.`;
          break;
        case 'trama':
          response = `La película de "<b>${movie.titulo}</b>" trata de lo siguiente: <br> ${movie.descripcion} <br>`;
          break;
          case 'donde_ver':
            if (movie.donde_ver) {
              response = `"<b>${movie.titulo}</b>" está disponible en las siguientes plataformas: <br>${formatPlatforms( movie.donde_ver )}.`;
            } else {
              response = `"<b>${movie.titulo}</b>" no tiene información sobre dónde verla actualmente.`;
            }
            break;
        default:
          response = `Aquí está toda la información sobre "<b>${movie.titulo}</b>". <br>  <br>
            Esta es una película navideña del año <b>${movie.anio}</b>.<br>
            Fue dirigida por <b>${movie.director}</b>.<br> 
            Tiene una calificación de <b>${movie.calificacion}</b> sobre 10 y pertenece al subgénero de <b>${movie.subgenero}</b>. <br>
            Su <b>trama</b> ve da lo siguiente: ${movie.descripcion} <br><br>
            Puedes verla en las siguientes plataformas:<br>${formatPlatforms( movie.donde_ver )}.`;
      }
      response += ' <br>¿Quieres saber algo en concreto de esta película o prefieres que hablemos de otra?';
      res.json({ message: response, movie: movie, movieContext: 'info' });
    } else {
      res.json({ message: 'Lo siento, no pude encontrar información sobre esa película.' });
    }
  });
}

/*--------------------------------------------------------------
# Funciones
--------------------------------------------------------------*/

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

// Coincidencia de palabras clave
function matchKeywords(message, keywords) {
  return keywords.some((keyword) => message.includes(keyword));
}

/*--------------------------------------------------------------
# Determinar puerto para la bd
--------------------------------------------------------------*/
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));